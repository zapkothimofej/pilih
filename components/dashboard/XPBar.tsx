'use client'

import { motion } from 'framer-motion'

export default function XPBar({ xp }: { xp: number }) {
  const level = Math.floor(xp / 500) + 1
  const progress = (xp % 500) / 500

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-purple-400 font-medium">Level {level}</span>
        <span className="text-zinc-500">{xp} XP</span>
      </div>
      <div className="h-2 bg-[#222] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <div className="text-xs text-zinc-600">{500 - (xp % 500)} XP bis Level {level + 1}</div>
    </div>
  )
}
