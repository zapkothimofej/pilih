'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { CheckIcon } from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface Day {
  day: number
  completed: boolean
  title?: string
}

interface Props {
  days: Day[]
  completedCount: number
}

/**
 * 21-day progress grid. Each cell pops in with a back-ease stagger
 * on scroll-enter. Completed cells subsequently flip to their filled
 * state with a gentle scale bounce. Reduced-motion skips all of it.
 */
export default function FortschrittCalendar({ days, completedCount }: Props) {
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (!scope.current || reduced) return

      gsap.from('.day-cell', {
        opacity: 0,
        scale: 0.6,
        y: 10,
        duration: 0.45,
        ease: 'back.out(1.6)',
        stagger: { amount: 0.8, from: 'start' },
        scrollTrigger: {
          trigger: scope.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })
    },
    { scope, dependencies: [reduced, days.length] }
  )

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
    >
      <h2
        className="text-[11px] font-bold uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-muted)' }}
      >
        21-Tage-Kalender
      </h2>
      <div ref={scope} className="grid grid-cols-7 gap-2">
        {days.map(({ day, completed, title }) => (
          <div
            key={day}
            title={title ?? `Tag ${day}`}
            className="day-cell aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition-colors"
            style={
              completed
                ? { background: 'var(--accent)', color: '#fff' }
                : day === completedCount + 1
                ? {
                    background: 'var(--accent-dim)',
                    border: '1.5px solid var(--accent-border)',
                    color: 'var(--accent)',
                  }
                : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
            }
          >
            {completed ? <CheckIcon size={11} /> : <span className="tabular-nums">{day}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
