# Inferencia de datos (Técnica B y C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development para ejecutar este plan tarea por tarea, sin git worktree (repo trabaja directo sobre `main`).

**Goal:** Reducir cuántas de las 37 variables del catálogo de cálculos requieren entrada manual, usando solo las 2 técnicas más baratas y confiables (sin IA nueva): **C** (lógica pura de fechas/contadores, 0% error) y **B** (fórmulas sobre datos que el catálogo ya tiene).

**Architecture:** Funciones puras nuevas en `src/lib/calculos/` (mismo patrón que `lca.ts`/`dpp-ambiental.ts`), consumidas por los endpoints existentes. Ningún cálculo se auto-guarda sin confirmación humana — todo llega como valor *sugerido*, editable, igual que ya funciona en el DPP-directo.

**Tech Stack:** TypeScript puro + 1 migración SQL (expandir, nunca romper nada existente).

---

## Alcance real (y lo que NO entra en este plan)

**Sí entra** (gratis, sin ambigüedad, verificado contra el código real):
1. `T_previo` — parte "en plataforma" (Técnica C). Suma exacta de fechas de `dpp_ciclos` ya guardados.
2. `peso_residuo_reciclado_kg` — estimado desde `composicion_json` × un nuevo campo `porcentaje_reciclable` (Técnica B).
3. `R_out` — mismo mecanismo que el punto 2, aplicado a toda la composición del activo (no solo el residuo de un ciclo).
4. `m_secundario_kg` / `m_renovable_kg` / `m_total_input_kg` / `q_circular_kg` — derivados de `composicion_json` + `categoria_material` (ya existe en `item_materiales`, confirmado con `sql/114` corrida y datos reales en staging).

**NO entra en este plan** (encontré que no es gratis, necesita una decisión tuya o trabajo más grande primero):
- **`R_in`** — dije antes que se podía calcular sin preguntar nada aparte. Es falso: los insumos de restauración (`Insumo` en `src/lib/cotizador/plantillas-base.ts:11`) solo tienen precio, nunca peso. Sin un campo de peso en los insumos (o una forma de distinguir "material original" vs "material añadido" dentro de `composicion_json`), no hay ningún dato real para calcular "peso conservado / peso total". Queda fuera, documentado como pendiente real en la ficha del Algoritmo CR.
- Técnica A, D, E, F (visión, búsqueda web, catálogo de precios) — otro plan aparte, ya lo hablamos, no se mezclan aquí.

**Decisión que necesito de ti antes de la Tarea 4** (clasificación de categorías): de las 9 categorías reales (`madera`, `metal`, `textil`, `cuero`, `plastico`, `vidrio`, `espuma_relleno`, `carton_papel`, `otros`), ¿cuáles cuentan como **renovable** (`m_renovable_kg`) para el Índice circular? Mi propuesta razonable: `madera`, `textil`, `cuero`, `carton_papel` = renovable (biológico); `metal`, `plastico`, `vidrio`, `espuma_relleno`, `otros` = no renovable. **Todo el material de un objeto reusado cuenta como "secundario" (`m_secundario_kg`) por definición del negocio**, así que `m_secundario_kg = m_total_input_kg` siempre en este contexto — no hay ambigüedad ahí. Si mi propuesta de renovables no es la que tú tienes en mente, dímelo antes de que el subagente ejecute la Tarea 4.

---

## Task 1: `porcentaje_reciclable` en el catálogo de materiales

**Files:**
- Create: `sql/131_item_materiales_porcentaje_reciclable.sql`
- Modify: `src/lib/cotizador/plantillas-base.ts` (tipo `Material`)

- [x] **Step 1: Migración (expandir, nunca romper)**

