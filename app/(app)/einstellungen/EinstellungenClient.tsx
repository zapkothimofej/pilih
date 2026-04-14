'use client'

import type { User, Booking } from '@/app/generated/prisma/client'

const TIER_INFO = {
  BASE: {
    label: 'Base',
    price: '399€',
    color: 'text-zinc-300',
    features: ['21-Tage Challenge Programm', 'KI-Feedback (Judge AI)', 'Zertifikat + LinkedIn Badge'],
  },
  PRO: {
    label: 'Pro',
    price: '499€',
    color: 'text-blue-400',
    features: ['Alles aus Base', 'Wöchentliches Gruppen-Meeting', 'Expert Feedback & Best Practices'],
  },
  PREMIUM: {
    label: 'Premium',
    price: '999€',
    color: 'text-purple-400',
    features: ['Alles aus Pro', 'Wöchentliches 1on1 Coaching', 'Persönlicher Lernplan'],
  },
}

export default function EinstellungenClient({ user, bookings }: { user: User; bookings: Booking[] }) {
  const tierInfo = TIER_INFO[user.tier]

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Einstellungen</h1>

      {/* Profil */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Profil</h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white">{user.name}</div>
            <div className="text-sm text-zinc-500">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Aktueller Tier */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">Dein Paket</h2>
        <div className={`text-2xl font-bold ${tierInfo.color}`}>
          {tierInfo.label} <span className="text-lg text-zinc-500">{tierInfo.price}/Person</span>
        </div>
        <ul className="space-y-1.5">
          {tierInfo.features.map(f => (
            <li key={f} className="flex gap-2 text-sm text-zinc-300">
              <span className="text-green-400">✓</span> {f}
            </li>
          ))}
        </ul>

        {user.tier === 'BASE' && (
          <div className="pt-2 border-t border-[#222]">
            <p className="text-xs text-zinc-500 mb-2">Upgrade für wöchentliche Expert Sessions:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 text-center">
                <div className="font-bold text-blue-400">Pro</div>
                <div className="text-xs text-zinc-400">499€ · Gruppen-Meeting</div>
              </div>
              <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 text-center">
                <div className="font-bold text-purple-400">Premium</div>
                <div className="text-xs text-zinc-400">999€ · 1on1 Coaching</div>
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Kontaktiere uns für ein Upgrade: <span className="text-orange-400">hallo@yesterday.academy</span>
            </p>
          </div>
        )}
      </div>

      {/* Buchungen (Pro/Premium) */}
      {(user.tier === 'PRO' || user.tier === 'PREMIUM') && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400">Deine Meetings</h2>
            <span className="text-xs text-zinc-600">{user.tier === 'PRO' ? 'Gruppen-Meetings' : '1on1 Coaching'}</span>
          </div>

          {bookings.length === 0 ? (
            <div className="text-sm text-zinc-500">
              Noch keine Meetings gebucht.{' '}
              <a href="mailto:hallo@yesterday.academy" className="text-orange-400 hover:underline">
                Termin anfragen →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-white">{b.type === 'GROUP_MEETING' ? 'Gruppen-Meeting' : '1on1 Coaching'}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(b.scheduledAt).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === 'UPCOMING' ? 'bg-orange-500/20 text-orange-400' :
                    b.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {b.status === 'UPCOMING' ? 'Bevorstehend' : b.status === 'COMPLETED' ? 'Abgeschlossen' : 'Storniert'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
