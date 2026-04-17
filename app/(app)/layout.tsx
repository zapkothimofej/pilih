import { redirect } from 'next/navigation'
import { syncClerkUser } from '@/lib/utils/auth'
import AppNav from '@/components/ui/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await syncClerkUser()
  if (!user) redirect('/sign-in')

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav user={{ name: user.name, role: user.role }} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
