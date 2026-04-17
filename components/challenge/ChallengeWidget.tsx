'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TargetIcon, ChevronDownIcon, StarFilledIcon, StarEmptyIcon } from '@/components/ui/icons'

interface ChallengeWidgetProps {
  title: string
  description: string
  promptingTips: string
  category: string
  difficulty: number
}

export default function ChallengeWidget({
  title, description, promptingTips, category, difficulty,
}: ChallengeWidgetProps) {
  const [expanded, setExpanded] = useState(true)

  const tips = promptingTips
    .split(/(?=\d+\.\s)/)
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <TargetIcon size={15} />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{category}</span>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) =>
                  i < difficulty
                    ? <StarFilledIcon key={i} size={9} style={{ color: 'var(--accent)' }} />
                    : <StarEmptyIcon key={i} size={9} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronDownIcon size={14} />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5 space-y-4 border-t pt-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* Task */}
              <div>
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Aufgabe
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              </div>

              {/* Tips */}
              {tips.length > 0 && (
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
                    style={{ color: 'var(--accent)' }}
                  >
                    Prompting-Tipps
                  </div>
                  <ul className="space-y-2.5">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                        <span
                          className="font-bold text-xs shrink-0 mt-px w-4 text-right"
                          style={{ color: 'var(--accent)' }}
                        >
                          {i + 1}.
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {tip.replace(/^\d+\.\s*/, '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
