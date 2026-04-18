import type { DifficultyRating } from '@/app/generated/prisma/client'

export function getNextDifficulty(
  current: number,
  rating: DifficultyRating
): number {
  if (rating === 'TOO_EASY') return Math.min(current + 1, 5)
  if (rating === 'TOO_HARD') return Math.max(current - 1, 1)
  return current
}

/**
 * Combined difficulty adjustment using both user self-rating and judge score.
 *
 * Rules:
 *   TOO_EASY   → +1 base, but never raise if avgScore < 6 (user is struggling).
 *   TOO_HARD   → -1 base.
 *   JUST_RIGHT → +1 only when avgScore >= 9 (user is mastering, not just passing),
 *                -1 if avgScore <= 3, else 0. The 9-threshold keeps JUST_RIGHT
 *                from being degenerate with TOO_EASY (both used to promote at
 *                avgScore >= 8, giving the user no way to stay put while
 *                scoring well).
 *
 * avgScore is the mean judge score (1–10) over the user's attempts for the
 * current challenge. When no attempts exist, we fall back to rating-only.
 */
export function getNextDifficultyWithScore(
  current: number,
  rating: DifficultyRating,
  avgScore: number | null
): number {
  const clamp = (v: number) => Math.min(5, Math.max(1, v))

  if (avgScore == null) return getNextDifficulty(current, rating)

  if (rating === 'TOO_EASY') {
    return avgScore < 6 ? current : clamp(current + 1)
  }
  if (rating === 'TOO_HARD') {
    return clamp(current - 1)
  }
  // JUST_RIGHT
  if (avgScore >= 9) return clamp(current + 1)
  if (avgScore <= 3) return clamp(current - 1)
  return current
}

export function selectDailyChallenges<T extends { difficulty: number; currentDifficulty: number; id: string }>(
  available: T[],
  targetDifficulty: number,
  count = 3,
  seed?: string
): T[] {
  // Priorität: exakte Schwierigkeit → ±1 → Rest.
  // Adaptive value (`currentDifficulty`) is what the adaptive loop writes; the
  // static `difficulty` is the generator's original grade and stays untouched.
  const exact = available.filter((c) => c.currentDifficulty === targetDifficulty)
  const adjacent = available.filter(
    (c) =>
      Math.abs(c.currentDifficulty - targetDifficulty) === 1 &&
      !exact.find((e) => e.id === c.id)
  )
  const rest = available.filter(
    (c) => !exact.find((e) => e.id === c.id) && !adjacent.find((a) => a.id === c.id)
  )

  // A deterministic shuffle keyed by `seed` (callers pass
  // `${userId}:${YYYY-MM-DD}`) means "today's challenges" stays stable
  // across reloads and serverless instances — previously a refresh
  // re-ran Math.random and presented a different set.
  const rng = seed ? mulberry32(hashSeed(seed)) : Math.random
  const pool = [
    ...shuffle(exact, rng),
    ...shuffle(adjacent, rng),
    ...shuffle(rest, rng),
  ]
  return pool.slice(0, count)
}

// Deterministic xmas-tree-simple PRNG. Suitable for shuffling N<50 items;
// not cryptographically strong, not meant to be.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
