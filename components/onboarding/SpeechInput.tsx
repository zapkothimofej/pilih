'use client'

import { useState, useRef, useCallback } from 'react'

interface SpeechInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  label?: string
}

export default function SpeechInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  label,
}: SpeechInputProps) {
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
    <div className="space-y-1">
      {label && <label className="text-sm text-zinc-400">{label}</label>}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full bg-[#111] border border-[#333] hover:border-[#444] focus:border-orange-500 rounded-lg px-4 py-3 text-white placeholder-zinc-600 resize-none transition-colors outline-none pr-12 text-sm leading-relaxed"
        />
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`absolute right-3 top-3 p-1.5 rounded-md transition-all ${
            isListening
              ? 'bg-red-500/20 text-red-400 animate-pulse'
              : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
          }`}
          title={isListening ? 'Aufnahme stoppen' : 'Per Sprache eingeben'}
        >
          <MicIcon />
        </button>
      </div>
      {isListening && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Aufnahme läuft...
        </p>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}
