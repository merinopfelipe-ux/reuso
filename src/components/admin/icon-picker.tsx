'use client'

import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import * as Phosphor from '@phosphor-icons/react'
import { Search as MagnifyingGlass, X } from '@/components/ui/icons'
import { normalizar } from '@/lib/normalizar-busqueda-icono'
import { parsearIcono, construirValorIcono, type LibreriaIcono } from '@/lib/icono-nombre'

// Selector visual de íconos — como el picker de emojis de Mac: buscas por
// nombre (en español, en inglés, o el nombre original de cada librería) y ves
// el ícono antes de elegirlo. Busca en Lucide y Phosphor a la vez, agrupados
// por librería — 762 nombres coinciden exactamente entre ambas (ej. "Anchor"
// existe en las dos con diseño distinto), por eso los resultados se muestran
// separados y el valor de Phosphor se guarda con el prefijo "phosphor:" (ver
// src/lib/icono-nombre.ts) — Lucide sigue sin prefijo, es el formato de
// siempre y el de todos los datos ya guardados.

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

// Sinónimos en español/inglés → términos que existen en los nombres reales
// de los íconos. No es exhaustivo: cubre los conceptos más comunes para esta
// plataforma (muebles, hogar, flechas, acciones de UI).
const SINONIMOS: Record<string, string[]> = {
  derecha: ['right'],
  izquierda: ['left'],
  arriba: ['up'],
  abajo: ['down'],
  flecha: ['arrow', 'chevron'],
  mesa: ['desk'],
  silla: ['armchair', 'chair'],
  sofa: ['sofa', 'couch', 'armchair'],
  sofá: ['sofa', 'couch', 'armchair'],
  cama: ['bed'],
  armario: ['closet', 'cabinet', 'wardrobe'],
  estante: ['shelf', 'shelves', 'bookshelf', 'shelving'],
  // La búsqueda ya normaliza tildes antes de mirar este diccionario (ver
  // normalizar() en src/lib/normalizar-busqueda-icono.ts), así que la clave
  // siempre debe ir SIN tilde — "estantería" nunca haría match aquí.
  estanteria: ['shelf', 'shelves', 'bookshelf', 'shelving'],
  // Término paraguas: junta todo lo relacionado a muebles de las 2 librerías.
  mueble: ['armchair', 'chair', 'sofa', 'couch', 'bed', 'desk', 'lamp', 'shelf', 'shelves', 'shelving', 'bookshelf', 'cabinet', 'wardrobe', 'closet', 'drawer', 'dresser', 'stool', 'bench', 'ottoman', 'recliner', 'nightstand'],
  muebles: ['armchair', 'chair', 'sofa', 'couch', 'bed', 'desk', 'lamp', 'shelf', 'shelves', 'shelving', 'bookshelf', 'cabinet', 'wardrobe', 'closet', 'drawer', 'dresser', 'stool', 'bench', 'ottoman', 'recliner', 'nightstand'],
  furniture: ['armchair', 'chair', 'sofa', 'couch', 'bed', 'desk', 'lamp', 'shelf', 'shelves', 'shelving', 'bookshelf', 'cabinet', 'wardrobe', 'closet', 'drawer', 'dresser', 'stool', 'bench', 'ottoman', 'recliner', 'nightstand'],
  libro: ['book'],
  biblioteca: ['library', 'bookshelf', 'book'],
  espejo: ['mirror'],
  lampara: ['lamp'],
  lámpara: ['lamp'],
  casa: ['home', 'house'],
  hogar: ['home', 'house'],
  usuario: ['user'],
  usuarios: ['users'],
  persona: ['person', 'user'],
  buscar: ['search'],
  configuracion: ['settings', 'cog', 'gear'],
  configuración: ['settings', 'cog', 'gear'],
  ajustes: ['settings', 'cog', 'gear'],
  eliminar: ['trash', 'delete'],
  borrar: ['trash', 'delete', 'eraser'],
  editar: ['edit', 'pencil'],
  candado: ['lock'],
  bloqueo: ['lock'],
  calendario: ['calendar'],
  reloj: ['clock', 'watch'],
  correo: ['mail', 'envelope'],
  email: ['mail', 'envelope'],
  telefono: ['phone'],
  teléfono: ['phone'],
  corazon: ['heart'],
  corazón: ['heart'],
  estrella: ['star'],
  marca: ['check'],
  chulo: ['check'],
  dinero: ['dollar', 'coin', 'wallet', 'banknote'],
  precio: ['dollar', 'tag', 'receipt'],
  etiqueta: ['tag', 'label'],
  camion: ['truck'],
  camión: ['truck'],
  caja: ['box', 'package'],
  paquete: ['package', 'box'],
  fabrica: ['factory'],
  fábrica: ['factory'],
  reciclaje: ['recycle'],
  hoja: ['leaf'],
  planta: ['sprout', 'leaf'],
  agua: ['droplet', 'droplets'],
  fuego: ['flame'],
  luz: ['lightbulb', 'sun'],
  sol: ['sun'],
  luna: ['moon'],
  carpeta: ['folder'],
  archivo: ['file'],
  documento: ['file', 'filetext'],
  imagen: ['image'],
  foto: ['image', 'camera'],
  camara: ['camera'],
  cámara: ['camera'],
  grafico: ['chart', 'barchart'],
  gráfico: ['chart', 'barchart'],
  martillo: ['hammer'],
  herramienta: ['wrench', 'tool'],
  pintura: ['paintbrush', 'palette'],
  tela: ['scissors', 'shirt'],
  ropa: ['shirt'],
  camisa: ['shirt'],
  vaso: ['cup', 'glass'],
  cocina: ['utensils', 'chefhat'],
  auto: ['car'],
  carro: ['car'],
  moto: ['bike'],
  bicicleta: ['bike'],
}

