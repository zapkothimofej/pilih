---
title: Copy & Tonality
type: concept
---

# Copy & Tonality

PILIH's voice: casual **du**, playful (tagline: "Prompt it like it's hot"), honest in errors.

## "du" everywhere

Every user-facing string uses `du` / `dein`. Zero hits for `Sie / Ihnen / Ihre` in the codebase. Even error messages stick to casual imperatives.

## Warmer error messages

- Chat timeout: "Die KI antwortet nicht. Versuch es nochmal — oft hilft ein kürzerer Prompt." (was: "Zeitüberschreitung. Bitte erneut versuchen." — technical compound noun).
- Error boundary: "Bitte lade die Seite neu" (was: "Kein Retry mehr möglich" — the loan-word "Retry" jarred).

## Judge score labels

Retoned from school-report-card to brand-consistent:

- 9+ → `Absolut on point` (was "Herausragend")
- 7-8 → `Starker Prompt` (was "Sehr gut")
- 5-6 → `Solide Basis` (was "Solide")
- 3-4 → `Noch Luft nach oben` (was "Ausbaufähig")
- <3 → `Das Thema lohnt sich` (was "Noch viel Potenzial" — patronising euphemism)

## Consistent vocabulary

- `Challenge` everywhere (not `Aufgabe` — that's reserved for the user's real work tasks in onboarding Step 2).
- `ChallengeWidget` section header renamed from "Aufgabe" to "Challenge-Brief" to kill the collision.
- `1:1 Coaching` everywhere (three sites in `EinstellungenClient` previously had `1on1`, `1on1 Coaching`, `1:1 Coaching` mixed).
- `Wird {verb}…` is the canonical loading-button pattern. `Generiere…` was an outlier — fixed to `Wird generiert…`.
- `Stoppen` instead of English `Stop` on the chat stream cancel button.

## Tagline callbacks

"Prompt it like it's hot" used to appear only on landing + metadata + certificate. Now also callbacks on the certificate sub-headline. The climax page copy was upgraded from "Glückwunsch!" to "21 Tage. 21 Challenges. Du hast's durchgezogen."

## Legal stubs

Landing footer now links Impressum + Datenschutz + Kontakt. Pricing in `EinstellungenClient` shows "zzgl. MwSt." per PAngV.

## Related

- [[a11y-patterns]] — error announcement via role=alert
- [[judge-ai]] — where the score labels render
- [[security]] — error-message hygiene (no PII leakage)
