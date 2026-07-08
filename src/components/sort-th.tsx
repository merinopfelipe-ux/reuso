'use client'

import {
  ChevronUp as CaretUp,
  ChevronDown as CaretDown,
  ChevronsUpDown as CaretUpDown,
} from 'lucide-react'
import type { SortState } from '@/lib/use-sortable'

interface SortThProps {
  col: string
  sort: SortState
  onToggle: (col: string) => void
  children: React.ReactNode
  style?: React.CSSProperties
}

export function SortTh({ col, sort, onToggle, children, style }: SortThProps) {
  const active = sort.col === col
  const Icon = active
    ? sort.dir === 'asc' ? CaretUp : CaretDown
    : CaretUpDown

  return (
    <th
      onClick={() => onToggle(col)}
      style={{
        padding: '10px 16px',
        textAlign: 'left',
        fontWeight: 600,
        color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        ...style,
      }}
      className="hover-pop"
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        <Icon
          size={13}
          style={{ opacity: active ? 1 : 0.4, flexShrink: 0 }}
        />
      </span>
    </th>
  )
}
