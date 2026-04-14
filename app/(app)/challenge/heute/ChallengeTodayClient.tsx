'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ChallengeCard from '@/components/challenge/ChallengeCard'
import type { Challenge } from '@/app/generated/prisma/client'

interface Props {
  day: number
  challenges: Challenge[]
  existingSessionId: string | null
}

export default function ChallengeTodayClient({ day, challenges, existingSessionId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function handleSelect(challengeId: string) {
    setSelectedId(challengeId)
    setLoading(true)
    try {
      // Session erstellen oder vorhandene nehmen
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, day, existingSessionId }),
      })
      const data = await res.json() as { sessionId: string }
      router.push(`/challenge/${challengeId}?session=${data.sessionId}`)
    } catch {
      setLoading(false)
      setSelectedId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-orange-400 font-medium mb-1">Tag {day} von 21</div>
        <h1 className="text-2xl font-bold text-white">Wähle deine heutige Challenge</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Drei Optionen, personalisiert auf dein Level — wähle eine aus
        </p>
      </div>

      <div className="space-y-3">
        {challenges.map((c, i) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            index={i}
            onSelect={handleSelect}
            loading={loading && selectedId === c.id}
          />
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          Keine Challenges verfügbar. Bitte lade die Seite neu.
        </div>
      )}
    </div>
  )
}
