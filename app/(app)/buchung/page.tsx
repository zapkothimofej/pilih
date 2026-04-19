import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import BuchungClient from './BuchungClient'

export default async function BuchungPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')
  // Server-side tier gate — BASE users used to land on this page
  // with a working booking form even though the settings copy sells
  // it as a Pro/Premium perk. Redirect them to einstellungen where
  // the upgrade CTA lives.
  if (user.tier === 'BASE') redirect('/einstellungen')

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { scheduledAt: 'desc' },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Coaching &amp; Meetings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Buche ein Gruppen-Meeting oder ein persönliches 1:1-Coaching.
        </p>
      </div>

      <BuchungClient bookings={bookings} />
    </div>
  )
}
