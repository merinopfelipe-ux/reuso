# Peso de materiales por ítem con asistencia de IA — Diseño

## Contexto

Al crear o editar un ítem en `/admin/categorias` (`PanelItemValores`), la sección "Cálculo ambiental" lista los materiales de la categoría (heredados de `categoria_materiales_base`) más los que el super_admin agregue a mano (`extraMateriales`). Cada material tiene un campo de peso (`peso_kg`) que hoy se llena solo a mano, sin ninguna ayuda.

Ya existe un patrón equivalente para **insumos**: el botón `BotonSugerirPeso` (ícono ✨) llama a `/api/admin/insumos/peso-sugerido`, que usa `buscarPesoInsumo` (`src/lib/ia/peso-insumo.ts` — Gemini con búsqueda web + respaldo OpenRouter, JSON validado con Zod) y cachea el resultado en `peso_insumos_referencia` porque el peso de un insumo (ej. "1 litro de barniz") es casi una constante física, reutilizable entre ítems.

El peso de un **material** dentro de un ítem NO es una constante reutilizable: depende del ítem específico (la madera de una "Silla Reina Ana" pesa distinto que la de un "Comedor 6 puestos"). Por eso este diseño es una función y un endpoint nuevos, sin caché compartida, pensados para pedir el peso de TODOS los materiales de un ítem en una sola llamada a la IA (no una por material).

`factor_co2_kg` y `factor_agua_l_kg` quedan completamente fuera de este diseño: son valores científicos curados por el super_admin a nivel de categoría (con su propia fuente y nivel de confianza), compartidos por todos los ítems de esa categoría — la IA nunca los toca.

Esta pantalla (`/admin/categorias`) es exclusiva de `super_admin` (confirmado en `middleware.ts`: cualquier ruta bajo `/admin` redirige a quien no tenga ese rol). Ninguna empresa llega aquí, así que el gate de `planIncluyeIA` (usado en el Cotizador para el mismo tipo de botón) no aplica — el único guard necesario es `requireSuperAdmin`, igual que el endpoint de insumos.

## Decisiones confirmadas con el usuario

- Alcance: solo `peso_kg`. Nunca `factor_co2_kg`/`factor_agua_l_kg`.
- Solo en `/admin/categorias`, no en el Cotizador (`grupo-item-card.tsx`) — puede agregarse ahí después como una ronda aparte, reusando el mismo endpoint.
- El botón actúa sobre **todos** los materiales listados en ese momento (heredados de la categoría + extra ya nombrados), sin filtrar por si ya tienen un valor — **reemplaza** cualquier peso ya escrito.
- Si la IA no encuentra un dato confiable para un material puntual, debe intentar un estimado razonado (por densidad típica / tipo de ítem) antes de darse por vencida — solo se deja vacío si de verdad no hay manera de estimar nada.
- Verificación: entrada de QA manual nueva en `/admin/qa`, sin prueba e2e automática (depende de una IA real con búsqueda en vivo, mismo criterio que ya aplica a `BotonSugerirPeso` y al precio de mercado del Cotizador, ninguno de los dos tiene prueba automática hoy).

## Arquitectura

### `src/lib/ia/peso-materiales-item.ts` (nuevo)

Función pura `buscarPesosMaterialesItem(nombreItem: string, categoriaNombre: string, materiales: string[]): Promise<ResultadoPesosMateriales>`, calcada del estilo de `peso-insumo.ts`:

```ts
import { z } from 'zod'

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const materialEstimadoSchema = z.object({
  nombre: z.string().min(1),
  peso_kg_estimado: z.number().positive().nullable(),
  confianza: z.enum(['alta', 'media', 'baja']).nullable(),
  fuente_titulo: z.string().min(1).max(200).nullable(),
  fuente_url: z.string().regex(/^https?:\/\//).nullable().optional(),
})

const respuestaSchema = z.object({
  materiales: z.array(materialEstimadoSchema),
})

export type MaterialPesoEstimado = z.infer<typeof materialEstimadoSchema>
export type ResultadoPesosMateriales =
  | { ok: true; materiales: MaterialPesoEstimado[] }
  | { ok: false }
```

**Prompt** (una sola llamada, pide un array JSON — no N llamadas sueltas):

```
Eres un investigador de materiales de tapicería/carpintería/restauración en
Colombia. Para el ítem "<nombreItem>" (categoría: "<categoriaNombre>"),
estima el peso en kg de cada uno de estos materiales que lo componen:
<lista de materiales, uno por línea>

Para cada material, sigue este orden:
1. Si encuentras datos técnicos confiables (fichas de fabricante, catálogos,
   densidades conocidas de ese material), úsalos. confianza: "alta" o "media",
   fuente_url con la URL real.
2. Si no encuentras nada confiable, da un estimado razonado por densidad
   típica del material y el tamaño típico de un ítem como este. confianza:
   "baja", fuente_url: null, fuente_titulo explicando el razonamiento (ej.
   "Estimación por densidad típica de madera de cedro en silla de comedor").
3. Solo si de verdad no puedes estimar nada (ni por densidad ni por tipo de
   ítem), pon peso_kg_estimado: null, confianza: null, fuente_titulo: null
   para ese material. Nunca inventes un número sin ningún razonamiento.

Responde ÚNICAMENTE con este JSON, un objeto por cada material en el mismo
orden que se listaron, sin texto adicional:
{ "materiales": [ { "nombre": "...", "peso_kg_estimado": <número o null>,
"confianza": "alta"|"media"|"baja"|null, "fuente_titulo": "..."|null,
"fuente_url": "https://..."|null } ] }
```

