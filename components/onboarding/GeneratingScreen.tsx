'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

const MESSAGES = [
  'Analysiere dein Berufsprofil…',
  'Entwickle personalisierte Challenges…',
  'Optimiere Schwierigkeitsgrade…',
  'Füge Prompting-Tipps hinzu…',
  'Fast fertig…',
]

export default function GeneratingScreen() {
  const router = useRouter()
  const [msgIndex, setMsgIndex] = useState(0)
  const [error, setError] = useState('')
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 2500)

    fetch('/api/challenges/generate', { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error('Generierung fehlgeschlagen')
        return res.json()
      })
      .then(() => {
        clearInterval(interval)
        router.push('/dashboard')
      })
      .catch(() => {
        clearInterval(interval)
        setError('Fehler beim Generieren der Challenges. Bitte versuche es erneut.')
      })

    return () => clearInterval(interval)
  }, [router])

  // GSAP orbit animation: three concentric rings rotating at different
  // rates with pulsing nodes. Reduced-motion keeps the dots static.
  useGSAP(
    () => {
      if (!scope.current || reduced) return

      const rings = scope.current.querySelectorAll<SVGGElement>('.orbit-ring')
      rings.forEach((ring, i) => {
        gsap.to(ring, {
          rotate: i % 2 === 0 ? 360 : -360,
          duration: 8 + i * 3,
          repeat: -1,
          ease: 'none',
          transformOrigin: '50% 50%',
        })
      })

      gsap.to('.orbit-core', {
        scale: 1.08,
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.from('.orbit-core, .orbit-ring', {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power2.out',
      })
    },
    { scope, dependencies: [reduced] }
  )

  // Swap message with a micro crossfade instead of React key reset.
  useGSAP(
    () => {
      if (reduced) return
      gsap.fromTo(
        '.msg-text',
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
    },
    { dependencies: [msgIndex, reduced] }
  )

  return (
    <div
      ref={scope}
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
    >
      {error ? (
        <div className="space-y-5">
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          <button
            onClick={() => router.push('/onboarding')}
            className="px-6 py-2.5 rounded-xl text-sm border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            Zurück zum Onboarding
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <OrbitSpinner />

          <div className="space-y-2">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Deine Challenges werden erstellt
            </h2>
            <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Unsere KI analysiert dein Profil und erstellt 21 personalisierte Challenges für deinen Job.
            </p>
          </div>

          <div className="h-5">
            <p className="msg-text text-xs" style={{ color: 'var(--accent)' }}>
              {MESSAGES[msgIndex]}
            </p>
          </div>

          <div className="w-56 mx-auto">
            <div
              className="h-0.5 rounded-full overflow-hidden"
              style={{ background: 'var(--border-default)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, var(--accent) 0%, #a5b4fc 100%)',
                  animation: reduced ? 'none' : 'generating-progress 12s ease-in-out forwards',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes generating-progress {
          from { width: 0% }
          to { width: 95% }
        }
      `}</style>
    </div>
  )
}

function OrbitSpinner() {
  return (
    <div className="relative mx-auto flex items-center justify-center w-32 h-32">
      <svg viewBox="-60 -60 120 120" className="w-full h-full" aria-hidden="true">
        <defs>
          <radialGradient id="orbit-core-grad">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </radialGradient>
        </defs>

        <g className="orbit-ring">
          <circle r="48" fill="none" stroke="rgba(129,140,248,0.20)" strokeWidth="0.6" />
          <circle cx="48" cy="0" r="2.5" fill="#a5b4fc" />
        </g>
        <g className="orbit-ring">
          <circle r="34" fill="none" stroke="rgba(129,140,248,0.30)" strokeWidth="0.8" />
          <circle cx="-34" cy="0" r="3" fill="#818cf8" />
        </g>
        <g className="orbit-ring">
          <circle r="22" fill="none" stroke="rgba(129,140,248,0.40)" strokeWidth="1" />
          <circle cx="0" cy="-22" r="2" fill="#34d399" />
        </g>

        <circle className="orbit-core" r="10" fill="url(#orbit-core-grad)" />
      </svg>
    </div>
  )
}
