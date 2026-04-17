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
 *   TOO_EASY   → +1 base, but never raise if avgScore < 6 (user is struggling)
 *   TOO_HARD   → -1 base
 *   JUST_RIGHT → +1 if avgScore >= 8 (user is nailing it), -1 if avgScore <= 4, else 0
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
  if (avgScore >= 8) return clamp(current + 1)
  if (avgScore <= 4) return clamp(current - 1)
  return current
}

export function selectDailyChallenges<T extends { difficulty: number; currentDifficulty: number; id: string }>(
  available: T[],
  targetDifficulty: number,
  count = 3
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

  const pool = [...shuffle(exact), ...shuffle(adjacent), ...shuffle(rest)]
  return pool.slice(0, count)
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
