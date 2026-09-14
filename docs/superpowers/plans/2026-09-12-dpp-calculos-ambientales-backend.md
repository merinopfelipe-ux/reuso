# DPP — Endpoint de Cálculos Ambientales (Plan 2a, backend)

> **OBSOLETO — NO EJECUTAR (2026-09-13).** El endpoint que construye este plan (`/api/dpp/activos/[id]/calculos-ambientales`) ya se construyó, se usó, y se retiró por completo en el commit `29407cc` ("retira huella hidrica/mitigacion/ACV del DPP, huerfanos y fuera del catalogo de 9 calculos") — nunca tuvo UI que lo consumiera y ninguno de sus resultados forma parte del catálogo final de 9 cálculos (decisión confirmada de nuevo con el usuario el mismo día). `calcularHuellaManufactura` se conserva en `lca.ts` porque sí alimenta el cálculo #3 real (Alcance 3). Este plan queda como referencia histórica, no como trabajo pendiente.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un endpoint de solo lectura que, a partir de los materiales ya confirmados de un activo DPP (`composicion_json`) y sus ciclos ya registrados, devuelve los cálculos ambientales del catálogo de 14 (huella de carbono, huella hídrica, árboles preservados, duchas ahorradas, desvío de vertedero, mitigación por ciclos, ACV) — sin necesidad de ningún paso manual adicional, todo derivado de datos que ya existen en `dpp_activos`/`dpp_ciclos`.

