import { xpForDifficulty } from '@/lib/constants'

export { xpForDifficulty }

type SessionWithChallenge = {
  xpEarned: number | null
  selectedChallenge: { currentDifficulty: number } | null
}

// XP for a finished session. Prefer the value persisted when the user
// completed the challenge (xpEarned) so it never drifts when an adaptive
// retune later changes currentDifficulty on pending challenges.
export function sessionXp(session: SessionWithChallenge): number {
  if (session.xpEarned != null) return session.xpEarned
  const diff = session.selectedChallenge?.currentDifficulty ?? 1
  return xpForDifficulty(diff)
}

export function totalXp(sessions: SessionWithChallenge[]): number {
  return sessions.reduce((acc, s) => acc + sessionXp(s), 0)
}

// Calculates consecutive-day completion streak from newest to oldest.
// Uses UTC calendar day — session.date is stored in UTC, and comparing
// at local midnight made the streak skip any session completed near
// the 00:00-local boundary (a Berlin 01:00-local session lands on the
// previous UTC day, so local-day comparison reads the wrong bucket).
// DST transitions are also neutralised because UTC days are exactly
// 86 400 000 ms.
const DAY_MS = 86_400_000

function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function calcStreak(sessions: Array<{ date: Date }>): number {
  if (sessions.length === 0) return 0

  const todayDay = utcDayStart(new Date())
  const uniqueDays = new Set<number>()
  for (const s of sessions) uniqueDays.add(utcDayStart(s.date))

  let streak = 0
  for (let i = 0; uniqueDays.has(todayDay - i * DAY_MS); i++) streak++
  return streak
}

// Next day to play. Derived from the highest completed dayNumber so a
// user who (through any admin intervention) has a gap still moves
// forward rather than re-playing completed days.
export function nextDayNumber(completedDayNumbers: number[]): number {
  if (completedDayNumbers.length === 0) return 1
  return Math.max(...completedDayNumbers) + 1
}

// Single source of truth for level math. Changing XP_PER_LEVEL here
// ripples through Dashboard XPBar, Admin views, and any future
// level-based UI without hunting literals.
export const XP_PER_LEVEL = 500

export function xpLevel(xp: number): {
  level: number
  xpInLevel: number
  xpToNext: number
  progress: number
} {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL
  const xpToNext = XP_PER_LEVEL - xpInLevel
  const progress = xpInLevel / XP_PER_LEVEL
  return { level, xpInLevel, xpToNext, progress }
}

// Average judgeScore across all scored attempts. One shared helper so
// fortschritt, certificate page, and PDF don't drift.
export function averageScore(attempts: Array<{ judgeScore: number }>): number {
  if (attempts.length === 0) return 0
  return attempts.reduce((acc, a) => acc + a.judgeScore, 0) / attempts.length
}
