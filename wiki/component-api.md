---
title: Component API Surface (Round 7 Review)
type: review
date: 2026-04-18
---

# Component API Surface — Round 7

Rounds 1–6 audited routes, state, animation, a11y — nothing looked at
**prop shapes themselves**. Backlinks: [[react19-idioms]],
[[a11y-patterns]], [[client-state]].

Scope: `components/**/*.tsx` (17 files) + five `(app)/**/*Client.tsx`
leaves. Grep: zero `forwardRef`, zero `useImperativeHandle`, zero
render props. Rounds 3 + 6 killed those.

## Dimension 1 — Boolean-trap props (score 8/10)

Three+ booleans on one component typically hide a state enum. The app
is unusually clean here — most "toggles" are independent concerns, not
modes. One violation.

- **F1.1** (medium): `ChallengeTodayClient` (`app/(app)/challenge/
  heute/ChallengeTodayClient.tsx:13-15`) carries
  `poolEmpty?: boolean` + an implicit `challenges.length === 0` flag
  + `showLowPoolNotice` derived from `challenges.length < 3`. The
  render branch at `:67` is `showEmptyState = poolEmpty ||
  challenges.length === 0`. Two sources of truth for "pool is empty"
  will drift — a server-side `poolEmpty: true` with a non-empty
  `challenges: [...]` is a contradictory state the types allow. Fold
  to a discriminated union:
  ```ts
  type PoolState =
    | { kind: 'empty' }
    | { kind: 'low'; challenges: Challenge[]; poolSize: number }
    | { kind: 'ok'; challenges: Challenge[] }
  ```
  Severity: medium (today it only breaks if the server miscounts).
- **F1.2** (low): `ChatInterface` state carries `isStreaming`,
  `showRating`, `ratingLoading`, `judgeFeedback`, `latestJudge` —
  five booleans/nullables that encode a state machine (see D14
  below). Not a prop API concern, but the same anti-pattern.
- **F1.3** (info): `AnimatedNumber` has `onScroll?: boolean`
  (`AnimatedNumber.tsx:20`) — one boolean, justified. No trap.
- **F1.4** (info): No component has 3+ booleans on its prop
  interface. Anti-pattern genuinely absent.

## Dimension 2 — Default-value consistency (score 5/10)

`AnimatedNumber` defaults `duration = 1.2` and `onScroll = true`
(`AnimatedNumber.tsx:30, 36`). Every caller overrides at least one:

| Caller | duration | onScroll | Notes |
|---|---|---|---|
| `XPBar:66` | 1.1 | false | overrides both |
| `StreakCounter:51` | 0.9 | false | overrides both |
| `DayRing:70` | 1.3 | false | overrides both |
| `AdminClient:90` | (default) | false | overrides onScroll |

- **F2.1** (medium): **Every** dashboard usage passes
  `onScroll={false}`. The default `true` only serves scroll-triggered
  counters that don't exist in this codebase (`AdminClient`'s stat
  grid is above-the-fold). The default has inverted polarity —
  callers who forget will get a counter that renders `0` until the
  user scrolls, which on a dashboard above the fold means **never
  animating** if the element is already in view at mount (the
  `ScrollTrigger.create` with `start: 'top 90%'` fires on enter, but
  if it's already past that line, `once: true` may or may not fire
  depending on GSAP initial-evaluation order). Flip the default to
  `onScroll = false` and explicitly opt in at the three existing
  call sites (there are none). Saves four lines and eliminates a
  footgun. **Severity: medium**.
