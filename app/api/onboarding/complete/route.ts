import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'
import { z } from 'zod'

// Trim-refined minimums so whitespace-only values can't slip past
// the gate — a user typing "        " into dailyDescription used
// to pass `.min(10)` and drag that into the generator prompt,
// burning tokens on nothing.
const nonEmpty = (n: number) => (s: string) => s.trim().length >= n

const schema = z.object({
  companyName: z.string().min(1).max(200).refine(nonEmpty(1)),
  department: z.string().min(1).max(200).refine(nonEmpty(1)),
  jobTitle: z.string().min(1).max(200).refine(nonEmpty(1)),
  dailyDescription: z.string().min(10).max(2000).refine(nonEmpty(10)),
  aiSkillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  aiToolsUsed: z.array(z.string().min(1).max(50)).max(20),
  aiFrequency: z.string().min(1).max(200).refine(nonEmpty(1)),
})

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const profile = await prisma.onboardingProfile.upsert({
    where: { userId: user.id },
    update: { ...parsed.data, completedAt: new Date() },
    create: { userId: user.id, ...parsed.data, completedAt: new Date() },
  })

  return NextResponse.json({ success: true, profileId: profile.id })
}
