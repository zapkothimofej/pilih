import type { DifficultyRating } from '@/app/generated/prisma/client'

export function getNextDifficulty(
  current: number,
  rating: DifficultyRating
): number {
  if (rating === 'TOO_EASY') return Math.min(current + 1, 5)
  if (rating === 'TOO_HARD') return Math.max(current - 1, 1)
  return current
}

export function selectDailyChallenges<T extends { difficulty: number; id: string }>(
  available: T[],
  targetDifficulty: number,
  count = 3
): T[] {
  // Priorität: exakte Schwierigkeit → ±1 → Rest
  const exact = available.filter((c) => c.difficulty === targetDifficulty)
  const adjacent = available.filter(
    (c) =>
      Math.abs(c.difficulty - targetDifficulty) === 1 &&
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
