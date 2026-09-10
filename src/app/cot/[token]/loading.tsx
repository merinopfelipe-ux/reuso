export default function CotizacionPublicaLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: "'Open Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header Skeleton */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--border)', opacity: 0.6 }} className="animate-pulse" />
          <div style={{ width: 140, height: 20, borderRadius: 6, background: 'var(--border)', opacity: 0.6 }} className="animate-pulse" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 70, height: 32, borderRadius: 20, background: 'var(--border)', opacity: 0.5 }} className="animate-pulse" />
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--border)', opacity: 0.5 }} className="animate-pulse" />
        </div>
      </header>

      {/* Hero Skeleton */}
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '32px 20px 100px', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 40 }}>
          {/* Greeting Tag */}
          <div style={{ width: 160, height: 26, borderRadius: 20, background: 'var(--color-brand-light)', opacity: 0.7, marginBottom: 16 }} className="animate-pulse" />
          
          {/* Main Title */}
          <div style={{ width: 'min(90%, 420px)', height: 38, borderRadius: 10, background: 'var(--border)', opacity: 0.7, marginBottom: 12 }} className="animate-pulse" />
          
          {/* Subtitle / date */}
          <div style={{ width: 220, height: 18, borderRadius: 6, background: 'var(--border)', opacity: 0.5, marginBottom: 24 }} className="animate-pulse" />

          {/* Environmental Impact Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 24px',
            borderRadius: 16,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ width: 110, height: 20, borderRadius: 6, background: 'var(--border)', opacity: 0.6 }} className="animate-pulse" />
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ width: 110, height: 20, borderRadius: 6, background: 'var(--border)', opacity: 0.6 }} className="animate-pulse" />
          </div>
        </div>

        {/* Furniture Grid Skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          marginBottom: 48,
        }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: 20,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Image Area */}
              <div style={{ width: '100%', height: 220, background: 'var(--border)', opacity: 0.45 }} className="animate-pulse" />
              
              {/* Content Area */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: 140, height: 22, borderRadius: 6, background: 'var(--border)', opacity: 0.7 }} className="animate-pulse" />
                  <div style={{ width: 60, height: 20, borderRadius: 12, background: 'var(--color-brand-light)', opacity: 0.7 }} className="animate-pulse" />
                </div>
                <div style={{ width: '90%', height: 14, borderRadius: 4, background: 'var(--border)', opacity: 0.4 }} className="animate-pulse" />
                <div style={{ width: '70%', height: 14, borderRadius: 4, background: 'var(--border)', opacity: 0.4 }} className="animate-pulse" />
                
                <div style={{ marginTop: 12, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: 80, height: 16, borderRadius: 4, background: 'var(--border)', opacity: 0.5 }} className="animate-pulse" />
                  <div style={{ width: 100, height: 24, borderRadius: 6, background: 'var(--border)', opacity: 0.8 }} className="animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Bar Skeleton */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 120, height: 16, borderRadius: 4, background: 'var(--border)', opacity: 0.6 }} className="animate-pulse" />
          <div style={{ width: 140, height: 28, borderRadius: 8, background: 'var(--border)', opacity: 0.8 }} className="animate-pulse" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 120, height: 44, borderRadius: 12, background: 'var(--border)', opacity: 0.5 }} className="animate-pulse" />
          <div style={{ width: 160, height: 44, borderRadius: 12, background: 'var(--color-brand)', opacity: 0.6 }} className="animate-pulse" />
        </div>
      </div>
    </div>
  )
}
