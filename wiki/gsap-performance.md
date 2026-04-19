---
title: GSAP Performance
type: concept
---

# GSAP Performance

Round 5 review focus: is the motion FAST? Audits `will-change`, FOUC, ScrollTrigger budget, layout-triggering tweens, and konfetti lifecycle. Rounds 1–4 already fixed reduced-motion correctness and completed the framer-motion migration; this round asks whether the remaining GSAP layer ships at 60fps on a mid-tier laptop.

## Executive summary

Overall: **solid foundation, three real problems**. No `framer-motion` residue, zero permanent `will-change: transform` on high-count elements, all infinite tweens gated on `reduced`, ScrollTrigger count is tiny (three). But:

1. `XPBar.tsx:28` tweens `width` from `0%` to `N%` — **layout-triggering**, thrashes dashboard on every mount.
2. `ChallengeWidget.tsx:49–62` fromTo's `height: target` — same class of sin inside an accordion.
3. `GeneratingScreen.tsx:140` CSS `@keyframes generating-progress` animates `width: 0% → 95%` for 12s — continuous layout during AI generation.
4. `AppNav.tsx:90` has permanent `willChange: 'transform, width'` on the pill indicator even when it's idle — GPU layer kept forever, bytes wasted.

## Dimensions (12)

### 1. will-change abuse — 7/10
Three usages total, no `@media`/`::hover` scoping. Two are defensible (3D-tilt cards), one is pure waste.

- `components/ui/AppNav.tsx:90` — `willChange: 'transform, width'` on the indicator `<span>`. Pill only moves on route change (~every 10s at most). Keeping a compositor layer permanent for 99% idle is textbook abuse. **Severity: medium.** Fix: drop the `willChange`. GSAP already hints the layer for the duration of the tween; 0.35s of non-composited first-route is invisible.
- `components/challenge/ChallengeCard.tsx:88` — `willChange: 'transform'` on every card (up to 3 per view). Acceptable because `mousemove` tilt runs continuously while hovered — but **only while hovered**. **Severity: low.** Fix: move to `:hover { will-change: transform }` in CSS or apply via `onMouseEnter`/`onMouseLeave`.
- `components/landing/LandingSteps.tsx:133` — `willChange: 'transform'` on every feature card. Same story as ChallengeCard — acceptable but not ideal. **Severity: low.** Fix: scope to hover.

### 2. `gsap.from` without matching initial CSS (FOUC) — 4/10
`gsap.from` captures the *current* state as the end-state, then sets the from-state. Between React paint and `useGSAP` running, the element is fully visible — a flash of *visible* content that immediately jumps to `opacity: 0` and tweens back. Only ok if you *also* set the starting state via CSS, or if the flash is imperceptible (sub-frame). Here it isn't.

- `components/landing/LandingHero.tsx:32–41` — entire hero (badge, title, sub, CTAs, orb) renders painted, then hidden, then tweened in. **Severity: high on slow machines.** Fix: replace with `gsap.fromTo(..., { opacity: 0, y: 12 }, { opacity: 1, y: 0 })` OR add `visibility: hidden` on the elements and flip to `visible` in the timeline.
- `components/challenge/ChallengeCard.tsx:46` — card renders, then `from opacity: 0, y: 18` hides it. Flicker per card on `/challenge/heute`. **Severity: medium.** Fix: `fromTo` or inline style `opacity: 0` that GSAP clears.
- `components/onboarding/OnboardingWizard.tsx:57` — `.onb-step > *` fades in on step change but content is already visible for a frame. **Severity: medium.**
- `app/(app)/challenge/[id]/ChallengePageClient.tsx:32` — `[data-stagger]` same pattern. **Severity: medium.**
- `components/zertifikat/CertificateCard.tsx:40` — `from` on container is safe because it's the only paint target, but `.cert-corner` and `.cert-stagger` all flash for a frame before hiding. **Severity: medium.**

