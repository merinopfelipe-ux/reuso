'use client'

import { useEffect } from 'react'
import { AlertCircle as WarningCircle, RotateCcw as ArrowCounterClockwise } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

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
      <WarningCircle size={48} style={{ color: 'var(--color-error)' }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        Algo salió mal
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360, margin: 0 }}>
        Ocurrió un error inesperado. Si el problema persiste, contacta soporte.
      </p>
      <Button onClick={reset} icon={<ArrowCounterClockwise size={16} strokeWidth={2.5} />}>
        Reintentar
      </Button>
    </div>
  )
}
