---
title: Network Resilience (Round 7 Review)
type: review
date: 2026-04-18
---

# Network Resilience — Round 7

Focus: flaky wifi, mobile tunnels, Vercel cold-start 502, SSE drops,
offline UX, fetch-level resilience, draft persistence. Rounds 1–6
neutralised correctness, streaming, cost, client-state and a11y. This
round audits what happens when the pipe itself goes wobbly.

Backlinks: [[client-state]], [[stream-lifecycle]], [[observability]],
[[reduced-motion]], [[copy-tonality]].

Nine client fetch call-sites audited:

- `components/challenge/ChatInterface.tsx:112` (SSE attempt)
- `components/challenge/ChatInterface.tsx:236` (abschliessen JSON)
- `components/onboarding/OnboardingWizard.tsx:93`
- `components/onboarding/GeneratingScreen.tsx:29`
- `app/(app)/buchung/BuchungClient.tsx:90`
- `app/(app)/abschluss/AbschlussClient.tsx:67`
- `app/(app)/abschluss/AbschlussClient.tsx:125` (certificate gen)
- `app/(app)/challenge/heute/ChallengeTodayClient.tsx:36, 55`
- `app/(admin)/admin/AdminClient.tsx:44`,
  `app/(admin)/admin/submissions/SubmissionsClient.tsx:35`

Grep for `navigator.onLine`, `'online'`/`'offline'` listeners,
`BroadcastChannel`, `sessionStorage`, `localStorage`, service worker
manifest — **zero hits** across the app source tree. Network events
are not observed; nothing is persisted client-side.

## Dimension 1 — Fetch without client-side timeout (score 3/10)

Only ONE callsite arms a client-side deadline (`ChatInterface.tsx:100`,
120 s via `setTimeout → controller.abort()`). The other eight accept
whatever the runtime decides — which, with Next 16 on Vercel fluid, is
effectively `maxDuration=60` on the route side, no ceiling on the
client side. A dead TCP socket on a train-tunnel wifi just hangs the
fetch until the OS eventually declares it dead (minutes).

- **F1.1** (high): `OnboardingWizard.handleSubmit`
  (`OnboardingWizard.tsx:93-104`) has `setLoading(true)` → fetch
  without `AbortSignal.timeout(…)`. The button shows
  "Wird gespeichert…" forever if the network stalls. Fix: wrap with
  `AbortSignal.timeout(15_000)` and catch `err.name === 'TimeoutError'`
  to surface "Zeitüberschreitung. Prüfe deine Verbindung und versuche
  es erneut." Severity high because the user is pre-challenge — a
  stuck onboarding page burns the first-impression of the product.
- **F1.2** (high): `GeneratingScreen.tsx:29` is the single
  longest-running client fetch in the app (Sonnet generates 21
  challenges, p50 ~25 s, p95 up to 55 s per [[next16-proxy]]
  `maxDuration`). With no client timeout, a wifi flap leaves the
  orbit spinner animating forever — the user never sees
  "etwas lief schief". Fix: `AbortSignal.timeout(65_000)` (server cap
  + 5 s slack for the JSON body), routed to the existing `setError`
  path which already renders a "Zurück zum Onboarding" button (but
  see F5.3 on the missing retry).
- **F1.3** (medium): `BuchungClient.tsx:90`, `AbschlussClient.tsx:67`,
  `ChallengeTodayClient.tsx:36,55`,
  `ChatInterface.tsx:236 (abschliessen)` all lack
  `AbortSignal.timeout`. They're short routes (DB writes) so p95 is
  ~1 s, but a flap during the request is user-visible as "Wird
  gebucht…" / "Wird eingereicht…" with no exit. Fix: factor a
  `fetchWithTimeout(url, init, ms = 20_000)` helper in
  `lib/utils/fetch-client.ts` and thread it through all six sites.
- **F1.4** (low): `AbschlussClient.tsx:125` (`/api/zertifikat/generieren`)
  is fire-and-forget-awaited — if it hangs, the `router.push('/zertifikat')`
  never runs. User sees the submission succeed but is stuck on the
  abschluss page. Fix: give this a short timeout (5 s) and navigate
  regardless; the zertifikat page can itself re-trigger generation if
  the PDF is missing. **Severity: low** but a real UX dead-end.

## Dimension 2 — Retry on transient 502/503/504 (score 2/10)

