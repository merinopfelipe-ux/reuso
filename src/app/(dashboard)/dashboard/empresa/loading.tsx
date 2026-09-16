export default function Loading() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton-shimmer" style={{ height: 32, width: 220, borderRadius: 8 }} />
      <div className="skeleton-shimmer" style={{ height: 320, borderRadius: 16 }} />
    </div>
  )
}
