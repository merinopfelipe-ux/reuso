# Peso de insumos (hueco de F_U) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar `peso_kg` a los insumos (catálogo y ad-hoc de cotización) con estimación asistida por IA, cerrando el hueco de dato que impide calcular `F_U` del futuro MCI.

**Architecture:** Migración expandir-contraer + un campo nuevo en el esquema Zod compartido de insumos (fluye solo a los 4 endpoints existentes que ya lo usan) + una función IA compartida calcada de `precio-mercado.ts` + 2 endpoints delgados (uno sin gate para super_admin, uno gateado por plan para el Cotizador) + un caché de 2 capas + el campo/botón en las 4 pantallas reales donde se edita un insumo.

**Tech Stack:** Next.js 14, TypeScript, Zod, Supabase, Gemini (grounding) + OpenRouter (fallback).

---

## Contexto para quien implemente

- No investigar desde cero — todo esto ya se verificó en código real durante el brainstorming y la preparación de este plan:
- `insumoSchema` (`src/lib/schemas/dimensiones.schema.ts`) es el ÚNICO lugar que define la forma de un insumo — lo reusan `categoria.schema.ts` (`insumos_base`, en `POST /api/admin/categorias` y `PATCH /api/admin/categorias/[id]`) e `item.schema.ts` (`insumos`, en `POST /api/admin/items` y `PATCH /api/admin/items/[id]`). Agregar `peso_kg` ahí es suficiente para que fluya a las 4 rutas — **no hace falta tocar ningún `route.ts` de guardado**, todas hacen `insumos_base.map((s, i) => ({ ...s, categoria_id, orden: i }))` (spread directo del objeto validado).
- `src/lib/ia/precio-mercado.ts` y `src/app/api/cotizador/muebles/[muebleId]/precio-mercado/route.ts` son el patrón real a calcar (ya en producción) — Gemini con `tools: [{ google_search: {} }]` + fallback OpenRouter `qwen/qwen2.5-72b-instruct:online`, Zod estricto sobre la respuesta, `parsearJSON` tolerante (busca \`\`\`json, recorta al primer `{` y al último `}`), nunca persiste sin `fuente_url` válida.
- `planIncluyeIA(empresaId, plan)` (`src/lib/plan-limits.ts`) ya existe y ya gatea exactamente este tipo de función en el Cotizador.
- `InputConUnidad` (`src/components/ui/formatted-number-input.tsx`) es el input correcto para un peso con unidad — ya se usa así para `item_materiales.peso_kg` en el mismo `categorias-client.tsx` (`<InputConUnidad value={m.peso_kg} onChange={...} unidad="kg" />`).
- Las 3 pantallas reales donde se edita un insumo del catálogo/matriz hoy (`src/app/(admin)/admin/categorias/components/categorias-client.tsx`):
  1. `EditorFinanciero` (usado por `FormNodo`, matriz de categoría) — fila de insumo en `insumos.map((ins, i) => ...)`, sin desglose expandible.
  2. `PanelItemValores`, filas del **esquema** heredado de la categoría (`esquemaInsVisibles.map(fila => ...)`) — fila compacta + panel expandible (`filaAbierta === fila.id`).
  3. `PanelItemValores`, filas **extra** propias del ítem (`extraInsumos.map((ins, i) => ...)`) — grid de 4 columnas (Insumo/Cantidad/Unidad/Precio unitario).
- La 4ª pantalla, insumos *ad-hoc* de una cotización: `src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx`, `insumos.map((ins, i) => ...)`.
- Siguiente migración disponible: `sql/135` (última usada: `134_onboarding_empresas_pagas.sql`).
- Repo trabaja directo sobre `main`, sin worktree ni PR (Regla de Oro #1 del `CLAUDE.md`). La migración la corre el usuario a mano en Supabase (staging primero, producción después) — no es una tarea de código.
- Todos los archivos de este plan estuvieron en cambio activo hoy mismo (2026-09-16) — antes de editar cualquiera, léelo completo con Read, no confíes en los fragmentos citados aquí para el resto del archivo.

---

## Task 1: Migración SQL — `peso_kg` en insumos + tabla de caché

**Files:**
- Create: `sql/135_peso_insumos.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- =====================================================================
-- Migración 135 — Peso de insumos (hueco de F_U en el MCI) + caché global
-- Calculadora de Reúso | 2026-09-16
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- Peso de UNA unidad del insumo (coherente con cantidad/unidad existentes).
-- Nullable, sin backfill forzado — se llena progresivamente.
ALTER TABLE item_insumos
  ADD COLUMN IF NOT EXISTS peso_kg numeric(10,3);
ALTER TABLE categoria_insumos_base
  ADD COLUMN IF NOT EXISTS peso_kg numeric(10,3);

-- Caché global (todas las empresas) de pesos ya estimados por IA para un
-- insumo ad-hoc de cotización — el peso de "1 litro de barniz" no cambia
-- por empresa ni por tiempo, así que se comparte en vez de recalcularse.
CREATE TABLE IF NOT EXISTS peso_insumos_referencia (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_normalizado text NOT NULL,
  unidad             text NOT NULL,
  peso_kg            numeric(10,3) NOT NULL,
  fuente_url         text,
  confianza          text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nombre_normalizado, unidad)
);
```

- [ ] **Step 2: Avisar al usuario que la corra a mano**

No se ejecuta desde este plan — el usuario la corre en Supabase (staging `rjcfqcqgqxoblisuyapq` primero, producción `nxnjjncjpqckewwacgoj` después).

- [ ] **Step 3: Commit**

```bash
git add sql/135_peso_insumos.sql
git commit -m "feat: migración para peso_kg de insumos y caché de referencia (hueco de F_U)"
```

---

## Task 2: `peso_kg` en el esquema compartido de insumos

**Files:**
- Modify: `src/lib/schemas/dimensiones.schema.ts`

- [ ] **Step 1: Agregar el campo**

En `src/lib/schemas/dimensiones.schema.ts`, cambiar:

```ts
export const insumoSchema = z.object({
  nombre: z.string().min(1).max(100),
  cantidad: z.number().nonnegative(),
  unidad: z.string().min(1).max(30),
  precio_unitario: z.number().nonnegative(),
})
```

por:

```ts
export const insumoSchema = z.object({
  nombre: z.string().min(1).max(100),
  cantidad: z.number().nonnegative(),
  unidad: z.string().min(1).max(30),
  precio_unitario: z.number().nonnegative(),
  peso_kg: z.number().nonnegative().nullish(),
})
```

(`.nullish()`, no `.optional()` — el snapshot que llega de la base puede traer `null`, y `.optional()` solo acepta `undefined`, rechaza `null` con 400. Mismo criterio ya documentado en el comentario de `materialSchema` en este mismo archivo.)

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```
Esperado: sin errores nuevos. (No hace falta tocar `item.schema.ts`, `categoria.schema.ts` ni ningún `route.ts` de guardado — ambos ya reusan `insumoSchema` tal cual y hacen spread directo del objeto validado.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/dimensiones.schema.ts
git commit -m "feat: peso_kg opcional en el esquema compartido de insumos"
```

---

## Task 3: Función IA compartida `buscarPesoInsumo`

**Files:**
- Create: `src/lib/ia/peso-insumo.ts`

- [ ] **Step 1: Escribir la función**

Antes de escribir, lee `src/lib/ia/precio-mercado.ts` completo (137 líneas) — esta función es una adaptación directa suya, mismo patrón de `parsearJSON`, `llamarGemini`, `llamarOpenRouter`.

```ts
import { z } from 'zod'

// Estimación del peso de 1 unidad de un insumo (ej. "1 litro de barniz
// poliuretano") — mismo patrón anti-invención que precio-mercado.ts: nunca
// se persiste un peso sin una fuente URL bien formada, validada con Zod.
// A diferencia del precio de mercado, el peso de un insumo es casi una
// constante física (no varía por empresa ni con el tiempo) — el caché de
// 2 capas que usa esta función vive en el endpoint que la llama, no aquí.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const pesoInsumoSchema = z.object({
  peso_kg_estimado: z.number().positive(),
  fuente_url: z.string().regex(/^https?:\/\//, 'La fuente debe ser una URL válida.'),
  fuente_titulo: z.string().min(1).max(200),
  confianza: z.enum(['alta', 'media', 'baja']),
})

