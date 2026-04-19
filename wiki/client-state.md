---
title: Client State & Perceived Performance (Round 5 Review)
type: review
date: 2026-04-18
---

# Client State — Round 5

Focus: perceived performance, optimistic updates, `router.refresh()`
races, RSC → client-component state flow, navigation-time UX.
Backlinks: [[stream-lifecycle]], [[query-performance]], [[a11y-patterns]],
[[reduced-motion]].

Rounds 1–4 fixed the streaming lifecycle, judge idempotency, query
over-fetch, and pool sizing. This round audits what happens between
"user clicks" and "UI reflects truth."

## Dimension 1 — `router.refresh()` race with optimistic list (score 5/10)

`app/(app)/buchung/BuchungClient.tsx:104-109`

- **F1.1** (medium): `handleBook` does `setBookings(prev => [booking,
  ...prev])` (optimistic prepend from the POST response) THEN
  `router.refresh()` on the next line. The refresh re-renders the
  server component, which re-hydrates `<BuchungClient>` with a new
  `initialBookings` prop — but `useState(initialBookings)` only seeds
  **on mount**, not on prop change. So the locally-prepended row
  persists, and the server-revalidated list is silently ignored until
  navigate-away/back. If the POST and server-truth differ (e.g. admin
  cancelled between), the UI lies. Fix: either drop the optimistic
  prepend (trust `router.refresh`) or sync via an effect that resets
  `bookings` when the `initialBookings` identity changes. Current code
  is dual-update-but-effectively-single: the refresh round-trip is
  wasted. **Severity: medium** (data can drift).
- **F1.2** (low): `setSuccess(true)` stays `true` forever — no timer
  resets it. If the user books again in the same session the green
  banner is already there before the second POST even fires, breaking
  the success→action causal link visually. Fix: `setTimeout(() =>
  setSuccess(false), 4000)` with a cleanup ref, or clear on the next
  `setSelected`.
- **F1.3** (low): `router.refresh()` invalidates the **whole** RSC
  tree above this page (layout included). `AppLayout` calls
  `syncClerkUser()` which hits Clerk + Prisma — so every booking
  triggers a Clerk roundtrip. Fix: `revalidatePath('/buchung')` in a
  server action would scope the revalidation to this page only. See
  D2.

## Dimension 2 — `revalidatePath` / `revalidateTag` adoption (score 2/10)

Grep: no hits anywhere in the repo.

- **F2.1** (high): Every mutation path (`/api/challenges/[id]/
  abschliessen`, `/api/buchungen`, `/api/onboarding/complete`,
  `/api/challenges/generate`, `/api/submission`) is a fetch endpoint
  returning JSON. Cache invalidation happens opportunistically via
  `router.refresh()` on the client **only when the author remembered
  to call it**. `ChatInterface.handleRate` (`components/challenge/
  ChatInterface.tsx:233-254`) does NOT call `router.refresh` after
  `abschliessen` succeeds — it calls `onComplete(rating, xp)` which
  `router.push(/dashboard?xp=N)`. Next 16's router keeps a client-side
  RSC cache keyed by segment; pushing to `/dashboard` can serve a
  stale cached render if the user was on `/dashboard` earlier that
  tab-session (re-entering after completing challenge). Under
  `staleTimes.dynamic: 30` (Next 16 default) the dashboard's XP/streak
  counts can lag up to 30 s. Fix: convert `abschliessen` to a server
  action (with `revalidatePath('/dashboard')` +
  `revalidatePath('/fortschritt')` inside) OR have the route handler
  respond with a header the client reads to trigger `router.refresh()`
  before pushing. **Severity: high** — this is THE visible-drift bug
  for the headline XP number.
- **F2.2** (medium): Same class for `/api/challenges/generate` →
  `ChallengeTodayClient.handleGenerate` at `:60` calls
  `router.refresh()`, but `GeneratingScreen.tsx:36` (the onboarding
  path) does `router.push('/dashboard')` without a refresh. First
  dashboard hit after initial challenge generation may not see the
  `hasChallengeToday` / pool-emptiness flip until a second navigation.
