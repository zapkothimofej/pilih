import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import StreakCounter from '@/components/dashboard/StreakCounter'
import DayRing from '@/components/dashboard/DayRing'
import XPBar from '@/components/dashboard/XPBar'

function calcStreak(sessions: { date: Date }[]) {
  const sorted = [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime())
  let streak = 0
  const today = new Date(); today.setHours(0,0,0,0)
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i].date); d.setHours(0,0,0,0)
    const exp = new Date(today); exp.setDate(today.getDate() - i)
    if (d.getTime() === exp.getTime()) streak++
    else break
  }
  return streak
}

export default async function DashboardPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const onboarding = await prisma.onboardingProfile.findUnique({ where: { userId: user.id } })
  if (!onboarding?.completedAt) redirect('/onboarding')

  const sessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    include: { selectedChallenge: true },
    orderBy: { date: 'desc' },
  })

  const completed = sessions.length
  const streak = calcStreak(sessions.map(s => ({ date: s.date })))
  const xp = sessions.reduce((acc, s) => acc + 100 + ((s.selectedChallenge?.difficulty ?? 1) - 1) * 20, 0)
  const hasChallengeToday = sessions.some(s => {
    const d = new Date(s.date); d.setHours(0,0,0,0)
    const today = new Date(); today.setHours(0,0,0,0)
    return d.getTime() === today.getTime()
  })

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hey {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-zinc-400 text-sm mt-0.5">
          {completed === 0
            ? 'Starte heute mit deiner ersten Challenge!'
            : completed < 21
            ? `Tag ${completed + 1} wartet auf dich`
            : '🎉 Du hast alle 21 Tage abgeschlossen!'}
        </p>
      </div>

      {/* Kern-Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 flex flex-col items-center justify-center">
          <StreakCounter streak={streak} />
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 flex flex-col items-center justify-center">
          <DayRing completed={completed} />
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 flex flex-col justify-center">
          <XPBar xp={xp} />
        </div>
      </div>

      {/* CTA */}
      {completed < 21 ? (
        <Link
          href="/challenge/heute"
          className={`block w-full py-4 font-bold text-center rounded-xl transition-colors text-lg ${
            hasChallengeToday
              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              : 'bg-orange-500 hover:bg-orange-400 text-white'
          }`}
        >
          {hasChallengeToday ? '✓ Heutige Challenge abgeschlossen' : 'Heutige Challenge starten →'}
        </Link>
      ) : (
        <Link
          href="/abschluss"
          className="block w-full py-4 bg-green-500 hover:bg-green-400 text-white font-bold text-center rounded-xl transition-colors text-lg"
        >
          🏆 Abschluss-Test absolvieren
        </Link>
      )}

      {/* Letzte 3 Challenges */}
      {sessions.slice(0, 3).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-400">Zuletzt abgeschlossen</h2>
            <Link href="/fortschritt" className="text-xs text-orange-400 hover:underline">Alle →</Link>
          </div>
          {sessions.slice(0, 3).map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-[#111] border border-[#222] rounded-lg px-4 py-3">
              <span className="text-orange-500 text-sm font-bold">✓</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{s.selectedChallenge?.title}</div>
                <div className="text-xs text-zinc-600">{s.selectedChallenge?.category}</div>
              </div>
              <div className="text-xs text-zinc-600">Tag {s.dayNumber}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
