---
title: Scale & Multi-Tenancy (Round 6)
type: review
date: 2026-04-18
---

# Scale & Multi-Tenancy — Round 6

Focus: what breaks at B2B scale (100 companies × 200 users = 20 000
rows). Rounds 1–5 hardened a single user's happy path; this pass asks
what the system does when HR imports 200 colleagues, when 50 users
finish day 21 at once, when a COMPANY_ADMIN sorts submissions across a
10 000-row tenant.

Backlinks: [[data-integrity]], [[query-performance]], [[rate-limiting]],
[[observability]], [[ops-runbook]].

## D1 — Null-company orphans (score 8/10)

`prisma/schema.prisma:83` — `User.companyId String?`.
`app/(admin)/super-admin/page.tsx:17-30` — `company.findMany`.

- **F1.1** (medium): Null-company users never appear on super-admin.
  `prisma.company.findMany` iterates `Company` rows and hydrates
  `users`. A self-signup user with `companyId = null` is invisible in
  "Teilnehmer gesamt" (line 28 does count them) but contributes nothing
  to Ø-Fortschritt, nor to any company card. Result: the totals row
  and the sum of per-company counts disagree, silently. Fix: add an
  "Ohne Firma" synthetic card via a `where: { companyId: null }`
  second query, or force a "Solo" pseudo-Company on signup.
- **F1.2** (medium): `app/(admin)/admin/page.tsx:18-20`, `app/api/admin/
  teilnehmer/route.ts:30-32`, `app/api/admin/submissions/route.ts:41-43`
  — when `admin.role === 'COMPANY_ADMIN' && admin.companyId === null`,
  the server redirects to `/dashboard` (page) or returns 403 (API).
  That's safe but hostile: a freshly promoted COMPANY_ADMIN whose
  Company row is still provisioning is bounced without explanation.
  Fix: surface a "Kein Unternehmen zugewiesen" empty state, not a
  redirect.
- **F1.3** (low): No DB-level guarantee that a COMPANY_ADMIN actually
  has a non-null `companyId`. A future admin-provisioning script that
  forgets to set `companyId` silently locks the user out. Add a
  CHECK (or application invariant) `role != 'COMPANY_ADMIN' OR
  companyId IS NOT NULL`. Severity low until provisioning exists.

## D2 — On-demand PDF fan-out (score 9/10)

`app/api/zertifikat/pdf/route.tsx:18-72`.

- **F2.1** (high): Every cert download re-renders the PDF via
  `renderToBuffer` (15-30 s per call, `maxDuration = 45`). At scale,
  50 users finishing day 21 in the same hour will each pop the GET
  when the success screen mounts — 50 × 30 s = 1500 compute-seconds,
  all serial per user but parallel across users. On Vercel each
  invocation is its own function instance, so the cost hits Anthropic
  SDK's `@react-pdf/renderer` memory+CPU footprint × concurrent
  instances. Fix: persist the first-rendered PDF to object storage
  (R2/S3/Vercel Blob) inside `zertifikat/generieren/route.ts`,
  store the public URL in `Certificate.pdfUrl`, and redirect
  downloads there. Cert data never changes after issuance so caching
  is safe.
- **F2.2** (medium): `rateLimitAsync('pdf:<userId>', 2, 1h)` caps
  per-user but doesn't cap *globally*. A 50-user simultaneous finish
  saturates function concurrency but never trips a rate limit. Fix:
  add a queued variant — write a `PdfJob` row, email the user when
  rendered. At 20 000 users this is table-stakes.
- **F2.3** (medium): `PDF_LIMIT = 2` for a file the user will
  typically only download 1-2× ever. Fine for single user; at
  company-CSV-export scale (D9) we'd want a service-key to bypass.

## D3 — Admin pagination scale (score 7/10)

`app/api/admin/teilnehmer/route.ts:9` — `limit.max(100).default(50)`.
`app/api/admin/submissions/route.ts:13` — `default(25).max(100)`.
`app/(admin)/admin/AdminClient.tsx:60-64` — client-side search.

- **F3.1** (high): Search is client-side over already-loaded rows
  (`filter(p => p.name.toLowerCase().includes(search))`). At 10 k-row
  tenants you'd need 200+ "Mehr laden" clicks to search for "Müller"
  on page 198. Fix: accept `?q=` on `/api/admin/teilnehmer`, translate
  to `where: { OR: [{ name: { contains, mode: 'insensitive' } },
  { email: { contains, mode: 'insensitive' } }] }`. Add a trigram
  index for `name` if query plans regress. Severity high at scale.
