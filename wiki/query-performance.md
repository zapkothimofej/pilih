---
title: Query Performance (Round 4 Review)
type: review
date: 2026-04-18
---

# Query Performance — Round 4

Focus: Prisma query plans, N+1 patterns, database perf under scale.
Backlinks: [[data-integrity]], [[rate-limiting]], [[next16-proxy]].

Rounds 1–3 already fixed the worst N+1s (super-admin company JOIN, admin
teilnehmer `_count` refactor, `challenges/heute` "last completed"). This
pass audits what's left.

## Dimension 1 — Super-admin aggregates (score 9/10)

`app/(admin)/super-admin/page.tsx:17-30`

- **F1.1** (info): The `prisma.company.findMany` now hydrates every user
  with `_count.sessions { where: status: COMPLETED }` + a `certificate:
  { select: { id } }`. That is 1 query returning `companies × users`
  rows — but the `avgProgress` calc still walks every participant in
  memory. On Yesterday Academy scale (100 companies × 50 users = 5 000
  rows) this is fine; at 10 000+ users per company the RSC payload
  bloats. Fix: push the aggregation to the DB with a single
  `prisma.user.groupBy({ by: ['companyId'], _count: { ... } })` and
  join to the `company.findMany({ select: { id, name } })` in memory.
  **Severity: low**.
- **F1.2** (perf): `certCount` is `prisma.certificate.count()` — fine,
  indexed by PK. No issue.

## Dimension 2 — Dashboard sessions over-fetch (score 5/10)

`app/(app)/dashboard/page.tsx:18-22`

- **F2.1** (high): `prisma.dailySession.findMany({ include:
  { selectedChallenge: true }, ... })` pulls **every column of every
  completed session and every joined Challenge row** (up to 21 sessions
  × ~8 Challenge columns, including `description` and `promptingTips`
  which can be ~2 KB each). The page uses only `s.date`, `s.dayNumber`,
  `s.id`, `s.xpEarned`, `s.selectedChallenge.currentDifficulty` (via
  `totalXp`), and `s.selectedChallenge.title` + `.category` for the
  "last 3". Fix: explicit `select` trimming promptingTips/description/
  improvements; the payload drops from ~60 KB to ~3 KB.
  **Severity: medium**.
- **F2.2** (medium): `totalXp(sessions)` iterates in memory over the
  array. This is O(n) with n ≤ 21, so the walk itself is free — BUT the
  array had to be materialised with the JOIN. A `prisma.dailySession.
  aggregate({ where, _sum: { xpEarned } })` plus a second `findMany`
  for the 3 recent ones with a `take: 3` would eliminate 18 unused
  challenge JOINs when the user only needs xp + streak + 3 items.
  Note the wrinkle: `xpEarned` is null for pre-backfill sessions, so
  `_sum` returns `null` for those rows — caller must fall back to the
  `selectedChallenge.currentDifficulty` path for the subset where
  `xpEarned IS NULL`. Feasible via two queries: `_sum` for populated
  rows + lean `findMany({ where: { xpEarned: null }, select: {
  selectedChallenge: { select: { currentDifficulty: true } } } })`.
  **Severity: medium**.

## Dimension 3 — `xp.totalXp` array-walk vs DB SUM (score 6/10)

`lib/progress/xp.ts:19-21`

- **F3.1** (medium): Callers of `totalXp` today are
  `app/(app)/dashboard/page.tsx` and `app/(app)/fortschritt/page.tsx`.
  Both already materialise the full session array for other purposes
  (streak, challenge list). So the helper itself isn't the cost — the
  caller-side over-fetch is (see F2.1, F4.1). Leave `totalXp` as a
  pure array reducer; add an optional `sumXp(userId)` helper that
  issues `prisma.dailySession.aggregate({ _sum: { xpEarned } })` for
  any future caller that genuinely only needs the number (e.g. a
  badge-count endpoint, future leaderboard). **Severity: low as a
  refactor; medium if leaderboard ships**.
- **F3.2** (info): `averageScore` at `lib/progress/xp.ts:76-79` is fine
  — the only callers (`/zertifikat/page.tsx`, `/api/zertifikat/pdf/`)
  already use `select: { judgeScore: true }`. Clean.

## Dimension 4 — Fortschritt over-fetch (score 4/10)

`app/(app)/fortschritt/page.tsx:12-19`

- **F4.1** (high): `findMany({ include: { selectedChallenge: true,
  attempts: { orderBy: { createdAt: 'desc' }, take: 1 } } })`. This
  loads **every column of Challenge AND every column of the last
  PromptAttempt** (including `llmResponse` + `userPrompt` + `judgeFeedback`
  — typically 1–4 KB each) for all 21 completed sessions. The page
  only renders `attempt.judgeScore`, `challenge.title`, `challenge.
  category`. Fix: explicit `select` on both relations — pulling just
  `judgeScore` and `title, category, currentDifficulty`. Expected
  payload drop from ~100 KB to ~4 KB. **Severity: high** (this is the
  heaviest over-fetch in the app).
