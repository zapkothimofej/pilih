'use client'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: '#09090b', color: '#f4f4f8', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: '1rem' }} aria-hidden="true">
              <circle cx="20" cy="20" r="16" />
              <path d="M20 12v9" />
              <circle cx="20" cy="26.5" r="1.25" fill="#f87171" stroke="none" />
            </svg>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f4f4f8' }}>
              Etwas ist schiefgelaufen
            </h1>
            <p style={{ color: '#888aa6', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {error.digest
                ? `Ein kritischer Fehler ist aufgetreten. Fehler-ID: ${error.digest}`
                : 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>
            <button
              onClick={unstable_retry}
              style={{
                padding: '0.625rem 1.5rem',
                background: '#818cf8',
                color: '#fff',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
