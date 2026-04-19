---
title: "PILIH — Wiki Index"
type: index
---

# PILIH — Wiki

Claude-maintained knowledge base for PILIH, the 21-day KI-Führerschein. Cross-linked markdown pages distilled from review sessions + conversations. Raw source materials live in `../raw/`.

## Topics

### Security & Correctness
- [[security]] — env validation, CSP, PII scrub, CSRF, XML envelope
- [[prompt-injection]] — judge envelope, nonces, server-side verdict recomputation
- [[auth-flow]] — testing-mode stub, fail-closed proxy, Clerk integration path
- [[csrf-origin-guard]] — same-origin helper + applied routes
- [[data-integrity]] — unique constraints, transactions, race conditions, cleanup jobs

### AI Pipeline
- [[judge-ai]] — per-dim rubric, temperature=0, prompt caching
- [[challenge-ai]] — generator + chat simulator, cached challenge block
- [[prompt-caching]] — ephemeral markers, TTL alignment, cache-breakpoint rules
- [[adaptive-difficulty]] — hysteresis, seeded daily shuffle, clamp ranges
- [[stream-lifecycle]] — abort propagation, controller.close race, drop-bubble recovery

### UX & A11y
- [[reduced-motion]] — hook, global CSS, streaming indicator fallback
- [[gsap-patterns]] — useGSAP scope, cleanup, SSR hydration considerations
- [[a11y-patterns]] — tap-small, focus management, radiogroup, aria-invalid
- [[copy-tonality]] — du-first voice, tagline usage, error-message warmth

### Infrastructure
- [[next16-proxy]] — rename from middleware, instrumentation.ts, maxDuration
- [[rate-limiting]] — Postgres bucket, reset-race guard, lazy cleanup
- [[webhook-idempotency]] — svix skew asymmetry, ProcessedWebhook TTL

## How this works

- `../raw/` — Immutable source materials (articles, PDFs, transcripts, decisions).
- `./` (wiki/) — Claude-maintained, cross-linked pages distilled from raw + conversations.
- `../log.md` — Chronological record of ingests, queries, and session summaries.
- `../graphify-out/` — The knowledge graph. Claude queries this BEFORE re-reading files.

Open this folder as an Obsidian vault to browse with graph view + backlinks.
