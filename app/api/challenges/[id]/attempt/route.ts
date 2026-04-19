import { NextResponse } from 'next/server'
import { z } from 'zod'

import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { streamChallengeResponse } from '@/lib/ai/challenge-ai'
import { judgePrompt } from '@/lib/ai/judge-ai'
import { rateLimitAsync, rateLimitHeaders } from '@/lib/utils/rate-limit'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'
import { logError } from '@/lib/utils/log'

// Haiku stream + Sonnet judge overlap — upper bound protects against
// the 120 s client timeout defined in ChatInterface.tsx.
export const maxDuration = 60

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
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

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
    // Abort the judge when the Haiku stream itself blows up — stops
    // paying for tokens no one will consume.
    judgeAbort.abort()
    logError('attempt', 'judge failed in parallel', err)
    throw err
  })
  // Attach a no-op .catch so an unconsumed rejection (e.g. when the
  // caller aborts mid-flight) doesn't trigger node's unhandledRejection.
  judgePromise.catch(() => {})

  // `closed` protects against the controller.close/enqueue race. The
  // abort listener used to call close() directly, which throws
  // `TypeError: Invalid state` if the loop is mid-enqueue. Track the
  // flag and guard all enqueue calls.
  let closed = false
  function safeEnqueue(payload: string): void {
    if (closed) return
    try {
      // Controller may still be in an aborting state between the flag
      // flipping and the next microtask — swallow the resulting throw.
      // eslint-disable-next-line no-use-before-define
      streamController?.enqueue(encoder.encode(payload))
    } catch {
      /* controller already closed by reader cancel */
    }
  }

  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
  const stream = new ReadableStream({
    async start(controller) {
      streamController = controller
      req.signal.addEventListener('abort', () => {
        closed = true
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
          safeEnqueue(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
        }

        // If the client disconnected but we already paid for Haiku AND
        // judge, persist the attempt anyway so the user's progress
        // isn't lost and we have a record for rate-limit/billing.
        const clientGone = req.signal.aborted
        if (clientGone && fullResponse.length === 0) {
          // Nothing useful streamed — nothing worth persisting.
          return
        }

        // Judge wurde parallel gestartet — hier nur awaiten.
        const judgeFeedback = await judgePromise

        // Count is advisory and not row-locked; concurrent requests can land on
        // the same `attemptNumber`. The DB-level `@@unique([sessionId,
        // attemptNumber])` is the real guard — retry on P2002.
        // Using _max instead of count avoids the infinite-P2002 failure
        // mode when an admin hard-deletes an attempt row: count shrinks
        // but the remaining rows' attemptNumbers stay, so count+1
        // collides with an existing number forever. _max+1 always
        // finds a free slot.
        let attempt: Awaited<ReturnType<typeof prisma.promptAttempt.create>> | null = null
        let lastConflict: unknown = null
        for (let i = 0; i < 3 && !attempt; i++) {
          const maxAttempt = await prisma.promptAttempt.aggregate({
            where: { sessionId },
            _max: { attemptNumber: true },
          })
          const nextAttemptNumber = (maxAttempt._max.attemptNumber ?? 0) + 1
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
                attemptNumber: nextAttemptNumber,
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
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'error',
              status: 409,
              message:
                'Versuch konnte wegen paralleler Anfragen nicht gespeichert werden. Bitte erneut versuchen.',
              partialResponse: fullResponse.slice(0, 500),
            })}\n\n`
          )
          closed = true
          try { controller.close() } catch { /* already closed */ }
          logError('attempt', 'P2002 conflict after 3 retries', lastConflict)
          return
        }

        const attemptNumber = attempt.attemptNumber
        const shouldShowPopup =
          attemptNumber >= 3 ||
          judgeFeedback.score <= 4 ||
          (judgeFeedback.score >= 9 && attemptNumber >= 2)

        safeEnqueue(
          `data: ${JSON.stringify({
            type: 'judge',
            ...judgeFeedback,
            shouldShowPopup,
            attemptNumber,
          })}\n\n`
        )
        safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        closed = true
        try { controller.close() } catch { /* already closed */ }
      } catch (err) {
        if (req.signal.aborted) {
          closed = true
          try { controller.close() } catch { /* already closed */ }
          return
        }
        logError('attempt', 'stream error', err)
        // dropAssistant tells the client to strip the assistant bubble
        // it optimistically appended before the stream completed — so
        // a Haiku-succeeds-then-judge-fails case doesn't leave an
        // un-persisted answer in the UI the user "sees" but the DB
        // never saw.
        safeEnqueue(
          `data: ${JSON.stringify({
            type: 'error',
            message: 'Verarbeitung fehlgeschlagen. Bitte erneut versuchen.',
            dropAssistant: true,
          })}\n\n`
        )
        closed = true
        try { controller.close() } catch { /* already closed */ }
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
