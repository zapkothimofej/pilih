import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import AdminClient from './AdminClient'

const PAGE_SIZE = 50

export default async function AdminPage() {
  let user
  try {
    user = await requireRole(['COMPANY_ADMIN', 'SUPER_ADMIN'])
  } catch {
    redirect('/dashboard')
  }

  if (user.role === 'COMPANY_ADMIN' && !user.companyId) redirect('/dashboard')

  const where = user.role === 'COMPANY_ADMIN'
    ? { companyId: user.companyId!, role: 'PARTICIPANT' as const }
    : { role: 'PARTICIPANT' as const }

  // Aggregates on the DB so we don't drag N users × 21 sessions into the
  // RSC render. First-page rows are hydrated with a lean select + a single
  // completed-session count via _count. Further pages come from the
  // paginated API route the client already knows how to hit.
  const [rows, totalCount, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        company: { select: { name: true } },
        onboarding: { select: { completedAt: true } },
        certificate: { select: { id: true } },
        _count: { select: { sessions: { where: { status: 'COMPLETED' } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    (async () => {
      const [total, finished, activeCompletedSessions] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.count({
          where: { ...where, certificate: { isNot: null } },
        }),
        prisma.dailySession.groupBy({
          by: ['userId'],
          where: { status: 'COMPLETED', user: where },
          _count: { _all: true },
        }),
      ])
      const active = activeCompletedSessions.filter(
        (a) => a._count._all > 0 && a._count._all < 21
      ).length
      const totalCompleted = activeCompletedSessions.reduce((s, a) => s + a._count._all, 0)
      const avgProgress = total
        ? Math.round(((totalCompleted / total) / 21) * 100)
        : 0
      return { total, active, finished, avgProgress }
    })(),
  ])

  const data = rows.map((u) => {
    const completed = u._count.sessions
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

  return (
    <AdminClient
      participants={data}
      stats={stats}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
      isSuperAdmin={user.role === 'SUPER_ADMIN'}
    />
  )
}
