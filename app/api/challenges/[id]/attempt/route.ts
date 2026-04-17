import { z } from 'zod'

import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { streamChallengeResponse } from '@/lib/ai/challenge-ai'
import { judgePrompt } from '@/lib/ai/judge-ai'
import { rateLimit, rateLimitHeaders } from '@/lib/utils/rate-limit'

// 20 attempts per hour per user — covers a full day's active work
const ATTEMPT_LIMIT = 20
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000

const bodySchema = z.object({
  userPrompt: z.string().min(1).max(4000),
  sessionId: z.string().min(1),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(10000),
      })
    )
    .max(50),
})

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
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimitHeaders(rl, ATTEMPT_LIMIT),
        },
      }
    )
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Ungültiger Request-Body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  const { userPrompt, sessionId, chatHistory } = body

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return new Response('Challenge nicht gefunden', { status: 404 })

  const session = await prisma.dailySession.findUnique({ where: { id: sessionId } })
  if (!session) return new Response('Session nicht gefunden', { status: 404 })
  if (
    session.userId !== user.id ||
    session.selectedChallengeId !== challengeId
  ) {
    return new Response('Zugriff verweigert', { status: 403 })
  }

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
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
          )
        }

        // Judge-AI (isolierter Kontext, nach Streaming) — immer laufen lassen,
        // damit der avgScore für die adaptive Difficulty verlässlich ist.
        const judgeFeedback = await judgePrompt(challenge.description, userPrompt)

        // Count is advisory and not row-locked; concurrent requests can land on
        // the same `attemptNumber`. The DB-level `@@unique([sessionId,
        // attemptNumber])` is the real guard — retry on P2002.
        let attempt: Awaited<ReturnType<typeof prisma.promptAttempt.create>> | null = null
        let lastConflict: unknown = null
        for (let i = 0; i < 3 && !attempt; i++) {
          const count = await prisma.promptAttempt.count({ where: { sessionId } })
          try {
            attempt = await prisma.promptAttempt.create({
              data: {
                sessionId,
                userId: user.id,
                userPrompt,
                llmResponse: fullResponse,
                judgeFeedback: judgeFeedback.feedback,
                judgeScore: judgeFeedback.score,
                improvements: judgeFeedback.improvements,
                attemptNumber: count + 1,
              },
            })
          } catch (err) {
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === 'P2002'
            ) {
              lastConflict = err
              continue
            }
            throw err
          }
        }

        if (!attempt) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                status: 409,
                message:
                  'Versuch konnte wegen paralleler Anfragen nicht gespeichert werden. Bitte erneut versuchen.',
              })}\n\n`
            )
          )
          controller.close()
          console.error('[attempt] P2002 conflict after 3 retries', lastConflict)
          return
        }

        const attemptNumber = attempt.attemptNumber
        const shouldShowPopup =
          attemptNumber >= 3 ||
          judgeFeedback.score <= 4 ||
          (judgeFeedback.score >= 9 && attemptNumber >= 2)

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'judge',
              ...judgeFeedback,
              shouldShowPopup,
              attemptNumber,
            })}\n\n`
          )
        )
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (err) {
        console.error('[attempt] stream error', err)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              message: 'Verarbeitung fehlgeschlagen. Bitte erneut versuchen.',
            })}\n\n`
          )
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