Grep for `res.status === 502|503|504` → two matches, both reactive
(render an error string), not a retry trigger. The server-side retry
loops exist for Anthropic (`lib/ai/llm.ts:44-54`, classifies
529/429/400/401 correctly per [[observability]]), but the client
never retries a Vercel edge 502/504.

- **F2.1** (high): A cold Vercel fluid instance serving
  `/api/challenges/[id]/attempt` during the first user of the region
  can 502 (route-handler cold start > 10 s hitting the load balancer's
  ceiling). Today the user sees "Fehler beim Laden der Antwort" and
  must retype their prompt. A single retry with 500 ms backoff (NOT
  the idempotent retries of Dim 6 — just one warm-miss compensator)
  would hide 80% of these. Fix: in `ChatInterface.sendPrompt`, if
  `res.status` in `[502, 503, 504]` AND `retried === false`, wait
  500 ms and re-fire the same POST. Pair with Dim 3 so offline users
  don't consume the retry budget. **Severity: high** — this is the
  single most common "the app broke" event on mobile. The prompt IS
  still in `assistantContent` at that point so the retry is free.
- **F2.2** (medium): `ChallengeTodayClient.handleSelect`
  (`:36-48`) → `/api/sessions/start` is idempotent (client supplies
  `existingSessionId`, server just upserts). A retry on 502/503/504
  would close the "session-start failed, user gave up" funnel leak.
  Fix: retry once with 500 ms jitter.
- **F2.3** (low): `GeneratingScreen.tsx:29` should NOT blanket-retry
  — Sonnet generation costs tokens, and a partial-success has already
  been persisted server-side. But on pure network errors (`err.name
  === 'TypeError'` pre-response) the request never reached the
  server, so the attempt was free. Distinguish "no response body"
  (retry) from "response.ok === false" (don't retry — server did the
  work).
- **F2.4** (info): `AdminClient.loadMore` (`:39-57`) + `submissions
  override` (`:32-48`) today just swallow non-ok. Admin-facing,
  lower severity, but the pattern-fix at F2.1 scope should cover
  these gratis.

## Dimension 3 — Offline detection (score 1/10)

Zero `navigator.onLine` reads, zero `online`/`offline` listeners.
On a flaky connection the user sees identical UX whether the server
is broken or their wifi reconnected.

