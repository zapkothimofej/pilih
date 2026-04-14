import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import ChallengePageClient from './ChallengePageClient'

export default async function ChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const { id } = await params
  const { session: sessionId } = await searchParams

  const challenge = await prisma.challenge.findUnique({ where: { id } })
  if (!challenge || challenge.userId !== user.id) redirect('/challenge/heute')

  if (!sessionId) redirect('/challenge/heute')

  const session = await prisma.dailySession.findUnique({ where: { id: sessionId } })
  if (!session) redirect('/challenge/heute')

  const attempts = await prisma.promptAttempt.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <ChallengePageClient
      challenge={challenge}
      sessionId={sessionId}
      dayNumber={session.dayNumber}
      previousAttempts={attempts.map((a) => ({
        userPrompt: a.userPrompt,
        llmResponse: a.llmResponse,
      }))}
    />
  )
}
