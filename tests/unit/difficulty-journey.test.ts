import { describe, it, expect } from 'vitest'
import { getNextDifficultyWithScore } from '../../lib/adaptive/difficulty'

function simulateJourney(
  startDifficulty: number,
  rounds: Array<{ rating: 'TOO_EASY' | 'JUST_RIGHT' | 'TOO_HARD'; avgScore: number | null }>
): number {
  let d = startDifficulty
  for (const r of rounds) {
    d = getNextDifficultyWithScore(d, r.rating, r.avgScore)
  }
  return d
}

describe('difficulty journey — multi-step scenarios', () => {
  it('3× TOO_EASY with high score pushes difficulty up then stabilises at max', () => {
    const final = simulateJourney(3, [
      { rating: 'TOO_EASY', avgScore: 9 },
      { rating: 'TOO_EASY', avgScore: 9 },
      { rating: 'TOO_EASY', avgScore: 9 },
    ])
    expect(final).toBe(5)
  })

  it('3× TOO_EASY with low score keeps difficulty unchanged (avgScore < 6)', () => {
    const final = simulateJourney(3, [
      { rating: 'TOO_EASY', avgScore: 4 },
      { rating: 'TOO_EASY', avgScore: 4 },
      { rating: 'TOO_EASY', avgScore: 4 },
    ])
    expect(final).toBe(3)
  })

  it('TOO_HARD journey from 4 bottoms out at 1', () => {
    const final = simulateJourney(4, [
      { rating: 'TOO_HARD', avgScore: 3 },
      { rating: 'TOO_HARD', avgScore: 3 },
      { rating: 'TOO_HARD', avgScore: 3 },
      { rating: 'TOO_HARD', avgScore: 3 },
    ])
    expect(final).toBe(1)
  })

  it('alternating TOO_EASY / TOO_HARD oscillates around start', () => {
    const d1 = simulateJourney(3, [
      { rating: 'TOO_EASY', avgScore: 8 },
      { rating: 'TOO_HARD', avgScore: 2 },
    ])
    expect(d1).toBe(3)
  })

  it('JUST_RIGHT with consistently high scores eventually reaches max', () => {
    const final = simulateJourney(1, [
      { rating: 'JUST_RIGHT', avgScore: 9 },
      { rating: 'JUST_RIGHT', avgScore: 9 },
      { rating: 'JUST_RIGHT', avgScore: 9 },
      { rating: 'JUST_RIGHT', avgScore: 9 },
    ])
    expect(final).toBe(5)
  })
})
