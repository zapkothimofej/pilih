import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { getNextDifficultyWithScore } from '@/lib/adaptive/difficulty'
import { getCurrentDbUser } from '@/lib/utils/auth'

const bodySchema = z.object({
  sessionId: z.string().min(1),
  difficultyRating: z.enum(['TOO_EASY', 'JUST_RIGHT', 'TOO_HARD']),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // Idempotenz: bereits abgeschlossen → persisted xpEarned zurückgeben
  if (session.status === 'COMPLETED') {
    const xp = session.xpEarned ?? 100 + (challenge.currentDifficulty - 1) * 20
    return NextResponse.json({
      success: true,
      xp,
      nextDifficulty: challenge.currentDifficulty,
      avgScore: null,
      alreadyCompleted: true,
    })
  }

  const attempts = await prisma.promptAttempt.findMany({
    where: { sessionId },
    select: { judgeScore: true },
  })
  const avgScore =
    attempts.length === 0
      ? null
      : attempts.reduce((sum, a) => sum + a.judgeScore, 0) / attempts.length

  const nextDifficulty = getNextDifficultyWithScore(
    challenge.currentDifficulty,
    difficultyRating,
    avgScore
  )

  const xp = 100 + (challenge.currentDifficulty - 1) * 20

  // Move completion check inside transaction to prevent double-completion race.
  await prisma.$transaction(async (tx) => {
    const current = await tx.dailySession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    })
    if (current?.status === 'COMPLETED') return

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
    await tx.challenge.updateMany({
      where: { userId: user.id, status: { not: 'COMPLETED' } },
      data: { currentDifficulty: nextDifficulty },
    })
  })

  return NextResponse.json({ success: true, xp, nextDifficulty, avgScore })
}
