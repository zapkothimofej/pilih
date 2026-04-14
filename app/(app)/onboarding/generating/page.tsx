import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import GeneratingScreen from '@/components/onboarding/GeneratingScreen'

export default async function GeneratingPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const profile = await prisma.onboardingProfile.findUnique({
    where: { userId: user.id },
  })
  if (!profile?.completedAt) redirect('/onboarding')

  return <GeneratingScreen />
}
