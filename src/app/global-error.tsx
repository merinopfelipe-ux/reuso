'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', background: '#FAFAF7', color: '#474747' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: '#737373', margin: 0, maxWidth: 360 }}>
            Ocurrió un error inesperado en la aplicación.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 12,
              padding: '10px 24px',
              background: '#00827C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
