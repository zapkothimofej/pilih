'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Booking, BookingType } from '@/app/generated/prisma/client'

const BOOKING_TYPES: Array<{
  type: BookingType
  title: string
  description: string
  duration: string
  icon: string
}> = [
  {
    type: 'GROUP_MEETING',
    title: 'Wöchentliches Gruppen-Meeting',
    description:
      'Tausch dich mit anderen PILIH-Teilnehmern aus, teile deine Erkenntnisse und lerne von den Erfahrungen anderer.',
    duration: '60 Minuten',
    icon: '👥',
  },
  {
    type: 'ONE_ON_ONE',
    title: '1:1 Coaching',
    description:
      'Persönliche Session mit einem Prompt-Engineering-Experten. Wir gehen gezielt auf deine Challenges und Use Cases ein.',
    duration: '45 Minuten',
    icon: '🎯',
  },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  bookings: Booking[]
}

export default function BuchungClient({ bookings: initialBookings }: Props) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings)
  const [selected, setSelected] = useState<BookingType | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const minDate = new Date()
  minDate.setMinutes(minDate.getMinutes() + 60) // at least 1h in the future
  const minDateStr = minDate.toISOString().slice(0, 16)

  async function handleBook() {
    if (!selected || !scheduledAt) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/buchungen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selected, scheduledAt: new Date(scheduledAt).toISOString() }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Buchung fehlgeschlagen')
      setLoading(false)
      return
    }

    const booking = await res.json() as Booking
    setBookings(prev => [booking, ...prev])
    setSuccess(true)
    setSelected(null)
    setScheduledAt('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Booking type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BOOKING_TYPES.map(({ type, title, description, duration, icon }) => (
          <button
            key={type}
            onClick={() => { setSelected(type); setSuccess(false) }}
            className={`text-left p-5 rounded-2xl border transition-all space-y-3 ${
              selected === type
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-[#222] bg-[#111] hover:border-[#333]'
            }`}
          >
            <div className="text-3xl">{icon}</div>
            <div>
              <div className="font-semibold text-white text-sm">{title}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{duration}</div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">{description}</p>
            {selected === type && (
              <div className="text-orange-400 text-xs font-medium">✓ Ausgewählt</div>
            )}
          </button>
        ))}
      </div>

      {/* Date picker + confirm */}
      {selected && (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">Wunschtermin wählen</div>
          <input
            type="datetime-local"
            min={minDateStr}
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 [color-scheme:dark]"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleBook}
            disabled={!scheduledAt || loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/30 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {loading ? 'Wird gebucht…' : 'Jetzt buchen'}
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
          ✓ Buchung erfolgreich! Du erhältst eine Bestätigung per E-Mail.
        </div>
      )}

      {/* Existing bookings */}
      {bookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400">Deine Buchungen</h2>
          {bookings.map(booking => {
            const info = BOOKING_TYPES.find(t => t.type === booking.type)
            const isPast = new Date(booking.scheduledAt) < new Date()
            return (
              <div
                key={booking.id}
                className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info?.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{info?.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {formatDate(booking.scheduledAt.toString())}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      booking.status === 'UPCOMING' && !isPast
                        ? 'bg-orange-500/15 text-orange-400'
                        : booking.status === 'COMPLETED' || isPast
                        ? 'bg-zinc-800 text-zinc-500'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {booking.status === 'CANCELLED'
                      ? 'Abgesagt'
                      : booking.status === 'COMPLETED' || isPast
                      ? 'Abgeschlossen'
                      : 'Bevorstehend'}
                  </span>
                  {booking.status === 'UPCOMING' && !isPast && (
                    <a
                      href={booking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:underline"
                    >
                      Beitreten →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {bookings.length === 0 && !selected && (
        <p className="text-zinc-600 text-sm text-center py-4">
          Noch keine Buchungen. Wähle oben einen Termin-Typ.
        </p>
      )}
    </div>
  )
}
