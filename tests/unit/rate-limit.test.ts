import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit } from '../../lib/utils/rate-limit'

beforeEach(() => {
  vi.useFakeTimers()
})

describe('rateLimit', () => {
  it('allows first request', () => {
    const result = rateLimit('test-key-1', 3, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('tracks remaining count correctly', () => {
    rateLimit('test-key-2', 5, 60_000)
    rateLimit('test-key-2', 5, 60_000)
    const result = rateLimit('test-key-2', 5, 60_000)
    expect(result.remaining).toBe(2)
  })

  it('blocks when limit is reached', () => {
    rateLimit('test-key-3', 2, 60_000)
    rateLimit('test-key-3', 2, 60_000)
    const result = rateLimit('test-key-3', 2, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    rateLimit('test-key-4', 1, 60_000)
    const blocked = rateLimit('test-key-4', 1, 60_000)
    expect(blocked.allowed).toBe(false)

    vi.advanceTimersByTime(60_001)

    const after = rateLimit('test-key-4', 1, 60_000)
    expect(after.allowed).toBe(true)
  })

  it('isolates different keys', () => {
    rateLimit('key-a', 1, 60_000)
    rateLimit('key-a', 1, 60_000) // blocked

    const result = rateLimit('key-b', 1, 60_000)
    expect(result.allowed).toBe(true)
  })
})
