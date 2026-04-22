'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, X } from '@phosphor-icons/react'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const aceptadas = localStorage.getItem('reuso_cookies_aceptadas')
    if (!aceptadas) setVisible(true)
  }, [])

  function aceptar() {
    localStorage.setItem('reuso_cookies_aceptadas', 'true')
    setVisible(false)
  }

  function cerrar() {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'calc(100% - 48px)',
        maxWidth: 680,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(173,124,67,0.18), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Franja decorativa superior */}
      <div
        style={{
          height: 4,
          background: 'linear-gradient(90deg, #F3BBD3 0%, #AD7C43 50%, #F3BBD3 100%)',
        }}
      />

      <div
        style={{
          background: '#FFF8F2',
          padding: '20px 24px 20px 20px',
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/* Ícono galleta */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #F3BBD3 0%, #AD7C43 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Cookie size={24} color="#fff" />
        </div>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: '0 0 4px 0',
              fontSize: 14,
              fontWeight: 700,
              color: '#5C3A1E',
              lineHeight: 1.3,
            }}
          >
            Usamos cookies
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#7A5230',
              lineHeight: 1.6,
            }}
          >
            Para mejorar tu experiencia en la plataforma.{' '}
            <Link
              href="/legal/cookies"
              style={{
                color: '#AD7C43',
                fontWeight: 600,
                textDecoration: 'underline',
                textDecorationColor: 'rgba(173,124,67,0.4)',
              }}
            >
              Lee la política completa
            </Link>
            .
          </p>
        </div>

        {/* Acciones */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'flex-end',
            flexShrink: 0,
          }}
        >
          <button
            onClick={aceptar}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #F3BBD3 0%, #AD7C43 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(173,124,67,0.30)',
            }}
          >
            <Cookie size={14} />
            Aceptar cookies
          </button>
          <button
            onClick={cerrar}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'transparent',
              color: '#AD7C43',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid rgba(173,124,67,0.30)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <X size={12} />
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