- **F4.2** (medium): `sessions.flatMap(s => s.attempts)` flattens the
  last-attempt array to compute `avgScore` client-side over at most
  21 items. But this is **not** the average score — it's the average
  of only the last attempt of each session. That may be the intent
  (the final attempt before completion is the "submitted" score), but
  it differs from `PromptAttempt`-wide `averageScore` used on the
  zertifikat page. Flag for product alignment, not a perf bug.
- **F4.3** (medium): `days.find(s => s.dayNumber === day)` inside
  `Array.from({length: 21})` is O(21²) = 441 comparisons per render.
  Trivial at this scale but use a `Map<number, session>` pre-built
  once if the 21-day horizon ever grows (e.g. 90-day premium track).
  **Severity: low**.

## Dimension 5 — Prisma logging in dev (score 10/10)

`lib/db/prisma.ts:4-7`

- **F5.1** (info): No `log: ['query', 'warn', 'error']` configured.
  Dev sessions surface nothing. That's actually the right call for
  Next.js HMR (every Fast Refresh rerun would spam the terminal with
  1 000+ lines from RSC renders). Consider a guarded opt-in:
  `log: process.env.PRISMA_LOG === '1' ? ['query'] : ['warn', 'error']`.
  Zero cost in production; one env flag away from full tracing when
  hunting N+1s. **Severity: ergonomic**.

## Dimension 6 — Connection pool & serverless (score 3/10)

`lib/db/prisma.ts:4-7`

- **F6.1** (high): `new PrismaPg({ connectionString: ... })` passes a
  bare string. The pg adapter falls through to `pg.Pool` defaults:
  `max: 10` connections. On Vercel each serverless invocation can open
  up to 10 PG connections. A burst of 30 concurrent function cold
  starts exhausts a standard Postgres-Neon free tier (~20 conns) and
  backpressures. Fix: pass a `PoolConfig` with `max: 1` on Vercel
  (serverless functions are single-request-per-invocation, so 1
  connection is sufficient; keep-alive is irrelevant between cold
  starts). Example:
  ```ts
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 10_000,
  })
  ```
  **Severity: high** on Vercel deploy; medium elsewhere.
- **F6.2** (medium): `globalForPrisma.prisma` pattern is there, but on
  Vercel each cold invocation is a fresh Node module graph — the
  global cache only helps between HMR reloads in dev, not across
  serverless requests. Consider routing through a pooler (PgBouncer /
  Supabase pooler / Neon serverless driver) for hot paths. **Severity:
  infra-review**.

## Dimension 7 — `abschliessen` raw UPDATE index usage (score 9/10)

`app/api/challenges/[id]/abschliessen/route.ts:106-110`

- **F7.1** (info): The WHERE is `"userId" = $1 AND "status" <> 'COMPLETED'`.
  The `(userId, status)` index from migration `20260419000001` doesn't
  cover `<>` equality — Postgres can still use the `userId`-prefix
  portion, then filter the small result set. With at most 21 Challenge
  rows per user this is fine: ~20 rows read per UPDATE. **Severity:
  none**.
- **F7.2** (medium): The UPDATE + earlier `tx.challenge.update` both
  touch the target Challenge row — the target is already set to
  `COMPLETED` by the first update, and the `<>` clause then excludes
  it from the bulk clamp. Correct but fragile: if a future refactor
  reorders these statements the target row would also be retuned.
  Add a comment inline or `AND "id" <> ${challengeId}` for defense
  in depth. **Severity: low**.

## Dimension 8 — `challenges/heute` sort ordering (score 8/10)

`app/api/challenges/heute/route.ts:13-17` and `.../(app)/challenge/heute/page.tsx:14-18`

- **F8.1** (info): `findFirst({ where: { userId, status: 'COMPLETED' },
  orderBy: { dayNumber: 'desc' } })`. The new `(userId, status)`
  compound index lets Postgres walk the userId+status subset. Sorting
  by `dayNumber` desc still requires a Sort node, but the input is at
  most 21 rows. Adding `dayNumber` to the compound as `(userId, status,
  dayNumber DESC)` would enable a pure index scan with LIMIT 1. For
  21-row user histories this is microseconds either way. **Severity:
  none** — noted for scaling the track.
- **F8.2** (info): The second `findFirst({ where: { userId, dayNumber,
  status: { not: 'COMPLETED' } } })` is served by the `@@unique
  ([userId, dayNumber])` constraint — index lookup, 1 row. Clean.

## Dimension 9 — FortschrittCalendar sort (score 10/10)

`app/(app)/fortschritt/FortschrittCalendar.tsx` + `page.tsx:19`

- **F9.1** (info): Server-side `orderBy: { dayNumber: 'asc' }` + client
  builds a dense 21-cell grid via `Array.from`. No client-side sort.
  Clean.

## Dimension 10 — Onboarding duplicate profile read (score 5/10)

