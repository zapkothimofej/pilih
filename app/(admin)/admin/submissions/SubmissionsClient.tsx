'use client'

import { useState } from 'react'
import { CheckIcon, CloseIcon } from '@/components/ui/icons'
import type { Prisma, SubmissionStatus } from '@/app/generated/prisma/client'

type UseCase = { title: string; description: string; prompt: string; result: string }

// DTO narrowed to exactly what the server page selects. Never
// carries llmReview — that would leak other admins' override notes.
type Submission = {
  id: string
  status: SubmissionStatus
  useCase1: Prisma.JsonValue
  useCase2: Prisma.JsonValue
  useCase3: Prisma.JsonValue
  submittedAt: Date
  reviewedAt: Date | null
  user: { id: string; name: string; email: string }
}

const STATUS_LABEL: Record<Submission['status'], string> = {
  PENDING: 'Offen',
  APPROVED: 'Freigegeben',
  REJECTED: 'Abgelehnt',
}

const STATUS_STYLE: Record<Submission['status'], { bg: string; color: string }> = {
  PENDING: { bg: 'var(--warning-dim)', color: 'var(--warning)' },
  APPROVED: { bg: 'var(--success-dim)', color: 'var(--success)' },
  REJECTED: { bg: 'var(--error-dim)', color: 'var(--error)' },
}

export default function SubmissionsClient({ initial }: { initial: Submission[] }) {
  const [items, setItems] = useState<Submission[]>(initial)
  const [filter, setFilter] = useState<'ALL' | Submission['status']>('PENDING')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? items : items.filter((s) => s.status === filter)

  async function override(id: string, status: 'APPROVED' | 'REJECTED') {
    setPendingId(id)
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id, status }),
      })
      if (!res.ok) throw new Error('override failed')
      setItems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      )
    } catch {
      // noop — user can retry
    } finally {
      setPendingId(null)
    }
  }

  function parseCase(raw: unknown): UseCase | null {
    if (!raw || typeof raw !== 'object') return null
    const c = raw as Record<string, unknown>
    if (typeof c.title !== 'string') return null
    return {
      title: c.title,
      description: typeof c.description === 'string' ? c.description : '',
      prompt: typeof c.prompt === 'string' ? c.prompt : '',
      result: typeof c.result === 'string' ? c.result : '',
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Abschluss-Reviews
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Menschliche Nachprüfung der LLM-bewerteten Use-Cases.
        </p>
      </div>

      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
            style={
              filter === f
                ? { background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }
                : { background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
            }
          >
            {f === 'ALL' ? 'Alle' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div
            className="rounded-2xl border py-10 text-sm text-center"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-muted)',
            }}
          >
            Keine Einreichungen in dieser Ansicht.
          </div>
        )}

        {filtered.map((s) => {
          const cases = [s.useCase1, s.useCase2, s.useCase3].map(parseCase)
          const style = STATUS_STYLE[s.status]
          return (
            <div
              key={s.id}
              className="rounded-2xl border p-5 space-y-4"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {s.user.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {s.user.email} · {new Date(s.submittedAt).toLocaleDateString('de-DE')}
                  </div>
                </div>
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: style.bg, color: style.color }}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>

              <div className="space-y-3">
                {cases.map((c, i) =>
                  c ? (
                    <div
                      key={i}
                      className="rounded-xl border p-3"
                      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div
                        className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Use Case {i + 1}
                      </div>
                      <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        {c.title}
                      </div>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {c.description}
                      </p>
                      <details className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <summary className="cursor-pointer select-none" style={{ color: 'var(--text-muted)' }}>
                          Prompt + Ergebnis anzeigen
                        </summary>
                        <div className="mt-2 space-y-2">
                          <div>
                            <div
                              className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                              style={{ color: 'var(--accent)' }}
                            >
                              Prompt
                            </div>
                            <pre
                              className="whitespace-pre-wrap text-[11px] leading-relaxed"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {c.prompt}
                            </pre>
                          </div>
                          <div>
                            <div
                              className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                              style={{ color: 'var(--accent)' }}
                            >
                              Ergebnis
                            </div>
                            <pre
                              className="whitespace-pre-wrap text-[11px] leading-relaxed"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {c.result}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </div>
                  ) : null
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => override(s.id, 'APPROVED')}
                  disabled={pendingId === s.id || s.status === 'APPROVED'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-opacity disabled:opacity-40"
                  style={{
                    background: 'var(--success-dim)',
                    borderColor: 'var(--success-border)',
                    color: 'var(--success)',
                  }}
                >
                  <CheckIcon size={12} />
                  Freigeben
                </button>
                <button
                  onClick={() => override(s.id, 'REJECTED')}
                  disabled={pendingId === s.id || s.status === 'REJECTED'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-opacity disabled:opacity-40"
                  style={{
                    background: 'var(--error-dim)',
                    borderColor: 'var(--error-border)',
                    color: 'var(--error)',
                  }}
                >
                  <CloseIcon size={12} />
                  Ablehnen
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
