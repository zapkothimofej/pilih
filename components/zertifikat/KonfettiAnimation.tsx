'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function KonfettiAnimation() {
  useEffect(() => {
    const duration = 4000
    const end = Date.now() + duration

    const colors = ['#f97316', '#a855f7', '#22c55e', '#ffffff']

    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [])

  return null
}
