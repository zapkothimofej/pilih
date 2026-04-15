'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  userName: string
  completedAt: string
  avgScore: number
  linkedInShareUrl: string
}

export default function CertificateCard({ userName, completedAt, avgScore, linkedInShareUrl }: Props) {
  const [lang, setLang] = useState<'de' | 'en'>('de')

  const date = new Date(completedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const content = {
    de: {
      title: 'KI-Führerschein',
      subtitle: 'Zertifikat über die erfolgreiche Absolvierung des',
      program: 'PILIH 21-Tage Prompt Engineering Programms',
      awarded: 'Ausgestellt für',
      date: 'Ausstellungsdatum',
      score: 'Durchschnittlicher Prompt-Score',
      footer: 'Yesterday Academy — Prompt it like it\'s hot 🔥',
    },
    en: {
      title: 'AI License',
      subtitle: 'Certificate of successful completion of the',
      program: 'PILIH 21-Day Prompt Engineering Program',
      awarded: 'Awarded to',
      date: 'Issue Date',
      score: 'Average Prompt Score',
      footer: 'Yesterday Academy — Prompt it like it\'s hot 🔥',
    },
  }[lang]

  return (
    <div className="space-y-4">
      {/* Lang-Toggle */}
      <div className="flex justify-center gap-2">
        {(['de', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              lang === l ? 'bg-orange-500 text-white' : 'bg-[#1a1a1a] text-zinc-400 hover:text-white'
            }`}
          >
            {l === 'de' ? '🇩🇪 Deutsch' : '🇬🇧 English'}
          </button>
        ))}
      </div>

      {/* Zertifikat */}
      <motion.div
        key={lang}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        id="certificate"
        className="relative bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-orange-500/30 rounded-2xl p-8 text-center overflow-hidden"
      >
        {/* Hintergrund-Ornament */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-4 text-8xl">🔥</div>
          <div className="absolute bottom-4 right-4 text-8xl rotate-180">🔥</div>
        </div>

        <div className="relative space-y-6">
          <div>
            <div className="text-orange-500 text-xs font-bold uppercase tracking-[0.3em] mb-2">
              Yesterday Academy
            </div>
            <div className="w-16 h-0.5 bg-orange-500/50 mx-auto" />
          </div>

          <div className="space-y-1">
            <div className="text-zinc-400 text-sm">{content.subtitle}</div>
            <div className="text-xl font-bold text-orange-400">{content.program}</div>
          </div>

          <div className="space-y-1">
            <div className="text-zinc-500 text-xs uppercase tracking-widest">{content.awarded}</div>
            <div className="text-3xl font-bold text-white">{userName}</div>
          </div>

          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{avgScore.toFixed(1)}/10</div>
              <div className="text-xs text-zinc-500 mt-0.5">{content.score}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">21/21</div>
              <div className="text-xs text-zinc-500 mt-0.5">{lang === 'de' ? 'Challenges' : 'Challenges'}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-zinc-600 text-xs">{content.date}</div>
            <div className="text-zinc-300 text-sm">{date}</div>
          </div>

          <div className="text-orange-500/60 text-xs">{content.footer}</div>
        </div>
      </motion.div>

      {/* Aktionen */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="/api/zertifikat/pdf"
          download
          className="py-3 bg-[#111] border border-[#333] hover:border-[#444] text-zinc-300 hover:text-white rounded-xl text-sm font-medium transition-colors text-center"
        >
          📄 PDF herunterladen
        </a>
        <a
          href={linkedInShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 bg-[#0077b5]/20 border border-[#0077b5]/30 hover:bg-[#0077b5]/30 text-[#0077b5] rounded-xl text-sm font-medium text-center transition-colors"
        >
          🔗 LinkedIn teilen
        </a>
      </div>
    </div>
  )
}
