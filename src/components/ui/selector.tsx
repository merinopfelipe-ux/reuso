'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from '@/components/ui/icons'

export interface SelectorOpcion {
  value: string
  label: string
}

export interface SelectorProps {
  opciones: SelectorOpcion[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Reemplazo genérico del <select> nativo del navegador (sin estilo propio,
// distinto en cada sistema operativo) — mismo patrón visual que
// SelectorCiudad/SelectorEmpresa: botón + panel propio.
export function Selector({ opciones, value, onChange, placeholder = 'Selecciona', disabled, className = '' }: SelectorProps) {
  const [abierto, setAbierto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const seleccionada = opciones.find(o => o.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors"
        style={{
          background: 'var(--surface, var(--bg-input))',
          borderColor: 'var(--border)',
          color: seleccionada ? 'var(--text-primary)' : 'var(--text-placeholder)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span className="truncate">{seleccionada?.label ?? placeholder}</span>
        <ChevronDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
      </button>

      {abierto && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div
            className="absolute top-full left-0 mt-1.5 w-full border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', maxHeight: '300px' }}
          >
            <div className="overflow-y-auto flex-1 p-1">
              {opciones.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setAbierto(false) }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${value === o.value ? 'bg-[var(--bg-hover)] font-semibold' : ''}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
