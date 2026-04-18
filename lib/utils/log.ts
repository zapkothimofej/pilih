// Scrub secrets and common PII shapes out of anything that flows into
// stderr. Vercel log aggregation indexes these, so a single stray object
// dump of a Prisma error or Clerk webhook payload is enough to leak
// email, API keys, or the DB connection string.
const PATTERNS: Array<[RegExp, string]> = [
  [/sk-ant-[A-Za-z0-9\-_]{20,}/g, '<anthropic-key>'],
  [/postgres(?:ql)?:\/\/[^\s"']+/gi, '<postgres-url>'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '<email>'],
]

function scrubString(s: string): string {
  let out = s
  for (const [re, replacement] of PATTERNS) out = out.replace(re, replacement)
  return out
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 3) return value
  if (typeof value === 'string') return scrubString(value)
  if (value instanceof Error) return scrubString(value.message)
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

export function logWarn(tag: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[${tag}]`, ...args.map((a) => scrub(a)))
  }
}