**Architecture:** Las métricas financieras (TCO, ahorro, E-ROI, inflow circular) ya tienen su propio endpoint (`/api/dpp/activos/[id]/metricas`) — este plan NO las toca. Se agregan 2 funciones puras nuevas (huella hídrica + equivalencias narrativas) en un archivo nuevo, reusando `PARAM_EQUIV` de `co2.ts` para no duplicar constantes, y se reusa `calcularLogistica` (ya existe) y las funciones de `lca.ts` (Plan #1, ya construido) dentro de un solo endpoint de agregación.

**Tech Stack:** TypeScript, Vitest, Next.js route handler, Supabase.

---

### Task 1: Permitir `factor_agua_l_kg` en la composición de un activo

**Files:**
- Modify: `src/app/api/dpp/activos/crear/route.ts:15-22`

**Por qué**: hoy `composicion_json` solo guarda `factor_co2_kg` por material — no hay forma de calcular huella hídrica sin este dato. El catálogo real de materiales (`item_materiales.factor_agua_l_kg`) ya lo tiene, así que cuando el Plan #2b (foto + IA) detecte materiales del catálogo real, este campo vendrá disponible. Se agrega como opcional para no romper la creación manual de hoy, que no lo captura.

- [ ] **Step 1: Ampliar el schema Zod**

En `src/app/api/dpp/activos/crear/route.ts`, reemplazar:

```typescript
  composicion_json: z.array(z.object({
    material: z.string(),
    peso_kg: z.number().positive(),
    factor_co2_kg: z.number().min(0),
    origen_fuente: z.string().optional(),
    nivel_confianza: z.enum(['alta', 'media', 'baja']).optional(),
  })).optional(),
```

por:

```typescript
  composicion_json: z.array(z.object({
    material: z.string(),
    peso_kg: z.number().positive(),
    factor_co2_kg: z.number().min(0),
    factor_agua_l_kg: z.number().min(0).optional(),
    origen_fuente: z.string().optional(),
    nivel_confianza: z.enum(['alta', 'media', 'baja']).optional(),
  })).optional(),
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/dpp/activos/crear/route.ts"
git commit -m "feat: composicion_json de un DPP admite factor_agua_l_kg opcional"
```

---

### Task 2: Funciones puras — huella hídrica y equivalencias narrativas

**Files:**
- Create: `src/lib/calculos/dpp-ambiental.ts`
- Test: `src/lib/calculos/dpp-ambiental.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
import { describe, it, expect } from 'vitest'
import { calcularHuellaHidrica, calcularEquivalenciasNarrativas } from './dpp-ambiental'

describe('calcularHuellaHidrica', () => {
  it('suma peso_kg * factor_agua_l_kg de cada material', () => {
    const composicion = [
      { peso_kg: 10, factor_agua_l_kg: 5 },
      { peso_kg: 4, factor_agua_l_kg: 2.5 },
    ]
    expect(calcularHuellaHidrica(composicion)).toBe(60)
  })

  it('ignora materiales sin factor_agua_l_kg definido', () => {
    const composicion = [
      { peso_kg: 10, factor_agua_l_kg: 5 },
      { peso_kg: 4 } as { peso_kg: number; factor_agua_l_kg?: number },
    ]
    expect(calcularHuellaHidrica(composicion)).toBe(50)
  })

  it('devuelve 0 con lista vacía', () => {
    expect(calcularHuellaHidrica([])).toBe(0)
  })
})

describe('calcularEquivalenciasNarrativas', () => {
  it('árboles = CO2 total / cuota diaria de un árbol, duchas = agua total / 100L', () => {
    // Mismos PARAM_EQUIV que co2.ts: 25 kg CO2/año por árbol, ducha de 100L.
    const resultado = calcularEquivalenciasNarrativas(25 / 365, 100)
    expect(resultado.arboles).toBe(1)
    expect(resultado.duchas).toBe(1)
  })

  it('con 0 CO2 y 0 agua, ambas equivalencias son 0', () => {
    const resultado = calcularEquivalenciasNarrativas(0, 0)
    expect(resultado.arboles).toBe(0)
    expect(resultado.duchas).toBe(0)
  })
})
```

- [ ] **Step 2: Correr el test para confirmar que falla**

Run: `npx vitest run src/lib/calculos/dpp-ambiental.test.ts`
Expected: FAIL — `Cannot find module './dpp-ambiental'`.

- [ ] **Step 3: Implementación mínima**

```typescript
// src/lib/calculos/dpp-ambiental.ts
//
// Cálculos ambientales de un activo DPP, derivados directo de su
// composicion_json (ya en formato "peso total del material", a diferencia
// del modelo por unidad de co2.ts/ItemCalculo, pensado para la Calculadora
// y el Cotizador). Reusa PARAM_EQUIV de co2.ts para nunca tener dos
// versiones de la misma constante (árbol/ducha) en el sistema.
import { PARAM_EQUIV } from './co2'

export interface MaterialConAgua {
  peso_kg: number
  factor_agua_l_kg?: number
}

export function calcularHuellaHidrica(composicion: MaterialConAgua[]): number {
  const total = composicion.reduce(
    (sum, m) => sum + m.peso_kg * (m.factor_agua_l_kg ?? 0),
    0
  )
  return Math.round(total * 100) / 100
}

export interface EquivalenciasNarrativas {
  arboles: number
  duchas: number
}

/**
 * Mismas fórmulas y constantes que co2.ts (nunca duplicar el valor): árbol
 * absorbiendo su cuota diaria (anual/365), ducha estándar de 5 minutos.
 */
export function calcularEquivalenciasNarrativas(co2TotalKg: number, aguaTotalL: number): EquivalenciasNarrativas {
  return {
    arboles: Math.round(co2TotalKg / (PARAM_EQUIV.CO2_arbol_anual_kg / 365)),
    duchas: Math.round(aguaTotalL / PARAM_EQUIV.litros_ducha_5min),
  }
}
```

- [ ] **Step 4: Correr el test para confirmar que pasa**

Run: `npx vitest run src/lib/calculos/dpp-ambiental.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculos/dpp-ambiental.ts src/lib/calculos/dpp-ambiental.test.ts
git commit -m "feat: huella hidrica y equivalencias narrativas para un activo DPP"
```

---

### Task 3: Endpoint de agregación — todos los cálculos ambientales de un activo

**Files:**
- Create: `src/app/api/dpp/activos/[id]/calculos-ambientales/route.ts`

- [ ] **Step 1: Escribir el endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { calcularHuellaManufactura, calcularMitigacionPorCiclos, calcularAnalisisCicloVida } from '@/lib/calculos/lca'
import { calcularHuellaHidrica, calcularEquivalenciasNarrativas } from '@/lib/calculos/dpp-ambiental'
import { calcularLogistica, type CicloLogistica } from '@/lib/reportes/logistica'

interface MaterialComposicion {
  peso_kg: number
  factor_co2_kg?: number
  factor_agua_l_kg?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso para ver este activo.' },
      { status: auth.status }
    )
  }
  const { empresa_id, rol, adminClient } = auth
  const { id } = params

  const { data: activo, error: activoError } = await adminClient
    .from('dpp_activos')
    .select('id, empresa_id, composicion_json, co2_manufactura_kg')
    .eq('id', id)
    .single()

  if (activoError || !activo) {
    return NextResponse.json({ error: 'No encontramos este activo.' }, { status: 404 })
  }
  if (rol !== 'super_admin' && activo.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para este activo.' }, { status: 403 })
  }

  const { data: ciclosDb, error: ciclosError } = await adminClient
    .from('dpp_ciclos')
    .select('id, co2_ciclo_kg, distancia_transporte_km, tipo_vehiculo_transporte, peso_residuo_taller_kg, peso_residuo_reciclado_kg, destino_residuo')
    .eq('activo_id', id)
    .order('numero_ciclo', { ascending: true })

  if (ciclosError) {
    return NextResponse.json({ error: 'Error al leer los ciclos del activo.' }, { status: 500 })
  }

  const composicion: MaterialComposicion[] = Array.isArray(activo.composicion_json)
    ? activo.composicion_json as MaterialComposicion[]
    : []

  const co2_manufactura_kg = activo.co2_manufactura_kg ?? 0
  const agua_total_l = calcularHuellaHidrica(composicion)
  const equivalencias = calcularEquivalenciasNarrativas(co2_manufactura_kg, agua_total_l)

  const ciclosParaMitigacion = (ciclosDb ?? []).map(c => ({ co2_ciclo_kg: c.co2_ciclo_kg ?? 0 }))
  const mitigacion = calcularMitigacionPorCiclos(co2_manufactura_kg, ciclosParaMitigacion)
  const acv = calcularAnalisisCicloVida(co2_manufactura_kg, ciclosParaMitigacion)

  const ciclosParaLogistica: CicloLogistica[] = (ciclosDb ?? []).map(c => ({
    id: c.id,
    distancia_transporte_km: c.distancia_transporte_km ?? 0,
    peso_transportado_kg: 0,
    tipo_vehiculo_transporte: c.tipo_vehiculo_transporte,
    peso_residuo_taller_kg: c.peso_residuo_taller_kg ?? 0,
    peso_residuo_reciclado_kg: c.peso_residuo_reciclado_kg ?? 0,
    destino_residuo: c.destino_residuo,
  }))
  const logistica = calcularLogistica(ciclosParaLogistica)

  return NextResponse.json({
    data: {
      huella_carbono_kg: co2_manufactura_kg,
      huella_hidrica_l: agua_total_l,
      arboles_preservados: equivalencias.arboles,
      duchas_ahorradas: equivalencias.duchas,
      tasa_desvio_vertedero_pct: logistica.tasa_desvio_vertedero_pct,
      mitigacion_por_ciclos: mitigacion,
      analisis_ciclo_vida: acv,
    },
  })
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/api/dpp/activos/[id]/calculos-ambientales/route.ts"`
Expected: sin errores.

