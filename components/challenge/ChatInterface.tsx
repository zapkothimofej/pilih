'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import JudgeFeedbackPopup from './JudgeFeedbackPopup'
import DifficultyRating from './DifficultyRating'

type Message = { role: 'user' | 'assistant'; content: string }
type JudgeFeedback = { score: number; feedback: string; improvements: string[]; strengths: string[] }
type DiffRating = 'TOO_EASY' | 'JUST_RIGHT' | 'TOO_HARD'

interface ChatInterfaceProps {
  challengeId: string
  sessionId: string
  previousAttempts: Array<{ userPrompt: string; llmResponse: string }>
  onComplete: (rating: DiffRating, xp: number) => void
}

export default function ChatInterface({ challengeId, sessionId, previousAttempts, onComplete }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    previousAttempts.flatMap(a => [
      { role: 'user' as const, content: a.userPrompt },
      { role: 'assistant' as const, content: a.llmResponse },
    ])
  )
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [judgeFeedback, setJudgeFeedback] = useState<JudgeFeedback | null>(null)
  const [showRating, setShowRating] = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [attempts, setAttempts] = useState(previousAttempts.length)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const sendPrompt = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    const userMsg = input.trim()
    setInput('')
    setAttempts((a) => a + 1)
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setIsStreaming(true)

    let assistantContent = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(`/api/challenges/${challengeId}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: userMsg,
          sessionId,
          chatHistory: messages,
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6)) as
            | { type: 'chunk'; text: string }
            | { type: 'judge'; score: number; feedback: string; improvements: string[]; strengths: string[] }
            | { type: 'done' }
            | { type: 'error'; message: string }

          if (data.type === 'chunk') {
            assistantContent += data.text
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: assistantContent },
            ])
          } else if (data.type === 'judge') {
            setJudgeFeedback({ score: data.score, feedback: data.feedback, improvements: data.improvements, strengths: data.strengths })
          } else if (data.type === 'done') {
            setIsStreaming(false)
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Fehler beim Laden der Antwort. Bitte versuche es erneut.' },
      ])
      setIsStreaming(false)
    }
  }, [input, isStreaming, challengeId, sessionId, messages])

  async function handleRate(rating: DiffRating) {
    setRatingLoading(true)
    const res = await fetch(`/api/challenges/${challengeId}/abschliessen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, difficultyRating: rating }),
    })
    const data = await res.json() as { xp: number }
    onComplete(rating, data.xp)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendPrompt()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Nachrichten */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-[300px] max-h-[500px]">
        {messages.length === 0 && (
          <div className="text-center text-zinc-600 text-sm pt-8">
            Gib deinen ersten Prompt ein ↓
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-sm mr-2 mt-0.5 shrink-0">
                🤖
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-orange-500 text-white rounded-tr-sm'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-200 rounded-tl-sm'
              }`}
            >
              {msg.content || (isStreaming && i === messages.length - 1 ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : '')}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Abschließen-Button (nach mind. 1 Versuch) */}
      {attempts > 0 && !showRating && !isStreaming && (
        <div className="border-t border-[#222] pt-3 mb-3">
          <button
            onClick={() => setShowRating(true)}
            className="w-full py-2.5 border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400 rounded-lg text-sm font-medium transition-colors"
          >
            ✓ Challenge abschließen
          </button>
        </div>
      )}

      {/* Difficulty Rating */}
      {showRating && (
        <div className="border-t border-[#222] pt-3 mb-3">
          <DifficultyRating onRate={handleRate} loading={ratingLoading} />
        </div>
      )}

      {/* Eingabe */}
      {!showRating && (
        <div className="border-t border-[#222] pt-3">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Schreibe deinen Prompt... (Enter zum Senden)"
              rows={2}
              disabled={isStreaming}
              className="flex-1 bg-[#111] border border-[#333] focus:border-orange-500 rounded-lg px-4 py-3 text-white placeholder-zinc-600 resize-none outline-none text-sm transition-colors disabled:opacity-50"
            />
            <button
              onClick={sendPrompt}
              disabled={!input.trim() || isStreaming}
              className="px-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
            >
              <SendIcon />
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-1.5">Shift+Enter für Zeilenumbruch</p>
        </div>
      )}

      {/* Judge Feedback Popup */}
      <JudgeFeedbackPopup feedback={judgeFeedback} onClose={() => setJudgeFeedback(null)} />
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
  )
}
