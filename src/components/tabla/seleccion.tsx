'use client'

import { Square, SquareCheck } from '@/components/ui/icons'

// Casilla de la primera columna de cualquier tabla con acciones en grupo.
// Cabecera: marca o desmarca todas las filas de la página actual.
// Filas: marca o desmarca esa fila. Mismo look en todas las tablas.

export function CasillaCabecera({ todas, algunas, onToggle, label = 'Seleccionar todas en esta página' }: {
  todas: boolean
  algunas: boolean
  onToggle: () => void
  label?: string
}) {
  const marcada = todas || algunas
  return (
    <th className="px-1.5 xl:px-4 py-2.5 w-10" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={onToggle} aria-label={label} title={label} className="flex">
        {marcada
          ? <SquareCheck size={20} className="text-brand" sinAnimacion />
          : <Square size={20} className="text-(--text-placeholder)" sinAnimacion />}
      </button>
    </th>
  )
}

export function CasillaFila({ marcada, onToggle, label = 'Seleccionar fila' }: {
  marcada: boolean
  onToggle: () => void
  label?: string
}) {
  return (
    <td className="px-1.5 xl:px-4 py-3" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={onToggle} aria-label={label} title={label} aria-pressed={marcada} className="flex">
        {marcada
          ? <SquareCheck size={20} className="text-brand" sinAnimacion />
          : <Square size={20} className="text-(--text-placeholder)" sinAnimacion />}
      </button>
    </td>
  )
}

// Barra de acción masiva: aparece solo con selección activa. Recibe las
// acciones que esa tabla permite (exportar, editar en bloque, borrar).
export function BarraSeleccion({ cantidad, singular, plural, femenino = true, children }: {
  cantidad: number
  singular: string
  plural: string
  femenino?: boolean
  children: React.ReactNode
}) {
  if (cantidad === 0) return null
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 rounded-btn border bg-brand-light px-4 py-2.5 mb-3">
      <span className="text-sm font-semibold text-brand">
        {cantidad} {cantidad === 1 ? singular : plural} {femenino ? 'seleccionada' : 'seleccionado'}{cantidad === 1 ? '' : 's'}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