- [ ] **Step 3: Probar en vivo contra la base real**

```bash
node --env-file=.env.local -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data: emp } = await supabase.from('empresas').select('id').limit(1).single();
  const { data: activo } = await supabase.from('dpp_activos').insert({
    empresa_id: emp.id,
    codigo_dpp: 'DPP-TEST-PLAN2A-' + Date.now(),
    nombre: 'Prueba plan 2a',
    composicion_json: [{ material: 'madera', peso_kg: 10, factor_co2_kg: 2, factor_agua_l_kg: 3 }],
  }).select().single();
  console.log('activo creado:', activo.id, 'co2_manufactura_kg:', activo.co2_manufactura_kg);
  await supabase.from('dpp_ciclos').insert({
    activo_id: activo.id, empresa_id: emp.id, numero_ciclo: 1, fecha_inicio: '2026-01-01',
    operacion_realizada: 'Prueba', co2_ciclo_kg: 4, distancia_transporte_km: 10,
  });
  await supabase.from('dpp_activos').update({ n_ciclos: 1 }).eq('id', activo.id);
  console.log('Ahora llama GET /api/dpp/activos/' + activo.id + '/calculos-ambientales con sesion real y confirma:');
  console.log('huella_carbono_kg=20 (10*2), huella_hidrica_l=30 (10*3), mitigacion_por_ciclos.co2_mitigado_total_kg=24 (20+4)');
  console.log('Limpiando...');
  await supabase.from('dpp_ciclos').delete().eq('activo_id', activo.id);
  await supabase.from('dpp_activos').delete().eq('id', activo.id);
  console.log('OK');
})();
"
```

Expected: el script imprime los valores esperados, y llamar al endpoint real (con sesión de `empresa_admin`/`empleado` autenticada, no se puede simular con el service role) confirma los mismos números antes de que el script borre los datos de prueba.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/dpp/activos/[id]/calculos-ambientales/route.ts"
git commit -m "feat: endpoint de calculos ambientales agregados de un activo DPP"
```

---

## Fuera de alcance de este plan

- Costo de restauración, artesanos/personas, historia/valor sentimental — no son cálculos que este endpoint deba exponer: costo de restauración vive en el Cotizador/reportes existentes, artesanos e historia son campos de texto que se guardan directo (`dpp_ciclos.responsable_intervencion_json`, `dpp_activos.historia_valor_sentimental`), no pasan por ningún endpoint de cálculo.
- MCI (#15) — plan aparte.
- Cualquier UI — es tarea del Plan #2b.
