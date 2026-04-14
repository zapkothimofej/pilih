'use client'

import { motion } from 'framer-motion'

export default function StreakCounter({ streak }: { streak: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-1"
    >
      <motion.div
        animate={streak > 0 ? { scale: [1, 1.15, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
        className="text-4xl"
      >
        🔥
      </motion.div>
      <div className="text-3xl font-bold text-orange-500">{streak}</div>
      <div className="text-xs text-zinc-500">Streak</div>
    </motion.div>
  )
}
