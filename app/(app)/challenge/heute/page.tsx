import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { selectDailyChallenges } from '@/lib/adaptive/difficulty'
import ChallengeTodayClient from './ChallengeTodayClient'

export default async function ChallengeTodayPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const completedSessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    orderBy: { dayNumber: 'asc' },
    include: { selectedChallenge: true },
  })

  const nextDay = completedSessions.length + 1
  if (nextDay > 21) redirect('/abschluss')

  // Heute bereits eine Challenge ausgewählt?
  const todaySession = await prisma.dailySession.findFirst({
    where: { userId: user.id, dayNumber: nextDay, status: { not: 'COMPLETED' } },
  })
  if (todaySession?.selectedChallengeId) {
    redirect(`/challenge/${todaySession.selectedChallengeId}`)
  }

  // Schwierigkeit bestimmen
  const lastSession = completedSessions.at(-1)
  const lastChallenge = lastSession?.selectedChallenge
  const targetDifficulty = lastChallenge?.currentDifficulty ?? 2

  const available = await prisma.challenge.findMany({
    where: { userId: user.id, status: 'UPCOMING' },
  })
  const challenges = selectDailyChallenges(available, targetDifficulty, 3)

  return (
    <ChallengeTodayClient
      day={nextDay}
      challenges={challenges}
      existingSessionId={todaySession?.id ?? null}
    />
  )
}