- **F2.3** (low): `/api/submission` (abschluss) → `router.push('/
  zertifikat')` with no revalidation of `/fortschritt` or `/dashboard`
  where a "submitted" badge could live. Not wired today but worth
  documenting as the pattern-hole.

## Dimension 3 — Optimistic prepend + refresh double-render (score 6/10)

`app/(app)/buchung/BuchungClient.tsx:103-110` (same call site as F1.1)

- **F3.1** (info): The double-update creates **one** visible render,
  not two — React batches the setState + the transition kicked by
  `router.refresh()`. So the "double-render" risk the prompt asks
  about is actually hidden by batching. Documenting here: no flicker,
  but the underlying invariant-break from F1.1 remains.
- **F3.2** (medium): If the POST succeeds but the `router.refresh`
  RSC roundtrip fails (server 500 during revalidate), the optimistic
  row sits in local state forever — the user sees their booking, a
  page reload would reveal it never existed. Impossible here (the
  server DID write — we have the response), but points at the deeper
  issue: optimistic state needs a matching rollback path. React 19's
  `useOptimistic` handles this; current shape does not. **Severity:
  low** on this specific page, but establish the pattern before it
  spreads.

## Dimension 4 — Server actions absence → navigation latency (score 4/10)

Grep for `'use server'` → zero hits. All mutations are `fetch(...)`.

- **F4.1** (medium): The `handleComplete → router.push('/dashboard?
  xp=N')` flow at `ChallengePageClient.tsx:25-27` waits for the
  `abschliessen` POST (which runs a $transaction + avgScore read +
  possibly a raw UPDATE over up-to-20 challenges), then fires a
  navigation. Next 16 server actions would have let the dashboard
  RSC **stream in parallel** with the mutation — the user would see
  the dashboard skeleton immediately. With fetch+push, time-to-first-
  dashboard-byte = mutation ACK + navigation RTT. Typical: 300–800 ms
  on a warm path, up to 3 s under cold Prisma pool. Fix: convert
  `abschliessen` to a server action, return to the page via redirect,
  and add a dashboard `loading.tsx` for the suspense boundary.
- **F4.2** (low): The 500 ms `setTimeout` in `handleComplete` is a
  deliberate "let the user see the rating acknowledgment pulse"
  delay. Acceptable UX padding — flag it as intentional, not latency
  to optimise away.

## Dimension 5 — Chat history DOM bloat (score 6/10)

`components/challenge/ChatInterface.tsx:29-34` +
`app/(app)/challenge/[id]/page.tsx:27-31`

- **F5.1** (medium): `page.tsx` loads EVERY `PromptAttempt` for the
  session ordered by `createdAt asc` (see F11 on over-select — it
  loads all columns, not just `userPrompt` + `llmResponse`). At 10
  attempts with ~2 KB of markdown in `llmResponse` that's 20 KB of
  rendered ReactMarkdown + syntax highlighting in the DOM before the
  user types anything. Each turn the `useEffect` at `:54-56` runs
  `scrollIntoView({ behavior: 'smooth' })` on the bottomRef — smooth
  scroll over 30+ bubbles on mobile is janky. Fix: clamp history to
  last 5, show "View earlier attempts" disclosure; or switch to a
  virtualiser (react-window) for the log container. The `role="log"`
  works with virtualisation since aria-live is off the log itself
  (see [[a11y-patterns]]).
- **F5.2** (low): The `max-h-[460px] overflow-y-auto` container at
  `:288` caps VISUAL height but doesn't unmount the offscreen
  children — ReactMarkdown still parses all 10 attempts' markdown on
  every render of the chat component. `useMemo` around
  `MessageMarkdown` per-message would help if keyed by `(i, content)`.
  **Severity: low** (perceivable only with very active users hitting
  8+ retries).
- **F5.3** (info): `previousAttempts` is read-only and never updated
  after mount — new attempts come in via setMessages and live
  alongside `previousAttempts`-seeded messages. The distinction is
  invisible to the user but means the prop is effectively "mount-only
  seed" data, same shape bug as F1.1. Harmless here because the same
  mount lives for the whole session.

## Dimension 6 — GeneratingScreen progress signal (score 8/10)

`components/onboarding/GeneratingScreen.tsx:9-15, 25-28, 140`

