import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { generateChallenges } from '@/lib/ai/challenge-ai'
import { rateLimitAsync, rateLimitHeaders } from '@/lib/utils/rate-limit'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'

// 3 requests per hour — challenge generation is expensive (Claude Sonnet, 21 challenges)
const GENERATE_LIMIT = 3
const GENERATE_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const rl = await rateLimitAsync(`generate:${user.id}`, GENERATE_LIMIT, GENERATE_WINDOW_MS)
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

  // Atomic check-and-create: prevents duplicate generation under concurrent requests
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.challenge.count({ where: { userId: user.id } })
    if (existing > 0) {
      return NextResponse.json({ success: true, count: existing, cached: true })
    }

    const generated = await generateChallenges(profile)

    await tx.challenge.createMany({
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
  })
}
