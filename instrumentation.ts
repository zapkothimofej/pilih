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
