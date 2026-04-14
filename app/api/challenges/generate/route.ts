import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { generateChallenges } from '@/lib/ai/challenge-ai'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

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
