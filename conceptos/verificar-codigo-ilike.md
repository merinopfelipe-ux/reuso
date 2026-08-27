---
tags: [supabase, verificacion, patrones]
aliases: [busqueda-codigo-rco2]
fecha: 2026-04-17
---

# Búsqueda de código verificable de Pasaportes Digitales con ilike

## El problema
El campo `codigo_verificacion` o `codigo_dpp` en la tabla de activos (`dpp_activos` / `informes`) almacena el identificador único. El display que ve el usuario es un código normalizado (ej. `DPP-ABCD-1234` o `RCO2-ABCD-1234`). Si el usuario ingresa ese formato en el buscador público, `.eq('codigo_verificacion', 'DPP-ABCD-1234')` debe normalizarse para buscar con precisión.

## La solución
Detectar el formato y usar `.ilike()` con los caracteres extraídos:

```typescript
function normalizarCodigo(raw: string): { exact: string; prefix: string | null } {
  const upper = raw.trim().toUpperCase()
  const match = upper.match(/^(?:DPP|RCO2)-([A-Z0-9]{4})-([A-Z0-9]{4})$/)
  if (match) {
    return { exact: raw.trim(), prefix: (match[1] + match[2]).toLowerCase() }
  }
  return { exact: raw.trim(), prefix: null }
}

// En la query:
const { data, error } = prefix
  ? await query.ilike('codigo_verificacion', `${prefix}%`).limit(1).single()
  : await query.eq('codigo_verificacion', exact).single()
```

## Consideraciones
- `.ilike` es case-insensitive, por eso `prefix` se convierte a minúsculas y funciona de forma óptima.
- El riesgo de falso positivo es mínimo al trabajar con prefijos de alta entropía.
- Si hubiera colisión, `.limit(1)` devuelve el primero; garantizando respuesta ágil en la vista de `/verificar/[codigo]`.

## Relacionado
- [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP)]]
- [[conceptos/multi-tenant-rls-aislamiento|Multi-Tenant y Aislamiento RLS]]
- [[conceptos/supabase-upsert-onconflict|Upsert con OnConflict en Supabase]]
- [[conceptos/jsonb-filter-supabase|Filtros JSONB en Supabase]]
