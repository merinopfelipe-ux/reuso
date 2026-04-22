---
tags: [supabase, postgresql, performance, queries, n+1]
aliases: [N+1, batch queries, query optimization]
fecha: 2026-04-05
---

# N+1 Queries en Supabase (y cómo evitarlas)

## Explicación

El problema N+1 ocurre cuando se hace **1 query para obtener una lista** y luego **N queries adicionales para enriquecer cada elemento**. Con 20 elementos, son 21 queries; con 100, son 101.

En Supabase/PostgreSQL, cada round-trip tiene latencia de red (~20-100ms). 40 queries paralelas con `Promise.all` son más rápidas que secuenciales, pero siguen siendo 40 conexiones al pool de la BD y pueden degradar el rendimiento.

## Ejemplo práctico (del proyecto)

**MAL — N+1 (2 queries por empresa = 40 queries para 20 empresas):**
```typescript
const empresasConStats = await Promise.all(
  empresas.map(async (emp) => {
    const [{ count: empleados }, { data: co2 }] = await Promise.all([
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('empresa_id', emp.id),
      adminClient.from('calculos').select('total_co2').eq('empresa_id', emp.id),
    ])
    return { ...emp, total_empleados: empleados, total_co2: suma(co2) }
  })
)
```

**BIEN — Batch (2 queries totales, join en memoria):**
```typescript
const ids = empresas.map(e => e.id)

// Solo 2 queries, sin importar cuántas empresas haya en la página
const [perfilesRes, calculosRes] = await Promise.all([
  adminClient.from('profiles').select('empresa_id').in('empresa_id', ids),
  adminClient.from('calculos').select('empresa_id, total_co2').in('empresa_id', ids),
])

// Agregar en memoria con Maps (O(n), muy rápido)
const empleadosMap: Record<string, number> = {}
const co2Map: Record<string, number> = {}

for (const p of perfilesRes.data ?? []) {
  if (p.empresa_id) empleadosMap[p.empresa_id] = (empleadosMap[p.empresa_id] ?? 0) + 1
}
for (const c of calculosRes.data ?? []) {
  if (c.empresa_id) co2Map[c.empresa_id] = (co2Map[c.empresa_id] ?? 0) + (c.total_co2 ?? 0)
}

const empresasConStats = empresas.map(emp => ({
  ...emp,
  total_empleados: empleadosMap[emp.id] ?? 0,
  total_co2: co2Map[emp.id] ?? 0,
}))
```

## Cuándo usar cada enfoque

| Situación | Solución |
|-----------|----------|
| 1-3 entidades | N+1 está bien |
| 4-20 entidades con `Promise.all` | Batch queries |
| Necesitas agregación (SUM, COUNT) | Batch + join en memoria, o RPC SQL |
| Columnas calculadas complejas | Considerar vista en PostgreSQL |

## Alternativa SQL (para casos más complejos)

Para casos donde el join en memoria no es suficiente, usar una función RPC en Supabase:
```sql
-- En Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_empresa_stats(empresa_ids UUID[])
RETURNS TABLE(empresa_id UUID, total_empleados BIGINT, total_co2 NUMERIC) AS $$
  SELECT e.id, COUNT(p.id), COALESCE(SUM(c.total_co2), 0)
  FROM unnest(empresa_ids) AS e(id)
  LEFT JOIN profiles p ON p.empresa_id = e.id
  LEFT JOIN calculos c ON c.empresa_id = e.id
  GROUP BY e.id
$$ LANGUAGE sql;
```

```typescript
const { data } = await adminClient.rpc('get_empresa_stats', { empresa_ids: ids })
```

## Wikilinks relacionados
- [[useSearchParams-suspense-nextjs]] — otro bug de performance/rendering del mismo proyecto
- [[jsonb-filter-supabase]] — filtrar dentro de columnas JSON en Supabase
- [[STATE]] — estado actual del proyecto
