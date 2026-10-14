'use client'

import Link from 'next/link'
import { EllipsisVertical } from '@/components/ui/icons'
import { Popover } from '@/components/ui/popover'

// Menú ⋮ de la última columna de una fila. Reemplaza el icono suelto de
// "abrir en nueva página": esa acción y las demás de la fila viven aquí.
export interface AccionFila {
  label: string
  icono?: React.ReactNode
  onClick?: () => void
  href?: string
  peligro?: boolean
}

export function MenuFila({ acciones, label = 'Acciones de la fila' }: { acciones: AccionFila[]; label?: string }) {
  if (acciones.length === 0) return null
  return (
    <Popover
      ancho={220}
      trigger={(abrir) => (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); abrir() }}
          aria-label={label}
          title={label}
          className="flex items-center justify-center p-1.5 rounded-lg text-(--text-secondary) hover:bg-(--bg-hover) transition-colors"
        >
          <EllipsisVertical size={16} sinAnimacion />
        </button>
      )}
    >
      {cerrar => (
        <ul className="flex flex-col gap-0.5 m-0 p-0 list-none" onClick={e => e.stopPropagation()}>
          {acciones.map(a => {
            const clase = `flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-(--bg-hover) ${a.peligro ? 'text-error' : 'text-(--text-primary)'}`
            if (a.href) {
              return (
                <li key={a.label}>
                  <Link href={a.href} target="_blank" rel="noopener noreferrer" className={clase} onClick={cerrar}>
                    {a.icono}{a.label}
                  </Link>
                </li>
              )
            }
            return (
              <li key={a.label}>
                <button type="button" className={clase} onClick={() => { cerrar(); a.onClick?.() }}>
                  {a.icono}{a.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Popover>
  )
}
