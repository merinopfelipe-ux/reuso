# Mitigación por Ciclos + ACV — Plan de Implementación

> **OBSOLETO PARA EL DPP — NO EJECUTAR (2026-09-13).** Las funciones puras (`calcularMitigacionPorCiclos`/`calcularAnalisisCicloVida` en `lca.ts`) sí se construyeron (commit `f03ddac`), pero el mismo día se retiró toda su conexión con el DPP (commit `29407cc`): quedaron fuera del catálogo final de 9 cálculos, decisión confirmada de nuevo con el usuario. No se retoma este plan para la demo del 21 de septiembre.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calcular la huella de manufactura original de un activo DPP **una sola vez** (en vez de volver a contarla en cada ciclo, como hace hoy el código) y exponer dos funciones puras nuevas — Mitigación acumulada por ciclos y Análisis de Ciclo de Vida (ACV) — siguiendo la metodología LCA "intermedia" ya aprobada por el usuario (ver `conceptos/normativa-europea-dpp-y-reclamos-ambientales.md` sección 4 y `conceptos/diseno-dpp-cotizador-calculadora-2026-09-12.md` sección 4 del Vault del proyecto).

**Architecture:** Nueva columna `dpp_activos.co2_manufactura_kg`, calculada una única vez al crear el activo a partir de `composicion_json` (mismo dato que ya existe hoy). El endpoint de ciclos deja de recalcular esa huella en cada ciclo (bug real encontrado: hoy la duplica en cada uno). Dos funciones puras nuevas en `src/lib/calculos/lca.ts` combinan esa huella congelada con el CO2 de transporte de cada ciclo (`dpp_ciclos.co2_ciclo_kg`, ya existe) para dar el total acumulado (#6) y el desglose por etapa (#10, ACV).

**Tech Stack:** TypeScript puro (sin dependencias nuevas), Vitest (mismo patrón que `financiero.test.ts`), Supabase/Postgres para la migración.

---

### Task 1: Migración — columna `co2_manufactura_kg` en `dpp_activos`

**Files:**
- Create: `sql/130_dpp_activos_manufactura_snapshot.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Huella de manufactura original del activo, calculada UNA SOLA VEZ al crear
-- el DPP (nunca se recalcula después) — es la pieza que faltaba para que
-- "Mitigación por ciclos" (cálculo #6) no cuente la manufactura evitada en
-- cada ciclo, solo en el primero. Metodología aprobada por el usuario
-- 2026-09-05, ver conceptos/normativa-europea-dpp-y-reclamos-ambientales.md
-- sección 4 del Vault del proyecto.
ALTER TABLE dpp_activos
  ADD COLUMN IF NOT EXISTS co2_manufactura_kg numeric(12,4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN dpp_activos.co2_manufactura_kg IS
  'CO2 evitado por no fabricar el activo desde material virgen, calculado una sola vez a partir de composicion_json al crear el activo. Nunca se recalcula en ciclos posteriores.';
```

- [ ] **Step 2: Avisar al usuario que la corra**

Esta migración la corre el usuario a mano en el SQL Editor de Supabase (staging primero, luego producción) — nunca se ejecuta desde código. Verificar con un script antes de continuar con el Task 3:

```bash
node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { error } = await supabase.from('dpp_activos').select('co2_manufactura_kg').limit(1);
  console.log(error ? 'FALTA CORRER LA MIGRACIÓN: ' + error.message : 'OK, columna existe');
})();
"
```

Expected tras confirmar con el usuario que la corrió: `OK, columna existe`.

---

### Task 2: Función pura — huella de manufactura (Task previo a Mitigación/ACV)

**Files:**
- Create: `src/lib/calculos/lca.ts`
- Test: `src/lib/calculos/lca.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, it, expect } from 'vitest'
import { calcularHuellaManufactura } from './lca'

describe('calcularHuellaManufactura', () => {
  it('suma peso_kg * factor_co2_kg de cada material', () => {
    const composicion = [
      { peso_kg: 10, factor_co2_kg: 2.5 },
      { peso_kg: 5, factor_co2_kg: 1.2 },
    ]
    expect(calcularHuellaManufactura(composicion)).toBe(31)
  })

  it('devuelve 0 con una lista vacía', () => {
    expect(calcularHuellaManufactura([])).toBe(0)
  })

  it('ignora materiales sin factor_co2_kg definido', () => {
    const composicion = [
      { peso_kg: 10, factor_co2_kg: 2 },
      { peso_kg: 5 } as { peso_kg: number; factor_co2_kg?: number },
    ]
    expect(calcularHuellaManufactura(composicion)).toBe(20)
  })

  it('redondea a 4 decimales, igual que el resto del sistema (co2.ts)', () => {
    const composicion = [{ peso_kg: 1, factor_co2_kg: 1 / 3 }]
    expect(calcularHuellaManufactura(composicion)).toBe(0.3333)
  })
})
```

- [ ] **Step 2: Correr el test para confirmar que falla**

Run: `npx vitest run src/lib/calculos/lca.test.ts`
Expected: FAIL — `Cannot find module './lca'` o `calcularHuellaManufactura is not a function`.

- [ ] **Step 3: Implementación mínima**

```typescript
// src/lib/calculos/lca.ts
//
// Metodología LCA "intermedia" aprobada por el usuario 2026-09-05 (ver
// conceptos/normativa-europea-dpp-y-reclamos-ambientales.md sección 4 del
// Vault del proyecto): asignación por peso (kg), reportado por ciclo de
// vida del activo, con la huella de manufactura original contada UNA SOLA
// VEZ en el primer ciclo. Nunca comunicar esto como "LCA certificado" ni
// "ISO 14067 certificado" — es una estimación estructurada siguiendo esos
// principios, regla de Objetividad de CLAUDE.md.

export interface MaterialComposicion {
  peso_kg: number
  factor_co2_kg?: number
}

/**
 * CO2 evitado por fabricar el activo con material reusado en vez de
 * virgen — se calcula UNA SOLA VEZ al crear el DPP (Task 3), nunca en
 * ciclos posteriores.
 */
export function calcularHuellaManufactura(composicion: MaterialComposicion[]): number {
  const total = composicion.reduce(
    (sum, m) => sum + m.peso_kg * (m.factor_co2_kg ?? 0),
    0
  )
  return Math.round(total * 10000) / 10000
}
```

- [ ] **Step 4: Correr el test para confirmar que pasa**

Run: `npx vitest run src/lib/calculos/lca.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculos/lca.ts src/lib/calculos/lca.test.ts
git commit -m "feat: calcularHuellaManufactura, base para Mitigación por ciclos y ACV"
```

---

### Task 3: Función pura — Mitigación acumulada por ciclos (cálculo #6)

**Files:**
- Modify: `src/lib/calculos/lca.ts`
- Test: `src/lib/calculos/lca.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { calcularMitigacionPorCiclos } from './lca'

describe('calcularMitigacionPorCiclos', () => {
  it('suma el transporte de todos los ciclos + la manufactura UNA sola vez', () => {
    const resultado = calcularMitigacionPorCiclos(50, [
      { co2_ciclo_kg: 3 },
      { co2_ciclo_kg: 2 },
      { co2_ciclo_kg: 4 },
    ])
    expect(resultado.co2_mitigado_total_kg).toBe(59) // 50 + 3 + 2 + 4
    expect(resultado.desglose.manufactura_kg).toBe(50)
    expect(resultado.desglose.transporte_kg).toBe(9)
  })

  it('sin ciclos, el total es solo la manufactura', () => {
    const resultado = calcularMitigacionPorCiclos(50, [])
    expect(resultado.co2_mitigado_total_kg).toBe(50)
    expect(resultado.desglose.transporte_kg).toBe(0)
  })

  it('con manufactura en 0 (activo sin composicion_json todavía), solo cuenta transporte', () => {
    const resultado = calcularMitigacionPorCiclos(0, [{ co2_ciclo_kg: 5 }])
    expect(resultado.co2_mitigado_total_kg).toBe(5)
  })
})
```

- [ ] **Step 2: Correr el test para confirmar que falla**

Run: `npx vitest run src/lib/calculos/lca.test.ts`
Expected: FAIL — `calcularMitigacionPorCiclos is not a function`.

- [ ] **Step 3: Implementación mínima**

Agregar al final de `src/lib/calculos/lca.ts`:

```typescript
export interface CicloParaMitigacion {
  co2_ciclo_kg: number
}

export interface ResultadoMitigacion {
  co2_mitigado_total_kg: number
  desglose: {
    manufactura_kg: number
    transporte_kg: number
  }
}

/**
 * Cálculo #6 del catálogo: Mitigación acumulada por ciclos de vida.
 * La manufactura ya viene congelada (Task 2, dpp_activos.co2_manufactura_kg)
 * — aquí solo se suma UNA vez, nunca por ciclo. El transporte sí se suma
 * por cada ciclo real registrado.
 */
export function calcularMitigacionPorCiclos(
  co2ManufacturaKg: number,
  ciclos: CicloParaMitigacion[]
): ResultadoMitigacion {
  const transporte_kg = Math.round(
    ciclos.reduce((sum, c) => sum + c.co2_ciclo_kg, 0) * 10000
  ) / 10000
  const co2_mitigado_total_kg = Math.round((co2ManufacturaKg + transporte_kg) * 10000) / 10000
  return {
    co2_mitigado_total_kg,
    desglose: { manufactura_kg: co2ManufacturaKg, transporte_kg },
  }
}
```

- [ ] **Step 4: Correr el test para confirmar que pasa**

Run: `npx vitest run src/lib/calculos/lca.test.ts`
Expected: PASS — 7 tests en total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculos/lca.ts src/lib/calculos/lca.test.ts
git commit -m "feat: calcularMitigacionPorCiclos (calculo #6 del catalogo)"
```

---

### Task 4: Función pura — Análisis de Ciclo de Vida / ACV (cálculo #10)

**Files:**
- Modify: `src/lib/calculos/lca.ts`
- Test: `src/lib/calculos/lca.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { calcularAnalisisCicloVida } from './lca'

describe('calcularAnalisisCicloVida', () => {
  it('desglosa el total por etapa, con porcentajes que suman 100', () => {
    const resultado = calcularAnalisisCicloVida(80, [
      { co2_ciclo_kg: 15 },
      { co2_ciclo_kg: 5 },
    ])
    expect(resultado.manufactura_kg).toBe(80)
    expect(resultado.transporte_kg).toBe(20)
    expect(resultado.total_kg).toBe(100)
    expect(resultado.manufactura_pct).toBe(80)
    expect(resultado.transporte_pct).toBe(20)
  })

  it('con total en 0, los porcentajes son 0 (nunca NaN ni división por cero)', () => {
    const resultado = calcularAnalisisCicloVida(0, [])
    expect(resultado.total_kg).toBe(0)
    expect(resultado.manufactura_pct).toBe(0)
    expect(resultado.transporte_pct).toBe(0)
  })
})
```

- [ ] **Step 2: Correr el test para confirmar que falla**

Run: `npx vitest run src/lib/calculos/lca.test.ts`
Expected: FAIL — `calcularAnalisisCicloVida is not a function`.

- [ ] **Step 3: Implementación mínima**

Agregar al final de `src/lib/calculos/lca.ts`:

```typescript
export interface ResultadoACV {
  manufactura_kg: number
  transporte_kg: number
  total_kg: number
  manufactura_pct: number
  transporte_pct: number
}

/**
 * Cálculo #10 del catálogo: Análisis de Ciclo de Vida (ACV). No es un
 * número único — es el desglose de dónde viene el impacto acumulado, por
 * etapa. Reusa la misma agregación que calcularMitigacionPorCiclos (Task 3)
 * en vez de recalcular la suma dos veces.
 */
export function calcularAnalisisCicloVida(
  co2ManufacturaKg: number,
  ciclos: CicloParaMitigacion[]
): ResultadoACV {
  const { co2_mitigado_total_kg: total_kg, desglose } = calcularMitigacionPorCiclos(co2ManufacturaKg, ciclos)
  const manufactura_pct = total_kg > 0 ? Math.round((desglose.manufactura_kg / total_kg) * 10000) / 100 : 0
  const transporte_pct = total_kg > 0 ? Math.round((desglose.transporte_kg / total_kg) * 10000) / 100 : 0
  return {
    manufactura_kg: desglose.manufactura_kg,
    transporte_kg: desglose.transporte_kg,
    total_kg,
    manufactura_pct,
    transporte_pct,
  }
}
```

- [ ] **Step 4: Correr el test para confirmar que pasa**

Run: `npx vitest run src/lib/calculos/lca.test.ts`
Expected: PASS — 9 tests en total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculos/lca.ts src/lib/calculos/lca.test.ts
git commit -m "feat: calcularAnalisisCicloVida (calculo #10 del catalogo, ACV)"
```

---

### Task 5: Calcular la manufactura UNA vez al crear el activo

**Files:**
- Modify: `src/app/api/dpp/activos/crear/route.ts:129-146`

- [ ] **Step 1: Importar la función nueva**

En la parte de arriba de `src/app/api/dpp/activos/crear/route.ts`, junto a los demás imports:

```typescript
import { calcularHuellaManufactura } from '@/lib/calculos/lca'
```

- [ ] **Step 2: Calcular antes del insert y guardarlo**

Reemplazar el bloque del insert (líneas 129-146 de hoy) por:

```typescript
  const co2_manufactura_kg = calcularHuellaManufactura(composicion_json ?? [])

  const { data: activo, error: insertError } = await adminClient
    .from('dpp_activos')
    .insert({
      empresa_id: targetEmpresaId,
      user_id: profileResult.data?.id,
      codigo_dpp,
      nombre,
      descripcion: descripcion ?? null,
      categoria_id: categoria_id ?? null,
      peso_total_kg: peso_total_kg ?? null,
      composicion_json: composicion_json ?? null,
      co2_manufactura_kg,
      cliente_id: cliente_id ?? null,
      imagen_url: imagen_url ?? null,
      hash_integridad,
      hash_previo,
    })
    .select()
    .single()

  if (insertError || !activo) {
    return NextResponse.json({ error: 'Error al guardar el activo. Intenta de nuevo.' }, { status: 500 })
  }
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a este archivo.

- [ ] **Step 4: Probar en vivo contra la base real (requiere que el Task 1 ya esté corrido por el usuario)**

```bash
node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('dpp_activos').insert({
    empresa_id: null, // usar un empresa_id real de prueba si la tabla lo exige NOT NULL
    codigo_dpp: 'DPP-TEST-PLAN1-' + Date.now(),
    nombre: 'Prueba plan LCA',
    composicion_json: [{ material: 'madera', peso_kg: 10, factor_co2_kg: 2 }],
    co2_manufactura_kg: 20,
    hash_integridad: 'test',
    hash_previo: 'GENESIS_DPP',
  }).select();
  console.log(error ? 'ERROR: ' + error.message : 'OK: ' + JSON.stringify(data));
  if (data) await supabase.from('dpp_activos').delete().eq('id', data[0].id);
})();
"
```

Expected: `OK: ...` con `co2_manufactura_kg: 20`. Borrar el registro de prueba al final (el script ya lo hace).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/dpp/activos/crear/route.ts"
git commit -m "feat: calcula la huella de manufactura una sola vez al crear el DPP"
```

