# Peso por foto (DPP/Cotizador) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando la IA identifica un ítem por foto (en DPP o en el Cotizador), que también diga un peso total aproximado del objeto visto; si difiere más de 10% del peso genérico del catálogo, mostrar un aviso con botones "Usar este peso"/"Descartar" en la pantalla de detalle del registro ya confirmado — sin sobrescribir nada solo.

**Architecture:** Cero llamadas de IA nuevas — se agrega un campo opcional `peso_total_estimado_kg` a la respuesta de `diagnostico/route.ts` (la llamada de visión que ya existe). Al confirmar el ítem, el frontend compara ese número contra el peso del catálogo y, si supera el 10% de diferencia, lo manda a guardar en un campo nuevo `peso_foto_sugerido_kg` (columna nullable, una por tabla: `dpp_activos`, `crm_muebles_cotizados`). La pantalla de detalle de cada uno muestra el aviso si ese campo no es null; "Usar este peso" escala proporcionalmente los materiales guardados y limpia el campo, "Descartar" solo lo limpia.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres), Zod.

**No usar `using-git-worktrees`** — este repo trabaja directo sobre `main`, sin PR (Regla de Oro #1 del `CLAUDE.md` del repo).

---

### Task 1: Migración SQL

**Files:**
- Create: `sql/138_peso_foto_sugerido.sql`

- [ ] **Paso 1: Escribir la migración**

```sql
-- =====================================================================
-- Migración 138 — Peso sugerido por foto (contraste vs. catálogo)
-- Calculadora de Reúso | 2026-09-18
-- Ejecutar en Supabase → SQL Editor (staging y producción)
-- =====================================================================

-- Cuando diagnostico/route.ts estima un peso total viendo la foto real y
-- ese número difiere más de 10% del peso genérico del catálogo, se guarda
-- aquí como sugerencia pendiente de aceptar (nunca se aplica solo). Nunca
-- se agrega a item_materiales/items: es del registro confirmado, no del
-- catálogo compartido. Mismo patrón de columna nullable sin backfill que
-- sql/133/sql/135/sql/137.
ALTER TABLE dpp_activos
  ADD COLUMN IF NOT EXISTS peso_foto_sugerido_kg NUMERIC NULL;

ALTER TABLE crm_muebles_cotizados
  ADD COLUMN IF NOT EXISTS peso_foto_sugerido_kg NUMERIC NULL;
```

- [ ] **Paso 2: Avisar al usuario que la debe correr a mano**

Esta migración no se ejecuta desde código — el usuario la corre en el SQL Editor de Supabase (staging `rjcfqcqgqxoblisuyapq` primero, producción después). Sin este paso, los endpoints de las Tareas 3 y 5 fallarán al intentar guardar la columna nueva.

- [ ] **Paso 3: Commit**

```bash
git add sql/138_peso_foto_sugerido.sql
git commit -m "feat: columna peso_foto_sugerido_kg en dpp_activos y crm_muebles_cotizados"
```

---

### Task 2: `diagnostico/route.ts` — estimar el peso total viendo la foto

**Files:**
- Modify: `src/app/api/cotizador/diagnostico/route.ts`

- [ ] **Paso 1: Agregar el campo al esquema de un ítem detectado**

En `itemDetectadoSchema` (línea 50), agregar después de `confianza`:

```ts
const itemDetectadoSchema = z.object({
  item_nombre: z.string(),
  titulo: z.string().max(55),
  descripcion: z.string().max(190),
  cantidad: z.number().int().min(1).max(50),
  confianza: z.number().min(0).max(1),
  // Peso aproximado de TODO el objeto visto en la foto (un solo número, no
  // por material) — null si la foto no permite estimarlo con confianza
  // razonable (ángulo malo, objeto tapado). Nunca un porcentaje ni un
  // desglose: solo lo que la IA vería si tuviera el objeto enfrente.
  peso_total_estimado_kg: z.number().positive().nullable(),
  imagen_index: z.number().int().min(0),
  bounding_box: boundingBoxSchema.nullable().optional(),
})
```

- [ ] **Paso 2: Ajustar el prompt (`construirSystemPrompt`, línea 131)**

Cambiar la primera línea (que hoy prohíbe pesos) y agregar una instrucción nueva. Reemplazar:

```ts
  return `Eres perito visual de muebles para restauración. Solo clasificas lo que ves en las fotos, nunca calculas precios ni pesos.
```

por:

```ts
  return `Eres perito visual de muebles para restauración. Solo clasificas lo que ves en las fotos, nunca calculas precios ni desglosas materiales.
```

Y agregar, después del párrafo de "descripcion" (antes del párrafo de "bounding_box", línea 143), este párrafo nuevo:

```ts
Además, para cada mueble estima "peso_total_estimado_kg": el peso aproximado en kg de TODO el mueble, mirando su tamaño y tipo de material en la foto, como si lo levantaras. Es un solo número para el objeto completo, nunca un desglose por parte. Si la foto no te permite estimarlo con confianza razonable (ángulo malo, objeto parcialmente tapado, muy lejos), responde null en vez de inventar un número.
```

- [ ] **Paso 3: Agregar el campo al `responseSchema` de Gemini (línea 181)**

Dentro de `properties` de cada ítem (línea 190), agregar después de `confianza`:

```ts
                    confianza: { type: 'NUMBER', description: 'Confianza del match entre 0.0 y 1.0.' },
                    peso_total_estimado_kg: { type: 'NUMBER', nullable: true, description: 'Peso aproximado en kg de TODO el mueble visto en la foto, un solo número. null si no se puede estimar con confianza razonable.' },
```

Y agregar `'peso_total_estimado_kg'` a la lista `required` de ese objeto (línea 207):

```ts
                  required: ['item_nombre', 'titulo', 'descripcion', 'cantidad', 'confianza', 'peso_total_estimado_kg', 'imagen_index'],
```

- [ ] **Paso 4: Agregar el campo al mensaje de sistema de OpenRouter (línea 254)**

```ts
          { role: 'system', content: `${systemPrompt}\n\nResponde SOLO con JSON: { "items_detectados": [{ "item_nombre": string, "titulo": string, "descripcion": string, "cantidad": number, "confianza": number, "peso_total_estimado_kg": number | null, "imagen_index": number, "bounding_box": { "y_min": number, "x_min": number, "y_max": number, "x_max": number } | null }], "no_identificados": string[], "observaciones_visuales": string }` },
```

- [ ] **Paso 5: Exponerlo en `ItemDetectadoConSnapshot` y en la respuesta final**

En la interfaz (línea 81), agregar después de `confianza`:

```ts
export interface ItemDetectadoConSnapshot {
  item_id: string
  item_nombre: string
  titulo: string
  descripcion: string
  cantidad: number
  confianza: number
  peso_total_estimado_kg: number | null
  imagen_index: number
  bounding_box: BoundingBox | null
  factor_rentabilidad: number
  co2_evitado_kg_unidad: number
  agua_evitada_l_unidad: number
  peso_kg_unidad: number
  materiales: MaterialCompleto[]
  servicios: { nombre: string; precio: number }[]
  insumos: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[]
}
```

En el `.map()` que construye `itemsResueltos` (línea 466-490), agregar el campo al objeto devuelto, justo después de `confianza: d.confianza,`:

```ts
      confianza: d.confianza,
      peso_total_estimado_kg: d.peso_total_estimado_kg,
```

- [ ] **Paso 6: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin errores nuevos (los 3 preexistentes documentados en el proyecto — `categorias-client.tsx:744` y los 2 de `peso-sugerido/route.ts` — pueden seguir apareciendo, no son de este cambio).

- [ ] **Paso 7: Commit**

```bash
git add src/app/api/cotizador/diagnostico/route.ts
git commit -m "feat: diagnostico/route.ts estima peso_total_estimado_kg viendo la foto (misma llamada, sin costo extra)"
```

---

### Task 3: Cotizador — enviar `peso_foto_sugerido_kg` al confirmar el mueble

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx`
- Modify: `src/app/api/cotizador/cotizaciones/[id]/mueble/route.ts`
- Modify: `src/app/api/cotizador/cotizaciones/[id]/muebles/route.ts`

- [ ] **Paso 1: `construirItemStub` — null para ítems manuales (línea 82)**

`ItemConImagen` extiende `ItemDetectadoConSnapshot`, así que TypeScript va a exigir el campo nuevo en el stub. Agregar en el objeto devuelto, después de `confianza: opts.confianza ?? 0,`:

```ts
    confianza: opts.confianza ?? 0,
    peso_total_estimado_kg: null,
```

- [ ] **Paso 2: Verificar que falla sin el campo, para confirmar que TS lo exige**

```bash
npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"
```

Esperado antes del Paso 1: error de tipo faltante `peso_total_estimado_kg`. Después del Paso 1: sin ese error.

- [ ] **Paso 3: Calcular y enviar la sugerencia en `intentarGuardarItem` (línea 502-518)**

Antes del `fetch` a `.../mueble`, agregar el cálculo del umbral. Insertar justo antes de `const resMueble = await fetch(...)`:

```ts
      // Umbral 10%, mismo criterio ya usado para la discrepancia de factor
      // CO2/agua en /admin/categorias — silencio si la foto confirma el
      // promedio, aviso solo si se desfasa de verdad.
      const pesoFoto = item.peso_total_estimado_kg
      const pesoCatalogo = item.peso_kg_unidad
      const difiereMasDel10Porciento = pesoFoto != null && pesoCatalogo > 0
        && Math.abs(pesoFoto - pesoCatalogo) / pesoCatalogo > 0.10
```

Y en el body del `fetch`, agregar después de `factor_rentabilidad: item.factor_rentabilidad,`:

```ts
          factor_rentabilidad: item.factor_rentabilidad,
          peso_foto_sugerido_kg: difiereMasDel10Porciento ? pesoFoto : undefined,
```

- [ ] **Paso 4: Aceptar el campo en el endpoint de confirmación**

En `src/app/api/cotizador/cotizaciones/[id]/mueble/route.ts`, agregar al `schema` (después de `co2_evitado_kg_unidad`):

```ts
  co2_evitado_kg_unidad: z.number().nonnegative().optional(),
  peso_foto_sugerido_kg: z.number().positive().optional(),
```

Extraer el campo junto a los demás (línea ~81-84):

```ts
  const {
    item_id, cantidad, imagen_base64, mime_type,
    diagnostico_ia_json, fue_corregido_por_humano,
    peso_foto_sugerido_kg,
  } = parsed.data
```

Y en el `.insert()` (línea ~150), agregar después de `insumos_json: insumos,`:

```ts
      insumos_json: insumos,
      peso_foto_sugerido_kg: peso_foto_sugerido_kg ?? null,
```

- [ ] **Paso 5: Devolver el campo en la lista de muebles de la cotización**

En `src/app/api/cotizador/cotizaciones/[id]/muebles/route.ts` línea 46, agregar `peso_foto_sugerido_kg` a la lista de columnas del `.select(...)`:

```ts
.select('id, item_id, titulo, descripcion, tipo_mueble, categoria, oficios_json, cantidad, servicios_json, insumos_json, factor_rentabilidad, materiales_json, peso_foto_sugerido_kg, ajustes_humanos_json, precio_mueble, co2_evitado_kg, agua_evitada_l, imagen_url, diagnostico_ia_json, precio_mercado_nuevo, precio_mercado_fuente_url, precio_mercado_estado, oculto')
```

- [ ] **Paso 6: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin errores nuevos.

- [ ] **Paso 7: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx" "src/app/api/cotizador/cotizaciones/[id]/mueble/route.ts" "src/app/api/cotizador/cotizaciones/[id]/muebles/route.ts"
git commit -m "feat: Cotizador guarda peso_foto_sugerido_kg si la foto difiere >10% del catálogo al confirmar"
```

---

### Task 4: Cotizador — aviso y aplicar/descartar en el modal de editar mueble

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/[id]/components/editar-mueble-modal.tsx`
- Modify: `src/app/api/cotizador/cotizaciones/[id]/mueble/[muebleId]/route.ts`

- [ ] **Paso 1: Aceptar y devolver el campo en el endpoint PATCH**

En `mueble/[muebleId]/route.ts`, agregar al `schema` (después de `quitar_imagen`):

```ts
  quitar_imagen: z.boolean().optional(),
  peso_foto_sugerido_kg: z.number().positive().nullable().optional(),
```

Agregar `peso_foto_sugerido_kg` al `.select(...)` que carga el mueble actual (línea 91):

```ts
    .select('id, cotizacion_id, empresa_id, item_id, titulo, descripcion, tipo_mueble, cantidad, factor_rentabilidad, materiales_json, servicios_json, insumos_json, peso_estandar_kg, peso_foto_sugerido_kg, co2_evitado_kg, agua_evitada_l, oculto, imagen_url')
```

Y en el `.update(...)` (línea 200), agregar después de `materiales_json: materiales,`:

```ts
      materiales_json: materiales,
      peso_foto_sugerido_kg: parsed.data.peso_foto_sugerido_kg !== undefined ? parsed.data.peso_foto_sugerido_kg : mueble.peso_foto_sugerido_kg,
```

- [ ] **Paso 2: Agregar el campo a `MuebleEditable`**

En `editar-mueble-modal.tsx`, agregar a la interfaz (después de `materiales_json`):

```ts
export interface MuebleEditable {
  id: string
  item_id: string | null
  titulo: string | null
  descripcion: string | null
  tipo_mueble: string
  cantidad: number
  servicios_json: Servicio[] | null
  insumos_json: Insumo[] | null
  factor_rentabilidad: number
  materiales_json: Material[] | null
  peso_foto_sugerido_kg: number | null
  co2_evitado_kg: number
  agua_evitada_l: number
  imagen_url?: string | null
}
```

- [ ] **Paso 3: Función que aplica o descarta la sugerencia**

Agregar esta función dentro del componente (después de la declaración de `materiales`/`setMateriales`, cerca de donde ya viven las funciones que hacen PATCH — buscar el bloque que empieza en la línea ~224):

```ts
  async function decidirSugerenciaPeso(accion: 'aplicar' | 'descartar') {
    if (!mueble || mueble.peso_foto_sugerido_kg == null) return
    let materialesActualizados: Material[] | undefined
    if (accion === 'aplicar') {
      const pesoActual = materiales.reduce((s, m) => s + m.peso_kg, 0)
      if (pesoActual > 0) {
        const factor = mueble.peso_foto_sugerido_kg / pesoActual
        materialesActualizados = materiales.map(m => ({ ...m, peso_kg: m.peso_kg * factor }))
        setMateriales(materialesActualizados)
      }
    }
    await fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}/mueble/${mueble.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peso_foto_sugerido_kg: null,
        ...(materialesActualizados ? { materiales_json: materialesActualizados } : {}),
      }),
    })
    onGuardado(mueble, null)
  }
