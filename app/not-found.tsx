import Link from 'next/link'

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl border flex items-center justify-center mb-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
          style={{ color: 'var(--accent)' }}
        >
          <circle cx="11" cy="11" r="9" />
          <path d="M7.5 8.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5 1 2.5 2.5 0 2-2.5 2-2.5 3.5" />
          <circle cx="10.5" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Seite nicht gefunden
      </h1>
      <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Die angeforderte Seite existiert nicht oder ist verschoben worden.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-85"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Zurück zum Dashboard
      </Link>
    </main>
  )
}
