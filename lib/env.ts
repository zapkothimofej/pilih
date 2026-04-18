import { z } from 'zod'

/**
 * Server-side env schema. Importing `env` from here instead of reaching
 * into process.env gives us a single choke-point where missing or
 * malformed secrets fail loudly at boot rather than with a cryptic
 * "undefined is not a function" deep inside an API handler.
 *
 * NEXT_PUBLIC_ vars are kept optional-but-typed because build-time
 * replacement handles them independently; we validate them here purely
 * to catch typos in code that reads them off process.env.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', {
    message: 'ANTHROPIC_API_KEY must start with sk-ant-',
  }),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

// Lazy so test runs that don't hit server code still work without
// every secret wired up.
let cached: z.infer<typeof schema> | null = null

export function env(): z.infer<typeof schema> {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    // Format into a readable summary, then throw so the server refuses
    // to answer requests rather than falling back to stringified
    // undefined and leaking weird errors to clients.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  cached = parsed.data
  return cached
}