```sql
-- =====================================================================
-- Migración 131 — % reciclable por material, base para estimar residuo
-- reciclable sin que el taller lo mida a mano cada vez.
-- Calculadora de Reúso | 2026-09-13
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================
ALTER TABLE item_materiales
  ADD COLUMN IF NOT EXISTS porcentaje_reciclable numeric(5,2)
    CHECK (porcentaje_reciclable IS NULL OR (porcentaje_reciclable >= 0 AND porcentaje_reciclable <= 100));

ALTER TABLE categoria_materiales_base
  ADD COLUMN IF NOT EXISTS porcentaje_reciclable numeric(5,2)
    CHECK (porcentaje_reciclable IS NULL OR (porcentaje_reciclable >= 0 AND porcentaje_reciclable <= 100));

-- Backfill best-effort por categoria_material — el super_admin lo revisa
-- después en /admin/categorias, igual que ya se hizo con categoria_material
-- en sql/114 (no es un valor definitivo, es un punto de partida razonable).
UPDATE item_materiales SET porcentaje_reciclable = 90 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'metal';
UPDATE item_materiales SET porcentaje_reciclable = 70 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'vidrio';
UPDATE item_materiales SET porcentaje_reciclable = 60 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'madera';
UPDATE item_materiales SET porcentaje_reciclable = 50 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'carton_papel';
UPDATE item_materiales SET porcentaje_reciclable = 30 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'plastico';
UPDATE item_materiales SET porcentaje_reciclable = 20 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'textil';
UPDATE item_materiales SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'espuma_relleno';
UPDATE item_materiales SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'cuero';
UPDATE item_materiales SET porcentaje_reciclable = 0  WHERE porcentaje_reciclable IS NULL AND (categoria_material = 'otros' OR categoria_material IS NULL);

-- Repetir el mismo bloque de UPDATE para categoria_materiales_base.
UPDATE categoria_materiales_base SET porcentaje_reciclable = 90 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'metal';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 70 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'vidrio';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 60 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'madera';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 50 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'carton_papel';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 30 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'plastico';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 20 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'textil';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'espuma_relleno';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 10 WHERE porcentaje_reciclable IS NULL AND categoria_material = 'cuero';
UPDATE categoria_materiales_base SET porcentaje_reciclable = 0  WHERE porcentaje_reciclable IS NULL AND (categoria_material = 'otros' OR categoria_material IS NULL);
```

Estos números de partida son un supuesto razonable, NO una cifra certificada — se comunican siempre como estimación (Regla de Objetividad) y el super_admin los puede corregir material por material en `/admin/categorias`.

- [x] **Step 2: Agregar el campo al tipo `Material`**

En `src/lib/cotizador/plantillas-base.ts`, dentro de `export interface Material { ... }` (línea 12), agregar:

```typescript
  // % de esa masa que se puede reciclar/recuperar al final de su vida —
  // usado para estimar residuo reciclable y R_out sin que el taller mida
  // cada ciclo a mano. Estimación de catálogo, no una certificación.
  porcentaje_reciclable?: number | null
```

- [x] **Step 3: Commit**

```bash
git add sql/131_item_materiales_porcentaje_reciclable.sql src/lib/cotizador/plantillas-base.ts
git commit -m "feat: porcentaje_reciclable por material, base para estimar reciclabilidad sin medirla a mano"
```

El usuario corre `sql/131` a mano en el SQL Editor de ambas bases — avisar explícitamente cuándo.

---

## Task 2: Función pura de estimación de reciclabilidad (Técnica B)

**Files:**
- Create: `src/lib/calculos/circularidad.ts`
- Create: `src/lib/calculos/circularidad.test.ts`

- [x] **Step 1: Escribir la prueba que falla**

