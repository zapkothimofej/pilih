import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'

const createBookingSchema = z.object({
  type: z.enum(['GROUP_MEETING', 'ONE_ON_ONE']),
  scheduledAt: z.string().datetime(),
})

const MEETING_URLS: Record<string, string> = {
  GROUP_MEETING: 'https://meet.google.com/pilih-group-weekly',
  ONE_ON_ONE: 'https://calendly.com/yesterday-academy/1on1-coaching',
}

export async function GET() {
  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { scheduledAt: 'desc' },
  })

  return NextResponse.json(bookings)
}

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const body = await req.json() as unknown
  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  const { type, scheduledAt } = parsed.data

  // Tier gate — previously absent. BASE users could POST here and
  // book 1:1 coaching worth 500 € of tier delta even though the
  // settings copy sells it as a PREMIUM-only perk. PRO gets the
  // group meeting; PREMIUM gets 1:1 + group.
  const allowed = {
    GROUP_MEETING: ['PRO', 'PREMIUM'] as const,
    ONE_ON_ONE: ['PREMIUM'] as const,
  }
  if (!(allowed[type] as readonly string[]).includes(user.tier)) {
    return NextResponse.json(
      {
        error:
          type === 'ONE_ON_ONE'
            ? 'Persönliches 1:1-Coaching ist Teil des Premium-Plans.'
            : 'Gruppen-Meetings sind Teil der Pro- und Premium-Pläne.',
      },
      { status: 403 }
    )
  }
  // Truncate to whole minutes. The datetime-local picker emits
  // minute-granularity but a hand-crafted request with sub-second
  // precision would defeat @@unique([userId, scheduledAt, type]):
  // two honest double-clicks 80 ms apart land on different
  // scheduledAt values, no collision, two UPCOMING bookings created.
  const scheduled = new Date(
    Math.floor(new Date(scheduledAt).getTime() / 60_000) * 60_000
  )

  // Enforce a 60-minute lower and a 90-day upper bound. Without the
  // upper bound a malicious client could create bookings in 2099 that
  // clutter the UI and the admin calendar indefinitely.
  const MIN_LEAD_MS = 60 * 60_000
  const MAX_LEAD_MS = 90 * 24 * 60 * 60_000
  const offset = scheduled.getTime() - Date.now()
  if (offset < MIN_LEAD_MS) {
    return NextResponse.json(
      { error: 'Termin muss mindestens 60 Minuten in der Zukunft liegen' },
      { status: 400 }
    )
  }
  if (offset > MAX_LEAD_MS) {
    return NextResponse.json(
      { error: 'Termin muss innerhalb von 90 Tagen liegen' },
      { status: 400 }
    )
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        type,
        scheduledAt: scheduled,
        meetingUrl: MEETING_URLS[type],
        status: 'UPCOMING',
      },
    })
    return NextResponse.json(booking, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Du hast bereits eine Buchung dieser Art für diesen Zeitpunkt.' },
        { status: 409 }
      )
    }
    throw err
  }
}