Mismo patrón de llamada que `peso-insumo.ts`: `llamarGemini` (con `tools: [{ google_search: {} }]`, `maxOutputTokens` más alto que el de insumos porque la respuesta es un array — ~600, `temperature: 0.1`) con `llamarOpenRouter` (`qwen/qwen2.5-72b-instruct:online`) como respaldo si Gemini falla o no responde. Mismo `parsearJSON` tolerante (extrae el bloque `{...}` aunque venga envuelto en markdown).

### `POST /api/admin/materiales/peso-sugerido-item` (nuevo)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { buscarPesosMaterialesItem } from '@/lib/ia/peso-materiales-item'

const bodySchema = z.object({
  nombre_item: z.string().min(1),
  categoria_nombre: z.string().min(1),
  materiales: z.array(z.string().min(1)).min(1),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const resultado = await buscarPesosMaterialesItem(
    parsed.data.nombre_item,
    parsed.data.categoria_nombre,
    parsed.data.materiales
  )
  if (!resultado.ok) return NextResponse.json({ ok: false })

  return NextResponse.json({ ok: true, materiales: resultado.materiales })
}
```

Sin caché: no se escribe en ninguna tabla de referencia (a diferencia de `peso_insumos_referencia`), porque el resultado es específico del ítem y cachearlo por nombre de material le daría a un ítem distinto el peso calculado para otro.

### UI: `categorias-client.tsx`

Nuevo componente `BotonCompletarMaterialesIA`, junto a `BotonSugerirPeso`:

```tsx
function BotonCompletarMaterialesIA({ nombreItem, categoriaNombre, materiales, onCompletado }: {
  nombreItem: string
  categoriaNombre: string
  materiales: { nombre: string }[]
  onCompletado: (resultados: { nombre: string; peso_kg: number | null }[]) => void
}) {
  const [cargando, setCargando] = useState(false)
  const deshabilitado = !nombreItem.trim() || materiales.length === 0

  async function completar() {
    if (deshabilitado) return
    setCargando(true)
    try {
      const res = await fetch('/api/admin/materiales/peso-sugerido-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_item: nombreItem.trim(),
          categoria_nombre: categoriaNombre,
          materiales: materiales.map(m => m.nombre),
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        onCompletado(data.materiales.map((m: { nombre: string; peso_kg_estimado: number | null }) => ({ nombre: m.nombre, peso_kg: m.peso_kg_estimado })))
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={completar}
      disabled={cargando || deshabilitado}
      className={`${btnChico} w-full justify-center mt-2`}
      style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
    >
      {cargando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      Completar materiales con IA
    </button>
  )
}
```

Se coloca en `PanelItemValores`, dentro de la tarjeta "Cálculo ambiental", justo después del botón "Añadir material" (línea ~1533 de `categorias-client.tsx` hoy). La lista de materiales que se le pasa es `[...esquemaMatVisibles, ...extraMateriales.filter(m => m.nombre.trim())]` (todos los que tienen nombre, sin filtrar por peso vacío).

`onCompletado` recorre los resultados y, para cada uno con `peso_kg !== null`, actualiza `setPesos` (si es un material del esquema de la categoría) o `setExtraMateriales` (si es uno extra) — sobrescribiendo el valor que hubiera. Los que vinieron en `null` no se tocan (quedan como estaban, casi siempre vacíos en el momento de crear el ítem).

Si el `fetch` falla completo (red caída, IA caída) o `res.ok`/`data.ok` es falso, no pasa nada visible — mismo comportamiento silencioso que ya tiene `BotonSugerirPeso` hoy (no hay un patrón de error visible para estos botones en el código actual, no se introduce uno nuevo aquí).

## QA manual

Nueva entrada en `/admin/qa` (siguiente id disponible después de `adm-28`, o el corresponsda al momento de implementar): crear un ítem de prueba efímero en una categoría con al menos 2 materiales, hacer clic en "Completar materiales con IA", confirmar que los pesos se llenan con valores numéricos razonables (mayores a 0) y que el ítem se guarda sin error después. Sin prueba e2e automática — depende de una respuesta real de un servicio de IA externo, no reproducible de forma determinística en Playwright (mismo criterio ya aplicado a `BotonSugerirPeso` y al precio de mercado del Cotizador).

## Verificación

- `npx tsc --noEmit` limpio.
- `npx eslint` limpio en los 3 archivos nuevos/tocados.
- Prueba manual: crear un ítem nuevo en una categoría real de prueba (nunca una categoría real de producción, ver regla de entidades efímeras), con 2-3 materiales, confirmar que "Completar materiales con IA" llena los pesos y que guardar el ítem funciona con esos valores.
- Confirmar que el botón queda deshabilitado sin nombre de ítem y sin materiales listados.
- Confirmar que un peso ya escrito a mano se reemplaza al hacer clic (comportamiento esperado, no un bug).
