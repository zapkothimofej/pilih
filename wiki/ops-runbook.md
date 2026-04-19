---
title: Ops Runbook (Round 5)
type: concept
---

# Ops Runbook — Migration Safety, Deploy, DR

Round 5 focus. Rounds 1–4 stabilised correctness + observability; this page covers **what breaks at the boundary between dev and prod**: schema migrations, deploy cadence, rollback, disaster recovery. Scored 1–10 per dimension; findings point at `file:line`.

Related: [[data-integrity]], [[auth-flow]], [[observability]].

## 1. Migration reversibility — 3/10

Prisma ships forward-only SQL by default. Seven migrations in `prisma/migrations/` and not a single `down.sql` anywhere. If a production `prisma migrate deploy` lands a broken change, the recovery path is **pg_dump restore**, not migration rollback.

- `prisma/migrations/20260419000001_harden_constraints_indices/migration.sql:14-18` — three CHECK constraints (`Challenge_difficulty_range`, `Challenge_currentDifficulty_range`, `PromptAttempt_judgeScore_range`). Any row violating the range after a prompt regression blocks the ALTER with `23514`. No `WHERE ... NOT BETWEEN` pre-scan in the SQL to surface the offending rows before failure. **Severity: medium**. **Fix:** prepend `DO $$ BEGIN IF EXISTS(SELECT 1 FROM "Challenge" WHERE "difficulty" NOT BETWEEN 1 AND 5) THEN RAISE EXCEPTION ...; END IF; END $$;` or run the check in a pre-deploy step.
- `prisma/migrations/20260417000001_add_cascade_unique/migration.sql:1-19` — drops 8 FKs and re-adds them with CASCADE. Between DROP and ADD the table is FK-less; a concurrent orphaning write slips through. Postgres wraps the migration in a single transaction so in practice this is atomic, but the migration is not documented as transactional — confirmed only by Prisma's default behaviour. **Severity: low**. **Fix:** the safer idiom is `ALTER CONSTRAINT ... NOT DEFERRABLE` then `DROP CONSTRAINT ... IF EXISTS` + `ADD CONSTRAINT ...` inside an explicit `BEGIN;/COMMIT;` with the migration file starting with `-- atomic`.
- No rollback SQL committed anywhere, no checked-in `scripts/migrate-rollback.sh`. **Severity: high for audit reasons**. **Fix:** per-migration write `down.sql` alongside `migration.sql`; document restore-from-backup as the only real rollback and accept that hot-rollback is not supported.

## 2. Data-preserving migrations — 7/10

`prisma/migrations/20260419020000_audit_usage/migration.sql:3-8` adds five nullable INTEGER columns to `PromptAttempt`. Postgres 11+ treats `ADD COLUMN ... NULL` without `DEFAULT` as a **metadata-only change** — it does not rewrite the table, holds `ACCESS EXCLUSIVE` for milliseconds. Safe for a live table.

- `prisma/migrations/20260419020000_audit_usage/migration.sql:13-27` — CREATE TABLE + three CREATE INDEX in the same migration. `CREATE INDEX` (non-concurrent) holds a write lock on the just-created table; harmless since there are no rows yet. **Severity: none**. Noted for contrast with point 3.
- `prisma/migrations/20260418000001_add_xp_indices_webhooks/migration.sql:4-12` — 8× `CREATE INDEX` (not `CONCURRENTLY`). On a 5K-row table this is fine; on a 1M-row `PromptAttempt` it locks writes for seconds. **Severity: medium, latent**. **Fix:** once tables grow, switch to `CREATE INDEX CONCURRENTLY` — but Prisma migrate cannot run `CONCURRENTLY` (must run outside a transaction). Manual deploy becomes required; document the ceiling.
- `prisma/migrations/20260418000001_add_xp_indices_webhooks/migration.sql:2` — `ADD COLUMN "xpEarned" INTEGER` (nullable, no default). Metadata-only. Backfill path: the app writes `xpEarned` at completion, pre-migration sessions stay `NULL`. No migration step backfills historical rows, by design. **Severity: none**, noted.

## 3. Unique-constraint migrations — 4/10