```

- [ ] **Paso 4: Mostrar el aviso**

Buscar en el JSX del modal la sección donde se listan los materiales (mismo bloque donde vive el `<Selector>`/inputs de material, cerca de donde termina el `.map()` de `materiales`). Agregar este bloque justo antes del cierre de esa sección, usando el mismo patrón visual ya construido en `categorias-client.tsx` (colores del sistema, nunca inventados):

```tsx
        {mueble && mueble.peso_foto_sugerido_kg != null && (
          <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'rgba(246,191,62,0.1)', border: '1px solid rgba(246,191,62,0.3)' }}>
            <p className="text-xs text-[var(--text-primary)]">
              La foto sugiere <strong>{formatNumero(mueble.peso_foto_sugerido_kg)} kg</strong> en total. El catálogo estima {formatNumero(materiales.reduce((s, m) => s + m.peso_kg, 0))} kg.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => decidirSugerenciaPeso('descartar')}>Descartar</Button>
              <Button size="sm" variant="primary" onClick={() => decidirSugerenciaPeso('aplicar')}>Usar este peso</Button>
            </div>
          </div>
        )}
```

Este archivo no importa `Button` todavía (usa botones propios) — revisar los imports reales al aplicar este paso y usar `import { Button } from '@/components/ui/button'` si no está, siguiendo la skill `design-system` del proyecto (nunca un botón ad-hoc nuevo).

- [ ] **Paso 5: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin errores nuevos.

- [ ] **Paso 6: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/[id]/components/editar-mueble-modal.tsx" "src/app/api/cotizador/cotizaciones/[id]/mueble/[muebleId]/route.ts"
git commit -m "feat: aviso de peso por foto en el modal de editar mueble, con Usar este peso/Descartar"
```

