'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { BotIcon, CloseIcon, CheckIcon, ArrowRightIcon } from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

type JudgeFeedback = {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  techniqueFocus: string
}

interface JudgeFeedbackPopupProps {
  feedback: JudgeFeedback | null
  onClose: () => void
}

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function JudgeFeedbackPopup({ feedback, onClose }: JudgeFeedbackPopupProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const popupReduced = useReducedMotion()

  // GSAP entrance animation replacing framer-motion. Honours reduced-
  // motion: just snap in without scale/y transitions for users who
  // opted out (previous framer wrapper ran the springs regardless).
  useGSAP(
    () => {
      if (!feedback) return
      if (popupReduced) {
        gsap.set([backdropRef.current, dialogRef.current], { opacity: 1, scale: 1, y: 0 })
        return
      }
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 })
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0, scale: 0.94, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'back.out(1.2)' }
      )
    },
    { dependencies: [!!feedback, popupReduced] }
  )

  // Save + restore focus, focus close button on open, and trap Tab inside.
  useEffect(() => {
    if (!feedback) return

    previouslyFocusedRef.current =
      (typeof document !== 'undefined' && (document.activeElement as HTMLElement)) || null

    // Focus the close button on the next frame.
    const raf = requestAnimationFrame(() => {
      closeBtnRef.current?.focus()
    })

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const root = dialogRef.current
      if (!root) return
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
      )
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that had it before the popup opened.
      previouslyFocusedRef.current?.focus?.()
    }
  }, [feedback, onClose])

  if (!feedback) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'var(--overlay-blur)', opacity: 0 }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judge-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', opacity: 0 }}
      >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  <BotIcon size={15} />
                </div>
                <div>
                  <div
                    id="judge-popup-title"
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    KI-Bewertung
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Dein Prompt-Score
                  </div>
                </div>
              </div>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Feedback schließen"
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <CloseIcon size={12} />
              </button>
            </div>

            {/* Score */}
            <div
              className="flex items-center gap-5 px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <ScoreRing score={feedback.score} />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {feedback.score}
                  </span>
                  <span className="text-base" style={{ color: 'var(--text-muted)' }}>/10</span>
                </div>
                <div className="text-sm font-medium mt-0.5" style={{ color: scoreColor(feedback.score) }}>
                  {scoreLabel(feedback.score)}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-60 px-5 py-4 space-y-4">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {feedback.feedback}
              </p>

              {feedback.techniqueFocus && feedback.techniqueFocus.trim().length > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    background: 'var(--accent-dim)',
                    borderColor: 'var(--accent-border)',
                    color: 'var(--accent)',
                    lineHeight: 1,
                  }}
                >
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest opacity-80"
                  >
                    Fokus-Technik
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{feedback.techniqueFocus}</span>
                </div>
              )}

              {feedback.strengths?.length > 0 && (
                <div className="space-y-1.5">
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--success)' }}
                  >
                    Stärken
                  </div>
                  {feedback.strengths.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="shrink-0 mt-0.5" style={{ color: 'var(--success)' }}>
                        <CheckIcon size={13} />
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {feedback.improvements?.length > 0 && (
                <div className="space-y-1.5">
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--accent)' }}
                  >
                    Verbesserungen
                  </div>
                  {feedback.improvements.map((imp, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>
                        <ArrowRightIcon size={13} />
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{imp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 pb-5 pt-3 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{
                  background: 'var(--accent-dim)',
                  borderColor: 'var(--accent-border)',
                  color: 'var(--accent)',
                }}
              >
                Verstanden
              </button>
            </div>
      </div>
    </div>
  )
}

function scoreLabel(score: number) {
  if (score >= 9) return 'Herausragend'
  if (score >= 7) return 'Sehr gut'
  if (score >= 5) return 'Solide'
  if (score >= 3) return 'Ausbaufähig'
  return 'Noch viel Potenzial'
}

function scoreColor(score: number) {
  if (score >= 7) return 'var(--accent)'
  if (score >= 5) return 'var(--warning)'
  return 'var(--error)'
}

function ScoreRing({ score }: { score: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const fill = (score / 10) * c
  const color = scoreColor(score)
  const ringRef = useRef<SVGSVGElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      const arc = ringRef.current?.querySelector<SVGCircleElement>('.score-arc')
      const num = numRef.current
      if (!arc || !num) return

      if (reduced) {
        arc.setAttribute('stroke-dasharray', `${fill} ${c - fill}`)
        num.textContent = String(score)
        return
      }

      gsap.fromTo(
        arc,
        { strokeDasharray: `0 ${c}` },
        { strokeDasharray: `${fill} ${c - fill}`, duration: 1.1, ease: 'power3.out' }
      )

      const counter = { n: 0 }
      gsap.to(counter, {
        n: score,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          if (num) num.textContent = String(Math.round(counter.n))
        },
      })
    },
    { dependencies: [score, fill, c, reduced] }
  )

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg ref={ringRef} width="64" height="64" viewBox="0 0 64 64" className="rotate-[-90deg]">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border-default)" strokeWidth="5" />
        <circle
          className="score-arc"
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`0 ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span ref={numRef} className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          0
        </span>
      </div>
    </div>
  )
}
