'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from '@/components/ui/icons'

export interface SelectorOpcion {
  value: string
  label: string
}

export interface SelectorProps {
  opciones: SelectorOpcion[] | readonly SelectorOpcion[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// Reemplazo genérico del <select> nativo del navegador (sin estilo propio,
// distinto en cada sistema operativo) — mismo patrón visual que
// SelectorCiudad/SelectorEmpresa: botón + panel propio.
export function Selector({ opciones, value, onChange, placeholder = 'Selecciona', disabled, className = '', style }: SelectorProps) {
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

  // Sin navegación por teclado a propósito: un intento de agregarla (abrir/
  // resaltar/seleccionar con flechas) causó que la página se moviera de
  // forma rara en el navegador real del usuario, sin poder reproducirlo ni
  // diagnosticarlo pese a varios intentos — se revirtió por completo
  // (2026-09-14). Lo único que queda es bloquear el scroll nativo de
  // página que el navegador hace por defecto con las flechas cuando el
  // botón tiene foco, para que quede en cero efecto, no en un efecto raro.
  function onKeyDownTrigger(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
    }
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onKeyDown={onKeyDownTrigger}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border text-sm outline-none transition-colors 
          ${disabled ? 'opacity-50 cursor-not-allowed bg-[var(--bg-card)]' : 'bg-[var(--bg-input)] hover:bg-[var(--bg-card)] cursor-pointer'} 
          ${abierto ? 'border-[var(--color-brand)] shadow-[0_0_0_3px_var(--color-brand-alpha)]' : 'border-[var(--border)]'} 
          ${className}`}
        style={style}
        onClick={() => setAbierto(a => !a)}
      >
        <span className="truncate" style={{ color: seleccionada ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{seleccionada?.label ?? placeholder}</span>
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
