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
