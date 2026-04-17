'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ChallengeWidget from '@/components/challenge/ChallengeWidget'
import ChatInterface from '@/components/challenge/ChatInterface'
import { ArrowLeftIcon } from '@/components/ui/icons'
import type { Challenge } from '@/app/generated/prisma/client'

interface Props {
  challenge: Challenge
  sessionId: string
  dayNumber: number
  previousAttempts: Array<{ userPrompt: string; llmResponse: string }>
}

export default function ChallengePageClient({ challenge, sessionId, dayNumber, previousAttempts }: Props) {
  const router = useRouter()

  function handleComplete(_rating: string, xp: number) {
    setTimeout(() => router.push(`/dashboard?xp=${xp}`), 500)
  }

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm transition-colors"
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
            className="text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Andere Challenge
          </button>
        </div>
      </motion.div>

      {/* Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
      >
        <ChallengeWidget
          title={challenge.title}
          description={challenge.description}
          promptingTips={challenge.promptingTips}
          category={challenge.category}
          difficulty={challenge.currentDifficulty}
        />
      </motion.div>

      {/* Chat */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
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
      </motion.div>
    </div>
  )
}
