import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { assertSameOrigin } from '@/lib/utils/csrf'

const bodySchema = z.object({
  challengeId: z.string().min(1),
  day: z.number().int().min(1).max(21),
  existingSessionId: z.string().min(1).nullable(),
})

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf

  const user = await getCurrentDbUser()
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }
  const { challengeId, day, existingSessionId } = body

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return NextResponse.json({ error: 'Challenge nicht gefunden' }, { status: 404 })
  if (challenge.userId !== user.id) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  if (existingSessionId) {
    const existing = await prisma.dailySession.findUnique({
      where: { id: existingSessionId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 })
    }
    if (existing.userId !== user.id || existing.dayNumber !== day) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
    }
    if (existing.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Session für diesen Tag ist bereits abgeschlossen' },
        { status: 409 }
      )
    }
    await prisma.dailySession.update({
      where: { id: existingSessionId },
      data: { selectedChallengeId: challengeId, status: 'IN_PROGRESS' },
    })
    return NextResponse.json({ sessionId: existingSessionId })
  }

  // Rely solely on the DB unique constraint — no pre-check to avoid TOCTOU race.
  let session: { id: string }
  try {
    session = await prisma.dailySession.create({
      data: {
        userId: user.id,
        dayNumber: day,
        date: new Date(),
        status: 'IN_PROGRESS',
        selectedChallengeId: challengeId,
      },
    })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Session für diesen Tag existiert bereits' },
        { status: 409 }
      )
    }
    throw err
  }

  return NextResponse.json({ sessionId: session.id })
}
