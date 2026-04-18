import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// The module caches inside the envfn, so each test needs a fresh import.
async function freshEnv() {
  vi.resetModules()
  return (await import('../../lib/env')).env
}

const OLD_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...OLD_ENV }
})
afterEach(() => {
  process.env = OLD_ENV
})

describe('env()', () => {
  it('passes when all required vars are set', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db'
    process.env.ANTHROPIC_API_KEY = 'sk-ant-abc123'
    const env = await freshEnv()
    const result = env()
    expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/db')
    expect(result.ANTHROPIC_API_KEY).toBe('sk-ant-abc123')
  })

  it('throws when ANTHROPIC_API_KEY has wrong prefix', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db'
    process.env.ANTHROPIC_API_KEY = 'nope'
    const env = await freshEnv()
    expect(() => env()).toThrow(/ANTHROPIC_API_KEY/)
  })

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    process.env.ANTHROPIC_API_KEY = 'sk-ant-abc'
    const env = await freshEnv()
    expect(() => env()).toThrow(/DATABASE_URL/)
  })
})