- **F3.2** (medium): No status filter on the teilnehmer endpoint.
  Admins can't scope to "aktiv" / "abgeschlossen" / "nicht onboarded"
  server-side — those states live in the API response shape only.
  Fix: accept `?onboarded=0/1`, `?hasCertificate=0/1`, `?minProgress=`.
- **F3.3** (medium): Submissions page ships 50 rows server-rendered
  (`submissions/page.tsx:26`), but `SubmissionsClient.tsx` has no
  `loadMore` at all. Reviewers working through a backlog after
  vacation only see the latest 50 — older PENDING rows are invisible.
  Fix: port the loadMore pattern from AdminClient.

## D4 — Admin filter UX (score 6/10)

- **F4.1** (medium): SUPER_ADMIN has no "scope to company X" control
  anywhere. `admin/page.tsx:18-20` only branches on role, not on a
  query param. Fix: accept `?companyId=` on the user list and the
  submissions list when `role === 'SUPER_ADMIN'`. Dovetails with D1.
- **F4.2** (low): The SUPER_ADMIN super-admin page
  (`app/(admin)/super-admin/page.tsx`) has per-company cards but
  clicking a company doesn't drill in — no route for
  `/super-admin/company/[id]`. Fix: link card → filtered admin view.

## D5 — Cross-company leaderboards (score 5/10)

Not shipped; schema readiness only.

- **F5.1** (info): `DailySession.xpEarned` is persisted per session
  (see [[data-integrity]] cascade notes). A per-company or global
  leaderboard is one `groupBy({ by: ['userId'], _sum: { xpEarned } })`
  away — no join per page. Good.
- **F5.2** (medium): `User.companyId` is indexed (`@@index
  ([companyId])`) but a compound `(companyId, role)` would be better
  — every admin list filters on both. Add in a future migration
  alongside leaderboard work.
- **F5.3** (info): `PromptAttempt.judgeScore` has no composite with
  `userId`. A "top prompters in your company" leaderboard would
  `groupBy(userId) _avg(judgeScore)` filter by `user.companyId` and
  need an index on `(userId, judgeScore)` or a materialised view.
  Flag for when leaderboards ship.

## D6 — Bulk user creation (score 9/10)

- **F6.1** (high): No import endpoint exists. A 200-person HR batch
  must self-signup 200×. At even 5 % friction (forgotten invites,
  wrong email domain, Clerk email-verification latency) this kills
  the B2B onboarding promise. Fix: add
  `POST /api/admin/users/import` (SUPER_ADMIN or COMPANY_ADMIN
  scoped to own company) that accepts `{ email, name, tier }[]`
  and either: (a) creates a Clerk invitation per user, or (b) marks
  `User` stubs that Clerk backfills on signup via the existing
  webhook (see [[webhook-idempotency]]). CSV upload route
  recommended.
- **F6.2** (medium): No seat-quota gate on the import path — see D11.
  An unbounded CSV would let a PRO-seat tenant silently overshoot
  paid seats.
- **F6.3** (low): `OnboardingProfile` is the bottleneck — even with
  bulk user creation, each user still needs to fill 6 form fields
  before `challenges/generate` unlocks. A "pre-fill from CSV"
  column-mapping would cut that entirely for HR-driven rollouts.

## D7 — Super-admin render cost (score 6/10)

`app/(admin)/super-admin/page.tsx:17-30`.

- **F7.1** (medium): Every render runs `company.findMany({ include:
  { users: { select: { _count: { sessions }, certificate } } } })`.
  For 100 companies × 200 users this returns 20 000 user rows with
  nested `_count` subselects — Postgres emits one aggregate subquery
  per user. Then JS walks them in `participants.reduce(...)` to
  compute avgProgress. Fix: push to `user.groupBy({ by:
  ['companyId'], _count: { _all: true }, where: { role: 'PARTICIPANT'
  } })` + a parallel `dailySession.groupBy({ by: ['user.companyId'],
  where: { status: 'COMPLETED' }, _count: { _all: true } })` (via
  `user: { companyId: { in: [...] } }`). Two queries + a Map merge,
  O(100) in memory. See [[query-performance]] F1.1 for the same
  pattern noted at lower urgency.
- **F7.2** (medium): No caching. Each SUPER_ADMIN page hit re-runs
  the aggregate. Add `unstable_cache`/`revalidate: 60` — cert and
  progress stats don't need sub-minute freshness.
- **F7.3** (low): No pagination on the Firmen list. At 500+ companies
  the RSC payload grows linearly. Add `take: 50` + search.

## D8 — 21-day time-boxing (score 8/10)

