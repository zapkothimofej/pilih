# Activity Log

Chronological record of everything Claude has done in this project's knowledge base.

Format:
```
## [YYYY-MM-DD HH:MM] <kind> | <short title>
Touched: wiki/page-a.md, wiki/page-b.md
```

Kinds: `ingest`, `query`, `session`, `lint`, `rebuild`.

---

## [2026-04-17 17:05] session | Polish chat + judge popup UI
Touched: none

## [2026-04-17 17:30] session | Fix abschluss validation + buchung UTC min
Touched: none
## [2026-04-17 23:50] session | /review-cool full codebase review
Touched: none
## [2026-04-17 00:00] session | prisma migration, status filter, P2002 catch
Touched: none
## [2026-04-17 00:00] session | CSS tokens, color-mix fallbacks, keyboard focus, aria-label
Touched: none

## [2026-04-18 00:39] session | fix all 30 review dimensions (phases A-H)
Touched: none

## [2026-04-18 23:50] session | autonomous /review-cool fix-all + GSAP design overhaul
Touched: none
Summary:
- 25-dim review produced; 30 commits pushed across 14 push-batches.
- Security/auth: hardcoded test-user-1 removed from submission/buchungen/zertifikat routes, fail-closed middleware in prod, webhook idempotency tx, random-nonce envelopes for all three LLM boundaries, server-recomputed submission verdict, CSP+HSTS+Permissions headers, zod-validated env.
- Perf/correctness: relative-delta adaptive difficulty, paginated admin + aggregates, parallel judge stream, chat-history client cap, PDF timeout leak fix, konfetti reduced-motion + cleanup, PostgreSQL-backed rate limiter w/ atomic create-or-increment, certificate URL wiring, centralized XP/level/streak lib, prisma generate in build + postinstall.
- Testing: 47→59 tests (progress-xp, rate-limit-async, env).
- UX/GSAP: gsap@3.15 + @gsap/react installed. Cinematic landing (orb drift + scroll-trigger), animated stats (DayRing arc, shimmer XPBar, pulse streak), magnetic challenge cards w/ quickTo, orbit-spinner generating screen, cinematic certificate reveal, staggered 21-day calendar, GSAP accordion widget, sliding pill nav indicator, admin count-up, dashboard CTA sheen, onboarding step stagger, chat-bubble entrance, skip-nav, loading + not-found pages, OG metadata + theme-color.

## [2026-04-18 17:00] session | round-2 concurrency review
Touched: none

## [2026-04-18 20:30] session | round-4 observability + cost-surface review
Touched: wiki/observability.md, wiki/index.md

