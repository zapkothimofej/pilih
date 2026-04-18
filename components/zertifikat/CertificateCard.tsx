'use client'

import { useState, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { DocumentIcon, ShareIcon } from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

interface Props {
  userName: string
  completedAt: string
  avgScore: number
  linkedInShareUrl: string
}

export default function CertificateCard({ userName, completedAt, avgScore, linkedInShareUrl }: Props) {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  const cardRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const date = new Date(completedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  useGSAP(
    () => {
      const el = cardRef.current
      if (!el) return

      if (reduced) {
        gsap.set(el.querySelectorAll('.cert-stagger'), { opacity: 1, y: 0 })
        return
      }

      // Cinematic entrance — corner marks draw in, content elements
      // stagger up like a reveal on a physical certificate.
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(el, { opacity: 0, scale: 0.9, y: 20, duration: 0.7 })
        .from(
          el.querySelectorAll('.cert-corner'),
          { opacity: 0, scale: 0.4, duration: 0.5, stagger: 0.08, ease: 'back.out(2)' },
          '-=0.4'
        )
        .from(
          el.querySelectorAll('.cert-stagger'),
          { opacity: 0, y: 14, duration: 0.5, stagger: 0.08 },
          '-=0.3'
        )

      // Slow radial gradient pulse behind the content — keeps the
      // certificate feeling "live" without distracting.
      gsap.to('.cert-glow', {
        opacity: 0.45,
        scale: 1.05,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    },
    { scope: cardRef, dependencies: [lang, reduced] }
  )

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
            aria-label={l === 'de' ? 'Auf Deutsch anzeigen' : 'Show in English'}
            aria-pressed={lang === l}
          >
            {l === 'de' ? 'DE' : 'EN'}
          </button>
        ))}
      </div>

      {/* Certificate */}
      <div
        ref={cardRef}
        id="certificate"
        className="relative rounded-2xl border p-8 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
          borderColor: 'var(--accent-border)',
        }}
      >
        <div
          className="cert-glow pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(129,140,248,0.25) 0%, transparent 65%)',
            opacity: 0.2,
          }}
          aria-hidden="true"
        />

        {/* Decorative corner marks */}
        <div className="cert-corner absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 rounded-tl" style={{ borderColor: 'var(--accent-border)' }} />
        <div className="cert-corner absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 rounded-tr" style={{ borderColor: 'var(--accent-border)' }} />
        <div className="cert-corner absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 rounded-bl" style={{ borderColor: 'var(--accent-border)' }} />
        <div className="cert-corner absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 rounded-br" style={{ borderColor: 'var(--accent-border)' }} />

        <div className="relative space-y-6">
          {/* Issuer */}
          <div className="cert-stagger">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.35em] mb-2"
              style={{ color: 'var(--accent)' }}
            >
              Yesterday Academy
            </div>
            <div className="w-12 h-px mx-auto" style={{ background: 'var(--accent-border)' }} />
          </div>

          {/* Program */}
          <div className="cert-stagger space-y-1">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{content.subtitle}</div>
            <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{content.program}</div>
          </div>

          {/* Recipient */}
          <div className="cert-stagger space-y-1">
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
          <div className="cert-stagger flex justify-center gap-10 text-center">
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
          <div className="cert-stagger space-y-0.5">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{content.date}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{date}</div>
          </div>

          {/* Footer */}
          <div className="cert-stagger text-[10px]" style={{ color: 'var(--text-muted)' }}>{content.footer}</div>
        </div>
      </div>

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
