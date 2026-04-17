'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DocumentIcon, ShareIcon } from '@/components/ui/icons'

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
      footer: 'Yesterday Academy — Prompt it like it\'s hot',
    },
    en: {
      title: 'AI License',
      subtitle: 'Certificate of successful completion of the',
      program: 'PILIH 21-Day Prompt Engineering Program',
      awarded: 'Awarded to',
      date: 'Issue Date',
      score: 'Average Prompt Score',
      footer: 'Yesterday Academy — Prompt it like it\'s hot',
    },
  }[lang]

  return (
    <div className="space-y-4">
      {/* Language toggle */}
      <div className="flex justify-center gap-2">
        {(['de', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={lang === l
              ? { background: 'var(--accent)', color: '#fff' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
            }
          >
            {l === 'de' ? 'DE' : 'EN'}
          </button>
        ))}
      </div>

      {/* Certificate */}
      <motion.div
        key={lang}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        id="certificate"
        className="relative rounded-2xl border p-8 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
          borderColor: 'var(--accent-border)',
        }}
      >
        {/* Decorative corner marks */}
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 rounded-tl" style={{ borderColor: 'var(--accent-border)' }} />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 rounded-tr" style={{ borderColor: 'var(--accent-border)' }} />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 rounded-bl" style={{ borderColor: 'var(--accent-border)' }} />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 rounded-br" style={{ borderColor: 'var(--accent-border)' }} />

        <div className="relative space-y-6">
          {/* Issuer */}
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.35em] mb-2"
              style={{ color: 'var(--accent)' }}
            >
              Yesterday Academy
            </div>
            <div className="w-12 h-px mx-auto" style={{ background: 'var(--accent-border)' }} />
          </div>

          {/* Program */}
          <div className="space-y-1">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{content.subtitle}</div>
            <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{content.program}</div>
          </div>

          {/* Recipient */}
          <div className="space-y-1">
            <div
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              {content.awarded}
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {userName}
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-10 text-center">
            <div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {avgScore.toFixed(1)}/10
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {content.score}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                21/21
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Challenges
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-0.5">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{content.date}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{date}</div>
          </div>

          {/* Footer */}
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{content.footer}</div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="/api/zertifikat/pdf"
          download
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
        >
          <DocumentIcon size={15} />
          PDF herunterladen
        </a>
        <a
          href={linkedInShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-colors"
          style={{ background: 'rgba(0,119,181,0.08)', borderColor: 'rgba(0,119,181,0.25)', color: '#0077b5' }}
        >
          <ShareIcon size={15} />
          LinkedIn teilen
        </a>
      </div>
    </div>
  )
}
