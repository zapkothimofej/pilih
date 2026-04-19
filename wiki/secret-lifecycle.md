---
title: Secret Lifecycle & Supply Chain
type: concept
---

# Secret Lifecycle & Supply Chain

Round 5 review focus: how secrets enter, rotate, and exit the running process, and what the current dependency tree looks like on 2026-04-18.

## Module-scope SDK clients pin the key at boot

`lib/ai/judge-ai.ts:11`, `lib/ai/challenge-ai.ts:10`, `app/api/submission/route.ts:20` each do:

```ts
const client = new Anthropic({ apiKey: env().ANTHROPIC_API_KEY })
```

`env()` memoises into `cached` (`lib/env.ts:58-73`), so the key read at module load is the key the process uses until it dies. Same pattern for `CLERK_WEBHOOK_SECRET` — captured once at module load inside the Svix `Webhook` constructor (`app/api/webhooks/clerk/route.ts:87`, but the secret itself is pulled fresh per request via `env()` on line 49, so a server restart is the only thing required).

`lib/db/prisma.ts:10-15` reads `DATABASE_URL` straight from `process.env` in the factory, reused via a `globalThis` cache in dev. Same story: rotation = restart.

**This is correct for a Vercel serverless deployment** — every cold start is a fresh module graph, so an env-var swap in the Vercel dashboard + redeploy (or trigger a new deploy) propagates in minutes. On a long-lived Node server (PM2, Docker pod) the same rotation requires a process restart.

**Not documented in wiki/security.md today.** Add a "Rotation procedure" section there, or link this page.

## svix signing-secret rollover is not used

