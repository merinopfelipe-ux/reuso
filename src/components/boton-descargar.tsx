'use client'

import { useState, useRef, useEffect } from 'react'
import { Download } from '@phosphor-icons/react'

type Formato = 'csv' | 'xlsx' | 'pdf'

interface Opcion {
  formato: Formato
  label: string
}

const OPCIONES: Opcion[] = [
  { formato: 'xlsx', label: 'Excel (.xlsx)' },
  { formato: 'csv', label: 'CSV (.csv)' },
  { formato: 'pdf', label: 'PDF (.pdf)' },
]

interface Props {
  endpoint: string
  queryParams?: string
  label?: string
}

export function BotonDescargar({ endpoint, queryParams, label }: Props) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function descargar(formato: Formato) {
    const params = new URLSearchParams(queryParams ?? '')
    params.set('formato', formato)
    setAbierto(false)
    window.location.href = `${endpoint}?${params.toString()}`
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 8,
          border: '1.5px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Download size={14} />
        {label ?? 'Descargar'}
      </button>

      {abierto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            zIndex: 50,
            minWidth: 160,
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          {OPCIONES.map(({ formato, label: opLabel }) => (
            <button
              key={formato}
              onClick={() => descargar(formato)}
              style={{
                display: 'block',
                width: '100%',
                padding: '9px 16px',
                textAlign: 'left',
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {opLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
