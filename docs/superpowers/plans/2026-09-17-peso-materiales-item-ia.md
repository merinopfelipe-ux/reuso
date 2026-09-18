# Peso de materiales por ítem con IA — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Completar materiales con IA" en la ficha de ítem de `/admin/categorias` que llena el peso (`peso_kg`) de todos los materiales del ítem con una sola llamada a la IA, sin tocar factor CO₂/agua.

**Architecture:** Una función pura nueva (`buscarPesosMaterialesItem`, mismo patrón que `peso-insumo.ts`: Gemini con búsqueda web + respaldo OpenRouter, JSON validado con Zod) detrás de un endpoint (`POST /api/admin/materiales/peso-sugerido-item`, `requireSuperAdmin`), consumido por un botón nuevo en `categorias-client.tsx` que sobrescribe `pesos`/`extraMateriales` con la respuesta. Sin caché compartida (a diferencia de insumos): el peso de un material depende del ítem específico.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zod, Gemini API (grounding), OpenRouter (respaldo), Supabase (solo para el guard de auth, sin escritura nueva en BD).

---

## Contexto que el ejecutor necesita

- Repo trabaja directo sobre `main`, sin PR (Regla de Oro #1 del `CLAUDE.md` del repo) — cada tarea se comitea directo.
- El endpoint hermano `src/app/api/admin/insumos/peso-sugerido/route.ts` y la función `src/lib/ia/peso-insumo.ts` son la plantilla exacta a seguir para el estilo de prompt/parseo/manejo de errores — léelos antes de escribir el archivo nuevo si algo no queda claro con el código de abajo (ya están copiados aquí completos, no hace falta reinterpretarlos).
- Ni `peso-insumo.ts` ni `precio-mercado.ts` (los 2 patrones de IA ya existentes en el proyecto) tienen test unitario — llaman a una API externa real, no son deterísticos. Este plan sigue el mismo criterio: no se escribe un test unitario para la función de IA nueva. Sí hay verificación manual al final (Tarea 5).
- `requireSuperAdmin` vive en `src/lib/admin-guard.ts` y ya se usa en el endpoint de insumos — mismo import, mismo patrón, no se reinventa.
- El ícono `Loader2` ya existe en el hub `src/components/ui/icons.tsx` (línea 943, envuelve `Lucide.Loader2`) — falta importarlo en `categorias-client.tsx`.

---

### Task 1: Función de IA — `src/lib/ia/peso-materiales-item.ts`

**Files:**
- Create: `src/lib/ia/peso-materiales-item.ts`

- [ ] **Step 1: Crear el archivo completo**

```ts
import { z } from 'zod'

// Peso de cada material de UN ítem específico, estimado por IA en una sola
// llamada (no una por material, para ahorrar tokens). A diferencia de
// peso-insumo.ts, este valor NO es una constante reutilizable entre ítems
// (la madera de una silla pesa distinto que la de un comedor), así que no
// hay tabla de caché — ver src/lib/ia/peso-insumo-cache.ts para contraste.
// factor_co2_kg/factor_agua_l_kg nunca se tocan aquí: son valores curados
// por el super_admin a nivel de categoría, compartidos por todos los ítems.

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

function construirPrompt(nombreItem: string, categoriaNombre: string, materiales: string[]): string {
  const lista = materiales.map(m => `- ${m}`).join('\n')
  return `Eres un investigador de materiales de tapicería/carpintería/restauración en Colombia. Para el ítem "${nombreItem}" (categoría: "${categoriaNombre}"), estima el peso en kg de cada uno de estos materiales que lo componen:
${lista}

Para cada material, sigue este orden:
1. Si encuentras datos técnicos confiables (fichas de fabricante, catálogos, densidades conocidas de ese material), úsalos. confianza: "alta" o "media", fuente_url con la URL real.
2. Si no encuentras nada confiable, da un estimado razonado por densidad típica del material y el tamaño típico de un ítem como este. confianza: "baja", fuente_url: null, fuente_titulo explicando el razonamiento (ej. "Estimación por densidad típica de madera de cedro en silla de comedor").
3. Solo si de verdad no puedes estimar nada (ni por densidad ni por tipo de ítem), pon peso_kg_estimado: null, confianza: null, fuente_titulo: null para ese material. Nunca inventes un número sin ningún razonamiento.

Responde ÚNICAMENTE con este JSON, un objeto por cada material EN EL MISMO ORDEN en que se listaron arriba, sin texto adicional:
{ "materiales": [ { "nombre": "...", "peso_kg_estimado": <número o null>, "confianza": "alta"|"media"|"baja"|null, "fuente_titulo": "..."|null, "fuente_url": "https://..."|null } ] }`
}

async function llamarGemini(prompt: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 700,
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

async function llamarOpenRouter(prompt: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-72b-instruct:online',
        max_tokens: 700,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

export async function buscarPesosMaterialesItem(nombreItem: string, categoriaNombre: string, materiales: string[]): Promise<ResultadoPesosMateriales> {
  if (materiales.length === 0) return { ok: false }

  const prompt = construirPrompt(nombreItem, categoriaNombre, materiales)

  let resultado = await llamarGemini(prompt)
  if (!resultado.ok) {
    resultado = await llamarOpenRouter(prompt)
  }
  if (!resultado.ok) return { ok: false }

  const json = parsearJSON(resultado.raw)
  if (!json || typeof json !== 'object') return { ok: false }

  const parsed = respuestaSchema.safeParse(json)
  if (!parsed.success) return { ok: false }

  return { ok: true, materiales: parsed.data.materiales }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores relacionados a `src/lib/ia/peso-materiales-item.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ia/peso-materiales-item.ts
git commit -m "feat: función de IA para estimar el peso de todos los materiales de un ítem en una sola llamada"
```

---

### Task 2: Endpoint — `POST /api/admin/materiales/peso-sugerido-item`

**Files:**
- Create: `src/app/api/admin/materiales/peso-sugerido-item/route.ts`

- [ ] **Step 1: Crear el archivo completo**

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

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const resultado = await buscarPesosMaterialesItem(
    parsed.data.nombre_item,
    parsed.data.categoria_nombre,
    parsed.data.materiales
  )
  if (!resultado.ok) {
    return NextResponse.json({ ok: false })
  }

  return NextResponse.json({ ok: true, materiales: resultado.materiales })
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores relacionados a este archivo.

- [ ] **Step 3: Verificar que rechaza sin sesión**

Run (con el servidor `reuso` de PM2 corriendo en `localhost:3000`):
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/admin/materiales/peso-sugerido-item \
  -H "Content-Type: application/json" \
  -d '{"nombre_item":"Silla","categoria_nombre":"Muebles","materiales":["Madera"]}'
```
Expected: `401` (sin cookie de sesión válida, `requireSuperAdmin` rechaza).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/materiales/peso-sugerido-item/route.ts
git commit -m "feat: endpoint POST /api/admin/materiales/peso-sugerido-item"
```

---

### Task 3: Botón en la UI — `categorias-client.tsx`

**Files:**
- Modify: `src/app/(admin)/admin/categorias/components/categorias-client.tsx:7` (import de íconos)
- Modify: `src/app/(admin)/admin/categorias/components/categorias-client.tsx:369` (después de `BotonSugerirPeso`, nuevo componente)
- Modify: `src/app/(admin)/admin/categorias/components/categorias-client.tsx:1569` (dentro de `PanelItemValores`, después del botón "Añadir material")

- [ ] **Step 1: Agregar `Loader2` al import de íconos**

En la línea 7, el import actual es:
```ts
import { ChevronRight as CaretRight, Plus, Power, Pencil, Folder, EllipsisVertical as DotsThree, Leaf, CircleDollarSign, Trash, Lock, LockOpen, Sparkles } from '@/components/ui/icons'
```
Reemplázalo por:
```ts
import { ChevronRight as CaretRight, Plus, Power, Pencil, Folder, EllipsisVertical as DotsThree, Leaf, CircleDollarSign, Trash, Lock, LockOpen, Sparkles, Loader2 } from '@/components/ui/icons'
```

- [ ] **Step 2: Agregar el componente `BotonCompletarMaterialesIA` después de `BotonSugerirPeso`**

Justo después de la línea 369 (el `}` que cierra `BotonSugerirPeso`), agrega:

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

- [ ] **Step 3: Insertar el botón dentro de `PanelItemValores`, después de "Añadir material"**

Busca esta línea (hoy en 1569, puede haberse movido un poco tras el Step 2 — ubícala por el texto exacto):
```tsx
            <button type="button" onClick={() => setExtraMateriales(r => [...r, filaMaterial()])} className={`${btnChico} mb-2`}><Plus size={12} /> Añadir material</button>
          </div>
