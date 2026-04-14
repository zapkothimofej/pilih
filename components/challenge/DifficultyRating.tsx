'use client'

import { motion } from 'framer-motion'

type Rating = 'TOO_EASY' | 'JUST_RIGHT' | 'TOO_HARD'

interface DifficultyRatingProps {
  onRate: (rating: Rating) => void
  loading: boolean
}

const OPTIONS: { value: Rating; label: string; emoji: string; color: string }[] = [
  { value: 'TOO_EASY', label: 'Zu leicht', emoji: '😴', color: 'hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-400' },
  { value: 'JUST_RIGHT', label: 'Genau richtig', emoji: '🎯', color: 'hover:border-green-500 hover:bg-green-500/10 hover:text-green-400' },
  { value: 'TOO_HARD', label: 'Zu schwer', emoji: '🔥', color: 'hover:border-red-500 hover:bg-red-500/10 hover:text-red-400' },
]

export default function DifficultyRating({ onRate, loading }: DifficultyRatingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <p className="text-sm text-zinc-400 text-center">Wie schwierig war diese Challenge?</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRate(opt.value)}
            disabled={loading}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border border-[#333] bg-[#111] text-zinc-400 transition-all disabled:opacity-50 ${opt.color}`}
          >
            <span className="text-xl">{opt.emoji}</span>
            <span className="text-xs font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
