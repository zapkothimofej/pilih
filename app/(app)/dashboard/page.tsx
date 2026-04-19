import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import StreakCounter from '@/components/dashboard/StreakCounter'
import DayRing from '@/components/dashboard/DayRing'
import XPBar from '@/components/dashboard/XPBar'
import { ArrowRightIcon, CheckIcon, TargetIcon, TrophyIcon } from '@/components/ui/icons'
import { calcStreak, totalXp } from '@/lib/progress/xp'

export default async function DashboardPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const onboarding = await prisma.onboardingProfile.findUnique({
    where: { userId: user.id },
    select: { completedAt: true },
  })
  if (!onboarding?.completedAt) redirect('/onboarding')

  // Narrow select — we render only title/category/difficulty + dates
  // for the "recent 3" strip. description/promptingTips on every row
  // is wasted bandwidth.
  const sessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    select: {
      id: true,
      dayNumber: true,
      date: true,
      xpEarned: true,
      selectedChallenge: { select: { title: true, category: true, currentDifficulty: true } },
    },
    orderBy: { date: 'desc' },
  })

  const completed = sessions.length
  const streak = calcStreak(sessions.map(s => ({ date: s.date })))
  const xp = totalXp(sessions)
  // UTC-day comparison — a Berlin user who completes at 01:00 local
  // stores the session at 00:00 UTC (previous day) and local-midnight
  // compare used to say "no challenge today" while calcStreak (UTC)
  // correctly counted it. Align both with a single source of truth.
  const todayUTC = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  )
  const hasChallengeToday = sessions.some(s => {
    const d = new Date(s.date)
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) === todayUTC
  })

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Hey {user.name.trim().split(/\s+/)[0] || 'du'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {completed === 0
              ? 'Starte heute mit deiner ersten Challenge.'
              : completed < 21
              ? `Tag ${completed + 1} von 21 wartet auf dich.`
              : 'Alle 21 Tage abgeschlossen — Zertifikat bereit.'}
          </p>
        </div>
        <div
          className="text-xs font-medium px-2.5 py-1 rounded-full border tabular-nums"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
        >
          {completed}/21 Tage
        </div>
      </div>

      {/* CTA */}
      {completed < 21 ? (
        <Link
          href="/challenge/heute"
          className={`flex items-center justify-between w-full px-5 py-4 rounded-2xl border transition-all group ${
            hasChallengeToday ? '' : 'cta-sheen'
          }`}
          style={hasChallengeToday
            ? { background: 'var(--bg-surface)', borderColor: 'var(--border-default)', cursor: 'default', pointerEvents: 'none' }
            : { background: 'var(--accent-dim)', borderColor: 'var(--accent-border)' }
          }
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: hasChallengeToday ? 'var(--success-dim)' : 'var(--accent-dim)',
                color: hasChallengeToday ? 'var(--success)' : 'var(--accent)',
              }}
            >
              {hasChallengeToday ? <CheckIcon size={16} /> : <TargetIcon size={16} />}
            </div>
            <div>
              <div
                className="font-semibold text-sm"
                style={{ color: hasChallengeToday ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                {hasChallengeToday ? 'Heutige Challenge abgeschlossen' : 'Heutige Challenge starten'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {hasChallengeToday ? 'Bis morgen' : 'Tag ' + (completed + 1) + ' von 21'}
              </div>
            </div>
          </div>
          {!hasChallengeToday && (
            <ArrowRightIcon size={16} style={{ color: 'var(--accent)' }} />
          )}
        </Link>
      ) : (
        <Link
          href="/abschluss"
          className="flex items-center justify-between w-full px-5 py-4 rounded-2xl border transition-all"
          style={{ background: 'var(--success-dim)', borderColor: 'var(--success-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--success-dim)', color: 'var(--success)' }}
            >
              <TrophyIcon size={16} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Abschluss-Test absolvieren
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                KI-Führerschein beantragen
              </div>
            </div>
          </div>
          <ArrowRightIcon size={16} style={{ color: 'var(--success)' }} />
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="rounded-2xl border p-5 flex flex-col items-center justify-center"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <StreakCounter streak={streak} />
        </div>
        <div
          className="rounded-2xl border p-5 flex flex-col items-center justify-center"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <DayRing completed={completed} />
        </div>
        <div
          className="rounded-2xl border p-5 flex flex-col justify-center"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <XPBar xp={xp} />
        </div>
      </div>

      {/* Recent challenges */}
      {sessions.slice(0, 3).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Zuletzt abgeschlossen
            </h2>
            <Link
              href="/fortschritt"
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Alle ansehen <ArrowRightIcon size={11} />
            </Link>
          </div>
          {sessions.slice(0, 3).map(s => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--success-dim)', color: 'var(--success)' }}
              >
                <CheckIcon size={11} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {s.selectedChallenge?.title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {s.selectedChallenge?.category}
                </div>
              </div>
              <div className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
                Tag {s.dayNumber}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
