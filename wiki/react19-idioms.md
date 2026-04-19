---
title: React 19 Idioms (Round 6 Review)
type: review
date: 2026-04-18
---

# React 19 Idioms — Round 6

Every prior round treated the app as a fetch-client. React 19 + Next
16 ship idioms — server actions, `useActionState`, `useTransition`,
`useOptimistic`, `use(promise)`, `useFormStatus`, cleanup-refs — that
short-circuit several [[client-state]] findings without new
infrastructure. Backlinks: [[client-state]], [[next16-proxy]],
[[a11y-patterns]].

Audit: grep for `'use server'`, `useActionState`, `useOptimistic`,
`useTransition`, `useFormStatus`, `Suspense`, `use(`  → **zero** hits
anywhere in `app/` and `components/`. React 19's client-mutation
ergonomics are entirely unused.

## Dimension 1 — Server actions (score 9/10)

`'use server'` grep returns 0 files. Every mutation is a fetch
endpoint returning JSON: `/api/onboarding/complete`,
`/api/challenges/generate`, `/api/sessions/start`,
`/api/challenges/[id]/attempt`, `/api/challenges/[id]/abschliessen`,
`/api/buchungen`, `/api/submission`, `/api/zertifikat/generieren`.

- **F1.1** (high): `OnboardingWizard.handleSubmit`
  (`components/onboarding/OnboardingWizard.tsx:89-104`) POSTs
  `/api/onboarding/complete` then `router.push('/onboarding/
  generating')`. A server action
  `app/(app)/onboarding/actions.ts` with `'use server'` can do the
  Prisma write + `revalidatePath('/dashboard')` + `redirect('/
  onboarding/generating')` inline — closes [[client-state]] F2.1 for
  this path and removes one round-trip (the wizard does 1 fetch + 1
  navigation = 2 RTT; an action redirects in 1). **Severity: high**
  — foundational pattern, unlocks F2, F3, F9.
- **F1.2** (high): `ChatInterface.handleRate`
  (`components/challenge/ChatInterface.tsx:233-254`) POSTs
  `/api/challenges/[id]/abschliessen` then navigates. Convert to an
  action `completeChallengeAction(sessionId, rating)` with
  `revalidatePath('/dashboard')` + `revalidatePath('/fortschritt')`
  + `revalidatePath('/challenge/heute')` — this is exactly the fix
  [[client-state]] F2.1 flagged (up-to-30 s stale XP under Next 16's
  `staleTimes.dynamic`). The `router.refresh` band-aid at
  `ChallengePageClient.tsx:35` becomes unnecessary. **Severity:
  high**.
- **F1.3** (medium): `BuchungClient.handleBook`
  (`app/(app)/buchung/BuchungClient.tsx:85-117`) — see D8. A server
  action returning the new booking + `revalidatePath('/buchung')`
  replaces the fetch + manual-prepend + `router.refresh` trilogy
  with one async call whose return value paves `useOptimistic`.
  **Severity: medium**.
- **F1.4** (medium): `AbschlussClient.handleSubmit`
  (`app/(app)/abschluss/AbschlussClient.tsx:63-144`) — 80 lines of
  fetch + zod-error re-parse + nested branching. An action +
  `useActionState` makes zod `flatten()` the reducer payload
  directly (see D3). Chained `fetch('/api/zertifikat/generieren')`
  at `:125` becomes `await generateZertifikatAction()` with
  `after()` for the PDF render so navigation doesn't wait.
  **Severity: medium**.

## Dimension 2 — `useTransition` for long mutations (score 9/10)

Grep: zero uses of `useTransition`.

