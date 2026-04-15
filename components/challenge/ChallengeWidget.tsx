'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🎯</span>
          <div>
            <div className="font-semibold text-white text-sm">{title}</div>
            <div className="text-xs text-zinc-500">{category} · {'★'.repeat(difficulty)}</div>
          </div>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-500"
        >
          <ChevronIcon />
        </motion.span>
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
            <div className="px-4 pb-4 space-y-4 border-t border-orange-500/10 pt-3">
              <div>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Aufgabe</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{description}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-2">Prompting-Tipps</div>
                <ul className="space-y-2">
                  {promptingTips
                    .split(/(?=\d+\.\s)/)
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map((tip, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-zinc-400 leading-relaxed">
                        <span className="text-orange-500 font-semibold shrink-0 mt-px">
                          {i + 1}.
                        </span>
                        <span>{tip.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
