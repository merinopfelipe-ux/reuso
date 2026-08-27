// Logo animado (arcos + logo centrado) — mismo patrón que src/app/loading.tsx,
// pero como componente reutilizable e inline (sin position:fixed) para usarlo
// dentro de cualquier pantalla que espera datos, no solo la transición de ruta.
export function LogoSpinner({ size = 120 }: { size?: number }) {
  const viewBox = 96
  const escala = size / 120

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Arco exterior — gira hacia adelante */}
      <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`}
        style={{ position: 'absolute', inset: 0, animation: 'spin-cw 1.4s linear infinite' }}>
        <circle cx="48" cy="48" r="44" fill="none"
          stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray="90 186" strokeDashoffset="0" opacity="0.9" />
      </svg>
      {/* Arco interior — gira hacia atrás */}
      <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`}
        style={{ position: 'absolute', inset: 0, animation: 'spin-ccw 2.2s linear infinite' }}>
        <circle cx="48" cy="48" r="34" fill="none"
          stroke="var(--color-brand)" strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray="40 174" strokeDashoffset="0" opacity="0.45" />
      </svg>
      {/* Nodos del circuito */}
      <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`}
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
        width={44 * escala} height={44 * escala}
        className="logo-dark-invert"
        style={{ position: 'absolute', inset: 0, margin: 'auto', objectFit: 'contain' }}
      />
      <style>{`
        @keyframes spin-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes spin-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
      `}</style>
    </div>
  )
}
