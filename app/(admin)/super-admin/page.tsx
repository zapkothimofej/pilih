import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'

export default async function SuperAdminPage() {
  try {
    await requireRole(['SUPER_ADMIN'])
  } catch {
    redirect('/dashboard')
  }

  const [companies, totalUsers, certCount] = await Promise.all([
    prisma.company.findMany({
      include: { users: { include: { sessions: { where: { status: 'COMPLETED' } }, certificate: true } } },
    }),
    prisma.user.count({ where: { role: 'PARTICIPANT' } }),
    prisma.certificate.count(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Super Admin</h1>
        <p className="text-zinc-400 text-sm mt-1">Yesterday Academy — Gesamtübersicht</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Firmen', value: companies.length, icon: '🏢' },
          { label: 'Teilnehmer gesamt', value: totalUsers, icon: '👥' },
          { label: 'Zertifikate ausgestellt', value: certCount, icon: '🏆' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Firmen</h2>
        {companies.map(company => {
          const participants = company.users.filter(u => u.sessions)
          const avgProgress = participants.length
            ? Math.round(participants.reduce((a, u) => a + u.sessions.length, 0) / participants.length / 21 * 100)
            : 0
          const certs = participants.filter(u => u.certificate).length

          return (
            <div key={company.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{company.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{participants.length} Teilnehmer · {certs} Zertifikate</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-400">{avgProgress}%</div>
                  <div className="text-xs text-zinc-600">Ø Fortschritt</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${avgProgress}%` }} />
              </div>
            </div>
          )
        })}
        {companies.length === 0 && (
          <div className="text-center py-8 text-zinc-600">Noch keine Firmen registriert</div>
        )}
      </div>
    </div>
  )
}