```typescript
import { describe, it, expect } from 'vitest'
import { estimarPorcentajeReciclable, estimarResiduoReciclableKg } from './circularidad'

describe('estimarPorcentajeReciclable', () => {
  it('pondera el % reciclable por el peso de cada material', () => {
    const composicion = [
      { peso_kg: 6, porcentaje_reciclable: 90 },  // metal
      { peso_kg: 4, porcentaje_reciclable: 10 },  // espuma
    ]
    // (6*90 + 4*10) / 10 = 58
    expect(estimarPorcentajeReciclable(composicion)).toBe(58)
  })

  it('devuelve 0 si no hay materiales', () => {
    expect(estimarPorcentajeReciclable([])).toBe(0)
  })

  it('trata porcentaje_reciclable null/undefined como 0', () => {
    const composicion = [{ peso_kg: 10, porcentaje_reciclable: null }]
    expect(estimarPorcentajeReciclable(composicion)).toBe(0)
  })
})

describe('estimarResiduoReciclableKg', () => {
  it('aplica el % ponderado sobre el peso real del residuo', () => {
    const composicion = [
      { peso_kg: 6, porcentaje_reciclable: 90 },
      { peso_kg: 4, porcentaje_reciclable: 10 },
    ]
    // 58% de 20 kg de residuo = 11.6 kg
    expect(estimarResiduoReciclableKg(composicion, 20)).toBe(11.6)
  })
})
```

- [x] **Step 2: Correr y confirmar que falla**

Run: `npx vitest run src/lib/calculos/circularidad.test.ts`
Expected: FAIL — `Cannot find module './circularidad'`

- [x] **Step 3: Implementación mínima**

```typescript
// Técnica B (ver calculos/00-indice.md del Vault): estimaciones que se
// calculan con datos que el catálogo YA tiene, sin ninguna IA nueva —
// siempre un punto de partida editable por el humano, nunca un dato final
// impuesto sin revisión (Directriz 4 del CLAUDE.md).

export interface MaterialReciclable {
  peso_kg: number
  porcentaje_reciclable?: number | null
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** % reciclable ponderado por peso de toda la composición. */
export function estimarPorcentajeReciclable(composicion: MaterialReciclable[]): number {
  const pesoTotal = composicion.reduce((s, m) => s + m.peso_kg, 0)
  if (pesoTotal <= 0) return 0
  const ponderado = composicion.reduce(
    (s, m) => s + m.peso_kg * (m.porcentaje_reciclable ?? 0),
    0
  )
  return r2(ponderado / pesoTotal)
}

/** Aplica ese % ponderado sobre el peso real de residuo de un ciclo. */
export function estimarResiduoReciclableKg(
  composicion: MaterialReciclable[],
  pesoResiduoTotalKg: number
): number {
  const pct = estimarPorcentajeReciclable(composicion)
  return r2(pesoResiduoTotalKg * (pct / 100))
}
```

- [x] **Step 4: Correr y confirmar que pasa**

Run: `npx vitest run src/lib/calculos/circularidad.test.ts`
Expected: PASS, 4/4

- [x] **Step 5: Commit**

```bash
git add src/lib/calculos/circularidad.ts src/lib/calculos/circularidad.test.ts
git commit -m "feat: estimacion de residuo reciclable desde composicion (Tecnica B)"
```

---

## Task 3: `T_previo` real desde los ciclos ya guardados (Técnica C)

**Files:**
- Create: `src/lib/calculos/tiempo-uso.ts`
- Create: `src/lib/calculos/tiempo-uso.test.ts`

- [x] **Step 1: Escribir la prueba que falla**

```typescript
import { describe, it, expect } from 'vitest'
import { calcularTiempoUsoEnPlataformaDias } from './tiempo-uso'

describe('calcularTiempoUsoEnPlataformaDias', () => {
  it('suma la duración de ciclos ya cerrados', () => {
    const ciclos = [
      { fecha_inicio: '2026-01-01', fecha_fin: '2026-01-11' }, // 10 días
      { fecha_inicio: '2026-02-01', fecha_fin: '2026-02-21' }, // 20 días
    ]
    expect(calcularTiempoUsoEnPlataformaDias(ciclos, new Date('2026-03-01'))).toBe(30)
  })

  it('un ciclo sin fecha_fin cuenta hasta la fecha de referencia', () => {
    const ciclos = [{ fecha_inicio: '2026-01-01', fecha_fin: null }]
    expect(calcularTiempoUsoEnPlataformaDias(ciclos, new Date('2026-01-11'))).toBe(10)
  })

  it('devuelve 0 sin ciclos', () => {
    expect(calcularTiempoUsoEnPlataformaDias([], new Date('2026-01-01'))).toBe(0)
  })
})
```

