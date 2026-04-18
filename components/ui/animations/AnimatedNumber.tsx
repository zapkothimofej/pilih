'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from './useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface Props {
  value: number
  duration?: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
  style?: React.CSSProperties
  /** Trigger animation only when scrolled into view. Default true. */
  onScroll?: boolean
}

/**
 * GSAP-driven counter. Tweens { n: 0 } → { n: value } with a rounded
 * render tick. Under reduced-motion we set the final value instantly
 * to avoid motion sickness.
 */
export default function AnimatedNumber({
  value,
  duration = 1.2,
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
  style,
  onScroll = true,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  const formatter = useRef(
    new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )

  useEffect(() => {
    formatter.current = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }, [decimals])

  useGSAP(
    () => {
      if (!ref.current) return
      if (reduced) {
        ref.current.textContent = `${prefix}${formatter.current.format(value)}${suffix}`
        return
      }

      const obj = { n: 0 }
      const render = () => {
        if (!ref.current) return
        ref.current.textContent = `${prefix}${formatter.current.format(obj.n)}${suffix}`
      }

      const tween = gsap.to(obj, {
        n: value,
        duration,
        ease: 'power2.out',
        onUpdate: render,
        paused: onScroll,
      })
      render()

      if (onScroll && ref.current) {
        const trigger = ScrollTrigger.create({
          trigger: ref.current,
          start: 'top 90%',
          once: true,
          onEnter: () => tween.play(0),
        })
        return () => {
          trigger.kill()
          tween.kill()
        }
      }
    },
    { dependencies: [value, duration, prefix, suffix, onScroll, reduced] }
  )

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}0{suffix}
    </span>
  )
}
