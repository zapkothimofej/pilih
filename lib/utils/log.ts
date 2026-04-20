// Structured JSON logger + scrubber. Vercel's log aggregator indexes
// JSON lines, so a JSON emitter makes every field queryable instead
// of parsing free-form strings.
//
// Scrubbing runs on every value: API keys, Postgres URLs, emails,
// Clerk IDs, Bearer tokens, and Svix signatures are redacted before
// they hit stderr.

const PATTERNS: Array<[RegExp, string]> = [
  [/sk-ant-[A-Za-z0-9\-_]{20,}/g, '<anthropic-key>'],
  [/postgres(?:ql)?:\/\/[^\s"']+/gi, '<postgres-url>'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '<email>'],
  [/\b(?:user|sess|org|org_mem|client|template)_[A-Za-z0-9]{20,}\b/g, '<clerk-id>'],
  [/(?:Bearer|bearer)\s+[A-Za-z0-9._~+/=-]{20,}/g, 'Bearer <token>'],
  [/v1,[A-Za-z0-9+/=]{20,}/g, 'v1,<sig>'],
  // JWT first — its dot-separated base64 would otherwise partially
  // collide with the generic sk-/Bearer patterns below.
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '<jwt>'],
  [/sk-[A-Za-z0-9_-]{20,}/g, '<api-key>'],
  // Credit-card-shaped runs (13–19 digits, optionally split by a single
  // space or hyphen between groups). Luhn-agnostic — we redact on shape
  // alone. Anchoring on \b avoids chewing through contiguous digit runs
  // (Clerk IDs, order numbers) that already match their own pattern.
  [/\b(?:\d[ -]?){12,18}\d\b/g, '<cc>'],
  // IBAN: ISO 13616 — 2 letters + 2 check digits + up to 30 alnum.
  [/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, '<iban>'],
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

type Level = 'error' | 'warn' | 'info'

function emit(level: Level, tag: string, args: unknown[]): void {
  // If the first arg is a plain object, merge its fields into the log
  // envelope so Vercel's JSON parser indexes them as top-level keys.
  // Otherwise fall back to an `args` array.
  const [first, ...rest] = args
  const structured =
    first && typeof first === 'object' && !Array.isArray(first) && !(first instanceof Error)
      ? (scrub(first) as Record<string, unknown>)
      : { args: args.map((a) => scrub(a)) }

  const envelope = {
    ts: new Date().toISOString(),
    level,
    tag,
    ...structured,
    ...(rest.length > 0 && first && typeof first === 'object' ? { extra: rest.map((a) => scrub(a)) } : {}),
  }
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  out(JSON.stringify(envelope))
}

export function logError(tag: string, ...args: unknown[]): void {
  emit('error', tag, args)
}

export function logInfo(tag: string, ...args: unknown[]): void {
  emit('info', tag, args)
}