- **F6.1** (info): Already implements a rotating message band
  (every 2.5 s) + a 12 s CSS keyframe progress bar filling to 95%.
  That's good UX — the user never sees a mute spinner. Reduced-motion
  kills the progress animation (`reduced ? 'none' : ...`) which is
  correct per [[reduced-motion]].
- **F6.2** (medium): The 12 s bar animation EXPIRES before Sonnet
  typically returns (15–40 s per [[next16-proxy]] maxDuration note).
  After 12 s the bar sits at 95% for another 3–28 s — exactly the
  "are we stuck?" zone. Fix: slow the animation to `ease-in-out`
  over 25 s (median observed), or pulse the 95% bar so visible
  motion continues until completion. Alternatively, stream generation
  progress over SSE like the attempt route does and map to real
  percent.
- **F6.3** (low): No retry button inline — error state offers only
  "Zurück zum Onboarding". If the generate call fails mid-Sonnet
  (which costs tokens), forcing the user to restart is punitive. Add
  a "Nochmal versuchen" button that re-fires the fetch without
  re-navigating.

## Dimension 7 — Cross-tab consistency (score 2/10)

No `BroadcastChannel`, `localStorage` event, or `visibilitychange`
listener anywhere. Grep confirms zero hits.

- **F7.1** (medium): Dashboard in tab A, challenge completed in tab
  B — tab A's RSC render (cached at the router level for the current
  segment) stays stale until the user re-navigates or hard-reloads.
  With Next 16's `staleTimes.dynamic` default of 30 s, up to half a
  minute of drift. Fix: on `abschliessen` success, the client fires
  `new BroadcastChannel('pilih').postMessage('sessions-updated')`;
  subscribers on `dashboard` / `fortschritt` / `challenge/heute`
  call `router.refresh()` on receive. One-liner per listener.
  **Severity: medium** — few users will hit this, but XP "appearing
  to reset" in tab A when it catches up is confusing.
- **F7.2** (low): Even within ONE tab, focus return from an external
  deep link (Clerk sign-in → back to app) can serve stale RSC for
  `/dashboard`. A `document.addEventListener('visibilitychange', …)`
  → `router.refresh()` guard would close this. Keep it cheap by
  rate-limiting to one refresh per 10 s. **Severity: low**.

## Dimension 8 — Form submission disabled-while-pending coverage (score 8/10)

Audited every Send/Submit site.

- **F8.1** (info): **ChatInterface send** — `disabled={!input.trim()}`
  at `:435`. MISSING: the disable branch on `isStreaming` is
  sidestepped by the button swapping to "Stoppen" (`:418`). But the
  `sendPrompt` guard at `:89` (`if (!input.trim() || isStreaming)
  return`) means pressing Enter during stream is a no-op. Correct,
  just implicit.
- **F8.2** (info): **OnboardingWizard step-next** — `canNext1/2` +
  `canSubmit` booleans drive the PrimaryButton disabled. Submit
  adds `loading` to the gate (`:275`). Complete.
- **F8.3** (info): **BuchungClient book** — `disabled={!scheduledAt
  || loading}` at `:176`. Complete.
- **F8.4** (info): **AbschlussClient submit** — `disabled={!canSubmit
  || loading}` at `:239`. Complete.
- **F8.5** (medium): **AbschlussClient FeedbackView "überarbeiten"**
  button at `:378-385` has no `disabled` or `aria-busy` — if the
  user double-clicks during the setView transition nothing breaks,
  but the button also doesn't signal it's going to swap view. Pure
  polish. **Severity: low**.
- **F8.6** (medium): **ChallengeTodayClient Generate button** at
  `:110-118` is correctly disabled. But the `handleSelect` onClick
  at `ChallengeCard` (via prop) — when `loading` is per-card (`loading
  && selectedId === c.id`), the OTHER two cards stay clickable. A
  second click races a second `/api/sessions/start` POST; the DB
  unique constraint will reject, but two selectable challenges send
  two concurrent sessions-starts before the first resolves. Fix:
  gate all three on a module-level `loading` flag, not per-card.
  **Severity: medium** (races a P2002 that returns 409 — user sees
  error, wastes RTT).

## Dimension 9 — Scroll restoration (score 6/10)

