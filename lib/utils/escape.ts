// User-supplied strings get embedded verbatim inside XML-ish envelopes sent to
// the LLM (e.g. <user_prompt>…</user_prompt>). Without escaping, a user can
// close the tag early and inject sibling elements to steer the judge. We only
// need text-node escaping here — no attributes.
export function escapeXmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
