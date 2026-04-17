import { prisma } from '@/lib/db/prisma'
import type { Role } from '@/app/generated/prisma/client'

// TESTING MODE — fester Test-User, kein Clerk
// TODO: Echte Clerk-Auth integrieren vor Production-Deploy (clerkMiddleware + auth() from @clerk/nextjs/server)
const TEST_USER_ID = 'test-user-1'

function assertNotProduction(): void {
  // NEXT_PHASE === 'phase-production-build' during `next build` prerendering — skip there.
  // At actual production runtime (next start) NEXT_PHASE is undefined → throw to prevent usage.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    throw new Error(
      '[auth] Testing-Mode ist in Produktion aktiv! ' +
      'Echte Clerk-Auth integrieren und TEST_USER_ID entfernen bevor Deployment.'
    )
  }
}

export async function getCurrentDbUser() {
  assertNotProduction()
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
