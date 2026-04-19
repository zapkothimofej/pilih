'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { BoltIcon } from '@/components/ui/icons'
import { xpLevel } from '@/lib/progress/xp'
import AnimatedNumber from '@/components/ui/animations/AnimatedNumber'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'
import { formatInt } from '@/lib/utils/format'

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
        // Direct scaleX — fill width is 100% in CSS, we scale it down.
        fill.style.transformOrigin = 'left'
        fill.style.transform = `scaleX(${progress})`
        return
      }

      // scaleX tweens the transform matrix, which the compositor
      // handles without triggering layout on each frame. Previously
      // `width` animated via layout recalc 60×/sec.
      fill.style.transformOrigin = 'left'
      gsap.fromTo(
        fill,
        { scaleX: 0 },
        { scaleX: progress, duration: 1.2, ease: 'power2.out' }
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
          className="xp-fill h-full w-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--accent) 0%, #a5b4fc 100%)',
            transform: 'scaleX(0)',
            transformOrigin: 'left',
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
        {formatInt(xpToNext)} XP bis Level {level + 1}
      </div>
    </div>
  )
}
