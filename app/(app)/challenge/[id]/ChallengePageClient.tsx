'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ChallengeWidget from '@/components/challenge/ChallengeWidget'
import ChatInterface from '@/components/challenge/ChatInterface'
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
    // XP-Feedback kurz zeigen, dann zum Dashboard
    setTimeout(() => router.push(`/dashboard?xp=${xp}`), 500)
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="text-sm text-orange-400 font-medium">Tag {dayNumber} von 21</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => router.push('/challenge/heute')}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Andere Challenge
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <ChallengeWidget
          title={challenge.title}
          description={challenge.description}
          promptingTips={challenge.promptingTips}
          category={challenge.category}
          difficulty={challenge.currentDifficulty}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#111] border border-[#222] rounded-xl p-4"
      >
        <ChatInterface
          challengeId={challenge.id}
          sessionId={sessionId}
          previousAttempts={previousAttempts}
          onComplete={handleComplete}
        />
      </motion.div>
    </div>
  )
}
