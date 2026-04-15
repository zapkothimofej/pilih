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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-base">
                  🤖
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">KI-Bewertung</div>
                  <div className="text-xs text-zinc-500">Dein Prompt-Score</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Score */}
            <div className="flex items-center gap-5 px-5 py-5 border-b border-[#1e1e1e]">
              <ScoreRing score={feedback.score} />
              <div>
                <div className="text-3xl font-bold text-white leading-none">{feedback.score}<span className="text-lg text-zinc-500 font-normal">/10</span></div>
                <div className="text-sm mt-1 font-medium" style={{ color: scoreColor(feedback.score) }}>
                  {scoreLabel(feedback.score)}
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-64 px-5 py-4 space-y-4">
              {/* Feedback text */}
              <p className="text-sm text-zinc-300 leading-relaxed">{feedback.feedback}</p>

              {/* Stärken */}
              {feedback.strengths?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-green-400 uppercase tracking-widest">Stärken</div>
                  {feedback.strengths.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Verbesserungen */}
              {feedback.improvements?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest">Verbesserungen</div>
                  {feedback.improvements.map((imp, i) => (
                    <div key={i} className="flex gap-2 text-sm text-zinc-300">
                      <span className="text-orange-400 shrink-0 mt-0.5">→</span>
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-[#1e1e1e]">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-xl text-sm font-medium transition-colors"
              >
                Verstanden ✓
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function scoreLabel(score: number) {
  if (score >= 9) return 'Herausragend'
  if (score >= 7) return 'Sehr gut'
  if (score >= 5) return 'Solide'
  if (score >= 3) return 'Ausbaufähig'
  return 'Noch viel Potenzial'
}

function scoreColor(score: number) {
  if (score >= 7) return '#a855f7'
  if (score >= 5) return '#f97316'
  return '#ef4444'
}

function ScoreRing({ score }: { score: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const fill = (score / 10) * c
  const color = scoreColor(score)

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="rotate-[-90deg]">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#1e1e1e" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${c - fill}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{score}</span>
      </div>
    </div>
  )
}
