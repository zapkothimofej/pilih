'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpinnerIcon } from '@/components/ui/icons'

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
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
          {/* Spinner */}
          <div className="relative mx-auto flex items-center justify-center">
            <SpinnerIcon size={56} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Deine Challenges werden erstellt
            </h2>
            <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              Unsere KI analysiert dein Profil und erstellt 21 personalisierte Challenges für deinen Job.
            </p>
          </div>

          <div className="h-5">
            <p
              key={msgIndex}
              className="text-xs"
              style={{ color: 'var(--accent)' }}
            >
              {MESSAGES[msgIndex]}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-56 mx-auto">
            <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: 'var(--accent)',
                  animation: 'generating-progress 12s ease-in-out forwards',
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
