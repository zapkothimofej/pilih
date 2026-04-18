'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import AnimatedNumber from '@/components/ui/animations/AnimatedNumber'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

export default function DayRing({ completed, total = 21 }: { completed: number; total?: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  const fill = (completed / total) * c

  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const arc = scope.current?.querySelector<SVGCircleElement>('.day-ring-progress')
      if (!arc) return

      if (reduced) {
        arc.setAttribute('stroke-dasharray', `${fill} ${c}`)
        return
      }

      gsap.fromTo(
        arc,
        { strokeDasharray: `0 ${c}` },
        {
          strokeDasharray: `${fill} ${c}`,
          duration: 1.4,
          ease: 'power3.out',
        }
      )
      // Subtle breathing glow when the ring is nearly full.
      if (completed / total >= 0.75) {
        gsap.to(arc, {
          filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.55))',
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }
    },
    { scope, dependencies: [completed, total, reduced, fill, c] }
  )

  return (
    <div ref={scope} className="flex flex-col items-center gap-1.5">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border-default)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
            className="day-ring-progress"
            strokeDasharray={`0 ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={completed}
            duration={1.3}
            onScroll={false}
            className="text-2xl font-bold tabular-nums"
            style={{ color: 'var(--text-primary)' }}
          />
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            /{total}
          </span>
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-muted)' }}>
        Tage
      </div>
    </div>
  )
}
