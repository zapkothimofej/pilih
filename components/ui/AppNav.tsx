'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/app/generated/prisma/client'
import { PilihMark, BarChartIcon, CalendarIcon, SettingsIcon, TargetIcon, HomeIcon, AdminIcon } from '@/components/ui/icons'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/challenge/heute', label: 'Challenge', icon: TargetIcon },
  { href: '/fortschritt', label: 'Fortschritt', icon: BarChartIcon },
  { href: '/buchung', label: 'Coaching', icon: CalendarIcon },
]

export default function AppNav({ user }: { user: { name: string; role: Role } }) {
  const pathname = usePathname()

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

          <div className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {item.label}
                </Link>
              )
            })}

            {(user.role === 'COMPANY_ADMIN' || user.role === 'SUPER_ADMIN') && (
              <>
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <AdminIcon size={13} />
                  Admin
                </Link>
                <Link
                  href="/admin/submissions"
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-muted)' }}
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
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  )
}