- [x] **Step 2: Correr y confirmar que falla**

Run: `npx vitest run src/lib/calculos/tiempo-uso.test.ts`
Expected: FAIL — módulo no existe.

- [x] **Step 3: Implementación mínima**

```typescript
// Técnica C (ver calculos/00-indice.md del Vault): 0% de error, es solo
// sumar fechas ya guardadas en dpp_ciclos — nunca es una estimación ni
// necesita IA. Cubre SOLO el tiempo de uso dentro de esta plataforma; el
// tiempo anterior a que el activo entrara (Técnica D, estimado por
// desgaste/estilo en la foto) es un dato aparte, más incierto, que se
// suma a este en una capa distinta, no se mezclan en esta función.

export interface CicloConFechas {
  fecha_inicio: string
  fecha_fin: string | null
}

const MS_POR_DIA = 1000 * 60 * 60 * 24

export function calcularTiempoUsoEnPlataformaDias(
  ciclos: CicloConFechas[],
  ahora: Date = new Date()
): number {
  return ciclos.reduce((totalDias, ciclo) => {
    const inicio = new Date(ciclo.fecha_inicio)
    const fin = ciclo.fecha_fin ? new Date(ciclo.fecha_fin) : ahora
    const dias = Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / MS_POR_DIA))
    return totalDias + dias
  }, 0)
}
```

- [x] **Step 4: Correr y confirmar que pasa**

Run: `npx vitest run src/lib/calculos/tiempo-uso.test.ts`
Expected: PASS, 3/3

- [x] **Step 5: Commit**

```bash
git add src/lib/calculos/tiempo-uso.ts src/lib/calculos/tiempo-uso.test.ts
git commit -m "feat: tiempo de uso en plataforma calculado desde fechas de ciclos (Tecnica C, 0% error)"
```

---

## Task 4: Desglose de masa circular (`m_secundario_kg`/`m_renovable_kg`/`m_total_input_kg`/`q_circular_kg`)

**⚠️ Requiere confirmar la clasificación de categorías (ver "Decisión que necesito de ti" al inicio del plan) antes de ejecutar esta tarea.**

**Files:**
- Modify: `src/lib/calculos/circularidad.ts`
- Modify: `src/lib/calculos/circularidad.test.ts`

- [x] **Step 1: Escribir la prueba que falla**

```typescript
import { desglosarMasaCircular, type MaterialConCategoria } from './circularidad'

describe('desglosarMasaCircular', () => {
  it('separa renovable vs no renovable, y todo cuenta como secundario', () => {
    const composicion: MaterialConCategoria[] = [
      { peso_kg: 6, categoria_material: 'madera' },   // renovable
      { peso_kg: 4, categoria_material: 'metal' },     // no renovable
    ]
    const resultado = desglosarMasaCircular(composicion)
    expect(resultado.m_total_input_kg).toBe(10)
    expect(resultado.m_secundario_kg).toBe(10) // todo objeto reusado = 100% secundario
    expect(resultado.m_renovable_kg).toBe(6)
    expect(resultado.q_circular_kg).toBe(10)
  })
})
```

- [x] **Step 2: Correr y confirmar que falla**

Run: `npx vitest run src/lib/calculos/circularidad.test.ts -t desglosarMasaCircular`
Expected: FAIL.

- [x] **Step 3: Implementación mínima**