---

### Task 5: DPP — enviar `peso_foto_sugerido_kg` al confirmar el activo

**Files:**
- Modify: `src/app/(empresa)/empresa/dpp/nuevo/components/dpp-item-card.tsx`
- Modify: `src/app/(empresa)/empresa/dpp/nuevo/page.tsx`
- Modify: `src/app/api/dpp/activos/crear/route.ts`

- [ ] **Paso 1: Agregar el campo a `ItemDppPendiente`**

En `dpp-item-card.tsx`, agregar a la interfaz:

```ts
export interface ItemDppPendiente {
  _uiKey: string
  titulo: string
  descripcion: string
  confianza: number
  peso_total_estimado_kg: number | null
  imagenPreview: string
  imagenBase64: string
  materiales: MaterialDpp[]
  manual: boolean
  creando: boolean
  errorCreacion: string | null
}
```

- [ ] **Paso 2: Threading en `page.tsx` — `itemDetectadoAPendiente` (línea 50)**

```ts
  return {
    _uiKey: crypto.randomUUID(),
    titulo: d.titulo,
    descripcion: d.descripcion,
    confianza: d.confianza,
    peso_total_estimado_kg: d.peso_total_estimado_kg,
    imagenPreview: miniatura.imagenPreview,
```

- [ ] **Paso 3: `itemManualVacio` (línea ~78) — null, no hay foto de catálogo que comparar**

