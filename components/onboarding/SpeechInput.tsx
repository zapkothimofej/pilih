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
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  type SpeechRecognitionCtor = new () => SpeechRecognition
  const getSR = (): SpeechRecognitionCtor | undefined =>
    (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor })
      .webkitSpeechRecognition

  const isSpeechSupported = typeof window !== 'undefined' && !!getSR()

  const startListening = useCallback(() => {
    const SR = getSR()
    if (!SR) return

    setSpeechError(null)
    const recognition = new SR()
    recognition.lang = 'de-DE'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .filter((r) => r.isFinal)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join(' ')
      if (transcript) onChange(value ? `${value} ${transcript}` : transcript)
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setSpeechError('Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.')
      } else if (event.error === 'no-speech') {
        setSpeechError('Keine Sprache erkannt. Bitte erneut versuchen.')
      } else {
        setSpeechError('Spracheingabe fehlgeschlagen.')
      }
    }

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
        {isSpeechSupported ? (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className="absolute right-3 top-3 p-1.5 rounded-lg transition-all"
            title={isListening ? 'Aufnahme stoppen' : 'Per Sprache eingeben'}
            aria-label={isListening ? 'Sprachaufnahme stoppen' : 'Per Sprache eingeben'}
            style={isListening
              ? { background: 'rgba(248,113,113,0.12)', color: 'var(--error)' }
              : { background: 'var(--bg-overlay)', color: 'var(--text-muted)' }
            }
          >
            <MicIcon size={14} />
          </button>
        ) : (
          <div
            className="absolute right-3 top-3 p-1.5 rounded-lg opacity-30"
            title="Spracheingabe nicht verfügbar"
            aria-hidden="true"
            style={{ color: 'var(--text-muted)' }}
          >
            <MicIcon size={14} />
          </div>
        )}
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
      {!isSpeechSupported && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Spracheingabe wird von diesem Browser nicht unterstützt.
        </p>
      )}
      {speechError && (
        <p className="text-[11px]" style={{ color: 'var(--error)' }}>
          {speechError}
        </p>
      )}
    </div>
  )
}