// Nombres exportados por cada librería que son componentes de ícono de
// verdad, deduplicados por referencia (varios nombres son alias del mismo
// ícono, ej. "ShelvingUnit" y "ShelvingUnitIcon" son el mismo componente).
const EXCLUIDOS_LUCIDE = new Set(['Icon', 'DynamicIcon', 'IconNode'])
const EXCLUIDOS_PHOSPHOR = new Set(['IconBase', 'IconContext'])

function nombresUnicos(mod: Record<string, unknown>, excluidos: Set<string>): string[] {
  // Ordenar para que los nombres sin prefijo "Lucide" se procesen primero.
  // Lucide exporta todos los íconos por duplicado (ej. "SkipBack" y "LucideSkipBack").
  // Si se procesa primero "LucideSkipBack", el buscador hace match de "desk" en "luciDESKipback".
  const candidatos = Object.keys(mod).filter(
    (nombre) => /^[A-Z]/.test(nombre) && !excluidos.has(nombre) && typeof mod[nombre] === 'object'
  ).sort((a, b) => {
    const aLucide = a.startsWith('Lucide')
    const bLucide = b.startsWith('Lucide')
    if (aLucide && !bLucide) return 1
    if (!aLucide && bLucide) return -1
    return 0
  })

  const vistos = new Set<unknown>()
  const resultado: string[] = []
  for (const nombre of candidatos) {
    const comp = mod[nombre]
    if (vistos.has(comp)) continue
    vistos.add(comp)
    resultado.push(nombre)
  }
  return resultado
}

const NOMBRES_LUCIDE = nombresUnicos(Lucide as unknown as Record<string, unknown>, EXCLUIDOS_LUCIDE)
const NOMBRES_PHOSPHOR = nombresUnicos(Phosphor as unknown as Record<string, unknown>, EXCLUIDOS_PHOSPHOR)

function componenteDe(libreria: LibreriaIcono, nombre: string): IconComponent | undefined {
  const mod = libreria === 'phosphor' ? (Phosphor as unknown as Record<string, IconComponent>) : (Lucide as unknown as Record<string, IconComponent>)
  return mod[nombre]
}