- **F2.2** (low): Duration spread 0.9–1.3 s across four call sites
  reflects genuine UI beats (`StreakCounter` ticks faster than
  `DayRing` because it's a smaller number). Defaults don't need to
  change — but the 1.2 s default matches **no** caller. A default
  nobody uses is noise. Set default to 1.0 s or remove and require.
  **Severity: low** (cosmetic, drift risk only).
- **F2.3** (medium): `SpeechInput` (`components/onboarding/
  SpeechInput.tsx:14`) defaults `rows = 3`; the single caller
  (`OnboardingWizard:266`) overrides to `rows={5}`. Default
  unreached. Either remove the default (force the caller to pick) or
  align to 5. **Severity: low**.
- **F2.4** (info): `FormInput.required` defaults `true`
  (`OnboardingWizard:286`); caller never passes anything else — see
  D3.

## Dimension 3 — Optional-vs-required drift (score 7/10)

Props typed as optional but always passed:

- **F3.1** (low): `FormInput.required?: boolean = true`
  (`OnboardingWizard:291`) — only three call sites, none override.
  Since the `aria-invalid` + `aria-required` a11y path relies on it
  being truthful (see [[a11y-patterns]]) keeping the escape hatch is
  fine, but prefer `required: boolean` (no default) so a future
  "optional department" field doesn't silently inherit required-ness.
  **Severity: low**.
- **F3.2** (medium): `ChallengeTodayClient.poolSize?: number`
  (`ChallengeTodayClient.tsx:14`) is defensively optional and at
  `:132` the render branches on `typeof poolSize === 'number'`. The
  server page **always** knows the pool size — no caller omits it.
  Drop the `?`, drop the typeof-guard, one dead branch gone.
  **Severity: low**.
- **F3.3** (medium): `SpeechInput.label?: string` is optional; the
  single caller passes one. If label is meant to be required for
  a11y (screen readers read "textarea" unlabeled otherwise),
  optionality hides the contract. Either require it OR fall back to
  `aria-label={placeholder}`. Today nothing enforces it. **Severity:
  medium** (a11y drift surface).
- **F3.4** (low): `FortschrittCalendar`'s `Day.title?: string`
  (`FortschrittCalendar.tsx:15`) — genuinely optional for
  future-days. Correct as-is.

## Dimension 4 — `children` typing (score 9/10)

Grep for `children: React.ReactNode` + `children: ReactNode` returns
6 hits: three layouts, two `OnboardingWizard` sub-buttons, one
recursive helper in `ChatInterface`. All three layouts genuinely
accept any renderable. Both sub-buttons (`PrimaryButton`,
`SecondaryButton` at `:322, :338`) accept string+icon fragments —
`ReactNode` is correct. `extractCodeText(children: ReactNode)` walks
the tree recursively — needs `ReactNode`.

- **F4.1** (info): No false-positive `ReactNode` where a `string`
  would do. Clean.

## Dimension 5 — Unused props (score 9/10)

Read all 17 component prop interfaces; cross-referenced each prop
against its file's render tree.

- **F5.1** (low): `ChallengePageClient.dayNumber`
  (`ChallengePageClient.tsx:16`) is used at `:71` for the "Tag X von
  21" badge — reachable. Fine.
- **F5.2** (medium): `ChatInterface.onComplete(rating, xp)`
  (`ChatInterface.tsx:25`) is called at `:248` with the user's
  rating. The **consumer**
  (`ChallengePageClient.handleComplete`) immediately discards
  `_rating` with `void _rating` at
  `ChallengePageClient.tsx:25-32`. The rating travels across a
  component boundary, through a prop type, just to get thrown away.
  Either drop `rating` from the callback signature (the server
  already persisted it — see D10) or route it through a use-case
  (e.g. "Thanks, that was _too easy_ — we'll adjust"). Today it's
  dead weight in the contract. **Severity: medium** (false
  coupling).
- **F5.3** (info): `CopyButton` (`ChatInterface.tsx:649`) had a
  `variant` prop that was removed in round 5 — comment at `:655`
  notes the cleanup. Good hygiene.
- **F5.4** (low): `ChallengeCard.index`
  (`ChallengeCard.tsx:21`) is consumed only for the stagger delay at
  `:51`. Fine — but see D8 on render-prop alternatives.

## Dimension 6 — Style-prop CSS-custom-prop contracts (score 6/10)

One component sets CSS variables on an element and relies on a CSS
class to read them:

- **F6.1** (medium): `DifficultyRating`
  (`components/challenge/DifficultyRating.tsx:111-118`) writes
  `--rating-active-bg / -border / -color` into inline style, then
  `app/globals.css:163-165` reads them behind a `.rating-option`
  class hover/focus selector. The contract is split across two files
  with **zero** type safety. If someone renames the CSS variable or
  drops the class, the hover state silently breaks. Two fixes:
  1. Move the three vars into a typed constant at the top of
     `DifficultyRating.tsx` and document them with a
     JSDoc `@cssvar` block.
  2. Or bypass CSS: pass activeStyle directly via `data-active`
     selector + inline `style` — no globals.css coupling.
  **Severity: medium** (silent-regression surface).
- **F6.2** (info): All other `style={{ '--foo' ... }}` usage is
  local (scoped to the same component's own className). Not a
  contract leak.
- **F6.3** (low): `ChallengeCard:88` uses `transformStyle:
  'preserve-3d'` + `willChange: 'transform'` inline. These are
  performance-related style props the GSAP tween code depends on —
  would be cleaner as a `.card-3d` utility class in globals.css for
  discoverability. **Severity: low**.

## Dimension 7 — Event-handler naming (score 7/10)

Inventory of callback prop names: `onSelect` (ChallengeCard),
`onRate` (DifficultyRating), `onComplete` (ChatInterface), `onClose`
(JudgeFeedbackPopup), `onEdit` (AbschlussClient→FeedbackView),
`onChange` (SpeechInput, FormInput), `onClick` (Primary/
SecondaryButton).

- **F7.1** (info): All follow the "on + imperative verb" convention
  except `onComplete` which is past-tense. React idiom is
  future-imperative (`onSubmit`, `onRate`) OR past-imperative
  (`onCompleted`). `onComplete` is borderline. Low-priority rename
  candidate: `onRated(rating, xp)` (the callback fires when the
  rating is submitted, not when the challenge itself "completes"
  — the challenge completed earlier, at the last prompt attempt).
  **Severity: low** (semantic drift).
- **F7.2** (low): `onSelect(id: string)` in `ChallengeCard` and
  `onRate(rating: Rating)` in `DifficultyRating` — both are
  "select from a fixed set of options". Unifying to `onSelect` with
  a generic would reduce surface, but the value vocabularies differ
  (challenge id vs enum). Keep as-is.
- **F7.3** (info): No `onChange` is doing double-duty as
  "submit" anywhere — usually the anti-pattern.

## Dimension 8 — Render-prop / children-as-function (score 10/10)

Grep for `children={(` and `render={(` — zero hits. No render props,
no children-as-function patterns. **Verified clean.**

## Dimension 9 — Ref forwarding vs React 19 ref-prop (score 10/10)

Grep for `forwardRef` — zero hits. Round 3 already killed Radix
remnants; no regressions. Components that expose refs do so via the
React 19 ref-prop directly (e.g. `FortschrittCalendar` uses
`useRef(null)` locally, not forwarded). **Verified clean.**

## Dimension 10 — Server-component prop shape (Prisma leakage) (score 4/10)

Seven client components import Prisma types as props:

| Component | Prisma type | File |
|---|---|---|
| `ChallengePageClient` | `Challenge` | `ChallengePageClient.tsx:11` |
| `ChallengeTodayClient` | `Challenge[]` | `ChallengeTodayClient.tsx:6` |
| `BuchungClient` | `Booking[]` | `BuchungClient.tsx:5` |
| `EinstellungenClient` | `User, Booking[]` | `EinstellungenClient.tsx:3` |
| `SubmissionsClient` | `FinalSubmission` | `SubmissionsClient.tsx:5` |
| `AppNav` | `Role` (enum) | `AppNav.tsx:8` |
| `AdminClient` | (declared inline Participant) | *ok* |

- **F10.1** (high): `ChallengePageClient({ challenge: Challenge })`
  (`ChallengePageClient.tsx:14`) passes the **entire** Prisma row —
  including `isActive`, `createdAt`, `dayNumber` (the column, not
  the prop), internal adaptive-difficulty counters, ownership
  `userId`. The client only reads `id, title, description,
  promptingTips, category, currentDifficulty` (via the spread at
  `:86-91`). If Prisma makes `promptingTips` nullable tomorrow
  (`String?`), the client breaks silently — no compile error because
  `Challenge.promptingTips` becomes `string | null` and
  `ChallengeWidget.promptingTips: string` loses its runtime guarantee.
  Same risk if a field is renamed. Define a DTO:
  ```ts
  // lib/dto/challenge.ts
  export type ChallengeView = Pick<
    Challenge, 'id' | 'title' | 'description' | 'promptingTips'
             | 'category' | 'currentDifficulty'
  >
  ```
  Server page maps Prisma→DTO. **Severity: high** (silent drift
  surface + over-fetching IDs/PII through the RSC payload — see
  [[client-state]] on serialization cost).
- **F10.2** (high): `BuchungClient({ bookings: Booking[] })`
  (`BuchungClient.tsx:62`) — same pattern. Client only reads `id,
  type, scheduledAt, status, meetingUrl`. Prisma `Booking` also has
  `notes`, `createdBy`, `companyId` (likely, once multi-tenant
  lands per [[scale-tenancy]]). **Severity: high** (tenancy leak
  risk; booking.companyId wire-transferred to the client).
- **F10.3** (medium): `EinstellungenClient` takes
  `{ user: User; bookings: Booking[] }`. `User` includes
  `clerkUserId`, `email`, `createdAt` — the `email` is rendered
  (`:66`) but the Clerk id isn't. DTO helps and also defends
  [[security]]'s PII-scrub policy. **Severity: medium**.
- **F10.4** (medium): `SubmissionsClient.Submission` widens
  `FinalSubmission` with `user: {...}` at `:9-11` — good intent, but
  `FinalSubmission` itself ships `useCase1/2/3` as `Prisma.Json`. The
  client runtime-parses at `:51-61` with a hand-rolled guard. A DTO
  with `useCase: UseCase` typed (vs `Prisma.Json`) on the server
  side eliminates the parse-cost. **Severity: medium**.
- **F10.5** (low): `AppNav({ user: { name, role: Role } })` narrows
  to two fields already. Good. Only the `Role` enum leaks, which is
  fine (enums are stable contract surfaces — if `Role` changes, the
  server-side auth helper breaks too, so surfaces move together).

## Dimension 11 — Discriminated unions (score 5/10)

Codebase has three places where a DU would replace nullable/optional
chains:

- **F11.1** (high): SSE event parsing in `ChatInterface:149-163`
  already **uses** a DU literal inline for the event payload — but
  the union lives inside the function body, not exported. Hoisting
  to `lib/ai/judge-types.ts` lets the server's SSE producer use the
  same type, and catches "I renamed `shouldShowPopup` server-side"
  at compile time. See [[stream-lifecycle]] for the stream shape.
  **Severity: medium** (drift risk between producer and consumer).
- **F11.2** (medium): `AbschlussClient.view: 'form' | 'feedback'`
  (`AbschlussClient.tsx:46`) + `feedback: FeedbackState | null` —
  the two are coupled (`feedback: null` iff `view === 'form'`). The
  render-guard at `:146` has to re-check both. A DU:
  ```ts
  type AbschlussState =
    | { view: 'form'; feedback: null }
    | { view: 'feedback'; feedback: FeedbackState }
  ```
  makes the impossible state (`view: 'feedback', feedback: null`)
  unrepresentable. **Severity: medium** — [[react19-idioms]] F3.1
  calls for `useActionState` here; migrate both at once.
- **F11.3** (medium): `ChatInterface` state bag
  (`isStreaming, judgeFeedback, latestJudge, showRating,
  ratingLoading, attempts`) encodes a four-state FSM: `idle →
  streaming → awaiting-judge → awaiting-rating → completed`. A
  `useReducer` with a DU `ChatState` would eliminate
  contradictory combinations (`isStreaming && showRating`). Big
  refactor — queue for a round 8 if the chat grows a pause-mid-
  stream or retry affordance. **Severity: low** today.

## Dimension 12 — forwardRef stragglers (score 10/10)

Grep: zero. Covered under D9. **Verified clean.**

## Dimension 13 — `key` prop stability (score 6/10)

Mapped-element keys:

- **Stable id keys** (good): `ChallengeTodayClient:140 (c.id)`,
  `BuchungClient:218 (booking.id)`, `SubmissionsClient:110 (s.id)`,
  `AdminClient:143 (p.id)`, `EinstellungenClient:172 (b.id)`,
  `AppNav:103 (item.href)`.
- **Stable string keys** (fine for static lists):
  `OnboardingWizard:203 (tool)`, `:225 (freq)`,
  `LandingSteps:106 (item.step)`, `:127 (item.title)`,
  `CertificateCard:95 (l)`.
- **F13.1** (low): `SubmissionsClient:135 (key={i})` — nested map
  inside a **stable-id** outer loop (`s.id`). Per-submission cases
  are a fixed-length 3-tuple, so `key={i}` is safe. OK.
- **F13.2** (low): `AbschlussClient:179 (key={i})` — cases are
  also a fixed 3-tuple. OK.
- **F13.3** (medium): `ChatInterface:315 (key={i})` on the
  **messages** array — this array GROWS as the user sends prompts.
  If the backend ever inserts a historical message (retry-reload
  after network drop, say) React's reconciliation will mis-identify
  bubbles. Today only appends happen, so `key={i}` is functionally
  safe, but **the GSAP entrance animation checks
  `dataset.animated === 'true'` on the DOM node** (`:65-67`) to
  avoid re-animating. If React reuses a node for a different
  message (which `key={i}` explicitly allows), the dedupe flag
  travels with the wrong content. Replace with a stable ULID per
  message:
  ```tsx
  const [messages, setMessages] = useState<(Message & {id: string})[]>(
    () => previousAttempts.flatMap(a => [
      { id: crypto.randomUUID(), role: 'user', content: a.userPrompt },
      { id: crypto.randomUUID(), role: 'assistant', content: a.llmResponse },
    ])
  )
  // key={msg.id}
  ```
  **Severity: medium** (latent animation bug).
- **F13.4** (low): `JudgeFeedbackPopup` `key={i}` inside already-
  stable popup-scope (`:224, :243`) — the dialog re-mounts per
  feedback, so `i`-keys are safe. OK.
- **F13.5** (info): `ChallengeCard`'s `StarFilledIcon key={i}` —
  fixed length 5, static. OK.

## Dimension 14 — `useImperativeHandle` / over-engineering (score 10/10)

Grep: zero. No imperative handles exposed. The two places a
component parent reaches into a child — `ChatInterface`'s focus on
textarea after `showRating` closes, `OnboardingWizard` heading
focus — both use **own-component** refs, not forwarded. Correct.

## Summary — priority order

**High (do this round):**

1. **F10.1 + F10.2 + F10.3** — Introduce `lib/dto/` for the four
   leaky Prisma passes. Closes a silent-drift surface and a mild
   tenancy-info leak ([[scale-tenancy]]). Pairs naturally with
   [[react19-idioms]] F1.1 (server actions) since DTO mapping moves
   server-side anyway.
2. **F13.3** — Stable `id` on `ChatInterface` message bubbles.
   Fixes the latent animation-dedupe bug.
3. **F2.1** — Flip `AnimatedNumber.onScroll` default to `false`;
   the `true` default is unused.

**Medium (queue for round 8):**

4. **F5.2** — Drop `rating` from `onComplete` or consume it in
   `ChallengePageClient`.
5. **F6.1** — Lift `DifficultyRating` CSS-var contract into a
   typed constant (or drop the globals.css coupling).
6. **F11.1** — Hoist the SSE event DU to `lib/ai/judge-types.ts`
   so producer and consumer share the type.
7. **F11.2** — Migrate `AbschlussClient.view + feedback` to a DU
   at the same time as the `useActionState` rewrite
   ([[react19-idioms]] F3.1).
8. **F1.1** — `ChallengeTodayClient` `PoolState` DU.
9. **F3.3** — `SpeechInput.label` required (or aria-label
   fallback).

**Low (drive-by):**

10. **F2.2 + F2.3** — Align `AnimatedNumber.duration` +
    `SpeechInput.rows` defaults to actual usage.
11. **F3.2** — Drop `poolSize?` optionality.
12. **F7.1** — Consider renaming `onComplete` → `onRated`.
13. **F13.1, F13.2** — Keep `key={i}` on fixed-length tuples;
    document inline if it helps future readers.

## Per-dim scores

| Dim | Topic | Score |
|---|---|---|
| 1 | Boolean traps | 8 |
| 2 | Default alignment | 5 |
| 3 | Optional-vs-required | 7 |
| 4 | `children` typing | 9 |
| 5 | Unused props | 9 |
| 6 | Style CSS-var contracts | 6 |
| 7 | Event-handler naming | 7 |
| 8 | Render-prop abuse | 10 |
| 9 | Ref-prop vs forwardRef | 10 |
| 10 | Prisma leakage | 4 |
| 11 | Discriminated unions | 5 |
| 12 | forwardRef stragglers | 10 |
| 13 | `key` stability | 6 |
| 14 | `useImperativeHandle` | 10 |

**Overall: 7.6/10.** The API surface is clean on the structural axes
(no render props, no forwardRef, no imperative handles, no boolean
traps) but leaks ORM shapes into client components (D10) — the
biggest latent-drift surface — and has two unused or mis-polarized
defaults (D2). The `ChatInterface` `key={i}` (D13) is the only
findable live bug.

## Cross-references

- [[react19-idioms]] — F3.1 (`useActionState`) subsumes F11.2
  (`AbschlussClient` DU). F1.1 (server actions) provides a natural
  home for D10 DTO mapping.
- [[a11y-patterns]] — F3.3 (`SpeechInput.label` required) is an
  a11y contract; D6 CSS-var contract affects focus-visible style.
- [[client-state]] — F10 DTO reshaping reduces RSC payload size
  flagged in the round-5 serialization review.
- [[stream-lifecycle]] — F11.1 SSE event DU mirrors the producer
  payload already documented there.
- [[scale-tenancy]] — F10.2 `Booking.companyId` leak via
  `BuchungClient` matters once multi-tenant lands.
