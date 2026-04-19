// Single source of truth for course-wide constants. Previously scattered
// across 30+ callsites as the literal "21" and 3× the XP math formula —
// a course-length change used to mean grepping and hoping.

export const COURSE_LENGTH_DAYS = 21

// Per-session XP — base + linear bonus per difficulty step. The server
// persists xpEarned at completion (xpEarned stays the source of truth
// historically), this formula is the authoritative in-flight calc.
export const XP_BASE = 100
export const XP_PER_DIFFICULTY = 20

export function xpForDifficulty(difficulty: number): number {
  return XP_BASE + (difficulty - 1) * XP_PER_DIFFICULTY
}