```ts
  return {
    _uiKey: crypto.randomUUID(),
    titulo: '',
    descripcion: '',
    confianza: 1,
    peso_total_estimado_kg: null,
    imagenPreview: fotoPrincipal.preview,
```

- [ ] **Paso 4: Calcular y enviar la sugerencia en `confirmarYCrear` (línea 256-305)**

Después de la línea `const peso_total_kg = materialesConNombre.reduce(...)`, agregar:

```ts
    const peso_total_kg = materialesConNombre.reduce((s: number, m: MaterialDpp) => s + m.peso_kg, 0)
    const difiereMasDel10Porciento = item.peso_total_estimado_kg != null && peso_total_kg > 0
      && Math.abs(item.peso_total_estimado_kg - peso_total_kg) / peso_total_kg > 0.10
```

Y en el body del `fetch` a `/api/dpp/activos/crear`, agregar después de `composicion_json: composicion_json.length > 0 ? composicion_json : undefined,`:

```ts
        composicion_json: composicion_json.length > 0 ? composicion_json : undefined,
        peso_foto_sugerido_kg: difiereMasDel10Porciento ? item.peso_total_estimado_kg : undefined,
```

- [ ] **Paso 5: Aceptar el campo en el endpoint de creación**

En `crear/route.ts`, agregar al `schema` (después de `composicion_json`):

