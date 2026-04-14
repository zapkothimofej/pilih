import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { getNextDifficulty } from '@/lib/adaptive/difficulty'
import type { DifficultyRating } from '@/app/generated/prisma/client'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { id: challengeId } = await params
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })

  const { sessionId, difficultyRating } = await req.json() as {
    sessionId: string
    difficultyRating: DifficultyRating
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return NextResponse.json({ error: 'Challenge nicht gefunden' }, { status: 404 })

  // Session abschließen
  await prisma.dailySession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      difficultyRating,
      completedAt: new Date(),
    },
  })

  // Challenge als abgeschlossen markieren
  await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: 'COMPLETED' },
  })

  // Nächste Schwierigkeit berechnen + auf alle verbleibenden Challenges anwenden
  const nextDifficulty = getNextDifficulty(challenge.currentDifficulty, difficultyRating)
  await prisma.challenge.updateMany({
    where: { userId: user.id, status: 'UPCOMING' },
    data: { currentDifficulty: nextDifficulty },
  })

  // XP berechnen (Basis: 100, Bonus für höhere Schwierigkeit)
  const xp = 100 + (challenge.currentDifficulty - 1) * 20

  return NextResponse.json({ success: true, xp, nextDifficulty })
}
