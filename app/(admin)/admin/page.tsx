import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import AdminClient from './AdminClient'

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

  const participants = await prisma.user.findMany({
    where,
    include: {
      company: true,
      sessions: { where: { status: 'COMPLETED' } },
      certificate: true,
      onboarding: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = participants.map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    company: p.company?.name ?? '—',
    tier: p.tier,
    completed: p.sessions.length,
    progress: Math.round((p.sessions.length / 21) * 100),
    hasCertificate: !!p.certificate,
    onboarded: !!p.onboarding?.completedAt,
  }))

  const stats = {
    total: data.length,
    active: data.filter(p => p.completed > 0 && p.completed < 21).length,
    finished: data.filter(p => p.completed === 21).length,
    avgProgress: data.length ? Math.round(data.reduce((a, p) => a + p.progress, 0) / data.length) : 0,
  }

  return <AdminClient participants={data} stats={stats} isSuperAdmin={user.role === 'SUPER_ADMIN'} />
}
