export default function Loading() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      zIndex: 9999,
    }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {/* Arco exterior - gira hacia adelante */}
        <svg width="120" height="120" viewBox="0 0 96 96"
          style={{ position: 'absolute', inset: 0, animation: 'spin-cw 1.4s linear infinite' }}>
          <circle cx="48" cy="48" r="44" fill="none"
            stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="90 186" strokeDashoffset="0" opacity="0.9" />
        </svg>
        {/* Arco interior - gira hacia atrás */}
        <svg width="120" height="120" viewBox="0 0 96 96"
          style={{ position: 'absolute', inset: 0, animation: 'spin-ccw 2.2s linear infinite' }}>
          <circle cx="48" cy="48" r="34" fill="none"
            stroke="var(--color-brand)" strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray="40 174" strokeDashoffset="0" opacity="0.45" />
        </svg>
        {/* Nodos del circuito */}
        <svg width="120" height="120" viewBox="0 0 96 96"
          style={{ position: 'absolute', inset: 0, animation: 'spin-cw 1.4s linear infinite' }}>
          <circle cx="92" cy="48" r="3" fill="var(--color-brand)" opacity="1" />
          <circle cx="26" cy="86.2" r="3" fill="var(--color-brand)" opacity="0.5" />
          <circle cx="26" cy="9.8" r="3" fill="var(--color-brand)" opacity="0.5" />
        </svg>
        {/* Logo centrado */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icono.svg"
          alt="Calculadora de Reúso"
          width={44} height={44}
          className="logo-dark-invert"
          style={{ position: 'absolute', inset: 0, margin: 'auto', objectFit: 'contain' }}
        />
      </div>
      <style>{`
        @keyframes spin-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes spin-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
      `}</style>
    </div>
  )
}
