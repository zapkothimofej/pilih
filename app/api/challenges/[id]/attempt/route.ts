import { prisma } from '@/lib/db/prisma'
import { streamChallengeResponse } from '@/lib/ai/challenge-ai'
import { judgePrompt } from '@/lib/ai/judge-ai'
import { rateLimit, rateLimitHeaders } from '@/lib/utils/rate-limit'

// 20 attempts per hour per user — covers a full day's active work
const ATTEMPT_LIMIT = 20
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params
  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return new Response('User nicht gefunden', { status: 404 })

  const rl = rateLimit(`attempt:${user.id}`, ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS)
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Zu viele Anfragen. Bitte warte eine Stunde.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', ...rateLimitHeaders(rl, ATTEMPT_LIMIT) } }
    )
  }

  const { userPrompt, sessionId, chatHistory } = await req.json() as {
    userPrompt: string
    sessionId: string
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return new Response('Challenge nicht gefunden', { status: 404 })

  // Attempt-Nummer bestimmen
  const attemptCount = await prisma.promptAttempt.count({ where: { sessionId } })

  // LLM-Antwort streamen + Judge parallel laufen lassen
  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Challenge-AI streamen
        for await (const chunk of streamChallengeResponse(
          challenge.description,
          chatHistory,
          userPrompt
        )) {
          fullResponse += chunk
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
        }

        // Judge-AI (isolierter Kontext, nach Streaming)
        const judgeFeedback = await judgePrompt(challenge.description, userPrompt)

        // In DB speichern
        await prisma.promptAttempt.create({
          data: {
            sessionId,
            userId: user.id,
            userPrompt,
            llmResponse: fullResponse,
            judgeFeedback: judgeFeedback.feedback,
            judgeScore: judgeFeedback.score,
            improvements: judgeFeedback.improvements,
            attemptNumber: attemptCount + 1,
          },
        })

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'judge', ...judgeFeedback })}\n\n`)
        )
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
