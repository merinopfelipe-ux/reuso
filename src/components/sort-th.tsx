'use client'

import { ArrowUp, ArrowDown, ArrowUpDown as CaretUpDown } from '@/components/ui/icons'
import type { SortState } from '@/lib/use-sortable'

interface SortThProps {
  col: string
  sort: SortState
  onToggle: (col: string) => void
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  style?: React.CSSProperties
}

// Encabezado ordenable canónico de toda la plataforma — patrón por defecto,
// directriz explícita del usuario 2026-08-17: el ícono de orden NO se ve en
// reposo, solo aparece al pasar el cursor sobre esa columna (o si esa
// columna es la que ya está ordenando activamente, para no perder la
// referencia de cuál es). Usa `group`/`group-hover` de Tailwind, no JS.
// Flecha recta (Arrow), no chevron — pedido explícito del usuario.
export function SortTh({ col, sort, onToggle, children, align = 'left', style }: SortThProps) {
  const active = sort.col === col
  const Icon = active
    ? sort.dir === 'asc' ? ArrowUp : ArrowDown
    : CaretUpDown

  const textAlign = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left'
  const justify = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'

  return (
    <th
      onClick={() => onToggle(col)}
      className="group hover:bg-[var(--table-orden-hover)]"
      style={{
        padding: '10px 16px',
        textAlign,
        fontWeight: 700,
        color: 'var(--color-brand)',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        // Columna activa: gris muy tenue permanente (mismo token que la
        // tabla de cotizaciones), no depende de hover.
        background: active ? 'var(--table-orden-activo)' : undefined,
        ...style,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: justify, gap: 4, width: align !== 'left' ? '100%' : undefined }}>
        {children}
        <Icon
          size={13}
          className={active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}
          style={{ flexShrink: 0 }}
          sinAnimacion
        />
      </span>
    </th>
  )
}
