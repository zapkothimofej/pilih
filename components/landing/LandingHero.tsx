'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

/**
 * Landing-hero with GSAP timeline. Each element enters on its own
 * stagger beat; the backdrop orb drifts slowly behind the heading to
 * give the dark-mode hero some depth without adding visual noise.
 *
 * Respects prefers-reduced-motion by collapsing the timeline to a
 * single instant opacity fade and halting the orb drift.
 */
export default function LandingHero() {
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (!scope.current) return

      if (reduced) {
        gsap.set(['.hero-badge', '.hero-title', '.hero-sub', '.hero-cta'], { opacity: 1, y: 0 })
        gsap.set('.hero-orb', { opacity: 0.25 })
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-badge', { y: 12, opacity: 0, duration: 0.45 })
        .from('.hero-title .hero-title-line', {
          y: 32,
          opacity: 0,
          duration: 0.75,
          stagger: 0.08,
        }, '-=0.15')
        .from('.hero-sub', { y: 14, opacity: 0, duration: 0.5 }, '-=0.35')
        .from('.hero-cta', { y: 16, opacity: 0, duration: 0.45, stagger: 0.08 }, '-=0.25')
        .from('.hero-orb', { scale: 0.8, opacity: 0, duration: 1.2, ease: 'power2.out' }, '-=1.2')

      gsap.to('.hero-orb', {
        x: '+=40',
        y: '+=20',
        repeat: -1,
        yoyo: true,
        duration: 8,
        ease: 'sine.inOut',
      })
    },
    { scope, dependencies: [reduced] }
  )

  return (
    <section
      ref={scope}
      className="relative flex-1 flex flex-col items-center justify-center px-5 pt-20 pb-16 text-center overflow-hidden"
    >
      {/* Decorative indigo orb */}
      <div
        className="hero-orb pointer-events-none absolute -z-0 w-[540px] h-[540px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(129,140,248,0.35) 0%, rgba(129,140,248,0) 70%)',
          top: '-160px',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-2xl">
        <div
          className="hero-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border"
          style={{
            background: 'var(--accent-dim)',
            borderColor: 'var(--accent-border)',
            color: 'var(--accent)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          KI-Führerschein Programm
        </div>

        <h1
          className="hero-title text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-5"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="hero-title-line block">Prompt it</span>
          <span className="hero-title-line block">like it&apos;s hot.</span>
        </h1>

        <p
          className="hero-sub text-lg leading-relaxed mb-10 max-w-lg mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          Dein persönlicher KI-Führerschein — 21 Tage, 21 Challenges,
          individuell auf deinen Job zugeschnitten.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sign-up"
            className="hero-cta px-7 py-3 font-semibold rounded-xl text-sm transition-opacity hover:opacity-85"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Jetzt starten
          </Link>
          <Link
            href="/sign-in"
            className="hero-cta px-7 py-3 font-semibold rounded-xl text-sm border transition-colors"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
          >
            Einloggen
          </Link>
        </div>
      </div>
    </section>
  )
}
