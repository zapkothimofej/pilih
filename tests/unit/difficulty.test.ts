import { describe, it, expect } from 'vitest'
import { getNextDifficulty, selectDailyChallenges } from '../../lib/adaptive/difficulty'

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
  const challenges = [
    { id: 'a', difficulty: 1 },
    { id: 'b', difficulty: 2 },
    { id: 'c', difficulty: 2 },
    { id: 'd', difficulty: 3 },
    { id: 'e', difficulty: 4 },
    { id: 'f', difficulty: 5 },
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
    const small = [{ id: 'x', difficulty: 3 }]
    const result = selectDailyChallenges(small, 3, 3)
    expect(result).toHaveLength(1)
  })

  it('returns no duplicates', () => {
    const result = selectDailyChallenges(challenges, 2, 3)
    const ids = result.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
