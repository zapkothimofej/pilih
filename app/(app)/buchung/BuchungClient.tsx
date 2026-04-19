'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import type { Booking, BookingType } from '@/app/generated/prisma/client'
import { CheckIcon, ArrowRightIcon, CalendarIcon } from '@/components/ui/icons'

// The min-valid datetime-local string is "now + 60min" in LOCAL time.
// Kept outside the component so useSyncExternalStore has stable refs.
function getClientMinDateStr(): string {
  const d = new Date(Date.now() + 60 * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}
// No-op subscriber — we never refresh the min-string while the page is
// open. If the user sits on the form for an hour the server revalidates
// the 60-min lead on submit anyway.
function subscribeMin() {
  return () => {}
}

const BOOKING_TYPES: Array<{
  type: BookingType
  title: string
  description: string
  duration: string
  icon: React.ReactNode
}> = [
  {
    type: 'GROUP_MEETING',
    title: 'Wöchentliches Gruppen-Meeting',
    description:
      'Tausch dich mit anderen PILIH-Teilnehmern aus, teile deine Erkenntnisse und lerne von den Erfahrungen anderer.',
    duration: '60 Minuten',
    icon: <GroupIcon />,
  },
  {
    type: 'ONE_ON_ONE',
    title: '1:1 Coaching',
    description:
      'Persönliche Session mit einem Prompt-Engineering-Experten. Wir gehen gezielt auf deine Challenges und Use Cases ein.',
    duration: '45 Minuten',
    icon: <PersonIcon />,
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

  // datetime-local expects LOCAL time, not UTC. useSyncExternalStore
  // lets us derive the min-string from an impure source (Date.now()
  // when mounted) without tripping react-hooks/purity during render
  // OR react-hooks/set-state-in-effect when computed in an effect.
  // Returns '' on SSR so hydration matches.
  const minDateStr = useSyncExternalStore(
    subscribeMin,
    getClientMinDateStr,
    () => ''
  )

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

    // Optimistic prepend keeps the new row visible instantly while
    // the router.refresh() lands. setBookings(initialBookings) only
    // seeds on mount, so without the prepend we'd wait a full RTT to
    // see our own booking. The subsequent refresh re-seeds the list
    // from the server on the NEXT mount — acceptable drift.
    const booking = await res.json() as Booking
    setBookings(prev => [booking, ...prev])
    setSuccess(true)
    setSelected(null)
    setScheduledAt('')
    setLoading(false)
    router.refresh()
    // Clear success flag after the toast-equivalent banner duration.
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="space-y-8">
      {/* Type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BOOKING_TYPES.map(({ type, title, description, duration, icon }) => (
          <button
            key={type}
            onClick={() => { setSelected(type); setSuccess(false) }}
            className="text-left p-5 rounded-2xl border transition-all space-y-3"
            style={selected === type
              ? { background: 'var(--accent-dim)', borderColor: 'var(--accent-border)' }
              : { background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }
            }
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: selected === type ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: selected === type ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {icon}
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {title}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {duration}
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
            {selected === type && (
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                <CheckIcon size={12} /> Ausgewählt
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Date + confirm */}
      {selected && (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Wunschtermin wählen
          </div>
          <input
            type="datetime-local"
            min={minDateStr}
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="input-accent w-full rounded-xl px-4 py-2.5 text-sm [color-scheme:dark]"
          />
          {error && (
            <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>
          )}
          <button
            onClick={handleBook}
            disabled={!scheduledAt || loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Wird gebucht…' : 'Jetzt buchen'}
            {!loading && <ArrowRightIcon size={13} />}
          </button>
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 border"
          style={{ background: 'var(--success-dim)', borderColor: 'var(--success-border)', color: 'var(--success)' }}
        >
          <CheckIcon size={14} />
          Buchung erfolgreich! Du erhältst eine Bestätigung per E-Mail.
        </div>
      )}

      {/* Existing bookings */}
      {bookings.length > 0 && (
        <div className="space-y-2">
          <h2
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Deine Buchungen
          </h2>
          {bookings.map(booking => {
            const info = BOOKING_TYPES.find(t => t.type === booking.type)
            const isPast = new Date(booking.scheduledAt) < new Date()
            return (
              <div
                key={booking.id}
                className="rounded-xl border p-4 flex items-center justify-between gap-4"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    <CalendarIcon size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {info?.title}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(booking.scheduledAt.toString())}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={
                      booking.status === 'UPCOMING' && !isPast
                        ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                        : booking.status === 'COMPLETED' || isPast
                        ? { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                        : { background: 'var(--error-dim)', color: 'var(--error)' }
                    }
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
                      className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
                      style={{ color: 'var(--accent)' }}
                    >
                      Beitreten <ArrowRightIcon size={11} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {bookings.length === 0 && !selected && (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
          Noch keine Buchungen. Wähle oben einen Termin-Typ.
        </p>
      )}
    </div>
  )
}

function GroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <circle cx="11.5" cy="5.5" r="2" />
      <path d="M14.5 13.5c0-2-1.3-3.5-3-3.5" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" />
    </svg>
  )
}