## [2026-04-19 18:00] session | 3-round autonomous review-cool + wiki build
Touched: wiki/index.md, wiki/security.md, wiki/prompt-injection.md, wiki/auth-flow.md, wiki/data-integrity.md, wiki/rate-limiting.md, wiki/stream-lifecycle.md, wiki/prompt-caching.md, wiki/judge-ai.md, wiki/adaptive-difficulty.md, wiki/reduced-motion.md, wiki/a11y-patterns.md, wiki/next16-proxy.md, wiki/webhook-idempotency.md, wiki/csrf-origin-guard.md, wiki/copy-tonality.md, wiki/gsap-patterns.md
Summary:
- 3 review rounds with 14 total parallel sub-agents (round 1: 6, round 2: 4, round 3: 4). Each round produced 8-15 new findings; none of the 3 were clean, so the 10-clean-round abort condition is not yet met — stopped at user "finish" request.
- Security: wired lib/env.ts into all callsites + instrumentation.ts for boot-time validation; expanded logError PII scrubber (Clerk user IDs, Bearer tokens, svix sigs, Error.stack); CSP drops unsafe-eval in prod + upgrade-insecure-requests; svix timestamp skew asymmetric (5min future, 72h past); webhook body-size 64KB cap; rebuilt chat history server-side instead of trusting client payload; CSRF same-origin guard on all 9 mutating routes; escapeXmlText strips control chars; microphone Permissions-Policy restored for SpeechInput.
- Next 16 / RSC: renamed middleware.ts → proxy.ts; maxDuration=60 on 4 LLM routes (prevents prod 504); getCurrentDbUser wrapped in React cache() (4× → 1× DB lookup per page).
- Data integrity: @@unique([userId, dayNumber]) on Challenge + @@unique([userId, scheduledAt, type]) on Booking + @@index([userId, status]) on DailySession + @@index([companyId]) on User + @@index([createdAt]) on ProcessedWebhook; CHECK constraints on difficulty/currentDifficulty/judgeScore; LLM call moved out of Prisma $transaction; rate-limit reset-race fixed with conditional updateMany; lazy cleanup for RateLimitBucket + ProcessedWebhook; calcStreak UTC; booking 90-day max lead; submission APPROVED ratchet inside tx with AlreadyApprovedError; attempt Math.max(attemptNumber)+1; abschliessen Challenge read inside tx.
- AI pipeline: prompt caching with cache_control on judge/submission/generator/chat simulator; temperature: 0 on judge + submission; shared lib/ai/llm.ts (stripCodeFences, extractText, assertNotTruncated); per-dimension scores plumbed end-to-end via lib/ai/judge-types.ts + rendered as DimensionBars with role=progressbar; retry path surfaces scrubbed prior error to model; stripCodeFences regex tightened; stream truncation yields in-band sentinel; abort signal propagated to generateChallenges + submission; chat simulator challenge context moved to second cached system block so every turn keeps domain awareness; adaptive JUST_RIGHT threshold bumped to 9/3 (was 8/4, degenerate); daily shuffle seeded by userId+YYYY-MM-DD.
- UX/A11y: framer-motion fully removed; DifficultyRating proper radiogroup + arrow-key nav; global CSS disables Tailwind animate-* under reduced-motion + enforces 44px tap target with .tap-small opt-out; streaming dots swap to fade under reduced-motion; chat aria-live moved to sr-only status region; onboarding focus moves to step heading; error boundary focuses heading + role=alert; aria-invalid + aria-required on FormInput; --text-muted #7a7f95 for WCAG AA; safe-area-inset-bottom on chat input; certificate headline retoned.
- Copy: judge score labels retoned to brand voice; "Stop" / "there" / "Generiere…" / "Kein Retry" / "1on1" tokens fixed; "Aufgabe" → "Challenge-Brief"; Impressum/Datenschutz/Kontakt footer stub; MwSt. notice.
- Centralisation: lib/constants.ts, lib/errors.ts, lib/ai/judge-types.ts.
- Hygiene: deleted lib/api-types.ts + logWarn; tsconfig target ES2022; @types/pg to devDeps; ESLint errors fixed; .claude/ gitignored.
- Tests: 61/61 green throughout. typecheck clean.
- 17 commits pushed to origin/main. 17 wiki pages with backlinks.

## [2026-04-18 23:59] session | round 4 review: locale/date/number consistency
Touched: wiki/locale.md

## [2026-04-18 23:59] session | round 5 review: secret lifecycle + supply chain
Touched: wiki/secret-lifecycle.md

## [2026-04-18 23:59] session | round 5 review: gsap animation performance
Touched: wiki/gsap-performance.md

## [2026-04-18 18:00] session | round 5 review: ops, migrations, DR
Touched: wiki/ops-runbook.md


## [2026-04-18 23:59] session | round 5 review: client state + perceived perf
Touched: wiki/client-state.md, wiki/index.md

## [2026-04-18 23:59] session | round 6 review: scale + multi-tenancy
Touched: wiki/scale-tenancy.md, wiki/index.md

## [2026-04-18 23:59] session | round 6 review: react 19 idioms
Touched: wiki/react19-idioms.md, wiki/index.md

## [2026-04-18 23:59] session | round 6 review: input-validation edge cases
Touched: wiki/input-validation.md, wiki/index.md

## [2026-04-18 23:59] session | round 6 review: keyboard + SR a11y
Touched: wiki/keyboard-a11y.md, wiki/a11y-patterns.md, wiki/index.md

## [2026-04-18 23:59] session | round 7 review: SEO + metadata
Touched: wiki/seo-metadata.md

## [2026-04-18 23:59] session | round 7 review: bundle + CWV
Touched: wiki/bundle-vitals.md

## [2026-04-18 23:59] session | round 7 review: network resilience + offline UX
Touched: wiki/network-resilience.md, wiki/index.md

## [2026-04-18 23:59] session | round 27 critical-only rescan
Touched: none

## [2026-04-18 23:59] session | round 8 review: data-integrity tight rescan
Touched: none

## [2026-04-18 23:59] session | round 7 review: component API surface
Touched: wiki/component-api.md, wiki/index.md