- **F2.1** (high): `GeneratingScreen`
  (`components/onboarding/GeneratingScreen.tsx:29-44`) fires POST
  `/api/challenges/generate` in a `useEffect`, blocks the page 15–
  40 s with an orbit spinner. If the generate mutation were a
  server action called via `startTransition(() => generateChallengesAction())`
  the page could render the onboarding summary behind the spinner
  and stream in the result. With `isPending` we get non-blocking
  "pending" state while the user keeps navigating — back button
  still works (it currently does, because the fetch is in-flight,
  but any subsequent in-route state doesn't). **Severity: high**.
- **F2.2** (high): `ChallengeTodayClient.handleGenerate`
  (`app/(app)/challenge/heute/ChallengeTodayClient.tsx:51-65`) runs
  the same `/api/challenges/generate` POST with a `generating`
  boolean. `const [isPending, startTransition] = useTransition()` +
  action call gives the same UX with free
  `router.refresh`-equivalent via `revalidatePath`. The
  `setGenerating(false)` bug-path (on catch) is no longer needed.
  **Severity: medium**.
- **F2.3** (low): `OnboardingWizard` step transitions (`:159`,
  `:244`, `:272`) are pure `setStep` — no pending state needed.
  Wrapping in `startTransition` becomes relevant only when step-
  2/3 prefetch server data. **Severity: low**.
- **F2.4** (medium): `ChatInterface.sendPrompt`
  (`components/challenge/ChatInterface.tsx:88-227`) manages its own
  `isStreaming` boolean for an SSE stream — `useTransition`
  doesn't apply (SSE isn't a single promise), but `useOptimistic`
  absolutely does for the user-message append at `:93`. See D8.
  **Severity: medium**.

## Dimension 3 — `useActionState` for forms (score 8/10)

- **F3.1** (high): `AbschlussClient`
  (`app/(app)/abschluss/AbschlussClient.tsx:63-144`) hand-parses
  zod `fieldErrors` + `formErrors` from a JSON response at
  `:100-110`, including a regex against field names
  (`/^useCase([123])$/`). The server already uses zod — an action
  with `useActionState<SubmissionState, FormData>(submitAction,
  initialState)` lets the server return the typed state object
  directly:
  ```ts
  // app/(app)/abschluss/actions.ts
  'use server'
  export async function submitAction(_prev: State, form: FormData): Promise<State> {
    const parsed = schema.safeParse(Object.fromEntries(form))
    if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
    // ...
  }
  ```
  Client reads `state.fieldErrors.useCase1?.title` with zero regex.
  **Severity: high** — removes a whole branch of fragile
  client-side error massaging.
- **F3.2** (medium): `OnboardingWizard`
  (`components/onboarding/OnboardingWizard.tsx:89-104`) has an
  `error` string that's only ever set to one generic message.
  `useActionState` with a typed `{ ok: boolean, fieldErrors?:
  {companyName?: string[]; ... } }` shape lets the per-field
  `aria-invalid` at `:308` reflect **server-validated** empties
  (currently only client-side `value.trim().length === 0`). Closes
  the client↔server validation gap. **Severity: medium**.
- **F3.3** (medium): Validation shape sharing — put the zod schema
  in `lib/schemas/submission.ts`, import into both the server
  action and the client for the `canSubmit` gate. Today
  `AbschlussClient.FIELD_MIN` (`:26-31`) duplicates server-side
  zod `.min()` constants. If the server tightens
  `description: 20 → 30`, the client still green-lights at 20 and
  shows confused rejected-submission feedback. **Severity:
  medium** (drift risk, not a live bug).

## Dimension 4 — `use(promise)` streaming (score 6/10)

- **F4.1** (medium): `app/(app)/dashboard/page.tsx:12-34` does
  sequential awaits: `getCurrentDbUser` → `onboardingProfile.
  findUnique` → `dailySession.findMany`. [[client-state]] F10.1
  already called out the Suspense split; the React 19 idiom is:
  pass unawaited promises from the page to a client leaf and
  unwrap with `use()`:
  ```tsx
  // dashboard/page.tsx (server)
  const sessionsPromise = prisma.dailySession.findMany({...})
  return <Suspense fallback={<RecentSkeleton />}><RecentList sessionsPromise={sessionsPromise} /></Suspense>
  // dashboard/RecentList.tsx  'use client'
  export function RecentList({ sessionsPromise }: { sessionsPromise: Promise<S[]> }) {
    const sessions = use(sessionsPromise)
    return <>{sessions.map(...)}</>
  }
  ```
  The stats trio (streak/DayRing/XPBar) streams independently of
  the recent-list. Paired with [[query-performance]] F4/F11, TTFB
  on `/dashboard` drops from "slowest query" to "fastest query".
  **Severity: medium**.
- **F4.2** (low): `ChallengePage` (`app/(app)/challenge/[id]/page.tsx:
  13-30`) awaits user → challenge → session → attempts serially.
  Challenge + session + attempts are all keyed by ids known from
  params; `Promise.all([challenge, session, attempts])` + `use()`
  on the leaf eliminates three stacked RTTs. **Severity: low**
  (the page is sub-500 ms cold today, not a user-visible win).