export type PesoInsumoSugerido = z.infer<typeof pesoInsumoSchema> & {
  proveedor: 'gemini' | 'openrouter'
}

export type ResultadoPesoInsumo =
  | ({ ok: true } & PesoInsumoSugerido)
  | { ok: false }

function parsearJSON(raw: string): unknown | null {
  if (!raw) return null
  try {
    const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const t = (mdMatch ? mdMatch[1] : raw).trim()
    const start = t.indexOf('{')
    if (start === -1) return null
    try { return JSON.parse(t.slice(start)) } catch { /* continúa */ }
    const end = t.lastIndexOf('}')
    if (end <= start) return null
    return JSON.parse(t.slice(start, end + 1))
  } catch { return null }
}

function construirPrompt(nombre: string, unidad: string): string {
  return `Eres un investigador de materiales y suministros de tapicería/carpintería/restauración en Colombia. Busca en internet cuánto pesa 1 ${unidad} de: "${nombre}".

Busca en fichas técnicas de fabricantes, tiendas en línea o datos de densidad de materiales conocidos. Si encuentras varios valores, usa uno representativo, nunca el más alto ni el más bajo como excepción.

Responde ÚNICAMENTE con este JSON, sin texto adicional:
{
  "peso_kg_estimado": <número, peso en kg de 1 ${unidad} de este insumo>,
  "fuente_url": "<URL real de la página donde viste el dato>",
  "fuente_titulo": "<nombre corto de la fuente>",
  "confianza": "<alta si el dato es de una ficha técnica específica, media si es una estimación razonable, baja si es una aproximación genérica>"
}

Si no encuentras ningún dato confiable, responde exactamente: { "sin_resultado": true }`
}

