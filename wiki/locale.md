---
title: Locale, Date, Number
type: concept
---

# Locale, Date, Number

PILIH is German-only today. Every locale-touching call site is hardcoded to
`de-DE`. The product intentionally has no runtime locale toggle — the only
exception is the certificate, which offers a `de` / `en` view of the diploma
text.

## Hard rules

- **Single locale token:** `'de-DE'` for `Intl.*`, `toLocaleDateString`,
  `toLocaleTimeString`. No bare `toLocaleDateString()` calls — the user's
  browser locale must never leak into the UI.
- **UTC calendar day for streaks.** `lib/progress/xp.ts::calcStreak` uses
  `Date.UTC(...)` buckets so sessions completed near the Berlin midnight
  boundary don't skip a day. DST transitions are neutralised because UTC
  days are exactly 86 400 000 ms. See [[data-integrity]].
- **`datetime-local` is in LOCAL wall time** — the booking form builds its
  min-string via `d.getFullYear()` / `getMonth()` / etc. (NOT
  `toISOString().slice(0,16)`) so the "min = now + 60 min" threshold is
  correct regardless of the user's timezone. The submitted value is
  converted to UTC via `new Date(scheduledAt).toISOString()` before the API
  call so the server stores a single canonical instant.
- **Thousands separator:** `Intl.NumberFormat('de-DE')` emits `1.234` with
  a period — used by `AnimatedNumber`. Direct `{xp}` interpolation does not
  format; all numeric counters funnel through `AnimatedNumber` so there is
  no drift between Dashboard, Admin, and Fortschritt.
- **Currency:** prices are frozen strings (`'399 €'`, `'499 €'`, `'999 €'`)
  with a regular space between the amount and the glyph. Use a narrow
  non-breaking space (U+202F) if the `€` ever line-wraps on narrow mobile
  breakpoints.

## Central helpers (intentional absence)

There is no `lib/utils/format.ts`. The three call-site patterns are:

1. Booking list: `weekday: 'short'` + `hour: '2-digit'` + `minute: '2-digit'`
   → `BuchungClient.formatDate`.
2. Admin + settings list: date-only → inline `toLocaleDateString('de-DE')`.
3. Certificate: `month: 'long'` → either DE or EN based on the in-card
   language toggle.

Each has slightly different options. Introducing a shared helper would force
a callback style that obscures the intent at every site, so the
format options are kept inline. The `'de-DE'` literal is the shared
contract.

## Pluralisation

German plural rules are simple enough that we bake them into the strings:
`Tage` is used everywhere except the "21 Tage" composite noun phrase
(always plural). There is no `{n} Tag|Tage` switch anywhere because the
only count surfaces that vary are `0/21`, `N/21`, or `21/21` — the label
`Tage` reads correctly for any N including 0 and 1 in this framing
("3/21 Tage abgeschlossen", never "1 Tag abgeschlossen").

One exception worth knowing: `streak` in `StreakCounter` is rendered as a
single number with `Streak` label below it, no `Tag/Tage` suffix. The
`fortschritt` page labels the streak stat `unit: 'Tage'` which is wrong for
`streak === 1` but reads as idiomatic German telegraphic ("3 Tage" ≈
"3-day streak"), so it is not bug-worthy.

## Sort & collation

- Admin list `orderBy: { createdAt: 'desc' }` — timestamp sort, locale-free.
- Sessions `orderBy: { dayNumber: 'asc' | 'desc' }` — numeric.
- No alphabetical sort by `name` in the DB or client. If that is ever
  added, use `array.sort((a, b) => a.name.localeCompare(b.name, 'de-DE'))`
  so `Ä`/`Ö`/`Ü` sort after `A`/`O`/`U` per DIN 5007-1.

## Certificate EN toggle

`CertificateCard` is the only DE-mixed-with-EN surface. `lang: 'de' | 'en'`
toggles both the body text AND the `toLocaleDateString` locale argument.
The footer tagline "Prompt it like it's hot" stays English in both modes
(brand phrase). The PDF download route always emits DE.

## HTML lang attribute

`<html lang="de">` is set in `app/layout.tsx` and `app/global-error.tsx`.
Screen readers pick German pronunciation everywhere — even on the
certificate EN view (minor, ignored: the EN content is 20 words, no
reader will mispronounce "Awarded to" catastrophically).

## Speech recognition

`SpeechInput` pins `recognition.lang = 'de-DE'`. Users with a non-German
browser locale still get German dictation in the onboarding free-text
fields, which matches the product language.

## Known minor inconsistencies

- `EinstellungenClient` shows booking dates date-only
  (`toLocaleDateString('de-DE')`) while `BuchungClient.formatDate` shows
  date + time. A user sees the same meeting at two levels of precision
  depending on which screen they're on. Intentional for now — the
  settings row is a compact status list, the booking page is the primary
  surface. Revisit if complaints arrive.
- The `€` glyph in tier labels uses a regular space. On a 320 px-wide
  device in a narrow column the `€` can wrap. Swap for `\u202F` (NNBSP)
  if we see it break in practice.

## Related

- [[copy-tonality]] — the du-first voice these formatters feed
- [[data-integrity]] — UTC-day streak rationale