- **F4.3** (info): `params`/`searchParams` are **already**
  promises in Next 16 (`:11`, `:12`) and the code awaits them —
  these could also ride `use()` from a client boundary if the
  layout split that way. Not worth refactoring for.

## Dimension 5 — `cache()` dedup beyond `getCurrentDbUser` (score 7/10)

`getCurrentDbUser` is wrapped in `cache()` at
`lib/utils/auth.ts:26`. It's the only cache-wrapped helper.

- **F5.1** (high): `prisma.onboardingProfile.findUnique({where:{
  userId: user.id}})` appears 4 times across render trees:
  `app/(app)/dashboard/page.tsx:15`,
  `app/(app)/onboarding/page.tsx:11`,
  `app/(app)/onboarding/generating/page.tsx:10`,
  `app/api/challenges/generate/route.ts:34`. Within **one**
  request tree only one fires — but the repeated code is
  copy-paste and the guard semantics
  (`!profile?.completedAt` redirect vs `profile?.completedAt`
  redirect) are subtly inverted across `onboarding/page.tsx:14`
  vs `dashboard/page.tsx:19`. Hoist to
  ```ts
  // lib/utils/auth.ts
  export const getOnboardingProfile = cache(async (userId: string) =>
    prisma.onboardingProfile.findUnique({ where: { userId } }))
  ```
  and expose `requireOnboarded()` / `requireNotOnboarded()` guards
  so the redirect direction is named. **Severity: high**
  (correctness + dedup; `cache()` is just the implementation
  detail).
- **F5.2** (medium): `prisma.dailySession.findMany` for the
  current user is reached from `dashboard/page.tsx:24`, `fortschritt/
  page.tsx:16`, and indirectly via `challenge/heute/page.tsx:14`.
  Different `select` shapes, but a `cache()`-wrapped
  `getCompletedSessions(userId)` with the maximal-superset select
  would let a future `(app)/layout.tsx` prefetch once and all
  three pages reuse. Only worth it after Suspense boundaries
  split (D4) — otherwise the layout adds blocking latency.
  **Severity: low** today, **medium** once D4 lands.
- **F5.3** (low): `getCurrentDbUser` under real Clerk becomes
  `auth()` + `clerkClient.users.getUser(id)` + upsert. The
  `cache()` wrapper is load-bearing for that future — document
  as a deploy-blocker if removed during the Clerk migration.

## Dimension 6 — Suspense boundary placement (score 7/10)

Zero `<Suspense>` usage anywhere in `app/`. Single
`app/(app)/loading.tsx` spinner covers the whole tree.

- **F6.1** (medium): `ChallengePageClient`
  (`app/(app)/challenge/[id]/ChallengePageClient.tsx:54-121`) has
  three staggered GSAP elements: topbar, widget, chat. The
  widget renders static props; `ChatInterface` only needs
  `previousAttempts` (already pre-fetched). If the server page
  split the attempts query into a separate Suspense boundary:
  ```tsx
  <ChallengeWidget {...challenge} />
  <Suspense fallback={<ChatSkeleton />}>
    <ChatLoader attemptsPromise={attemptsPromise} ... />
  </Suspense>
  ```
  the widget paints at ~50 ms while the attempts (can be 8 rows
  × 2 KB markdown) hydrate a beat later. On cold Prisma pool
  (up-to-3 s), user sees "read the prompt" immediately instead of
  a page-wide spinner. **Severity: medium**.
- **F6.2** (medium): `/fortschritt` has the heavy `attempts:
  {orderBy, take: 1, select: {judgeScore: true}}` include
  (`fortschritt/page.tsx:24-28`). After [[query-performance]] F4.1
  this is still 21 rows × 1 judgeScore — fine, but the calendar
  UI is instant from `days` while the challenge list needs
  `selectedChallenge.title` which joins. Suspense the list, render
  calendar + stats instantly. **Severity: low**.
- **F6.3** (low): `/buchung` page has no sequential awaits worth
  splitting — single `findMany({ userId })`.

## Dimension 7 — Per-route error boundaries (score 6/10)

Grep: only `app/(app)/error.tsx` + `app/global-error.tsx`. No
nested boundaries per route.

- **F7.1** (medium): A Prisma timeout on
  `/fortschritt` currently bubbles to `app/(app)/error.tsx` and
  blows away the AppNav + topbar too (error.tsx is a **sibling**
  of layout.tsx, so the layout survives, but this was confusing
  in round 5 tests — the `unstable_retry` re-runs the layout's
  `syncClerkUser` as well). Per-route `app/(app)/fortschritt/
  error.tsx` with a retry CTA scopes recovery to the page and
  salvages the nav/topbar. **Severity: medium**.
