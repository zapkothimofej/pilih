'use client'

import type { User, Booking } from '@/app/generated/prisma/client'
import { CheckIcon } from '@/components/ui/icons'

const TIER_INFO = {
  BASE: {
    label: 'Base',
    price: '399 €',
    features: ['21-Tage Challenge Programm', 'KI-Feedback (Judge AI)', 'Zertifikat + LinkedIn Badge'],
  },
  PRO: {
    label: 'Pro',
    price: '499 €',
    features: ['Alles aus Base', 'Wöchentliches Gruppen-Meeting', 'Expert Feedback & Best Practices'],
  },
  PREMIUM: {
    label: 'Premium',
    price: '999 €',
    features: ['Alles aus Pro', 'Wöchentliches 1on1 Coaching', 'Persönlicher Lernplan'],
  },
}

export default function EinstellungenClient({ user, bookings }: { user: User; bookings: Booking[] }) {
  const tierInfo = TIER_INFO[user.tier]

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Einstellungen
      </h1>

      {/* Profile */}
      <section
        className="rounded-2xl border p-5 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          Profil
        </h2>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl border flex items-center justify-center text-base font-bold"
            style={{
              background: 'var(--accent-dim)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent)',
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {user.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user.email}
            </div>
          </div>
        </div>
      </section>

      {/* Package */}
      <section
        className="rounded-2xl border p-5 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          Dein Paket
        </h2>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {tierInfo.label}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {tierInfo.price} / Person
          </span>
        </div>

        <ul className="space-y-2">
          {tierInfo.features.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--success)' }}>
                <CheckIcon size={13} />
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
            </li>
          ))}
        </ul>

        {user.tier === 'BASE' && (
          <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Upgrade für wöchentliche Expert Sessions:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-3 rounded-xl border text-center"
                style={{ background: 'rgba(99,179,237,0.06)', borderColor: 'rgba(99,179,237,0.2)' }}
              >
                <div className="font-bold text-sm" style={{ color: '#63b3ed' }}>Pro</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>499 € · Gruppen</div>
              </div>
              <div
                className="p-3 rounded-xl border text-center"
                style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent-border)' }}
              >
                <div className="font-bold text-sm" style={{ color: 'var(--accent)' }}>Premium</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>999 € · 1on1</div>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Upgrade anfragen:{' '}
              <a
                href="mailto:hallo@yesterday.academy"
                className="underline"
                style={{ color: 'var(--accent)' }}
              >
                hallo@yesterday.academy
              </a>
            </p>
          </div>
        )}
      </section>

      {/* Bookings (Pro / Premium) */}
      {(user.tier === 'PRO' || user.tier === 'PREMIUM') && (
        <section
          className="rounded-2xl border p-5 space-y-3"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}
            >
              Deine Meetings
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {user.tier === 'PRO' ? 'Gruppen-Meetings' : '1on1 Coaching'}
            </span>
          </div>

          {bookings.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Noch keine Meetings.{' '}
              <a
                href="mailto:hallo@yesterday.academy"
                className="underline"
                style={{ color: 'var(--accent)' }}
              >
                Termin anfragen
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between text-sm py-1.5"
                >
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {b.type === 'GROUP_MEETING' ? 'Gruppen-Meeting' : '1on1 Coaching'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(b.scheduledAt).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={
                      b.status === 'UPCOMING'
                        ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                        : b.status === 'COMPLETED'
                        ? { background: 'var(--success-dim)', color: 'var(--success)' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                    }
                  >
                    {b.status === 'UPCOMING'
                      ? 'Bevorstehend'
                      : b.status === 'COMPLETED'
                      ? 'Abgeschlossen'
                      : 'Storniert'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
