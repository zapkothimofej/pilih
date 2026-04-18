'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'
import { TargetIcon, BotIcon, TrophyIcon } from '@/components/ui/icons'

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  { step: '01', title: 'Profil anlegen', desc: 'Beschreibe deinen Job und dein KI-Wissenstand.' },
  { step: '02', title: 'Challenge wählen', desc: 'Jeden Tag 3 personalisierte Challenges zur Auswahl.' },
  { step: '03', title: 'KI nutzen & lernen', desc: 'Direktes Feedback auf deine Prompts durch eine zweite KI.' },
  { step: '04', title: 'Zertifikat erhalten', desc: 'Nach 21 Tagen: dein offizieller KI-Führerschein.' },
]

const FEATURES = [
  { icon: <TargetIcon size={18} />, title: '21 Challenges', desc: 'Individuell auf deinen Job und Kenntnisstand zugeschnitten.' },
  { icon: <BotIcon size={18} />, title: 'KI-Feedback', desc: 'Echtzeit-Bewertung deiner Prompts durch eine zweite KI.' },
  { icon: <TrophyIcon size={18} />, title: 'Zertifikat', desc: 'Offizieller KI-Führerschein zum Download und LinkedIn-Share.' },
]

export default function LandingSteps() {
  const scope = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGSAP(
    () => {
      if (!scope.current || reduced) return

      // Steps stagger in when scrolled into view.
      gsap.from('.step-card', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: '.steps-wrap',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      })

      // Feature cards lift slightly later.
      gsap.from('.feature-card', {
        y: 24,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: '.features-wrap',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })

      // Magnetic hover: subtle tilt towards the cursor for feature cards.
      const cards = scope.current.querySelectorAll<HTMLElement>('.feature-card')
      const listeners: Array<() => void> = []
      cards.forEach((card) => {
        const onMove = (e: MouseEvent) => {
          const rect = card.getBoundingClientRect()
          const x = (e.clientX - rect.left - rect.width / 2) / rect.width
          const y = (e.clientY - rect.top - rect.height / 2) / rect.height
          gsap.to(card, {
            rotateY: x * 6,
            rotateX: -y * 6,
            duration: 0.4,
            ease: 'power2.out',
            transformPerspective: 800,
          })
        }
        const onLeave = () => {
          gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power2.out' })
        }
        card.addEventListener('mousemove', onMove)
        card.addEventListener('mouseleave', onLeave)
        listeners.push(() => {
          card.removeEventListener('mousemove', onMove)
          card.removeEventListener('mouseleave', onLeave)
        })
      })
      return () => listeners.forEach((fn) => fn())
    },
    { scope, dependencies: [reduced] }
  )

  return (
    <section ref={scope} className="max-w-4xl mx-auto px-5 pb-16 w-full">
      <div
        className="steps-wrap p-6 rounded-2xl border mb-6"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-5"
          style={{ color: 'var(--text-muted)' }}
        >
          Wie es funktioniert
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {STEPS.map((item) => (
            <div key={item.step} className="step-card">
              <div
                className="text-2xl font-bold mb-1.5 tabular-nums"
                style={{ color: 'var(--border-strong)' }}
              >
                {item.step}
              </div>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="features-wrap grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map((item) => (
          <div
            key={item.title}
            className="feature-card p-5 rounded-2xl border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            <div className="mb-3" style={{ color: 'var(--accent)' }}>{item.icon}</div>
            <div className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
