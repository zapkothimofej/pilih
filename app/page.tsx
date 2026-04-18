import Link from 'next/link'
import { PilihMark } from '@/components/ui/icons'
import LandingHero from '@/components/landing/LandingHero'
import LandingSteps from '@/components/landing/LandingSteps'

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
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
              PILIH
            </span>
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

      <LandingHero />
      <LandingSteps />

      <footer
        className="border-t py-6 text-center text-xs"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        Yesterday Academy &mdash; Prompt it like it&apos;s hot
      </footer>
    </main>
  )
}