Next 16 default: scroll-to-top on `router.push`, restore on back.
No `experimental.scrollRestoration` override in `next.config`, so
defaults apply.

- **F9.1** (low): Chat `logRef` div (`ChatInterface.tsx:288`) has
  `overflow-y-auto` — its scroll position IS NOT restored by Next's
  router (which only tracks window scroll). User goes from chat →
  widget click → back = chat scrolled to top. Fix: a
  `useEffect` restores `logRef.current.scrollTop` from sessionStorage
  keyed on `sessionId`. Low priority because the `useEffect` at
  `:54-56` smooth-scrolls to bottom on messages change — combined
  with the always-visible bottom bubble this is acceptable. **Severity:
  low**.
- **F9.2** (info): `html { scroll-behavior: auto !important }` under
  reduced-motion (see [[reduced-motion]]). Correct.

## Dimension 10 — Loading UI & Suspense granularity (score 4/10)

`app/(app)/loading.tsx` — single spinner for the whole `(app)` tree.
No nested `loading.tsx` in `dashboard/`, `fortschritt/`, `challenge/`,
`challenge/heute/`. Grep for `Suspense` → zero hits in `app/`.

- **F10.1** (medium): Dashboard (`dashboard/page.tsx`) does THREE
  sequential awaits: `getCurrentDbUser` → `onboardingProfile.
  findUnique` → `dailySession.findMany`. With React 19 and Next 16
  the page could split the stats region (XP/streak/ring) from the
  "Zuletzt abgeschlossen" list into parallel Suspense boundaries,
  each with its own async component. Today the user waits for the
  longest query to render anything. **Severity: medium** — biggest
  perceived-latency lever on the landing page.
- **F10.2** (low): Fortschritt page does the same pattern with the
  heavy `include` (see [[query-performance]] F4.1). If F4.1 is
  fixed the query drops to 4 KB and the Suspense win evaporates —
  but pairing both changes (Suspense + trimmed select) gets the
  calendar visible within ~150 ms vs 800 ms today.
- **F10.3** (info): The single `loading.tsx` is an `animate-spin`
  which [[reduced-motion]] kills for motion-sensitive users. With
  no progress signal a reduced-motion user sees a static "Lade…"
  for up to 3 s. Acceptable per global contract, but considering
  adding a skeleton UI per route would be the payoff for the
  Suspense split anyway.

## Dimension 11 — Prisma query parallelisation inside `abschliessen` (score 7/10)

`app/api/challenges/[id]/abschliessen/route.ts:48-114`

- **F11.1** (low): Inside the $transaction, `tx.dailySession.
  findUnique` (`:64`) and `tx.challenge.findUnique` (`:68`) are
  independent — neither reads the other's result. A `Promise.all`
  would save one RTT (~5–15 ms warm). In a tx with serialised
  connection semantics the saving is marginal but real. Fix:
  `const [current, challenge] = await Promise.all([...])`.
- **F11.2** (info): `tx.dailySession.update` + `tx.challenge.update`
  (`:91-103`) DO depend on preceding reads + `nextDifficulty` calc.
  Keep serial. The subsequent raw UPDATE (`:106-110`) runs only if
  `delta !== 0`. Correct.
