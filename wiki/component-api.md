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

3+ booleans typically hide a state enum. App is clean — one violation.

- **F1.1** (medium): `ChallengeTodayClient`
  (`ChallengeTodayClient.tsx:13-15`) carries `poolEmpty?: boolean` +
  implicit `challenges.length === 0` + derived `showLowPoolNotice`.
  `:67` computes `showEmptyState = poolEmpty || challenges.length
  === 0`. Two sources of truth; server-side `poolEmpty: true` with a
  non-empty `challenges: [...]` is representable. Fold to a DU:
  ```ts
  type PoolState =
    | { kind: 'empty' }
    | { kind: 'low'; challenges: Challenge[]; poolSize: number }
    | { kind: 'ok'; challenges: Challenge[] }
  ```
- **F1.2** (low): `ChatInterface` holds `isStreaming, showRating,
  ratingLoading, judgeFeedback, latestJudge` — a 5-flag FSM (see D14).
  Not a prop API concern but same anti-pattern.
- **F1.3** (info): `AnimatedNumber.onScroll?: boolean` — lone flag,
  justified. No other component has 3+ booleans.

## Dimension 2 — Default-value consistency (score 5/10)

`AnimatedNumber` defaults `duration = 1.2` and `onScroll = true`
(`AnimatedNumber.tsx:30, 36`). Caller audit:

| Caller | duration | onScroll |
|---|---|---|
| `XPBar:66` | 1.1 | false |
| `StreakCounter:51` | 0.9 | false |
| `DayRing:70` | 1.3 | false |
| `AdminClient:90` | (default) | false |

- **F2.1** (medium): **Every** caller passes `onScroll={false}`.
  The `true` default serves no existing call site; callers who
  forget get a counter that may never animate (if already past the
  `top 90%` trigger at mount, `once: true` behaviour is
  order-sensitive). Flip the default to `false`. **Severity:
  medium** (footgun).
- **F2.2** (low): `duration = 1.2` matches **no** caller. A
  default nobody uses is noise. Align to 1.0 s or require.
- **F2.3** (low): `SpeechInput.rows = 3` default; sole caller
  (`OnboardingWizard:266`) passes `5`. Default unreached.
- **F2.4** (info): `FormInput.required = true` — see D3.

## Dimension 3 — Optional-vs-required drift (score 7/10)

- **F3.1** (low): `FormInput.required?: boolean = true`
  (`OnboardingWizard:291`) — three call sites, no override. Prefer
  explicit `required: boolean` so a future "optional department"
  field can't silently inherit required-ness.
- **F3.2** (low): `ChallengeTodayClient.poolSize?: number` is
  always sent by the server page; the `typeof poolSize === 'number'`
  guard at `:132` is dead. Drop `?`.
- **F3.3** (medium): `SpeechInput.label?: string` is optional but
  unlabeled textareas read as "textarea" in SR (WCAG 3.3.2). Either
  require it OR fall back to `aria-label={placeholder}`.
- **F3.4** (info): `FortschrittCalendar.Day.title?` — correct
  (future-days).

## Dimension 4 — `children` typing (score 9/10)

6 `ReactNode` sites: three layouts, two `OnboardingWizard`
sub-buttons (accept icon+string fragments), one recursive
`extractCodeText` walker. All justified. No false-positive where
`string` would suffice. Clean.

## Dimension 5 — Unused props (score 9/10)

- **F5.1** (info): `ChallengePageClient.dayNumber` — reachable at
  `:71`. Fine.
- **F5.2** (medium): `ChatInterface.onComplete(rating, xp)`
  (`:25`) is called at `:248` with the rating. The consumer
  (`ChallengePageClient.handleComplete`) discards it via `void
  _rating` at `:25-32`. Rating crosses a component boundary just to
  be thrown away. Drop from signature (server already persists) OR
  route it to a user-visible acknowledgement. **False coupling.**
