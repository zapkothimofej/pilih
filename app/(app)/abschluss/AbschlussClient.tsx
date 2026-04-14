'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FinalSubmission } from '@/app/generated/prisma/client'

type UseCase = { title: string; description: string; prompt: string; result: string }

const EMPTY: UseCase = { title: '', description: '', prompt: '', result: '' }

export default function AbschlussClient({ existingSubmission }: { existingSubmission: FinalSubmission | null }) {
  const router = useRouter()
  const [cases, setCases] = useState<[UseCase, UseCase, UseCase]>([EMPTY, EMPTY, EMPTY])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(i: 0 | 1 | 2, field: keyof UseCase, value: string) {
    setCases(prev => {
      const next = [...prev] as [UseCase, UseCase, UseCase]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const canSubmit = cases.every(c => c.title && c.description.length >= 10 && c.prompt.length >= 10 && c.result.length >= 10)

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useCase1: cases[0], useCase2: cases[1], useCase3: cases[2] }),
      })
      if (!res.ok) throw new Error('Fehler')

      // Zertifikat generieren
      await fetch('/api/zertifikat/generieren', { method: 'POST' })
      router.push('/zertifikat')
    } catch {
      setError('Fehler beim Einreichen. Bitte versuche es erneut.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-3xl font-bold text-white">Abschluss-Test</h1>
        <p className="text-zinc-400 mt-2">
          Beschreibe 3 KI-Use-Cases, die du selbst in deinem Berufsalltag entdeckt hast
        </p>
      </div>

      {cases.map((c, i) => (
        <div key={i} className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold">
              {i + 1}
            </span>
            <span className="font-semibold text-white">Use Case {i + 1}</span>
          </div>

          {[
            { field: 'title' as const, label: 'Titel', placeholder: 'z.B. Produktbeschreibungen optimieren', rows: 1 },
            { field: 'description' as const, label: 'Beschreibung', placeholder: 'Was hast du mit KI gemacht?', rows: 2 },
            { field: 'prompt' as const, label: 'Dein Prompt', placeholder: 'Den Prompt den du verwendet hast...', rows: 3 },
            { field: 'result' as const, label: 'Ergebnis', placeholder: 'Was war das Ergebnis? Was hat dich überrascht?', rows: 2 },
          ].map(({ field, label, placeholder, rows }) => (
            <div key={field} className="space-y-1">
              <label className="text-xs text-zinc-500">{label}</label>
              <textarea
                value={c[field]}
                onChange={e => update(i as 0 | 1 | 2, field, e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full bg-[#0a0a0a] border border-[#333] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white placeholder-zinc-700 resize-none outline-none text-sm transition-colors"
              />
            </div>
          ))}
        </div>
      ))}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors"
      >
        {loading ? 'Wird eingereicht...' : 'Zertifikat beantragen 🚀'}
      </button>
    </div>
  )
}
