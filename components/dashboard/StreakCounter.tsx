'use client'

import { motion } from 'framer-motion'
import { FlameIcon } from '@/components/ui/icons'

export default function StreakCounter({ streak }: { streak: number }) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center gap-1.5"
    >
      <motion.div
        animate={streak > 0 ? { scale: [1, 1.12, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1.5 }}
        style={{ color: streak > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        <FlameIcon size={28} />
      </motion.div>
      <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {streak}
      </div>
      <div className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
        Streak
      </div>
    </motion.div>
  )
}
