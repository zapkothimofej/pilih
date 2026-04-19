import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { getNextDifficultyWithScore } from '@/lib/adaptive/difficulty'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'
import { xpForDifficulty } from '@/lib/constants'
import { ChallengeNotFoundError } from '@/lib/errors'

const bodySchema = z.object({
  sessionId: z.string().min(1),
  difficultyRating: z.enum(['TOO_EASY', 'JUST_RIGHT', 'TOO_HARD']),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const { id: challengeId } = await params
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }
  const { sessionId, difficultyRating } = body

  // Ownership / session-challenge match check before opening a tx.
  const session = await prisma.dailySession.findUnique({ where: { id: sessionId } })
  if (!session) return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
  if (
    session.userId !== user.id ||
    session.selectedChallengeId !== challengeId
  ) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  // Pre-compute avgScore outside the tx — judgeScores on already-
  // persisted attempts don't change during completion, so reading
  // them under serializable would just hold the row locks longer.
  const attempts = await prisma.promptAttempt.findMany({
    where: { sessionId },
    select: { judgeScore: true },
  })
  const avgScore =
    attempts.length === 0
      ? null
      : attempts.reduce((sum, a) => sum + a.judgeScore, 0) / attempts.length

  // Everything that consumes currentDifficulty lives inside the tx so
  // a concurrent adjacent abschluss can't drift the computation —
  // re-read the Challenge row under the same tx, compute delta, and
  // write all three mutations together.
  let result: { xp: number; nextDifficulty: number; alreadyCompleted: boolean }
  try {
    result = await prisma.$transaction(async (tx) => {
      const current = await tx.dailySession.findUnique({
        where: { id: sessionId },
        select: { status: true, xpEarned: true },
      })
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        select: { currentDifficulty: true },
      })
      if (!challenge) throw new ChallengeNotFoundError()

      if (current?.status === 'COMPLETED') {
        const xp = current.xpEarned ?? xpForDifficulty(challenge.currentDifficulty)
        return { xp, nextDifficulty: challenge.currentDifficulty, alreadyCompleted: true }
      }

      const nextDifficulty = getNextDifficultyWithScore(
        challenge.currentDifficulty,
        difficultyRating,
        avgScore
      )
      // Relative delta so the generator's carefully balanced pool
      // distribution is preserved. An absolute overwrite on every
      // incomplete challenge would collapse the spread to a single
      // value and break selectDailyChallenges.
      const delta = nextDifficulty - challenge.currentDifficulty
      const xp = xpForDifficulty(challenge.currentDifficulty)

      await tx.dailySession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          difficultyRating,
          completedAt: new Date(),
          xpEarned: xp,
        },
      })
      await tx.challenge.update({
        where: { id: challengeId },
        data: { status: 'COMPLETED', currentDifficulty: nextDifficulty },
      })
      if (delta !== 0) {
        // Raw SQL because Prisma has no cross-row arithmetic + LEAST/GREATEST.
        await tx.$executeRaw`
          UPDATE "Challenge"
          SET "currentDifficulty" = LEAST(5, GREATEST(1, "currentDifficulty" + ${delta}))
          WHERE "userId" = ${user.id} AND "status" <> 'COMPLETED'::"ChallengeStatus"
        `
      }

      return { xp, nextDifficulty, alreadyCompleted: false }
    })
  } catch (err) {
    if (err instanceof ChallengeNotFoundError) {
      return NextResponse.json({ error: 'Challenge nicht gefunden' }, { status: 404 })
    }
    throw err
  }

  return NextResponse.json({
    success: true,
    xp: result.xp,
    nextDifficulty: result.nextDifficulty,
    avgScore,
    ...(result.alreadyCompleted ? { alreadyCompleted: true } : {}),
  })
}
