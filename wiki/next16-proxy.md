---
title: Next.js 16 Proxy + Instrumentation
type: concept
---

# Next.js 16 Proxy + Instrumentation

Two Next-16-specific conventions that the codebase follows.

## `proxy.ts` replaces `middleware.ts`

Next 16 deprecated the `middleware.ts` filename in favour of `proxy.ts`. The proxy runs on the **nodejs** runtime (not edge), which means imports from `@/lib/*` are safe — no edge-runtime bundling caveats.

File: `/proxy.ts`. The fail-closed test-mode check is hoisted to module scope so `process.env` is read once on cold start, not per request.

Excludes `/api/webhooks/*` from the matcher so Clerk/svix-signed POSTs still reach their handlers while the test-mode guard is active. Those endpoints authenticate via signature, not session.

## `instrumentation.ts` eagerly validates env

The Next 16 instrumentation hook runs once at server boot, before any request handler. We use it to call `env()` so a misconfigured deploy fails loudly in the deploy log instead of surfacing as a 401 on the first Anthropic call.

```ts
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { env } = await import('./lib/env')
  env()
}
```

Dynamic import so the edge runtime doesn't pull zod into its bundle.

## `maxDuration` on LLM routes

Vercel's default function timeout (10s hobby, 15s pro) is shorter than Anthropic's typical latency (15-40s for Sonnet). Four routes export `maxDuration: 60`:

- `app/api/challenges/generate/route.ts`
- `app/api/challenges/[id]/attempt/route.ts`
- `app/api/submission/route.ts`
- `app/api/zertifikat/pdf/route.tsx` (45s — react-pdf rendering)

Without these, the LLM happy path silently 504s in production.

## React `cache()` on auth helper

`getCurrentDbUser` is wrapped in `cache()` from react so a single RSC render tree with layout + page + nested components only hits Prisma once. See [[auth-flow]].

## Related

- [[auth-flow]] — testing-mode integration
- [[security]] — env validation backed by this instrumentation hook
