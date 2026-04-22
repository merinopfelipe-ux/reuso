export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0' }}>
      <div className="skeleton-shimmer" style={{ height: 16, flex: 2, borderRadius: 6 }} />
      <div className="skeleton-shimmer" style={{ height: 16, flex: 1, borderRadius: 6 }} />
      <div className="skeleton-shimmer" style={{ height: 16, flex: 1, borderRadius: 6 }} />
      <div className="skeleton-shimmer" style={{ height: 16, width: 60, borderRadius: 6 }} />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ width: '100%' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
        <div className="skeleton-shimmer" style={{ height: 14, flex: 2, borderRadius: 4 }} />
        <div className="skeleton-shimmer" style={{ height: 14, flex: 1, borderRadius: 4 }} />
        <div className="skeleton-shimmer" style={{ height: 14, flex: 1, borderRadius: 4 }} />
        <div className="skeleton-shimmer" style={{ height: 14, width: 60, borderRadius: 4 }} />
      </div>
      {/* Filas */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
          <SkeletonRow />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{ width: '100%', height, borderRadius: 12 }}
    />
  )
}

export function SkeletonKPI() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div className="skeleton-shimmer" style={{ height: 14, width: '60%', borderRadius: 4 }} />
      <div className="skeleton-shimmer" style={{ height: 32, width: '40%', borderRadius: 6 }} />
      <div className="skeleton-shimmer" style={{ height: 12, width: '50%', borderRadius: 4 }} />
    </div>
  )
}
