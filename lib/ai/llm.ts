import type Anthropic from '@anthropic-ai/sdk'

// Strip the one-or-two sets of ``` fences Claude sometimes wraps JSON
// in despite being told not to. Tolerant of a leading language hint
// and trailing whitespace; doesn't try to rescue truly malformed output.
export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json|jsonl|ts|js)?\s*/i, '')
    .replace(/```[\s\S]*$/, '')
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
