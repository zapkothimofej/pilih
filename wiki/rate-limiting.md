---
title: Rate Limiting
type: concept
---

# Rate Limiting

Postgres-backed shared bucket so limits are consistent across Vercel serverless instances. `lib/utils/rate-limit.ts::rateLimitAsync`.

## Limits in use

- `generate:<userId>` — 3/hour (Sonnet challenge generation is expensive)
- `attempt:<userId>` — 20/hour (daily work-day budget)
- `submission:<userId>` — 5/hour (final cert review)
- `pdf:<userId>` — 2/hour (react-pdf rendering)

## Atomic write shape

Three write paths, each guarded by `resetAt` in the WHERE so concurrent writers can't both believe they reset the window:

1. **INSERT**: `prisma.rateLimitBucket.create({ key, count:1, resetAt })`. Succeeds on first call in a new window.
2. **Expired-reset**: `updateMany({ where:{ key, resetAt: existing.resetAt }, data:{ count:1, resetAt: new } })`. Two concurrent writers that both observed an expired window used to both reset and both get count=1 — effectively doubling the limit at every window boundary. The guard now ensures only one reset wins, the loser falls through and increments the winner's fresh bucket.
3. **Conditional increment**: `updateMany({ where:{ key, count:{lt:limit}, resetAt: existing.resetAt }, data:{ count:{ increment:1 } } })`. Guarantees we never exceed the cap.

The outer loop retries at most twice under contention before returning a safe `allowed: false`.

## Lazy cleanup

`sweepExpiredBuckets` runs at most every 15 minutes and deletes buckets whose `resetAt` is > 1h in the past. Fire-and-forget via `void` so the happy path isn't blocked. See [[data-integrity]] for the sweep pattern.

## Related

- [[data-integrity]] — unique constraints + cleanup
- [[webhook-idempotency]] — sibling lazy-sweep pattern
- [[stream-lifecycle]] — consumer in the attempt route