`prisma/schema.prisma:98-113` — `OnboardingProfile` has `createdAt` +
`completedAt` but no `enrollmentExpiresAt`. `DailySession.date`
(line 140) is the day the user *started* that session, not the
enrollment clock.

- **F8.1** (high): No expiry on the 21-day programme. A user who
  completes day 1 then vanishes for 6 months picks up at day 2 with
  challenges generated against their 6-month-old onboarding profile.
  At 1 000 users with typical 30 % abandonment there's no signal for
  "this tenant owes a renewal" vs "still active". Fix: add
  `OnboardingProfile.enrolledAt` (default `completedAt`) and treat
  `now() - enrolledAt > 60 days` as expired; re-onboard before
  allowing `challenges/heute`. Product decision: the B2B contract is
  typically 8 weeks — surface that invariant in the schema.
- **F8.2** (medium): `challenges/heute` (`route.ts:13-17`) computes
  `nextDay = lastCompleted.dayNumber + 1`. If Day 20 was completed in
  January and Day 21 in April, `reviewedAt` on the submission will
  read April but the certificate's "21 Tage in X Zeitraum" claim is
  a lie. Fix: compute and persist `enrolledAt`/`finishedAt` on the
  Certificate row.
- **F8.3** (low): No cron/sweep to archive abandoned sessions. Not
  a correctness bug but a capacity issue — `DailySession` grows
  without bound. Add a status `ABANDONED` + lazy-sweep (analogous
  to `RateLimitBucket` in [[rate-limiting]]).

## D9 — Compliance export (score 9/10)

No `app/api/**/export*` or `csv*` route exists.

- **F9.1** (high): Compliance / HR will need periodic "who passed,
  when, which score" CSVs. Without it the COMPANY_ADMIN resorts to
  manual copy-paste from the DOM, or product-eng writes one-off
  SQL — neither scales to 100 tenants. Fix: add
  `GET /api/admin/export?kind=participants|submissions&format=csv`
  that streams rows (not buffer) with the standard tenant scoping
  from D4. Emit an `AuditEvent` on each call (see D12).
- **F9.2** (medium): DSGVO Art. 20 (data portability) — each user
  has a right to download their own data. Currently no
  `GET /api/me/export`. The cert PDF is a partial answer; the full
  `OnboardingProfile` + attempt history is not exportable. Fix:
  add under `/einstellungen`.

## D10 — Challenge content per company (score 7/10)

`lib/ai/challenge-ai.ts:43-104` — `GENERATOR_SYSTEM_PROMPT` is static.

- **F10.1** (medium): No per-company override. A legal firm tenant
  might explicitly forbid "Schreibe einen Blogartikel" challenges —
  today that is hard-coded as a counter-example in the prompt but
  there is no company-scoped vocabulary. Fix: add
  `Company.customPromptPreamble String?` and splice into the system
  prompt when non-null. Keep prompt-cache by stacking the preamble
  as a *separate* cached system block (the same pattern as
  `challengeSystemBlock` in `challenge-ai.ts:245-251`, cross-link
  to [[prompt-caching]]).
- **F10.2** (medium): `profile.companyName` already goes into the
  user message at `challenge-ai.ts:113`. But `Company.name` (the
  canonical tenant name) is never pulled — so the generator sees
  whatever the user typed into onboarding, not the licensed tenant
  name. Mild data-integrity drift. Fix: when the user has a non-null
  `companyId`, override with `company.name`.
- **F10.3** (low): Cache hit ratio for the system prompt (see
  [[prompt-caching]]) collapses across tenants once F10.1 lands —
  every distinct preamble is a new cache breakpoint. Budget for
  slightly-higher Anthropic costs with custom tenants, or make
  preamble opt-in on the PREMIUM tier.

## D11 — Seat quota (score 10/10)

Schema has no `Company.seatCount`. Grep for `seat|quota` returned
zero matches.

- **F11.1** (high): A Company that bought 50 PRO seats has no
  schema-level cap. With D6's CSV import landed, a malicious or
  sloppy COMPANY_ADMIN can provision 500. No enforcement anywhere.
  Fix: add `Company.seatCount Int @default(0)`,
  `Company.tier Tier @default(BASE)`, gate
  `POST /api/admin/users/import` (and self-signup when
  `user.email` matches `company.domain`) on
  `count(users) < seatCount`.
- **F11.2** (medium): `User.tier` (schema line 82) is per-user
  today but the business model is per-company licensing. A PRO
  tenant shouldn't have some BASE users and some PREMIUM users
  by accident. Fix: move tier to `Company.tier`, treat `User.tier`
  as derived / override. Breaking migration; worth it before first
  B2B contract.
