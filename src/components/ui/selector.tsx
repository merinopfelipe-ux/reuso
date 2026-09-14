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
  const [resaltado, setResaltado] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const opcionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const seleccionada = opciones.find(o => o.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function abrir() {
    const indiceActual = opciones.findIndex(o => o.value === value)
    setResaltado(indiceActual >= 0 ? indiceActual : 0)
    setAbierto(true)
  }

  useEffect(() => {
    if (abierto) opcionRefs.current[resaltado]?.scrollIntoView({ block: 'nearest' })
  }, [abierto, resaltado])

  // Teclado tipo <select> nativo — antes este botón no respondía a ninguna
  // tecla salvo Enter/Espacio (comportamiento por defecto de <button>), sin
  // forma de navegar las opciones sin usar el mouse (bug real reportado,
  // QA pub-17: "presioné la flecha hacia abajo... no pasó nada"). El foco
  // se queda siempre en el botón disparador (el panel nunca lo recibe), así
  // que TODO el manejo de teclado vive acá, no en el panel — si se abriera
  // solo al abrir y se dejara la navegación en el panel, las flechas
  // siguientes nunca llegarían a ningún listener.
  function onKeyDownTrigger(e: React.KeyboardEvent) {
    if (disabled) return
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        abrir()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setResaltado(i => Math.min(i + 1, opciones.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opcion = opciones[resaltado]
      if (opcion) { onChange(opcion.value); setAbierto(false) }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setAbierto(false)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setResaltado(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setResaltado(opciones.length - 1)
    }
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={onKeyDownTrigger}
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
              {opciones.map((o, i) => (
                <button
                  key={o.value}
                  ref={el => { opcionRefs.current[i] = el }}
                  type="button"
                  onClick={() => { onChange(o.value); setAbierto(false) }}
                  onMouseEnter={() => setResaltado(i)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${value === o.value ? 'font-semibold' : ''} ${i === resaltado ? 'bg-[var(--bg-hover)]' : ''}`}
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
