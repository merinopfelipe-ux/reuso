'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from '@/components/ui/icons'
import { Bandera } from '@/components/ui/bandera'

export interface Pais {
  nombre: string
  dial: string
  codigo?: string
  bandera: string
}

export const PAISES: Pais[] = [
  { nombre: 'Colombia', dial: '+57', codigo: 'CO', bandera: '🇨🇴' },
  { nombre: 'Argentina', dial: '+54', codigo: 'AR', bandera: '🇦🇷' },
  { nombre: 'Bolivia', dial: '+591', codigo: 'BO', bandera: '🇧🇴' },
  { nombre: 'Brasil', dial: '+55', codigo: 'BR', bandera: '🇧🇷' },
  { nombre: 'Canadá', dial: '+1', codigo: 'CA', bandera: '🇨🇦' },
  { nombre: 'Chile', dial: '+56', codigo: 'CL', bandera: '🇨🇱' },
  { nombre: 'Costa Rica', dial: '+506', codigo: 'CR', bandera: '🇨🇷' },
  { nombre: 'Cuba', dial: '+53', codigo: 'CU', bandera: '🇨🇺' },
  { nombre: 'Ecuador', dial: '+593', codigo: 'EC', bandera: '🇪🇨' },
  { nombre: 'El Salvador', dial: '+503', codigo: 'SV', bandera: '🇸🇻' },
  { nombre: 'España', dial: '+34', codigo: 'ES', bandera: '🇪🇸' },
  { nombre: 'Estados Unidos', dial: '+1', codigo: 'US', bandera: '🇺🇸' },
  { nombre: 'Guatemala', dial: '+502', codigo: 'GT', bandera: '🇬🇹' },
  { nombre: 'Honduras', dial: '+504', codigo: 'HN', bandera: '🇭🇳' },
  { nombre: 'México', dial: '+52', codigo: 'MX', bandera: '🇲🇽' },
  { nombre: 'Nicaragua', dial: '+505', codigo: 'NI', bandera: '🇳🇮' },
  { nombre: 'Panamá', dial: '+507', codigo: 'PA', bandera: '🇵🇦' },
  { nombre: 'Paraguay', dial: '+595', codigo: 'PY', bandera: '🇵🇾' },
  { nombre: 'Perú', dial: '+51', codigo: 'PE', bandera: '🇵🇪' },
  { nombre: 'Puerto Rico', dial: '+1', codigo: 'PR', bandera: '🇵🇷' },
  { nombre: 'República Dominicana', dial: '+1', codigo: 'DO', bandera: '🇩🇴' },
  { nombre: 'Uruguay', dial: '+598', codigo: 'UY', bandera: '🇺🇾' },
  { nombre: 'Venezuela', dial: '+58', codigo: 'VE', bandera: '🇻🇪' }
]

export interface SelectorPaisProps<T extends Pais | string = Pais | string> {
  value: T
  onChange: (val: T) => void
  disabled?: boolean
  modo?: 'pais' | 'indicativo'
}

export function SelectorPais<T extends Pais | string>({ value, onChange, disabled, modo = 'pais' }: SelectorPaisProps<T>) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const isStringValue = typeof value === 'string'
  const currentPaisObj = isStringValue ? PAISES.find(p => p.nombre === value) : (value as Pais)
  
  const currentBandera = currentPaisObj ? (
    <Bandera codigo={currentPaisObj.codigo || ''} alt={currentPaisObj.nombre} className="mr-1.5 align-middle" />
  ) : null

  // Determinamos el texto a mostrar en el botón
  let displayText = 'Seleccionar'
  if (currentPaisObj) {
    displayText = modo === 'indicativo' ? currentPaisObj.dial : currentPaisObj.nombre
  } else if (isStringValue && value) {
    displayText = value as string
  }

  const paisesFiltrados = PAISES.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.dial.includes(busqueda))

  useEffect(() => {
    if (!abierto) setBusqueda('')
  }, [abierto])

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors"
        style={{
          background: 'var(--surface, var(--bg-input))',
          borderColor: 'var(--border)',
          color: (currentPaisObj || (isStringValue && value)) ? 'var(--text-primary)' : 'var(--text-placeholder)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span className="truncate flex items-center">
          {currentBandera}
          {displayText}
        </span>
        <ChevronDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
      </button>

      {abierto && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div 
            className="absolute top-full left-0 mt-1.5 min-w-[200px] border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
              maxHeight: '300px'
            }}
          >
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar país o +código..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-1">
              {paisesFiltrados.length === 0 ? (
                <p className="text-xs text-center p-3 text-[var(--text-secondary)]">No se encontraron países.</p>
              ) : (
                paisesFiltrados.map((pais) => {
                  const isSelected = currentPaisObj?.nombre === pais.nombre
                  return (
                    <button
                      key={pais.nombre}
                      type="button"
                      onClick={() => {
                        if (isStringValue) {
                          onChange(pais.nombre as T)
                        } else {
                          onChange(pais as T)
                        }
                        setAbierto(false)
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                      style={{
                        color: 'var(--text-primary)', // Siempre gris/texto normal
                        fontWeight: isSelected ? 600 : 400,
                        background: isSelected ? 'var(--bg-hover)' : 'transparent'
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Bandera codigo={pais.codigo || ''} alt={pais.nombre} className="flex-shrink-0" />
                        <span style={{ fontWeight: isSelected ? 600 : 400 }}>{pais.nombre}</span>
                      </div>
                      {modo === 'indicativo' && (
                        <span className="text-xs text-[var(--text-secondary)]">{pais.dial}</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
