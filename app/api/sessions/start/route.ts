import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'

export async function POST(req: Request) {
  
  

  const user = await prisma.user.findUnique({ where: { id: 'test-user-1' } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const { challengeId, day, existingSessionId } = await req.json() as {
    challengeId: string
    day: number
    existingSessionId: string | null
  }

  if (existingSessionId) {
    await prisma.dailySession.update({
      where: { id: existingSessionId },
      data: { selectedChallengeId: challengeId, status: 'IN_PROGRESS' },
    })
    return NextResponse.json({ sessionId: existingSessionId })
  }

  const session = await prisma.dailySession.create({
    data: {
      userId: user.id,
      dayNumber: day,
      date: new Date(),
      status: 'IN_PROGRESS',
      selectedChallengeId: challengeId,
    },
  })

  return NextResponse.json({ sessionId: session.id })
}
