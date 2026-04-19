---
title: Adaptive Difficulty
type: concept
---

# Adaptive Difficulty

Combines user self-rating + LLM judge score to adjust the challenge pool's `currentDifficulty` per completion. `lib/adaptive/difficulty.ts`.

## Rules

Inputs: `rating: TOO_EASY | JUST_RIGHT | TOO_HARD`, `avgScore: 1-10 | null`.

- `TOO_EASY`: +1 step, but NEVER raise if avgScore < 6 (user is struggling despite feeling it's easy).
- `TOO_HARD`: -1 step.
- `JUST_RIGHT` + avgScore ≥ 9: +1 (user is mastering, not just passing).
- `JUST_RIGHT` + avgScore ≤ 3: -1.
- `JUST_RIGHT` mid-range: stays.

Previously `JUST_RIGHT + avgScore ≥ 8` auto-promoted, which was degenerate with `TOO_EASY + avgScore ≥ 6` — a user had no way to stay put while still scoring well.

All branches clamp to [1,5] (backed by a CHECK constraint — see [[data-integrity]]).

## Delta propagation

`app/api/challenges/[id]/abschliessen/route.ts` computes `delta = nextDifficulty - currentDifficulty` and applies it to ALL incomplete challenges via raw SQL with `LEAST(5, GREATEST(1, currentDifficulty + delta))`. The generator's difficulty distribution is preserved (relative deltas), not collapsed to a single value.

The read + write happens inside the same transaction so adjacent concurrent completions can't drift the computation.

## Daily shuffle seed

`selectDailyChallenges(available, target, count, seed)` uses a deterministic `mulberry32` PRNG seeded by `${userId}:${YYYY-MM-DD}`. Refreshing "today's challenges" shows the same three cards across the day; non-deterministic `Math.random()` used to re-roll on every hit.

## Related

- [[judge-ai]] — source of avgScore
- [[data-integrity]] — CHECK constraints
- [[stream-lifecycle]] — attempt completion triggers the delta
