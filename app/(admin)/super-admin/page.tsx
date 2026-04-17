import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { TrophyIcon, BarChartIcon, BotIcon } from '@/components/ui/icons'

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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Super Admin
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Yesterday Academy — Gesamtübersicht
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Firmen', value: companies.length, icon: <BuildingIcon /> },
          { label: 'Teilnehmer gesamt', value: totalUsers, icon: <BotIcon size={16} /> },
          { label: 'Zertifikate ausgestellt', value: certCount, icon: <TrophyIcon size={16} /> },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-2xl border p-5 text-center"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex justify-center mb-2" style={{ color: 'var(--accent)' }}>
              {s.icon}
            </div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Firmen
        </h2>
        {companies.map(company => {
          const participants = company.users.filter(u => u.sessions)
          const avgProgress = participants.length
            ? Math.round(participants.reduce((a, u) => a + u.sessions.length, 0) / participants.length / 21 * 100)
            : 0
          const certs = participants.filter(u => u.certificate).length

          return (
            <div
              key={company.id}
              className="rounded-2xl border p-4"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {company.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {participants.length} Teilnehmer · {certs} Zertifikate
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                    {avgProgress}%
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Ø Fortschritt</div>
                </div>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${avgProgress}%`, background: 'var(--accent)' }}
                />
              </div>
            </div>
          )
        })}
        {companies.length === 0 && (
          <div
            className="text-center py-10 text-sm rounded-2xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
          >
            Noch keine Firmen registriert
          </div>
        )}
      </div>
    </div>
  )
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 14V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10" />
      <path d="M1 14h14" />
      <path d="M6 14V9h4v5" />
      <path d="M5 6h1M10 6h1M5 9h1M10 9h1" />
    </svg>
  )
}
