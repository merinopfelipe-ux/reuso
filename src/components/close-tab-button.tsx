'use client'

import {
  X,
} from 'lucide-react'

export function CloseTabButton() {
  return (
    <button
      onClick={() => window.close()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'var(--color-brand)',
        fontSize: 14,
        fontWeight: 600,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        marginBottom: 32,
        padding: 0,
      }}
      className="hover-rotate-90 hover-press"
    >
      <X size={15} /> Cerrar
    </button>
  )
}