`prisma/migrations/20260419010000_booking_unique/migration.sql:5-7` adds `UNIQUE (userId, scheduledAt, type)`. If two rows in prod already collide (a pre-constraint double-click), this migration **fails mid-deploy** with `23505` and leaves the deploy half-applied on Vercel (build passes, DB migration fails at `prisma migrate deploy` — depending on pipeline order, the new code is already live).

- `20260419010000_booking_unique/migration.sql:1-7` — no defensive `DELETE ... WHERE` or `SELECT COUNT(*) ... GROUP BY ... HAVING COUNT > 1` pre-check. **Severity: high**. **Fix:** prepend:
  ```sql
  DELETE FROM "Booking" b1
    USING "Booking" b2
    WHERE b1.ctid < b2.ctid
      AND b1."userId" = b2."userId"
      AND b1."scheduledAt" = b2."scheduledAt"
      AND b1."type" = b2."type";
  ```
- `prisma/migrations/20260419000001_harden_constraints_indices/migration.sql:7` — `Challenge_userId_dayNumber_key`. Same duplicate risk if a pre-migration race slipped through. No defensive clean. **Severity: high for a first-run deploy**.
- `prisma/migrations/20260417000001_add_cascade_unique/migration.sql:22-23` — `DailySession` + `PromptAttempt` unique indices added without pre-clean. The app has enforced these in code since round 1 but `prisma migrate deploy` running late against dirty dev data will reject. **Severity: medium** — dev-only in practice, but document.

## 4. Foreign-key cascades vs DSGVO — 5/10

Hard cascade is the intent per [[data-integrity]]; DSGVO's *right-to-erasure* is satisfied by physically removing `User` + all descendants. This is correct for DSGVO-11. But the product also wants **audit retention** ([[observability]] lists `AuditEvent`) — and the same `User` delete removes the reviewer trail.

- `prisma/migrations/20260417000001_add_cascade_unique/migration.sql:12-19` — `ON DELETE CASCADE` on 8 FKs. A deleted `User` wipes `Challenge`, `DailySession`, `PromptAttempt`, `FinalSubmission`, `Certificate`, `Booking`, `OnboardingProfile`. **Severity: low (intended)**.
- `prisma/schema.prisma:186-198` — `AuditEvent.actorId` is a free-form `String`, **not** an FK to `User`. Good — admin action history survives the actor's user-delete. No FK means no cascade. **Severity: none**, explicitly verified as correct.
- `prisma/schema.prisma:213-221` — `Certificate` cascades away with the user. For regulatory "KI-Führerschein" context an **issued** certificate's metadata (scoreProof, issuance date) plausibly wants to survive erasure as an anonymised record. Not currently the case. **Severity: medium, policy-dependent**. **Fix:** add `ArchivedCertificate { userHash, issuedAt, avgScore, tier }` populated in the user-delete hook *before* the cascade runs; the hash is a one-way function of `clerkId + a server secret` so the user is unrecoverable but forgery-proof.
- No soft-delete column anywhere (`deletedAt`). A "temporary suspend + restore" admin action doesn't exist; the only option is hard delete. **Severity: low, product gap**.

## 5. Backup cadence — 1/10

Zero code, zero runbook. Whatever Vercel Postgres / Neon / Supabase provides is the only line of defence, and no note in the repo names the provider.

- Nowhere in `prisma/`, `lib/db/`, or `wiki/` does the backup cadence, retention, or restore procedure appear. **Severity: critical**. **Fix:** add `wiki/backup.md` with: provider (Vercel Postgres ships automated daily + 7-day PITR on paid tiers), last-verified-restore-date, the exact `pg_dump`/`pg_restore` invocation used in the drill, and which pages in the app to smoke-test post-restore (`/api/health`, `/dashboard`, attempt flow).
- No staging-database restore drill documented. Backups unverified until the first disaster. **Severity: critical**. **Fix:** monthly drill — restore into a staging DB, run `pnpm prisma migrate status`, smoke the happy path, log the duration in `log.md`.
- `prisma.config.ts` would be the natural place to declare a `shadowDatabaseUrl` for a restore-to-shadow quarterly drill, not done. **Severity: low**.

## 6. CI/CD pipeline — 2/10

