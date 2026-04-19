// German number/decimal/date formatters. Single source of truth so a
// future de-AT or de-CH locale swap touches one file, not twenty.

export const DE_LOCALE = 'de-DE' as const

const INT_FORMATTER = new Intl.NumberFormat(DE_LOCALE)

const SCORE_FORMATTER = new Intl.NumberFormat(DE_LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatInt(n: number): string {
  return INT_FORMATTER.format(n)
}

// 0–10 judge-style score, one decimal place, comma separator. Previously
// every callsite did `.toFixed(1)` which emits `7.3` — German expects `7,3`.
export function formatScore(n: number): string {
  return SCORE_FORMATTER.format(n)
}

// "Tag" vs "Tage" — the streak stat said "Tage" even for streak=1.
export function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm
}
