import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { FlameIcon, BoltIcon, BotIcon } from '@/components/ui/icons'
import { calcStreak, totalXp } from '@/lib/progress/xp'
import { formatInt, formatScore, plural } from '@/lib/utils/format'
import FortschrittCalendar from './FortschrittCalendar'

export default async function FortschrittPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  // Narrow select: we only need the fields the UI actually reads.
  // Previously include: true pulled ~100 KB (full description +
  // promptingTips + llmResponse + userPrompt per row × 21 rows).
  const sessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    select: {
      id: true,
      dayNumber: true,
      date: true,
      xpEarned: true,
      selectedChallenge: { select: { title: true, category: true, currentDifficulty: true } },
      attempts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { judgeScore: true },
      },
    },
    orderBy: { dayNumber: 'asc' },
  })

  const streak = calcStreak(sessions.map(s => ({ date: s.date })))
  const xp = totalXp(sessions)
  const scored = sessions.flatMap(s => s.attempts)
  const avgScore = scored.length
    ? scored.reduce((acc, a) => acc + a.judgeScore, 0) / scored.length
    : 0

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

      {/* Stats — numbers run through formatInt / formatScore so German
          thousands (1.234) and decimal commas (7,3) are consistent. */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <FlameIcon size={16} />, label: 'Streak', value: formatInt(streak), unit: plural(streak, 'Tag', 'Tage') },
          { icon: <BoltIcon size={16} />, label: 'XP', value: formatInt(xp), unit: 'Punkte' },
          { icon: <BotIcon size={16} />, label: 'Ø Score', value: avgScore ? formatScore(avgScore) : '—', unit: '/10' },
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
      <FortschrittCalendar
        days={days.map(({ day, completed, session }) => ({
          day,
          completed,
          title: session?.selectedChallenge?.title,
        }))}
        completedCount={sessions.length}
      />

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
