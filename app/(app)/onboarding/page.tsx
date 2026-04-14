import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const profile = await prisma.onboardingProfile.findUnique({
    where: { userId: user.id },
  })
  if (profile?.completedAt) redirect('/dashboard')

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white">
          Willkommen bei <span className="text-orange-500">PILIH</span> 🔥
        </h1>
        <p className="text-zinc-400 mt-2">
          Wir brauchen ein paar Infos, um deine Challenges zu personalisieren
        </p>
      </div>
      <OnboardingWizard />
    </div>
  )
}
