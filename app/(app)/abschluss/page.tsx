import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import AbschlussClient from './AbschlussClient'

export default async function AbschlussPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const completedCount = await prisma.dailySession.count({
    where: { userId: user.id, status: 'COMPLETED' },
  })
  if (completedCount < 21) redirect('/dashboard')

  const existing = await prisma.finalSubmission.findUnique({ where: { userId: user.id } })
  if (existing?.status === 'APPROVED') redirect('/zertifikat')

  return <AbschlussClient existingSubmission={existing} />
}
