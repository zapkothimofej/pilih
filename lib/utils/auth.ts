import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import type { Role } from '@/app/generated/prisma/client'

export async function getCurrentDbUser() {
  const { userId } = await auth()
  if (!userId) return null

  return prisma.user.findUnique({ where: { clerkId: userId } })
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentDbUser()
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error('Nicht autorisiert')
  }
  return user
}

export async function syncClerkUser() {
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim()

  return prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: { email, name },
    create: { clerkId: clerkUser.id, email, name },
  })
}
