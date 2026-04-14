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

  return <EinstellungenClient user={user} bookings={bookings} />
}
