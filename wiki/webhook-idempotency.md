---
title: Webhook Idempotency
type: concept
---

# Webhook Idempotency

`app/api/webhooks/clerk/route.ts` — the one route that bypasses both proxy fail-closed and CSRF.

## Defence layers

1. **Body size limit** — reject payloads >64KB before reading `req.text()`. Prevents a drive-by POSTer from allocating 100MB.
2. **Timestamp skew check (asymmetric)** — rejects if the svix-timestamp is >5min in the future (injection/clock-skew) or >72h in the past (matches svix's retry window). Previous symmetric check false-rejected legit 6-min past retries.
3. **svix signature verification** — `wh.verify(body, headers)` — cryptographic authentication.
4. **Idempotency via ProcessedWebhook** — the `svixId` is inserted inside a `$transaction` wrapping the handler logic. A duplicate webhook hits P2002 on the unique constraint, handler returns 200 without re-running the user upsert.
5. **Lazy cleanup** — `ProcessedWebhook` rows >30d old purged at most every 6h (svix retries for 72h, so 30d is comfortable margin).

## On `ALREADY_APPROVED`-style flows

The webhook uses domain-specific error handling (P2002 → 200 OK) rather than string comparison. See [[data-integrity]] for other DB-level guards.

## Related

- [[auth-flow]] — Clerk integration path
- [[data-integrity]] — unique constraints + sweep pattern
- [[security]] — env validation for `CLERK_WEBHOOK_SECRET`
