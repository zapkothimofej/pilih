import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Hoisted to module scope so we don't re-read process.env on every
// request. The proxy runtime in Next 16 is nodejs, so these values
// are evaluated once on cold start.
const FAIL_CLOSED =
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.ALLOW_TESTING_AUTH !== 'true'

// TESTING MODE — Clerk deaktiviert. Pass-through für alle Routen.
// Hard-fail in production so a deploy-flip doesn't silently ship the
// test-user-1 fallback to real traffic. Replace both branches with
// clerkMiddleware() from @clerk/nextjs/server when integrating.
//
// File is `proxy.ts` (Next.js 16) — the old `middleware.ts` name is
// deprecated. Runs on the `nodejs` runtime, so imports from `@/lib/*`
// are allowed without Edge-runtime caveats.
export function proxy(_req: NextRequest): NextResponse {
  if (FAIL_CLOSED) {
    return new NextResponse(
      'Testing-Mode-Proxy in Produktion aktiv. Deployment abgebrochen.',
      { status: 503 }
    )
  }
  return NextResponse.next()
}

export const config = {
  // `/api/webhooks/*` is excluded so Clerk/Svix signed POSTs still reach
  // their handlers even while the testing-mode fail-closed guard is
  // active — those endpoints authenticate via svix signatures, not
  // session cookies.
  matcher: ['/((?!_next|api/webhooks|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
}
