'use client'

import { useState } from 'react'
import { TrophyIcon, CheckIcon } from '@/components/ui/icons'

type Participant = {
  id: string; name: string; email: string; company: string
  tier: string; completed: number; progress: number
  hasCertificate: boolean; onboarded: boolean
}

const TIER_LABELS: Record<string, string> = { BASE: '399 €', PRO: '499 €', PREMIUM: '999 €' }

export default function AdminClient({
  participants, stats, isSuperAdmin,
}: {
  participants: Participant[]
  stats: { total: number; active: number; finished: number; avgProgress: number }
  isSuperAdmin: boolean
}) {
  const [search, setSearch] = useState('')

  const filtered = participants.filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) ||
         p.email.toLowerCase().includes(search.toLowerCase()) ||
         p.company.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Übersicht aller Teilnehmer
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Gesamt', value: stats.total },
          { label: 'Aktiv', value: stats.active },
          { label: 'Abgeschlossen', value: stats.finished },
          { label: 'Ø Fortschritt', value: `${stats.avgProgress}%` },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-2xl border p-4 text-center"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
          >
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Name, E-Mail oder Firma suchen…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent-border)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
      />

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {['Name', 'Firma', 'Tier', 'Fortschritt', 'Status'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                className="border-b transition-colors"
                style={{
                  borderColor: i === filtered.length - 1 ? 'transparent' : 'var(--border-subtle)',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
              >
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.email}</div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {p.company}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {TIER_LABELS[p.tier]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-20 h-1 rounded-full overflow-hidden"
                      style={{ background: 'var(--border-default)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.progress}%`, background: 'var(--accent)' }}
                      />
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {p.completed}/21
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.hasCertificate ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--success)' }}>
                      <TrophyIcon size={12} /> Zertifiziert
                    </span>
                  ) : p.completed === 21 ? (
                    <span className="text-xs" style={{ color: 'var(--warning)' }}>Im Abschluss</span>
                  ) : p.completed > 0 ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      <ActiveDot /> Aktiv
                    </span>
                  ) : p.onboarded ? (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <CheckIcon size={11} /> Onboarded
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Neu</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Keine Teilnehmer gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActiveDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ background: 'var(--accent)' }}
    />
  )
}
