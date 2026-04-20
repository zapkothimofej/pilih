import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { selectDailyChallenges } from '@/lib/adaptive/difficulty'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { rateLimit, rateLimitHeaders } from '@/lib/utils/rate-limit'

const HEUTE_LIMIT = 60
const HEUTE_WINDOW_MS = 60_000

export async function GET() {
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  // Per-user polling guard — the client re-fetches on nav, but a runaway
  // loop or abusive poller would otherwise drive a DailySession+Challenge
  // JOIN at full request rate. In-memory bucket is enough here: the query
  // is per-user and lives on a single serverless instance for the
  // duration of a hot path.
  const limit = rateLimit(`heute:${user.id}`, HEUTE_LIMIT, HEUTE_WINDOW_MS)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte kurz warten.' },
      { status: 429, headers: rateLimitHeaders(limit, HEUTE_LIMIT) }
    )
  }

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
