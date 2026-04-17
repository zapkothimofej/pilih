'use client'

import { useState, useRef, useCallback } from 'react'
import { MicIcon } from '@/components/ui/icons'

interface SpeechInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  label?: string
}

export default function SpeechInput({ value, onChange, placeholder, rows = 3, label }: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startListening = useCallback(() => {
    type SpeechRecognitionCtor = new () => SpeechRecognition
    const SR: SpeechRecognitionCtor | undefined =
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition

    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'de-DE'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join(' ')
      onChange(value ? `${value} ${transcript}` : transcript)
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [value, onChange])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors pr-12 leading-relaxed"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-border)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
        />
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className="absolute right-3 top-3 p-1.5 rounded-lg transition-all"
          title={isListening ? 'Aufnahme stoppen' : 'Per Sprache eingeben'}
          style={isListening
            ? { background: 'rgba(248,113,113,0.12)', color: 'var(--error)' }
            : { background: 'var(--bg-overlay)', color: 'var(--text-muted)' }
          }
        >
          <MicIcon size={14} />
        </button>
      </div>
      {isListening && (
        <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--error)' }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--error)' }}
          />
          Aufnahme läuft…
        </p>
      )}
    </div>
  )
}
