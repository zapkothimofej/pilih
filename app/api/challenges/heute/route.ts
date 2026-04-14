import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { selectDailyChallenges } from '@/lib/adaptive/difficulty'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  // Bereits abgeschlossene Tage
  const completedSessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    orderBy: { dayNumber: 'asc' },
  })
  const completedDays = completedSessions.map((s) => s.dayNumber)
  const nextDay = completedDays.length + 1

  if (nextDay > 21) {
    return NextResponse.json({ done: true, message: 'Alle 21 Tage abgeschlossen!' })
  }

  // Heutige Session bereits gestartet?
  const todaySession = await prisma.dailySession.findFirst({
    where: { userId: user.id, dayNumber: nextDay, status: { not: 'COMPLETED' } },
    include: { selectedChallenge: true },
  })

  if (todaySession?.selectedChallengeId) {
    // Challenge bereits ausgewählt — direkt zur Challenge-Seite
    return NextResponse.json({
      redirect: `/challenge/${todaySession.selectedChallengeId}`,
      sessionId: todaySession.id,
    })
  }

  // Letzte Schwierigkeit bestimmen (aus letzter Session)
  const lastCompleted = completedSessions.at(-1)
  const lastChallenge = lastCompleted?.selectedChallengeId
    ? await prisma.challenge.findUnique({ where: { id: lastCompleted.selectedChallengeId } })
    : null
  const targetDifficulty = lastChallenge?.currentDifficulty ?? 2

  // Verfügbare Challenges (nicht abgeschlossen, nicht die letzte)
  const available = await prisma.challenge.findMany({
    where: {
      userId: user.id,
      status: 'UPCOMING',
    },
  })

  const selected = selectDailyChallenges(available, targetDifficulty, 3)

  return NextResponse.json({
    day: nextDay,
    challenges: selected,
    sessionId: todaySession?.id ?? null,
  })
}
