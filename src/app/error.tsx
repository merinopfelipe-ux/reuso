'use client'

import { useEffect } from 'react'
import Image from 'next/image'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg-primary)',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <Image src="/logo-icono.svg" alt="Calculadora de Reúso" width={72} height={72} priority />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        Algo salió mal
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, maxWidth: 340, lineHeight: 1.6 }}>
        Ocurrió un error inesperado. Si el problema persiste, escríbenos a{' '}
        <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)' }}>servicio@lurdes.co</a>.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          background: 'var(--color-brand)',
          color: '#fff',
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
  )
}
