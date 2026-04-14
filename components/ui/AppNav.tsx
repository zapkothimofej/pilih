'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import type { User } from '@/app/generated/prisma/client'

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/challenge/heute', label: 'Challenge' },
  { href: '/fortschritt', label: 'Fortschritt' },
]

export default function AppNav({ user }: { user: User }) {
  const pathname = usePathname()

  return (
    <nav className="border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-bold text-lg">
            🔥 <span className="text-orange-500">PILIH</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {(user.role === 'COMPANY_ADMIN' || user.role === 'SUPER_ADMIN') && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
        <UserButton />
      </div>
    </nav>
  )
}