- **F7.2** (medium): `/challenge/[id]` errors (session 404,
  challenge ownership mismatch) currently `redirect()` from the
  server page (`challenge/[id]/page.tsx:20, 22, 25`) — silent,
  not an error boundary concern. But if
  `prisma.promptAttempt.findMany` at `:27-30` throws (rare: pool
  exhaustion), the shared error.tsx swallows it. A route-local
  `error.tsx` with "Chat-Verlauf konnte nicht geladen werden —
  starte die Challenge neu" is warmer than "Etwas ist
  schiefgelaufen". **Severity: low**.
- **F7.3** (low): `app/(app)/abschluss/error.tsx` would cover
  the `useActionState` path if the action itself throws
  (currently fetch catches via `try`). Server-action throws
  propagate to the nearest `error.tsx`, which is **today** the
  `(app)` shared one — sufficient until copy-per-route matters.
- **F7.4** (info): `unstable_retry` is Next 16's successor to
  `reset`. `error.tsx` uses it correctly
  (`app/(app)/error.tsx:11`). No change.

## Dimension 8 — `useOptimistic` for BuchungClient (score 9/10)

- **F8.1** (high): `BuchungClient.handleBook`
  (`app/(app)/buchung/BuchungClient.tsx:85-117`) rolls its own
  optimistic prepend at `:109` + `router.refresh()` at `:114`.
  [[client-state]] F1.1 already flagged the invariant-break
  (useState seeds on mount, refresh re-seeds only on remount).
  `useOptimistic` is the exact match:
  ```tsx
  const [optimisticBookings, addOptimistic] = useOptimistic(
    initialBookings,
    (state, newBooking: Booking) => [newBooking, ...state]
  )
  async function handleBook() {
    const temp = { id: crypto.randomUUID(), ...form, pending: true }
    addOptimistic(temp)
    await createBookingAction(form) // server action revalidates
  }
  ```
  The action's `revalidatePath('/buchung')` re-seeds
  `initialBookings` on next render; `useOptimistic` automatically
  drops the temp row once the server render arrives. No
  invariant break, no dual-render, no `setTimeout(3000)` for the
  success banner (read from `useFormStatus.pending` instead).
  **Severity: high** — closes [[client-state]] F1.1 and F1.2 in
  one swap.
- **F8.2** (medium): `ChatInterface.sendPrompt` at
  `components/challenge/ChatInterface.tsx:93, 106` has a two-step
  optimistic append (user bubble + empty assistant bubble). The
  assistant bubble isn't optimistic per se (it fills from
  stream), but the user bubble is. `useOptimistic(messages,
  reducer)` cleans the `setMessages(prev => [...prev, {role:
  'user', content: userMsg}])` call AND would roll back on fetch
  failure — today the user-bubble stays (see the `err` catch at
  `:209` which only drops the assistant bubble). **Severity:
  medium** (user's text stays displayed after a network failure,
  which is arguably the right UX but not intentional).

## Dimension 9 — `useFormStatus` for submit buttons (score 7/10)

Grep: zero uses. Every submit button hand-wires `{loading ?
'Wird …' : '…'}`.

- **F9.1** (medium): Once server actions are in
  (`<form action={bookingAction}>`), extract a
  `<SubmitButton />` that reads `useFormStatus().pending`. The
  pattern then reuses across the 5 submit buttons:
  `OnboardingWizard:275`, `BuchungClient:181`,
  `AbschlussClient:237`, `ChallengeTodayClient:110`,
  `AbschlussClient:378` (the "überarbeiten" button — not a
  submit today, but [[client-state]] F8.5 wants it disabled
  during transition). DRYs up 5 copies of the loading-label
  ternary. **Severity: medium**.
- **F9.2** (medium): `useFormStatus` exposes `pending`,
  `data`, `method`, `action` — the `data` is the FormData being
  submitted. A shared `<FieldError name={field} />` component
  reading `state.fieldErrors[field]` via `useActionState` +
  `useFormStatus` for the "while submitting, suppress error" UX
  eliminates the per-field length counter noise at
  `AbschlussClient:220-226` while a submission is in flight.
  **Severity: low**.
