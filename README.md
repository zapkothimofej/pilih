# PILIH — 21-day KI-Führerschein

Prompt-engineering training from blanket LLM user to real prompt-engineer in 21 adaptive days. Built by [Yesterday Academy](https://yesterday.academy).

## Stack

- Next.js 16 (App Router, RSC, proxy.ts, instrumentation.ts)
- Prisma 7 + Postgres (via `@prisma/adapter-pg`)
- Anthropic SDK (Haiku 4.5 simulator + Sonnet 4.6 judge/review/generator)
- GSAP for motion, Tailwind for tokens, sonner for toasts
- Clerk (stubbed; see `wiki/auth-flow.md` for the integration path)

## Local setup

```bash
cp .env.example .env.local         # fill in DATABASE_URL + ANTHROPIC_API_KEY
npm install                        # runs `prisma generate` postinstall
docker run -d --name pilih-pg \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 postgres:17         # or point DATABASE_URL at a managed DB
npx prisma migrate dev             # applies the 5 migrations
npm run dev                        # http://localhost:3000
```

## Tasks

| script | what it does |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack |
| `npm run build` | `prisma generate && next build` |
| `npm test` | Vitest unit + integration |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright smoke |

## Wiki

Claude-maintained knowledge base in `wiki/` — start at [`wiki/index.md`](wiki/index.md). Covers security, AI pipeline, data integrity, a11y, and Next.js-16 conventions. Source of truth for architectural decisions; source files live in `raw/` and are immutable.

## Agent conventions

`CLAUDE.md` + `AGENTS.md` describe how to work in this repo with AI agents. Short version:

1. Query the knowledge graph first: `graphify query "<question>" --graph graphify-out/graph.json`.
2. Prefer `wiki/<topic>.md` over reading raw source.
3. Never edit files in `raw/` — they're immutable.

## License

Yesterday Academy — Prompt it like it's hot.
