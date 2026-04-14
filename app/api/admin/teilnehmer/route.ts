import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const requestingUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!requestingUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(requestingUser.role)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  const where = requestingUser.role === 'COMPANY_ADMIN'
    ? { companyId: requestingUser.companyId ?? undefined, role: 'PARTICIPANT' as const }
    : { role: 'PARTICIPANT' as const }

  const users = await prisma.user.findMany({
    where,
    include: {
      company: true,
      onboarding: true,
      sessions: { where: { status: 'COMPLETED' } },
      certificate: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = users.map(u => {
    const completed = u.sessions.length
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      company: u.company?.name ?? '—',
      tier: u.tier,
      completed,
      progress: Math.round((completed / 21) * 100),
      hasCertificate: !!u.certificate,
      onboarded: !!u.onboarding?.completedAt,
    }
  })

  return NextResponse.json(data)
}
