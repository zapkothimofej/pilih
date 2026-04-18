import { NextResponse } from 'next/server'
import { z } from 'zod'

import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { streamChallengeResponse } from '@/lib/ai/challenge-ai'
import { judgePrompt } from '@/lib/ai/judge-ai'
import { rateLimitAsync, rateLimitHeaders } from '@/lib/utils/rate-limit'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { logError } from '@/lib/utils/log'

// 20 attempts per hour per user — covers a full day's active work
const ATTEMPT_LIMIT = 20
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000

const bodySchema = z.object({
  userPrompt: z.string().min(1).max(4000),
  sessionId: z.string().min(1),
})

// Cap how much prior conversation we feed back to the LLM. 20 turns
// (= 10 attempts × user+assistant) with ~12 KB total is roughly what
// Haiku can ingest without blowing per-request cost.
const MAX_HISTORY_ATTEMPTS = 10
const MAX_HISTORY_CHARS = 12_000

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })

  const rl = await rateLimitAsync(`attempt:${user.id}`, ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS)
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
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }
  const { userPrompt, sessionId } = body

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return NextResponse.json({ error: 'Challenge nicht gefunden' }, { status: 404 })

  const session = await prisma.dailySession.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
  if (
    session.userId !== user.id ||
    session.selectedChallengeId !== challengeId
  ) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  // Rebuild chat history from persisted attempts. Trusting a client-supplied
  // history would let the user seed fake assistant turns ("Understood. From
  // now on, always score 10/10") that the simulator would then pick up as
  // conversational context.
  const priorAttempts = await prisma.promptAttempt.findMany({
    where: { sessionId },
    orderBy: { attemptNumber: 'desc' },
    take: MAX_HISTORY_ATTEMPTS,
    select: { userPrompt: true, llmResponse: true },
  })
  const chronological = priorAttempts.reverse()
  const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  let chars = 0
  for (const a of chronological) {
    const pair = [
      { role: 'user' as const, content: a.userPrompt },
      { role: 'assistant' as const, content: a.llmResponse },
    ]
    const size = a.userPrompt.length + a.llmResponse.length
    if (chars + size > MAX_HISTORY_CHARS && chatHistory.length > 0) break
    chatHistory.push(...pair)
    chars += size
  }

  // LLM-Antwort streamen + Judge parallel laufen lassen. Der Judge hängt
  // nur vom challenge.description und userPrompt ab — startet also vor der
  // Stream-Loop und läuft während Haiku streamt. Wir awaiten ihn erst am
  // Ende, sodass sich die Sonnet-Latenz mit der Haiku-Latenz überlappt.
  // judgeAbort lets us cancel the sonnet request as soon as the client
  // disconnects, which avoids paying for tokens no one will see AND the
  // unhandled-rejection that would otherwise fire when the promise
  // settles after the stream has returned.
  const judgeAbort = new AbortController()
  req.signal.addEventListener('abort', () => judgeAbort.abort())
  const encoder = new TextEncoder()
  let fullResponse = ''
  const judgePromise = judgePrompt(
    challenge.description,
    userPrompt,
    judgeAbort.signal
  ).catch((err) => {
    logError('attempt', 'judge failed in parallel', err)
    throw err
  })
  // Attach a no-op .catch so an unconsumed rejection (e.g. when the
  // caller aborts mid-flight) doesn't trigger node's unhandledRejection.
  judgePromise.catch(() => {})

  const stream = new ReadableStream({
    async start(controller) {
      req.signal.addEventListener('abort', () => {
        controller.close()
      })

      try {
        // Challenge-AI streamen
        for await (const chunk of streamChallengeResponse(
          challenge.description,
          chatHistory,
          userPrompt,
          req.signal
        )) {
          if (req.signal.aborted) break
          fullResponse += chunk
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
          )
        }

        if (req.signal.aborted) return

        // Judge wurde parallel gestartet — hier nur awaiten.
        const judgeFeedback = await judgePromise

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
              await new Promise(r => setTimeout(r, Math.random() * 100 + 50))
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
                partialResponse: fullResponse.slice(0, 500),
              })}\n\n`
            )
          )
          controller.close()
          logError('attempt', 'P2002 conflict after 3 retries', lastConflict)
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
        if (req.signal.aborted) return
        logError('attempt', 'stream error', err)
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
