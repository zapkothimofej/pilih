import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { syncClerkUser } from '@/lib/utils/auth'
import AppNav from '@/components/ui/AppNav'

// Authed routes must never land in a search index — they 503 without
// a session anyway, but a crawler hitting a preview deploy with
// ALLOW_TESTING_AUTH=true would otherwise index user data. Root
// metadata sets index:true; this overrides for the whole group.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await syncClerkUser()
  if (!user) redirect('/sign-in')

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-nav">
        Zum Hauptinhalt springen
      </a>
      <AppNav user={{ name: user.name, role: user.role }} />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 focus:outline-none">
        {children}
      </main>
    </div>
  )
}
