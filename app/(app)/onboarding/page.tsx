import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import { TargetIcon, BotIcon, TrophyIcon } from '@/components/ui/icons'

export default async function OnboardingPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const profile = await prisma.onboardingProfile.findUnique({
    where: { userId: user.id },
  })
  if (profile?.completedAt) redirect('/dashboard')

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12">
      {/* Welcome intro */}
      <div className="max-w-xl mx-auto w-full mb-10">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-5 border"
            style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            KI-Führerschein Programm
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Willkommen bei PILIH
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Wir brauchen ein paar Infos, um dein Training zu personalisieren.
          </p>
        </div>

        {/* What to expect */}
        <div
          className="rounded-2xl border p-5 mb-8"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            Was dich erwartet
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <TargetIcon size={16} />, label: '21 Tage', desc: 'Eine Challenge pro Tag' },
              { icon: <BotIcon size={16} />, label: 'KI-Feedback', desc: 'Sofort-Bewertung deiner Prompts' },
              { icon: <TrophyIcon size={16} />, label: 'Zertifikat', desc: 'KI-Führerschein zum Abschluss' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}
                >
                  {item.icon}
                </div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  {item.label}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wizard */}
      <OnboardingWizard />
    </div>
  )
}
