'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { FlameIcon } from '@/components/ui/icons'
import AnimatedNumber from '@/components/ui/animations/AnimatedNumber'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

export default function StreakCounter({ streak }: { streak: number }) {
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const flame = scope.current?.querySelector<HTMLElement>('.streak-flame')
      if (!flame) return

      if (reduced) return

      // Entrance pop.
      gsap.from(scope.current, {
        scale: 0.85,
        opacity: 0,
        duration: 0.5,
        ease: 'back.out(1.8)',
      })

      if (streak > 0) {
        // Heartbeat — two-stage so it doesn't feel mechanical.
        gsap.to(flame, {
          scale: 1.12,
          duration: 0.35,
          repeat: -1,
          yoyo: true,
          repeatDelay: 2.5,
          ease: 'power1.inOut',
        })
      }
    },
    { scope, dependencies: [streak, reduced] }
  )

  return (
    <div ref={scope} className="flex flex-col items-center gap-1.5">
      <div className="streak-flame" style={{ color: streak > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
        <FlameIcon size={28} />
      </div>
      <AnimatedNumber
        value={streak}
        duration={0.9}
        onScroll={false}
        className="text-3xl font-bold tabular-nums"
        style={{ color: 'var(--text-primary)' }}
      />
      <div className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
        Streak
      </div>
    </div>
  )
}
