---
title: Bundle Size & Core Web Vitals (Round 7)
type: review
date: 2026-04-18
---

# Bundle Size & Core Web Vitals — Round 7

Focus: client-bundle weight, LCP/CLS/INP paint timing, render-blocking
resources, dynamic-import opportunities, prefetch hygiene.
Backlinks: [[gsap-performance]], [[query-performance]], [[a11y-patterns]].

Earlier rounds fixed animation correctness and query plans; this round
asks "is the page actually fast to paint, and what does the browser
download to get there?"

## Executive summary

Bundle discipline is **good** (no heavy server-only deps leak into
client chunks, zero third-party scripts, all icons inline SVG, no web
fonts beyond Geist, no `next/image`). The **real vitals risks are
GSAP-driven**, not bundle-driven:

1. `LandingHero` renders the LCP element (`<h1>`), then hides it with
   `gsap.from`, then fades it back in. LCP candidate flickers.
2. Dashboard widgets stream `AnimatedNumber` tweens over 1.1–1.4s —
   visible layout settles late. INP fine, but LCP-substitute metric on
   dashboard is the ring/counter, which reaches final state ~1.4s after
   hydration.
3. `<Link>` prefetch on `AppNav` pre-fetches `/fortschritt`, whose RSC
   payload includes a 21-session JOIN — hover preloads are not free.
4. Geist loaded via `next/font/google` is self-hosted and preloaded
   automatically — FOIT rather than FOUT.

No route-level code-splitting opportunities beyond what Next does
already, BUT `@react-pdf/renderer` (~250 KB) is correctly server-only
and `@anthropic-ai/sdk` never enters a `'use client'` module.

## Dimensions (12)

### 1. LCP element — 4/10

`components/landing/LandingHero.tsx:84-90`

- **F1.1** (high): The `<h1>` with `"Prompt it / like it's hot."` is
  the LCP candidate on `/`. The SSR HTML ships it painted. Then
  `useGSAP` runs post-commit and the timeline at `LandingHero.tsx:32-41`
  calls `gsap.from('.hero-title .hero-title-line', { y: 32, opacity:
  0, duration: 0.75 })` — LCP gets **reset to `opacity: 0`** after first
  paint, then fades back over 0.75s. Browsers measure LCP on the last
  paint where the element is "largest and visible"; a zero-opacity
  repaint invalidates the candidate and LCP is reported at the *end*
  of the fade, not the start. Expected LCP drifts from ~200ms (SSR
  paint) to ~900ms on a fast machine, potentially >1.5s on slow 4G.
  Fix: swap `gsap.from` to `gsap.fromTo` AND pre-set `opacity: 0` +
  `transform: translateY(32px)` inline on the h1 lines, so SSR ships
  them invisible and the tween reveals the final-state element once.
  Alternatively, skip the tween entirely for the h1 and only tween
  the surrounding chrome (badge, sub, CTAs). **Severity: high — this
  is the single biggest LCP lever in the app.**
- **F1.2** (medium): The `.hero-orb` radial gradient at
  `LandingHero.tsx:61-69` is 540×540 `blur-3xl`. It paints on a large
  rectangle; if the browser picks it as the LCP candidate (it can, when
  the h1 text is small) the orb's `scale(0.8)` -> `1` tween delays LCP
  by 1.2s. The orb is `aria-hidden` and decorative; mark it with
  `display: contents` OR `opacity` never below the 0.25 start so it's
  not an LCP candidate at t=0. **Severity: medium** depending on
  viewport.
- **F1.3** (info): The landing page has **no `<img>` or `next/image`**
  (grep confirmed: zero hits outside `node_modules`). That removes the
  usual #1 LCP risk — no image to optimise. **Severity: none**.
- **F1.4** (low): `LandingHero.tsx:17` is `'use client'`. The whole
  hero ships as a client component even though the static DOM could
  render from the server with the effect-less content. A 2-component
  split (server wrapper for the text, tiny client for the animation
  wiring via `data-*` attrs) would cut ~3 KB from the first-route JS
  bundle. **Severity: low**.

