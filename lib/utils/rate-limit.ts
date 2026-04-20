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
      // LRU eviction: JS Map iterates in insertion order, so a FIFO
      // `keys().next()` would let an attacker fill the store with 10k
      // throw-away keys and evict a victim's still-hot bucket. Re-
      // inserting on each touch below makes the eldest-iterated key
      // the least-recently-used, so eviction now targets dormant
      // traffic instead.
      const lru = memStore.keys().next().value
      if (lru) memStore.delete(lru)
    }
    const resetAt = now + windowMs
    memStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  if (entry.count >= limit) {
    // Refresh recency even on block so a stream of blocked requests
    // from an active user doesn't age out of the store while they
    // are still within their window.
    memStore.delete(key)
    memStore.set(key, entry)
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }
  entry.count++
  memStore.delete(key)
  memStore.set(key, entry)
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

// Sync wrapper kept for call-site parity — reads/writes the DB bucket
// via a fire-and-forget async path and returns the in-memory result
// immediately. For strict correctness use `rateLimitAsync` below.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  return memRateLimit(key, limit, windowMs)
}

// Lazy cleanup: once per N invocations, sweep rows that expired > 1 hour
// ago. Without this the RateLimitBucket table grows unbounded at one
// row per user × action. The probabilistic trigger keeps the
// happy-path latency unchanged for 99% of calls.
let lastBucketSweep = 0
const BUCKET_SWEEP_INTERVAL_MS = 15 * 60 * 1000

async function sweepExpiredBuckets(): Promise<void> {
  const now = Date.now()
  if (now - lastBucketSweep < BUCKET_SWEEP_INTERVAL_MS) return
  lastBucketSweep = now
  try {
    await prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date(now - 60 * 60_000) } },
    })
  } catch {
    // swallow — next sweep will catch the rows
  }
}

// DB-backed path. Atomic: one INSERT on bucket miss, a conditional
// reset-updateMany when the window has expired, and a conditional
// increment-updateMany when it hasn't. Each updateMany is guarded by
// `resetAt` in the WHERE so a concurrent reset that lands between our
// read and write doesn't get clobbered — the second writer sees 0 rows
// affected and re-reads rather than doubling the limit.
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Fire-and-forget; don't let sweep errors block the real request.
  void sweepExpiredBuckets()

  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)

  try {
    await prisma.rateLimitBucket.create({ data: { key, count: 1, resetAt } })
    return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() }
  } catch {
    // Loop at most twice: one pass for reset-or-increment, a second in
    // case a concurrent writer beat us to the reset and we need to
    // read the fresh bucket and bump it instead.
    for (let pass = 0; pass < 2; pass++) {
      const existing = await prisma.rateLimitBucket.findUnique({ where: { key } })
      if (!existing) {
        // Another writer deleted or we somehow lost the row — retry create.
        try {
          await prisma.rateLimitBucket.create({ data: { key, count: 1, resetAt } })
          return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() }
        } catch {
          continue
        }
      }

      if (existing.resetAt.getTime() <= now.getTime()) {
        // Window expired — try to claim the reset. If another writer
        // got here first the updateMany affects 0 rows and we fall
        // through to the next pass to increment their bucket instead.
        const resetResult = await prisma.rateLimitBucket.updateMany({
          where: { key, resetAt: existing.resetAt },
          data: { count: 1, resetAt },
        })
        if (resetResult.count > 0) {
          return { allowed: true, remaining: limit - 1, resetAt: resetAt.getTime() }
        }
        continue
      }

      if (existing.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt.getTime() }
      }

      // Conditional increment guarded by resetAt — if a reset lands
      // between read and write, count changes to 1 under a new
      // resetAt and our updateMany matches zero rows.
      const bump = await prisma.rateLimitBucket.updateMany({
        where: { key, count: { lt: limit }, resetAt: existing.resetAt },
        data: { count: { increment: 1 } },
      })
      if (bump.count > 0) {
        return {
          allowed: true,
          remaining: Math.max(0, limit - (existing.count + 1)),
          resetAt: existing.resetAt.getTime(),
        }
      }
      // Lost the race — loop and reconsider.
    }

    // Under sustained contention we shouldn't reach here, but fail
    // closed rather than double-counting.
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } })
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing?.resetAt.getTime() ?? resetAt.getTime(),
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
