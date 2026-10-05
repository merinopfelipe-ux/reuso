'use client'

import { useState, useRef, useEffect } from 'react'
import { Download } from '@/components/ui/icons'
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button'

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
  size?: ButtonSize
  variant?: ButtonVariant
  className?: string
}

export function BotonDescargar({
  endpoint,
  queryParams,
  label = 'Exportar',
  size = 'sm',
  variant = 'secondary',
  className = '',
}: Props) {
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
    <div ref={ref} className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        onClick={() => setAbierto((v) => !v)}
        className={`gap-1.5 ${className}`}
        title={label}
      >
        <Download size={size === 'sm' ? 13 : 15} />
        <span>{label}</span>
      </Button>

      {abierto && (
        <div
          className="rounded-xl border border-(--border) bg-(--bg-card) shadow-md overflow-hidden z-50 py-1"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 160,
          }}
        >
          {OPCIONES.map(({ formato, label: opLabel }) => (
            <button
              key={formato}
              type="button"
              onClick={() => descargar(formato)}
              className="w-full text-left px-3.5 py-2 text-xs font-medium text-(--text-primary) hover:bg-(--bg-hover) transition-colors cursor-pointer select-none block"
            >
              {opLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

