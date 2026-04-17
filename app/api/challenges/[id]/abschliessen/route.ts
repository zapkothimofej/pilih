import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { getNextDifficultyWithScore } from '@/lib/adaptive/difficulty'

const bodySchema = z.object({
  sessionId: z.string().min(1),
  difficultyRating: z.enum(['TOO_EASY', 'JUST_RIGHT', 'TOO_HARD']),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params
  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch (err) {
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

  // Idempotenz: Doppelklick soll kein doppeltes XP/Difficulty-Update erzeugen.
  if (session.status === 'COMPLETED') {
    const xp = 100 + (challenge.currentDifficulty - 1) * 20
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

  // XP berechnen (Basis: 100, Bonus für höhere Schwierigkeit) — auf Basis
  // der Difficulty zum Abschlusszeitpunkt.
  const xp = 100 + (challenge.currentDifficulty - 1) * 20

  // Alles oder nichts: Session-Abschluss, Challenge-Status und Difficulty-
  // Anpassung für kommende Tage in einer Transaktion.
  await prisma.$transaction([
    prisma.dailySession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        difficultyRating,
        completedAt: new Date(),
      },
    }),
    prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'COMPLETED', currentDifficulty: nextDifficulty },
    }),
    // Propagate the new target difficulty to all the user's challenges so
    // `heute` reads a fresh value (the completed row is covered by step 2).
    prisma.challenge.updateMany({
      where: { userId: user.id, status: { not: 'COMPLETED' } },
      data: { currentDifficulty: nextDifficulty },
    }),
  ])

  return NextResponse.json({ success: true, xp, nextDifficulty, avgScore })
}
