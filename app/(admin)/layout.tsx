import { redirect } from 'next/navigation'
import { syncClerkUser } from '@/lib/utils/auth'
import AppNav from '@/components/ui/AppNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await syncClerkUser()
  if (!user) redirect('/sign-in')
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-nav">
        Zum Hauptinhalt springen
      </a>
      <AppNav user={user} />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 focus:outline-none">
        {children}
      </main>
    </div>
  )
}