`app/(app)/layout.tsx:6` + `app/(app)/dashboard/page.tsx:12-15` +
`app/(app)/onboarding/page.tsx:11-13` +
`app/(app)/onboarding/generating/page.tsx:10-13`

- **F10.1** (medium): `getCurrentDbUser` is `cache()`-wrapped (see
  [[next16-proxy]]), so repeated calls dedupe to one query per render.
  But the `OnboardingProfile` lookup is NOT cached — `dashboard/page.
  tsx`, `onboarding/page.tsx`, and `generating/page.tsx` each issue
  their own `prisma.onboardingProfile.findUnique`. In theory the layout
  could prefetch `onboarding: { select: { completedAt: true } }` via
  `getCurrentDbUser` and every page would read from the cached shape.
  Fix: extend `getCurrentDbUser` to `include: { onboarding: { select:
  { completedAt: true } } }` — the relation is 1:1 and the projection
  is tiny. Pages that today issue their own `findUnique` drop one
  roundtrip per render. **Severity: medium** (every app page pays the
  cost).
- **F10.2** (info): `app/api/challenges/generate/route.ts:34` also
  issues its own profile lookup inside an API route — API routes don't
  benefit from RSC `cache()`, so this remains a 1-query cost per
  request. OK.

## Dimension 11 — Unused include branches (score 8/10)

- **F11.1** (medium): `app/api/admin/submissions/route.ts:37` hydrates
  `user.companyId` even though the GET handler doesn't filter by
  company (it serves SUPER_ADMIN the whole list). `COMPANY_ADMIN` scope
  should be applied via `where: { user: { companyId } }`, matching the
  page-side `submissions/page.tsx:17-19` pattern. Without it, a
  `COMPANY_ADMIN` hitting the API pagination route **sees every
  company's submissions** — this is a scoping bug masquerading as an
  over-fetch. Cross-link: see [[data-integrity]] unique-constraints
  section — data-integrity at the DB level can't compensate for
  missing auth scoping at the query level. **Severity: HIGH (auth
  bug)**.
- **F11.2** (low): `app/(admin)/admin/submissions/page.tsx:24` includes
  full `user { id, name, email }` — fine, just 3 columns, bounded at
  50 rows per page.

## Dimension 12 — Prisma 7 `$transaction` semantics (score 7/10)

Package: `prisma@^7.7.0`, `@prisma/client@^7.7.0`.

- **F12.1** (info): Prisma 7 retains default `ReadCommitted` isolation
  on Postgres. The `$transaction` in `abschliessen/route.ts` and
  `submission/route.ts` does not pass `{ isolationLevel:
  'Serializable' }`. The logic tolerates this — both transactions
  re-read the row inside the tx (see [[data-integrity]] TOCTOU
  section), so `ReadCommitted` is sufficient. The webhook tx is
  idempotent by unique constraint.
- **F12.2** (low): Prisma 7 changed transaction timeout handling:
  interactive `$transaction` now defaults to `maxWait: 2_000ms,
  timeout: 5_000ms`. The `abschliessen` transaction runs one findUnique,
  one findUnique, two updates, and an executeRaw — well inside 5 s on
  warm connections. Under cold-start contention (with the F6.1 pool
  issue) this can tip over. Fix: pass `{ timeout: 10_000 }` defensively.
  **Severity: low**.
- **F12.3** (info): Submission route's tx wraps an `upsert` — Prisma 7
  still issues this as two statements (SELECT + INSERT/UPDATE) inside
  the tx. The `finalSubmission.userId` unique index means the SELECT
  is index-driven; no hotspot.

## Summary

High-impact fixes (do first):

1. **F11.1 — AUTH BUG**: `/api/admin/submissions` GET doesn't scope by
   `companyId` for `COMPANY_ADMIN`. Matches the page but mismatches
   the API — COMPANY_ADMINs can enumerate the whole table via the API
   route used for pagination. Fix inline at
   `app/api/admin/submissions/route.ts:22-43`.
2. **F6.1** — Pin `pg.Pool.max = 1` on Vercel or the project will hit
   connection-exhaustion on modest load spikes.
3. **F4.1** — Add explicit `select` on Fortschritt page; 20× payload
   reduction.
4. **F2.1** — Same treatment for Dashboard.

Medium:

5. **F10.1** — Include `onboarding.completedAt` in `getCurrentDbUser`.
6. **F7.2** — Defense-in-depth `id <>` clause in raw UPDATE.
7. **F12.2** — Explicit transaction timeout on `abschliessen`.

Low / future:

8. **F1.1, F3.1, F4.3, F8.1, F5.1** — scale-dependent or ergonomic.

## Cross-references

- [[data-integrity]] — unique-constraint guards referenced by F7,
  F11, F12.
- [[rate-limiting]] — the Postgres bucket shares the same connection
  pool as all other queries (see F6.1 — an exhausted pool delays
  rate-limit decisions, degrading gracefully to "allow on error" is
  NOT how `rateLimitAsync` behaves; it blocks the request).
- [[next16-proxy]] — `getCurrentDbUser` `cache()` dedup covered in F10.
