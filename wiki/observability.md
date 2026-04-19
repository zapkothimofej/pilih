---
title: Observability & Cost Surface
type: concept
---

# Observability

Round 4 focus. Rounds 1–3 made PILIH *correct*; round 4 is about making it *visible* once it runs unattended. Everything below is the operational blind spot at the state-of-Apr-2026.

## Current state

- **Logging:** `lib/utils/log.ts::logError(tag, ...args)` → `console.error`. Free-form varargs, scrubbed for PII/keys. No structured JSON, no request/user/session correlation fields, no severity levels.
- **Error surface:** Sonner toast on the client (server-only visibility into what the user actually sees). No client-side error → server endpoint. No Sentry/Datadog/Vercel-monitoring hook. `app/global-error.tsx` logs to the **browser** console only.
- **Cost surface:** 4 Anthropic callsites (`judge-ai.ts:154`, `submission/route.ts:167`, `challenge-ai.ts:153`, `challenge-ai.ts:269`). None read `message.usage.*` — see [[prompt-caching]]. Impossible to detect a cost regression from a prompt edit or a switch of model variant.
- **DB:** Prisma client in `lib/db/prisma.ts` runs without `log: ['query','warn','error']` or `$on('query')`. A cold-start slow query hangs an RSC page silently.
- **Admin audit:** `adminOverride` JSON is appended to `llmReview`. No dedicated `AuditEvent` table. Per-user action history is reconstructable only by joining `FinalSubmission.llmReview` with `reviewerId` substrings.
- **Product metrics:** onboarding-complete, day-1 retention, attempt pass-rate — none of these emit a queryable event.

## Per-request cost telemetry

Anthropic SDK returns `message.usage = { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens }` on every response (and on the `finalMessage` of a stream). Today: dropped. A prompt edit that regresses cache-hit-rate from 92% to 5% is invisible until the monthly bill.

Fix: extend `PromptAttempt` (and `FinalSubmission`) with `tokensIn`, `tokensOut`, `cacheRead`, `cacheCreate`, `model`, `latencyMs`. Write from the four callsites. A daily aggregate over last 7 days becomes a one-liner.

See [[prompt-caching]] for why the cache hit-rate matters.

## Correlation IDs

Every log line today is `[tag] message`. A support ticket "user X got a 502 at 14:03" turns into grep-and-hope. Vercel runtime already exposes `x-vercel-id`; we can prepend a per-request nonce in a module-scope helper that wraps `logError`:

```
withRequestCtx({ reqId, userId: user.id, sessionId }, () => logError(...))
```

AsyncLocalStorage gives every nested `logError` access to the context without threading it through every callsite. This unlocks Vercel-log-aggregator filtering by `userId` or `sessionId`.

## Structured logging

Vercel's log pipeline parses JSON-first lines faster and makes them indexable. Switch `console.error(\`[${tag}]\`, ...args)` to `console.error(JSON.stringify({ ts, level, tag, ctx, err }))`. Keep `scrub()` at the boundary.

## Anthropic error variants

The 4 retry loops treat every throw the same (retry once, then rethrow). Anthropic returns discrete `APIError` subclasses:

- `529 overloaded_error` — retry is worthwhile (server-side blip).
- `429 rate_limit_error` — retry **worsens** rate-limit state; backoff + surface to user.
- `400 invalid_request_error` (e.g. context-length) — retry is pointless; truncate-and-abort.
- `401/403` — configuration bug, page on-call.

Today all four degrade to the same generic 502 on the user side. Branch on `err.status` (SDK exposes it) in the retry helpers.

## Circuit breaker per user

`rateLimitAsync` counts **calls**, not **tokens**. A user at 20 attempts × 8K tokens/attempt burns 160K tokens/hour. Multiply by 3 Sonnet + Haiku pairs + judge retries = ~1.2M tokens/hour/user. An abusive user therefore costs the same as 50 normal users under the current limit. Extend the bucket schema with a `tokensConsumed` column, decrement by the observed `message.usage.input_tokens + output_tokens`, and refuse above a daily cap.