- **F3.1** (high): Add a `useOnlineStatus()` hook
  (`components/ui/hooks/useOnlineStatus.ts`) that wires
  `addEventListener('online' / 'offline', …)` to a boolean state,
  seeded from `navigator.onLine` via `useSyncExternalStore` (same
  pattern as `BuchungClient`'s `minDateStr`). Gate every fetch site
  on it: if offline, short-circuit with toast "Du bist offline.
  Verbindung prüfen und erneut versuchen." NO wire call. **Severity:
  high** — the cheapest possible "it's you, not us" signal.
- **F3.2** (medium): `ChatInterface` should render a persistent
  offline banner above the input (`role="status"`,
  `aria-live="polite"`) when `!onLine`. Disable the send button and
  the "Challenge abschließen" button. Re-enable on `'online'`.
  Matches the "deliberate, not guessing" copy tone of
  [[copy-tonality]].
- **F3.3** (low): `navigator.onLine` lies on some platforms (Windows
  reports `true` whenever any NIC is up, Safari can lag). Don't
  fail-closed on it — treat `false` as a pre-flight hint, not an
  error ground-truth. The fetch error path remains authoritative.

## Dimension 4 — SSE reconnect mid-stream (score 1/10)

`ChatInterface.tsx:139-208` reads the SSE body via
`res.body.getReader()` in a single-shot loop. If the TCP socket
drops mid-stream (wifi hiccup, mobile tunnel, cell tower handoff),
`reader.read()` throws, the `catch` branch at `:209` fires with
`err.name === 'AbortError'` false → renders the fallback text
"Fehler beim Laden der Antwort." The server has already spent Haiku
+ Sonnet tokens, persisted the attempt, but the user saw a truncated
bubble and thinks the system broke.

- **F4.1** (high): No resume protocol. Native `EventSource` supports
  `Last-Event-ID` + server-side `retry:` directive, but we're using
  `fetch` (because we need POST with a body). Implement a minimal
  resume:
  1. Server emits `id: <attemptId>` with `data: …` lines once
     `attempt` is persisted.
  2. On `reader.read()` throw with `assistantContent.length > 0` AND
     `latestJudge === null`, the client POSTs
     `/api/challenges/[id]/attempt?resumeAttemptId=…` which the route
     short-circuits to stream the persisted judge+done from DB.
  3. If `assistantContent.length === 0`, the client retries the
     original POST (same user prompt) — server's attempt-number retry
     loop (`route.ts:197-233`) handles the P2002 case if a duplicate
     lands. **Severity: high** — directly closes the "Sonnet 529
     dropped me halfway" class. See [[stream-lifecycle]] for why the
     server already supports the partial-success persistence.
- **F4.2** (medium): Cheap partial-fix without server changes: if the
  stream drops AFTER `type: 'judge'` was received but before
  `type: 'done'`, the client already has the data it needs to finish
  the flow. Set `isStreaming=false` in the `type: 'judge'` branch's
  `setTimeout(…, 800)` fallback. See also Dim 7.
- **F4.3** (low): The 120 s `AbortSignal` timeout at
  `ChatInterface.tsx:100` is a blanket wall-clock cap; it doesn't
  distinguish "server is slow" from "my connection died". Extend
  the abort to a `lastChunkAt` sliding-window: if no bytes for 30 s,
  abort locally with a "Verbindung scheint weg" message. The 120 s
  overall cap stays for the server-slow case.

## Dimension 5 — Differentiated error copy (score 3/10)

Today the user sees the same "Fehler beim Laden der Antwort."
regardless of whether (a) their wifi is flaky, (b) Sonnet 529'd, (c)
the Prisma pool is saturated, or (d) they're offline. Support can't
triage these.

- **F5.1** (medium): Classify errors at the catch site into three
  buckets: NETWORK (`err.name === 'TypeError'` pre-response, or
  `!navigator.onLine`), TIMEOUT (`err.name === 'TimeoutError' |
  'AbortError'` from the timeout signal — distinguish from
  user-pressed-stop by checking if `userAborted === true` on the
  controller ref), SERVER (`!res.ok`, optionally read
  `res.headers.get('x-retry-after')`). Map to three distinct German
  strings — see [[copy-tonality]] for the warm-not-clinical register.
- **F5.2** (medium): Surface `res.headers.get('retry-after')` when
  present — Anthropic's 429 and Vercel's 503 both emit it. Show
  "Die KI ist gerade ausgelastet. Versuch's in ~20 s wieder." with
  the number pulled from the header.
- **F5.3** (low): `GeneratingScreen.tsx:100-110` error branch has
  only "Zurück zum Onboarding" — forcing a restart after Sonnet
  already half-ran. Add a "Nochmal versuchen" button next to it
  that re-fires the POST without unwinding onboarding state.
  (Already flagged as `F6.3` in [[client-state]] Round 5; restating
  here for the network-failure angle.)

## Dimension 6 — Draft persistence for dropped sends (score 1/10)

User taps Send on a 600-char prompt, fetch never reaches (dead tower
during button-tap), client shows "Fehler". The prompt is **lost** —
it was moved from `input` state into `messages` as a user bubble
(`ChatInterface.tsx:93`) and `setInput('')` cleared the textarea.
The bubble will be stripped on the next render if `assistantContent`
is empty (the AbortError branch at `:215` does this). 60 s of the
user's typing, gone.

- **F6.1** (high): On fetch failure (NETWORK / TIMEOUT class from
  F5.1) restore the user's prompt to `setInput(userMsg)`. They see
  their text re-appear in the textarea, can re-submit. **Severity:
  high** — pure-loss UX today. Dead-simple code change: one line in
  the catch branch, gated on the error class.
- **F6.2** (medium): `AbschlussClient.handleSubmit` failure already
  keeps `cases` state intact — good. But `OnboardingWizard.handleSubmit`
  failure keeps `form` state too (`:100-103` sets error, no state
  reset) — also good. The exposure is the single-chat-turn case above.
- **F6.3** (medium): Persist in-flight user prompts to
  `sessionStorage` keyed `pilih:chat-draft:<sessionId>` *before* the
  fetch fires. If the client crashes (OOM on mobile Safari, tab
  suspended during tunnel), on re-entry `ChatInterface` checks for
  a draft and rehydrates `input`. TTL 1 h. Low-cost, massive goodwill.
- **F6.4** (low): Building a full BackgroundSync-style queue (service
  worker or `navigator.connection.addEventListener('change', …)`)
  is overkill for an attempt route — the prompt is
  conversation-context, replaying it out-of-session would confuse
  the judge. Keep the queue idea off the board. **Severity: low**
  because it's the wrong shape for this domain.

## Dimension 7 — Judge-without-done stuck-streaming (score 5/10)

`type: 'judge'` sets `latestJudge` / attempts state but leaves
`isStreaming` true until `type: 'done'` lands (`:191-193`). If the
network drops between those two events the client sees: judge bubble
rendered, judge-feedback-button shown... but `isStreaming: true`
forever — textarea disabled, send button swapped to "Stoppen", the
user can't send another turn or finish.

- **F7.1** (high): After receiving `type: 'judge'`, schedule a
  safety timeout: `setTimeout(() => if (isStreaming) setIsStreaming(false), 2000)`.
  The server emits `done` immediately after the judge event (one
  microtask), so 2 s is generous. If `done` arrives, clear the
  timeout. Covers the drop-between-events case without breaking the
  happy path. **Severity: high** — this reproduces on real networks.
- **F7.2** (medium): Server-side: emit `type: 'judge'` AND
  `type: 'done'` in the same `safeEnqueue` call (concatenate both
  `data: …\n\n` payloads) — TCP will deliver them atomically inside
  the same packet if both fit in MSS. Reduces the
  race window to ~0 ms. See `route.ts:257-265` — the two
  `safeEnqueue` calls could be one.
- **F7.3** (low): Instrument how often the done event fails to reach
  the client: tag the stream with a per-request ID, the client sends
  a best-effort `POST /api/client-event {kind: 'stream-stuck', id}`
  when F7.1's safety timeout fires. Feeds into the
  [[observability]] client-error sink (`F8.1` there).

## Dimension 8 — Page-reload / back-button state recovery (score 7/10)

Good news first: `app/(app)/challenge/[id]/page.tsx:27-31` loads
**all persisted `PromptAttempt` rows** and seeds `previousAttempts`
into `ChatInterface`. So a browser back → forward or a hard reload
mid-challenge correctly rehydrates the visible chat log. The
[[stream-lifecycle]] client-disconnect-persistence fix (only drop
attempts when `fullResponse.length === 0`) means a user who closed
the tab mid-Haiku gets their last attempt back.

- **F8.1** (medium): The `input` draft text is NOT preserved — back
  button clears it. Tied to F6.3; same `sessionStorage` draft.
- **F8.2** (medium): If the user reloads DURING a stream, the
  client re-mounts and seeds from DB. BUT the in-flight attempt (not
  yet persisted) is lost. Mitigation: the client-disconnect-persist
  path runs server-side IF Haiku has produced any tokens
  (`route.ts:175-182`); so a reload after first tokens DOES save
  progress. A reload within the first 500–1500 ms (Haiku TTFT) drops
  the attempt AND doesn't consume the rate-limit slot (neutral). Live
  with it; document here.
- **F8.3** (low): `showRating` / `judgeFeedback` UI state (whether
  the user already opened the rating pane) is not persisted. Back
  → forward re-opens the rating prompt. Low because re-rating the
  same session is idempotent server-side (see
  [[data-integrity]] AlreadyApprovedError-style pattern). Skip
  unless support tickets raise it.

## Dimension 9 — Service worker / offline-first (score 0/10)

No `manifest.json`, no `sw.ts`, no `next-pwa`. Grep confirms nil.

- **F9.1** (low): For PILIH's shape — 21 daily touches, each needing
  a live Anthropic call — a service worker would buy very little.
  Chat, rating, generation, submission all REQUIRE network. The
  static shell (dashboard chrome, nav) is small and Next.js's
  default RSC prefetch already warm-caches it. **Severity: low** —
  the ROI isn't there until there's a "read past completed
  challenges offline" feature.
- **F9.2** (medium): Missing `manifest.json` + `theme-color` meta +
  maskable icons means "Add to Home Screen" gives a subpar icon and
  no splash. The product IS a daily-habit app — PWA-installability
  matters. Fix: add `public/manifest.json` with name, short_name,
  icons (192 + 512 px maskable), theme_color matching the deployed
  `meta.theme-color`, display: `standalone`, start_url `/dashboard`.
  This is cheap (no SW needed) and unlocks the home-screen icon.
  **Severity: medium** — product-shape-aligned UX win.
- **F9.3** (info): If at some point a "21 challenges recap" or
  certificate-offline-view ships, revisit. Service workers are not
  a network-resilience tool here; they're a feature-unlock tool.
  Mark deferred.

## Dimension 10 — Credentials / CORS / same-origin (score 10/10)

All fetches are same-origin absolute paths (`/api/…`). Cookies
(Clerk session) attach automatically on same-origin by default.
No `Access-Control-Allow-*`, no cross-origin issues possible.
The same-origin-guard (`lib/utils/csrf.ts`, applied on mutating
routes per [[csrf-origin-guard]]) is the only cross-origin surface
and it's a deny-list.

- **F10.1** (info): Verified. No action needed.
- **F10.2** (info): The only externally-originating network
  surface is the Clerk sign-in redirect + the Anthropic SDK
  (server-side only). Both covered in [[security]] / [[auth-flow]].
  No client-side cross-origin fetches to worry about.

## Priority matrix

High-impact (do this week):

1. **F6.1** — Restore the user's prompt on fetch failure. Single
   line, eliminates a pure-loss UX. Pair with F5.1 classification.
2. **F2.1** — One automatic retry on 502/503/504 for the attempt
   route. Hides Vercel cold-start misses.
3. **F4.1** — SSE resume via `resumeAttemptId` query param. Closes
   the "judge was streamed, connection dropped, I see Fehler"
   class. The server-side persistence already exists; the client
   just needs to ask.
4. **F7.1** — 2 s safety timeout after `type: 'judge'` flipping
   `isStreaming=false`. Fixes stuck-streaming between judge and
   done events.
5. **F3.1** — `useOnlineStatus` hook + pre-flight short-circuit on
   every fetch. Cheapest possible "it's you, not us" signal.
6. **F1.1 + F1.2** — `AbortSignal.timeout()` on onboarding and
   generating fetches. Ends the infinite-spinner class.

Medium:

7. **F5.1 + F5.2** — Differentiated error copy (NETWORK / TIMEOUT /
   SERVER, + `Retry-After` header surfacing).
8. **F6.3** — sessionStorage drafts for `<input>` per session.
9. **F9.2** — `manifest.json` + maskable icons for PWA
   installability.
10. **F3.2** — Offline banner in `ChatInterface`.
11. **F7.2** — Server-side atomic emit of judge+done.

Low:

12. **F1.3**, **F1.4**, **F2.2**, **F2.3**, **F2.4**, **F4.2**,
    **F4.3**, **F5.3**, **F6.2**, **F6.4**, **F7.3**, **F8.1**,
    **F8.2**, **F8.3**, **F9.1**, **F9.3** — quality-of-life; land
    as the high-impact items settle.

## Dependencies & non-obvious interactions

- F2.1's blanket retry MUST NOT apply to 409 (P2002 collision from
  the attempt-number retry loop in
  `app/api/challenges/[id]/attempt/route.ts:235-249`). The server
  already retries three times internally; a client-side retry on
  top would make the user wait 6 retries.