- **F5.3** (info): `CopyButton.variant` was removed round 5;
  comment at `:655` documents it. Good hygiene.
- **F5.4** (info): `ChallengeCard.index` — used for stagger delay
  at `:51`. Fine.

## Dimension 6 — Style-prop CSS-custom-prop contracts (score 6/10)

- **F6.1** (medium): `DifficultyRating` (`:111-118`) writes
  `--rating-active-bg / -border / -color` inline; `globals.css:
  163-165` reads them via `.rating-option` selector. Contract
  spans two files with zero type safety. Rename either side →
  silent hover regression. Either lift to a typed constant with
  a `@cssvar` JSDoc block, or drop the CSS coupling and style via
  `data-active` + inline rules.
- **F6.2** (info): All other `style={{ '--foo' ... }}` usage is
  scoped to the component's own className. Not a leak.
- **F6.3** (low): `ChallengeCard:88` inlines `transformStyle:
  'preserve-3d'` + `willChange: 'transform'` that GSAP depends on.
  Would be cleaner as a `.card-3d` utility.

## Dimension 7 — Event-handler naming (score 7/10)

Inventory: `onSelect, onRate, onComplete, onClose, onEdit, onChange,
onClick`.

- **F7.1** (low): `onComplete` is past-tense; React idiom is
  future-imperative (`onSubmit`) or past-imperative (`onCompleted`).
  Rename candidate: `onRated(rating, xp)` — fires when the rating
  is submitted; the challenge itself "completed" earlier at the
  final prompt.
- **F7.2** (info): `onSelect(id)` vs `onRate(rating)` — both are
  "pick from options" but value vocabularies differ. Keep split.
- **F7.3** (info): No `onChange` doubling as submit.

## Dimension 8 — Render-prop / children-as-function (score 10/10)

Grep `children={(` + `render={(` → zero. Clean.

## Dimension 9 — Ref forwarding vs React 19 ref-prop (score 10/10)

Grep `forwardRef` → zero. Round 3 kill was thorough. Clean.

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
  passes the entire Prisma row (incl. `isActive`, `createdAt`,
  `userId`, adaptive counters). Client reads only 6 fields at
  `:86-91`. If Prisma makes `promptingTips` nullable, the client
  breaks silently (type becomes `string | null` while
  `ChallengeWidget.promptingTips: string` stays). Define a DTO:
  ```ts
  // lib/dto/challenge.ts
  export type ChallengeView = Pick<
    Challenge, 'id' | 'title' | 'description' | 'promptingTips'
             | 'category' | 'currentDifficulty'
  >
  ```
  Over-fetches IDs/PII through the RSC payload too.
- **F10.2** (high): `BuchungClient({ bookings: Booking[] })` —
  same pattern. Client reads `id, type, scheduledAt, status,
  meetingUrl`. `Booking` will carry `companyId` once multi-tenant
  lands ([[scale-tenancy]]) — tenancy leak risk.
- **F10.3** (medium): `EinstellungenClient({ user: User, bookings:
  Booking[] })`. `User` includes `clerkUserId, email, createdAt`.
  DTO defends [[security]] PII-scrub policy.
- **F10.4** (medium): `SubmissionsClient.Submission` widens
  `FinalSubmission` — `useCase1/2/3` ship as `Prisma.Json`, requiring
  the hand-rolled parse at `:51-61`. Server-side DTO with typed
  `UseCase` eliminates parse cost.
- **F10.5** (info): `AppNav` narrows to `{ name, role: Role }`.
  `Role` enum drift is fine (stable contract — server auth helper
  breaks alongside).

## Dimension 11 — Discriminated unions (score 5/10)

- **F11.1** (medium): SSE event DU at `ChatInterface:149-163` is
  declared inline, not exported. Hoist to
  `lib/ai/judge-types.ts` so the server SSE producer shares the
  type — catches "I renamed `shouldShowPopup`" at compile time.
  See [[stream-lifecycle]].
