'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrophyIcon, ArrowRightIcon, CheckIcon } from '@/components/ui/icons'

type UseCase = { title: string; description: string; prompt: string; result: string }

type CaseResult = {
  score: number
  verdict: 'PASS' | 'FAIL'
  strengths: string[]
  improvements: string[]
}

type FeedbackState = {
  status: 'APPROVED' | 'REJECTED'
  totalScore: number
  passCount: number
  cases: CaseResult[]
  overallFeedback: string
}

const EMPTY: UseCase = { title: '', description: '', prompt: '', result: '' }

const FIELD_MIN: Record<keyof UseCase, number> = {
  title: 3,
  description: 20,
  prompt: 30,
  result: 20,
}

const FIELD_HINT: Record<keyof UseCase, string> = {
  title: 'Mindestens 3 Zeichen',
  description: 'Mindestens 20 Zeichen',
  prompt: 'Mindestens 30 Zeichen',
  result: 'Mindestens 20 Zeichen',
}

export default function AbschlussClient() {
  const router = useRouter()
  const [cases, setCases] = useState<[UseCase, UseCase, UseCase]>([EMPTY, EMPTY, EMPTY])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [view, setView] = useState<'form' | 'feedback'>('form')

  function update(i: 0 | 1 | 2, field: keyof UseCase, value: string) {
    setCases(prev => {
      const next = [...prev] as [UseCase, UseCase, UseCase]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const canSubmit = cases.every(c =>
    c.title.length >= FIELD_MIN.title &&
    c.description.length >= FIELD_MIN.description &&
    c.prompt.length >= FIELD_MIN.prompt &&
    c.result.length >= FIELD_MIN.result
  )

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase1: cases[0], useCase2: cases[1], useCase3: cases[2] }),
      })

      const data = await res.json().catch(() => null) as
        | {
            success?: boolean
            status?: 'APPROVED' | 'REJECTED'
            totalScore?: number
            passCount?: number
            cases?: CaseResult[]
            overallFeedback?: string
            error?: string
            details?: {
              fieldErrors?: Record<string, string[] | undefined>
              formErrors?: string[]
            }
          }
        | null

      if (!res.ok) {
        const fallback =
          res.status === 429
            ? 'Zu viele Einreichungen. Bitte warte eine Stunde.'
            : res.status === 400
              ? 'Ungültige Einreichung. Bitte prüfe deine Eingaben.'
              : res.status === 502
                ? 'Die Bewertung konnte nicht erzeugt werden. Bitte später erneut versuchen.'
                : 'Fehler beim Einreichen. Bitte versuche es erneut.'

        if (res.status === 400 && data?.details?.fieldErrors) {
          const fe = data.details.fieldErrors
          // Zod flatten() on nested objects surfaces keys like 'useCase1' — pull the first messy one.
          const firstKey = Object.keys(fe).find(k => (fe[k]?.length ?? 0) > 0)
          const firstMsg = firstKey ? fe[firstKey]?.[0] : undefined
          if (firstKey && firstMsg) {
            const caseMatch = /^useCase([123])$/.exec(firstKey)
            const prefix = caseMatch ? `Use Case ${caseMatch[1]}: ` : ''
            setError(`${prefix}${firstMsg}`)
          } else {
            setError(data?.error || fallback)
          }
        } else {
          setError(data?.error || fallback)
        }
        setLoading(false)
        return
      }

      if (!data || !data.status || !data.cases || data.overallFeedback == null) {
        setError('Unerwartete Antwort vom Server. Bitte später erneut versuchen.')
        setLoading(false)
        return
      }

      if (data.status === 'APPROVED') {
        await fetch('/api/zertifikat/generieren', { method: 'POST' })
        router.push('/zertifikat')
        return
      }

      // REJECTED — show feedback view, preserve form state
      setFeedback({
        status: data.status,
        totalScore: data.totalScore ?? 0,
        passCount: data.passCount ?? 0,
        cases: data.cases,
        overallFeedback: data.overallFeedback,
      })
      setView('feedback')
      setLoading(false)
    } catch {
      setError('Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.')
      setLoading(false)
    }
  }

  if (view === 'feedback' && feedback) {
    return (
      <FeedbackView
        feedback={feedback}
        onEdit={() => {
          setView('form')
          setError('')
        }}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          <TrophyIcon size={24} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Abschluss-Test
        </h1>
        <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Beschreibe 3 KI-Use-Cases, die du selbst in deinem Berufsalltag entdeckt und erprobt hast.
        </p>
      </div>

      {/* Use cases */}
      {cases.map((c, i) => (
        <div
          key={i}
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              {i + 1}
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Use Case {i + 1}
            </span>
          </div>

          {[
            { field: 'title' as const, label: 'Titel', placeholder: 'z.B. Produktbeschreibungen optimieren', rows: 1 },
            { field: 'description' as const, label: 'Beschreibung', placeholder: 'Was hast du mit KI gemacht?', rows: 2 },
            { field: 'prompt' as const, label: 'Dein Prompt', placeholder: 'Den Prompt, den du verwendet hast…', rows: 3 },
            { field: 'result' as const, label: 'Ergebnis', placeholder: 'Was war das Ergebnis? Was hat dich überrascht?', rows: 2 },
          ].map(({ field, label, placeholder, rows }) => {
            const len = c[field].length
            const min = FIELD_MIN[field]
            const reached = len >= min
            return (
              <div key={field} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </label>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {FIELD_HINT[field]}
                  </span>
                </div>
                <textarea
                  value={c[field]}
                  onChange={e => update(i as 0 | 1 | 2, field, e.target.value)}
                  placeholder={placeholder}
                  rows={rows}
                  className="textarea-accent w-full rounded-xl px-4 py-3 text-sm resize-none"
                />
                <div
                  className="text-[10px] tabular-nums text-right"
                  style={{ color: reached ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {len} / {min}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {error && (
        <p className="text-sm text-center" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {loading ? 'Wird eingereicht…' : 'Zertifikat beantragen'}
        {!loading && <ArrowRightIcon size={14} />}
      </button>
    </div>
  )
}

function FeedbackView({ feedback, onEdit }: { feedback: FeedbackState; onEdit: () => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Rejection banner */}
      <div
        className="rounded-2xl border p-5 space-y-3"
        style={{
          background: 'var(--error-dim)',
          borderColor: 'var(--error-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'var(--error-dim)',
              color: 'var(--error)',
            }}
          >
            <TrophyIcon size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Noch nicht bestanden
            </h1>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Deine Einreichung hat die Hürde noch nicht erreicht.
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {feedback.overallFeedback}
        </p>
        <div
          className="text-[12px] font-medium tabular-nums pt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Gesamt-Score: {feedback.totalScore}/30 · {feedback.passCount}/3 bestanden
        </div>
      </div>

      {/* Per-case results */}
      {feedback.cases.map((c, i) => (
        <div
          key={i}
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                {i + 1}
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Use Case {i + 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: scoreColor(c.score) }}
              >
                {c.score}<span style={{ color: 'var(--text-muted)' }}>/10</span>
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border"
                style={
                  c.verdict === 'PASS'
                    ? {
                        background: 'var(--success-dim)',
                        borderColor: 'var(--success-border)',
                        color: 'var(--success)',
                      }
                    : {
                        background: 'var(--error-dim)',
                        borderColor: 'var(--error-border)',
                        color: 'var(--error)',
                      }
                }
              >
                {c.verdict}
              </span>
            </div>
          </div>

          {c.strengths?.length > 0 && (
            <div className="space-y-1.5">
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--success)' }}
              >
                Stärken
              </div>
              {c.strengths.map((s, si) => (
                <div key={si} className="flex gap-2 text-sm">
                  <span className="shrink-0 mt-0.5" style={{ color: 'var(--success)' }}>
                    <CheckIcon size={13} />
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {c.improvements?.length > 0 && (
            <div className="space-y-1.5">
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                Verbesserungen
              </div>
              {c.improvements.map((imp, ii) => (
                <div key={ii} className="flex gap-2 text-sm">
                  <span className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>
                    <ArrowRightIcon size={13} />
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{imp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={onEdit}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-opacity"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Use-Cases überarbeiten
        <ArrowRightIcon size={14} />
      </button>
    </div>
  )
}

function scoreColor(score: number) {
  if (score >= 7) return 'var(--accent)'
  if (score >= 5) return 'var(--warning)'
  return 'var(--error)'
}
