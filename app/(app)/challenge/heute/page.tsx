import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { selectDailyChallenges } from '@/lib/adaptive/difficulty'
import ChallengeTodayClient from './ChallengeTodayClient'

export default async function ChallengeTodayPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  // Only the most recent completed session is needed here — previously
  // this page materialised every completed session plus its challenge
  // just to read the last element.
  const lastCompleted = await prisma.dailySession.findFirst({
    where: { userId: user.id, status: 'COMPLETED' },
    include: { selectedChallenge: { select: { currentDifficulty: true } } },
    orderBy: { dayNumber: 'desc' },
  })

  const nextDay = (lastCompleted?.dayNumber ?? 0) + 1
  if (nextDay > 21) redirect('/abschluss')

  // Heute bereits eine Challenge ausgewählt?
  const todaySession = await prisma.dailySession.findFirst({
    where: { userId: user.id, dayNumber: nextDay, status: { not: 'COMPLETED' } },
  })
  if (todaySession?.selectedChallengeId) {
    redirect(`/challenge/${todaySession.selectedChallengeId}?session=${todaySession.id}`)
  }

  const targetDifficulty = lastCompleted?.selectedChallenge?.currentDifficulty ?? 2

  const available = await prisma.challenge.findMany({
    where: { userId: user.id, status: 'UPCOMING' },
  })

  const poolEmpty = available.length === 0
  const requested = Math.min(3, available.length)
  const seed = `${user.id}:${new Date().toISOString().slice(0, 10)}`
  const challenges = poolEmpty ? [] : selectDailyChallenges(available, targetDifficulty, requested, seed)

  return (
    <ChallengeTodayClient
      day={nextDay}
      challenges={challenges}
      existingSessionId={todaySession?.id ?? null}
      poolEmpty={poolEmpty}
      poolSize={available.length}
    />
  )
}
