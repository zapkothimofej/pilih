'use client'

import { useEffect, useState } from 'react'
import { TrophyIcon, CheckIcon } from '@/components/ui/icons'
import AnimatedNumber from '@/components/ui/animations/AnimatedNumber'

type Participant = {
  id: string; name: string; email: string; company: string
  tier: string; completed: number; progress: number
  hasCertificate: boolean; onboarded: boolean
}

const TIER_LABELS: Record<string, string> = { BASE: '399 €', PRO: '499 €', PREMIUM: '999 €' }

export default function AdminClient({
  participants: initial, stats, totalCount, pageSize, isSuperAdmin,
}: {
  participants: Participant[]
  stats: { total: number; active: number; finished: number; avgProgress: number }
  totalCount: number
  pageSize: number
  isSuperAdmin: boolean
}) {
  const [search, setSearch] = useState('')
  const [participants, setParticipants] = useState(initial)
  const [page, setPage] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initial.length < totalCount)

  // Search is client-side across already-loaded rows. Pagination loads more
  // rows from the API and appends them. For large tenants a server-side
  // search would be more correct, but this keeps the cheap path fast.
  useEffect(() => {
    setParticipants(initial)
    setPage(0)
    setHasMore(initial.length < totalCount)
  }, [initial, totalCount])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/admin/teilnehmer?page=${nextPage}&limit=${pageSize}`)
      if (!res.ok) throw new Error('Laden fehlgeschlagen')
      const body = (await res.json()) as {
        data: Participant[]
        hasMore: boolean
      }
      setParticipants((prev) => [...prev, ...body.data])
      setPage(nextPage)
      setHasMore(body.hasMore)
    } catch {
      // swallow — user can retry via button
    } finally {
      setLoadingMore(false)
    }
  }

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
          { label: 'Gesamt', value: stats.total, suffix: '' },
          { label: 'Aktiv', value: stats.active, suffix: '' },
          { label: 'Abgeschlossen', value: stats.finished, suffix: '' },
          { label: 'Ø Fortschritt', value: stats.avgProgress, suffix: '%' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border p-4 text-center"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
          >
            <AnimatedNumber
              value={s.value}
              suffix={s.suffix}
              className="text-2xl font-bold tabular-nums block"
              style={{ color: 'var(--text-primary)' }}
              onScroll={false}
            />
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
        className="input-accent w-full rounded-xl px-4 py-2.5 text-sm"
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

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2.5 rounded-xl text-sm font-medium border transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          {loadingMore
            ? 'Lade…'
            : `Mehr laden (${participants.length} / ${totalCount})`}
        </button>
      )}
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
