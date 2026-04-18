import { NextResponse } from 'next/server'

// Same-origin guard for mutating Route Handlers. Next.js 16 doesn't ship
// a CSRF token by default and SameSite=Lax cookies still permit top-level
// form POSTs across origins — so rejecting a request whose Origin header
// disagrees with Host is the minimum viable mitigation every mutating
// handler needs to wear. Browsers always set Origin on POST/PATCH/PUT/
// DELETE, so absence is itself suspicious.
export function assertSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!host) {
    return NextResponse.json({ error: 'CSRF: Host header missing' }, { status: 403 })
  }
  if (!origin) {
    return NextResponse.json({ error: 'CSRF: Origin header missing' }, { status: 403 })
  }
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return NextResponse.json({ error: 'CSRF: Origin invalid' }, { status: 403 })
  }
  if (originHost !== host) {
    return NextResponse.json({ error: 'CSRF: Origin mismatch' }, { status: 403 })
  }
  return null
}
