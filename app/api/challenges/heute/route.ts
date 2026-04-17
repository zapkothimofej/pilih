import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { selectDailyChallenges } from '@/lib/adaptive/difficulty'

export async function GET() {
  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const completedSessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    orderBy: { dayNumber: 'asc' },
  })

  const completedDays = completedSessions.map((s) => s.dayNumber)
  // Robust: gaps (skipped days) werden korrekt behandelt. Nach Tag 1,3,5 → nächster Tag ist 6, nicht 4.
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

  // Letzte abgeschlossene Schwierigkeit bestimmen — nutzt currentDifficulty (adaptiv),
  // nicht die Original-difficulty. Default 2 falls nichts vorhanden.
  const lastCompleted = completedSessions.at(-1)
  const lastChallenge =
    lastCompleted?.selectedChallengeId != null
      ? await prisma.challenge.findUnique({ where: { id: lastCompleted.selectedChallengeId } })
      : null
  const targetDifficulty = lastChallenge?.currentDifficulty ?? 2

  const available = await prisma.challenge.findMany({
    where: { userId: user.id, status: 'UPCOMING' },
  })

  if (available.length === 0) {
    return NextResponse.json(
      { error: 'Pool leer: keine Challenges vorhanden. Bitte zuerst generieren.', day: nextDay, challenges: [] },
      { status: 409 }
    )
  }

  // Bei sehr kleinem Pool geben wir weniger als 3 Vorschläge zurück — UI muss das handhaben.
  const requested = Math.min(3, available.length)
  const selected = selectDailyChallenges(available, targetDifficulty, requested)

  return NextResponse.json({
    day: nextDay,
    challenges: selected,
    sessionId: todaySession?.id ?? null,
    poolSize: available.length,
  })
}
