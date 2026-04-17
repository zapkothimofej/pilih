'use client'

import { motion } from 'framer-motion'

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
      background: 'rgba(99,179,237,0.08)',
      borderColor: 'rgba(99,179,237,0.35)',
      color: '#63b3ed',
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2.5"
    >
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Wie schwierig war diese Challenge?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRate(opt.value)}
            disabled={loading}
            className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-all disabled:opacity-40 text-sm"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => {
              Object.assign((e.currentTarget as HTMLButtonElement).style, opt.activeStyle)
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--bg-elevated)'
              el.style.borderColor = 'var(--border-default)'
              el.style.color = 'var(--text-secondary)'
            }}
            onFocus={e => {
              Object.assign((e.currentTarget as HTMLButtonElement).style, opt.activeStyle)
            }}
            onBlur={e => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--bg-elevated)'
              el.style.borderColor = 'var(--border-default)'
              el.style.color = 'var(--text-secondary)'
            }}
          >
            <span>{opt.icon}</span>
            <span className="text-[11px] font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
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