No `.github/workflows/` directory. `git push main` → Vercel builds → prod. Lint, typecheck, vitest, Playwright — all gated by local developer discipline only.

- `package.json:5-14` exposes `lint`, `typecheck`, `test`, `test:e2e`. None run on push. **Severity: high**. **Fix:** `.github/workflows/ci.yml` with four jobs: `lint`, `typecheck`, `test` (vitest), `test:e2e` (Playwright), required for merge-to-main. Vercel's own "deploy requires passing GitHub Actions" toggle pairs with it.
- `package.json:7` — `build` runs `prisma generate && next build`. No `prisma migrate deploy` in build or in any CI step. Migrations therefore run **never in CI, only at developer discretion on their laptop**. **Severity: critical**. **Fix:** CI job against a throwaway Postgres that runs `prisma migrate deploy` + `prisma migrate status`; fail build on pending or drifted migrations.
- No preview-deploy smoke test. A broken build in prod is caught by user report, not by CI. **Severity: high**.

## 7. Vercel deploy configuration — 4/10

No `vercel.json` checked in. All runtime settings (regions, function memory, `maxDuration` overrides beyond per-route, env var bindings) live in the Vercel UI — opaque from the repo. Env validation (`lib/env.ts`) catches missing secrets at boot via `instrumentation.ts`, which is the only guard.

- No `vercel.json` → `maxDuration` defaults apply except where a route file overrides (e.g. `app/api/zertifikat/pdf/route.tsx:13` sets 45s). **Severity: low**, per-route is fine, but global region pinning is invisible.
- `lib/env.ts:44-52` — `NEXT_PUBLIC_APP_URL` required in prod. Good fail-closed. `lib/env.ts:60-73` throws at first `env()` call per instance; `instrumentation.ts` invokes it at boot so the instance refuses traffic. **Severity: none**, working as intended.
- No documented rollback mechanism beyond Vercel's "Promote previous deployment" UI. A migration-coupled rollback (code v(n-1) expects old schema; new schema already applied) is broken. **Severity: medium**. **Fix:** runbook entry — rollback requires *either* schema-forward-compat *or* a DB restore; pick one per release.

## 8. Schema → client regeneration — 7/10

- `package.json:14` — `postinstall: prisma generate`. Runs on fresh `npm ci`. Vercel runs `npm ci` per build, so the client is regenerated every deploy. **Severity: none**.
- `package.json:7` — `build` runs `prisma generate` again before `next build`. Belt-and-braces. **Severity: none**.
- `app/generated/prisma/` is checked in (listed in Glob results). **Severity: low** — this is redundant with `postinstall` and risks schema-vs-client drift if someone commits schema changes without regenerating. **Fix:** `.gitignore` `app/generated/prisma/` and trust the build.

## 9. proxy.ts runtime + edge-cache — 6/10

Next 16 renamed `middleware.ts` → `proxy.ts`. Runtime is `nodejs`, not edge. A deploy mid-traffic sees Vercel invalidate the proxy chain on the next request.

- `proxy.ts:20-28` — synchronous, no I/O, module-scope `FAIL_CLOSED` flag at boot (line 7-10). A Vercel env-var update does not re-evaluate `FAIL_CLOSED` on warm instances. If `ALLOW_TESTING_AUTH` flips from `true`→`false`, warm instances keep passing requests through until recycled. **Severity: medium**. **Fix:** evaluate inside `proxy()` — cost is one `process.env` read per request, well below routing overhead.
- `proxy.ts:35` — matcher excludes `/api/webhooks`. Good — svix-signed POSTs bypass session-fail-closed. **Severity: none**.
- No `export const runtime` — Next 16 default for `proxy.ts` is nodejs per the docs referenced in [[next16-proxy]]. No edge-only import restrictions apply. **Severity: none**.

## 10. Session continuity during deploy — 5/10

Deploy mid-attempt: user streaming an attempt on function version *n*; next poll hits version *n+1*. Vercel serverless instances don't share state, so any module-scope state resets silently.

