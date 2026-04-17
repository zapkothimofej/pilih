import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { selectDailyChallenges } from '@/lib/adaptive/difficulty'
import { getCurrentDbUser } from '@/lib/utils/auth'

export async function GET() {
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const completedSessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    include: { selectedChallenge: true },
    orderBy: { dayNumber: 'asc' },
  })

  const completedDays = completedSessions.map((s) => s.dayNumber)
  const highestCompleted = completedDays.length > 0 ? Math.max(...completedDays) : 0
  const nextDay = highestCompleted + 1

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

  // Use already-loaded selectedChallenge from completedSessions — no extra DB round-trip
  const lastCompleted = completedSessions.at(-1)
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
  const selected = selectDailyChallenges(available, targetDifficulty, requested)

  return NextResponse.json({
    day: nextDay,
    challenges: selected,
    sessionId: todaySession?.id ?? null,
    poolSize: available.length,
  })
}