- **F11.3** (low): No Stripe/billing integration visible. When
  billing lands, `seatCount` becomes the authoritative quota
  synced from the subscription. Flag for ops-runbook.

## D12 — Read-audit (score 6/10)

`prisma/schema.prisma:186-198` — `AuditEvent` table exists.
`app/api/admin/submissions/route.ts:110-122` — only the PATCH
override emits one.

- **F12.1** (medium): No GET routes emit AuditEvent rows. A
  COMPANY_ADMIN who scrolls through 200 pending submissions in an
  audit-triggering tenant (regulated industry, DSGVO Art. 30
  Verarbeitungsverzeichnis) leaves no trace. Fix: emit a
  `submissions.list` row with `{ page, filters }` in diff — cheap
  write, valuable trail. Throttle by userId+route to 1/min to avoid
  flooding.
- **F12.2** (medium): `AuditEvent` indexes are
  `(actorId, createdAt)` + `(targetType, targetId)` + `createdAt`.
  No `(action, createdAt)` — so "all submission overrides this
  month" is a Seq Scan. Add when the audit UI ships.
- **F12.3** (low): `AuditEvent.actorId` is free-form string — good
  for surviving user deletion (see [[ops-runbook]]). But no retention
  policy. Budget for DSGVO 10-year retention vs storage cost. Not
  urgent.

## D13 — Tier enforcement (score 9/10)

`app/(app)/einstellungen/EinstellungenClient.tsx:104,140,153` —
cosmetic gate on settings page only.
`components/ui/AppNav.tsx:24` — `/buchung` link is shown to **every**
tier.
`app/(app)/buchung/page.tsx:6-14` — no tier check.
`app/api/buchungen/route.ts:29-84` — no tier check on POST.

- **F13.1** (HIGH / security-ish): A BASE user can navigate to
  `/buchung`, see the form, and `POST /api/buchungen` to create
  GROUP_MEETING or ONE_ON_ONE bookings — the only validation is
  datetime-range. Free access to a PRO/PREMIUM-gated feature. Fix:
  `if (user.tier === 'BASE') return 403` in both the page
  (redirect to `/einstellungen?upgrade=1`) and the API route.
  Also conditionally hide the nav link in `AppNav.tsx:24`.
- **F13.2** (medium): Tier is enforced *only* by UI chrome on the
  einstellungen page. Every protected endpoint should re-check on
  the server, matching the pattern from
  `app/api/admin/submissions/route.ts:23-28` (role check
  server-side). Add a `requireTier(['PRO', 'PREMIUM'])` helper next
  to `requireRole` in `lib/utils/auth.ts`.
- **F13.3** (low): `Tier` enum lives at user-level when the product
  is company-priced (D11.2). Interacts with D11 — resolve
  together.

## Summary — priorities

**Ship first (business/security correctness):**

1. **F13.1** — Tier-gate `/buchung` + `/api/buchungen`. A BASE user
   can today book 1:1 coaching. Trivial fix, measurable leak.
2. **F6.1 + F11.1** — Bulk import endpoint *with* seat quota. These
   land together or not at all; importing without a quota invites
   tenant overshoot.
3. **F2.1** — Queue + persist cert PDFs to Blob storage. Current
   on-demand 30 s render is a function-timeout grenade waiting for
   the first cohort wrap.
4. **F9.1** — Compliance CSV export.

**Ship before 10+ tenant scale:**

5. **F3.1** — Server-side search on admin pagination.
6. **F7.1** — Aggregate super-admin render via `groupBy`.
7. **F8.1** — Enrollment expiry clock.
8. **F12.1** — Read-audit events on admin GETs.

**Schema / product decisions (slower):**

9. **F1.1** — Null-company orphan card on super-admin.
10. **F11.2** — Move `Tier` to `Company` not `User`.
11. **F10.1** — Per-tenant prompt preamble.

## Cross-references

- [[data-integrity]] — tier / quota invariants belong here once added.
- [[query-performance]] — F7.1 refines the Round-4 F1.1 note into
  an actionable aggregate migration. F3.1 server-side search
  interacts with the Round-4 pool-size note (F6.1 there).
- [[rate-limiting]] — F2.2 (PDF queue) needs a parallel bucket
  (`pdf-queue:<companyId>`) to prevent cohort-wide cert bursts.
- [[observability]] — F12.1 read-audit extends the existing
  `AuditEvent` scope.
- [[ops-runbook]] — F8.3 (abandoned-session sweep) + F9.1 (CSV
  export retention) belong in the ops doc.