async function llamarGemini(nombre: string, unidad: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: construirPrompt(nombre, unidad) }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 100 },
        },
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

async function llamarOpenRouter(nombre: string, unidad: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-72b-instruct:online',
        max_tokens: 300,
        temperature: 0.1,
        messages: [{ role: 'user', content: construirPrompt(nombre, unidad) }],
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

export async function buscarPesoInsumo(nombre: string, unidad: string): Promise<ResultadoPesoInsumo> {
  let resultado = await llamarGemini(nombre, unidad)
  let proveedor: 'gemini' | 'openrouter' = 'gemini'
  if (!resultado.ok) {
    resultado = await llamarOpenRouter(nombre, unidad)
    proveedor = 'openrouter'
  }
  if (!resultado.ok) return { ok: false }

  const json = parsearJSON(resultado.raw)
  if (!json || typeof json !== 'object') return { ok: false }
  if ('sin_resultado' in json) return { ok: false }

  const parsed = pesoInsumoSchema.safeParse(json)
  if (!parsed.success) return { ok: false }

  return { ok: true, ...parsed.data, proveedor }
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ia/peso-insumo.ts
git commit -m "feat: función IA para estimar el peso de un insumo (calcada de precio-mercado.ts)"
```

---

## Task 4: Caché de referencia — función compartida de consulta/guardado

**Files:**
- Create: `src/lib/ia/peso-insumo-cache.ts`
- Test: `src/lib/ia/peso-insumo-cache.test.ts`

- [ ] **Step 1: Escribir la función pura de normalización (con test)**

```ts
// src/lib/ia/peso-insumo-cache.ts
export function normalizarNombreInsumo(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}
```

```ts
// src/lib/ia/peso-insumo-cache.test.ts
import { describe, it, expect } from 'vitest'
import { normalizarNombreInsumo } from './peso-insumo-cache'

describe('normalizarNombreInsumo', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizarNombreInsumo('Barniz Poliuretánico')).toBe('barniz poliuretanico')
  })

  it('recorta espacios extra', () => {
    expect(normalizarNombreInsumo('  Tela   de lino  ')).toBe('tela de lino')
  })

  it('nombres equivalentes normalizan igual', () => {
    expect(normalizarNombreInsumo('Tela')).toBe(normalizarNombreInsumo('  tela  '))
  })
})
```

- [ ] **Step 2: Correr el test**

```bash
npx vitest run src/lib/ia/peso-insumo-cache.test.ts
```
Esperado: 3 tests pasan.

- [ ] **Step 3: Agregar las funciones de consulta/guardado sobre `peso_insumos_referencia`**

Añadir al mismo archivo `src/lib/ia/peso-insumo-cache.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

