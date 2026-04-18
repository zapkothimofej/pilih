'use client'

import { useState, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { TargetIcon, ChevronDownIcon, StarFilledIcon, StarEmptyIcon } from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

interface ChallengeWidgetProps {
  title: string
  description: string
  promptingTips: string
  category: string
  difficulty: number
}

export default function ChallengeWidget({
  title, description, promptingTips, category, difficulty,
}: ChallengeWidgetProps) {
  const [expanded, setExpanded] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const chevronRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const tips = promptingTips
    .split(/(?=\d+\.\s)/)
    .map(s => s.trim())
    .filter(Boolean)

  // GSAP-driven collapse/expand. Measure target height by letting the
  // element render, tween to/from that height, and clear the inline
  // height when open so user can still copy text comfortably.
  useGSAP(
    () => {
      const panel = panelRef.current
      const chev = chevronRef.current
      if (!panel) return

      if (reduced) {
        panel.style.height = expanded ? 'auto' : '0px'
        panel.style.overflow = expanded ? 'visible' : 'hidden'
        if (chev) chev.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)'
        return
      }

      if (expanded) {
        gsap.set(panel, { height: 'auto', overflow: 'visible' })
        const target = panel.offsetHeight
        gsap.fromTo(
          panel,
          { height: 0, opacity: 0, overflow: 'hidden' },
          {
            height: target,
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            onComplete: () => {
              panel.style.height = 'auto'
              panel.style.overflow = 'visible'
            },
          }
        )
      } else {
        gsap.to(panel, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          overflow: 'hidden',
        })
      }

      if (chev) {
        gsap.to(chev, {
          rotate: expanded ? 180 : 0,
          duration: 0.25,
          ease: 'power2.out',
        })
      }
    },
    { dependencies: [expanded, reduced] }
  )

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <TargetIcon size={15} />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{category}</span>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) =>
                  i < difficulty
                    ? <StarFilledIcon key={i} size={9} style={{ color: 'var(--accent)' }} />
                    : <StarEmptyIcon key={i} size={9} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
            </div>
          </div>
        </div>
        <div ref={chevronRef} style={{ color: 'var(--text-muted)', transformOrigin: 'center' }}>
          <ChevronDownIcon size={14} />
        </div>
      </button>

      <div ref={panelRef} style={{ overflow: 'hidden' }}>
        <div
          className="px-5 pb-5 space-y-4 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
              {/* Task */}
              <div>
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Aufgabe
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              </div>

              {/* Tips */}
              {tips.length > 0 && (
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
                    style={{ color: 'var(--accent)' }}
                  >
                    Prompting-Tipps
                  </div>
                  <ul className="space-y-2.5">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                        <span
                          className="font-bold text-xs shrink-0 mt-px w-4 text-right"
                          style={{ color: 'var(--accent)' }}
                        >
                          {i + 1}.
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {tip.replace(/^\d+\.\s*/, '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
        </div>
      </div>
    </div>
  )
}
