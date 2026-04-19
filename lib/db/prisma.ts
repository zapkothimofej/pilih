import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  // On Vercel serverless each cold start opens its own pg pool. The
  // driver-adapter default (pg.Pool max: 10) can exhaust a Neon
  // free-tier pool (~20 connections) at 3 concurrent cold invocations
  // that each grow to 10. Cap at max: 1 on serverless — drivers still
  // queue requests so correctness is preserved, we just don't hoard.
  const isServerless = Boolean(process.env.VERCEL)
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    ...(isServerless ? { max: 1 } : {}),
  })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
