import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="text-7xl mb-6">🔥</div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-orange-500">PILIH</span>
        </h1>
        <p className="text-xl text-zinc-400 mb-2 italic">
          &ldquo;Prompt it like it&rsquo;s hot&rdquo;
        </p>
        <p className="text-zinc-500 mb-10 leading-relaxed">
          Dein persönlicher KI-Führerschein — 21 Tage, 21 Challenges,
          individuell auf deinen Job zugeschnitten.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors"
          >
            Jetzt starten
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold rounded-lg transition-colors"
          >
            Einloggen
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: '🎯', title: '21 Challenges', desc: 'Individuell auf deinen Job zugeschnitten' },
            { icon: '🤖', title: 'KI-Feedback', desc: 'Echtzeit-Bewertung deiner Prompts' },
            { icon: '🏆', title: 'Zertifikat', desc: 'Offizieller KI-Führerschein zum Teilen' },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-semibold text-sm text-white">{item.title}</div>
              <div className="text-xs text-zinc-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
