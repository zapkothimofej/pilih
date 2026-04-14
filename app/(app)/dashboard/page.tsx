import { redirect } from 'next/navigation'
import { getCurrentDbUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentDbUser()
  if (!user) redirect('/sign-in')

  // Onboarding noch nicht abgeschlossen?
  const onboarding = await prisma.onboardingProfile.findUnique({
    where: { userId: user.id },
  })
  if (!onboarding?.completedAt) redirect('/onboarding')

  // Fortschritt berechnen
  const completedSessions = await prisma.dailySession.count({
    where: { userId: user.id, status: 'COMPLETED' },
  })

  // Streak berechnen
  const sessions = await prisma.dailySession.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    orderBy: { date: 'desc' },
    take: 30,
  })

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < sessions.length; i++) {
    const sessionDate = new Date(sessions[i].date)
    sessionDate.setHours(0, 0, 0, 0)
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    if (sessionDate.getTime() === expected.getTime()) {
      streak++
    } else {
      break
    }
  }

  const xp = completedSessions * 100
  const progress = Math.round((completedSessions / 21) * 100)

  return (
    <div className="space-y-8">
      {/* Begrüßung */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Willkommen zurück, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-zinc-400 mt-1">
          Tag {completedSessions + 1} von 21 — du machst das großartig!
        </p>
      </div>

      {/* Stats-Karten */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 text-center">
          <div className="text-4xl font-bold text-orange-500">{streak}</div>
          <div className="text-zinc-400 text-sm mt-1">🔥 Streak</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 text-center">
          <div className="text-4xl font-bold text-white">{completedSessions}</div>
          <div className="text-zinc-400 text-sm mt-1">✅ Abgeschlossen</div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 text-center">
          <div className="text-4xl font-bold text-purple-400">{xp}</div>
          <div className="text-zinc-400 text-sm mt-1">⚡ XP</div>
        </div>
      </div>

      {/* Fortschrittsbalken */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">Gesamtfortschritt</span>
          <span className="text-white font-medium">{progress}%</span>
        </div>
        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500 mt-2">{completedSessions} / 21 Challenges abgeschlossen</div>
      </div>

      {/* CTA */}
      {completedSessions < 21 ? (
        <Link
          href="/challenge/heute"
          className="block w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold text-center rounded-xl transition-colors text-lg"
        >
          Heutige Challenge starten →
        </Link>
      ) : (
        <Link
          href="/abschluss"
          className="block w-full py-4 bg-green-500 hover:bg-green-400 text-white font-bold text-center rounded-xl transition-colors text-lg"
        >
          🏆 Abschluss-Test absolvieren
        </Link>
      )}
    </div>
  )
}
