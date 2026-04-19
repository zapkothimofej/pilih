import { describe, it, expect } from 'vitest'
import { scrubString } from '../../lib/utils/log'

describe('scrubString', () => {
  it('redacts Anthropic keys', () => {
    expect(scrubString('key=sk-ant-abcdefghijklmnopqrstuv1234567890')).toBe('key=<anthropic-key>')
  })

  it('redacts Postgres URLs with credentials', () => {
    expect(scrubString('db=postgres://user:pw@host/db')).toBe('db=<postgres-url>')
    expect(scrubString('db=postgresql://user:pw@host/db')).toBe('db=<postgres-url>')
  })

  it('redacts email addresses', () => {
    expect(scrubString('hello test@example.com')).toBe('hello <email>')
  })

  it('redacts Clerk IDs', () => {
    expect(scrubString('user_2fA1bCdEfGhIjKlMnOpQrStUv')).toBe('<clerk-id>')
    expect(scrubString('sess_2fA1bCdEfGhIjKlMnOpQrStUv')).toBe('<clerk-id>')
  })

  it('redacts Bearer tokens', () => {
    expect(scrubString('Authorization: Bearer abcdefghijklmnopqrstuv1234567890'))
      .toContain('Bearer <token>')
  })

  it('redacts svix signatures', () => {
    expect(scrubString('v1,MEUCIQDhash+AbCdEfGhIjKlMnOpQrStUvWxYz123='))
      .toContain('v1,<sig>')
  })

  it('chains multiple patterns in one pass', () => {
    const out = scrubString(
      'sk-ant-abcdefghijklmnopqrstuv1234567890 from test@example.com user_2fA1bCdEfGhIjKlMnOpQrStUv'
    )
    expect(out).toContain('<anthropic-key>')
    expect(out).toContain('<email>')
    expect(out).toContain('<clerk-id>')
  })

  it('passes through innocuous strings', () => {
    expect(scrubString('hello world 42')).toBe('hello world 42')
  })
})
