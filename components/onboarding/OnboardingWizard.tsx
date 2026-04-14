'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SpeechInput from './SpeechInput'

type Step = 1 | 2 | 3

type FormData = {
  companyName: string
  department: string
  jobTitle: string
  dailyDescription: string
  aiSkillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  aiToolsUsed: string[]
  aiFrequency: string
}

const AI_TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Perplexity', 'Midjourney', 'Sonstiges']
const FREQUENCIES = ['Täglich', 'Mehrmals pro Woche', 'Einmal pro Woche', 'Selten', 'Noch nie']

const SKILL_LABELS = {
  BEGINNER: { label: 'Einsteiger', desc: 'Ich habe KI kaum oder gar nicht genutzt' },
  INTERMEDIATE: { label: 'Fortgeschritten', desc: 'Ich nutze KI regelmäßig für einfache Aufgaben' },
  ADVANCED: { label: 'Erfahren', desc: 'Ich nutze KI täglich und kenne mich gut aus' },
}

export default function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormData>({
    companyName: '',
    department: '',
    jobTitle: '',
    dailyDescription: '',
    aiSkillLevel: 'BEGINNER',
    aiToolsUsed: [],
    aiFrequency: '',
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleTool(tool: string) {
    set(
      'aiToolsUsed',
      form.aiToolsUsed.includes(tool)
        ? form.aiToolsUsed.filter((t) => t !== tool)
        : [...form.aiToolsUsed, tool]
    )
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      router.push('/onboarding/generating')
    } catch {
      setError('Etwas ist schiefgelaufen. Bitte versuche es erneut.')
      setLoading(false)
    }
  }

  const canNext1 = form.companyName && form.department && form.jobTitle
  const canNext2 = form.aiSkillLevel && form.aiFrequency
  const canSubmit = form.dailyDescription.length >= 10

  return (
    <div className="max-w-xl mx-auto">
      {/* Fortschrittsbalken */}
      <div className="flex items-center gap-2 mb-10">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s < step
                  ? 'bg-orange-500 text-white'
                  : s === step
                  ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                  : 'bg-[#222] text-zinc-600'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-orange-500' : 'bg-[#222]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Schritt 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Wer bist du?</h2>
            <p className="text-zinc-400 text-sm mt-1">Erzähl uns von dir und deiner Arbeit</p>
          </div>

          <Input
            label="Firma"
            placeholder="z.B. ADN Distribution"
            value={form.companyName}
            onChange={(v) => set('companyName', v)}
          />
          <Input
            label="Abteilung"
            placeholder="z.B. Marketing, Vertrieb, IT..."
            value={form.department}
            onChange={(v) => set('department', v)}
          />
          <Input
            label="Berufsbezeichnung"
            placeholder="z.B. Marketing Manager"
            value={form.jobTitle}
            onChange={(v) => set('jobTitle', v)}
          />

          <button
            onClick={() => setStep(2)}
            disabled={!canNext1}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            Weiter →
          </button>
        </div>
      )}

      {/* Schritt 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Dein KI-Kenntnisstand</h2>
            <p className="text-zinc-400 text-sm mt-1">Ehrlich — kein Level ist falsch!</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Wie gut kennst du dich mit KI aus?</label>
            {(Object.entries(SKILL_LABELS) as [FormData['aiSkillLevel'], { label: string; desc: string }][]).map(
              ([key, { label, desc }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('aiSkillLevel', key)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    form.aiSkillLevel === key
                      ? 'border-orange-500 bg-orange-500/10 text-white'
                      : 'border-[#333] bg-[#111] text-zinc-400 hover:border-[#444] hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                </button>
              )
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Welche KI-Tools nutzt du?</label>
            <div className="flex flex-wrap gap-2">
              {AI_TOOLS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.aiToolsUsed.includes(tool)
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-[#333] bg-[#111] text-zinc-400 hover:border-[#444]'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Wie oft nutzt du KI?</label>
            <div className="grid grid-cols-1 gap-2">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => set('aiFrequency', freq)}
                  className={`py-2.5 px-4 rounded-lg border text-sm text-left transition-all ${
                    form.aiFrequency === freq
                      ? 'border-orange-500 bg-orange-500/10 text-white'
                      : 'border-[#333] bg-[#111] text-zinc-400 hover:border-[#444]'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-3 border border-[#333] hover:border-[#444] text-zinc-400 hover:text-white rounded-lg transition-colors text-sm"
            >
              ← Zurück
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canNext2}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Weiter →
            </button>
          </div>
        </div>
      )}

      {/* Schritt 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Dein Arbeitsalltag</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Beschreibe typische Aufgaben — je konkreter, desto besser werden deine Challenges!
            </p>
          </div>

          <SpeechInput
            label="Was machst du typischerweise an einem Arbeitstag?"
            placeholder="z.B. Ich erstelle wöchentlich Produktbeschreibungen für unseren Online-Shop, werte Verkaufszahlen aus und schreibe Angebote für Kunden..."
            value={form.dailyDescription}
            onChange={(v) => set('dailyDescription', v)}
            rows={5}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-3 border border-[#333] hover:border-[#444] text-zinc-400 hover:text-white rounded-lg transition-colors text-sm"
            >
              ← Zurück
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
            >
              {loading ? 'Wird gespeichert...' : 'KI-Challenges generieren 🚀'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-zinc-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#111] border border-[#333] hover:border-[#444] focus:border-orange-500 rounded-lg px-4 py-3 text-white placeholder-zinc-600 transition-colors outline-none text-sm"
      />
    </div>
  )
}
