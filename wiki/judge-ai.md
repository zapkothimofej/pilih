---
title: Judge AI
type: concept
---

# Judge AI

Scores the user's prompt on a 6-dimension rubric. `lib/ai/judge-ai.ts`.

## Model + settings

- `claude-sonnet-4-6`, `max_tokens: 1500`
- `temperature: 0` — scores must be reproducible. Two identical prompts must get the same rubric grade; the score is persisted and displayed back to the user.
- System prompt cached with `cache_control: ephemeral`. See [[prompt-caching]].

## Rubric (6 × 0-10)

- `specificity`
- `context`
- `role`
- `format`
- `constraints`
- `reasoning`

The LLM returns per-dimension scores plus `feedback`, `strengths`, `improvements`, `techniqueFocus`. Final displayed score is `Math.round(mean(dimensions))` — computed server-side. See [[prompt-injection]] for the verdict-recomputation rationale.

## Per-dimension UI

`components/challenge/JudgeFeedbackPopup.tsx::DimensionBars` renders each dimension as a coloured horizontal bar (green ≥7, amber ≥4, red <4) with a `role="progressbar"`. German labels: Spezifität · Kontext · Rolle · Format · Vorgaben · Begründung.

## Retry on schema error

Two attempts. On the second attempt the prior error message is included as a follow-up user turn (scrubbed + clamped to 300 chars) so the model can correct the specific thing that broke — previously a silent identical retry burning tokens.

## Types

Central types live in `lib/ai/judge-types.ts`: `JudgeDimensions`, `JudgeFeedback`, `JudgeStreamEvent`. Imported by server + `ChatInterface.tsx` + `JudgeFeedbackPopup.tsx`. Previously duplicated in three files with field-order drift.

## Related

- [[prompt-injection]] — judge envelope + nonces
- [[prompt-caching]] — system prompt cache
- [[stream-lifecycle]] — parallel launch alongside Haiku stream
- [[adaptive-difficulty]] — consumer of the mean score