```ts
  })).optional(),
  peso_foto_sugerido_kg: z.number().positive().optional(),
```

Extraer el campo (línea 64):

```ts
  const { nombre, descripcion, categoria_id, peso_total_kg, composicion_json, cliente_id, imagen_url, empresa_id: bodyEmpresaId, peso_foto_sugerido_kg } = parsed.data
```

Y agregar al objeto `nuevoActivo` (línea 139-153), después de `composicion_json: composicion_json ?? null,`:

```ts
    composicion_json: composicion_json ?? null,
    peso_foto_sugerido_kg: peso_foto_sugerido_kg ?? null,
```

- [ ] **Paso 6: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin errores nuevos.

- [ ] **Paso 7: Commit**

```bash
git add "src/app/(empresa)/empresa/dpp/nuevo/components/dpp-item-card.tsx" "src/app/(empresa)/empresa/dpp/nuevo/page.tsx" "src/app/api/dpp/activos/crear/route.ts"
git commit -m "feat: DPP guarda peso_foto_sugerido_kg si la foto difiere >10% del catálogo al confirmar"
```

---

### Task 6: DPP — aviso y aplicar/descartar en el detalle del activo

**Files:**
- Modify: `src/app/api/dpp/activos/[id]/route.ts`
- Modify: `src/app/(empresa)/empresa/dpp/[id]/dpp-detalle-client.tsx`

