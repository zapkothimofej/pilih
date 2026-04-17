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
  return 100 + (diff - 1) * 20
}

export function totalXp(sessions: SessionWithChallenge[]): number {
  return sessions.reduce((acc, s) => acc + sessionXp(s), 0)
}

// Calculates consecutive-day completion streak from newest to oldest.
// `date` is compared at day granularity in local time.
export function calcStreak(sessions: Array<{ date: Date }>): number {
  if (sessions.length === 0) return 0

  const sorted = [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime())
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i].date)
    d.setHours(0, 0, 0, 0)
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    if (d.getTime() === expected.getTime()) streak++
    else break
  }
  return streak
}

// Next day to play. Derived from the highest completed dayNumber so a
// user who (through any admin intervention) has a gap still moves
// forward rather than re-playing completed days.
export function nextDayNumber(completedDayNumbers: number[]): number {
  if (completedDayNumbers.length === 0) return 1
  return Math.max(...completedDayNumbers) + 1
}