interface PesoCacheado {
  peso_kg: number
  fuente_url: string | null
  confianza: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buscarEnCache(adminClient: SupabaseClient<any>, nombre: string, unidad: string): Promise<PesoCacheado | null> {
  const { data } = await adminClient
    .from('peso_insumos_referencia')
    .select('peso_kg, fuente_url, confianza')
    .eq('nombre_normalizado', normalizarNombreInsumo(nombre))
    .eq('unidad', unidad)
    .maybeSingle()
  return data ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function guardarEnCache(adminClient: SupabaseClient<any>, nombre: string, unidad: string, pesoKg: number, fuenteUrl: string, confianza: string): Promise<void> {
  await adminClient
    .from('peso_insumos_referencia')
    .upsert(
      { nombre_normalizado: normalizarNombreInsumo(nombre), unidad, peso_kg: pesoKg, fuente_url: fuenteUrl, confianza },
      { onConflict: 'nombre_normalizado,unidad' }
    )
}
```

- [ ] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/ia/peso-insumo-cache.ts src/lib/ia/peso-insumo-cache.test.ts
git commit -m "feat: caché de referencia de peso de insumos (normalización + consulta/guardado)"
```

---

## Task 5: Endpoint `POST /api/admin/insumos/peso-sugerido` (super_admin, sin gate de plan)

**Files:**
- Create: `src/app/api/admin/insumos/peso-sugerido/route.ts`

- [ ] **Step 1: Escribir el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { buscarPesoInsumo } from '@/lib/ia/peso-insumo'
import { buscarEnCache, guardarEnCache } from '@/lib/ia/peso-insumo-cache'

const bodySchema = z.object({
  nombre: z.string().min(1),
  unidad: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { nombre, unidad } = parsed.data

  const cacheado = await buscarEnCache(guard.adminClient, nombre, unidad)
  if (cacheado) {
    return NextResponse.json({ ok: true, peso_kg: cacheado.peso_kg, fuente_url: cacheado.fuente_url, confianza: cacheado.confianza, origen: 'cache' })
  }

  const resultado = await buscarPesoInsumo(nombre, unidad)
  if (!resultado.ok) {
    return NextResponse.json({ ok: false })
  }

  await guardarEnCache(guard.adminClient, nombre, unidad, resultado.peso_kg_estimado, resultado.fuente_url, resultado.confianza)

  return NextResponse.json({
    ok: true,
    peso_kg: resultado.peso_kg_estimado,
    fuente_url: resultado.fuente_url,
    fuente_titulo: resultado.fuente_titulo,
    confianza: resultado.confianza,
    origen: 'ia',
  })
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/insumos/peso-sugerido/route.ts
git commit -m "feat: endpoint de peso sugerido de insumo para super_admin, sin gate de plan"
```

---

## Task 6: Endpoint `POST /api/cotizador/insumos/peso-sugerido` (gateado por plan)

**Files:**
- Create: `src/app/api/cotizador/insumos/peso-sugerido/route.ts`

Antes de escribir, lee `src/app/api/cotizador/muebles/[muebleId]/precio-mercado/route.ts` completo — el gate de plan y `cotizadorAuthCheck` se copian exactamente igual.

- [ ] **Step 1: Escribir el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { rateLimit } from '@/lib/rate-limit'
import { planIncluyeIA } from '@/lib/plan-limits'
import { buscarPesoInsumo } from '@/lib/ia/peso-insumo'
import { buscarEnCache, guardarEnCache } from '@/lib/ia/peso-insumo-cache'
import type { Plan } from '@/types'

const bodySchema = z.object({
  nombre: z.string().min(1),
  unidad: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'No autenticado.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso para usar el Cotizador.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const { nombre, unidad } = parsed.data

  // El caché no cuesta tokens — se consulta ANTES del gate de plan, para que
  // un dato ya conocido (de cualquier empresa) esté disponible siempre.
  const cacheado = await buscarEnCache(adminClient, nombre, unidad)
  if (cacheado) {
    return NextResponse.json({ ok: true, peso_kg: cacheado.peso_kg, fuente_url: cacheado.fuente_url, confianza: cacheado.confianza, origen: 'cache' })
  }

  const { data: empIA } = await adminClient.from('empresas').select('plan').eq('id', empresa_id).single()
  if (!(await planIncluyeIA(empresa_id, (empIA?.plan ?? 'free') as Plan))) {
    return NextResponse.json(
      { error: 'La sugerencia de peso con IA está disponible desde el plan Impulso Sostenible.' },
      { status: 403 }
    )
  }

  const allowed = await rateLimit(`peso_insumo:${empresa_id}`, 20, 60 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas búsquedas de peso. Espera unos minutos.' }, { status: 429 })
  }

  const resultado = await buscarPesoInsumo(nombre, unidad)
  if (!resultado.ok) {
    return NextResponse.json({ ok: false })
  }

  await guardarEnCache(adminClient, nombre, unidad, resultado.peso_kg_estimado, resultado.fuente_url, resultado.confianza)

  return NextResponse.json({
    ok: true,
    peso_kg: resultado.peso_kg_estimado,
    fuente_url: resultado.fuente_url,
    fuente_titulo: resultado.fuente_titulo,
    confianza: resultado.confianza,
    origen: 'ia',
  })
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```
Si `cotizadorAuthCheck` no expone `adminClient`/`empresa_id` con esos nombres exactos, ajusta a los nombres reales de `src/lib/dpp/auth-check.ts` (confírmalo leyendo ese archivo, no lo asumas — ya se usa así en `precio-mercado/route.ts`, cópialo de ahí).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cotizador/insumos/peso-sugerido/route.ts
git commit -m "feat: endpoint de peso sugerido de insumo para el Cotizador, gateado por plan"
```

---

## Task 7: UI — campo `peso_kg` + botón "Sugerir con IA" en `/admin/categorias`

**Files:**
- Modify: `src/app/(admin)/admin/categorias/components/categorias-client.tsx`

Lee el archivo completo con Read antes de editar — cambió varias veces hoy mismo, no asumas los fragmentos de abajo como el estado exacto de las líneas circundantes, úsalos solo para ubicar el punto de inserción por coincidencia de texto.

- [ ] **Step 1: Agregar un botón reutilizable "Sugerir con IA"**

Justo antes de `function EditorMateriales` (o en cualquier punto del archivo antes de su primer uso), agrega:

```tsx
function BotonSugerirPeso({ nombre, unidad, endpoint, onSugerido }: {
  nombre: string
  unidad: string
  endpoint: string
  onSugerido: (pesoKg: number) => void
}) {
  const [cargando, setCargando] = useState(false)

  async function sugerir() {
    if (!nombre.trim()) return
    setCargando(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), unidad: unidad || 'unidad' }),
      })
      const data = await res.json()
      if (res.ok && data.ok) onSugerido(data.peso_kg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={sugerir}
      disabled={cargando || !nombre.trim()}
      title="Sugerir peso con IA"
      className="p-1.5 rounded-lg text-[var(--color-brand)] hover-pop hover-press disabled:opacity-40"
      style={{ background: 'var(--color-brand-light)' }}
    >
      <Sparkles size={14} sinAnimacion />
    </button>
  )
}
```

Agrega `Sparkles` al import de íconos ya existente en la línea 7 (`import { ChevronRight as CaretRight, Plus, Power, ... } from '@/components/ui/icons'`), agregándolo a esa misma lista de nombres importados.

- [ ] **Step 2: Agregarlo a la fila de insumo de `EditorFinanciero`**

En el `insumos.map((ins, i) => ...)` de `EditorFinanciero`, dentro del `<div className="grid grid-cols-2 sm:grid-cols-[1.3fr_0.8fr_0.9fr_auto] gap-2 items-center">`, agrega un campo de peso y el botón, junto a los 3 campos existentes (nombre, unidad, precio) — cambia el grid a 5 columnas en pantallas grandes:

```tsx
<div key={i} className="flex flex-col gap-1">
  <div className="grid grid-cols-2 sm:grid-cols-[1.1fr_0.7fr_0.7fr_0.9fr_auto_auto] gap-2 items-center">
    <input style={inputSt} placeholder="Insumo (ej: Tela)" value={ins.nombre} onChange={e => setInsumos(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
    <input style={inputSt} placeholder="Unidad (ej: metros)" value={ins.unidad} onChange={e => setInsumos(r => r.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))} />
    <InputConUnidad value={ins.peso_kg ?? ''} onChange={v => setInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: v } : x))} unidad="kg" paso="0.001" />
    <InputPrecio value={ins.precio_unitario} onChange={v => setInsumos(r => r.map((x, j) => j === i ? { ...x, precio_unitario: v } : x))} />
    <BotonSugerirPeso nombre={ins.nombre} unidad={ins.unidad} endpoint="/api/admin/insumos/peso-sugerido" onSugerido={pesoKg => setInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: String(pesoKg) } : x))} />
    <button type="button" onClick={() => setInsumos(r => r.filter((_, j) => j !== i))} className="p-1 text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50" title="Eliminar"><Trash size={16} /></button>
  </div>
  {mostrarAplicarExistentes && ins.nombre.trim() && (
    <label className="flex items-center gap-1.5 cursor-pointer pl-1">
      <input
        type="checkbox"
        checked={aplicarExistentes?.[ins.nombre] ?? false}
        onChange={e => setAplicarExistentes?.(prev => ({ ...prev, [ins.nombre]: e.target.checked }))}
        style={{ accentColor: 'var(--color-brand)' }}
      />
      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Guardar global</span>
      <TooltipInfo texto="Al guardar, aplica el precio de este insumo también a los ítems que ya existen en esta categoría y sus subcategorías (cada uno guardó su propia copia, no se actualiza solo)." />
    </label>
  )}
