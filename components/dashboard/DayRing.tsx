'use client'

import { motion } from 'framer-motion'

export default function DayRing({ completed, total = 21 }: { completed: number; total?: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  const fill = (completed / total) * c

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#222" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={r} fill="none"
            stroke="#f97316" strokeWidth="8"
            strokeDasharray={`${fill} ${c}`}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${fill} ${c}` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{completed}</span>
          <span className="text-xs text-zinc-500">/{total}</span>
        </div>
      </div>
      <div className="text-xs text-zinc-500">Tage</div>
    </div>
  )
}
