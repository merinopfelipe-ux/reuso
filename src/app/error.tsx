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
    void error
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
      <Image 
        src="/logo-icono.svg" 
        alt="Calculadora de Reúso" 
        width={72} 
        height={72} 
        priority 
        className="logo-dark-invert"
      />
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
          padding: '12px 28px',
          background: '#00827C', // Verde Sostenible Sólido
          color: '#FFFFFF',      // Blanco Inmaculado SIEMPRE V13.1
          border: 'none',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0, 130, 124, 0.25)',
          transition: 'all 0.3s ease'
        }}
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
