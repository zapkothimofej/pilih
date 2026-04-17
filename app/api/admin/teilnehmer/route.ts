import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { getCurrentDbUser } from '@/lib/utils/auth'

const querySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(req: NextRequest) {
  const requestingUser = await getCurrentDbUser()
  if (!requestingUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(requestingUser.role)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  if (requestingUser.role === 'COMPANY_ADMIN' && !requestingUser.companyId) {
    return NextResponse.json({ error: 'Kein Unternehmen zugewiesen' }, { status: 403 })
  }

  const { page, limit } = querySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams)
  )

  const where = requestingUser.role === 'COMPANY_ADMIN'
    ? { companyId: requestingUser.companyId!, role: 'PARTICIPANT' as const }
    : { role: 'PARTICIPANT' as const }

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        createdAt: true,
        company: { select: { name: true } },
        onboarding: { select: { completedAt: true } },
        sessions: { where: { status: 'COMPLETED' }, select: { id: true } },
        certificate: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  const data = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company?.name ?? '—',
    tier: u.tier,
    completed: u.sessions.length,
    progress: Math.round((u.sessions.length / 21) * 100),
    hasCertificate: !!u.certificate,
    onboarded: !!u.onboarding?.completedAt,
  }))

  return NextResponse.json({ data, totalCount, hasMore: page * limit + limit < totalCount })
}
