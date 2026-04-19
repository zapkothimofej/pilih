---
title: CSRF Origin Guard
type: concept
---

# CSRF Origin Guard

Next.js 16 doesn't ship a CSRF token and SameSite=Lax cookies still admit top-level form POSTs across origins. Every mutating Route Handler is CSRF-exposed from the moment Clerk lands — unless we guard.

## The helper

`lib/utils/csrf.ts::assertSameOrigin(req): NextResponse | null` — returns `null` on pass, a 403 response on fail. Call at the top of the handler:

```ts
export async function POST(req: Request) {
  const csrf = assertSameOrigin(req)
  if (csrf) return csrf
  // ... real work
}
```

Modern browsers always send `Origin` on mutating verbs. Absence is itself suspicious — we reject. Origin host must match Host.

## Covered routes

Nine mutating handlers:

- `POST /api/submission`
- `POST /api/challenges/[id]/attempt`
- `POST /api/challenges/[id]/abschliessen`
- `POST /api/challenges/generate`
- `POST /api/zertifikat/generieren`
- `POST /api/buchungen`
- `POST /api/sessions/start`
- `POST /api/onboarding/complete`
- `PATCH /api/admin/submissions`

Skipped: `/api/webhooks/clerk` (svix signature provides equivalent authenticity).

## Related

- [[security]] — the broader hardening
- [[auth-flow]] — user session context the CSRF guards protect
- [[webhook-idempotency]] — why webhooks skip this check
