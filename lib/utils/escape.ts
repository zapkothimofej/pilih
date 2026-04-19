// User-supplied strings get embedded verbatim inside XML-ish envelopes sent to
// the LLM (e.g. <user_prompt>…</user_prompt>). Without escaping, a user can
// close the tag early and inject sibling elements to steer the judge. We only
// need text-node escaping here — no attributes.
//
// Control characters below 0x20 (except TAB/LF/CR) are forbidden in XML 1.0
// and may be treated as tokenizer boundaries or truncation markers by the
// LLM's input pipeline. We also strip zero-width/format characters — these
// are invisible to a human reviewer but do influence LLM attention, letting
// a careful attacker hide steering tokens inside what appears to be innocent
// text (steganographic prompt injection).
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C]/g

export function escapeXmlText(s: string): string {
  return s
    .replace(CONTROL_CHARS, '')
    .replace(INVISIBLE_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
