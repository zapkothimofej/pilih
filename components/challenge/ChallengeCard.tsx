'use client'

import { motion } from 'framer-motion'

type Challenge = {
  id: string
  title: string
  description: string
  category: string
  currentDifficulty: number
}

const DIFFICULTY_LABELS = ['', 'Sehr leicht', 'Leicht', 'Mittel', 'Schwer', 'Sehr schwer']
const DIFFICULTY_COLORS = ['', 'text-green-400', 'text-green-300', 'text-yellow-400', 'text-orange-400', 'text-red-400']

interface ChallengeCardProps {
  challenge: Challenge
  index: number
  onSelect: (id: string) => void
  loading: boolean
}

export default function ChallengeCard({ challenge, index, onSelect, loading }: ChallengeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <button
        onClick={() => onSelect(challenge.id)}
        disabled={loading}
        className="w-full text-left group p-5 rounded-xl border border-[#222] bg-[#111] hover:border-orange-500/50 hover:bg-[#1a1a1a] transition-all duration-200 disabled:opacity-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#222] text-zinc-400">
                {challenge.category}
              </span>
              <span className={`text-xs font-medium ${DIFFICULTY_COLORS[challenge.currentDifficulty]}`}>
                {'★'.repeat(challenge.currentDifficulty)}{'☆'.repeat(5 - challenge.currentDifficulty)} {DIFFICULTY_LABELS[challenge.currentDifficulty]}
              </span>
            </div>
            <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
              {challenge.title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
              {challenge.description}
            </p>
          </div>
          <div className="text-zinc-600 group-hover:text-orange-500 transition-colors mt-1 shrink-0">
            <ArrowIcon />
          </div>
        </div>
      </button>
    </motion.div>
  )
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
