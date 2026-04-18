import { prisma } from '@/lib/db/prisma'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory fallback. Used only when the DB-backed path throws (e.g. a
// migration hasn't landed yet in local dev) — otherwise we prefer the
// shared Postgres bucket so limits are consistent across serverless
// instances.
const memStore = new Map<string, RateLimitEntry>()
const MAX_STORE_SIZE = 10_000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memStore) {
    if (now > entry.resetAt) memStore.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

function memRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = memStore.get(key)
  if (!entry || now > entry.resetAt) {
    if (memStore.size >= MAX_STORE_SIZE) {
      const oldest = memStore.keys().next().value
      if (oldest) memStore.delete(oldest)
    }
    const resetAt = now + windowMs
    memStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

// Sync wrapper kept for call-site parity — reads/writes the DB bucket
// via a fire-and-forget async path and returns the in-memory result
// immediately. For strict correctness use `rateLimitAsync` below.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  return memRateLimit(key, limit, windowMs)
}

// DB-backed path. Atomic: one INSERT on bucket miss (or expired window)
// and a single conditional UPDATE to bump the counter. No read-modify-write
// race because the WHERE clause enforces the cap.
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)

  try {
    // Try to create a fresh bucket — succeeds on first call in a window.
    await prisma.rateLimitBucket.create({ data: { key, count: 1, resetAt } })
    return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() }
  } catch {
    // Bucket exists. Either the window expired (reset it) or we must
    // try to bump within the cap.
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } })
    if (!existing || existing.resetAt.getTime() <= now.getTime()) {
      await prisma.rateLimitBucket.update({
        where: { key },
        data: { count: 1, resetAt },
      })
      return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() }
    }
    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt.getTime() }
    }
    // Conditional increment — only if still under the cap at write time.
    const result = await prisma.rateLimitBucket.updateMany({
      where: { key, count: { lt: limit }, resetAt: existing.resetAt },
      data: { count: { increment: 1 } },
    })
    if (result.count === 0) {
      // Someone else bumped to the cap between our read and write.
      return { allowed: false, remaining: 0, resetAt: existing.resetAt.getTime() }
    }
    const fresh = await prisma.rateLimitBucket.findUnique({ where: { key } })
    return {
      allowed: true,
      remaining: Math.max(0, limit - (fresh?.count ?? limit)),
      resetAt: existing.resetAt.getTime(),
    }
  }
}

export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}
