import { useSyncExternalStore } from 'react'

/**
 * Tracks prefers-reduced-motion so GSAP animations can branch to a
 * minimal path (opacity only) for users who opted out.
 *
 * useSyncExternalStore keeps SSR and client in lockstep (returns false
 * server-side, the real value on mount) and avoids the
 * react-hooks/set-state-in-effect lint warning that the previous
 * useState+useEffect form triggered on every re-render.
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