- **F11.2** (medium): `AbschlussClient.view: 'form' | 'feedback'`
  + `feedback: FeedbackState | null` are coupled (`feedback: null`
  iff `view === 'form'`). DU eliminates the impossible state:
  ```ts
  type AbschlussState =
    | { view: 'form'; feedback: null }
    | { view: 'feedback'; feedback: FeedbackState }
  ```
  Migrate alongside [[react19-idioms]] F3.1 `useActionState`.
- **F11.3** (low): `ChatInterface` state bag encodes a 4-state
  FSM (`idle → streaming → awaiting-judge → awaiting-rating →
  completed`). A `useReducer` DU removes `isStreaming &&
  showRating` contradictions. Defer until the chat grows
  pause/retry affordances.

## Dimension 12 — forwardRef stragglers (score 10/10)

Covered under D9. Zero hits. Clean.

## Dimension 13 — `key` prop stability (score 6/10)

Stable id keys used correctly across 6 list sites. `key={i}` found
at five spots — four on fixed tuples (safe), one latent bug:

- **F13.3** (medium): `ChatInterface:315 (key={i})` on the
  **messages** array — grows as the user sends prompts. Today only
  appends, so functionally safe. BUT the GSAP entrance tween at
  `:65-67` tags `dataset.animated = 'true'` on the DOM node to
  skip re-animating; `key={i}` explicitly licenses React to reuse
  a node for a different message, so the dedupe flag would travel
  with the wrong content if a history re-shuffle ever lands.
  Replace with a stable UUID per message:
  ```tsx
  const [messages, setMessages] = useState<(Message & {id: string})[]>(
    () => previousAttempts.flatMap(a => [
      { id: crypto.randomUUID(), role: 'user', content: a.userPrompt },
      { id: crypto.randomUUID(), role: 'assistant', content: a.llmResponse },
    ])
  )
  ```
- **F13.1–2, F13.4–5** (info): `SubmissionsClient:135`,
  `AbschlussClient:179`, `JudgeFeedbackPopup:224/243`,
  `ChallengeCard` stars — all fixed-length tuples or popup-scoped
  remounts. Safe.

## Dimension 14 — `useImperativeHandle` / over-engineering (score 10/10)

Grep: zero. The two parent-reaches-into-child spots (`ChatInterface`
textarea focus, `OnboardingWizard` heading focus) use local refs
only, not forwarded. Correct.

## Summary — priority order

**High:**

1. **F10.1–10.4** — Introduce `lib/dto/` for the four leaky Prisma
   passes. Silent-drift + tenancy-leak surface. Pairs with
   [[react19-idioms]] F1.1 — DTO mapping moves server-side anyway.
2. **F13.3** — Stable UUID keys on `ChatInterface` message
   bubbles. Fixes the latent animation-dedupe bug.
3. **F2.1** — Flip `AnimatedNumber.onScroll` default to `false`.

**Medium:**

4. **F5.2** — Drop `rating` from `onComplete` or consume it.
5. **F6.1** — Lift `DifficultyRating` CSS-var contract out of
   globals.css coupling.
6. **F11.1** — Hoist SSE event DU to `lib/ai/judge-types.ts`.
7. **F11.2** — `AbschlussClient` DU alongside `useActionState`.
8. **F1.1** — `ChallengeTodayClient` `PoolState` DU.
9. **F3.3** — `SpeechInput.label` required (or aria-label
   fallback).

**Low:**

10. **F2.2, F2.3, F3.2** — Default/optionality alignment.
11. **F7.1** — Rename `onComplete` → `onRated`.

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

**Overall: 7.6/10.** Structurally clean (no render props, no
forwardRef, no imperative handles, no boolean traps) but D10 ORM
leakage is the biggest latent-drift surface and D2 has two
mis-polarized defaults. `ChatInterface key={i}` (D13.3) is the
only findable live-adjacent bug.

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
