// User-supplied strings get embedded verbatim inside XML-ish envelopes sent to
// the LLM (e.g. <user_prompt>…</user_prompt>). Without escaping, a user can
// close the tag early and inject sibling elements to steer the judge. We only
// need text-node escaping here — no attributes.
//
// Control characters below 0x20 (except TAB/LF/CR) are forbidden in XML 1.0
// and may be treated as tokenizer boundaries or truncation markers by the
// LLM's input pipeline, so we strip them rather than escaping.
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

export function escapeXmlText(s: string): string {
  return s
    .replace(CONTROL_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
