import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import EinstellungenClient from './EinstellungenClient'

export default async function EinstellungenPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { scheduledAt: 'desc' },
  })

  // Narrow RSC prop: client only reads name/email/tier. The full
  // Prisma User row (incl. clerkId — external-system identity) used
  // to serialise across the RSC boundary into the DOM payload. Now
  // sent as a minimal projection.
  return (
    <EinstellungenClient
      user={{ name: user.name, email: user.email, tier: user.tier }}
      bookings={bookings}
    />
  )
}
