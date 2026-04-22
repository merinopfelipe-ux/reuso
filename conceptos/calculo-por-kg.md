---
tags: [calculadora, co2, factores, kg, inmutabilidad, calculo-ambiental]
fecha: 2026-04-14
aliases: [factor-co2-kg, peso-kg-calculadora, calculo-ambiental-kg]
---

# Cálculo de impacto ambiental por peso en kg

## Por qué kg y no unidades

La calculadora de Reúso mide el impacto por **peso en kg del material reutilizado**, no por cantidad de unidades. Una camiseta de 100g y una de 500g no tienen el mismo impacto aunque ambas sean "1 prenda". El peso es la unidad universal que permite comparar categorías distintas (textil, muebles, madera, electrónico).

## El modelo de datos

La tabla `items` en BD tiene dos campos clave:
- `co2_por_unidad`: CO₂ evitado si se reutiliza UNA unidad del item (en kg CO₂)
- `peso_kg`: peso de UNA unidad del item (en kg)

## El factor CO₂/kg

```typescript
// src/lib/calculos/co2.ts
export function factorCo2PorKg(co2_por_unidad: number, peso_kg_unidad: number): number {
  if (peso_kg_unidad <= 0) return 0
  return co2_por_unidad / peso_kg_unidad
}
```

El factor CO₂/kg es el "precio ambiental" de ese material: cuántos kg de CO₂ se evitan por cada kg de ese material reutilizado.

## El cálculo

```typescript
// Para un item donde el usuario ingresó N kg:
const factor = factorCo2PorKg(item.co2_por_unidad, item.peso_kg)
const co2_item = peso_input_kg * factor

// Total de todos los items:
const co2_total = items.reduce((s, i) => s + i.peso_kg_input * factorCo2PorKg(i.co2_por_unidad, i.peso_kg_unidad), 0)
```

## Flujo completo en la UI

1. Usuario selecciona categoría (tab)
2. Para cada item visible: ingresa el peso en kg (input decimal, ej: `2.5`)
3. Totales se actualizan en tiempo real con animación
4. Al guardar: API recibe `{ items: [{id, peso_kg}], descripcion_html }`

## factor_snapshot_json — inmutabilidad

Al guardar un cálculo, la API construye un snapshot de los factores del momento:

```json
{
  "items": {
    "<item_id>": {
      "co2_por_unidad": 3.5,
      "peso_kg_unidad": 0.5,
      "co2_por_kg": 7.0,
      "nivel_confianza": "alta",
      "origen_fuente": "ecoinvent v3.9"
    }
  },
  "version_factores": "2026-04-14",
  "metodologia": "ACV simplificado, factores europeos ecoinvent/ELCD — input en kg"
}
```

Si el super_admin edita los factores después, los cálculos pasados no se ven afectados. Ver [[calculo-ambiental]] para el concepto original.

## Dónde está implementado

- `src/lib/calculos/co2.ts` — función `factorCo2PorKg` + `calcularImpacto` (usa `peso_kg_input`)
- `src/components/calculadora/calculadora.tsx` — estado `pesos`, input step=0.1
- `src/app/api/calcular/route.ts` — schema Zod `peso_kg`, construcción de snapshot

## Ver también

- [[calculo-ambiental]] — concepto original de factores e inmutabilidad
- [[contenteditable-paste-imagenes]] — campo descripción del mismo cálculo
- [[supabase-upsert-onconflict]] — patrón de inserción segura
