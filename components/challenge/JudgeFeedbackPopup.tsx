'use client'

import { motion, AnimatePresence } from 'framer-motion'

type JudgeFeedback = {
  score: number
  feedback: string
  improvements: string[]
  strengths: string[]
}

interface JudgeFeedbackPopupProps {
  feedback: JudgeFeedback | null
  onClose: () => void
}

export default function JudgeFeedbackPopup({ feedback, onClose }: JudgeFeedbackPopupProps) {
  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#111] border border-[#333] rounded-2xl p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">KI-Bewertung</div>
                  <div className="text-xs text-zinc-500">Prompt-Qualität</div>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <CloseIcon />
              </button>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4">
              <ScoreRing score={feedback.score} />
              <div>
                <div className="text-2xl font-bold text-white">{feedback.score}/10</div>
                <div className="text-sm text-zinc-400">
                  {feedback.score >= 8 ? 'Ausgezeichnet!' : feedback.score >= 6 ? 'Gut gemacht' : feedback.score >= 4 ? 'Guter Start' : 'Verbesserungspotenzial'}
                </div>
              </div>
            </div>

            {/* Feedback-Text */}
            <p className="text-sm text-zinc-300 leading-relaxed">{feedback.feedback}</p>

            {/* Stärken */}
            {feedback.strengths.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-green-400 uppercase tracking-wide">Stärken</div>
                {feedback.strengths.map((s, i) => (
                  <div key={i} className="flex gap-2 text-sm text-zinc-300">
                    <span className="text-green-400 shrink-0">✓</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Verbesserungen */}
            {feedback.improvements.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Verbesserungen</div>
                {feedback.improvements.map((imp, i) => (
                  <div key={i} className="flex gap-2 text-sm text-zinc-300">
                    <span className="text-orange-400 shrink-0">→</span>
                    <span>{imp}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-colors"
            >
              Verstanden, nächster Versuch
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const fill = (score / 10) * c
  const color = score >= 7 ? '#a855f7' : score >= 4 ? '#f97316' : '#ef4444'

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#222" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${fill} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
