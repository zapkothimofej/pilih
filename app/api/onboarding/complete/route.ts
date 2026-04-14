import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const schema = z.object({
  companyName: z.string().min(1),
  department: z.string().min(1),
  jobTitle: z.string().min(1),
  dailyDescription: z.string().min(10),
  aiSkillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  aiToolsUsed: z.array(z.string()),
  aiFrequency: z.string().min(1),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

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
