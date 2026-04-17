'use client'

import { motion } from 'framer-motion'
import { StarFilledIcon, StarEmptyIcon, ArrowRightIcon } from '@/components/ui/icons'

type Challenge = {
  id: string
  title: string
  description: string
  category: string
  currentDifficulty: number
}

const DIFFICULTY_LABELS = ['', 'Sehr leicht', 'Leicht', 'Mittel', 'Schwer', 'Sehr schwer']

interface ChallengeCardProps {
  challenge: Challenge
  index: number
  onSelect: (id: string) => void
  loading: boolean
}

export default function ChallengeCard({ challenge, index, onSelect, loading }: ChallengeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
    >
      <button
        onClick={() => onSelect(challenge.id)}
        disabled={loading}
        className="w-full text-left group p-5 rounded-2xl border transition-all duration-200 disabled:opacity-40"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-border)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)'
        }}
        onFocus={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-border)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'
        }}
        onBlur={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)'
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2.5">
            {/* Meta row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
              >
                {challenge.category}
              </span>
              <DifficultyStars level={challenge.currentDifficulty} />
            </div>

            {/* Title */}
            <h3
              className="font-semibold text-sm leading-snug transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {challenge.title}
            </h3>

            {/* Description */}
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {challenge.description}
            </p>
          </div>

          <div
            className="mt-1 shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowRightIcon size={15} />
          </div>
        </div>
      </button>
    </motion.div>
  )
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) =>
        i < level
          ? <StarFilledIcon key={i} size={10} style={{ color: 'var(--accent)' }} />
          : <StarEmptyIcon key={i} size={10} style={{ color: 'var(--text-muted)' }} />
      )}
      <span className="text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>
        {DIFFICULTY_LABELS[level]}
      </span>
    </div>
  )
}