svix supports [multiple signing secrets during rollover](https://docs.svix.com/receiving/verifying-payloads/how#key-rotation) — the server generates a new secret, both old and new are valid for a window, then the old is revoked. The current handler passes a single `webhookSecret` string into `new Webhook(webhookSecret)` — a rotation will cause ~5-min of 400s on in-flight webhooks signed with the old key. For Clerk's expected volume this is tolerable; for higher-throughput tenants consider `new Webhook([oldSecret, newSecret])` during rollover.

## npm audit (2026-04-18, --production)

Two critical, two moderate. Full output:

```
@clerk/nextjs  >=7.0.0 <7.2.1       CRITICAL  Middleware bypass  GHSA-vqx2-fgx2-5wq9
@clerk/shared  >=4.0.0 <4.8.1       CRITICAL  Middleware bypass  GHSA-vqx2-fgx2-5wq9
@hono/node-server <1.19.13          MODERATE  serveStatic bypass (transitive via @prisma/dev)
hono <4.12.14                       MODERATE  JSX HTML injection (transitive via @prisma/dev)
```

Installed: `@clerk/nextjs@7.1.0`, `@clerk/shared@4.7.0` — **both affected**. Fix: bump to `@clerk/nextjs@^7.2.1`, `@clerk/shared@^4.8.1` via `npm audit fix`. No breaking changes on the 7.x patch line. This is a genuine prod risk — the advisory is "auth middleware can be bypassed" which in this codebase maps straight onto `proxy.ts`, which is the sole auth-fail-closed layer for pages outside `/api/webhooks/*`.

`@prisma/dev` is a dev dependency pulled as a peer of `prisma@7.7.0` in dev tooling — the hono advisories don't reach prod. No action needed; `npm audit --omit=dev` would filter them.

## No Renovate / Dependabot automation

No `.github/dependabot.yml`, no `renovate.json`. All deps carry `^` ranges in `package.json` so a fresh `npm install` picks up minors, but the lockfile pins specific versions. Result: silent version drift only happens if somebody re-runs `npm install` without a lockfile diff review. Fine for a one-developer repo, risky once others contribute.

**Recommend:** commit a minimal `.github/dependabot.yml` (weekly, grouped by major) for security-only updates. Two lines in CI and you get PR-based CVE notifications.

## Secret exposure surfaces

- **`.env.local`** is gitignored via `.gitignore:34` (`.env*` with `!.env.example` allowlist). `git log --all -- .env.local` returns empty. `git check-ignore -v .env.local` confirms the ignore rule hits. Clean.
- **`.env.local:14`** currently holds a live-looking `sk-ant-api03-...` key on the developer's laptop. Low risk because the file is gitignored and never left the machine — but worth a routine key rotation at the Anthropic dashboard after every support-ticket / screen-share session. Also: no `.env.example` exists to keep the placeholder shape discoverable without leaking the real key.
- **`NEXT_PUBLIC_*` surface** is one var: `NEXT_PUBLIC_APP_URL`. `lib/env.ts:22` types it, and all other `NEXT_PUBLIC_CLERK_*` vars are Clerk publishable keys (intentionally public). A dev who accidentally prefixes a secret with `NEXT_PUBLIC_` gets it baked into the client bundle at build time — the env schema won't catch that because the schema only validates the server-side keys it knows about. **Add a superRefine rule** that asserts no `NEXT_PUBLIC_*` env var matches the `sk-…` / `sk-ant-…` / `whsec_…` prefix patterns.

## Install-time script audit

Packages with `postinstall`/`preinstall`/`install` scripts in `node_modules`:

- `prisma` — generates engines; intended, from `package.json` `"postinstall": "prisma generate"`.
- `@prisma/engines` — downloads query engine binary; intended.
- `@clerk/shared` — build script, no code execution outside `dist/`.
- `sharp` — prebuild binary download (pulled by `@react-pdf/renderer`). Known-good.
- `unrs-resolver` — ESLint/Next-related; resolves binary. Trusted upstream.

Nothing exotic, no fresh package with an install script. `npm install --ignore-scripts` followed by explicit `prisma generate` is viable if you want to tighten further.

## License audit

`grep -rEh '"license":\s*"(AGPL|GPL-3)' node_modules/*/package.json` returns **no matches**. Core SDKs:

- `@anthropic-ai/sdk@0.88.0` — MIT
- `@clerk/nextjs@7.1.0`, `@clerk/shared@4.7.0` — MIT (the Clerk *service* has ToS, the SDK is MIT)
- `svix@1.90.0` — MIT
- `@prisma/adapter-pg@7.7.0`, `@prisma/client@7.7.0` — Apache-2.0
- `@react-pdf/renderer@4.4.1` — MIT

Clean. No copyleft leakage.

## `@prisma/adapter-pg` in production

`lib/db/prisma.ts:11-14` uses `PrismaPg` with `{ max: 1 }` on serverless. This is the new driver-adapter path — no query-engine binary shipped in the Vercel bundle (reduces function cold-start size), connection goes through node-postgres. Per-module cache (line 20) keeps the adapter alive across invocations within the same Lambda container. Correct for Neon/Vercel; documented in `wiki/query-performance.md`.

## Version freshness

| package | installed | notes |
|---|---|---|
| `@anthropic-ai/sdk` | 0.88.0 | released 2026-04-10, current |
| `@clerk/nextjs` | 7.1.0 | **upgrade to ≥7.2.1 for GHSA-vqx2-fgx2-5wq9** |
| `@clerk/shared` | 4.7.0 | **upgrade to ≥4.8.1** |
| `prisma` / `@prisma/client` | 7.7.0 | current stable |
| `svix` | 1.90.0 | current |
| `next` | 16.2.3 | current |
| `react` | 19.2.4 | current |

## Scorecard

| # | Dimension | Score | Severity of top finding |
|---|---|---|---|
| 1 | ANTHROPIC_API_KEY rotation path | 7/10 | low — works, undocumented |
| 2 | CLERK_WEBHOOK_SECRET rotation | 6/10 | low |
| 3 | DATABASE_URL rotation | 7/10 | low |
| 4 | `npm audit` findings | **3/10** | **critical — Clerk middleware bypass** |
| 5 | Renovate/Dependabot automation | 3/10 | medium — no automation |
| 6 | Anthropic SDK version freshness | 10/10 | — |
| 7 | Clerk 7.1.0 CVE | **2/10** | **critical — GHSA-vqx2-fgx2-5wq9** |
| 8 | Prisma 7.7.0 | 9/10 | — |
| 9 | Svix key-rotation API usage | 5/10 | low |
| 10 | `.env*` gitignore correctness | 10/10 | — (live key on disk, not in git) |
| 11 | `@prisma/adapter-pg` prod usage | 9/10 | — |
| 12 | Install-script surface | 8/10 | low |
| 13 | License audit | 10/10 | — |
| 14 | Accidental NEXT_PUBLIC_ secret | 6/10 | medium — no guard |

## Top 3 fixes, in order

1. **`npm audit fix`** — bumps Clerk to 7.2.1 / 4.8.1 and closes the middleware-bypass advisory. Verify `proxy.ts` still fail-closes with `npm run test:e2e` after.
2. **Add a `NEXT_PUBLIC_*` secret-shape guard** in `lib/env.ts::superRefine` — reject any `NEXT_PUBLIC_*` key whose value matches `/^(sk-|sk-ant-|whsec_|postgres:)/`.
3. **Add `.github/dependabot.yml`** with `package-ecosystem: npm`, `schedule: weekly`, `open-pull-requests-limit: 5`, `groups.security.patterns: ["*"]`. Keeps future CVE notifications in-band.

## Related

- [[security]] — env validation, PII scrub, CSP
- [[webhook-idempotency]] — Svix verify + ProcessedWebhook dedup
- [[next16-proxy]] — `instrumentation.ts` runs `env()` at boot
