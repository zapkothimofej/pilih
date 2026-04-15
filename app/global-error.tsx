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
      <body style={{ margin: 0, background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Etwas ist schiefgelaufen
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {error.digest
                ? `Ein kritischer Fehler ist aufgetreten. Fehler-ID: ${error.digest}`
                : 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>
            <button
              onClick={unstable_retry}
              style={{
                padding: '0.625rem 1.5rem',
                background: '#f97316',
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
