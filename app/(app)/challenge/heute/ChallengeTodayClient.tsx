'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ChallengeCard from '@/components/challenge/ChallengeCard'
import type { Challenge } from '@/app/generated/prisma/client'
import { BoltIcon, ArrowRightIcon } from '@/components/ui/icons'

interface Props {
  day: number
  challenges: Challenge[]
  existingSessionId: string | null
  poolEmpty?: boolean
  poolSize?: number
}

export default function ChallengeTodayClient({
  day,
  challenges,
  existingSessionId,
  poolEmpty = false,
  poolSize,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [startError, setStartError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')

  async function handleSelect(challengeId: string) {
    setSelectedId(challengeId)
    setLoading(true)
    setStartError('')
    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, day, existingSessionId }),
      })
      if (!res.ok) throw new Error('Start fehlgeschlagen')
      const data = await res.json() as { sessionId: string }
      router.push(`/challenge/${challengeId}?session=${data.sessionId}`)
    } catch {
      setLoading(false)
      setSelectedId(null)
      setStartError('Session konnte nicht gestartet werden. Bitte erneut versuchen.')
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch('/api/challenges/generate', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || 'Generierung fehlgeschlagen')
      }
      router.refresh()
    } catch (err) {
      setGenerating(false)
      setGenerateError(err instanceof Error ? err.message : 'Generierung fehlgeschlagen')
    }
  }

  const showEmptyState = poolEmpty || challenges.length === 0
  const showLowPoolNotice = !showEmptyState && challenges.length < 3

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div
          className="inline-block text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 border"
          style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
        >
          Tag {day} von 21
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Wähle deine heutige Challenge
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Drei Optionen, personalisiert auf dein Level — wähle eine aus.
        </p>
      </div>

      {showEmptyState ? (
        <div
          className="rounded-2xl border p-6 text-center space-y-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <BoltIcon size={20} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Noch keine Challenges generiert
            </h2>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Dein persönlicher Challenge-Pool ist leer. Lass dir jetzt neue, passende Challenges erstellen.
            </p>
          </div>
          {generateError && (
            <p className="text-sm" style={{ color: 'var(--error)' }}>{generateError}</p>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {generating ? 'Generiere…' : 'Challenges jetzt generieren'}
            {!generating && <ArrowRightIcon size={14} />}
          </button>
        </div>
      ) : (
        <>
          {showLowPoolNotice && (
            <div
              className="text-[12px] px-4 py-2.5 rounded-xl border"
              style={{
                background: 'color-mix(in srgb, var(--warning) 12%, var(--bg-surface))',
                borderColor: 'color-mix(in srgb, var(--warning) 35%, var(--border-default))',
                color: 'var(--text-secondary)',
              }}
            >
              Dein Pool ist fast leer — wähle aus den verbleibenden {challenges.length === 1 ? 'Option' : `${challenges.length} Optionen`}
              {typeof poolSize === 'number' ? ` (${poolSize} übrig im Pool)` : ''}.
            </div>
          )}

          {/* Challenge cards */}
          <div className="space-y-3">
            {challenges.map((c, i) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                index={i}
                onSelect={handleSelect}
                loading={loading && selectedId === c.id}
              />
            ))}
          </div>

          {startError && (
            <p className="text-sm text-center" style={{ color: 'var(--error)' }}>
              {startError}
            </p>
          )}
        </>
      )}
    </div>
  )
}