</div>
```

(Reemplaza el bloque `<div key={i} ...>` completo de esa fila por este — el resto del componente `EditorFinanciero`, incluida la sección de Servicios, no cambia.)

Actualiza también `InsumoRow` (interfaz cerca del inicio del archivo, `interface InsumoRow { nombre: string; cantidad: string; unidad: string; precio_unitario: string }`) agregando `peso_kg: string` — y `filaInsumo()`, `insumosAFilas()`, `filasAInsumos()` para incluirlo:

```ts
interface InsumoRow { nombre: string; cantidad: string; unidad: string; precio_unitario: string; peso_kg: string }
```
```ts
const filaInsumo = (): InsumoRow => ({ nombre: '', cantidad: '', unidad: '', precio_unitario: '', peso_kg: '' })
```
```ts
function insumosAFilas(insumos: { nombre: string; cantidad: number; unidad: string; precio_unitario: number; peso_kg?: number | null }[]): InsumoRow[] {
  return insumos.map(i => ({ nombre: i.nombre, cantidad: String(i.cantidad), unidad: i.unidad, precio_unitario: String(i.precio_unitario), peso_kg: i.peso_kg != null ? String(i.peso_kg) : '' }))
}
```
```ts
function filasAInsumos(rows: InsumoRow[]) {
  return rows.filter(i => i.nombre && i.cantidad && i.unidad && i.precio_unitario).map(i => ({ nombre: i.nombre, cantidad: parseFloat(i.cantidad), unidad: i.unidad, precio_unitario: parseFloat(i.precio_unitario), peso_kg: i.peso_kg ? parseFloat(i.peso_kg) : undefined }))
}
```

- [ ] **Step 3: Agregarlo a las filas de insumo del esquema en `PanelItemValores`**

En el bloque `esquemaInsVisibles.map(fila => ...)`, agrega un estado nuevo `pesosInsumo` (Record por nombre, mismo patrón que `preciosUnitarios`):

```ts
const [pesosInsumo, setPesosInsumo] = useState<Record<string, string>>(() => {
  const inicial: Record<string, string> = {}
  for (const ins of categoria.categoria_insumos_base) {
    const existente = item?.item_insumos.find(ii => ii.nombre === ins.nombre)
    const valor = existente?.peso_kg ?? ins.peso_kg
    inicial[ins.nombre] = valor != null ? String(valor) : ''
  }
  return inicial
})
```

(Agrégalo junto a la declaración de `preciosUnitarios`.)

En la fila (`<div className="flex items-center gap-2">` dentro de `esquemaInsVisibles.map`), agrega el campo de peso y el botón junto a los ya existentes de cantidad y precio:

```tsx
<div className="w-24 flex-shrink-0">
  <InputConUnidad value={pesosInsumo[fila.nombre] ?? ''} onChange={v => setPesosInsumo(p => ({ ...p, [fila.nombre]: v }))} unidad="kg" paso="0.001" />
