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
const schema = z
  .object({
    DATABASE_URL: z.string().url(),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', {
      message: 'ANTHROPIC_API_KEY must start with sk-ant-',
    }),
    // Optional in dev/testing-mode but required once Clerk is live. The
    // cross-field check below enforces presence in production.
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    // z.string().url() permits javascript: and data: schemes. We
    // concatenate this into a LinkedIn share URL; allowing anything
    // other than http(s) would be a stored-XSS vector once opened.
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url()
      .refine((u) => /^https?:\/\//.test(u), {
        message: 'NEXT_PUBLIC_APP_URL must use http(s)',
      })
      .optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Only bypass the middleware fail-closed guard from preview deploys.
    ALLOW_TESTING_AUTH: z.string().optional(),
    VERCEL_ENV: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Build phase collects page data without actually serving traffic.
    // Requiring prod-only secrets here would break `next build` in CI
    // where those secrets aren't set. instrumentation.ts re-validates
    // at actual server boot, which IS when we need the secrets.
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
    if (isBuildPhase) return

    if (
      data.NODE_ENV === 'production' &&
      data.ALLOW_TESTING_AUTH !== 'true' &&
      !data.CLERK_WEBHOOK_SECRET
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLERK_WEBHOOK_SECRET'],
        message:
          'CLERK_WEBHOOK_SECRET is required in production (unless ALLOW_TESTING_AUTH=true for a preview deploy).',
      })
    }
    // NEXT_PUBLIC_APP_URL is embedded in the LinkedIn share URL on
    // every certificate — without it the localhost fallback ships
    // to real LinkedIn posts.
    if (data.NODE_ENV === 'production' && !data.NEXT_PUBLIC_APP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['NEXT_PUBLIC_APP_URL'],
        message:
          'NEXT_PUBLIC_APP_URL is required in production — it ends up in LinkedIn share links.',
      })
    }
    // Catch a category of deploy disasters: a secret accidentally
    // prefixed with NEXT_PUBLIC_ silently lands in the client bundle.
    // Scan every NEXT_PUBLIC_* env var for secret-shaped values.
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith('NEXT_PUBLIC_')) continue
      if (typeof value !== 'string') continue
      if (SECRET_SHAPES.some((re) => re.test(value))) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} looks like a secret but is public. NEXT_PUBLIC_* values are inlined into the client bundle — rename without the prefix.`,
        })
      }
    }
  })

// Patterns that look like secrets. Conservative — we'd rather
// false-positive at boot than leak a real key to the client bundle.
const SECRET_SHAPES = [
  /^sk-[A-Za-z0-9_-]{10,}/,
  /^whsec_[A-Za-z0-9_-]{10,}/,
  /^postgres(?:ql)?:\/\//i,
  /^Bearer\s+[A-Za-z0-9._~+/=-]{20,}/i,
]

type Env = z.infer<typeof schema>

// Lazy so test runs that don't hit server code still work without
// every secret wired up.
let cached: Env | null = null

export function env(): Env {
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
