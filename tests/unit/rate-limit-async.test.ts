/**
 * DB-backed rate limit tests. The in-memory path already has coverage;
 * this file verifies the Postgres-backed fallback handshake so the
 * conditional-increment semantics stay correct if we ever swap the
 * underlying store.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Bucket = { key: string; count: number; resetAt: Date }

type PrismaMock = {
  rateLimitBucket: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
  }
}

const state: { now: number; bucket: Bucket | null } = { now: 0, bucket: null }

vi.mock('@/lib/db/prisma', () => {
  const prisma: PrismaMock = {
    rateLimitBucket: {
      create: vi.fn(async ({ data }: { data: Bucket }) => {
        if (state.bucket && state.bucket.resetAt.getTime() > state.now) {
          const err = new Error('unique') as Error & { code: string }
          err.code = 'P2002'
          throw err
        }
        state.bucket = { ...data }
        return state.bucket
      }),
      findUnique: vi.fn(async () => (state.bucket ? { ...state.bucket } : null)),
      update: vi.fn(async ({ data }: { data: Partial<Bucket> }) => {
        if (!state.bucket) throw new Error('no bucket')
        state.bucket = { ...state.bucket, ...data } as Bucket
        return state.bucket
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { count: { lt: number }; resetAt: Date }; data: { count: { increment: number } } }) => {
        if (!state.bucket) return { count: 0 }
        if (state.bucket.count >= where.count.lt) return { count: 0 }
        if (state.bucket.resetAt.getTime() !== where.resetAt.getTime()) return { count: 0 }
        state.bucket.count += data.count.increment
        return { count: 1 }
      }),
    },
  }
  return { prisma }
})

import { rateLimitAsync } from '../../lib/utils/rate-limit'

beforeEach(() => {
  state.now = Date.now()
  state.bucket = null
  vi.useFakeTimers()
  vi.setSystemTime(new Date(state.now))
})

describe('rateLimitAsync', () => {
  it('creates a bucket on first call of a window', async () => {
    const r = await rateLimitAsync('k1', 3, 60_000)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })

  it('increments within the window', async () => {
    await rateLimitAsync('k2', 3, 60_000)
    const r = await rateLimitAsync('k2', 3, 60_000)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(1)
  })

  it('blocks once the cap is hit', async () => {
    await rateLimitAsync('k3', 2, 60_000)
    await rateLimitAsync('k3', 2, 60_000)
    const r = await rateLimitAsync('k3', 2, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('resets after the window expires', async () => {
    await rateLimitAsync('k4', 1, 60_000)
    state.now += 61_000
    vi.setSystemTime(new Date(state.now))
    const r = await rateLimitAsync('k4', 1, 60_000)
    expect(r.allowed).toBe(true)
  })
})
