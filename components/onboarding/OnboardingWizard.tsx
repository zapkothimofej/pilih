'use client'

import { useEffect, useId, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import SpeechInput from './SpeechInput'
import { CheckIcon, ArrowRightIcon, ArrowLeftIcon } from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

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

const SKILL_LABELS: Record<FormData['aiSkillLevel'], { label: string; desc: string }> = {
  BEGINNER: { label: 'Einsteiger', desc: 'Ich habe KI kaum oder gar nicht genutzt' },
  INTERMEDIATE: { label: 'Fortgeschritten', desc: 'Ich nutze KI regelmäßig für einfache Aufgaben' },
  ADVANCED: { label: 'Erfahren', desc: 'Ich nutze KI täglich und kenne mich gut aus' },
}

const STEP_LABELS = ['Über dich', 'KI-Kenntnisstand', 'Arbeitsalltag']

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
  const stepScope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  // Slide step content in when the user moves forward/back. Scoped
  // selector targets only the active step's direct children so the
  // step indicator stays put.
  useGSAP(
    () => {
      if (!stepScope.current || reduced) return
      gsap.from('.onb-step > *', {
        y: 14,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
        stagger: 0.06,
      })
    },
    { scope: stepScope, dependencies: [step, reduced] }
  )

  // When step changes, move focus to the new step's heading so screen
  // reader users are announced into the new content instead of being
  // stranded on the "Weiter" button that just vanished.
  useEffect(() => {
    const heading = stepScope.current?.querySelector<HTMLElement>('.onb-step h2')
    heading?.focus()
  }, [step])

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
    <div ref={stepScope} className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={s < step
                  ? { background: 'var(--accent)', color: '#fff' }
                  : s === step
                  ? { background: 'var(--accent-dim)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }
                  : { background: 'var(--bg-elevated)', border: '1.5px solid var(--border-default)', color: 'var(--text-muted)' }
                }
              >
                {s < step ? <CheckIcon size={12} /> : s}
              </div>
              <span
                className="text-xs hidden sm:block"
                style={{ color: s === step ? 'var(--text-secondary)' : 'var(--text-muted)' }}
              >
                {STEP_LABELS[s - 1]}
              </span>
            </div>
            {s < 3 && (
              <div
                className="flex-1 h-px mx-3"
                style={{ background: s < step ? 'var(--accent)' : 'var(--border-default)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div key="s1" className="onb-step space-y-5">
          <div>
            <h2 tabIndex={-1} className="text-xl font-bold focus:outline-none" style={{ color: 'var(--text-primary)' }}>Wer bist du?</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Erzähl uns von dir und deiner Arbeit.
            </p>
          </div>

          <FormInput label="Firma" placeholder="z.B. ADN Distribution" value={form.companyName} onChange={(v) => set('companyName', v)} />
          <FormInput label="Abteilung" placeholder="z.B. Marketing, Vertrieb, IT…" value={form.department} onChange={(v) => set('department', v)} />
          <FormInput label="Berufsbezeichnung" placeholder="z.B. Marketing Manager" value={form.jobTitle} onChange={(v) => set('jobTitle', v)} />

          <PrimaryButton onClick={() => setStep(2)} disabled={!canNext1}>
            Weiter <ArrowRightIcon size={14} />
          </PrimaryButton>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div key="s2" className="onb-step space-y-6">
          <div>
            <h2 tabIndex={-1} className="text-xl font-bold focus:outline-none" style={{ color: 'var(--text-primary)' }}>Dein KI-Kenntnisstand</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Ehrlich — kein Level ist falsch.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Wie gut kennst du dich mit KI aus?
            </label>
            {(Object.entries(SKILL_LABELS) as [FormData['aiSkillLevel'], { label: string; desc: string }][]).map(
              ([key, { label, desc }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('aiSkillLevel', key)}
                  className="w-full text-left px-4 py-3.5 rounded-xl border transition-all"
                  style={form.aiSkillLevel === key
                    ? { background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--text-primary)' }
                    : { background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
                  }
                >
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs mt-0.5 opacity-75">{desc}</div>
                </button>
              )
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Welche KI-Tools nutzt du?
            </label>
            <div className="flex flex-wrap gap-2">
              {AI_TOOLS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={form.aiToolsUsed.includes(tool)
                    ? { background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }
                    : { background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
                  }
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Wie oft nutzt du KI?
            </label>
            <div className="space-y-2">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => set('aiFrequency', freq)}
                  className="w-full py-2.5 px-4 rounded-xl border text-sm text-left transition-all"
                  style={form.aiFrequency === freq
                    ? { background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--text-primary)' }
                    : { background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
                  }
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <SecondaryButton onClick={() => setStep(1)}>
              <ArrowLeftIcon size={14} /> Zurück
            </SecondaryButton>
            <PrimaryButton onClick={() => setStep(3)} disabled={!canNext2}>
              Weiter <ArrowRightIcon size={14} />
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div key="s3" className="onb-step space-y-5">
          <div>
            <h2 tabIndex={-1} className="text-xl font-bold focus:outline-none" style={{ color: 'var(--text-primary)' }}>Dein Arbeitsalltag</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Je konkreter, desto besser werden deine Challenges.
            </p>
          </div>

          <SpeechInput
            label="Was machst du typischerweise an einem Arbeitstag?"
            placeholder="z.B. Ich erstelle wöchentlich Produktbeschreibungen für unseren Online-Shop, werte Verkaufszahlen aus und schreibe Angebote für Kunden…"
            value={form.dailyDescription}
            onChange={(v) => set('dailyDescription', v)}
            rows={5}
          />

          {error && <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

          <div className="flex gap-3">
            <SecondaryButton onClick={() => setStep(2)}>
              <ArrowLeftIcon size={14} /> Zurück
            </SecondaryButton>
            <PrimaryButton onClick={handleSubmit} disabled={!canSubmit || loading}>
              {loading ? 'Wird gespeichert…' : 'Challenges generieren'}
              {!loading && <ArrowRightIcon size={14} />}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}

function FormInput({ label, placeholder, value, onChange, required = true }: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  // The button-disabled gate didn't tell screen-reader users WHICH
  // field was empty — aria-invalid + aria-required close that loop.
  // htmlFor/id binds the label so SRs read the label when the input
  // takes focus (proximity was not enough — WCAG 3.3.2).
  const id = useId()
  const isInvalid = required && value.trim().length === 0
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
        {required && <span aria-hidden="true" style={{ color: 'var(--error)' }}> *</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={isInvalid ? true : undefined}
        className="input-accent w-full rounded-xl px-4 py-3 text-sm"
      />
    </div>
  )
}

function PrimaryButton({ onClick, disabled, children }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
      style={{ background: 'var(--accent)', color: '#fff' }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ onClick, children }: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm border transition-colors"
      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  )
}
