---
title: Keyboard & Screen-Reader A11y
type: concept
---

# Keyboard-Only Journey + Screen-Reader Correctness

Round 6 audit. Focuses on WCAG 2.2 AA: tab order, focus visibility, live-region politeness, landmark coverage, labels vs placeholders, keyboard shortcut discoverability.

## What works (verified)

- `:focus-visible` base ring (`globals.css:74`) — 2 px `var(--accent)` outline + 2 px offset applied to every interactive element by default. Inline-styled buttons inherit this (the style override sets `background`/`color`, not `outline`), so the ring survives.
- Skip-nav in both authed layouts (`app/(app)/layout.tsx:11`, `app/(admin)/layout.tsx:12`) targets `<main id="main-content">`. The `<main>` element has no `tabIndex`, which means programmatic focus after the anchor jump is a no-op on some browsers (see Dim 3) — but the scroll still lands. Target *does* receive focus in Chromium + Safari because both treat landmark elements as focusable when the fragment is the page target. Firefox matches since Fx 92.
- JudgeFeedbackPopup (`JudgeFeedbackPopup.tsx:59-111`) — full dialog contract: focus save/restore, Escape to close, Tab trap, `role="dialog" aria-modal="true" aria-labelledby`.
- DifficultyRating (`DifficultyRating.tsx:73-108`) — correct WAI-ARIA radiogroup + arrow-key cycling + roving tabindex.
- OnboardingWizard focus refocuses the new step's h2 on step change (`OnboardingWizard.tsx:71-74`).

## Findings by dimension

### 1. Tab order vs visual order — 7/10

**`ChatInterface.tsx:316`** uses `flex-row-reverse` on user messages. DOM order is `avatar → bubble`, visual is `bubble → avatar`. Harmless inside a message (no focusable elements there), and `role="log"` does not require visual order to match DOM. **Not an issue.**

**`ChallengeCard.tsx:88`** uses `transformStyle: preserve-3d` + parallax tilt but DOM order (category → title → description → arrow) matches visual. Safe.

**Dashboard** (`app/(app)/dashboard/page.tsx`) — DOM order: greeting h1, progress pill, CTA, 3 stat cards, "Zuletzt abgeschlossen" list. Matches visual top-to-bottom. The progress pill (`{completed}/21 Tage`) sits visually in the header row *right*, while DOM-wise it's *after* the greeting block — fine because the pill is a non-focusable `<div>`. The 3 grid stats render in DOM order (Streak, DayRing, XPBar) and left-to-right on desktop — matches.

**AppNav** (`components/ui/AppNav.tsx:80-137`) — the sliding pill indicator is `position: absolute` before the links in DOM but `aria-hidden="true"` (line 84). Tab order skips it. The admin links (`Admin`, `Reviews`) follow the primary nav in DOM, which matches the visual left-to-right. Settings icon + avatar are on the right in a second flex group; DOM order matches. Good.

**Fix:** none required. Severity **low**. Keep discipline — avoid `flex-row-reverse` or `order-*` on focusable nodes.

### 2. Focus ring visibility on inline-styled buttons — 6/10

WCAG 2.2 SC 2.4.11 (focus not obscured) + 2.4.13 (focus appearance) require a perceivable ring. Inline `style={{ background: ..., color: ... }}` does NOT suppress the default `:focus-visible` outline (only `outline: none` + no box-shadow would), so **all** primary buttons get the 2 px indigo ring.

