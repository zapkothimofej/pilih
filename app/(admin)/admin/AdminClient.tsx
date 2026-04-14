'use client'

import { useState } from 'react'

type Participant = {
  id: string; name: string; email: string; company: string
  tier: string; completed: number; progress: number
  hasCertificate: boolean; onboarded: boolean
}

const TIER_LABELS: Record<string, string> = { BASE: '399€', PRO: '499€', PREMIUM: '999€' }
const TIER_COLORS: Record<string, string> = {
  BASE: 'text-zinc-400 bg-zinc-800',
  PRO: 'text-blue-400 bg-blue-900/40',
  PREMIUM: 'text-purple-400 bg-purple-900/40',
}

export default function AdminClient({
  participants, stats, isSuperAdmin,
}: {
  participants: Participant[]
  stats: { total: number; active: number; finished: number; avgProgress: number }
  isSuperAdmin: boolean
}) {
  const [search, setSearch] = useState('')

  const filtered = participants.filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) ||
         p.email.toLowerCase().includes(search.toLowerCase()) ||
         p.company.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Übersicht aller Teilnehmer</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Gesamt', value: stats.total, color: 'text-white' },
          { label: 'Aktiv', value: stats.active, color: 'text-orange-400' },
          { label: 'Abgeschlossen', value: stats.finished, color: 'text-green-400' },
          { label: 'Ø Fortschritt', value: `${stats.avgProgress}%`, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Suche */}
      <input
        type="text"
        placeholder="Name, E-Mail oder Firma suchen..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-[#111] border border-[#333] focus:border-orange-500 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 outline-none text-sm transition-colors"
      />

      {/* Tabelle */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222] text-zinc-500 text-xs uppercase tracking-wide">
              {['Name', 'Firma', 'Tier', 'Fortschritt', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors ${
                  i === filtered.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{p.name}</div>
                  <div className="text-xs text-zinc-500">{p.email}</div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.company}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[p.tier]}`}>
                    {TIER_LABELS[p.tier]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-[#222] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{p.completed}/21</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.hasCertificate ? (
                    <span className="text-xs text-green-400 font-medium">🏆 Zertifiziert</span>
                  ) : p.completed === 21 ? (
                    <span className="text-xs text-yellow-400">⏳ Im Abschluss</span>
                  ) : p.completed > 0 ? (
                    <span className="text-xs text-orange-400">🔥 Aktiv</span>
                  ) : p.onboarded ? (
                    <span className="text-xs text-zinc-400">📋 Onboarded</span>
                  ) : (
                    <span className="text-xs text-zinc-600">— Neu</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  Keine Teilnehmer gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
