'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

type Rating = 'TOO_EASY' | 'JUST_RIGHT' | 'TOO_HARD'

interface DifficultyRatingProps {
  onRate: (rating: Rating) => void
  loading: boolean
}

const OPTIONS: {
  value: Rating
  label: string
  icon: React.ReactNode
  activeStyle: { background: string; borderColor: string; color: string }
}[] = [
  {
    value: 'TOO_EASY',
    label: 'Zu leicht',
    icon: <EasyIcon />,
    activeStyle: {
      background: 'var(--info-dim)',
      borderColor: 'var(--info-border)',
      color: 'var(--info)',
    },
  },
  {
    value: 'JUST_RIGHT',
    label: 'Genau richtig',
    icon: <RightIcon />,
    activeStyle: {
      background: 'var(--success-dim)',
      borderColor: 'var(--success-border)',
      color: 'var(--success)',
    },
  },
  {
    value: 'TOO_HARD',
    label: 'Zu schwer',
    icon: <HardIcon />,
    activeStyle: {
      background: 'var(--error-dim)',
      borderColor: 'rgba(248,113,113,0.3)',
      color: 'var(--error)',
    },
  },
]

export default function DifficultyRating({ onRate, loading }: DifficultyRatingProps) {
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (reduced) return
      gsap.from(scope.current, {
        opacity: 0,
        y: 8,
        duration: 0.35,
        ease: 'power2.out',
      })
    },
    { dependencies: [reduced], scope }
  )

  // Arrow-key nav across the three radio-like buttons. Left/Right (and
  // Up/Down) move focus; the rating itself is committed on Enter/Space
  // which the native <button> already handles.
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
    const next = (index + delta + OPTIONS.length) % OPTIONS.length
    const target = scope.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]
    target?.focus()
  }

  return (
    <div ref={scope} className="space-y-2.5">
      <p
        id="difficulty-rating-label"
        className="text-xs text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        Wie schwierig war diese Challenge?
      </p>
      <div
        role="radiogroup"
        aria-labelledby="difficulty-rating-label"
        className="grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={false}
            onClick={() => onRate(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            disabled={loading}
            aria-label={`Schwierigkeit: ${opt.label}`}
            // Only the first option is in the tab sequence (tabIndex=0);
            // arrow keys move focus within the group, matching the
            // WAI-ARIA radiogroup pattern.
            tabIndex={i === 0 ? 0 : -1}
            className="rating-option flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-colors disabled:opacity-40 text-sm"
            data-value={opt.value}
            style={{
              ['--rating-active-bg' as string]: opt.activeStyle.background,
              ['--rating-active-border' as string]: opt.activeStyle.borderColor,
              ['--rating-active-color' as string]: opt.activeStyle.color,
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>{opt.icon}</span>
            <span className="text-[11px] font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EasyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9h6" />
      <circle cx="9" cy="9" r="7" />
    </svg>
  )
}

function RightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9l3.5 3.5L14 6" />
      <circle cx="9" cy="9" r="7" />
    </svg>
  )
}

function HardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6v4" />
      <circle cx="9" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="9" cy="9" r="7" />
    </svg>
  )
}