Codebase-wide pattern fix: adopt `fromTo` in `wiki/gsap-patterns.md` as the canonical form. `from` should be a conscious exception (e.g. when the initial state is already encoded via inline style like `XPBar`'s `width: '0%'`).

### 3. ScrollTrigger count — 9/10
Exactly **3 ScrollTrigger instances** across the app:
1. `LandingSteps.tsx:40` — steps stagger
2. `LandingSteps.tsx:54` — features stagger
3. `AnimatedNumber.tsx:79` — per-counter onEnter (0–4 live instances on dashboard)
4. `FortschrittCalendar.tsx:43` — 21-day grid reveal

Per-frame cost is negligible (<1ms). The landing orb drift at `LandingHero.tsx:43` is NOT a ScrollTrigger — it's an infinite sine yoyo on `x/y`. No issue here.

### 4. Offscreen tweens — 6/10
- `LandingHero.tsx:43–50` — orb x/y yoyo runs forever, even when the user has scrolled past the hero. Infinite tween on an offscreen element still burns CPU/GPU on every frame. **Severity: medium.** Fix: wrap in a ScrollTrigger with `toggleActions: 'play pause resume pause'` or kill when out of view.
- `CertificateCard.tsx:56` — `.cert-glow` infinite yoyo on `opacity/scale`. Same issue if user scrolls past (though cert page is short). **Severity: low.**
- `StreakCounter.tsx:31` — flame heartbeat with `repeatDelay: 2.5`. Runs forever above the fold, but at repeatDelay the engine is idle most of the time. **Severity: low.**

### 5. Transform vs layout — 3/10
Three layout-triggering tweens. This is the **biggest performance win** available.

- `components/dashboard/XPBar.tsx:28–32` — `fromTo fill { width: '0%' } → { width: '<progress>%' }`. Width animation = Recalc Style + Layout + Paint every frame. 1.2s × 60fps = 72 forced layouts. **Severity: high.** Fix: use `scaleX` with `transform-origin: left` and compensate for the shimmer layer.
- `components/challenge/ChallengeWidget.tsx:49–71` — fromTo `height: 0 → target` and to `height: 0`. Accordion open/close thrashes layout. **Severity: high.** Fix: use GSAP's FLIP plugin OR the `max-height` + content-height-var trick OR animate `grid-template-rows` (modern browsers). At minimum, add `will-change: height` for the duration of the tween to force a layer.
- `components/onboarding/GeneratingScreen.tsx:140–152` — CSS `@keyframes generating-progress` animates `width` for 12 seconds. On a page that *also* has 3 concurrent GSAP ring rotations + a core pulse. That's 12s of forced layout on every frame WHILE the user waits for AI generation. **Severity: high.** Fix: use `transform: scaleX()` with `transform-origin: left`.
- `DayRing.tsx:27–35` — `strokeDasharray` tween. Technically this is a paint-only mutation on most browsers (no layout), BUT `stroke-dashoffset` is cheaper and more commonly GPU-accelerated. **Severity: low.** Acceptable.
- `JudgeFeedbackPopup.tsx:365–369` — `strokeDasharray` on `.score-arc`. Same note. Acceptable.

### 6. AnimatedNumber textContent per-frame — 6/10
`components/ui/animations/AnimatedNumber.tsx:64–67` runs `render()` on every `onUpdate`, calling `Intl.NumberFormat.format()` and writing `textContent`. For a 1.2s tween that's ~72 text updates per counter. With 2 counters on the dashboard (`DayRing` uses one, `StreakCounter` uses one, `XPBar` uses one) you've got ~216 DOM writes on dashboard mount.

- **Severity: medium.** `Intl.NumberFormat` is memoized (good — lives in `useRef`), but `format()` itself is still ~20μs. At the tail of the tween the visible number doesn't change (e.g. `5 → 5`), so the write is wasted. Fix: dedupe — store `lastRendered` and skip write if formatted string is identical.
- Alternative: for integer values, skip the `Intl` call entirely and just do `String(Math.round(obj.n))`.

### 7. Reduced-motion early-return discipline — 10/10
Every `useGSAP` checks `reduced` and either sets the end-state with `gsap.set` OR returns. No branch does meaningful work after the check. `KonfettiAnimation.tsx:11–25` handles it manually (correct). Wiki doc `[[reduced-motion]]` is accurate.

### 8. Hydration thrash (SSR paint → useGSAP hide) — 4/10
This is the same class as dim 2 but framed from the SSR angle. Next.js ships fully-painted HTML, client hydrates, `useGSAP` fires in a post-commit effect. Gap between first paint and effect ≥ 1 frame on a fast machine, 3–5 frames on a mid-tier phone.

Concretely visible flashes:
- `LandingHero.tsx` — hero content visible for ~50ms before fading in from opacity 0. **Severity: high on LCP.** Fix: same as dim 2 (use `fromTo` + inline `opacity: 0`), OR move the scope onto the element via `style={{ opacity: 0 }}` and let GSAP clear it.
- `ChallengeCard.tsx` — list of 3 cards flashes. **Severity: medium.**
- Dashboard widgets (`StreakCounter`, `DayRing`, `XPBar`) — all fine because their tweens target *child* elements whose initial state IS set via inline `width: '0%'` / `strokeDasharray: '0 ${c}'`. Good pattern.

### 9. Timeline cleanup on navigation — 8/10
`useGSAP` reverts on unmount. Infinite tweens (hero orb, cert glow, streak flame, orbit rings) all get killed when their scope unmounts because `useGSAP` tracks every tween created inside the callback. No blocking frame.

One nuance: `CertificateCard.tsx:56` creates the glow tween outside the timeline. It's still tracked by `useGSAP` (runs inside the hook's callback), so cleanup is fine. Verified.

