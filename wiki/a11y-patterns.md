---
title: A11y Patterns
type: concept
---

# Accessibility Patterns

What the PILIH UI does to meet WCAG AA and keep screen-reader + keyboard users whole.

## Tap-target opt-out

Global CSS enforces `min-height/width: 44px` on buttons (iOS HIG). Intentionally small icon buttons (chat `CopyButton`, `JudgeFeedbackPopup` close, `SpeechInput` mic, "Feedback verfügbar" chip) opt out with `.tap-small` so they don't get stretched into overlapping their containers.

## Focus management

- `app/(app)/error.tsx` moves focus to the `<h1>` on mount and wraps in `role="alert"` so assistive tech announces the error.
- `OnboardingWizard` moves focus to the new step's heading on `step` change.
- `JudgeFeedbackPopup` traps Tab inside the modal and restores focus on close.
- `a.skip-nav` as the first element of authed layouts lets keyboard users jump past the sticky header.

## Radiogroup

`DifficultyRating` uses proper `role="radiogroup"` + three `role="radio"` buttons with arrow-key nav (Left/Right + Up/Down cycle focus), matching WAI-ARIA. Before, three unrelated `<button>` tags broke the group semantics.

## aria-live for chat

A dedicated visually-hidden `role="status"` region announces "Antwort wird generiert" and "Antwort fertig. Bewertung X von 10." — the chat scroll container is `role="log"` with no live announcements, so streaming tokens don't re-announce the entire transcript on every chunk.

## aria-invalid + aria-required

`FormInput` in `OnboardingWizard` gets `aria-required="true"` + conditional `aria-invalid={value.trim().length === 0}`. Screen-reader users learn which field blocks the disabled Next button, not just "the button is disabled".

## Colour contrast

`--text-muted` bumped from `#52556b` (3.8:1 on surface) to `#7a7f95` (~4.6:1) to pass WCAG AA on body copy.

## Related

- [[keyboard-a11y]] — keyboard-only journey + SR correctness (Round 6)
- [[reduced-motion]] — motion contract
- [[gsap-patterns]] — focus after animation
- [[copy-tonality]] — error messages
