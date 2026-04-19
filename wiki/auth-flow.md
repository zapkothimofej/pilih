---
title: Auth Flow (Testing Mode)
type: concept
---

# Auth Flow

PILIH ships with Clerk in `package.json` but **not wired**. `lib/utils/auth.ts` returns a hardcoded `test-user-1` row from Prisma. Multiple guards prevent that from leaking to production.

## Fail-closed guards

1. **`proxy.ts`** (Next 16 rename from middleware.ts) returns 503 at the edge when `NODE_ENV === 'production' && NEXT_PHASE !== 'phase-production-build' && ALLOW_TESTING_AUTH !== 'true'`. Deploy-to-prod without integrating Clerk shows a blank 503 instead of silently serving `test-user-1` data.

2. **`lib/utils/auth.ts::assertNotProduction`** — thrown at runtime from `getCurrentDbUser` if the same condition holds. RSC pages crash, `app/(app)/error.tsx` boundary renders.

3. **`lib/env.ts` superRefine** — `CLERK_WEBHOOK_SECRET` required in prod unless `ALLOW_TESTING_AUTH=true` is explicitly set. Env validation fails at boot via `instrumentation.ts`.

## React cache() dedup

`getCurrentDbUser` is wrapped in `cache()` from react. A single `/dashboard` render used to call it 4 times (layout + page + nested components); cache() folds that into one Prisma round-trip per RSC render tree.

## When Clerk lands

The integration points are already marked:
- `proxy.ts` → replace with `clerkMiddleware()` + drop the fail-closed branch.
- `lib/utils/auth.ts::syncClerkUser` → swap the stub for `prisma.user.upsert({ where: { clerkId }, update: {}, create: {...} })`.
- `app/(auth)/sign-in/.../page.tsx` → swap redirect-stub for `<SignIn />` from `@clerk/nextjs`.
- `app/api/webhooks/clerk/route.ts` → already verifies svix signatures + timestamp skew + idempotency.

## Role checks

`requireRole(['COMPANY_ADMIN','SUPER_ADMIN'])` is the enum-safe authorization check. Every admin route uses it; a future role addition gets a compile-time warning instead of slipping past a string array.

## Related

- [[security]] — env validation + CSP
- [[webhook-idempotency]] — Clerk webhook path
- [[next16-proxy]] — proxy runtime
- [[data-integrity]] — User cascade delete semantics
