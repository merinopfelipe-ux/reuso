---
tags: [modulos, calculadora, supabase, filtro]
fecha: 2026-04-17
---

# Filtro de calculadora por módulos activos de empresa

## Problema
La calculadora debe mostrar solo las categorías cuyos módulos están activos para la empresa del usuario. Sin módulos asignados → EmptyState (no error). `usuario_libre` (sin empresa) → ve todo.

## Lógica

```typescript
// 1. Obtener módulos activos de la empresa
const { data: modEmpresa } = await adminClient
  .from('modulos_empresas')
  .select('modulo_id')
  .eq('empresa_id', empresaId)
  .eq('activo', true)

const moduloIdsActivos = (modEmpresa ?? []).map(m => m.modulo_id)

// 2a. Empresa sin módulos → retornar vacío sin consultar
if (moduloIdsActivos.length === 0) {
  return Promise.resolve({ data: null, error: null })
}

// 2b. Filtrar categorías por módulos
query = query.in('modulo_id', moduloIdsActivos)
```

## Casos

| Caso | `moduloIdsActivos` | Resultado |
|---|---|---|
| `usuario_libre` (sin empresa) | `null` | Sin filtro → todas las categorías |
| Empresa con módulos | `['id1','id2']` | `.in('modulo_id', [...])` |
| Empresa sin módulos asignados | `[]` | Early return → `data: null` → EmptyState |

## Importante
- `modulo_id` debe estar incluido en el `SELECT` de Supabase, o TypeScript falla porque `Categoria.modulo_id` es requerido.
- Las categorías sin `modulo_id = null` **nunca aparecen** para empresas. Es comportamiento diseñado: toda categoría productiva debe tener módulo.

## Relacionado
- [[supabase-upsert-onconflict]]
- [[n-plus-one-supabase]]
