---
title: GSAP Patterns
type: concept
---

# GSAP Patterns

Animation stack is GSAP-only. `framer-motion` was removed — the three remaining sites were ported to `useGSAP` during the review loop.

## useGSAP contract

```ts
const scope = useRef<HTMLDivElement>(null)
const reduced = useReducedMotion()

useGSAP(
  () => {
    if (reduced) {
      gsap.set(target, { opacity: 1, y: 0 })
      return
    }
    gsap.from(target, { opacity: 0, y: 12, duration: 0.35, ease: 'power2.out' })
  },
  { dependencies: [reduced], scope }
)
```

- `scope` pins the query to the component's subtree — no leaking selectors to siblings.
- `dependencies: [reduced]` re-runs the effect when the user flips the OS setting.
- `useGSAP` auto-reverts on unmount, so explicit `.kill()` calls aren't needed for most cases.

## Cache system

`ScrollTrigger.create` with `scrub: true` is registered inside `useGSAP` so `useGSAP`'s cleanup kills it. Infinite `repeat: -1` tweens live INSIDE the `reduced` check — `CertificateCard.cert-glow` previously ran its yoyo regardless of the flag, which was a real a11y leak until the review caught it.

## Staggers via data-attributes

`ChallengePageClient` + onboarding step content use `data-stagger` attributes; the `useGSAP` selects `[data-stagger]` and applies a `stagger: 0.06`. Cleaner than selector-chain via class names when the structural intent is "any direct child".

## magneticCard pattern

`ChallengeCard` uses `gsap.quickTo` for `mousemove` parallax so React doesn't re-render per mouse move. Listener removed in the `useGSAP` return cleanup.

## Related

- [[reduced-motion]] — the contract backing every useGSAP branch
- [[a11y-patterns]] — focus timing after animation
