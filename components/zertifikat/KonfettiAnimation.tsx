'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function KonfettiAnimation() {
  useEffect(() => {
    // Respect OS motion preference. Users who opted out of animations
    // get a single tiny burst so the moment still feels celebratory
    // without a 4-second storm.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const colors = ['#818cf8', '#34d399', '#f4f4f8', '#a5b4fc']

    if (reduced) {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors,
        disableForReducedMotion: true,
      })
      return
    }

    const duration = 4000
    const end = Date.now() + duration
    let rafId = 0
    let cancelled = false

    const frame = () => {
      if (cancelled) return
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [])

  return null
}
