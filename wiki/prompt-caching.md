---
title: Anthropic Prompt Caching
type: concept
---

# Prompt Caching

Cuts Anthropic spend ~40% on high-frequency static prefixes (judge + submission + chat simulator).

## What's cached

Three system prompts marked with `cache_control: { type: 'ephemeral' }`:

- `JUDGE_SYSTEM_PROMPT` (~1200 tokens) — `lib/ai/judge-ai.ts`
- `REVIEW_SYSTEM_PROMPT` (~900 tokens) — `app/api/submission/route.ts`
- `CHAT_SYSTEM_PROMPT` + per-challenge block — `lib/ai/challenge-ai.ts::streamChallengeResponse`
- `GENERATOR_SYSTEM_PROMPT` — `lib/ai/challenge-ai.ts::generateChallenges` (cached but low ROI since gated to 1-3 calls per user lifetime)

## Cache breakpoint rules

- Static content only inside the cached block. The random tag (`eval-${hex}`) that used to live in `CHAT_SYSTEM_PROMPT` broke the cache on every call — now it lives in a separate cached system block (which uses its own random nonce but caches for the 5-min window of a single session).
- Retry feedback travels in an additional user turn, never in the system prompt.
- All three `extractText` callsites accept the Anthropic SDK's richer `.content` array shape (thinking blocks, tool_use, text) — caching doesn't break future extended-thinking support.

## TTL alignment

Anthropic ephemeral cache is 5 min. Judge runs up to 20×/hr/user. A user who pauses 6+ minutes between attempts evicts and pays a 25% write premium on re-entry. Cross-user reuse carries the bulk of the hit rate on a populated service.

## Observability gap

`message.usage.cache_read_input_tokens` and `.cache_creation_input_tokens` are returned by the SDK on every response but not logged today. A future hardening should persist these per-attempt so hit rate is measurable empirically.

## Related

- [[judge-ai]] — cached rubric
- [[challenge-ai]] — cached generator + simulator
- [[security]] — env validation that backs ANTHROPIC_API_KEY
