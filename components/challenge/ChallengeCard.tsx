'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { StarFilledIcon, StarEmptyIcon, ArrowRightIcon } from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

type Challenge = {
  id: string
  title: string
  description: string
  category: string
  currentDifficulty: number
}

const DIFFICULTY_LABELS = ['', 'Sehr leicht', 'Leicht', 'Mittel', 'Schwer', 'Sehr schwer']

interface ChallengeCardProps {
  challenge: Challenge
  index: number
  onSelect: (id: string) => void
  loading: boolean
}

/**
 * Challenge card with a gentle parallax tilt that tracks the pointer,
 * plus a sweep of shine on the arrow indicator. The tilt is disabled
 * under prefers-reduced-motion. Entry is staggered by index via a
 * small fade-up; that runs once per mount.
 */
export default function ChallengeCard({ challenge, index, onSelect, loading }: ChallengeCardProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      if (reduced) {
        gsap.set(el, { opacity: 1, y: 0 })
        return
      }

      gsap.from(el, {
        opacity: 0,
        y: 18,
        duration: 0.5,
        ease: 'power3.out',
        delay: index * 0.08,
      })
      gsap.set(el, { transformPerspective: 900 })

      // gsap.quickTo creates a preconfigured setter that avoids building
      // a fresh tween on every mousemove event — the original handler
      // allocated a tween object at 60fps which GC'd constantly.
      const rx = gsap.quickTo(el, 'rotateX', { duration: 0.35, ease: 'power2.out' })
      const ry = gsap.quickTo(el, 'rotateY', { duration: 0.35, ease: 'power2.out' })

      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect()
        const x = (e.clientX - r.left - r.width / 2) / r.width
        const y = (e.clientY - r.top - r.height / 2) / r.height
        ry(x * 4)
        rx(-y * 4)
      }
      const onLeave = () => {
        rx(0)
        ry(0)
      }
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
      return () => {
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseleave', onLeave)
      }
    },
    { dependencies: [index, reduced] }
  )

  return (
    <button
      ref={ref}
      onClick={() => onSelect(challenge.id)}
      disabled={loading}
      className="card-hover card-lift w-full text-left group p-5 rounded-2xl disabled:opacity-40"
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className="text-[11px] px-2 py-0.5 rounded-md font-medium"
              style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
            >
              {challenge.category}
            </span>
            <DifficultyStars level={challenge.currentDifficulty} />
          </div>

          <h3
            className="font-semibold text-sm leading-snug transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {challenge.title}
          </h3>

          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {challenge.description}
          </p>
        </div>

        <div
          className="mt-1 shrink-0 transition-transform group-hover:translate-x-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowRightIcon size={15} />
        </div>
      </div>
    </button>
  )
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) =>
        i < level
          ? <StarFilledIcon key={i} size={10} style={{ color: 'var(--accent)' }} />
          : <StarEmptyIcon key={i} size={10} style={{ color: 'var(--text-muted)' }} />
      )}
      <span className="text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>
        {DIFFICULTY_LABELS[level]}
      </span>
    </div>
  )
}
