import { describe, it, expect } from 'vitest'
import { assertSameOrigin } from '../../lib/utils/csrf'

function makeReq(headers: Record<string, string | undefined>): Request {
  return new Request('https://pilih.yesterday.academy/api/x', {
    method: 'POST',
    headers: Object.fromEntries(
      Object.entries(headers).filter((e): e is [string, string] => typeof e[1] === 'string')
    ),
  })
}

describe('assertSameOrigin', () => {
  it('returns null when Origin host matches Host', () => {
    const res = assertSameOrigin(
      makeReq({ host: 'pilih.yesterday.academy', origin: 'https://pilih.yesterday.academy' })
    )
    expect(res).toBeNull()
  })

  it('rejects missing Host header', () => {
    const res = assertSameOrigin(makeReq({ origin: 'https://pilih.yesterday.academy' }))
    expect(res?.status).toBe(403)
  })

  it('rejects missing Origin header', () => {
    const res = assertSameOrigin(makeReq({ host: 'pilih.yesterday.academy' }))
    expect(res?.status).toBe(403)
  })

  it('rejects malformed Origin URL', () => {
    const res = assertSameOrigin(
      makeReq({ host: 'pilih.yesterday.academy', origin: 'not-a-url' })
    )
    expect(res?.status).toBe(403)
  })

  it('rejects cross-origin Origin', () => {
    const res = assertSameOrigin(
      makeReq({ host: 'pilih.yesterday.academy', origin: 'https://evil.example' })
    )
    expect(res?.status).toBe(403)
  })

  it('allows http-to-https same-host (port-less)', () => {
    // Origin hosts compare by hostname, not scheme.
    const res = assertSameOrigin(
      makeReq({ host: 'pilih.yesterday.academy', origin: 'http://pilih.yesterday.academy' })
    )
    expect(res).toBeNull()
  })
})