- **F11.3** (low): The pre-tx `attempts = prisma.promptAttempt.
  findMany` (`:48-51`) is correctly outside the tx per the inline
  comment (don't hold row locks longer). Could be run in parallel
  with `session = prisma.dailySession.findUnique` (`:36`) at the
  top — both are read-only independent queries. Saves one warm RTT.

## Dimension 12 — Haiku TTFT placeholder (score 7/10)

`components/challenge/ChatInterface.tsx:106, 336-342`

- **F12.1** (info): Already handled — empty-content assistant bubble
  renders the three-dot `streaming-indicator` via the
  `isStreamingBubble` branch at `:336`. First token replaces the
  dots. Haiku TTFT is 500–1500 ms, so the user sees the dots fill
  almost immediately. Solid UX.
- **F12.2** (low): Could render a grayed "Denkt nach…" text beside
  the dots for users whose reduced-motion kills the dot-bounce (they
  get `streaming-fade` per [[reduced-motion]]). The fade is subtle;
  an sr-only "Antwort wird generiert" IS already in the DOM
  (`:341`). Visual label for reduced-motion + low-vision users
  would help. **Severity: low**.

## Dimension 13 — Dashboard `?xp=N` query param dead-code (score 3/10)

`ChallengePageClient.tsx:26` pushes `/dashboard?xp=${xp}`. Grep for
`useSearchParams` → zero hits. Grep for `searchParams` in
`dashboard/page.tsx` → zero.

- **F13.1** (medium): **The `?xp=N` param is never read.** It's
  carried on the URL for zero effect. Presumably intended for a
  "+200 XP just earned!" flash toast or number delta animation on
  the XP bar. Either implement or remove. If removed, bare
  `router.push('/dashboard')`. If kept, parse via RSC
  `searchParams` prop → pass into `<XPBar>` as `previousXp` so
  F14 can animate the delta. **Severity: medium — dead code +
  missed UX**.

## Dimension 14 — XP bar delta animation after completion (score 4/10)

`components/dashboard/XPBar.tsx:28-32`

- **F14.1** (medium): The `gsap.fromTo(fill, {width: '0%'}, {width:
  progress * 100%})` tweens from ZERO every dashboard render — so a
  returning user whose XP is already 1000 watches the bar fill from
  empty to 67 % on every dashboard visit. Distracting and misleading.
  After the first mount there's no "reached that level just now"
  semantic. Fix: persist the previous-render `progress` in
  sessionStorage; tween from prev → current. **Severity: medium —
  misleading visualisation**.
- **F14.2** (medium): Missing: a delta-pop animation when the user
  just completed a challenge. Given `?xp=N` (F13), the page has
  `previousXp = totalXp - N`, so `previousProgress = xpLevel
  (previousXp).progress` lets us tween fill from previousProgress
  → currentProgress AND pop a `+N XP` floating badge. Huge perceived
  value for 30 min of work. **Severity: medium** (delight-level UX,
  not correctness).
- **F14.3** (info): `AnimatedNumber` on the XP total (`XPBar.tsx:
  57-64`) already tweens 0→value — same "always from zero" issue
  (`AnimatedNumber.tsx:63`). Paired fix: take a `from` prop that
  defaults to 0 but accepts the previous value.

## Summary

High-impact (do first):

1. **F2.1** — `revalidatePath('/dashboard')` after `abschliessen`
   (convert to server action OR fire `router.refresh` in
   `ChatInterface.handleRate` before `onComplete`). Closes the
   stale-XP-after-complete drift.
2. **F1.1** — Decide: optimistic prepend OR `router.refresh`, not
   both. If keeping both, sync `bookings` state on
   `initialBookings` prop change. Closes the silent data-drift
   window.
3. **F13 + F14.2** — Wire `?xp=N` to a delta-pop on the XP bar,
   otherwise strip the param.
4. **F10.1** — Split dashboard into Suspense boundaries for the
   stats region and the recent-list; pair with [[query-performance]]
   F2.1 select-trim.

Medium:

5. **F7.1** — BroadcastChannel for multi-tab consistency.
6. **F8.6** — Module-level loading flag in `ChallengeTodayClient`.
7. **F6.2** — Slow the GeneratingScreen progress bar to match
   observed Sonnet p50 latency (~25 s).
8. **F14.1** — Persist previous `progress` in sessionStorage so XP
   bar doesn't replay from zero on every mount.

Low:

9. **F5.1**, **F5.2**, **F9.1**, **F11.1**, **F11.3**, **F12.2**,
   **F1.2**, **F1.3**, **F3.2**, **F4.1** — quality-of-life
   improvements; some only land once the high-impact items are in.

## Cross-references

- [[stream-lifecycle]] — the streaming dots that F12 praises live in
  the same attempt route whose completion path F2.1 needs to
  invalidate.
- [[query-performance]] — F10.1's Suspense split is only worth the
  cost after F2.1 / F4.1 (Round 4) trim the underlying queries.
- [[a11y-patterns]] — F8.6's loading-flag fix must keep
  `aria-busy` alignment with button-level `aria-disabled`; focus
  management already covered there.
- [[reduced-motion]] — F6.2 and F14.1/F14.2 motion tweens MUST
  branch on the `reduced` hook.
