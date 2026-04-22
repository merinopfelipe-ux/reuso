export default function AdminLoading() {
  return (
    <div style={{ padding: '40px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-shimmer" style={{ width: '300px', height: '48px', borderRadius: '12px' }} />
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="skeleton-shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <div className="skeleton-shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '24px' 
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: '140px', borderRadius: '16px' }} />
        ))}
      </div>

      {/* Main Table Area */}
      <div className="skeleton-shimmer" style={{ flex: 1, minHeight: '400px', borderRadius: '20px' }} />
    </div>
  )
}