function buscar(nombres: string[], terminos: string[]): string[] {
  const coincide = (nombre: string) => {
    const n = normalizar(nombre)
    for (const t of terminos) if (n.includes(t)) return true
    return false
  }
  return nombres.filter(coincide)
}

export function IconPicker({ value, onChange }: { value: string; onChange: (valor: string) => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)

  const { resultadosLucide, resultadosPhosphor } = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) {
      return { resultadosLucide: NOMBRES_LUCIDE.slice(0, 30), resultadosPhosphor: NOMBRES_PHOSPHOR.slice(0, 30) }
    }
    const terminos = Array.from(new Set([q, ...(SINONIMOS[q] ?? [])]))
    return {
      resultadosLucide: buscar(NOMBRES_LUCIDE, terminos).slice(0, 40),
      resultadosPhosphor: buscar(NOMBRES_PHOSPHOR, terminos).slice(0, 40),
    }
  }, [busqueda])

  const totalResultados = resultadosLucide.length + resultadosPhosphor.length

  const { libreria: libreriaActual, nombre: nombreActual } = parsearIcono(value || '')
  const IconoActual = value ? componenteDe(libreriaActual, nombreActual) : undefined

  function elegir(libreria: LibreriaIcono, nombre: string) {
    onChange(construirValorIcono(libreria, nombre))
    setAbierto(false)
    setBusqueda('')
  }

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Ícono</label>
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border hover-pop"
        style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,130,124,0.1)' }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {IconoActual ? <IconoActual size={20} className="text-[var(--color-brand)]" {...(libreriaActual === 'phosphor' ? { weight: 'regular' as any } : { strokeWidth: 1.3 })} /> : <MagnifyingGlass size={18} className="text-[var(--text-placeholder)]" strokeWidth={1.3} />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium truncate">{nombreActual || 'Elegir ícono'}</p>
          <p className="text-xs text-[var(--text-secondary)]">Toca para buscar</p>
        </div>
      </button>

      {abierto && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.16)' }}>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3" style={{ background: 'var(--bg-input)' }}>
            <MagnifyingGlass size={15} className="text-[var(--text-secondary)] flex-shrink-0" />
            <input
              autoFocus
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Busca en español o inglés: mesa, shelving-unit, muebles..."
              className="flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)]"
            />
            {busqueda && (
              <button type="button" onClick={() => setBusqueda('')} className="flex-shrink-0 hover-pop">
                <X size={14} className="text-[var(--text-secondary)]" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mb-2 px-1">{totalResultados} ícono{totalResultados === 1 ? '' : 's'}</p>
          <div className="max-h-64 overflow-y-auto flex flex-col gap-3">
            {([
              ['Lucide', 'lucide', resultadosLucide],
              ['Phosphor', 'phosphor', resultadosPhosphor],
            ] as const).map(([titulo, libreria, nombres]) => nombres.length > 0 && (
              <div key={libreria}>
                <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 px-1">{titulo}</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {nombres.map(nombre => {
                    const Icono = componenteDe(libreria, nombre)
                    if (!Icono) return null
                    const activo = libreriaActual === libreria && nombreActual === nombre
                    return (
                      <button
                        key={`${libreria}:${nombre}`}
                        type="button"
                        title={nombre}
                        onClick={() => elegir(libreria, nombre)}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover-pop hover-press"
                        style={{ background: activo ? 'var(--color-brand)' : 'var(--bg-input)' }}
                      >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Icono size={20} className={activo ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-secondary)]'} {...(libreria === 'phosphor' ? { weight: 'regular' as any } : { strokeWidth: 1.3 })} />
                        <span className={`text-[9px] truncate w-full text-center ${activo ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-secondary)]'}`}>{nombre}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {totalResultados === 0 && (
              <p className="text-xs text-[var(--text-secondary)] py-6 text-center">Sin resultados para &ldquo;{busqueda}&rdquo;.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
