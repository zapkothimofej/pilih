import { describe, it, expect } from 'vitest'
import { getNextDifficulty, getNextDifficultyWithScore, selectDailyChallenges } from '../../lib/adaptive/difficulty'

describe('getNextDifficulty', () => {
  it('increases difficulty on TOO_EASY', () => {
    expect(getNextDifficulty(2, 'TOO_EASY')).toBe(3)
  })

  it('decreases difficulty on TOO_HARD', () => {
    expect(getNextDifficulty(3, 'TOO_HARD')).toBe(2)
  })

  it('keeps difficulty on JUST_RIGHT', () => {
    expect(getNextDifficulty(3, 'JUST_RIGHT')).toBe(3)
  })

  it('does not exceed max difficulty of 5', () => {
    expect(getNextDifficulty(5, 'TOO_EASY')).toBe(5)
  })

  it('does not go below min difficulty of 1', () => {
    expect(getNextDifficulty(1, 'TOO_HARD')).toBe(1)
  })
})

describe('selectDailyChallenges', () => {
  // The selector now keys on `currentDifficulty` (adaptive value). Mirror it
  // to `difficulty` here so the existing assertions still map 1:1.
  const challenges = [
    { id: 'a', difficulty: 1, currentDifficulty: 1 },
    { id: 'b', difficulty: 2, currentDifficulty: 2 },
    { id: 'c', difficulty: 2, currentDifficulty: 2 },
    { id: 'd', difficulty: 3, currentDifficulty: 3 },
    { id: 'e', difficulty: 4, currentDifficulty: 4 },
    { id: 'f', difficulty: 5, currentDifficulty: 5 },
  ]

  it('returns exactly 3 challenges by default', () => {
    const result = selectDailyChallenges(challenges, 2)
    expect(result).toHaveLength(3)
  })

  it('returns exact difficulty matches first', () => {
    const result = selectDailyChallenges(challenges, 2, 2)
    const ids = result.map(c => c.id)
    // Both exact-difficulty items (b, c) should be included
    expect(ids).toContain('b')
    expect(ids).toContain('c')
  })

  it('returns adjacent difficulty when not enough exact matches', () => {
    const result = selectDailyChallenges(challenges, 4, 3)
    const difficulties = result.map(c => c.difficulty)
    // Should include difficulty 4 (exact), 3 and 5 (adjacent)
    expect(difficulties).toContain(4)
  })

  it('returns no more than available challenges', () => {
    const small = [{ id: 'x', difficulty: 3, currentDifficulty: 3 }]
    const result = selectDailyChallenges(small, 3, 3)
    expect(result).toHaveLength(1)
  })

  it('returns no duplicates', () => {
    const result = selectDailyChallenges(challenges, 2, 3)
    const ids = result.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getNextDifficultyWithScore', () => {
  // 1. avgScore null → falls back to getNextDifficulty
  it('falls back to getNextDifficulty on null avgScore — TOO_EASY', () => {
    expect(getNextDifficultyWithScore(2, 'TOO_EASY', null)).toBe(getNextDifficulty(2, 'TOO_EASY'))
  })

  it('falls back to getNextDifficulty on null avgScore — TOO_HARD', () => {
    expect(getNextDifficultyWithScore(3, 'TOO_HARD', null)).toBe(getNextDifficulty(3, 'TOO_HARD'))
  })

  it('falls back to getNextDifficulty on null avgScore — JUST_RIGHT', () => {
    expect(getNextDifficultyWithScore(3, 'JUST_RIGHT', null)).toBe(getNextDifficulty(3, 'JUST_RIGHT'))
  })

  // 2. TOO_EASY + avgScore >= 6 → increases
  it('TOO_EASY with avgScore >= 6 increases difficulty', () => {
    expect(getNextDifficultyWithScore(3, 'TOO_EASY', 7)).toBe(4)
  })

  // 3. TOO_EASY + avgScore < 6 → keeps current
  it('TOO_EASY with avgScore < 6 keeps difficulty unchanged', () => {
    expect(getNextDifficultyWithScore(3, 'TOO_EASY', 5)).toBe(3)
  })

  // 4. TOO_HARD → decreases regardless of avgScore
  it('TOO_HARD with high avgScore (9) still decreases difficulty', () => {
    expect(getNextDifficultyWithScore(3, 'TOO_HARD', 9)).toBe(2)
  })

  it('TOO_HARD with low avgScore (2) decreases difficulty', () => {
    expect(getNextDifficultyWithScore(3, 'TOO_HARD', 2)).toBe(2)
  })

  // 5. JUST_RIGHT + avgScore >= 8 → increases
  it('JUST_RIGHT with avgScore >= 8 increases difficulty', () => {
    expect(getNextDifficultyWithScore(3, 'JUST_RIGHT', 8)).toBe(4)
  })

  // 6. JUST_RIGHT + avgScore <= 4 → decreases
  it('JUST_RIGHT with avgScore <= 4 decreases difficulty', () => {
    expect(getNextDifficultyWithScore(3, 'JUST_RIGHT', 4)).toBe(2)
  })

  // 7. JUST_RIGHT + avgScore = 5 (middle) → stays
  it('JUST_RIGHT with avgScore = 5 keeps difficulty unchanged', () => {
    expect(getNextDifficultyWithScore(3, 'JUST_RIGHT', 5)).toBe(3)
  })

  // 8. JUST_RIGHT + avgScore = 7 (middle) → stays
  it('JUST_RIGHT with avgScore = 7 keeps difficulty unchanged', () => {
    expect(getNextDifficultyWithScore(3, 'JUST_RIGHT', 7)).toBe(3)
  })

  // 9. Clamp: current=5, TOO_EASY, avgScore=9 → stays at 5 (max)
  it('clamps to max 5 when already at top and TOO_EASY with high avgScore', () => {
    expect(getNextDifficultyWithScore(5, 'TOO_EASY', 9)).toBe(5)
  })

  // 10. Clamp: current=1, TOO_HARD, avgScore=5 → stays at 1 (min)
  it('clamps to min 1 when already at bottom and TOO_HARD', () => {
    expect(getNextDifficultyWithScore(1, 'TOO_HARD', 5)).toBe(1)
  })

  // 11. Boundary: avgScore=6, TOO_EASY → increases (exactly at threshold)
  it('TOO_EASY with avgScore exactly 6 increases difficulty (boundary)', () => {
    expect(getNextDifficultyWithScore(3, 'TOO_EASY', 6)).toBe(4)
  })

  // 12. Boundary: avgScore=5.9, TOO_EASY → keeps current (just below threshold)
  it('TOO_EASY with avgScore 5.9 keeps difficulty unchanged (just below boundary)', () => {
    expect(getNextDifficultyWithScore(3, 'TOO_EASY', 5.9)).toBe(3)
  })
})
