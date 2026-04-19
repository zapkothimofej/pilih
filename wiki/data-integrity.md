---
title: Data Integrity
type: concept
---

# Data Integrity

DB-layer invariants that make application-level TOCTOU races harmless.

## Unique constraints

- `Challenge(userId, dayNumber)` — one challenge per user per day. The atomicity guard that lets `POST /api/challenges/generate` run the Sonnet call OUTSIDE the Prisma `$transaction` (the LLM takes 15-40s, well past Prisma's 5s default timeout).
- `DailySession(userId, dayNumber)` — one session per day.
- `PromptAttempt(sessionId, attemptNumber)` — no duplicate attempts.
- `FinalSubmission.userId` — one submission per user.
- `Certificate.userId` — one certificate per user.
- `ProcessedWebhook.svixId` — webhook idempotency.
- `Booking(userId, scheduledAt, type)` — a double-click on the book button hits P2002 instead of creating duplicate bookings.

## CHECK constraints

- `Challenge.difficulty BETWEEN 1 AND 5`
- `Challenge.currentDifficulty BETWEEN 1 AND 5`
- `PromptAttempt.judgeScore BETWEEN 0 AND 10`

Prevents direct SQL mutations from drifting the adaptive loop out of bounds. See [[adaptive-difficulty]].

## Transaction-scoped reads

`app/api/challenges/[id]/abschliessen/route.ts` reads `Challenge.currentDifficulty` INSIDE the `$transaction` — a concurrent adjacent completion can't drift the delta computation by racing between the read and write.

`app/api/submission/route.ts` re-reads `FinalSubmission.status` inside the tx and throws [[errors-domain|AlreadyApprovedError]] if the row flipped APPROVED during the 10-30s LLM call — this preserves the `adminOverride` audit trail.

## Rate-limit bucket atomicity

`lib/utils/rate-limit.ts::rateLimitAsync` — see [[rate-limiting]] for the reset-race fix.

## Cascade deletes

User deletion cascades through Challenge, DailySession, PromptAttempt, FinalSubmission, Certificate, Booking, OnboardingProfile. Company deletion only nulls `User.companyId` (users survive).

`DailySession.selectedChallenge` is `ON DELETE SET NULL` — a deleted challenge doesn't orphan the session. `xpEarned` is persisted at completion so deleting the challenge doesn't retroactively reduce a user's historical XP.

## Lazy cleanup jobs

- `RateLimitBucket` rows older than 1h purged at most every 15min via `sweepExpiredBuckets` (fire-and-forget inside `rateLimitAsync`).
- `ProcessedWebhook` rows older than 30d purged at most every 6h via `sweepProcessedWebhooks` (fire-and-forget inside the webhook handler).

Both probabilistic triggers — no dedicated cron needed.

## Related

- [[rate-limiting]] — the Postgres bucket
- [[webhook-idempotency]] — svix dedup
- [[adaptive-difficulty]] — consumes currentDifficulty
- [[stream-lifecycle]] — attempt persistence semantics