- [ ] **Paso 1: Agregar PATCH al endpoint del activo**

En `src/app/api/dpp/activos/[id]/route.ts`, agregar después del `GET` (importa `z` y `NextResponse`/`NextRequest` ya existentes, agregar `import { z } from 'zod'` si no está):

```ts
const patchSchema = z.object({
  accion: z.enum(['aplicar', 'descartar']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado', 'super_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, rol, adminClient } = auth
  const { id } = params

  const raw = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const { data: activo, error: fetchError } = await adminClient
    .from('dpp_activos')
    .select('id, empresa_id, peso_total_kg, composicion_json, peso_foto_sugerido_kg')
    .eq('id', id)
    .single()

  if (fetchError || !activo) {
    return NextResponse.json({ error: 'No encontramos este activo.' }, { status: 404 })
  }
  if (rol !== 'super_admin' && activo.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para editar este activo.' }, { status: 403 })
  }
  if (activo.peso_foto_sugerido_kg == null) {
    return NextResponse.json({ error: 'No hay ninguna sugerencia pendiente para este activo.' }, { status: 400 })
  }

  const updatePayload: { peso_foto_sugerido_kg: null; composicion_json?: unknown; peso_total_kg?: number } = {
    peso_foto_sugerido_kg: null,
  }

  if (parsed.data.accion === 'aplicar' && Array.isArray(activo.composicion_json)) {
    const composicion = activo.composicion_json as { peso_kg: number }[]
    const pesoActual = composicion.reduce((s, m) => s + m.peso_kg, 0)
    if (pesoActual > 0) {
      const factor = activo.peso_foto_sugerido_kg / pesoActual
      updatePayload.composicion_json = composicion.map(m => ({ ...m, peso_kg: m.peso_kg * factor }))
      updatePayload.peso_total_kg = activo.peso_foto_sugerido_kg
    }
  }

  const { data: actualizado, error: updateError } = await adminClient
    .from('dpp_activos')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateError || !actualizado) {
    return NextResponse.json({ error: 'Error al actualizar el activo.' }, { status: 500 })
  }

  return NextResponse.json({ data: actualizado })
}
```

- [ ] **Paso 2: Agregar el campo a la interfaz `Activo` del detalle**

En `dpp-detalle-client.tsx`, agregar a `interface Activo` (después de `composicion_json`):

```ts
interface Activo {
  id: string
  codigo_dpp: string
  nombre: string
  descripcion: string | null
  estado: string
  n_ciclos: number
  peso_total_kg: number | null
  composicion_json: unknown
  peso_foto_sugerido_kg: number | null
  co2_manufactura_kg: number | null
```

- [ ] **Paso 3: Mostrar el aviso junto al peso total**

Cerca de la línea 626 (`{activo.peso_total_kg != null && (`), agregar el aviso justo después de donde termina ese bloque de peso total. Buscar el cierre de ese `{...}` y agregar a continuación:

```tsx
        {activo.peso_foto_sugerido_kg != null && (
          <div className="flex flex-col gap-2 p-3 rounded-xl mt-2" style={{ background: 'rgba(246,191,62,0.1)', border: '1px solid rgba(246,191,62,0.3)' }}>
            <p className="text-xs text-[var(--text-primary)]">
              La foto sugiere <strong>{activo.peso_foto_sugerido_kg} kg</strong> en total. El catálogo estima {activo.peso_total_kg ?? 0} kg.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => decidirSugerenciaPeso('descartar')}>Descartar</Button>
              <Button size="sm" variant="primary" onClick={() => decidirSugerenciaPeso('aplicar')}>Usar este peso</Button>
            </div>
          </div>
        )}
```