- **F9.3** (info): The pattern **doesn't** apply to
  `ChallengeTodayClient.ChallengeCard` selection (it's a
  three-button choice, not a form submission). See
  [[client-state]] F8.6 — module-level `loading` flag is still
  the right fix there.

## Dimension 10 — Ref callbacks with cleanup (score 4/10)

React 19 allows ref callbacks to return a cleanup function,
eliminating a class of `useCallback`+`useEffect` pairs.

- **F10.1** (low): `ChatInterface.bottomRef` + `logRef` at
  `:42-43` are simple element refs — no cleanup. No change.
- **F10.2** (low): `SpeechInput.recognitionRef` at
  `components/onboarding/SpeechInput.tsx:17` + the unmount
  cleanup `useEffect` at `:23-32` that aborts
  `recognitionRef.current`. This is **state**, not an element
  ref — not a candidate for a cleanup-ref. Leave it.
- **F10.3** (medium): `OnboardingWizard` has a focus-on-step-
  change pattern (`:71-74`) with a plain `useEffect` +
  `querySelector`. A ref callback on the heading element per
  step would be cleaner:
  ```tsx
  <h2 ref={(el) => {
    if (!el) return
    el.focus()
    return () => { /* focus restore if needed */ }
  }}>
  ```
  Today the `querySelector('.onb-step h2')` works but is coupled
  to CSS class names — a DOM-class refactor silently breaks
  accessibility focus management (a long-time [[a11y-patterns]]
  concern). Ref callback is structural, class-name-agnostic.
  **Severity: medium** (silent-break surface → eliminate).
- **F10.4** (low): `AppError.headingRef`
  (`app/(app)/error.tsx:15` + `:20-22`) focuses on mount. Same
  candidate as F10.3 — single effect just to call `.focus()`.
  The ref-callback form saves a `useRef` + `useEffect`
  combined:
  ```tsx
  <h1 ref={(el) => { el?.focus() }}>
  ```
  **Severity: low** (cosmetic).

## Summary — priority order

**Foundation (do first, unblocks others):**

1. **F1.1 + F1.2** — Build `app/(app)/*/actions.ts` for
   onboarding, challenge-complete, generate-challenges. Delete
   corresponding fetch routes (keep `/api/challenges/[id]/attempt`
   as route — SSE streaming doesn't map to actions). This closes
   [[client-state]] F2.1 (the biggest stale-XP bug).
2. **F5.1** — Hoist `getOnboardingProfile` + named
   `requireOnboarded/requireNotOnboarded` helpers.

**High-impact after foundation:**

3. **F3.1** — Rewrite `AbschlussClient` with `useActionState` +
   shared zod schema. Kills the regex-on-field-names code.
4. **F8.1** — Swap `BuchungClient`'s manual optimistic prepend
   for `useOptimistic`. Closes [[client-state]] F1.1 + F1.2.
5. **F4.1 + F6.1** — Dashboard + ChallengePage Suspense splits
   with `use(promise)` leaves. Pair with [[query-performance]]
   F4.1 trimmed selects.

**Medium:**

6. **F2.1 + F2.2** — `useTransition` for `/api/challenges/
   generate` callers (`GeneratingScreen`, `ChallengeTodayClient`).
7. **F9.1** — Shared `<SubmitButton/>` with `useFormStatus`.
8. **F7.1** — Per-route `error.tsx` for `/fortschritt` and
   `/challenge/[id]`.
9. **F10.3** — Ref callback for `OnboardingWizard` step-heading
   focus. Removes brittle class selector.

**Low:**

10. **F3.3** — Extract submission zod schema to
    `lib/schemas/submission.ts` for client/server reuse.
11. **F5.2** — `getCompletedSessions()` cached helper, once D4
    lands.
12. **F10.4** — Ref callback for `AppError` heading focus.

## Cross-references

- [[client-state]] — F2.1 (stale XP), F1.1 (optimistic invariant),
  F10.1 (Suspense split) are closed or short-circuited by
  server actions + `useOptimistic` + `use(promise)` respectively.
- [[next16-proxy]] — `maxDuration: 60` on LLM routes must carry
  over to server actions (`export const maxDuration = 60` in
  the action file). `instrumentation.ts` already handles env at
  boot — no change.
- [[a11y-patterns]] — F10.3 + F10.4 cleanup-refs eliminate a
  class-selector coupling risk that could silently regress
  focus management.
- [[query-performance]] — F4.1/F5.1 gains only fully realise
  after the Round 4 `select` trims land.
