import Link from 'next/link'
import { TargetIcon, BotIcon, TrophyIcon, PilihMark } from '@/components/ui/icons'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{ background: 'rgba(9,9,11,0.85)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PilihMark size={18} />
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>PILIH</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="px-4 py-1.5 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Einloggen
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-85"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Jetzt starten
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 pt-20 pb-16 text-center">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border"
            style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
            KI-Führerschein Programm
          </div>

          <h1
            className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-5"
            style={{ color: 'var(--text-primary)' }}
          >
            Prompt it<br />like it&apos;s hot.
          </h1>

          <p
            className="text-lg leading-relaxed mb-10 max-w-lg mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Dein persönlicher KI-Führerschein — 21 Tage, 21 Challenges,
            individuell auf deinen Job zugeschnitten.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up"
              className="px-7 py-3 font-semibold rounded-xl text-sm transition-opacity hover:opacity-85"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Jetzt starten
            </Link>
            <Link
              href="/sign-in"
              className="px-7 py-3 font-semibold rounded-xl text-sm border transition-colors"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
            >
              Einloggen
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-5 pb-16 w-full">
        <div
          className="p-6 rounded-2xl border mb-6"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: 'var(--text-muted)' }}
          >
            Wie es funktioniert
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Profil anlegen', desc: 'Beschreibe deinen Job und dein KI-Wissenstand.' },
              { step: '02', title: 'Challenge wählen', desc: 'Jeden Tag 3 personalisierte Challenges zur Auswahl.' },
              { step: '03', title: 'KI nutzen & lernen', desc: 'Direktes Feedback auf deine Prompts durch eine zweite KI.' },
              { step: '04', title: 'Zertifikat erhalten', desc: 'Nach 21 Tagen: dein offizieller KI-Führerschein.' },
            ].map((item) => (
              <div key={item.step}>
                <div
                  className="text-2xl font-bold mb-1.5 tabular-nums"
                  style={{ color: 'var(--border-strong)' }}
                >
                  {item.step}
                </div>
                <div
                  className="font-semibold text-sm mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.title}
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <TargetIcon size={18} />,
              title: '21 Challenges',
              desc: 'Individuell auf deinen Job und Kenntnisstand zugeschnitten.',
            },
            {
              icon: <BotIcon size={18} />,
              title: 'KI-Feedback',
              desc: 'Echtzeit-Bewertung deiner Prompts durch eine zweite KI.',
            },
            {
              icon: <TrophyIcon size={18} />,
              title: 'Zertifikat',
              desc: 'Offizieller KI-Führerschein zum Download und LinkedIn-Share.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-2xl border"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
            >
              <div className="mb-3" style={{ color: 'var(--accent)' }}>{item.icon}</div>
              <div
                className="font-semibold text-sm mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.title}
              </div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-6 text-center text-xs"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        Yesterday Academy &mdash; Prompt it like it&apos;s hot
      </footer>
    </main>
  )
}
