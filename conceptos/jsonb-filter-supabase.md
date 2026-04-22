---
tags: [supabase, postgresql, jsonb, queries, filtros]
aliases: [JSONB filter, detalle_json, json path query]
fecha: 2026-04-05
---

# Filtrar columnas JSONB en Supabase

## Explicación

PostgreSQL permite almacenar datos semiestructurados en columnas de tipo `jsonb`. Supabase expone tres operadores para acceder a campos dentro de un JSONB:

| Operador | Resultado | Ejemplo |
|----------|-----------|---------|
| `->` | JSON (jsonb) | `detalle_json->'campo'` |
| `->>` | Texto (string) | `detalle_json->>'campo'` |
| `#>>` | Texto en ruta anidada | `detalle_json#>>'{a,b}'` |

Para filtrar en la API JS de Supabase, se usa `.filter()` con la ruta de acceso como columna.

## Ejemplo práctico (del proyecto)

**Filtrar logs_auditoria por empresa dentro de detalle_json:**

```typescript
// detalle_json tiene forma: { id: "uuid-empresa", cambios: { plan: "pyme" } }

// MAL — filtra en memoria (trae todos los logs del sistema)
const todos = await adminClient
  .from('logs_auditoria')
  .select('*')
  .eq('accion', 'actualizar_empresa')

const soloEstaEmpresa = todos.data?.filter(log => log.detalle_json?.id === empresaId)

// BIEN — filtra en BD (PostgreSQL hace el trabajo)
const soloEstaEmpresa = await adminClient
  .from('logs_auditoria')
  .select('*')
  .eq('accion', 'actualizar_empresa')
  .filter('detalle_json->>id', 'eq', empresaId)
```

**Buscar texto dentro de JSONB (búsqueda libre):**

```typescript
// Buscar query en cualquier campo del detalle de cálculos
const { data } = await adminClient
  .from('calculos')
  .select('*')
  .filter('detalle_json::text', 'ilike', `%${busqueda}%`)
// Castea todo el JSON a texto y hace búsqueda parcial
// Útil para búsqueda global; puede ser lento sin índices GIN
```

**Ruta anidada:**
```typescript
// detalle_json = { cambios: { plan: "pyme" } }
.filter('detalle_json->cambios->>plan', 'eq', 'pyme')
```

## Tipos de filtro disponibles

```typescript
// Igualdad
.filter('campo->>subcampo', 'eq', valor)

// Texto parcial
.filter('campo->>subcampo', 'ilike', '%texto%')

// Contiene (solo para jsonb con operador @>)
.filter('campo', 'cs', '{"subcampo": "valor"}')
```

## Índices recomendados

Para búsquedas frecuentes en JSONB, crear índices en Supabase SQL Editor:

```sql
-- Índice GIN para búsqueda general en todo el JSON
CREATE INDEX idx_calculos_detalle ON calculos USING gin(detalle_json);

-- Índice en campo específico extraído
CREATE INDEX idx_logs_empresa_id ON logs_auditoria
  USING btree ((detalle_json->>'id'));
```

Sin índices, `filter('detalle_json::text', 'ilike', ...)` hace full table scan.

## En reuso.lurdes.co

- `detalle_json` en `calculos`: `{ [item_id]: { categoria, nombre, cantidad, co2 } }` — buscado con `::text ilike` en el endpoint de búsqueda global y exportación.
- `detalle_json` en `logs_auditoria`: `{ id: empresaId, cambios: { plan?, activa? } }` — filtrado con `->>id` en el estado de cuenta de empresa.

## Wikilinks relacionados
- [[n-plus-one-supabase]] — otro patrón de optimización de queries
- [[useSearchParams-suspense-nextjs]] — bug de rendering relacionado (misma sesión)
- [[STATE]] — estado actual del proyecto
