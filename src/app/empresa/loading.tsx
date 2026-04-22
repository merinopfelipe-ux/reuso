export default function EmpresaLoading() {
  return (
    <div style={{ padding: '40px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Search & Profile area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-shimmer" style={{ width: '400px', height: '48px', borderRadius: '24px' }} />
        <div className="skeleton-shimmer" style={{ width: '150px', height: '40px', borderRadius: '20px' }} />
      </div>

      {/* Main Impact Banner */}
      <div className="skeleton-shimmer" style={{ width: '100%', height: '260px', borderRadius: '24px' }} />

      {/* Two Columns Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', 
        gap: '32px' 
      }}>
        {/* Main List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: '80px', borderRadius: '16px' }} />
          ))}
        </div>
        {/* Sidebar Info */}
        <div className="skeleton-shimmer" style={{ height: '400px', borderRadius: '24px' }} />
      </div>
    </div>
  )
}
