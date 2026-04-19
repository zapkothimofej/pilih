import type Anthropic from '@anthropic-ai/sdk'

// Strip the one-or-two sets of ``` fences Claude sometimes wraps JSON
// in despite being told not to. Matches only a trailing fence at the
// very end (anchored with $) so a fence that appears inside a string
// value — e.g. a user echoing a triple-backtick into feedback — doesn't
// get greedy-eaten down to the final closing fence.
export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json|jsonl|ts|js)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

// Pull the first text content block. Claude can emit thinking +
// tool_use + text in any order, so indexing [0] breaks the moment we
// turn on extended thinking or any tool. Throws if the response has
// no text block at all (truncation at max_tokens leaves an empty or
// malformed shape that we want to surface rather than silently
// degrade).
export function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text')
  if (!block) {
    throw new Error('Keine Textantwort im LLM-Response')
  }
  return (block as { type: 'text'; text: string }).text
}

// Fail loudly when the model stopped because it hit max_tokens — the
// downstream JSON.parse will crash anyway, but with a useless message.
// Callers should catch this and decide whether to retry with a higher
// budget.
export function assertNotTruncated(message: Anthropic.Message): void {
  if (message.stop_reason === 'max_tokens') {
    throw new Error('LLM-Antwort wurde durch max_tokens abgeschnitten')
  }
}

// Anthropic SDK error classification. 529 overloaded → retry with
// backoff; 429 rate-limit → backoff longer; 400-series → abort (no
// point retrying bad inputs); 401/403 → page (config problem).
export type AnthropicErrorClass = 'retry' | 'backoff' | 'abort' | 'page'

export function classifyAnthropic(err: unknown): AnthropicErrorClass {
  const status = typeof err === 'object' && err && 'status' in err
    ? (err as { status?: unknown }).status
    : undefined
  if (status === 529) return 'retry'
  if (status === 429) return 'backoff'
  if (status === 401 || status === 403) return 'page'
  if (typeof status === 'number' && status >= 400 && status < 500) return 'abort'
  return 'retry'
}

// Sums Haiku + Sonnet usage into a single flat shape suitable for
// PromptAttempt persistence. Accepts Anthropic.Message[] so the
// attempt route can pass both the stream finalMessage and the judge
// message without constructing an array manually.
export function sumUsage(messages: Array<Anthropic.Message | null | undefined>): {
  tokensIn: number
  tokensOut: number
  cacheReadTokens: number
  cacheCreateTokens: number
} {
  let tokensIn = 0
  let tokensOut = 0
  let cacheReadTokens = 0
  let cacheCreateTokens = 0
  for (const m of messages) {
    const u = m?.usage
    if (!u) continue
    tokensIn += u.input_tokens ?? 0
    tokensOut += u.output_tokens ?? 0
    cacheReadTokens += u.cache_read_input_tokens ?? 0
    cacheCreateTokens += u.cache_creation_input_tokens ?? 0
  }
  return { tokensIn, tokensOut, cacheReadTokens, cacheCreateTokens }
}
