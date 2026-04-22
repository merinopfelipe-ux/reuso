'use client'

import { useState, useMemo } from 'react'

export type SortDir = 'asc' | 'desc' | null

export interface SortState {
  col: string | null
  dir: SortDir
}

export function useSortable<T extends Record<string, unknown>>(data: T[]) {
  const [sort, setSort] = useState<SortState>({ col: null, dir: null })

  function toggleSort(col: string) {
    setSort((prev) => {
      if (prev.col !== col) return { col, dir: 'asc' }
      if (prev.dir === 'asc') return { col, dir: 'desc' }
      return { col: null, dir: null }
    })
  }

  const sorted = useMemo(() => {
    if (!sort.col || !sort.dir) return data
    const key = sort.col
    return [...data].sort((a, b) => {
      const va = a[key]
      const vb = b[key]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1

      // Fechas ISO
      if (typeof va === 'string' && /^\d{4}-\d{2}-\d{2}/.test(va)) {
        const diff = new Date(va).getTime() - new Date(vb as string).getTime()
        return sort.dir === 'asc' ? diff : -diff
      }

      // Números
      if (typeof va === 'number' && typeof vb === 'number') {
        return sort.dir === 'asc' ? va - vb : vb - va
      }

      // Texto
      const sa = String(va).toLowerCase()
      const sb = String(vb as string).toLowerCase()
      const cmp = sa.localeCompare(sb, 'es')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  return { sorted, sort, toggleSort }
}
