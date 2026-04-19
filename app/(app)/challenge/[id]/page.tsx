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

  // CRITICAL: the session id comes from a URL query param, so we
  // MUST check that the session belongs to the current user AND
  // references this challenge before reading its attempts. Without
  // the ownership check, an authenticated user who obtains any
  // sessionId (guessed CUID, leaked log, shared link) could
  // enumerate another user's prompts + LLM responses here.
  const session = await prisma.dailySession.findUnique({ where: { id: sessionId } })
  if (!session) redirect('/challenge/heute')
  if (session.userId !== user.id || session.selectedChallengeId !== id) {
    redirect('/challenge/heute')
  }

  const attempts = await prisma.promptAttempt.findMany({
    // Scope by userId as defense-in-depth — even if a future refactor
    // loosens the ownership branch above, the attempt read stays
    // user-scoped.
    where: { sessionId, userId: user.id },
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
