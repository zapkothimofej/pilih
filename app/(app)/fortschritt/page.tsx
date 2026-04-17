import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { FlameIcon, BoltIcon, BotIcon, CheckIcon } from '@/components/ui/icons'

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
  const xp = sessions.reduce((acc, s) => acc + 100 + ((s.selectedChallenge?.currentDifficulty ?? 1) - 1) * 20, 0)
  const avgScore = sessions.flatMap(s => s.attempts).reduce(
    (acc, a, _, arr) => acc + a.judgeScore / arr.length, 0
  )

  const days = Array.from({ length: 21 }, (_, i) => {
    const day = i + 1
    const session = sessions.find(s => s.dayNumber === day)
    return { day, session, completed: !!session }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dein Fortschritt</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {sessions.length} von 21 Tagen abgeschlossen
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <FlameIcon size={16} />, label: 'Streak', value: streak, unit: 'Tage' },
          { icon: <BoltIcon size={16} />, label: 'XP', value: xp, unit: 'Punkte' },
          { icon: <BotIcon size={16} />, label: 'Ø Score', value: avgScore ? avgScore.toFixed(1) : '—', unit: '/10' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl border p-4 text-center"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex justify-center mb-2" style={{ color: 'var(--accent)' }}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.unit}</div>
          </div>
        ))}
      </div>

      {/* 21-day calendar */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          21-Tage-Kalender
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {days.map(({ day, completed, session }) => (
            <div
              key={day}
              title={session?.selectedChallenge?.title ?? `Tag ${day}`}
              className="aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition-colors"
              style={completed
                ? { background: 'var(--accent)', color: '#fff' }
                : day === sessions.length + 1
                ? { background: 'var(--accent-dim)', border: '1.5px solid var(--accent-border)', color: 'var(--accent)' }
                : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
              }
            >
              {completed
                ? <CheckIcon size={11} />
                : <span className="tabular-nums">{day}</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Challenge history */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h2
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Abgeschlossene Challenges
          </h2>
          {sessions.map(s => {
            const attempt = s.attempts[0]
            return (
              <div
                key={s.id}
                className="rounded-xl border px-4 py-3.5"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Tag {s.dayNumber}
                  </span>
                  {attempt && (
                    <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
                      Score {attempt.judgeScore}/10
                    </span>
                  )}
                </div>
                <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {s.selectedChallenge?.title}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {s.selectedChallenge?.category}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
