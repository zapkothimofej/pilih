import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const createBookingSchema = z.object({
  type: z.enum(['GROUP_MEETING', 'ONE_ON_ONE']),
  scheduledAt: z.string().datetime(),
})

const MEETING_URLS: Record<string, string> = {
  GROUP_MEETING: 'https://meet.google.com/pilih-group-weekly',
  ONE_ON_ONE: 'https://calendly.com/yesterday-academy/1on1-coaching',
}

export async function GET() {
  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { scheduledAt: 'desc' },
  })

  return NextResponse.json(bookings)
}

export async function POST(req: Request) {
  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const body = await req.json() as unknown
  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }

  const { type, scheduledAt } = parsed.data
  const scheduled = new Date(scheduledAt)

  if (scheduled < new Date()) {
    return NextResponse.json({ error: 'Datum muss in der Zukunft liegen' }, { status: 400 })
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