---

### Task 6: Dejar de duplicar la manufactura en cada ciclo (bug real corregido)

**Files:**
- Modify: `src/app/api/dpp/activos/[id]/ciclo/route.ts:76-80`

- [ ] **Step 1: Confirmar el bug actual**

Hoy (líneas 76-80 de `ciclo/route.ts`), CADA ciclo vuelve a sumar `composicion_json` completo para calcular `co2_evitado_kg` — eso cuenta la manufactura evitada N veces para un activo con N ciclos, en vez de UNA sola vez (metodología aprobada, Task 3). Este código se retira:

```typescript
  // CO2 evitado = lo que se habría emitido fabricando el activo desde cero
  const composicion = Array.isArray(activo.composicion_json) ? activo.composicion_json as { peso_kg: number; factor_co2_kg: number }[] : []
  const co2_evitado_kg = Math.round(
    composicion.reduce((sum, m) => sum + (m.peso_kg ?? 0) * (m.factor_co2_kg ?? 0), 0) * 10000
  ) / 10000
```

- [ ] **Step 2: Reemplazarlo**

```typescript
  // co2_evitado_kg por ciclo se retira del cálculo (bug real corregido,
  // 2026-09-12): antes recontaba la manufactura completa en CADA ciclo.
  // Esa huella ahora se congela una sola vez en dpp_activos.co2_manufactura_kg
  // (calculada al crear el activo) y se combina con el transporte de todos
  // los ciclos vía calcularMitigacionPorCiclos/calcularAnalisisCicloVida —
  // nunca se vuelve a sumar aquí. La columna dpp_ciclos.co2_evitado_kg queda
  // en 0 para ciclos nuevos (no se borra la columna, regla expandir-contraer).
  const co2_evitado_kg = 0
```

- [ ] **Step 3: Actualizar la selección del activo (ya no hace falta leer `composicion_json` aquí)**

En la línea 41 de `ciclo/route.ts`, cambiar:

```typescript
    .select('id, empresa_id, n_ciclos, peso_total_kg, composicion_json')
```

por:

```typescript
    .select('id, empresa_id, n_ciclos, peso_total_kg')
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/api/dpp/activos/[id]/ciclo/route.ts"`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/dpp/activos/[id]/ciclo/route.ts"
git commit -m "fix: la manufactura evitada ya no se recuenta en cada ciclo del DPP"
```

---

## Fuera de alcance de este plan

- UI que muestre "Mitigación por ciclos" o "ACV" en `/empresa/dpp/[id]` — eso es tarea del Plan #2 (DPP directo con IA) o de un plan de UI aparte, aquí solo se construyen las funciones y el dato base.
- MCI (cálculo #15) — plan separado, metodología distinta (Ellen MacArthur).
- Cualquier cambio al flujo de creación de DPP más allá de agregar el cálculo de `co2_manufactura_kg` — el resto del formulario de `/empresa/dpp/nuevo` es el Plan #2.