```typescript
// Categorías consideradas "renovables" (origen biológico) para el Índice
// circular — confirmado con el usuario el 2026-09-13. Ajustar aquí si el
// negocio decide otra clasificación, es la única fuente de verdad.
const CATEGORIAS_RENOVABLES = new Set(['madera', 'textil', 'cuero', 'carton_papel'])

export interface MaterialConCategoria {
  peso_kg: number
  categoria_material?: string | null
}

export interface DesgloseCircular {
  m_total_input_kg: number
  m_secundario_kg: number
  m_renovable_kg: number
  q_circular_kg: number
}

/**
 * En el contexto de Reúso, todo el material que entra a un activo ya
 * recuperado cuenta como "secundario" por definición del negocio (nunca
 * es material virgen) — no hay ambigüedad ahí. Lo único que varía es qué
 * fracción, además, es renovable (origen biológico).
 */
export function desglosarMasaCircular(composicion: MaterialConCategoria[]): DesgloseCircular {
  const m_total_input_kg = r2(composicion.reduce((s, m) => s + m.peso_kg, 0))
  const m_renovable_kg = r2(
    composicion
      .filter(m => m.categoria_material && CATEGORIAS_RENOVABLES.has(m.categoria_material))
      .reduce((s, m) => s + m.peso_kg, 0)
  )
  return {
    m_total_input_kg,
    m_secundario_kg: m_total_input_kg,
    m_renovable_kg,
    q_circular_kg: m_total_input_kg,
  }
}
```

- [x] **Step 4: Correr y confirmar que pasa**

Run: `npx vitest run src/lib/calculos/circularidad.test.ts`
Expected: PASS, todas las pruebas del archivo.

- [x] **Step 5: Commit**

```bash
git add src/lib/calculos/circularidad.ts src/lib/calculos/circularidad.test.ts
git commit -m "feat: desglose de masa circular (secundario/renovable) derivado de la composicion (Tecnica B)"
```

---

## Task 5: Conectar todo al endpoint de cálculos ambientales del DPP

**Files:**
- Modify: `src/app/api/dpp/activos/[id]/calculos-ambientales/route.ts`

- [ ] **Step 1: Agregar los nuevos campos a la respuesta**

Extender el `select` de `dpp_ciclos` (línea 42 actual) para incluir `fecha_inicio, fecha_fin` (si no están ya) y `peso_residuo_taller_kg` (ya está). Después del bloque de `logistica` (línea 83 actual), agregar:

```typescript
  const desgloseCircular = desglosarMasaCircular(
    composicion.map(m => ({ peso_kg: m.peso_kg, categoria_material: (m as { categoria_material?: string | null }).categoria_material }))
  )
  const porcentajeReciclableComposicion = estimarPorcentajeReciclable(
    composicion.map(m => ({ peso_kg: m.peso_kg, porcentaje_reciclable: (m as { porcentaje_reciclable?: number | null }).porcentaje_reciclable }))
  )
  const tiempoUsoEnPlataformaDias = calcularTiempoUsoEnPlataformaDias(ciclosDb ?? [])
```

Y agregarlos al `data` de la respuesta final (`m_secundario_kg`, `m_renovable_kg`, `m_total_input_kg`, `q_circular_kg`, `r_out_estimado_pct`, `tiempo_uso_en_plataforma_dias`), con los imports correspondientes al inicio del archivo.

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/api/dpp/activos/[id]/calculos-ambientales/route.ts"`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/dpp/activos/[id]/calculos-ambientales/route.ts"
git commit -m "feat: expone desglose circular y tiempo de uso en el endpoint de calculos ambientales del DPP"
```

---

## Verificación final

- `npx vitest run src/lib/calculos/circularidad.test.ts src/lib/calculos/tiempo-uso.test.ts` — todas pasan.
- `npx tsc --noEmit` limpio en todo el proyecto.
- Probar en vivo: un activo DPP con 2 ciclos cerrados y composición mixta (madera + metal) → confirmar que `tiempo_uso_en_plataforma_dias` coincide con sumar las fechas a mano, y que `m_renovable_kg` solo cuenta la madera.
- Actualizar la ficha `calculos/01-algoritmo-cr.md` del Vault y `calculos/00-indice.md` marcando `R_out`, `m_secundario_kg`, `m_renovable_kg`, `m_total_input_kg`, `q_circular_kg` y la porción "en plataforma" de `T_previo` como ya construidas (no solo "posibles").
