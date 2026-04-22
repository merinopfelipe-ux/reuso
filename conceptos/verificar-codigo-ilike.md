---
tags: [supabase, verificacion, patrones]
aliases: [busqueda-codigo-rco2]
fecha: 2026-04-17
---

# Búsqueda de código verificable RCO2-XXXX-YYYY con ilike

## El problema
El campo `codigo_verificacion` en la tabla `certificados` almacena el UUID completo (ej: `abcd1234ef56...`). El display que ve el usuario es `RCO2-ABCD-1234` (primeros 8 chars del UUID, divididos 4-4). Si el usuario ingresa ese formato en el buscador, `.eq('codigo_verificacion', 'RCO2-ABCD-1234')` nunca encuentra nada.

## La solución
Detectar el formato y usar `.ilike()` con los 8 chars extraídos:

```typescript
function normalizarCodigo(raw: string): { exact: string; prefix: string | null } {
  const upper = raw.trim().toUpperCase()
  const match = upper.match(/^RCO2-([A-Z0-9]{4})-([A-Z0-9]{4})$/)
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
- `.ilike` es case-insensitive, por eso `prefix` se convierte a minúsculas y funciona con UUIDs.
- El riesgo de falso positivo es mínimo: los primeros 8 chars de un UUID son suficientemente únicos en un volumen de certificados esperado (<100k).
- Si hubiera colisión, `.limit(1)` devuelve el primero; suficiente para el caso de uso.

## Relacionado
- [[supabase-upsert-onconflict]]
- [[jsonb-filter-supabase]]
