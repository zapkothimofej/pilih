---
title: Reduced Motion
type: concept
---

# Reduced Motion

One contract, applied everywhere.

## The hook

`components/ui/animations/useReducedMotion.ts` — uses `useSyncExternalStore` to read `prefers-reduced-motion` with SSR-safe snapshots. Returns `false` server-side, the live value client-side. The previous `useState + useEffect` shape tripped `react-hooks/set-state-in-effect` on every render.

## Global CSS guards

`app/globals.css`:

1. Tailwind's `animate-bounce / pulse / spin / ping` are killed under `@media (prefers-reduced-motion: reduce)`. Without this, the chat streaming dots, recording indicator, and loading spinner all animated regardless of the user's OS preference.

2. `scroll-behavior: auto !important` on `html` so any smooth-scroll falls back to instant.

3. `.streaming-dot` has its own `@keyframes streaming-bounce` (motion) + `streaming-fade` (reduced-motion) so chat users without motion still see a non-transform activity signal — three static dots would look like a layout bug.

## Component discipline

Every `useGSAP` that tweens from a hidden/offset state guards on `reduced`:

```ts
useGSAP(() => {
  if (reduced) {
    gsap.set(target, { opacity: 1, y: 0 })
    return
  }
  gsap.from(target, { opacity: 0, y: 12, duration: 0.35 })
}, { dependencies: [reduced], scope })
```

Infinite loops (heartbeats, pulses) live inside the non-reduced branch only. A previous bug in `CertificateCard` ran a `.cert-glow` yoyo regardless of the flag — fixed.

## Safe-area insets

`.safe-bottom` class uses `env(safe-area-inset-bottom)` so the iOS home indicator doesn't obscure the chat input row in PWA installs.

## Related

- [[a11y-patterns]] — focus + tap-target rules
- [[gsap-patterns]] — useGSAP cleanup contract
