'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { BoltIcon } from '@/components/ui/icons'
import { xpLevel } from '@/lib/progress/xp'
import AnimatedNumber from '@/components/ui/animations/AnimatedNumber'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

export default function XPBar({ xp }: { xp: number }) {
  const { level, xpToNext, progress } = xpLevel(xp)
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const fill = scope.current?.querySelector<HTMLElement>('.xp-fill')
      const shimmer = scope.current?.querySelector<HTMLElement>('.xp-shimmer')
      if (!fill) return

      if (reduced) {
        fill.style.width = `${progress * 100}%`
        return
      }

      gsap.fromTo(
        fill,
        { width: '0%' },
        { width: `${progress * 100}%`, duration: 1.2, ease: 'power2.out' }
      )

      if (shimmer) {
        gsap.set(shimmer, { x: '-100%' })
        gsap.to(shimmer, {
          x: '300%',
          duration: 2.5,
          repeat: -1,
          repeatDelay: 2.5,
          ease: 'power2.inOut',
        })
      }
    },
    { scope, dependencies: [progress, reduced] }
  )

  return (
    <div ref={scope} className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BoltIcon size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            Level {level}
          </span>
        </div>
        <AnimatedNumber
          value={xp}
          suffix=" XP"
          duration={1.1}
          onScroll={false}
          className="text-xs tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>

      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--border-default)' }}
      >
        <div
          className="xp-fill h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--accent) 0%, #a5b4fc 100%)',
            width: '0%',
          }}
        />
        <div
          className="xp-shimmer pointer-events-none absolute top-0 h-full w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {xpToNext} XP bis Level {level + 1}
      </div>
    </div>
  )
}
