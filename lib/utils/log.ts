// Scrub secrets and common PII shapes out of anything that flows into
// stderr. Vercel log aggregation indexes these, so a single stray object
// dump of a Prisma error or Clerk webhook payload is enough to leak
// email, API keys, or the DB connection string.
const PATTERNS: Array<[RegExp, string]> = [
  [/sk-ant-[A-Za-z0-9\-_]{20,}/g, '<anthropic-key>'],
  [/postgres(?:ql)?:\/\/[^\s"']+/gi, '<postgres-url>'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '<email>'],
  // Clerk user/session/org IDs — leak from webhook error payloads
  // where Prisma echoes `meta.target` / `meta.cause` verbatim.
  [/\b(?:user|sess|org|org_mem|client|template)_[A-Za-z0-9]{20,}\b/g, '<clerk-id>'],
  // Bearer-style auth headers (Clerk, Vercel, internal)
  [/(?:Bearer|bearer)\s+[A-Za-z0-9._~+/=-]{20,}/g, 'Bearer <token>'],
  // Svix webhook signature header values
  [/v1,[A-Za-z0-9+/=]{20,}/g, 'v1,<sig>'],
  // Anthropic API keys show a "shape" prefix beyond sk-ant — catch
  // the broader admin / org / session variants emitted on dashboard.
  [/sk-[A-Za-z0-9_-]{20,}/g, '<api-key>'],
]

export function scrubString(s: string): string {
  let out = s
  for (const [re, replacement] of PATTERNS) out = out.replace(re, replacement)
  return out
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 5) return value
  if (typeof value === 'string') return scrubString(value)
  if (value instanceof Error) {
    // Include stack so Prisma/Clerk errors (which pack the offending
    // value into the stack frame) also get scrubbed, and keep error
    // shape so downstream log aggregators can still group by name.
    return {
      name: value.name,
      message: scrubString(value.message),
      stack: value.stack ? scrubString(value.stack) : undefined,
    }
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = scrub(v, depth + 1)
    return out
  }
  return value
}

export function logError(tag: string, ...args: unknown[]): void {
  console.error(`[${tag}]`, ...args.map((a) => scrub(a)))
}
