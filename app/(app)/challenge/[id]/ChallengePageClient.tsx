'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import ChallengeWidget from '@/components/challenge/ChallengeWidget'
import ChatInterface from '@/components/challenge/ChatInterface'
import { ArrowLeftIcon } from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'
import type { Challenge } from '@/app/generated/prisma/client'

interface Props {
  challenge: Challenge
  sessionId: string
  dayNumber: number
  previousAttempts: Array<{ userPrompt: string; llmResponse: string }>
}

export default function ChallengePageClient({ challenge, sessionId, dayNumber, previousAttempts }: Props) {
  const router = useRouter()
  const scope = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  function handleComplete(_rating: string, xp: number) {
    // router.refresh() invalidates Next 16's dynamic RSC cache so the
    // dashboard re-fetches the totals instead of serving a 30-s-stale
    // XP count. Without it the user sees their pre-completion total
    // for up to staleTimes.dynamic after completing a challenge.
    // `_rating` is kept in the signature for API stability; the server
    // already persisted the adaptive difficulty delta.
    void _rating
    setTimeout(() => {
      router.push(`/dashboard?xp=${xp}`)
      router.refresh()
    }, 500)
  }

  useGSAP(
    () => {
      if (reduced || !scope.current) return
      gsap.from(scope.current.querySelectorAll<HTMLElement>('[data-stagger]'), {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power2.out',
      })
    },
    { dependencies: [reduced], scope }
  )

  return (
    <div ref={scope} className="space-y-4">
      {/* Topbar */}
      <div data-stagger className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm transition-colors tap-small"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeftIcon size={14} />
          Dashboard
        </button>

        <div className="flex items-center gap-3">
          <div
            className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
          >
            Tag {dayNumber} von 21
          </div>
          <button
            onClick={() => router.push('/challenge/heute')}
            className="text-xs transition-colors tap-small"
            style={{ color: 'var(--text-muted)' }}
          >
            Andere Challenge
          </button>
        </div>
      </div>

      {/* Widget */}
      <div data-stagger>
        <ChallengeWidget
          title={challenge.title}
          description={challenge.description}
          promptingTips={challenge.promptingTips}
          category={challenge.category}
          difficulty={challenge.currentDifficulty}
        />
      </div>

      {/* Chat */}
      <div
        data-stagger
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center gap-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--success)' }}
          />
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            KI-Assistent
          </span>
        </div>
        <div className="p-5">
          <ChatInterface
            challengeId={challenge.id}
            sessionId={sessionId}
            previousAttempts={previousAttempts}
            onComplete={handleComplete}
          />
        </div>
      </div>
    </div>
  )
}