</div>
<BotonSugerirPeso nombre={fila.nombre} unidad={fila.unidad} endpoint="/api/admin/insumos/peso-sugerido" onSugerido={pesoKg => setPesosInsumo(p => ({ ...p, [fila.nombre]: String(pesoKg) }))} />
```

(Insértalo entre el campo de cantidad y el de precio existentes, dentro del mismo `<div className="flex items-center gap-2">`.)

En `editarEsquemaIns` (la función que mueve claves de los Records al renombrar un insumo), agrega `moverClave(setPesosInsumo, x.nombre, patch.nombre)` junto a las llamadas ya existentes a `moverClave` para `preciosUnitarios`/`cantidades`.

En el botón de eliminar de esa fila, agrega `setPesosInsumo(p => ({ ...p, [fila.nombre]: '' }))` junto a los `setCantidades`/`setPreciosUnitarios` que ya limpian al eliminar.

En `guardar()`, dentro del `.map()` que arma `insumos` desde `esquemaInsVisibles`, agrega `peso_kg` al objeto devuelto:

```ts
return {
  nombre: i.nombre.trim(),
  cantidad: isNaN(c) ? 0 : c,
  unidad: i.unidad,
  precio_unitario: isNaN(p) ? 0 : p,
  peso_kg: pesosInsumo[i.nombre] ? parseFloat(pesosInsumo[i.nombre]) : undefined,
}
```

- [ ] **Step 4: Agregarlo a las filas extra de `PanelItemValores`**

En `extraInsumos.map((ins, i) => ...)`, agrega un campo más al grid (que pasa de 4 a 5 columnas en pantallas grandes) y el botón:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
  <div>
    <label className={labelSt}>Insumo</label>
    <input style={inputSt} placeholder="Ej: Tela" value={ins.nombre} onChange={e => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
  </div>
  <div>
    <label className={labelSt}>Cantidad</label>
    <InputConUnidad value={ins.cantidad} onChange={v => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, cantidad: v } : x))} unidad={ins.unidad || 'ud'} paso="0.1" />
  </div>
  <div>
    <label className={labelSt}>Unidad</label>
    <input style={inputSt} placeholder="Ej: metros" value={ins.unidad} onChange={e => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))} />
  </div>
  <div className="flex items-end gap-1">
    <div className="flex-1">
      <label className={labelSt}>Peso</label>
      <InputConUnidad value={ins.peso_kg} onChange={v => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: v } : x))} unidad="kg" paso="0.001" />
    </div>
    <div className="pb-2.5">
      <BotonSugerirPeso nombre={ins.nombre} unidad={ins.unidad} endpoint="/api/admin/insumos/peso-sugerido" onSugerido={pesoKg => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: String(pesoKg) } : x))} />
    </div>
  </div>
  <div>
    <label className={labelSt}>Precio unitario</label>
    <InputPrecio value={ins.precio_unitario} onChange={v => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, precio_unitario: v } : x))} />
  </div>
</div>
```

