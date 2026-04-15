import { prisma } from '@/lib/db/prisma'
import type { Role } from '@/app/generated/prisma/client'

// TESTING MODE — fester Test-User, kein Clerk
const TEST_USER_ID = 'test-user-1'

export async function getCurrentDbUser() {
  return prisma.user.findUnique({ where: { id: TEST_USER_ID } })
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentDbUser()
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error('Nicht autorisiert')
  }
  return user
}

export async function syncClerkUser() {
  return getCurrentDbUser()
}