## Slow query detection

`lib/db/prisma.ts` creates the client without `log` config. A cold Postgres on Vercel fluid + Prisma's query planner first-run can produce 2–5s queries that block an RSC render. With `log: [{ emit: 'event', level: 'query' }]` and `prisma.$on('query', e => if (e.duration > 500) logError(...))`, slow queries surface at origin.

## RSC retry semantics

`app/(app)/error.tsx` retries up to 3×. A transient DB blip and a reproducible code bug share the same UX: three retries, then "lade die Seite neu". The digest is already shown but never captured back to a server endpoint — the user could paste it into support, but there's no quick way to correlate it to the server log line that emitted it. Next.js 16's `instrumentation.ts::onRequestError` hook exists — we should wire it.

## Cold-start signals

The rate-limit `memStore`, the `lastBucketSweep` / `lastWebhookSweep` timestamps, and Prisma's connection pool all live in module scope. A Vercel fluid instance that just warmed has empty state; a warm one has up to 10K mem entries. No emitter surfaces "cold boot at t=X" — would help explain the first-user-per-region tail latency.

## Client-side errors

`components/challenge/ChatInterface.tsx` emits five `toast.error` calls. None cross the wire back to the server. A production React render error, a network flap, a 502 from `/api/challenges/[id]/attempt` — all invisible on the server side. Minimum viable fix: `POST /api/client-error` with `{ message, url, userId, userAgent, digest }` + same `scrub()` treatment.

## Admin audit trail

`app/api/admin/submissions/route.ts:85` stuffs `adminOverride: { status, note, reviewerId, reviewedAt }` into `llmReview` JSON. Only the **latest** override survives — subsequent overrides silently clobber the prior. A dedicated `AuditEvent { id, actorId, action, targetType, targetId, diff, createdAt }` table solves this. Cheap to add; expensive to retro-reconstruct after 3 months of production traffic.

## Vercel function size

`@react-pdf/renderer` unzipped is ~3.2 MB in `node_modules`, plus its transitive `pdfkit`+`fontkit`+`brotli` tree, plus the full `@anthropic-ai/sdk` (~6.1 MB). Next.js bundle-traces the import graph into each Serverless Function. The `pdf` route compiles alone; the `attempt` + `submission` + `generate` routes get the Anthropic tree. Verify with `next build` output (`.next/server/app/**/route.js` sizes) that no single function crosses 50 MB unzipped.

## Product metrics

Today a founder asks "how many users finished onboarding last week?" and the answer is a one-off Prisma query. Make it queryable by emitting a structured event on the happy path of the completion endpoints:

- `OnboardingProfile.completedAt` set
- `FinalSubmission.status` → `APPROVED`
- `PromptAttempt.judgeScore >= 9`
- `DailySession.status` → `COMPLETED` with `attempts_count`

A single `MetricEvent { name, userId, payload, createdAt }` table is enough; the downstream query becomes a `GROUP BY name, date_trunc('day', createdAt)`.

## Priorities for tomorrow's prod launch

1. **P0** — Persist `message.usage.*` on `PromptAttempt` + `FinalSubmission`. Without it, there's no trip-wire on a cost runaway.
2. **P0** — `AuditEvent` table. Admin overrides are legally interesting and currently unrecoverable.
3. **P1** — Structured-JSON logger + per-request correlation IDs via AsyncLocalStorage.
4. **P1** — Anthropic error-class branching in the 4 retry loops.
5. **P1** — Client-error → `/api/client-error` sink.
6. **P2** — Token-weighted rate-limit (the cost-weighted circuit breaker).
7. **P2** — Prisma slow-query `$on('query')` wired at client creation.
8. **P2** — Next.js 16 `onRequestError` instrumentation hook.

## Related

- [[security]] — the scrub layer every log line passes through
- [[prompt-caching]] — the cache-hit metric this page proposes to finally persist
- [[rate-limiting]] — the counter that should become token-weighted
- [[stream-lifecycle]] — where the finalMessage usage is dropped today
