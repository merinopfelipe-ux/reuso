---
tags: [concepto, react, tablas, ordenamiento]
aliases: [client-side sort, useSortable]
fecha: 2026-04-06
---

# Ordenamiento client-side de tablas con useSortable

## Explicación

Hook para ordenar en memoria los registros de la página actual de una tabla, sin llamadas al servidor.

Ciclo de sort: `null → asc → desc → null`. El hook retorna `{ sorted, sort, toggleSort }`.

## Implementación

```typescript
// src/lib/use-sortable.ts
import { useState, useMemo } from 'react'

export type SortState = { col: string | null; dir: 'asc' | 'desc' | null }

export function useSortable<T extends Record<string, unknown>>(data: T[]) {
  const [sort, setSort] = useState<SortState>({ col: null, dir: null })

  function toggleSort(col: string) {
    setSort(prev => {
      if (prev.col !== col) return { col, dir: 'asc' }
      if (prev.dir === 'asc') return { col, dir: 'desc' }
      return { col: null, dir: null }
    })
  }

  const sorted = useMemo(() => {
    if (!sort.col || !sort.dir) return data
    return [...data].sort((a, b) => {
      const va = a[sort.col!]
      const vb = b[sort.col!]
      // Detectar fechas ISO
      if (typeof va === 'string' && /^\d{4}-\d{2}/.test(va)) {
        return sort.dir === 'asc'
          ? new Date(va).getTime() - new Date(vb as string).getTime()
          : new Date(vb as string).getTime() - new Date(va).getTime()
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return sort.dir === 'asc' ? va - vb : vb - va
      }
      return sort.dir === 'asc'
        ? String(va ?? '').localeCompare(String(vb ?? ''), 'es')
        : String(vb ?? '').localeCompare(String(va ?? ''), 'es')
    })
  }, [data, sort])

  return { sorted, sort, toggleSort }
}
```

## Limitación importante

Ordena **solo los registros de la página actual**. Si la tabla tiene paginación server-side con 20 registros por página, el sort opera sobre esos 20, no sobre los 500 totales en BD.

Para ordenamiento global usar `ORDER BY` en la query de Supabase y URL params.

## Ejemplo práctico

```tsx
const { sorted, sort, toggleSort } = useSortable(usuarios as Record<string, unknown>[])
// En thead:
<SortTh col="nombre" sort={sort} onToggle={toggleSort}>Nombre</SortTh>
// En tbody:
{(sorted as PerfilRow[]).map(u => <tr key={u.id}>...)}
```

## Wikilinks

- [[n-plus-one-supabase]] — cuando la solución es mover el trabajo al servidor
