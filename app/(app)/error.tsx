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
      <div
        className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <ErrorIcon />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Etwas ist schiefgelaufen
        </h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Ein unerwarteter Fehler ist aufgetreten.
          {error.digest && (
            <span className="block mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              ID: {error.digest}
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={unstable_retry}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Erneut versuchen
        </button>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  )
}

function ErrorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--error)' }}>
      <circle cx="11" cy="11" r="9" />
      <path d="M11 7v4.5" />
      <circle cx="11" cy="15" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
