import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import BuchungClient from './BuchungClient'

export default async function BuchungPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { scheduledAt: 'desc' },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Coaching & Meetings</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Buche ein Gruppen-Meeting oder ein persönliches 1:1-Coaching
        </p>
      </div>

      <BuchungClient bookings={bookings} />
    </div>
  )
}
