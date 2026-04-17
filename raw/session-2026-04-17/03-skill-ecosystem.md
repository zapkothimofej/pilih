---
title: "Session 2026-04-17 — Skills Ecosystem Installation"
source_url: null
captured_at: 2026-04-17
author: Claude Opus 4.7
contributor: Thimofej Zapko
tags: [session, skills, tooling, claude-code]
---

# Skills-Ökosystem — 61 installierte Skill-Packs + Custom Skill

In dieser Session wurden **61 Skill-Packs** via `npx skills add` global installiert. Vorher waren nur GSAP-Core, -Scrolltrigger, -Timeline, -Performance, -Frameworks, -React, -Utils, -Plugins vorhanden.

## Die 61 neuen Skill-Packs

### AI/LLM-Core
- `vercel/ai` — AI SDK (streamText, generateText, Tools)
- `vercel/ai-elements` — AI UI Primitives
- `vercel/streamdown` — Streaming-optimierter Markdown-Renderer
- `anthropics/skills` + `anthropics/claude-plugins-official`
- `openai/skills`
- `google-gemini/gemini-skills` — plus `gemini-api-dev`, `gemini-live-api-dev`, `vertex-ai-api-dev`
- `huggingface/skills`
- `langchain-ai/langsmith-skills`
- `langfuse/skills` — LLM Observability
- `elevenlabs/skills` — Voice
- `vercel-labs/agent-eval` — Agent evaluation framework

### Next.js / Vercel-Stack
- `vercel/nextjs-skills`, `vercel/next-forge`
- `vercel-labs/skills`, `vercel-labs/skill-remotion-geist`
- Aktivierte Meta-Skills: `next-best-practices`, `next-cache-components`, `next-upgrade`, `vercel-react-best-practices`, `ai-sdk`, `ai-elements`, `streamdown`, `next-forge`

### Production Infra
- `upstash/skills`, `upstash/ratelimit-js`, `upstash/vector-js`, `upstash/redis-js`, `upstash/workflow-js`, `upstash/search-js`, `upstash/context7`
- `getsentry/skills`, `getsentry/sentry-for-claude`
- `posthog/skills`, `posthog/posthog-for-claude`
- `axiomhq/skills`

### Business / Email / Auth
- `stripe/agent-toolkit`, `stripe/ai`
- `resend/resend-skills`, `resend/email-skills`, `resend/design-skills`, `resend/email-best-practices`
- `clerk/skills`
- `better-auth/skills`, `better-auth/better-icons`

### Database
- `prisma/skills`
- `neondatabase/postgres-skills`
- `supabase/agent-skills`

### Dev-Quality / Bug-Finding
- `semgrep/skills` — Static Analysis
- `coderabbitai/skills` — AI PR Review
- `microsoft/playwright`, `microsoft/skills`

### Content / Creative
- `tldraw/tldraw` — Whiteboard SDK
- `remotion-dev/skills` — Video-Generation
- `makenotion/skills` — Notion
- `sanity-io/agent-toolkit` — CMS
- `figma/mcp-server-guide`
- `nuxt/ui`

### Search / Research / Browser
- `firecrawl/skills`
- `tavily-ai/skills`
- `browser-use/browser-use`, `browserbase/skills`

### Agent-Frameworks / Workflows
- `mastra-ai/skills`
- `triggerdotdev/skills`
- `livekit/agent-skills`
- `cloudflare/skills`
- `mapbox/mapbox-agent-skills`
- `runwayml/skills`
- `webflow/webflow-skills`

### Fails (URLs nicht existent)
- `langchain-ai/skills` — 404
- `vercel/skills` — 404

## Custom Skill — `/review-cool`

In derselben Session wurde `/review-cool` erstellt unter `~/.claude/skills/review-cool/SKILL.md`.

**Kernprinzip:** Dynamische Dimension-Discovery statt fixer Checkliste.
- **Phase 1:** Entdecke 15+ (Ziel 20–30) bespoke Review-Dimensionen aus dem konkreten Scope
- **Phase 2:** 3–6 Sub-Agents parallel, jeder bewertet mehrere Dimensionen mit Score 1–10 + Findings `file:line` + konkreter Fix
- **Phase 3:** Synthese-Tabelle sortiert nach Score ascending, Deep-Dive pro Dimension, priorisierte Action-List, Blind-Spots, 1-Satz-Verdict

**Scope-Modes:**
- leer → uncommitted changes
- Zahl → PR-Review via `gh pr view/diff`
- SHA/Range → Commit-Review
- Pfad → Scoped-Review
- "all" → ganze Codebase

Distinction zu eingebautem `/review`: `/review-cool` hat KEINE fixen Kategorien. Dimensionen emergieren aus dem Code.

## Global CLAUDE.md Update

`~/.claude/CLAUDE.md` wurde gepatcht: Sektion „Agents & Tool Calls" fordert jetzt explizit MAXIMAL Parallelisierung — auch >3 Agents, auch 5/6/7+ simultan in einem Message-Turn. Regel: wenn zwei Dinge nicht voneinander abhängen → parallel, keine Ausnahme.

## Token-Implikation

- Skills laden nur Description (~100–500 Tokens pro Skill) als System-Reminder
- 70 Skills × ~300 Tokens = ~21k Tokens per Session-Start nur fürs Skill-Listing
- Plus Memory-Index + CLAUDE.md + Environment ≈ 35–45k Tokens Basis
- Vollständiges `SKILL.md` wird nur beim Invoken via Skill-Tool geladen
- Cost: ~$0.15 pro fresh Session (Opus input), ~$0.015 mit Prompt-Cache (TTL 5min)
