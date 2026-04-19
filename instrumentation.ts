// Next.js 16 instrumentation hook — runs once at server boot before
// any request handler. We use it to eagerly parse the env schema so a
// missing or malformed secret fails the deploy loudly instead of
// surfacing as a 401/500 on the first webhook or Anthropic call.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  // Dynamic import so the Edge runtime never pulls zod + process.env
  // validation into its bundle.
  const { env } = await import('./lib/env')
  env()
}

// Next.js 16 `onRequestError` hook — called when an uncaught error
// bubbles out of a route handler or server component. Ships to our
// structured logger so prod errors are queryable in Vercel log
// aggregation alongside the rest. Next.js's own digest is attached
// to the surfaced `error.tsx` so users + server logs can correlate.
export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string; headers?: Record<string, string> },
  context: { routerKind?: string; routePath?: string; routeType?: string }
): Promise<void> {
  const { logError } = await import('./lib/utils/log')
  logError('request-error', {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    err,
  })
}