```
Reemplázala por:
```tsx
            <button type="button" onClick={() => setExtraMateriales(r => [...r, filaMaterial()])} className={`${btnChico} mb-2`}><Plus size={12} /> Añadir material</button>

            <BotonCompletarMaterialesIA
              nombreItem={nombre}
              categoriaNombre={categoria.nombre}
              materiales={[...esquemaMatVisibles, ...extraMateriales.filter(m => m.nombre.trim())]}
              onCompletado={resultados => {
                for (const r of resultados) {
                  if (r.peso_kg === null) continue
                  if (esquemaMatVisibles.some(m => m.nombre === r.nombre)) {
                    setPesos(p => ({ ...p, [r.nombre]: String(r.peso_kg) }))
                  } else {
                    setExtraMateriales(prev => prev.map(m => m.nombre === r.nombre ? { ...m, peso_kg: String(r.peso_kg) } : m))
                  }
                }
              }}
            />
          </div>
```

Nota: `nombre` es el estado del nombre del ítem (ya existe en `PanelItemValores`, declarado como `const [nombre, setNombre] = useState(item?.nombre ?? '')`). `categoria` es la prop del componente (`CategoriaConEsquemaBase`, ya trae `.nombre`). `esquemaMatVisibles` y `extraMateriales`/`setExtraMateriales`/`setPesos` ya existen en el mismo scope — no hay que declarar nada nuevo.

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificar lint**

Run: `npx eslint "src/app/(admin)/admin/categorias/components/categorias-client.tsx"`
Expected: sin errores nuevos.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/admin/categorias/components/categorias-client.tsx"
git commit -m "feat: botón 'Completar materiales con IA' en la ficha de ítem de /admin/categorias"
```