`ScrollTrigger` instances created inside `useGSAP` are also killed automatically (useGSAP reverts the matchMedia context and kills owned ScrollTriggers). Verified via `LandingSteps.tsx` — plugin registration at module load is fine.

### 10. Framer-motion residue — 10/10
Zero imports remain. Only residual mention is a comment at `JudgeFeedbackPopup.tsx:38` ("GSAP entrance animation replacing framer-motion"). `package.json` has no dep. Round 3's work is complete.

### 11. Icons/SVG — 9/10
All icons are inline SVG from `components/ui/icons`. No raster `<Image>` in animation paths. No `filter: blur()` tweens. Orb backdrops use `blur-3xl` (CSS `filter`) — static, not tweened. One dynamic `filter` tween exists: `DayRing.tsx:38–44` animates `filter: drop-shadow(...)` in a yoyo when completion ≥ 75%. `filter` animations are expensive but this is one element at low frequency (1.8s cycle). **Severity: low.** Acceptable.

### 12. Konfetti lifecycle — 8/10
`components/zertifikat/KonfettiAnimation.tsx`:
- Reduced-motion path: single `particleCount: 40` burst with `disableForReducedMotion: true`. Correct.
- Motion path: 4-second rAF loop spawning 6 particles per frame (3 left + 3 right). Cancellable via `cancelled` flag + `cancelAnimationFrame`. Good.
- `canvas-confetti` spawns its own fixed full-viewport canvas at `z-index: 999999`. After the last particle settles (~1s post-duration), it internally stops its rAF and **removes the canvas**. Verified in the lib source: `destroy()` is called when particle count hits zero. Good.

One note: the 4s spawn loop doesn't cancel the *particles already in flight*. A user navigating away at t=2s leaves a 2s worth of decaying confetti rendering on the next page if the canvas is still attached. Minor. **Severity: low.** The global canvas sits at the document root, so it leaks across route changes. Fix (optional): call `confetti.reset()` in the cleanup.

## Recommended fixes — priority order

1. **`XPBar` width → scaleX** (high, 10 min). Visible dashboard mount jank.
2. **`GeneratingScreen` CSS keyframe width → scaleX** (high, 5 min). 12s of layout thrash on onboarding.
3. **`ChallengeWidget` height tween** (high, 30 min — needs FLIP or grid-rows approach).
4. **`AnimatedNumber` textContent dedupe** (medium, 5 min). Nice-to-have.
5. **`LandingHero` FOUC → `fromTo` + inline opacity** (high for LCP, 15 min).
6. **`ChallengeCard`/onboarding/`[id]` FOUC → `fromTo` or CSS initial state** (medium, 20 min total).
7. **`AppNav` drop permanent `willChange`** (low, 1 min).
8. **`LandingHero` orb: pause when offscreen** (medium, 5 min). Add a ScrollTrigger with `toggleActions: 'play pause resume pause'`.
9. **Move `willChange: transform` on tilt cards to `:hover` scope** (low, 5 min).

## Related

- [[gsap-patterns]] — useGSAP contract, magnetic-hover pattern
- [[reduced-motion]] — the a11y contract that gates infinite tweens
- [[a11y-patterns]] — focus-after-animation timing
