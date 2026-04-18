import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'
import { z } from 'zod'

const schema = z.object({
  companyName: z.string().min(1).max(200),
  department: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  dailyDescription: z.string().min(10).max(2000),
  aiSkillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  aiToolsUsed: z.array(z.string().min(1).max(50)).max(20),
  aiFrequency: z.string().min(1).max(200),
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
