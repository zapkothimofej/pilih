'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import type { Role } from '@/app/generated/prisma/client'
import {
  PilihMark,
  BarChartIcon,
  CalendarIcon,
  SettingsIcon,
  TargetIcon,
  HomeIcon,
  AdminIcon,
} from '@/components/ui/icons'
import { useReducedMotion } from '@/components/ui/animations/useReducedMotion'

// prefetch: false on routes whose RSC render pulls heavy Prisma work
// (fortschritt = 21 sessions + challenges + attempts; buchung = full
// bookings findMany). Hovering the nav shouldn't silently trigger a
// DB fan-out for every dashboard paint.
const navItems = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon, prefetch: true },
  { href: '/challenge/heute', label: 'Challenge', icon: TargetIcon, prefetch: true },
  { href: '/fortschritt', label: 'Fortschritt', icon: BarChartIcon, prefetch: false },
  { href: '/buchung', label: 'Coaching', icon: CalendarIcon, prefetch: false },
]

export default function AppNav({ user }: { user: { name: string; role: Role } }) {
  const pathname = usePathname()
  const navRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  // Sliding pill indicator tracks the active link's position + width.
  // Runs on mount and on every route change. Cheaper than rendering a
  // styled background on every link individually — one element, one
  // tween per navigation.
  useGSAP(
    () => {
      if (!navRef.current || !indicatorRef.current) return
      const active = navRef.current.querySelector<HTMLElement>('a[data-active="true"]')
      if (!active) {
        gsap.set(indicatorRef.current, { opacity: 0 })
        return
      }
      const navRect = navRef.current.getBoundingClientRect()
      const itemRect = active.getBoundingClientRect()
      const x = itemRect.left - navRect.left
      const width = itemRect.width

      const duration = reduced ? 0 : 0.35
      gsap.to(indicatorRef.current, {
        x,
        width,
        opacity: 1,
        duration,
        ease: 'power3.out',
      })
    },
    { dependencies: [pathname, reduced] }
  )

  return (
    <nav
      className="border-b sticky top-0 z-40 backdrop-blur-md"
      style={{ background: 'rgba(9,9,11,0.90)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-7">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <PilihMark size={18} />
            <span
              className="font-bold text-sm tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              PILIH
            </span>
          </Link>

          <div ref={navRef} className="relative flex items-center gap-0.5">
            {/* Sliding indicator pill */}
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 left-0 h-8 rounded-lg pointer-events-none"
              style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                opacity: 0,
                // will-change promotes a composited layer permanently
                // and costs GPU memory on every paint — removed so
                // the pill only promotes during its ~250 ms tween
                // (GSAP handles that internally).
              }}
            />

            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.prefetch}
                  data-active={active}
                  className="relative z-10 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {item.label}
                </Link>
              )
            })}

            {(user.role === 'COMPANY_ADMIN' || user.role === 'SUPER_ADMIN') && (
              <>
                <Link
                  href="/admin"
                  data-active={pathname === '/admin'}
                  className="relative z-10 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5"
                  style={{ color: pathname === '/admin' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  <AdminIcon size={13} />
                  Admin
                </Link>
                <Link
                  href="/admin/submissions"
                  data-active={pathname.startsWith('/admin/submissions')}
                  className="relative z-10 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    color: pathname.startsWith('/admin/submissions') ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  Reviews
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right: settings + avatar */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/einstellungen"
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <SettingsIcon size={15} />
          </Link>
          <div
            className="w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold"
            style={{
              background: 'var(--accent-dim)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent)',
            }}
          >
            {user.name.trim().charAt(0).toUpperCase() || '?'}
          </div>
        </div>
      </div>
    </nav>
  )
}
