import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { generateChallenges } from '@/lib/ai/challenge-ai'
import { rateLimit, rateLimitHeaders } from '@/lib/utils/rate-limit'

// 3 requests per hour — challenge generation is expensive (Claude Sonnet, 21 challenges)
const GENERATE_LIMIT = 3
const GENERATE_WINDOW_MS = 60 * 60 * 1000

export async function POST() {
  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const rl = rateLimit(`generate:${user.id}`, GENERATE_LIMIT, GENERATE_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte warte eine Stunde.' },
      { status: 429, headers: rateLimitHeaders(rl, GENERATE_LIMIT) }
    )
  }

  const profile = await prisma.onboardingProfile.findUnique({ where: { userId: user.id } })
  if (!profile?.completedAt) {
    return NextResponse.json({ error: 'Onboarding nicht abgeschlossen' }, { status: 400 })
  }

  // Bereits generiert? Nicht nochmal generieren
  const existing = await prisma.challenge.count({ where: { userId: user.id } })
  if (existing > 0) {
    return NextResponse.json({ success: true, count: existing, cached: true })
  }

  const generated = await generateChallenges(profile)

  await prisma.challenge.createMany({
    data: generated.map((c) => ({
      userId: user.id,
      dayNumber: c.dayNumber,
      title: c.title,
      description: c.description,
      promptingTips: c.promptingTips,
      category: c.category,
      difficulty: c.difficulty,
      currentDifficulty: c.difficulty,
      status: 'UPCOMING',
    })),
  })

  return NextResponse.json({ success: true, count: generated.length })
}
