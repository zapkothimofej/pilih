'use client'

import Link from 'next/link'

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 px-4">
      <div className="text-5xl">🔥</div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Feuer gelöscht – aber etwas ging schief</h1>
        <p className="text-zinc-400 text-sm max-w-sm">
          Ein unerwarteter Fehler ist aufgetreten.
          {error.digest && (
            <span className="block mt-1 text-zinc-600 text-xs">ID: {error.digest}</span>
          )}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={unstable_retry}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl text-sm transition-colors"
        >
          Erneut versuchen
        </button>
        <Link
          href="/dashboard"
          className="px-5 py-2 bg-[#111] border border-[#333] hover:border-[#444] text-zinc-300 hover:text-white font-medium rounded-xl text-sm transition-colors"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  )
}
