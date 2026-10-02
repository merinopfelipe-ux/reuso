'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from '@/components/ui/icons'

export interface SelectorOpcion {
  value: string
  label: string
}

export type SelectorTamano = 'sm' | 'md' | 'lg'

export interface SelectorProps {
  opciones: SelectorOpcion[] | readonly SelectorOpcion[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  tamano?: SelectorTamano
}

const SIZES: Record<SelectorTamano, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-xs',
  lg: 'h-11 px-4 text-sm',
}

const ICON_SIZES: Record<SelectorTamano, number> = {
  sm: 13,
  md: 14,
  lg: 16,
}

// Reemplazo genérico del <select> nativo del navegador (sin estilo propio,
// distinto en cada sistema operativo) — mismo patrón visual que
// SelectorCiudad/SelectorEmpresa: botón + panel propio.
export function Selector({
  opciones,
  value,
  onChange,
  placeholder = 'Selecciona',
  disabled,
  className = '',
  style,
  tamano = 'md',
}: SelectorProps) {
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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onKeyDown={onKeyDownTrigger}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border outline-hidden transition-colors ${SIZES[tamano]} 
          ${disabled ? 'opacity-50 cursor-not-allowed bg-(--bg-card)' : 'bg-(--bg-input) hover:bg-(--bg-card) cursor-pointer'} 
          ${abierto ? 'border-brand shadow-[0_0_0_3px_var(--color-brand-alpha)]' : 'border-(--border)'}`}
        style={style}
        onClick={() => setAbierto(a => !a)}
      >
        <span className="whitespace-nowrap" style={{ color: seleccionada ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>{seleccionada?.label ?? placeholder}</span>
        <ChevronDown size={ICON_SIZES[tamano]} className="text-(--text-secondary) shrink-0" />
      </button>

      {abierto && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div
            className="absolute top-full left-0 mt-1.5 min-w-full w-max max-w-sm border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', maxHeight: '300px' }}
          >
            <div className="overflow-y-auto flex-1 p-1">
              {opciones.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setAbierto(false) }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors hover:bg-(--bg-hover) whitespace-nowrap ${value === o.value ? 'bg-(--bg-hover) font-semibold' : ''}`}
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
