import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'

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

export default async function FortschrittPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  const sessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    include: {
      selectedChallenge: true,
      attempts: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { dayNumber: 'asc' },
  })

  const streak = calcStreak(sessions.map(s => ({ date: s.date })))
  const xp = sessions.reduce((acc, s) => acc + 100 + (s.selectedChallenge?.difficulty ?? 1 - 1) * 20, 0)
  const avgScore = sessions.flatMap(s => s.attempts).reduce((acc, a, _, arr) => acc + a.judgeScore / arr.length, 0)

  // 21-Tage Kalender
  const days = Array.from({ length: 21 }, (_, i) => {
    const day = i + 1
    const session = sessions.find(s => s.dayNumber === day)
    return { day, session, completed: !!session }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dein Fortschritt</h1>
        <p className="text-zinc-400 text-sm mt-1">{sessions.length} von 21 Tagen abgeschlossen</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '🔥 Streak', value: streak, unit: 'Tage' },
          { label: '⚡ XP', value: xp, unit: 'Punkte' },
          { label: '🤖 Ø Score', value: avgScore ? avgScore.toFixed(1) : '—', unit: '/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{stat.unit}</div>
            <div className="text-xs text-zinc-600 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 21-Tage Kalender */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-400 mb-4">21-Tage-Kalender</h2>
        <div className="grid grid-cols-7 gap-2">
          {days.map(({ day, completed, session }) => (
            <div
              key={day}
              title={session?.selectedChallenge?.title ?? `Tag ${day}`}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                completed
                  ? 'bg-orange-500 text-white'
                  : day === sessions.length + 1
                  ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                  : 'bg-[#1a1a1a] text-zinc-600'
              }`}
            >
              {completed ? '✓' : day}
            </div>
          ))}
        </div>
      </div>

      {/* Challenge-History */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400">Abgeschlossene Challenges</h2>
          {sessions.map(s => {
            const attempt = s.attempts[0]
            return (
              <div key={s.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-zinc-500">Tag {s.dayNumber}</div>
                  {attempt && (
                    <div className="text-xs font-medium text-purple-400">Score: {attempt.judgeScore}/10</div>
                  )}
                </div>
                <div className="font-medium text-white text-sm">{s.selectedChallenge?.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.selectedChallenge?.category}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
