'use client'

import { useMemo, useState } from 'react'
import * as Lucide from 'lucide-react'
import { Search as MagnifyingGlass, X } from '@/components/ui/icons'

// Selector visual de íconos Lucide — como el picker de emojis de Mac: buscas
// por nombre (en español o inglés) y ves el ícono antes de elegirlo.

type LucideComponent = React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & { size?: number }>

// Sinónimos en español → términos en inglés que existen en los nombres de Lucide.
// No es exhaustivo: cubre los conceptos más comunes para esta plataforma
// (muebles, hogar, flechas, acciones de UI).
const SINONIMOS: Record<string, string[]> = {
  derecha: ['right'],
  izquierda: ['left'],
  arriba: ['up'],
  abajo: ['down'],
  flecha: ['arrow', 'chevron'],
  mesa: ['table'],
  silla: ['armchair', 'chair'],
  sofa: ['sofa', 'couch', 'armchair'],
  sofá: ['sofa', 'couch', 'armchair'],
  cama: ['bed'],
  armario: ['closet', 'cabinet', 'wardrobe'],
  estante: ['shelf', 'shelves', 'bookshelf'],
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

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Todos los nombres exportados por lucide-react que son componentes de ícono,
// deduplicados por referencia (algunos nombres son alias del mismo ícono).
const EXCLUIDOS = new Set(['Icon', 'DynamicIcon', 'IconNode'])
const TODOS_LOS_NOMBRES = Object.keys(Lucide).filter(
  (nombre) => /^[A-Z]/.test(nombre) && !EXCLUIDOS.has(nombre) && typeof (Lucide as unknown as Record<string, unknown>)[nombre] === 'object'
)
const NOMBRES_UNICOS: string[] = (() => {
  const vistos = new Set<unknown>()
  const resultado: string[] = []
  for (const nombre of TODOS_LOS_NOMBRES) {
    const comp = (Lucide as unknown as Record<string, unknown>)[nombre]
    if (vistos.has(comp)) continue
    vistos.add(comp)
    resultado.push(nombre)
  }
  return resultado
})()

export function IconPicker({ value, onChange }: { value: string; onChange: (nombre: string) => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return NOMBRES_UNICOS.slice(0, 60)

    const terminos = Array.from(new Set([q, ...(SINONIMOS[q] ?? [])]))
    const coincide = (nombre: string) => {
      const n = normalizar(nombre)
      for (const t of terminos) if (n.includes(t)) return true
      return false
    }
    return NOMBRES_UNICOS.filter(coincide).slice(0, 80)
  }, [busqueda])

  const IconoActual = value ? (Lucide as unknown as Record<string, LucideComponent>)[value] : undefined

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
          {IconoActual ? <IconoActual size={20} className="text-[var(--color-brand)]" /> : <MagnifyingGlass size={18} className="text-[var(--text-placeholder)]" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium truncate">{value || 'Elegir ícono'}</p>
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
              placeholder="Busca en español: mesa, silla, derecha..."
              className="flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)]"
            />
            {busqueda && (
              <button type="button" onClick={() => setBusqueda('')} className="flex-shrink-0 hover-pop">
                <X size={14} className="text-[var(--text-secondary)]" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mb-2 px-1">{resultados.length} ícono{resultados.length === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {resultados.map(nombre => {
              const Icono = (Lucide as unknown as Record<string, LucideComponent>)[nombre]
              const activo = value === nombre
              return (
                <button
                  key={nombre}
                  type="button"
                  title={nombre}
                  onClick={() => { onChange(nombre); setAbierto(false); setBusqueda('') }}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover-pop hover-press"
                  style={{ background: activo ? 'var(--color-brand)' : 'var(--bg-input)' }}
                >
                  <Icono size={20} className={activo ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-secondary)]'} />
                  <span className={`text-[9px] truncate w-full text-center ${activo ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-secondary)]'}`}>{nombre}</span>
                </button>
              )
            })}
            {resultados.length === 0 && (
              <p className="col-span-full text-xs text-[var(--text-secondary)] py-6 text-center">Sin resultados para &ldquo;{busqueda}&rdquo;.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
