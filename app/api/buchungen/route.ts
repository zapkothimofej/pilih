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
  const scheduled = new Date(scheduledAt)

  // Enforce the same 60-minute buffer as the client. UTC vs local time is irrelevant here
  // because getTime() is absolute milliseconds since epoch.
  const MIN_LEAD_MS = 60 * 60_000
  if (scheduled.getTime() < Date.now() + MIN_LEAD_MS) {
    return NextResponse.json(
      { error: 'Termin muss mindestens 60 Minuten in der Zukunft liegen' },
      { status: 400 }
    )
  }

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
}
