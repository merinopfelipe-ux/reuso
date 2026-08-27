'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from '@/components/ui/icons'

// 32 departamentos de Colombia + Bogotá D.C.
export const DEPARTAMENTOS_COLOMBIA = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá',
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
  'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
  'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
].sort()

export interface SelectorRegionProps {
  pais: string
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  className?: string
}

export function SelectorRegion({ pais, value, onChange, disabled, className = '' }: SelectorRegionProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!abierto) setBusqueda('')
  }, [abierto])

  // Si no es Colombia, es un input de texto abierto
  if (pais !== 'Colombia') {
    return (
      <input
        type="text"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${className}`}
        style={{
          background: 'var(--surface, var(--bg-input))',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          opacity: disabled ? 0.6 : 1,
        }}
        placeholder="Estado / Región"
      />
    )
  }

  // Si es Colombia, es un Selector de Departamento
  const depsFiltrados = DEPARTAMENTOS_COLOMBIA.filter(d => d.toLowerCase().includes(busqueda.toLowerCase()))
  const busquedaEsValida = busqueda.trim().length > 0 && !DEPARTAMENTOS_COLOMBIA.some(d => d.toLowerCase() === busqueda.toLowerCase())

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
          color: value ? 'var(--text-primary)' : 'var(--text-placeholder)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span className="truncate">{value || 'Seleccionar región'}</span>
        <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
      </button>

      {abierto && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div 
            className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden flex flex-col"
            style={{ 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border)',
              maxHeight: '300px'
            }}
          >
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-input)]">
                <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar región..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-1">
              {depsFiltrados.length === 0 && !busquedaEsValida ? (
                <div className="p-3 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No se encontraron regiones
                </div>
              ) : (
                <>
                  {depsFiltrados.map((dep) => (
                    <button
                      key={dep}
                      type="button"
                      onClick={() => {
                        onChange(dep)
                        setAbierto(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-[var(--bg-hover)] ${value === dep ? 'bg-[var(--bg-hover)] font-semibold' : ''}`}
                      style={{ 
                        color: 'var(--text-primary)'
                      }}
                    >
                      {dep}
                    </button>
                  ))}
                  
                  {busquedaEsValida && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(busqueda.trim())
                        setAbierto(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-[var(--bg-hover)] border-t border-dashed mt-1"
                      style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                    >
                      <span className="opacity-70">Usar:</span> <span className="font-semibold">{busqueda.trim()}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