---

### Task 4: Entrada de QA manual

**Files:**
- Modify: `src/app/(admin)/admin/qa/page.tsx`

- [ ] **Step 1: Confirmar el siguiente id disponible**

Run: `grep -n "id: 'adm-" "src/app/(admin)/admin/qa/page.tsx" | tail -3`
Expected: el último id visible hoy es `adm-28` — usa `adm-29`. Si al ejecutar esta tarea ya existe un `adm-29` (otro trabajo se adelantó), usa el siguiente número libre.

- [ ] **Step 2: Agregar la entrada**

Busca el cierre del array de casos QA (la entrada `adm-28` ya existente, termina en `journeys: ['Admin Operativa']\n  },`) y agrega justo después, con el mismo formato que las entradas vecinas:

```ts
  {
    id: 'adm-29', categoria: 'Panel Admin', ruta: '/admin/categorias', critica: false,
    titulo: 'Completar el peso de materiales de un ítem con IA',
    descripcion: 'Al crear o editar un ítem, un botón permite pedirle a la IA que estime el peso de todos los materiales listados en una sola llamada, sin tocar factor CO2 ni agua.',
    pasos: [
      'Entra a una categoría con al menos 2 materiales y crea un ítem nuevo (o abre uno existente).',
      'Escribe un nombre real para el ítem (ej. "Silla Comedor de prueba").',
      'Haz clic en "Completar materiales con IA", debajo de la lista de materiales.',
      'Espera a que el botón termine de cargar (ícono de reloj gira mientras tanto).'
    ],
    esperado: 'Los campos de peso de los materiales se llenan con valores numéricos mayores a 0. El factor CO2 y el factor de agua de cada material NO cambian. El ítem se puede guardar sin error después.',
    journeys: ['Admin Operativa']
  },
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/admin/qa/page.tsx"
git commit -m "test: agregar adm-29 (QA manual) para completar materiales con IA"
```

---

### Task 5: Verificación manual en vivo

**Files:** ninguno (solo verificación, sin cambios de código)

- [ ] **Step 1: Reiniciar el servidor de desarrollo limpio**

```bash
cd /Users/merinop/Documents/Automatizaciones/Reuso
npx pm2 stop reuso && rm -rf .next && npx pm2 restart reuso --update-env
```
Expected: PM2 muestra `reuso` en estado `online`.

- [ ] **Step 2: Confirmar que la ruta responde**

```bash
sleep 5 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/categorias
```
Expected: `307` (redirige a login sin sesión, confirma que el servidor ya compiló la ruta).

- [ ] **Step 3: Ejecutar el caso `adm-29` a mano**

Como super_admin, sigue los pasos de la Tarea 4 en el navegador real (`Cmd+Shift+R` antes de probar). Confirma:
- El botón "Completar materiales con IA" está deshabilitado si el campo "Nombre del ítem" está vacío.
- Con nombre y al menos 1 material en la lista, el botón se activa.
- Al hacer clic, los pesos se llenan con números razonables (no ceros, no vacíos, salvo que la IA de verdad no haya encontrado nada para alguno).
- Un peso que ya estaba escrito a mano se reemplaza (comportamiento esperado, no un bug).
- Factor CO2 y factor de agua de cada material no cambiaron.
- El ítem se guarda sin error después de usar el botón.

- [ ] **Step 4: Marcar el caso como verificado en `/admin/qa`**

Desde el propio panel `/admin/qa`, marca `adm-29` como pasado (si la pantalla lo permite) o dilo explícitamente en la conversación con el usuario.

---

## Self-Review (ya aplicado antes de guardar este plan)

**1. Cobertura de la spec:** los 4 puntos de la sección "Decisiones confirmadas" del diseño están cubiertos — alcance solo peso (Task 1, el prompt nunca pide CO2/agua), solo `/admin/categorias` (Task 3, sin tocar `grupo-item-card.tsx`), reemplaza cualquier valor existente (Task 3 Step 3, sin filtrar por vacío), fallback en 2 niveles antes de dejar vacío (Task 1, prompt), QA manual sin e2e (Task 4/5).

**2. Placeholders:** ninguno — cada paso de código trae el archivo completo o el diff exacto a aplicar, cada comando trae su resultado esperado.

**3. Consistencia de tipos:** `MaterialPesoEstimado`/`ResultadoPesosMateriales` (Task 1) se usan tal cual en la respuesta del endpoint (Task 2) y el componente los consume con la forma `{ nombre, peso_kg_estimado, confianza, fuente_titulo, fuente_url }` en las 3 tareas por igual — sin nombres de campo distintos entre tareas.