(Reemplaza el `<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">` existente de esa fila por este de 5 columnas.)

- [ ] **Step 5: Verificar que compila**

```bash
npx tsc --noEmit
npx eslint "src/app/(admin)/admin/categorias/components/categorias-client.tsx"
```

- [ ] **Step 6: Verificar en el navegador**

Abrir `/admin/categorias`, editar una categoría con al menos un insumo (ej. "Tela" en Comedor), confirmar que aparece el campo de peso + el botón de IA (ícono de chispas), que al tocarlo se rellena el campo, y que se puede editar el valor antes de guardar. Repetir en un ítem individual (esquema + extra).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(admin)/admin/categorias/components/categorias-client.tsx"
git commit -m "feat: campo de peso + sugerencia con IA para insumos en /admin/categorias"
```

---

## Task 8: UI — campo `peso_kg` + botón gateado en el Cotizador

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx`

Lee el archivo completo con Read antes de editar — cambió hoy mismo (modal de "cantidad no puede ser 0").

- [ ] **Step 1: Pasar si el plan incluye IA como prop**

`GrupoItemCard` necesita saber si el plan de la empresa incluye IA para mostrar u ocultar el botón. Agrega la prop a la interfaz `Props` y a la firma del componente:

```ts
interface Props {
  item: ItemConImagen
  catalogo: ItemCatalogo[]
  conEmpresa: (url: string) => string
  onChange: (item: ItemConImagen) => void
  onQuitar: () => void
  onDuplicar: () => void
  fotosGrupo?: { base64: string; preview: string }[]
  onElegir?: () => void
  // Gatea el botón "Sugerir peso con IA" de los insumos — mismo criterio que
  // ya usa el precio de mercado (Impulso Sostenible en adelante).
  incluyeIA: boolean
}
```

Y en la firma: `export function GrupoItemCard({ item, catalogo, conEmpresa, onChange, onQuitar, onDuplicar, fotosGrupo, onElegir, incluyeIA }: Props) {`.

(El componente padre que renderiza `<GrupoItemCard .../>` — en `src/app/(empresa)/empresa/cotizador/nueva/page.tsx` — necesita pasar esta prop. Busca dónde ya calcula o consulta el plan de la empresa en esa página; si no lo hace todavía, agrega una consulta a `empresas.plan` + `planIncluyeIA` al cargar la página, igual que hace `precio-mercado/route.ts` en el backend. Si la página ya tiene el plan disponible en algún estado/prop existente, reusa ese valor en vez de agregar una consulta nueva.)

- [ ] **Step 2: Agregar el campo de peso + botón a la fila de insumo**

En `insumos.map((ins, i) => ...)`, dentro del `<div className="flex items-center gap-2 flex-shrink-0">` que ya tiene cantidad y precio, agrega el campo de peso:

