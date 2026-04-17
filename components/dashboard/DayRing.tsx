'use client'

import { motion } from 'framer-motion'

export default function DayRing({ completed, total = 21 }: { completed: number; total?: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  const fill = (completed / total) * c

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-default)" strokeWidth="7" />
          {/* Progress */}
          <motion.circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeDasharray={`${fill} ${c}`}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${fill} ${c}` }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {completed}
          </span>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            /{total}
          </span>
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
        Tage
      </div>
    </div>
  )
}
