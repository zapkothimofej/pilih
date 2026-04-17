'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function KonfettiAnimation() {
  useEffect(() => {
    const duration = 4000
    const end = Date.now() + duration
    const colors = ['#818cf8', '#34d399', '#f4f4f8', '#a5b4fc']

    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }, [])

  return null
}
