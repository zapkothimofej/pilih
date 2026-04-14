'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const MESSAGES = [
  'Analysiere dein Berufsprofil...',
  'Entwickle personalisierte Challenges...',
  'Optimiere Schwierigkeitsgrade...',
  'Füge Prompting-Tipps hinzu...',
  'Fast fertig...',
]

export default function GeneratingScreen() {
  const router = useRouter()
  const [msgIndex, setMsgIndex] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    // Nachrichten durchwechseln
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 2500)

    // API aufrufen
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
        <div className="space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/onboarding')}
            className="px-6 py-3 border border-zinc-600 text-zinc-300 rounded-lg hover:border-zinc-400 transition-colors"
          >
            Zurück zum Onboarding
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Spinner */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-[#222]" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🔥</div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Deine Challenges werden erstellt</h2>
            <p className="text-zinc-400 text-sm max-w-sm">
              Unsere KI analysiert dein Profil und erstellt 21 personalisierte Challenges für deinen Job.
            </p>
          </div>

          <div className="h-6">
            <p key={msgIndex} className="text-orange-400 text-sm animate-pulse">
              {MESSAGES[msgIndex]}
            </p>
          </div>

          {/* Fake Fortschrittsbalken */}
          <div className="w-64 mx-auto">
            <div className="h-1 bg-[#222] rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full animate-[progress_12s_ease-in-out_forwards]" />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 0% }
          to { width: 95% }
        }
      `}</style>
    </div>
  )
}
