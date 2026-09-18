# Factor CO₂/agua de materiales con Perplexity — Diseño

## Contexto

`EditorMateriales` (`src/app/(admin)/admin/categorias/components/categorias-client.tsx:256`) es el componente único usado tanto al crear una categoría nueva como al editarla (`FormNodo`, línea ~884) para definir el esquema ambiental de sus materiales: `factor_co2_kg`, `factor_agua_l_kg`, `categoria_material`, `origen_fuente`, `detalle_fuente`. Hoy se llenan a mano, sin ninguna ayuda, y `nivel_confianza` queda fijo en `'baja'` sin importar la fuente real que se escriba.

Estos factores son compartidos por TODOS los ítems de la categoría — un error aquí se propaga a cada cálculo de CO₂/agua de cada ítem que use ese material. Por eso este diseño usa la **Agent API de Perplexity** (`POST /v1/agent`, alias `/v1/responses`, modelo `perplexity/sonar` + herramienta `web_search`), verificada en vivo: encuentra fichas técnicas reales con peso/densidad exactos y URLs reales, a cambio de más tiempo (~7s) y costo (~$0.004) que el patrón de Gemini/OpenRouter ya usado para el peso por ítem — justificado aquí por el impacto compartido del dato.

Esto es una capacidad nueva y deliberadamente separada de `peso-materiales-item.ts` (que sigue usando Gemini/OpenRouter sin cambios) — decisión explícita del usuario de no enrutar todo por Perplexity.

## Decisiones confirmadas con el usuario

- **Alcance**: solo `EditorMateriales` (crear/editar categoría). No se toca `/admin/catalogo-pendientes` en esta ronda (queda identificado como candidato futuro).
- **Campo vacío**: la IA lo llena directo, acepta hasta una estimación razonada (confianza baja, sin URL) si no hay una fuente técnica exacta — mismo criterio que ya se usa para el peso por ítem.
- **Campo que YA tiene un valor**: nunca se sobreescribe solo. Si la IA encuentra un valor de una fuente real (confianza alta o media, con URL) que difiere en más del 10% del valor actual, se muestra un aviso en esa fila con dos botones, "Reemplazar" y "Descartar" — el cambio solo se aplica si el super_admin confirma. Si la diferencia es ≤10%, o la IA solo tiene una estimación de confianza baja, no se muestra ningún aviso (evita ruido).
- **Sin fallback a Gemini/OpenRouter**: es una capacidad deliberadamente distinta, no un respaldo más del patrón existente.
- **Con caché global** (agregado tras revisar el costo real con el usuario): a diferencia del peso por ítem, el factor de CO2/agua de un material como "Hierro" es casi una constante física — no varía por categoría ni por empresa. Mismo patrón exacto que `peso_insumos_referencia`/`peso-insumo-cache.ts`: tabla nueva `factores_material_referencia` (única por `nombre_normalizado`), se consulta ANTES de llamar a Perplexity y se escribe después de cualquier resultado con `ok:true` (sin filtrar por nivel de confianza, mismo criterio que el caché de insumos). Solo los materiales que no estén en caché disparan una llamada real a Perplexity — con categorías repetidas (Muebles, Sillas, etc. suelen compartir Madera/Tela/Espuma/Metal), la mayoría de los clics después del primero no gastan nada.

## Arquitectura

### `sql/136_factores_material_referencia.sql` (nueva migración, la corre el usuario a mano)

```sql
CREATE TABLE IF NOT EXISTS factores_material_referencia (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_normalizado text NOT NULL UNIQUE,
  factor_co2_kg      numeric(10,4) NOT NULL,
  factor_agua_l_kg   numeric(10,4),
  fuente_url         text,
  fuente_titulo      text,
  confianza          text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
```