- F4.1's SSE resume and F2.1's blanket retry overlap. Order of
  precedence when both fire: resume first (it's an idempotent
  GET-shaped continuation), then retry-POST only if resume 404s
  ("no attempt to resume").
- F3.1's offline short-circuit must NOT block the user's "retry"
  button — if `navigator.onLine` flips back to true between the
  detect-offline moment and the user clicking retry, the fetch
  should attempt. Treat `onLine === false` as a hint that gates
  the *initial* auto-fire, not as a mutex.
- F6.3's draft-storage must NOT persist prompts that contain PII
  scrub triggers — re-use the `scrub()` boundary from
  [[observability]] / [[security]] before write. Or simpler: only
  persist the draft while it's still in the textarea; clear
  sessionStorage on successful send.
- F9.2's manifest + F8.x's reload recovery interact: a PWA home-
  screen launch always starts at `start_url`, so
  `start_url: /dashboard` gives returning users a 1-tap entry. The
  current RSC prefetch makes this ~0-ms.

## Cross-references

- [[stream-lifecycle]] — F4.1 leans on the persist-on-disconnect
  guarantee (`route.ts:175-182`); the server already handles the
  hard half.
- [[client-state]] — F5.3 overlaps with Round 5 F6.3 (retry button
  on generating error).
- [[observability]] — F7.3 + F5.x need the client-error sink
  proposed there; wire together in one endpoint.
- [[copy-tonality]] — F5.1's three distinct strings must match the
  "du-first, warm-not-clinical" register.
- [[csrf-origin-guard]] — F10 confirmed no cross-origin exposure;
  this page's same-origin assumption holds.
- [[reduced-motion]] — an offline banner (F3.2) is a new
  `role="status"` region; ensure it doesn't introduce motion that
  violates the reduced-motion contract.
