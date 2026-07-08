'use client'

import { useEffect } from 'react'
import {
  AlertCircle as WarningCircle,
  RotateCcw as ArrowCounterClockwise,
} from 'lucide-react'

export default function EmpresaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[empresa] error no controlado:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
      gap: 16,
    }}>
      <WarningCircle size={48} style={{ color: '#FF5E4B' }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A3A38', margin: 0 }}>
        Algo salió mal
      </h2>
      <p style={{ fontSize: 14, color: '#4D7C79', maxWidth: 360, margin: 0 }}>
        Ocurrió un error inesperado. Si el problema persiste, contacta soporte.
      </p>
      <button
        onClick={reset}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: '#00827C', color: '#fff',
          borderRadius: 10, border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 600,
        }}
      >
        <ArrowCounterClockwise size={16} strokeWidth={2.5} />
        Reintentar
      </button>
    </div>
  )
}
