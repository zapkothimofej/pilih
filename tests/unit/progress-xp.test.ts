import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { sessionXp, totalXp, calcStreak, nextDayNumber } from '../../lib/progress/xp'

describe('sessionXp', () => {
  it('prefers persisted xpEarned over derived fallback', () => {
    expect(
      sessionXp({
        xpEarned: 777,
        selectedChallenge: { currentDifficulty: 5 },
      })
    ).toBe(777)
  })

  it('falls back to 100 + (difficulty-1)*20 when xpEarned is null', () => {
    expect(sessionXp({ xpEarned: null, selectedChallenge: { currentDifficulty: 3 } })).toBe(140)
    expect(sessionXp({ xpEarned: null, selectedChallenge: { currentDifficulty: 1 } })).toBe(100)
    expect(sessionXp({ xpEarned: null, selectedChallenge: { currentDifficulty: 5 } })).toBe(180)
  })

  it('handles missing selectedChallenge gracefully', () => {
    expect(sessionXp({ xpEarned: null, selectedChallenge: null })).toBe(100)
  })
})

describe('totalXp', () => {
  it('sums sessionXp for every session', () => {
    expect(
      totalXp([
        { xpEarned: 100, selectedChallenge: { currentDifficulty: 1 } },
        { xpEarned: 140, selectedChallenge: { currentDifficulty: 3 } },
        { xpEarned: null, selectedChallenge: { currentDifficulty: 5 } }, // → 180
      ])
    ).toBe(420)
  })

  it('returns 0 for no sessions', () => {
    expect(totalXp([])).toBe(0)
  })
})

describe('calcStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-18T10:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('counts consecutive days back from today', () => {
    expect(
      calcStreak([
        { date: new Date('2026-04-18T08:00:00') },
        { date: new Date('2026-04-17T08:00:00') },
        { date: new Date('2026-04-16T08:00:00') },
      ])
    ).toBe(3)
  })

  it('breaks the streak on a gap', () => {
    expect(
      calcStreak([
        { date: new Date('2026-04-18T08:00:00') },
        { date: new Date('2026-04-16T08:00:00') },
      ])
    ).toBe(1)
  })

  it('returns 0 for empty list', () => {
    expect(calcStreak([])).toBe(0)
  })

  it('returns 0 when the most recent session is not today', () => {
    expect(calcStreak([{ date: new Date('2026-04-17T08:00:00') }])).toBe(0)
  })
})

describe('nextDayNumber', () => {
  it('is 1 when nothing is completed', () => {
    expect(nextDayNumber([])).toBe(1)
  })

  it('returns highest+1 so gaps move the user forward', () => {
    expect(nextDayNumber([1, 2, 4])).toBe(5)
  })

  it('handles single day', () => {
    expect(nextDayNumber([7])).toBe(8)
  })
})