Revisar si `Button` ya está importado en este archivo (`import { Button } from '@/components/ui/button'`); si no, agregarlo.

- [ ] **Paso 4: Función que llama al PATCH**

Agregar dentro del componente `DppDetalleClient`, cerca de las otras funciones que hacen `fetch` (línea ~416):

```ts
  async function decidirSugerenciaPeso(accion: 'aplicar' | 'descartar') {
    await fetch(`/api/dpp/activos/${activo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion }),
    })
    router.refresh()
  }
```

- [ ] **Paso 5: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin errores nuevos.

- [ ] **Paso 6: Commit**

```bash
git add "src/app/api/dpp/activos/[id]/route.ts" "src/app/(empresa)/empresa/dpp/[id]/dpp-detalle-client.tsx"
git commit -m "feat: aviso de peso por foto en el detalle del DPP, con Usar este peso/Descartar"
```

---

### Task 7: QA manual y verificación final

**Files:**
- Modify: `src/app/(admin)/admin/qa/page.tsx`

- [ ] **Paso 1: Agregar entrada de QA manual**

Buscar el siguiente id disponible en `TAREAS_INICIALES` (después de `adm-31`, será `adm-32` salvo que otro cambio ya lo haya usado — verificar con `grep "id: 'adm-" src/app/\(admin\)/admin/qa/page.tsx` antes de asumir el número) y agregar, en el bloque de categoría "Panel Admin" o "Cotizador"/"DPP" según corresponda al id real usado en cada módulo:

```ts
{
  id: 'dpp-XX', categoria: 'DPP', ruta: '/empresa/dpp/nuevo', critica: false,
  titulo: 'Peso sugerido por foto al confirmar un activo',
  descripcion: 'Si la foto sugiere un peso muy distinto al del catálogo (más de 10%), el detalle del activo muestra un aviso con "Usar este peso"/"Descartar". Si la foto confirma el promedio, no aparece nada.',
  pasos: [
    'Sube una foto de un objeto claramente más grande o más chico de lo típico para su categoría y confirma el activo.',
    'Abre el detalle del DPP recién creado.',
    'Haz clic en "Usar este peso" o "Descartar".'
  ],
  esperado: 'Aparece el aviso con los dos números (foto vs catálogo). "Usar este peso" actualiza el peso total y reparte proporcionalmente entre los materiales, y el aviso desaparece. "Descartar" solo hace desaparecer el aviso, sin tocar el peso.',
  journeys: ['Admin Operativa']
},
```

- [ ] **Paso 2: Verificación completa del proyecto**

```bash
npx tsc --noEmit
npx eslint src/app/api/cotizador/diagnostico/route.ts src/app/api/dpp/activos/crear/route.ts "src/app/api/dpp/activos/[id]/route.ts" "src/app/api/cotizador/cotizaciones/[id]/mueble/route.ts" "src/app/api/cotizador/cotizaciones/[id]/mueble/[muebleId]/route.ts" "src/app/api/cotizador/cotizaciones/[id]/muebles/route.ts" "src/app/(empresa)/empresa/dpp/nuevo/page.tsx" "src/app/(empresa)/empresa/dpp/nuevo/components/dpp-item-card.tsx" "src/app/(empresa)/empresa/dpp/[id]/dpp-detalle-client.tsx" "src/app/(empresa)/empresa/cotizador/nueva/page.tsx" "src/app/(empresa)/empresa/cotizador/[id]/components/editar-mueble-modal.tsx"
```

Esperado: 0 errores nuevos en ambos comandos (los 3 errores de `tsc` ya documentados como preexistentes pueden seguir apareciendo).

- [ ] **Paso 3: Recordar al usuario correr la migración 138**

Antes de probar en vivo, la migración de la Tarea 1 debe estar corrida en staging (`rjcfqcqgqxoblisuyapq`) — sin eso, los endpoints de las Tareas 3, 4, 5 y 6 fallarán al intentar leer/escribir la columna nueva.

- [ ] **Paso 4: Commit**

```bash
git add src/app/\(admin\)/admin/qa/page.tsx
git commit -m "test: QA manual del aviso de peso por foto en DPP"
```