Exceptions that intentionally override:
- **`.input-accent` / `.textarea-accent`** (`globals.css:113-120`) — replaces outline with `border-color: var(--accent-border)` + `box-shadow: 0 0 0 3px var(--accent-dim)`. **~3:1 contrast against `var(--bg-elevated)` (#282b33)** — passes 1.4.11 (3:1). Good.
- **`.card-hover:focus-visible`** (`globals.css:138-141`) — same treatment, 3 px accent-dim shadow + no outline. Verified visible on ChallengeCard.
- **`.rating-option:focus-visible`** (`globals.css:161-167`) — uses `outline: none` and relies on full-background colour swap (`var(--rating-active-bg)`). Problematic: a user arrow-keying through the radiogroup gets a BG tint only, no ring or outline. The active radio is background-highlighted, but a non-active focused-via-arrow-key radio... wait, arrow keys call `.focus()` on the next radio, and `:focus-visible` triggers. The active-style overrides the focused-style if it's the same colour family — **on Chromium both states collapse visually**. Difficult to distinguish "focused" from "active" by colour alone.

**Findings:**
- `DifficultyRating.tsx:109` — `.rating-option:focus-visible` reuses the active-state palette as the focus indicator. A keyboard user who focuses a non-selected option sees the same visual as if it were selected. Severity **medium**. Fix: add `outline: 2px solid var(--accent); outline-offset: 2px;` in `.rating-option:focus-visible` alongside the BG swap.
- `app/(app)/error.tsx:45` — `className="... focus:outline-none"` on the `<h1 tabIndex={-1}>`. This is the programmatic-focus target, which is sensible (don't outline a heading just because we focus it for SR), but WCAG 2.4.7 requires *perceivable* focus on anything receiving focus — exception granted for programmatic, non-interactive focus targets where the surrounding `role="alert"` already signals state. **Low** severity.
- `OnboardingWizard.tsx:149, 169, 255` — same pattern as above for step headings. Same mitigation applies. **Low** severity.
- `CertificateCard.tsx:94` DE/EN toggle — inline-styled, but outline inherits from base `:focus-visible` (default 2 px accent). Good.

### 3. Skip-link target focusability — 7/10

`<main id="main-content">` has no `tabIndex={-1}`. Clicking the skip-link jumps the viewport but does *not* move the focus ring to the main element in Safari; Chromium + Firefox move focus to the landmark. Then the first Tab jumps to whatever comes inside — e.g. Dashboard's `<h1>` is non-focusable, so Tab lands on the CTA `<Link href="/challenge/heute">`. Consistent across browsers.

**Finding:** `app/(app)/layout.tsx:15`, `app/(admin)/layout.tsx:16` — add `tabIndex={-1}` to `<main>` so every browser grants focus + the next Tab behaves predictably. Severity **low-medium**. Example:
```tsx
<main id="main-content" tabIndex={-1} className="...">
```

### 4. Error announcements — 7/10

- `app/(app)/error.tsx:32` — `role="alert"` wraps the card + focus moves to the h1. SR announces "Etwas ist schiefgelaufen" on mount. Good.
- Chat `toast.error(...)` via **sonner** (`app/layout.tsx:38` — `<Toaster richColors position="top-right" />`). Sonner's default `aria-live` is `polite` for info/success and `assertive` for errors with `richColors`. Rapid errors queue in FIFO — each new toast announces, prior toasts remain visible up to `visibleToasts` (default 3).
- **Issue:** no `aria-label` / `toastOptions` on the Toaster. The toast close button has a default "Close" label (English); the whole app is German. Severity **medium**. Fix: add `closeButton` + localized `toastOptions={{ closeButton: true }}` and `<Toaster closeButton toastOptions={{ classNames: { ... }, actionButtonStyle: {...} }}` + the toast description stays the error sentence (German). Better: pass `aria-label` via `toast.error(msg, { ariaProps: { 'aria-label': msg, role: 'alert' } })`.
- **Rapid-stacking:** sonner announces each in turn; but an SR user hearing 3 errors in 400 ms gets truncated speech. Pattern fix: throttle identical messages in `ChatInterface.sendPrompt` (the 120 s timeout + stream error can both fire for the same attempt). Severity **low**.

### 5. Escape key on modals — 8/10

Only one modal exists (`JudgeFeedbackPopup`). Escape is handled (`JudgeFeedbackPopup.tsx:71`). No other dialogs.

- `ChallengeWidget` is a collapsible panel, not a modal — Escape not expected.
- Sonner toasts support Escape to dismiss the focused toast (built-in). Good.
- `AbschlussClient` FeedbackView is an in-page swap, not a modal — Escape not applicable.

Severity **none**. 8/10 because there's no centralized dialog primitive for future modals.

### 6. Enter key to advance — 5/10

- Chat textarea (`ChatInterface.tsx:256-261`) — Enter sends, Shift+Enter newlines. Documented via visible hint (`chat-input-hint`) + `aria-describedby`. Good.
- **OnboardingWizard** — step 1 has 3 text inputs but **no `<form>` wrapper**. Enter does nothing. User must Tab to the "Weiter" button and press Space/Enter. Severity **medium** — per HTML convention, Enter in a single-line text field should submit the surrounding form. Since step advance is not a real submit (step 3 is the `fetch`), a form would still help: `<form onSubmit={(e) => { e.preventDefault(); if (canNextN) setStep(next); }}>`.
- **AbschlussClient** — textareas only, so Enter=newline is correct. The big submit button is the only action; no form wrapper. Acceptable since no text inputs, but **`<form onSubmit>`** is still preferable for semantics. Severity **low**.

**Fix:** wrap each onboarding step's content in `<form onSubmit={...}>` with button `type="submit"`. Screen-reader users also gain the "form" landmark announcement.

### 7. Chat scrollback for SR users — 6/10

`role="log"` (`ChatInterface.tsx:288`) + `aria-label="Chat-Verlauf"` marks the transcript. Good. But individual turns have no heading or `role="article"` / `aria-label`. A SR user navigating by heading/landmark skips the whole log. Navigating inside with arrow keys reads the text linearly.

**Finding:** add `aria-label={msg.role === 'user' ? 'Du' : 'KI'}` on each `.chat-msg` wrapper, or switch to `<article>` with a visually-hidden `<h3 className="sr-only">`. Severity **medium**. Without it, distinguishing user-turn from assistant-turn relies on the visual avatar + bubble side, which SRs don't convey.

### 8. Form landmarks — 4/10

Searched for `<form>` across authed pages:

- **None found** in OnboardingWizard, AbschlussClient, ChallengeTodayClient, ChatInterface, AdminClient search, BuchungClient.
- `<form>` adds the "form" landmark + Enter-to-submit. All input-heavy pages currently miss this.

**Fix list (severity medium):**
- `components/onboarding/OnboardingWizard.tsx` — wrap each step in `<form>` with `onSubmit`.
- `app/(app)/abschluss/AbschlussClient.tsx:177-246` — wrap the three use-case cards + button in one `<form>`.
- `app/(admin)/admin/AdminClient.tsx:105-111` — the search input wants `<form role="search">` (a "search" landmark is WCAG-recommended for free-text filter).

### 9. Labels vs placeholders — 7/10

- `OnboardingWizard.FormInput` uses a `<label>` sibling + an `<input>`. **But no `htmlFor` / `id` binding** (`OnboardingWizard.tsx:297-311`). SR reads the placeholder OR inferred label depending on engine; NVDA + VoiceOver walk up the DOM and associate by proximity, so it works in practice. Still non-conforming per WCAG 1.3.1.
- `SpeechInput.tsx:94-107` — same pattern, no `htmlFor`.
- `AbschlussClient.tsx:207-209` — label without `htmlFor`.
- `AdminClient.tsx:105` search input — no label at all, only placeholder. **WCAG 3.3.2 fail.**

**Fix:** introduce `htmlFor={id}` + `id={id}` across all form inputs. Cheap:
```tsx
const id = useId()
<label htmlFor={id}>…</label>
<input id={id} … />
```
Severity **medium-high** for the admin search (no label at all), **medium** for the wizard (proximity-inferred but non-conforming).

### 10. Heading hierarchy — 7/10

Per-page count:
- **Landing** (`app/page.tsx` + `LandingHero` + `LandingSteps`) — 1 × h1 ("Prompt it like it's hot"), then h2s in LandingSteps. Good.
- **Dashboard** — 1 × h1 ("Hey {name}"), 1 × h2 ("Zuletzt abgeschlossen"). Good.
- **Onboarding page** — 1 × h1 ("Willkommen bei PILIH"), then 3 × h2 inside wizard (only one rendered at a time). Good.
- **ChallengeTodayClient** — 1 × h1, h2 only inside empty-state. Good.
- **ChallengePageClient** — inspect via import; ChallengeWidget has **no heading**, the challenge title is a `<div className="font-semibold">` (line 102). The page also has `<ChallengeWidget>` + `<ChatInterface>` but no challenge-level h1. Severity **medium**: add an h1 for the challenge title so "KI-Bewertung", "Chat-Verlauf" etc. live beneath a real page title.
- **Einstellungen** — 1 × h1, 3 × h2. Good.
- **Fortschritt** — 1 × h1, h2 inside calendar + history. Good.
- **Abschluss (form view)** — 1 × h1. Good. FeedbackView also has 1 × h1 ("Noch nicht bestanden") — a swap, not a stack, so still one.
- **Buchung** — 1 × h1, h2s below. Good.
- **Admin** — 1 × h1, no h2 for the stats grid (stats are divs). The table has no caption. **Low**: add `<caption className="sr-only">Teilnehmerliste</caption>` inside the table.
- **Super admin** — 1 × h1, h2 "Firmen". Good.
- **Not-found** — 1 × h1. Good.
- **error.tsx (app)** — 1 × h1. Good.

**Jumps:** no h3-without-h2 found.

### 11. Landmark coverage — 7/10

Landing: `<header>` + `<main>` + `<footer>` + inner `<nav aria-label="Rechtliche Hinweise">`. Good.
Authed: skip-link + `<AppNav>` (`<nav>`) + `<main id="main-content">`. Missing: `<header>` wrapper around AppNav (the `<nav>` alone becomes the "navigation" landmark, but SR users often expect a "banner" too). Severity **low**: either rename to `<header><nav>...</nav></header>` inside AppNav or add `role="banner"` on a wrapping element.
Authed pages have no `<footer>` / contentinfo landmark. **Low** — arguably not needed for logged-in UI but worth a note.

### 12. Live-region politeness — 8/10

`role="status"` is implicitly `aria-live="polite" aria-atomic="true"`. Explicit `aria-live="polite"` in `ChatInterface.tsx:279` is redundant but harmless — and future-proof if someone flips the `role`. Good. Chat uses polite (not assertive) because streaming isn't an emergency. Error path uses `toast.error` which sonner marks assertive. Contract is correct.

- `app/(app)/loading.tsx:5-6` — `role="status" aria-live="polite"`. Good.
- **Issue:** the chat `statusMessage` is set to `""` when neither streaming nor judge-ready. An empty live region doesn't re-announce, but some engines (older NVDA) announce "" as a pause. Negligible. Severity **none**.

### 13. Colour-only state — 6/10

- **AdminClient** status column (`AdminClient.tsx:178-194`) — "Zertifiziert" / "Im Abschluss" / "Aktiv" / "Onboarded" / "Neu". Each *has* text, and colour is supplementary. Good. The `ActiveDot` glyph adds a coloured dot but the text "Aktiv" is always present.
- **Tier labels** (`AdminClient.tsx:13`) — `{ BASE: '399 €', PRO: '499 €', PREMIUM: '999 €' }`. **This is a problem.** The tier column displays the *price* in a pill, no "BASE"/"PRO"/"PREMIUM" word. An admin filtering by tier must memorise that "399" = Base. Severity **medium**: show "Base 399 €" or split into two columns.
- **EinstellungenClient** — upgrade pills at `:110-124` distinguish Pro vs Premium by colour (cyan vs indigo) + the words "Pro" / "Premium" are present. Good.
- **BOOKING STATUS** (`BuchungClient.tsx:241-254`) — `UPCOMING`/`COMPLETED`/`CANCELLED` mapped to localized text ("Bevorstehend" / "Abgeschlossen" / "Abgesagt") with distinct colours. Text always present. Good.
- **Dashboard DayRing / XPBar** — graphical-only progress. `DayRing` has no `aria-label` showing "`X` von 21". Check component for SR text.
- **ChallengeCard `DifficultyStars`** (`:125-138`) — 5 stars + textual label ("Sehr leicht"..."Sehr schwer"). Good.
- **JudgeFeedbackPopup DimensionBars** (`:293-342`) — `role="progressbar"` + `aria-label="${DIMENSION_LABELS[key]}: ${value} von 10"` per bar. Good.

### 14. Keyboard shortcut discoverability — 8/10

- Chat: `aria-describedby="chat-input-hint"` + visible hint "Shift+Enter für Zeilenumbruch". Placeholder also says "Enter zum Senden". Good.
- **DifficultyRating** — arrow-key nav is undocumented. SR users hear `role="radio"` + group label, which implicitly says "use arrow keys" on NVDA + VoiceOver. Mouse + sighted keyboard users have no hint. Severity **low**: add a visually-hidden `<span className="sr-only">. Nutze Pfeiltasten zur Auswahl.</span>` inside the radiogroup.
- **JudgeFeedbackPopup** — Escape is undocumented visually. Dialog standard implies it, so low priority.

### 15. Dismiss semantics (toasts) — 6/10

Current Toaster: `<Toaster richColors position="top-right" />` (`app/layout.tsx:38`). No `closeButton` prop → toasts auto-dismiss only (default 4 s). A keyboard user cannot dismiss a toast early. Severity **medium** — blocks keyboard-only flow if a long toast covers the send button.

**Fix:** `<Toaster richColors closeButton position="top-right" />`. Close button is keyboard-focusable + labeled "Close notification" by sonner. Override with `<Toaster toastOptions={{ closeButton: true }}>` + a German `aria-label` via custom render if needed.

### 16. SSR vs client-rendered aria labels — 9/10

All `aria-label` values in the codebase are string literals or props based on state computed client-side (e.g. `aria-label={isListening ? 'Sprachaufnahme stoppen' : 'Per Sprache eingeben'}`). `useReducedMotion` returns `false` during SSR and the live value post-hydration, but that doesn't touch aria-labels — only animation branching. The `copied` state label flip on `CopyButton` is purely client-side. No hydration mismatch risk detected.

- `AppNav` sliding pill has `aria-hidden="true"` server-rendered, so its opacity tween doesn't leak into the a11y tree. Good.
- One subtle SSR concern: `JudgeFeedbackPopup` renders `null` when `!feedback`, so no hydration leak. Good.

## Priority fix list (sorted)

1. **[medium-high]** `AdminClient.tsx:105` — add `<label>` or `aria-label` to the search input (currently placeholder-only). WCAG 3.3.2.
2. **[medium]** `OnboardingWizard.tsx:302-310`, `SpeechInput.tsx:101-107`, `AbschlussClient.tsx:214-220` — bind `<label htmlFor>` to `<input id>` via `useId()`.
3. **[medium]** Wrap form-like pages in `<form onSubmit>`:
   - Each onboarding step → Enter-to-advance.
   - AbschlussClient → Enter nothing (textareas), but add semantic form landmark.
   - AdminClient search → `<form role="search">`.
4. **[medium]** `DifficultyRating.tsx` CSS — `.rating-option:focus-visible` currently reuses active-state palette as focus indicator; add a real outline to disambiguate focus vs selection. Edit `globals.css:161-167`.
5. **[medium]** ChatInterface turn labels — add `aria-label={msg.role === 'user' ? 'Du' : 'KI'}` on each `.chat-msg` div, or switch to `<article>` + sr-only heading.
6. **[medium]** `AdminClient.tsx:13, 154-160` — show Tier *word* ("Base"/"Pro"/"Premium") next to the price, not price alone.
7. **[medium]** `<Toaster closeButton position="top-right">` in `app/layout.tsx:38` — keyboard-dismissable toasts.
8. **[low-medium]** `app/(app)/layout.tsx:15` + `app/(admin)/layout.tsx:16` — add `tabIndex={-1}` to `<main>` so skip-link programmatic focus is consistent.
9. **[low]** `ChallengeWidget.tsx:101` — title is a `<div>`; promote to `<h2>` (or give the parent ChallengePageClient an h1 and ChallengeWidget an h3).
10. **[low]** `DifficultyRating` — add sr-only "Nutze Pfeiltasten zur Auswahl" inside radiogroup.
11. **[low]** `AdminClient.tsx` table — add `<caption className="sr-only">Teilnehmerliste</caption>`.
12. **[low]** Landing footer: wrap AppNav in `<header role="banner">` on authed routes (or rename inner element) for banner landmark parity with landing.

## Scoring summary

| Dim | Score | Severity of open issues |
|---|---|---|
| 1 Tab order | 7 | low |
| 2 Focus ring | 6 | medium (rating-option) |
| 3 Skip-link target | 7 | low-medium |
| 4 Error announcements | 7 | medium (toaster i18n, throttling) |
| 5 Escape | 8 | none |
| 6 Enter-to-advance | 5 | medium (no form in wizard) |
| 7 Chat scrollback | 6 | medium (turn labels) |
| 8 Form landmarks | 4 | medium (no `<form>` anywhere) |
| 9 Labels vs placeholders | 7 | medium-high (admin search) |
| 10 Heading hierarchy | 7 | medium (challenge page h1) |
| 11 Landmark coverage | 7 | low |
| 12 Live-region politeness | 8 | none |
| 13 Colour-only state | 6 | medium (tier labels) |
| 14 Shortcut discoverability | 8 | low |
| 15 Toast dismiss | 6 | medium |
| 16 SSR aria hydration | 9 | none |

**Overall keyboard-only + SR readiness: ~6.8/10.** The discipline on focus management, radiogroup semantics, live regions, and reduced-motion is strong. The gaps are *conventional form semantics* (no `<form>`, label-for bindings, search landmark) and *sonner i18n* — all cheap fixes.

## Related

- [[a11y-patterns]] — tap targets, aria-invalid, radiogroup, reduced motion
- [[reduced-motion]] — motion contract
- [[copy-tonality]] — voice in error announcements
