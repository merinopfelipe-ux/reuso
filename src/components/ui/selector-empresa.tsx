'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from '@/components/ui/icons'

export interface EmpresaOpcion {
  id: string
  nombre: string
}

export interface SelectorEmpresaProps {
  empresas: EmpresaOpcion[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

// Reemplaza el <select> nativo del navegador (sin estilo propio, distinto en
// cada sistema operativo) por el mismo patrón visual que ya usan
// SelectorCiudad/SelectorPais: botón + panel propio, con buscador para
// cuando hay muchas empresas.
export function SelectorEmpresa({ empresas, value, onChange, placeholder = 'Selecciona una empresa' }: SelectorEmpresaProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const seleccionada = empresas.find(e => e.id === value)
  const empresasFiltradas = empresas.filter(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))

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

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between gap-2 text-sm font-semibold outline-none cursor-pointer"
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="truncate">{seleccionada?.nombre ?? placeholder}</span>
        <ChevronDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div
            className="absolute top-full left-0 mt-1.5 w-full min-w-[240px] border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', maxHeight: '320px' }}
          >
            {empresas.length >= 5 && (
              <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar empresa..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-1">
              {empresasFiltradas.length === 0 ? (
                <p className="text-xs text-center p-3 text-[var(--text-secondary)]">No se encontraron empresas.</p>
              ) : (
                empresasFiltradas.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onChange(e.id); setAbierto(false) }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-[var(--bg-hover)] ${value === e.id ? 'bg-[var(--bg-hover)] font-semibold' : ''}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {e.nombre}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