```tsx
<div className="flex items-center gap-2 flex-shrink-0">
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent">
    <input type="number" min={0} step="0.01" value={ins.cantidad} onChange={e => actualizarInsumo(i, { cantidad: parseNumero(e.target.value) })} className="w-12 text-right text-sm outline-none border-none p-0 bg-transparent" />
    <span className={`text-xs ${ts}`}>{ins.unidad || 'und'}</span>
  </div>
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent">
    <input type="number" min={0} step="0.001" value={(ins as { peso_kg?: number }).peso_kg ?? ''} onChange={e => actualizarInsumo(i, { peso_kg: parseNumero(e.target.value) } as Partial<{ nombre: string; cantidad: number; precio_unitario: number }>)} className="w-14 text-right text-sm outline-none border-none p-0 bg-transparent" placeholder="peso" />
    <span className={`text-xs ${ts}`}>kg</span>
  </div>
  {incluyeIA && (
    <button
      type="button"
      onClick={async () => {
        if (!ins.nombre.trim()) return
        const res = await fetch(conEmpresa('/api/cotizador/insumos/peso-sugerido'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: ins.nombre.trim(), unidad: ins.unidad || 'unidad' }),
        })
        const data = await res.json()
        if (res.ok && data.ok) actualizarInsumo(i, { peso_kg: data.peso_kg } as Partial<{ nombre: string; cantidad: number; precio_unitario: number }>)
      }}
      className="p-1.5 rounded-lg text-[#00827C] hover:opacity-70 flex-shrink-0"
      title="Sugerir peso con IA"
    >
      <Sparkles size={16} />
    </button>
  )}
  <span className={`text-sm font-medium ${ts}`}>$</span>
  <input type="number" min={0} value={ins.precio_unitario} onChange={e => actualizarInsumo(i, { precio_unitario: parseNumero(e.target.value) })} className="w-24 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-right text-sm outline-none focus:border-[#00827C]" />
</div>
```

(Reemplaza el `<div className="flex items-center gap-2 flex-shrink-0">` completo de esa fila por este.)

Agrega `Sparkles` al import de íconos ya existente (línea 5: `import { Trash2 as Trash, Leaf, CircleDollarSign, Plus, Copy, ZoomIn } from '@/components/ui/icons'`), sumándolo a esa lista.

Amplía la firma de `actualizarInsumo` para aceptar `peso_kg`:

```ts
function actualizarInsumo(i: number, patch: Partial<{ nombre: string; cantidad: number; precio_unitario: number; peso_kg: number }>) {
```

(Encuéntrala en el archivo — ya existe con una firma más corta, solo agrégale `peso_kg: number` a la unión de campos del `Partial`. Quita entonces el cast `as Partial<{ nombre: string; cantidad: number; precio_unitario: number }>` de los 2 `onChange` de arriba, ya no hace falta.)

- [ ] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
npx eslint "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx" "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
```

- [ ] **Step 4: Verificar en el navegador**

Con una empresa en plan Impulso Sostenible o superior, abrir el Cotizador, agregar un insumo ad-hoc, confirmar que aparece el campo de peso y el botón de IA, y que sugiere un valor real. Con una empresa en plan Circular Lab (sin IA), confirmar que el botón NO aparece, solo el campo manual.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx" "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "feat: campo de peso + sugerencia con IA (gateada por plan) para insumos del Cotizador"
```

---

## Task 9: Verificación final

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Tipos, lint y tests limpios**

```bash
npx tsc --noEmit
npx eslint src/lib/ia/peso-insumo.ts src/lib/ia/peso-insumo-cache.ts src/lib/ia/peso-insumo-cache.test.ts src/lib/schemas/dimensiones.schema.ts src/app/api/admin/insumos/peso-sugerido/route.ts src/app/api/cotizador/insumos/peso-sugerido/route.ts "src/app/(admin)/admin/categorias/components/categorias-client.tsx" "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"
npx vitest run src/lib/ia/peso-insumo-cache.test.ts
```

- [ ] **Step 2: Reinicio limpio**

```bash
npx pm2 restart reuso --update-env
```

- [ ] **Step 3: Prueba manual end-to-end**

1. Correr `sql/135_peso_insumos.sql` en Supabase (staging) — avisar al usuario, no ejecutarla desde el plan.
2. En `/admin/categorias`, crear/editar un insumo con nombre real (ej. "Barniz poliuretánico", unidad "litro"), tocar "Sugerir con IA", confirmar que llega un peso con una URL `https://` real de fuente, editarlo si hace falta, guardar.
3. Repetir la misma búsqueda una segunda vez (mismo nombre+unidad) y confirmar en los logs/red que la segunda vez responde del caché (`origen: 'cache'`), sin llamar a Gemini/OpenRouter.
4. En el Cotizador, con una empresa sin IA, confirmar que el botón no aparece. Con una empresa con IA, confirmar que sí, y que reutiliza el mismo caché si el insumo ya se buscó desde `/admin/categorias`.
5. Confirmar que `item_insumos.peso_kg`/`categoria_insumos_base.peso_kg` quedan guardados correctamente tras un ciclo completo de guardar.

- [ ] **Step 4: Registrar en el Vault**

Agregar una entrada en `/Users/merinop/Documents/Automatizaciones/Bobedas/Reuso/diario/` del día de la implementación, y actualizar `calculos/05-indice-flujo-lineal-mci.md` para reflejar que el catálogo de insumos ya soporta `peso_kg` (el hueco de dato para `F_U` está resuelto del lado del catálogo — el MCI en sí sigue sin código).