### 2. CLS — 7/10

No `<img>`, no async-rendered above-the-fold UI, no ad iframes. Main
risk surfaces are progressive-rendering components.

- **F2.1** (info): `DayRing` (`components/dashboard/DayRing.tsx:50-83`)
  renders at fixed `w-24 h-24` (96×96 CSS px). The SVG paints at its
  final size; only the stroke-dasharray tweens. Zero layout shift.
  **Severity: none**.
- **F2.2** (info): `StreakCounter` + `XPBar` — fixed-sized containers,
  only visuals inside move. Confirmed in source. **Severity: none**.
- **F2.3** (medium): `ChatInterface.tsx:54-56` calls `bottomRef.current
  ?.scrollIntoView({ behavior: 'smooth' })` on every `messages` change
  **during streaming**. This is scroll inside a `max-h-[460px] overflow-
  y-auto` region — CLS measures only **viewport-level shift**, so this
  doesn't ding CLS. It does cause INP spikes because `scroll-behavior:
  smooth` + per-token re-render can coalesce into blocking frames. Fix:
  only `scrollIntoView` when the user is already pinned to the bottom
  (check `scrollHeight - scrollTop - clientHeight < 40`). Use `scrollTop
  = scrollHeight` (no smooth) during streaming; smooth-scroll only when
  the turn completes. **Severity: medium** for INP, none for CLS.
- **F2.4** (info): `CertificateCard` has a language toggle
  (`CertificateCard.tsx:92-108`). Switching DE↔EN changes text length
  inside fixed-width containers — tested with typography; no vertical
  reflow because the card uses fixed padding + center alignment.
  **Severity: none**.

### 3. Font loading (FOIT/FOUT) — 8/10

`app/layout.tsx:6` uses `Geist({ subsets: ['latin'], variable: '--
font-geist' })`. Next.js `next/font/google` self-hosts the font,
generates a preload link, and defaults to `display: swap` when not
specified — **but** the code doesn't pass `display`, so it falls back
to the Next 16 default of `swap`. Good.

- **F3.1** (info): Next emits a `<link rel="preload" as="font"
  crossorigin>` automatically for Geist. Confirmed via the Next docs
  for `next/font`. No custom preload needed. **Severity: none**.
- **F3.2** (low): `app/layout.tsx:36` applies `antialiased` globally
  but the CSS variable `--font-geist` is wired only on `<html>`. Tokens
  that use `var(--font-geist)` (none grep'd — the CSS at globals.css
  uses `'Geist', sans-serif` literally) bypass the Next-generated
  `__className_…` hash. That means the fallback stack does the work if
  the font file hasn't loaded, which is fine with `swap`, BUT the
  `Geist, sans-serif` literal triggers a Chrome "font not found" warning
  in dev for the fallback stage. Cosmetic. **Severity: low**. Fix: drop
  `'Geist'` from the CSS custom prop and let Next's `className` handle
  it.
- **F3.3** (info): No `@font-face` rules outside `next/font`, no
  `fonts.googleapis.com` stylesheet. CSS in `next.config.ts` allows
  `font-src https://fonts.gstatic.com data:` in CSP — that's dead
  allowlist now (no external font loaded). Tighten CSP: remove
  `https://fonts.gstatic.com` and `data:` from `font-src` since all
  fonts ship self-hosted. **Severity: low (security hygiene)**.

### 4. Client-bundle leakage of server-only deps — 10/10

`@anthropic-ai/sdk` and `@react-pdf/renderer` are both heavy (~500 KB
and ~250 KB respectively minified).

- **F4.1** (info): grep hits for `@anthropic-ai/sdk`:
  `app/api/submission/route.ts:3`, `app/api/challenges/[id]/attempt/
  route.ts`, `lib/ai/challenge-ai.ts`, `lib/ai/judge-ai.ts`, `lib/ai/
  llm.ts`. All are server-only (API routes + lib modules without `'use
  client'`). Verified clean. **Severity: none**.
- **F4.2** (info): `@react-pdf/renderer`:
  `app/api/zertifikat/pdf/route.tsx:18` + `components/zertifikat/
  CertificatePdf.tsx:1`. `CertificatePdf.tsx` has NO `'use client'`
  directive — it's a React Server Component rendered inside the API
  route. Good. **Severity: none**.
- **F4.3** (info): `react-markdown` + `remark-gfm` are imported in
  `components/challenge/ChatInterface.tsx:7-8` which IS `'use client'`.
  These ship to the browser. `react-markdown` alone is ~30 KB gz,
  `remark-gfm` adds ~25 KB for the GFM parser. Total ~55 KB on the
  `/challenge/[id]` route. Not leaked — legitimately needed for
  assistant markdown rendering — but a **dynamic import** would defer
  it until the first assistant bubble is about to render. **Severity:
  medium**. Fix: `const ReactMarkdown = dynamic(() => import('react-
  markdown'), { ssr: false })` wrapped in a memo.

### 5. Images / `next/image` — 10/10

- **F5.1** (info): Zero `<img>` tags, zero `next/image` imports. All
  graphics are inline SVG (`components/ui/icons.tsx`, `PilihMark`,
  `DayRing`, orbit rings). Removes the largest CWV footgun category —
  no aspect-ratio mismatches, no late image decode blocking LCP, no
  CDN round-trip. **Severity: none** — this is a positive finding.
  Trade-off: no brand photography / testimonials to add warmth, which
  is a product decision not a perf issue.

### 6. Route chunking — 7/10

Each `app/(app)/**/page.tsx` gets its own chunk. The shared client
runtime (GSAP core, `@gsap/react`, `AnimatedNumber`, `useReducedMotion`,
`AppNav`) lives in the `(app)` layout chunk.

- **F6.1** (medium): **Every** client component imports `gsap` (17
  files, per grep) plus `@gsap/react`. GSAP core is ~70 KB gz; it
  factors into the shared `app` chunk via the layout's `AppNav` import
  → good, loaded once. But the `ScrollTrigger` plugin is registered in
  `LandingSteps.tsx:10` AND `FortschrittCalendar.tsx:10` — only the
  landing page bundle and the fortschritt bundle pull it in, so the
  dashboard/challenge pages don't pay. Confirmed Next's tree-shaker
  handles the per-route imports. **Severity: low — already optimal**.
- **F6.2** (medium): `app/(app)/zertifikat/page.tsx` includes
  `CertificateCard` (222 lines) AND pulls `KonfettiAnimation` which
  imports `canvas-confetti` (~14 KB gz). Only zertifikat-reached users
  download this. A dynamic import of `KonfettiAnimation` guarded by
  first-visit-only detection would defer even that. **Severity: low**.
- **F6.3** (info): `app/(admin)/**` pages import admin-only components
  that never appear in the `(app)` bundle. Split route groups do the
  heavy lifting here. **Severity: none**.

### 7. Dynamic imports — 3/10

Grep: **zero** `next/dynamic` usages. Opportunity cost.

- **F7.1** (medium): `JudgeFeedbackPopup` (407 lines,
  `components/challenge/JudgeFeedbackPopup.tsx`) is mounted on every
  `/challenge/[id]` page load but only renders when the user submits
  a prompt AND the judge returns `shouldShowPopup: true` — a fraction
  of sessions. It contains a GSAP `ScoreRing` + `DimensionBars` + focus
  trap logic. At ~12 KB gz this is a real candidate for `dynamic(() =>
  import('./JudgeFeedbackPopup'), { ssr: false })`. The hook already
  returns `null` when `!feedback`, so lazy-loading adds a tiny delay
  on first open (~30ms on fast 4G) — acceptable UX trade. **Severity:
  medium**.
- **F7.2** (medium): `CertificateCard.tsx` embeds a DE + EN dictionary
  at module scope (`CertificateCard.tsx:68-87`) — ~1 KB. Trivial on
  its own. BUT `KonfettiAnimation` + `canvas-confetti` are co-imported
  at the page level. Dynamic import of the konfetti bundle pushes
  ~14 KB out of the initial chunk. **Severity: low**.
- **F7.3** (low): `GeneratingScreen.tsx` ships with 3 SVG orbit rings
  + GSAP rotation tweens — only seen on onboarding, once per user.
  Next already code-splits by route so this is already isolated to
  `/onboarding/generating`. No action. **Severity: none**.
- **F7.4** (info): `react-pdf/renderer` was kept server-only; good
  pattern to repeat for any future heavy visualisation lib.

### 8. Tailwind v4 tree-shake — 9/10

`package.json` pins `tailwindcss: ^4` + `@tailwindcss/postcss: ^4`.
Tailwind 4 uses Lightning-CSS for faster builds and **automatic
content detection** via the `@import "tailwindcss"` directive in
`app/globals.css:1`. Utilities used anywhere in `app/`, `components/`
get emitted; unused utilities are pruned.

- **F8.1** (info): **Zero `@apply` directives** in `globals.css` (grep
  confirmed no matches). v4 `@apply` inside nested stylesheets can
  interfere with splitting; avoiding it is correct. **Severity: none**.
- **F8.2** (low): `globals.css` is 302 lines, ~8.5 KB raw. After
  Lightning-CSS + utility purge the delivered CSS should be ~12–18 KB
  gz for the landing route (utilities + custom keyframes + tokens).
  No measurement available without a build, but the inputs are lean.
  **Severity: none**.
- **F8.3** (low): 4 `@keyframes` rules in `globals.css` (`cta-sheen-
  sweep`, `streaming-bounce`, `streaming-fade`, plus one more). All
  referenced via class names; v4 keeps them. No dead keyframes grep'd.
  **Severity: none**.

### 9. Font preload — 8/10

Next 16 `next/font/google` auto-emits `<link rel="preload" as="font"
type="font/woff2" crossorigin>` for the Geist files it self-hosts.
The preload header appears in the SSR HTML `<head>`, before any CSS
request. This is the optimal path.

- **F9.1** (info): No manual `<link rel="preload">` in `layout.tsx` —
  correct, don't duplicate what `next/font` does. **Severity: none**.
- **F9.2** (low): Only `Latin` subset is loaded (`subsets: ['latin']`).
  Geist's latin-ext subset is skipped — German umlauts fall inside
  Latin-1, so `ü/ä/ö/ß` render correctly. No need to add latin-ext.
  **Severity: none**.

### 10. Third-party scripts — 10/10

Zero `<script src="…">` to external origins. No analytics, no Stripe.js,
no Sentry CDN bundle, no Clerk `<script>` (Clerk via `@clerk/nextjs`
ships bundled). Third-party perf footprint: **zero**. **Severity: none**.

### 11. Icon sprite vs. inline SVG — 7/10

`components/ui/icons.tsx` exports **21 named icons** (237 lines raw).
Each icon is a function component returning inline SVG, 1–4 `<path>`
elements.

- **F11.1** (info): Total icon module size ~4 KB raw, ~1.5 KB gz after
  tree-shake (Next only bundles the named exports actually imported on
  a given route). `AppNav` pulls 6 icons + `PilihMark`. Chat pulls 4.
  Dashboard pulls `FlameIcon` + `BoltIcon`. Each route ships ~0.5–1 KB
  of icon SVG. **Severity: none** — at 21 icons, a sprite doesn't pay.
- **F11.2** (low): If the set grows past ~50 icons, a `<symbol>` sprite
  sheet in `app/layout.tsx` + `<svg><use href="#icon-x"/></svg>` saves
  both bundle JS and re-render cost (icons aren't re-rendered on every
  parent state change — they're referenced). Flag for future growth.
  **Severity: low / future**.
- **F11.3** (low): Every icon component **re-renders** whenever its
  parent re-renders (e.g. `AnimatedNumber` ticking triggers
  `StreakCounter` re-render → `FlameIcon` re-renders). The SVG subtree
  is cheap to reconcile but non-zero. `React.memo` on icon exports
  eliminates that. For `FlameIcon` inside `StreakCounter` (re-renders
  up to 72× during entrance + every XP tick) this saves a few hundred
  VDOM reconciliations per session. **Severity: low**.

### 12. Prefetch noise — 5/10

Next 16 `<Link>` prefetches aggressively: default `prefetch` is `null`
(auto-prefetch on viewport visibility + hover for static routes;
partial prefetch for dynamic routes). The app uses `<Link>` for every
intra-app nav: no `prefetch={false}` override anywhere (grep: no
matches).

- **F12.1** (medium): `AppNav.tsx:102` renders `<Link href="/
  fortschritt">`. Next prefetches the RSC payload on viewport-enter
  (since the nav is always visible). `/fortschritt` issues a 21-session
  `findMany` with `include: { selectedChallenge, attempts }` — see
  [[query-performance]] F4.1, "heaviest over-fetch in the app". Every
  dashboard paint triggers a background RSC fetch for fortschritt,
  executing that query. On Vercel with a small Postgres pool (see
  [[query-performance]] F6.1) this silently warms the pool with
  unnecessary work. Fix: `<Link href="/fortschritt" prefetch={false}>`
  until query F4.1 is trimmed. **Severity: medium**.
- **F12.2** (medium): Same argument for `/admin/submissions` — the
  prefetch triggers the admin page RSC which includes a paginated
  `submissions` query. Admins hitting the nav cause background DB
  load. **Severity: medium** — add `prefetch={false}` on the two
  admin links.
- **F12.3** (info): `/challenge/heute` is a lighter query; prefetch is
  defensible there. `/buchung` is static-ish. `/dashboard` is the
  active route so no prefetch self-loop. **Severity: none**.
- **F12.4** (low): Landing `app/page.tsx` uses `<Link href="/sign-up">`
  + `<Link href="/sign-in">` — both go to Clerk-hosted routes which
  are partial-route prefetches only. Fine. **Severity: none**.

## Recommended fixes — priority order

1. **F1.1** LandingHero LCP — swap `gsap.from` → `gsap.fromTo` + inline
   `opacity: 0`. Biggest CWV lever. (15 min)
2. **F12.1 / F12.2** — `prefetch={false}` on `/fortschritt` + both
   admin nav links until their RSC payloads are trimmed. (5 min)
3. **F7.1** — `next/dynamic` for `JudgeFeedbackPopup`. (15 min)
4. **F4.3** — `next/dynamic` for `react-markdown` in `ChatInterface`.
   (10 min)
5. **F2.3** — Guard `scrollIntoView` during streaming. (10 min)
6. **F6.2** — Dynamic import `KonfettiAnimation`. (10 min)
7. **F11.3** — `React.memo` on hot icons (`FlameIcon`, `BoltIcon`).
   (5 min)
8. **F3.2 / F3.3** — Font-stack cleanup + CSP font-src tighten. (5 min)

## Cross-references

- [[gsap-performance]] — Round 5 caught the underlying `gsap.from` FOUC
  (dim 2 there, dim 1 here); the LCP framing makes the fix a priority.
- [[query-performance]] — F12.1 backpressure issue only matters because
  `/fortschritt` carries the heavy `findMany` from F4.1 there.
- [[a11y-patterns]] — `scrollIntoView` guard in F2.3 must still respect
  the user's scroll-lock gesture (don't hijack a scroll the user made);
  see the reduced-motion contract backing smooth-scroll opt-out.
- [[reduced-motion]] — the LCP fix should retain the reduced-motion
  branch that pre-sets `opacity: 1` for the h1 lines.
