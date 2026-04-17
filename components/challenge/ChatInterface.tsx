'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import JudgeFeedbackPopup from './JudgeFeedbackPopup'
import DifficultyRating from './DifficultyRating'
import { SendIcon, BotIcon, CheckIcon, CloseIcon } from '@/components/ui/icons'

type Message = { role: 'user' | 'assistant'; content: string }
type JudgeFeedback = {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  techniqueFocus: string
}
type JudgeInternal = JudgeFeedback & { attemptNumber: number }
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
  const [latestJudge, setLatestJudge] = useState<JudgeInternal | null>(null)
  const [showRating, setShowRating] = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [attempts, setAttempts] = useState(previousAttempts.length)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Stop streaming cleanly if component unmounts mid-flight.
  useEffect(() => () => abortRef.current?.abort(), [])

  const sendPrompt = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    let assistantContent = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(`/api/challenges/${challengeId}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: userMsg, sessionId, chatHistory: messages }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        const msg =
          (errJson as { error?: string } | null)?.error ??
          'Fehler beim Laden der Antwort. Bitte versuche es erneut.'
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: msg },
        ])
        setIsStreaming(false)
        return
      }
      if (!res.body) {
        throw new Error('Kein Response-Stream erhalten.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let data:
            | { type: 'chunk'; text: string }
            | {
                type: 'judge'
                score: number
                feedback: string
                improvements: string[]
                strengths: string[]
                techniqueFocus: string
                shouldShowPopup: boolean
                attemptNumber: number
              }
            | { type: 'done' }
            | { type: 'error'; message: string }
          try {
            data = JSON.parse(line.slice(6))
          } catch {
            continue
          }

          if (data.type === 'chunk') {
            assistantContent += data.text
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: assistantContent },
            ])
          } else if (data.type === 'judge') {
            const judgeData: JudgeInternal = {
              score: data.score,
              feedback: data.feedback,
              strengths: data.strengths,
              improvements: data.improvements,
              techniqueFocus: data.techniqueFocus,
              attemptNumber: data.attemptNumber,
            }
            setAttempts(data.attemptNumber)
            setLatestJudge(judgeData)
            if (data.shouldShowPopup) {
              setJudgeFeedback(judgeData)
            }
          } else if (data.type === 'done') {
            setIsStreaming(false)
          } else if (data.type === 'error') {
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: 'Fehler beim Laden der Antwort. Bitte versuche es erneut.' },
            ])
            setIsStreaming(false)
          }
        }
      }
    } catch (err) {
      const aborted = (err as { name?: string })?.name === 'AbortError'
      const fallback = aborted
        ? 'Antwort abgebrochen.'
        : 'Fehler beim Laden der Antwort. Bitte versuche es erneut.'
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: assistantContent.length > 0 ? assistantContent : fallback,
        },
      ])
      setIsStreaming(false)
    } finally {
      abortRef.current = null
    }
  }, [input, isStreaming, challengeId, sessionId, messages])

  function stopStreaming() {
    abortRef.current?.abort()
  }

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
    <div className="flex flex-col">
      {/* Messages */}
      <div className="space-y-4 pb-4 min-h-[280px] max-h-[460px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}
            >
              <BotIcon size={18} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Gib deinen ersten Prompt ein
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const isStreamingBubble = msg.role === 'assistant' && isStreaming && isLast && !msg.content
          const showJudgeLink =
            msg.role === 'assistant' &&
            isLast &&
            !isStreaming &&
            latestJudge &&
            judgeFeedback === null &&
            msg.content.length > 0
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}
                >
                  <BotIcon size={13} />
                </div>
              )}

              <div className="max-w-[84%] flex flex-col gap-1.5">
                <div
                  className="px-4 py-3 rounded-2xl text-sm leading-relaxed relative"
                  style={msg.role === 'user'
                    ? { background: 'var(--accent)', color: '#fff', borderRadius: '16px 4px 16px 16px' }
                    : { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px 16px 16px 16px' }
                  }
                >
                  {isStreamingBubble ? (
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <MessageMarkdown content={msg.content} role={msg.role} />
                  )}

                  {msg.role === 'assistant' && msg.content && !isStreamingBubble && (
                    <CopyButton
                      text={msg.content}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      variant="message"
                    />
                  )}
                </div>

                {showJudgeLink && latestJudge && (
                  <button
                    onClick={() => setJudgeFeedback(latestJudge)}
                    className="self-start text-[11px] px-2.5 py-1 rounded-full border transition-colors"
                    style={{
                      background: 'var(--accent-dim)',
                      borderColor: 'var(--accent-border)',
                      color: 'var(--accent)',
                    }}
                  >
                    Feedback verfügbar
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Complete button */}
      {attempts > 0 && !showRating && !isStreaming && (
        <div className="border-t pt-3 mb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => setShowRating(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'var(--success-dim)',
              borderColor: 'var(--success-border)',
              color: 'var(--success)',
            }}
          >
            <CheckIcon size={14} />
            Challenge abschließen
          </button>
        </div>
      )}

      {/* Rating */}
      {showRating && (
        <div className="border-t pt-3 mb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <DifficultyRating onRate={handleRate} loading={ratingLoading} />
        </div>
      )}

      {/* Input */}
      {!showRating && (
        <div className="border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Schreibe deinen Prompt… (Enter zum Senden)"
              rows={2}
              disabled={isStreaming}
              className="flex-1 rounded-xl px-4 py-3 text-sm placeholder-opacity-50 resize-none outline-none transition-colors disabled:opacity-40"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent-border)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                aria-label="Antwort abbrechen"
                className="px-4 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 text-sm font-medium border"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <CloseIcon size={12} />
                Stop
              </button>
            ) : (
              <button
                onClick={sendPrompt}
                disabled={!input.trim()}
                aria-label="Prompt senden"
                className="px-4 rounded-xl transition-opacity disabled:opacity-30 shrink-0"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <SendIcon size={15} />
              </button>
            )}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Shift+Enter für Zeilenumbruch
          </p>
        </div>
      )}

      {/* Judge Feedback Popup */}
      <JudgeFeedbackPopup feedback={judgeFeedback} onClose={() => setJudgeFeedback(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Markdown renderer with matching bubble styling + code-block copy    */
/* ------------------------------------------------------------------ */

function MessageMarkdown({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  const components = useMemo(
    () => buildMarkdownComponents(role),
    [role]
  )
  return (
    <div className={role === 'user' ? 'chat-md chat-md--user' : 'chat-md chat-md--assistant'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      <style jsx>{`
        .chat-md :global(p) {
          margin: 0;
        }
        .chat-md :global(p + p),
        .chat-md :global(ul),
        .chat-md :global(ol),
        .chat-md :global(blockquote),
        .chat-md :global(pre),
        .chat-md :global(table) {
          margin-top: 0.6em;
        }
        .chat-md :global(ul),
        .chat-md :global(ol) {
          padding-left: 1.25rem;
        }
        .chat-md :global(ul) {
          list-style: disc;
        }
        .chat-md :global(ol) {
          list-style: decimal;
        }
        .chat-md :global(li) {
          margin: 0.15em 0;
        }
        .chat-md :global(h1),
        .chat-md :global(h2),
        .chat-md :global(h3),
        .chat-md :global(h4) {
          font-weight: 600;
          margin: 0.6em 0 0.3em;
          line-height: 1.25;
        }
        .chat-md :global(h1) { font-size: 1.05em; }
        .chat-md :global(h2) { font-size: 1em; }
        .chat-md :global(h3),
        .chat-md :global(h4) { font-size: 0.95em; }
        .chat-md :global(a) {
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .chat-md :global(hr) {
          border: 0;
          border-top: 1px solid var(--border-default);
          margin: 0.75em 0;
        }
        .chat-md :global(blockquote) {
          border-left: 2px solid var(--border-default);
          padding-left: 0.75rem;
          color: var(--text-muted);
        }
        .chat-md :global(table) {
          border-collapse: collapse;
          font-size: 0.9em;
        }
        .chat-md :global(th),
        .chat-md :global(td) {
          border: 1px solid var(--border-default);
          padding: 0.3em 0.55em;
          text-align: left;
        }
        .chat-md--user :global(a) {
          color: #fff;
        }
        .chat-md--user :global(blockquote) {
          border-left-color: rgba(255, 255, 255, 0.5);
          color: rgba(255, 255, 255, 0.85);
        }
        .chat-md--user :global(hr) {
          border-top-color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

function buildMarkdownComponents(role: 'user' | 'assistant') {
  return {
    code({ className, children, ...rest }: ComponentPropsWithoutRef<'code'>) {
      const content = String(children ?? '')
      const isBlock = typeof className === 'string' && className.startsWith('language-')
      if (!isBlock) {
        return (
          <code
            className={className}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.88em',
              padding: '0.1em 0.35em',
              borderRadius: '4px',
              background:
                role === 'user'
                  ? 'rgba(255,255,255,0.18)'
                  : 'var(--bg-overlay)',
              border:
                role === 'user'
                  ? '1px solid rgba(255,255,255,0.25)'
                  : '1px solid var(--border-default)',
            }}
            {...rest}
          >
            {children}
          </code>
        )
      }
      // Block code renders bare; <pre> wrapper is handled by the `pre` component below
      return (
        <code
          className={className}
          data-raw={content}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.85em',
            display: 'block',
            whiteSpace: 'pre',
            padding: '0.75rem 0.9rem',
            color: role === 'user' ? '#fff' : 'var(--text-primary)',
          }}
          {...rest}
        >
          {children}
        </code>
      )
    },
    pre({ children }: { children?: ReactNode }) {
      const raw = extractCodeText(children)
      return (
        <div
          style={{
            position: 'relative',
            margin: '0.6em 0 0',
            borderRadius: '10px',
            overflow: 'hidden',
            border:
              role === 'user'
                ? '1px solid rgba(255,255,255,0.25)'
                : '1px solid var(--border-default)',
            background:
              role === 'user'
                ? 'rgba(0,0,0,0.22)'
                : 'var(--bg-overlay)',
          }}
        >
          <CopyButton
            text={raw}
            variant="codeblock"
            className="absolute top-1.5 right-1.5"
          />
          <pre
            style={{
              margin: 0,
              padding: 0,
              overflowX: 'auto',
              background: 'transparent',
            }}
          >
            {children}
          </pre>
        </div>
      )
    },
  }
}

function extractCodeText(children: ReactNode): string {
  if (children == null) return ''
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(extractCodeText).join('')
  if (typeof children === 'object' && 'props' in (children as object)) {
    const props = (children as { props?: { children?: ReactNode; 'data-raw'?: string } }).props
    if (props?.['data-raw']) return props['data-raw'] as string
    return extractCodeText(props?.children)
  }
  return ''
}

/* ------------------------------------------------------------------ */
/* Copy button                                                          */
/* ------------------------------------------------------------------ */

function CopyButton({
  text,
  className,
  variant,
}: {
  text: string
  className?: string
  variant: 'message' | 'codeblock'
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1400)
    } catch {
      // Silently ignore — clipboard may be unavailable.
    }
  }

  const baseStyle =
    variant === 'codeblock'
      ? {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
        }
      : {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
        }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Kopiert' : 'Antwort kopieren'}
      className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${className ?? ''}`}
      style={baseStyle}
    >
      {copied ? (
        <>
          <CheckIcon size={10} />
          Kopiert
        </>
      ) : (
        'Kopieren'
      )}
    </button>
  )
}