- `lib/utils/rate-limit.ts:12` — `memStore` is module-scope. A deploy flushes it. Users briefly get a `memStore`-fallback window-reset. The DB path (`rateLimitAsync`) is authoritative; `rateLimit()` sync is advisory-only. **Severity: low** (the primary path survives).
- `lib/utils/rate-limit.ts:15-20` — `setInterval` sweep runs per-instance. Two warm instances = two sweeps. Harmless (idempotent `deleteMany`). **Severity: none**.
- `lib/utils/rate-limit.ts:58` — `lastBucketSweep` module-scope timestamp. Resets on deploy → extra sweep fires right after deploy. Harmless but noted. **Severity: none**.
- In-flight streams: the attempt stream runs on a fluid function instance; mid-stream deploy drops the connection. Client retry re-opens on the new version. Idempotency on `(sessionId, attemptNumber)` [[data-integrity]] prevents a duplicate insert. **Severity: low**, covered by the unique constraint.

## 11. Migration ordering vs code deploy — 3/10

Vercel deploys code before migrations run (there is no pre-deploy hook defined). A new column used by the new code is absent from the DB at first traffic.

- No CI/CD step runs `prisma migrate deploy`. If it happens at all, it is manual. **Severity: critical** — identical to finding 6 but worth repeating at the pipeline level.
- `prisma/migrations/20260419020000_audit_usage/migration.sql:3-8` — adds `tokensIn/tokensOut/...`. Code in `app/api/challenges/[id]/attempt/...` (per [[observability]]) writes these. Deploying the code without running the migration throws `P2022: The column ... does not exist`. Every attempt fails until someone runs `prisma migrate deploy`. **Severity: critical**. **Fix:** `vercel.json` (or GitHub Actions) with `buildCommand: prisma migrate deploy && prisma generate && next build`. Caveat — failing migrate blocks build, which is the intended signal.
- Forward-compatible migrations (add nullable column, code reads-with-fallback, code writes, later mark NOT NULL) — not followed as a pattern. **Severity: medium**. **Fix:** adopt the two-phase pattern for future NOT NULL adds.

## 12. Certificate PDF persistence — 4/10

`app/api/zertifikat/pdf/route.tsx:42-52` renders on-demand via `renderToBuffer` with a 30s internal timeout inside a 45s function-max-duration. Not persisted.

- `app/api/zertifikat/generieren/route.ts:35-46` — `Certificate.pdfUrl` stores `/api/zertifikat/pdf` (a relative route, not a stored file). Re-render on every download. **Severity: medium for regulatory context**. A "KI-Führerschein" issuance on day D must be reproducible years later; if the template, fonts, or `avgScore` computation change, the re-rendered PDF will differ from what the user shared on LinkedIn.
- `app/api/zertifikat/pdf/route.tsx:33-37` — `avgScore` recomputed from live `PromptAttempt` rows each render. If a row is deleted (DSGVO), the re-rendered average drifts. **Severity: medium**. **Fix:** snapshot `avgScore` + `issuedAt` into `Certificate` at generation and read from there.
- No object storage (S3/R2/Vercel Blob) integration for the rendered bytes. A regulator asking "what exactly did you issue to user X on day D" has no canonical artifact. **Severity: medium**. **Fix:** on first successful render, `PUT` to Blob under `certificates/{userId}/{issuedAt}.pdf`, store the blob URL in `Certificate.pdfUrl`; fall back to on-demand render for cache misses.
- `app/api/zertifikat/pdf/route.tsx:69` — `Cache-Control: no-store`. Correct for sensitive artifact. **Severity: none**.

## Priorities — the P0s if prod is tomorrow

1. **CI pipeline with `prisma migrate deploy` in the build path** — finding 6 + 11 are the same existential risk. A deploy without migration sync breaks prod on first attempt.
2. **Pre-clean defensive SQL on unique-constraint migrations** — finding 3 — a single dirty row stops a deploy.
3. **Backup cadence + monthly restore drill** — finding 5.
4. **Certificate snapshot + blob persistence** — finding 12 — regulatory artifacts must be reproducible.
5. **`vercel.json` with region + build command pinned in the repo** — finding 7 — take Vercel-UI state into version control.

## Related

- [[data-integrity]] — the invariants these migrations encode
- [[auth-flow]] — `proxy.ts` fail-closed guard interplay with deploy flips
- [[observability]] — cost + audit columns introduced in `20260419020000_audit_usage`
