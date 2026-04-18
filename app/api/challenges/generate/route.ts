import { NextResponse } from 'next/server'

import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/db/prisma'
import { generateChallenges } from '@/lib/ai/challenge-ai'
import { rateLimitAsync, rateLimitHeaders } from '@/lib/utils/rate-limit'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'
import { logError } from '@/lib/utils/log'

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

  // Fast path: challenges already exist, no LLM call needed.
  const existing = await prisma.challenge.count({ where: { userId: user.id } })
  if (existing > 0) {
    return NextResponse.json({ success: true, count: existing, cached: true })
  }

  // Run the Sonnet call OUTSIDE the Prisma $transaction. A cold LLM
  // invocation takes 15–40 s, which blows well past Prisma's default
  // 5 s transaction timeout and serializes a connection for the
  // duration. The DB-level @@unique([userId, dayNumber]) constraint
  // is the real atomicity guard — two concurrent generators collide
  // on P2002 on the second createMany, and we respond with "cached"
  // because the first attempt's rows are now present.
  let generated: Awaited<ReturnType<typeof generateChallenges>>
  try {
    // Thread the request's AbortSignal into the Anthropic SDK so a
    // tab close cancels the 15–40s Sonnet call instead of burning
    // tokens on output no one will see.
    generated = await generateChallenges(profile, req.signal)
  } catch (err) {
    if (req.signal.aborted) {
      return NextResponse.json({ error: 'Abgebrochen' }, { status: 499 })
    }
    logError('challenges.generate', 'LLM generation failed', err)
    return NextResponse.json(
      { error: 'Challenge-Generierung fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 502 }
    )
  }

  try {
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
      skipDuplicates: true,
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const count = await prisma.challenge.count({ where: { userId: user.id } })
      return NextResponse.json({ success: true, count, cached: true })
    }
    throw err
  }

  return NextResponse.json({ success: true, count: generated.length })
}
