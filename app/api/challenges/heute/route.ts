import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { selectDailyChallenges } from '@/lib/adaptive/difficulty'
import { getCurrentDbUser } from '@/lib/utils/auth'
export async function GET() {
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  // Only the most recent completed session is needed to compute next day
  // and targetDifficulty — previously this route loaded every completed
  // session (up to 21 × full challenge JOIN) just to read .at(-1).
  const lastCompleted = await prisma.dailySession.findFirst({
    where: { userId: user.id, status: 'COMPLETED' },
    include: { selectedChallenge: { select: { currentDifficulty: true } } },
    orderBy: { dayNumber: 'desc' },
  })

  const nextDay = (lastCompleted?.dayNumber ?? 0) + 1

  if (nextDay > 21) {
    return NextResponse.json({ done: true, message: 'Alle 21 Tage abgeschlossen!' })
  }

  const todaySession = await prisma.dailySession.findFirst({
    where: { userId: user.id, dayNumber: nextDay, status: { not: 'COMPLETED' } },
    include: { selectedChallenge: true },
  })

  if (todaySession?.selectedChallengeId) {
    return NextResponse.json({
      redirect: `/challenge/${todaySession.selectedChallengeId}?session=${todaySession.id}`,
      sessionId: todaySession.id,
    })
  }

  const targetDifficulty = lastCompleted?.selectedChallenge?.currentDifficulty ?? 2

  const available = await prisma.challenge.findMany({
    where: { userId: user.id, status: 'UPCOMING' },
  })

  if (available.length === 0) {
    return NextResponse.json(
      { error: 'Pool leer: keine Challenges vorhanden. Bitte zuerst generieren.', day: nextDay, challenges: [] },
      { status: 503 }
    )
  }

  const requested = Math.min(3, available.length)
  // Deterministic shuffle keyed by userId + UTC day → refreshing the
  // page shows the same three cards rather than re-rolling.
  const seed = `${user.id}:${new Date().toISOString().slice(0, 10)}`
  const selected = selectDailyChallenges(available, targetDifficulty, requested, seed)

  return NextResponse.json({
    day: nextDay,
    challenges: selected,
    sessionId: todaySession?.id ?? null,
    poolSize: available.length,
  })
}
