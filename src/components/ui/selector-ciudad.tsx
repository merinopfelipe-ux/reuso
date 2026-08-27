'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from '@/components/ui/icons'

// Lista básica de ciudades principales de Colombia por departamento
export const CIUDADES_POR_DEPARTAMENTO: Record<string, string[]> = {
  'Amazonas': ['Leticia'],
  'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Rionegro', 'Turbo', 'Caucasia'],
  'Arauca': ['Arauca', 'Tame', 'Saravena'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga'],
  'Bogotá D.C.': ['Bogotá'],
  'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar'],
  'Boyacá': ['Tunja', 'Sogamoso', 'Duitama', 'Chiquinquirá'],
  'Caldas': ['Manizales', 'La Dorada', 'Chinchiná', 'Villamaría'],
  'Caquetá': ['Florencia', 'San Vicente del Caguán'],
  'Casanare': ['Yopal', 'Aguazul', 'Paz de Ariporo'],
  'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'],
  'Cesar': ['Valledupar', 'Aguachica', 'Agustín Codazzi'],
  'Chocó': ['Quibdó', 'Istmina'],
  'Córdoba': ['Montería', 'Lorica', 'Sahagún', 'Cereté'],
  'Cundinamarca': ['Soacha', 'Girardot', 'Facatativá', 'Zipaquirá', 'Chía', 'Mosquera', 'Madrid', 'Funza'],
  'Guainía': ['Inírida'],
  'Guaviare': ['San José del Guaviare'],
  'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia'],
  'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación'],
  'Meta': ['Villavicencio', 'Acacías', 'Granada'],
  'Nariño': ['Pasto', 'Tumaco', 'Ipiales'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Villa del Rosario', 'Los Patios', 'Pamplona'],
  'Putumayo': ['Mocoa', 'Puerto Asís'],
  'Quindío': ['Armenia', 'Calarcá', 'Montenegro'],
  'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
  'San Andrés y Providencia': ['San Andrés'],
  'Santander': ['Bucaramanga', 'Floridablanca', 'Barrancabermeja', 'Girón', 'Piedecuesta'],
  'Sucre': ['Sincelejo', 'Corozal', 'San Marcos'],
  'Tolima': ['Ibagué', 'Espinal', 'Melgar', 'Chaparral'],
  'Valle del Cauca': ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Yumbo', 'Cartago', 'Buga', 'Jamundí'],
  'Vaupés': ['Mitú'],
  'Vichada': ['Puerto Carreño']
}

export const CIUDAD_DEFECTO = 'Medellín'

// Lista priorizada para cuando no se conoce el departamento del cliente (caso
// de crm_clientes, que solo guarda "ciudad" sin región) — Medellín y Bogotá
// primero porque son las únicas ciudades con taller propio, seguidas de los
// municipios cercanos (Valle de Aburrá y sabana de Bogotá) y luego el resto
// de las ciudades de Colombia (todos los departamentos ya listados arriba,
// sin inventar ninguna nueva). Sigue permitiendo escribir cualquier otra
// ciudad a mano (ver "Usar ..." más abajo).
const CIUDADES_PRIORITARIAS: string[] = [
  'Medellín',
  'Bogotá',
  ...CIUDADES_POR_DEPARTAMENTO['Antioquia'].filter(c => c !== 'Medellín'),
  ...CIUDADES_POR_DEPARTAMENTO['Cundinamarca'],
  ...Object.entries(CIUDADES_POR_DEPARTAMENTO)
    .filter(([depto]) => depto !== 'Antioquia' && depto !== 'Cundinamarca' && depto !== 'Bogotá D.C.')
    .flatMap(([, ciudades]) => ciudades),
]

export interface SelectorCiudadProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  className?: string
  pais?: string
  region?: string
  conEmpresa?: (url: string) => string
}

export function SelectorCiudad({ value, onChange, disabled, className = '', pais = 'Colombia', region = '' }: SelectorCiudadProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Determinar la lista de ciudades a mostrar. Si hay región conocida, se usa
  // su lista específica (empresas, que sí capturan departamento). Si no hay
  // región (clientes del cotizador, que solo guardan ciudad), se usa la
  // lista priorizada en vez de dejarla vacía.
  const ciudadesLista = pais !== 'Colombia'
    ? []
    : region && CIUDADES_POR_DEPARTAMENTO[region]
      ? CIUDADES_POR_DEPARTAMENTO[region]
      : CIUDADES_PRIORITARIAS

  const ciudadesFiltradas = ciudadesLista.filter(c => c.toLowerCase().includes(busqueda.toLowerCase()))
  
  // Si la búsqueda no coincide exactamente con nada, permitimos elegir lo que escribió
  const busquedaEsValida = busqueda.trim().length > 0 && !ciudadesLista.some(c => c.toLowerCase() === busqueda.toLowerCase())

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
        placeholder="Ciudad"
      />
    )
  }

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
        <span className="truncate">{value || 'Seleccionar ciudad'}</span>
        <ChevronDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
      </button>

      {abierto && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div 
            className="absolute top-full left-0 mt-1.5 w-full border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col"
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
                  placeholder="Buscar o escribir ciudad..."
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
              {busquedaEsValida && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(busqueda.trim())
                    setAbierto(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Usar &quot;{busqueda}&quot;
                </button>
              )}
              {ciudadesFiltradas.length === 0 && !busquedaEsValida ? (
                <p className="text-xs text-center p-3 text-[var(--text-secondary)]">No se encontraron ciudades.</p>
              ) : (
                ciudadesFiltradas.map((ciudad) => (
                  <button
                    key={ciudad}
                    type="button"
                    onClick={() => {
                      onChange(ciudad)
                      setAbierto(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-[var(--bg-hover)] ${value === ciudad ? 'bg-[var(--bg-hover)] font-semibold' : ''}`}
                    style={{ 
                      color: 'var(--text-primary)'
                    }}
                  >
                    {ciudad}
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
