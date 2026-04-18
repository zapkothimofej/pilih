export default function AppLoading() {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="relative w-10 h-10">
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{
            borderTopColor: 'var(--accent)',
            borderRightColor: 'var(--accent-border)',
          }}
        />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Lade…
      </p>
    </div>
  )
}
