'use client'

import { motion } from 'framer-motion'
import { BoltIcon } from '@/components/ui/icons'

export default function XPBar({ xp }: { xp: number }) {
  const level = Math.floor(xp / 500) + 1
  const progress = (xp % 500) / 500

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BoltIcon size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            Level {level}
          </span>
        </div>
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {xp} XP
        </span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </div>

      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {500 - (xp % 500)} XP bis Level {level + 1}
      </div>
    </div>
  )
}