### `src/lib/ia/factor-material-cache.ts` (nuevo, mismo patrón que `peso-insumo-cache.ts`)

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizarNombreMaterial(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

interface FactorCacheado {
  factor_co2_kg: number
  factor_agua_l_kg: number | null
  fuente_url: string | null
  fuente_titulo: string | null
  confianza: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buscarEnCache(adminClient: SupabaseClient<any>, nombre: string): Promise<FactorCacheado | null> {
  const { data } = await adminClient
    .from('factores_material_referencia')
    .select('factor_co2_kg, factor_agua_l_kg, fuente_url, fuente_titulo, confianza')
    .eq('nombre_normalizado', normalizarNombreMaterial(nombre))
    .maybeSingle()
  return data ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function guardarEnCache(adminClient: SupabaseClient<any>, nombre: string, valores: FactorCacheado): Promise<void> {
  await adminClient
    .from('factores_material_referencia')
    .upsert(
      { nombre_normalizado: normalizarNombreMaterial(nombre), ...valores },
      { onConflict: 'nombre_normalizado' }
    )
}
```

### `src/lib/ia/factor-material-categoria.ts` (nuevo)

```ts
import { z } from 'zod'

// A diferencia de peso-insumo.ts/peso-materiales-item.ts (Gemini+OpenRouter),
// esta función usa la Agent API de Perplexity con la herramienta web_search
// porque el factor de un material de categoría se comparte entre TODOS sus
// ítems — vale la pena una búsqueda real más lenta y cara para acertar aquí.
// Deliberadamente sin caché ni respaldo a otro proveedor: es una capacidad
// nueva y separada, no un tercer nivel del patrón existente.

const materialFactorSchema = z.object({
  nombre: z.string().min(1),
  factor_co2_kg: z.number().positive().nullable(),
  factor_agua_l_kg: z.number().positive().nullable(),
  confianza: z.enum(['alta', 'media', 'baja']).nullable(),
  fuente_titulo: z.string().min(1).max(200).nullable(),
  fuente_url: z.string().regex(/^https?:\/\//).nullable().optional(),
})

const respuestaSchema = z.object({
  materiales: z.array(materialFactorSchema),
})

export type MaterialFactorEstimado = z.infer<typeof materialFactorSchema>

export type ResultadoFactoresMaterial =
  | { ok: true; materiales: MaterialFactorEstimado[] }
  | { ok: false }

interface MaterialConsulta {
  nombre: string
  factor_co2_kg_actual: number | null
  factor_agua_l_kg_actual: number | null
}

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

function construirPrompt(materiales: MaterialConsulta[]): string {
  const lista = materiales
    .map(m => {
      const actual = m.factor_co2_kg_actual != null
        ? ` (valor actual registrado: ${m.factor_co2_kg_actual} kg CO2 eq/kg)`
        : ' (sin valor todavía)'
      return `- ${m.nombre}${actual}`
    })
    .join('\n')

  return `Eres un especialista en factores de emisión de gases de efecto invernadero y huella hídrica de materiales, según bases científicas reconocidas (ecoinvent, DEFRA, IPCC, EPA). Busca en internet el factor de CO2 (kg CO2 eq por 1 kg del material) y el factor de agua (L de agua por 1 kg del material) para cada uno de estos materiales:
${lista}

Para cada material:
1. Si encuentras un dato técnico real de una base reconocida, usa confianza "alta" o "media", con fuente_url real y fuente_titulo con el nombre de esa base o ficha.
2. Si no encuentras nada específico pero puedes dar una estimación razonada por el tipo de material, usa confianza "baja", fuente_url: null, fuente_titulo explicando el razonamiento.
3. Si de verdad no hay manera de estimar nada, pon factor_co2_kg: null, factor_agua_l_kg: null, confianza: null, fuente_titulo: null.

Responde ÚNICAMENTE con este JSON, un objeto por cada material EN EL MISMO ORDEN en que se listaron arriba, sin texto adicional:
{ "materiales": [ { "nombre": "...", "factor_co2_kg": <número o null>, "factor_agua_l_kg": <número o null>, "confianza": "alta"|"media"|"baja"|null, "fuente_titulo": "..."|null, "fuente_url": "https://..."|null } ] }`
}

export async function buscarFactoresMaterial(materiales: MaterialConsulta[]): Promise<ResultadoFactoresMaterial> {
  if (materiales.length === 0) return { ok: false }
  const key = process.env.PERPLEXITY_KEY
  if (!key) return { ok: false }

  try {
    const res = await fetch('https://api.perplexity.ai/v1/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        input: construirPrompt(materiales),
        tools: [{ type: 'web_search' }],
      }),
    })
    if (!res.ok) return { ok: false }

    const data = await res.json() as {
      output?: { type: string; content?: { type: string; text: string }[] }[]
    }
    const mensaje = data.output?.find(o => o.type === 'message')
    const texto = mensaje?.content?.find(c => c.type === 'output_text')?.text ?? ''
    if (!texto) return { ok: false }

    const json = parsearJSON(texto)
    if (!json || typeof json !== 'object') return { ok: false }

    const parsed = respuestaSchema.safeParse(json)
    if (!parsed.success) return { ok: false }

    return { ok: true, materiales: parsed.data.materiales }
  } catch {
    return { ok: false }
  }
}
```

**Nota de verificación pendiente en la Tarea 1 del plan**: la forma exacta de `data.output[].content[].type` ('output_text') se confirmó con una prueba en vivo durante el diseño, pero el ejecutor debe volver a imprimir la respuesta cruda una vez (`console.log` temporal, luego quitarlo) antes de confiar en el parseo, porque la Agent API es nueva en este proyecto y su forma no está protegida por un test existente en el repo.

### `POST /api/admin/materiales/factor-sugerido` (nuevo)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { buscarFactoresMaterial } from '@/lib/ia/factor-material-categoria'

const bodySchema = z.object({
  materiales: z.array(z.object({
    nombre: z.string().min(1),
    factor_co2_kg_actual: z.number().nullable(),
    factor_agua_l_kg_actual: z.number().nullable(),
  })).min(1),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  // 1. Resolver del caché lo que ya se conoce (constante física, no varía
  //    por categoría ni empresa) — solo lo que falte dispara Perplexity.
  const resultados: MaterialFactorEstimado[] = []
  const faltantes: typeof parsed.data.materiales = []
  for (const m of parsed.data.materiales) {
    const cacheado = await buscarEnCache(guard.adminClient, m.nombre)
    if (cacheado) {
      resultados.push({ nombre: m.nombre, factor_co2_kg: cacheado.factor_co2_kg, factor_agua_l_kg: cacheado.factor_agua_l_kg, confianza: cacheado.confianza as 'alta' | 'media' | 'baja' | null, fuente_titulo: cacheado.fuente_titulo, fuente_url: cacheado.fuente_url })
    } else {
      faltantes.push(m)
    }
  }

  // 2. Solo los que faltan van a Perplexity, y se guardan en caché después.
  if (faltantes.length > 0) {
    const resultado = await buscarFactoresMaterial(faltantes)
    if (resultado.ok) {
      for (const m of resultado.materiales) {
        resultados.push(m)
        if (m.factor_co2_kg !== null) {
          await guardarEnCache(guard.adminClient, m.nombre, { factor_co2_kg: m.factor_co2_kg, factor_agua_l_kg: m.factor_agua_l_kg, fuente_url: m.fuente_url ?? null, fuente_titulo: m.fuente_titulo, confianza: m.confianza })
        }
      }
    }
  }

  if (resultados.length === 0) return NextResponse.json({ ok: false })
  return NextResponse.json({ ok: true, materiales: resultados })
}
```

(el import de `buscarEnCache`/`guardarEnCache` desde `factor-material-cache.ts` se agrega junto a los demás en la cabecera del archivo)

### UI: `EditorMateriales` en `categorias-client.tsx`

- Botón nuevo "Sugerir con IA" (mismo estilo que `BotonCompletarMaterialesIA`), debajo del botón "Añadir material" (línea ~323).
- Nuevo estado local dentro de `EditorMateriales`: `cargandoIA` (boolean) y `discrepancias: Record<string, MaterialFactorEstimado>` (clave = nombre del material).
- Al hacer clic: llama al endpoint con todos los materiales de la fila (nombre + su `factor_co2_kg`/`factor_agua_l_kg` actuales, parseados a número o `null`).
- Por cada material en la respuesta:
  - Si el campo `factor_co2_kg` de esa fila estaba vacío → se llena directo (`factor_co2_kg`, `factor_agua_l_kg` si vino, `origen_fuente` = `fuente_titulo`, `detalle_fuente` = `fuente_url`).
  - Si ya tenía un valor → se compara: si `Math.abs(sugerido - actual) / actual > 0.10` Y `confianza` es `'alta'` o `'media'` → se guarda en `discrepancias[nombre]`, NO se aplica todavía.
- Debajo de cada fila con una discrepancia pendiente: un aviso (`bg-[var(--color-warning)]/10`, texto pequeño) con el valor sugerido + fuente, y dos botones `Button size="sm"` (`variant="secondary"` "Descartar" / `variant="primary"` "Reemplazar"). Al confirmar, se aplica el valor sugerido a esa fila y se quita de `discrepancias`. Al descartar, solo se quita de `discrepancias`, sin tocar la fila.

## QA manual

Nueva entrada en `/admin/qa` (siguiente id después de `adm-29`): crear una categoría de prueba con 2 materiales (uno nuevo sin factor, uno con un factor ya puesto a propósito muy distinto de la realidad, ej. "Hierro" con factor CO2 en 999), hacer clic en "Sugerir con IA", confirmar que el material vacío se llena solo y que el material con el valor absurdo muestra el aviso de discrepancia con botones Reemplazar/Descartar, y que Reemplazar sí cambia el valor y Descartar lo deja igual.

## Verificación

- `npx tsc --noEmit` / `npx eslint` limpios en los 3 archivos.
- Prueba manual real contra la API de Perplexity (con `PERPLEXITY_KEY` ya en `.env.local`) antes de dar por buena la Tarea 1 — la forma de la respuesta no tiene precedente en este repo, no se puede confiar solo en la lectura de la documentación.
- Confirmar que un material con un valor ya puesto y SIN discrepancia real (diferencia ≤10%) no muestra ningún aviso.
- Confirmar que "Descartar" no modifica el valor existente, y que "Reemplazar" sí actualiza `origen_fuente`/`detalle_fuente` además del factor numérico.
- Confirmar el caché: pedir el factor de un material (ej. "Hierro"), luego crear una categoría distinta con un material del mismo nombre y pedirlo de nuevo — la segunda vez debe responder casi instantáneo (sin la demora de ~7s de la búsqueda real), confirmando que salió del caché y no volvió a llamar a Perplexity.
