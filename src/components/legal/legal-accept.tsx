'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LegalAcceptProps {
  storageKey: string
  texto: string
  redirectTo?: string
}

export function LegalAccept({ storageKey, texto, redirectTo }: LegalAcceptProps) {
  const [aceptado, setAceptado] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const router = useRouter()

  function handleAceptar() {
    if (!aceptado) return
    localStorage.setItem(storageKey, 'true')
    setGuardado(true)
    if (redirectTo) {
      setTimeout(() => router.push(redirectTo), 800)
    }
  }

  if (guardado) {
    return (
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          background: 'rgba(56,185,142,0.08)',
          border: '1px solid rgba(56,185,142,0.25)',
          color: 'var(--color-success)',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Aceptación registrada. Puedes usar la plataforma con confianza.
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: 12,
        background: 'rgba(0,130,124,0.04)',
        border: '1px solid rgba(0,130,124,0.15)',
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
          marginBottom: aceptado ? 16 : 0,
        }}
      >
        <input
          type="checkbox"
          checked={aceptado}
          onChange={(e) => setAceptado(e.target.checked)}
          style={{ marginTop: 3, accentColor: 'var(--color-brand)', width: 16, height: 16 }}
        />
        <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
          {texto}
        </span>
      </label>

      {aceptado && (
        <button
          onClick={handleAceptar}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 20px',
            borderRadius: 10,
            background: 'var(--color-brand)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          Confirmar aceptación
        </button>
      )}
    </div>
  )
}
