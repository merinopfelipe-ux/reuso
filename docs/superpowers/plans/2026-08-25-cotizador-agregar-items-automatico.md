# Agregar ítems automático + borradores visibles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo de cascada+cola de `/empresa/cotizador/nueva` por un flujo de un ítem a la vez sin clics de avance entre ítems, y agregar retención automática de 8h para cotizaciones en borrador con al menos un ítem guardado.

**Architecture:** El backend gana una columna (`borrador_iniciado_at`) y un cron nuevo; el frontend de `page.tsx` reemplaza `gruposPendientes[]`/`colaProcesar`/`procesandoIdx` por un único ítem activo (`grupoActivo`) más dos acumuladores (`itemsPendientes` para lo que necesita completarse/reintentarse a mano, `colaExtra` para piezas "¿es un ítem aparte?" confirmadas, drenada automáticamente). El guardado deja de depender de un clic: se intenta automático apenas un ítem tiene `item_id` resuelto.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + Storage), Zod.

Spec de referencia: `docs/superpowers/specs/2026-08-25-cotizador-agregar-items-automatico-design.md`.

---

## Task 1: Migración SQL — `borrador_iniciado_at`

**Files:**
- Create: `sql/107_borrador_iniciado_at.sql`

- [ ] **Step 1: Verificar que 107 sigue siendo el siguiente número libre**

Run: `ls sql/ | tail -5`
Expected: el archivo más reciente es `106_crm_empresas_clientes_sector.sql` (o superior). Si ya existe un `107_*.sql`, usar el siguiente número libre en su lugar y ajustar el resto de este plan.

- [ ] **Step 2: Escribir la migración**

```sql
-- sql/107_borrador_iniciado_at.sql
-- Marca el momento en que una cotización en borrador (estado 'por_cotizar')
-- recibió su primer ítem guardado — nunca se reescribe después. El cron
-- cotizador-purga-borradores-8h usa esta columna para borrar borradores
-- abandonados 8h después de ese momento, sin importar cuánto se sigan
-- editando otras cosas de la cotización mientras tanto (ver spec
-- 2026-08-25-cotizador-agregar-items-automatico-design.md, sección B).
ALTER TABLE crm_cotizaciones
  ADD COLUMN IF NOT EXISTS borrador_iniciado_at timestamptz;
```

- [ ] **Step 3: Avisar al usuario que corra la migración**

Este proyecto no aplica migraciones automáticamente (ver CLAUDE.md, "una sola base de datos"). El usuario debe correr `sql/107_borrador_iniciado_at.sql` en el SQL Editor de Supabase antes de que el resto de las tareas de este plan funcionen en vivo. Anotarlo en el reporte final de esta tarea, no bloquear las siguientes tareas de código por esto (se verifica en la Tarea 8).

- [ ] **Step 4: Commit**

```bash
git add sql/107_borrador_iniciado_at.sql
git commit -m "feat: agregar columna borrador_iniciado_at a crm_cotizaciones"
```

---

## Task 2: `POST /api/cotizador/cotizaciones/[id]/mueble` — setear `borrador_iniciado_at` en el primer ítem

**Files:**
- Modify: `src/app/api/cotizador/cotizaciones/[id]/mueble/route.ts:57-70` (select inicial) y después del insert exitoso (línea ~177 en adelante)

- [ ] **Step 1: Ampliar el select inicial de la cotización para traer `borrador_iniciado_at`**

Reemplazar (línea 57-62):

```typescript
  const { data: cotizacion, error: fetchError } = await adminClient
    .from('crm_cotizaciones')
    .select('id, subtotal, descuento')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
```

por:

```typescript
  const { data: cotizacion, error: fetchError } = await adminClient
    .from('crm_cotizaciones')
    .select('id, subtotal, descuento, borrador_iniciado_at')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
```

- [ ] **Step 2: Setear `borrador_iniciado_at` una sola vez, justo después de guardar el mueble con éxito**

Ubicar el bloque (línea ~177-179):

```typescript
  if (muebleError || !mueble) {
    return NextResponse.json({ error: 'Error al guardar el mueble. Intenta de nuevo.' }, { status: 500 })
  }
```

Agregar inmediatamente después (antes del bloque de `fue_corregido_por_humano`):

```typescript
  // Arranca el reloj de retención del borrador (8h, ver cron
  // cotizador-purga-borradores-8h) en el momento del PRIMER ítem guardado
  // de esta cotización — nunca se vuelve a tocar después. `.is(...)` evita
  // pisar un valor ya existente si dos requests llegaran casi a la vez.
  if (!(cotizacion as { borrador_iniciado_at?: string | null }).borrador_iniciado_at) {
    await adminClient
      .from('crm_cotizaciones')
      .update({ borrador_iniciado_at: new Date().toISOString() })
      .eq('id', params.id)
      .is('borrador_iniciado_at', null)
  }
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en `mueble/route.ts`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/cotizador/cotizaciones/[id]/mueble/route.ts"
git commit -m "feat: marcar borrador_iniciado_at al guardar el primer ítem de una cotización"
```

---

## Task 3: Cron `cotizador-purga-borradores-8h` + registro en `vercel.json`

**Files:**
- Create: `src/app/api/cron/cotizador-purga-borradores-8h/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Escribir el cron, copiando el patrón exacto de `cotizador-purga-90d`**

```typescript
// src/app/api/cron/cotizador-purga-borradores-8h/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente (vercel.json). Borra cotizaciones
// que siguen en 'por_cotizar' (nunca se enviaron al cliente) 8h después de
// que se guardó su primer ítem (borrador_iniciado_at, Task 2 de este plan)
// — el estado de borrador solo existe para no perder información por mala
// conexión, no como espacio de trabajo de varios días (decisión explícita
// del usuario, ver spec 2026-08-25-cotizador-agregar-items-automatico-design.md).
// Sin importar cuántos ítems tenga: si sigue en 'por_cotizar' pasadas las
// 8h, se borra igual que las cotizaciones vacías (cotizador-purga-vacias-8h).
//
// IMPORTANTE: esto NUNCA reemplaza ni restringe el borrado manual ya
// existente (DELETE /api/cotizador/cotizaciones/[id], usado individual y en
// lote desde /empresa/cotizador/page.tsx) — el vendedor puede borrar
// cualquier cotización, sea o no "Borrador", en cualquier momento, sin
// relación con este cron.

interface CotizacionAPurgar {
  id: string
  codigo_cotizacion: string
}

interface MuebleImagen {
  imagen_url: string | null
}

// Mismo helper que cotizador-purga-90d — el path interno del bucket
// 'cotizador' es lo único que .remove() acepta, nunca una URL completa.
function pathDeStorage(imagenUrl: string): string {
  const marcador = '/cotizador/'
  const idx = imagenUrl.indexOf(marcador)
  if (idx === -1) return imagenUrl
  return `cotizador/${imagenUrl.slice(idx + marcador.length)}`
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const hace8h = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()

  const { data: cotizaciones, error } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion')
    .eq('estado', 'por_cotizar')
    .not('borrador_iniciado_at', 'is', null)
    .lt('borrador_iniciado_at', hace8h)

  if (error) {
    console.error('[cron/cotizador-purga-borradores-8h]', error.message)
    return NextResponse.json({ error: 'Error al consultar cotizaciones.' }, { status: 500 })
  }

  if (!cotizaciones || cotizaciones.length === 0) {
    return NextResponse.json({ procesadas: 0, mensaje: 'Sin borradores que purgar hoy.' })
  }

  const cotizacionesTyped = cotizaciones as CotizacionAPurgar[]
  let purgadas = 0
  let imagenesBorradas = 0

  for (const cot of cotizacionesTyped) {
    const { data: muebles } = await adminClient
      .from('crm_muebles_cotizados')
      .select('imagen_url')
      .eq('cotizacion_id', cot.id)

    const paths = ((muebles ?? []) as MuebleImagen[])
      .map(m => m.imagen_url)
      .filter((url): url is string => !!url && !url.startsWith('http'))
      .map(pathDeStorage)

    if (paths.length > 0) {
      const { error: storageError } = await adminClient.storage.from('cotizador').remove(paths)
      if (!storageError) imagenesBorradas += paths.length
      else console.error(`[cron/cotizador-purga-borradores-8h] error borrando imágenes de ${cot.codigo_cotizacion}:`, storageError.message)
    }

    const { error: deleteError } = await adminClient.from('crm_cotizaciones').delete().eq('id', cot.id)
    if (!deleteError) purgadas++
    else console.error(`[cron/cotizador-purga-borradores-8h] error borrando ${cot.codigo_cotizacion}:`, deleteError.message)
  }

  console.log(`[cron/cotizador-purga-borradores-8h] ${purgadas} borradores purgados, ${imagenesBorradas} imágenes borradas.`)

  return NextResponse.json({
    procesadas: cotizaciones.length,
    purgadas,
    imagenesBorradas,
    mensaje: `${purgadas} borradores purgados (8h+ sin enviar).`,
  })
}
```

- [ ] **Step 2: Registrar el cron en `vercel.json`**

Reemplazar el cierre del array (después de `cotizador-purga-vacias-8h`, hora 17 ya usada):

```json
    {
      "path": "/api/cron/cotizador-purga-vacias-8h",
      "schedule": "0 17 * * *"
    },
    {
      "path": "/api/cron/cotizador-purga-borradores-8h",
      "schedule": "0 18 * * *"
    }
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en el archivo nuevo.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/cotizador-purga-borradores-8h/route.ts vercel.json
git commit -m "feat: cron que purga borradores de cotización sin enviar 8h después del primer ítem"
```

---

## Task 4: Marca "Borrador" en la lista de `/empresa/cotizador`

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/page.tsx:44-50`

**Contexto verificado:** el `GET /api/cotizador/cotizaciones` ya filtra cotizaciones con 0 ítems (nunca llegan a esta lista) — así que cualquier fila con `estado === 'por_cotizar'` que SÍ aparece aquí ya tiene al menos 1 ítem guardado por definición. No hace falta un campo nuevo en la API: alcanza con distinguir el label en el único lugar donde se pinta el badge de estado (`renderCeldaColumna`, usado tanto por la tabla de escritorio como por las tarjetas de móvil).

- [ ] **Step 1: Cambiar el label del badge para `por_cotizar`**

Reemplazar (línea 47-50):

```typescript
  if (clave === 'estado') {
    const info = ESTADOS.find(e => e.key === c.estado)
    return info ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span> : '—'
  }
```

por:

```typescript
  if (clave === 'estado') {
    const info = ESTADOS.find(e => e.key === c.estado)
    if (!info) return '—'
    // Toda cotización 'por_cotizar' que llega hasta acá ya tiene al menos 1
    // ítem guardado (las de 0 ítems ni siquiera llegan, GET ya las filtra) —
    // así que "Por cotizar" se muestra como "Borrador" en esta lista: se
    // borra sola a las 8h de guardado el primer ítem si no avanza de estado
    // (cron cotizador-purga-borradores-8h), sin afectar el nombre del
    // embudo en ninguna otra pantalla (tabs, sales-dashboard).
    const label = c.estado === 'por_cotizar' ? 'Borrador' : info.label
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{label}</span>
  }
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/page.tsx"
git commit -m "feat: mostrar 'Borrador' en vez de 'Por cotizar' para cotizaciones con contenido sin enviar"
```

---

## Task 5: `grupo-item-card.tsx` — campo `_errorGuardado` para reintentos

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx:11-26`

**Por qué:** el nuevo modelo de page.tsx (Task 6) necesita distinguir, dentro de `itemsPendientes`, un ítem que está ahí porque le falta categoría (nunca se intentó guardar) de uno que falló al guardar (ya se intentó, y por qué falló) — para mostrar el mensaje de error correcto junto al botón "Reintentar guardar".

- [ ] **Step 1: Agregar el campo opcional a la interfaz**

Reemplazar (línea 11-26):

```typescript
export interface ItemConImagen extends ItemDetectadoConSnapshot {
  // Miniatura para mostrar (recorte si el recuadro fue útil, si no la foto
  // completa) y el base64 que se sube al confirmar — mismo valor, dos
  // nombres porque uno es "qué se ve" y otro es "qué se guarda".
  imagenPreview: string
  imagenBase64: string
  // true cuando la tarjeta se creó sin pasar por la IA (modo Manual, o "Buscar
  // en catálogo" desde un ítem no identificado) — el vendedor elige la
  // categoría/subcategoría él mismo desde cero, `confianza` no aplica.
  manual?: boolean
  // Identificador estable solo para React (nunca se envía al backend) — sin
  // esto, usar el índice del array como key hace que al quitar/duplicar un
  // ítem, React reutilice el estado interno (categoriaSel) de la tarjeta
  // anterior en esa posición, mostrando una categoría que no corresponde.
  _uiKey?: string
}
```

por:

```typescript
export interface ItemConImagen extends ItemDetectadoConSnapshot {
  // Miniatura para mostrar (recorte si el recuadro fue útil, si no la foto
  // completa) y el base64 que se sube al confirmar — mismo valor, dos
  // nombres porque uno es "qué se ve" y otro es "qué se guarda".
  imagenPreview: string
  imagenBase64: string
  // true cuando la tarjeta se creó sin pasar por la IA (modo Manual, o "Buscar
  // en catálogo" desde un ítem no identificado) — el vendedor elige la
  // categoría/subcategoría él mismo desde cero, `confianza` no aplica.
  manual?: boolean
  // Identificador estable solo para React (nunca se envía al backend) — sin
  // esto, usar el índice del array como key hace que al quitar/duplicar un
  // ítem, React reutilice el estado interno (categoriaSel) de la tarjeta
  // anterior en esa posición, mostrando una categoría que no corresponde.
  _uiKey?: string
  // Presente solo cuando el guardado automático de este ítem ya falló una
  // vez (ej. sin internet) — page.tsx lo usa para mostrar el motivo junto
  // al botón "Reintentar guardar" en vez de un guardado silencioso.
  _errorGuardado?: string
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (campo opcional, no rompe ningún uso existente).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"
git commit -m "feat: agregar _errorGuardado a ItemConImagen para reintentos de guardado automático"
```

---

## Task 6: `page.tsx` — nuevo modelo de estado y lógica (sin cascada, sin clic de avance)

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx` (constantes ~45-50, estado ~180-215, funciones ~306-714)

Esta tarea reemplaza el "cerebro" de la página (constantes, estado, funciones) dejando el JSX de renderizado para la Task 7 — así cada tarea es más fácil de revisar. El archivo quedará con errores de tipos hasta que la Task 7 también esté hecha (el JSX todavía referencia los símbolos viejos); eso es esperado, se verifica al final de la Task 7, no de esta.

- [ ] **Step 1: Reemplazar las constantes de tope**

Reemplazar (línea 45-50):

```typescript
// Cada ítem admite hasta 4 fotos, y una cotización nueva admite hasta 4
// ítems apilados en cascada — se arman todos primero (sin analizar nada) y
// se procesan en orden, uno a la vez, recién al confirmar "Genera la
// propuesta" (ver procesarIndiceCola/generarPropuesta más abajo).
const MAX_FOTOS_POR_TANDA = 4
const MAX_ITEMS_POR_COTIZACION = 4
```

por:

```typescript
// Cada ítem admite hasta 4 fotos. Ya no hay tope de ítems por cotización —
// se agregan uno a la vez, tantos como el vendedor necesite (decisión
// explícita del usuario, ver spec 2026-08-25-cotizador-agregar-items-
// automatico-design.md): cada ítem se analiza y se guarda automático apenas
// está listo, sin armar varios de antemano.
const MAX_FOTOS_POR_TANDA = 4
```

- [ ] **Step 2: Reemplazar el bloque de estado del flujo**

Reemplazar (línea 180-215):

```typescript
  // Ítems en armado (staging): hasta MAX_ITEMS_POR_COTIZACION tarjetas en
  // cascada, cada una con sus propias fotos y su propio modo IA/Manual.
  // Nada de esto se analiza — eso solo pasa al procesar la cola, ver más
  // abajo (colaProcesar). Arranca con 1 tarjeta vacía siempre visible.
  const [gruposPendientes, setGruposPendientes] = useState<GrupoPendiente[]>([nuevoGrupoVacio()])

  // Resultado del grupo que se está procesando AHORA MISMO (índice de
  // colaProcesar) — mismo shape que antes, pero ya no es "la tanda actual
  // del vendedor", es "lo que la cola está resolviendo en este momento".
  const [itemsDetectados, setItemsDetectados] = useState<ItemConImagen[]>([])
  const [noIdentificados, setNoIdentificados] = useState<string[]>([])
  const [sinMatch, setSinMatch] = useState<SinMatchConImagen[]>([])
  // Pieza "sin_match" pendiente de que el vendedor confirme si es un ítem
  // aparte — una por vez, ver confirmarPiezaComoItemAparte más abajo.
  const [preguntaItemAparte, setPreguntaItemAparte] = useState<SinMatchConImagen | null>(null)

  // Cola de procesamiento — se llena al confirmar "Genera la propuesta" con
  // los gruposPendientes que sí tienen fotos, y puede CRECER en caliente si
  // al procesar un grupo aparece una pieza extra que el vendedor confirma
  // como ítem aparte (ver Task 7). procesandoIdx === null significa que la
  // cola no está corriendo (estamos en la etapa de armar, no de procesar).
  const [colaProcesar, setColaProcesar] = useState<GrupoPendiente[]>([])
  const [procesandoIdx, setProcesandoIdx] = useState<number | null>(null)

  // Cotización acumulada
  const [cotizacionId, setCotizacionId] = useState<string | null>(null)
  const [muebles, setMuebles] = useState<MuebleAgregado[]>([])
```

por:

```typescript
  // Ítem activo: fotos + modo (IA/Manual) del ítem que el vendedor está
  // armando AHORA MISMO. Nunca se pre-arman varios — cuando este queda
  // resuelto (guardado o movido a itemsPendientes), "Agregar otro ítem" trae
  // uno nuevo vacío. `mostrandoTarjeta` controla si la tarjeta de subir
  // fotos está visible (se oculta mientras procesa, y también apenas
  // termina de procesar, hasta que el vendedor pide explícitamente otro
  // ítem — así "Agregar otro ítem" siempre significa algo real).
  const [grupoActivo, setGrupoActivo] = useState<GrupoPendiente>(nuevoGrupoVacio())
  const [mostrandoTarjeta, setMostrandoTarjeta] = useState(true)
  const [numeroItemActivo, setNumeroItemActivo] = useState(1)
  const [procesando, setProcesando] = useState(false)

  // Ítems que necesitan al vendedor antes de poder guardarse solos:
  // - sin coincidencia de catálogo (item_id vacío, GrupoItemCard deja elegir
  //   categoría/ítem existente; si de plano no existe, "Crear ítem nuevo"
  //   reusa el mismo flujo que antes vivía en el botón de rescate).
  // - guardado automático que falló (item_id sí resuelto, pero el POST a
  //   /mueble falló) — trae `_errorGuardado` con el motivo.
  // Pueden acumularse varios a la vez, la cola de análisis no espera a que
  // se resuelvan.
  const [itemsPendientes, setItemsPendientes] = useState<ItemConImagen[]>([])

  // Piezas "sin_match" detectadas dentro de las fotos de CUALQUIER ítem que
  // ya se analizó — se muestran TODAS a la vez (no una por una), el
  // vendedor las responde en el orden que quiera, sin que eso bloquee nada.
  const [sinMatch, setSinMatch] = useState<SinMatchConImagen[]>([])
  const [noIdentificados, setNoIdentificados] = useState<string[]>([])

  // Micro-cola interna, invisible para el vendedor: cuando confirma que una
  // pieza sin_match SÍ es un ítem aparte, su foto entra acá y se procesa
  // sola en cuanto el análisis actual (si hay uno corriendo) termina —
  // nunca dos análisis de IA a la vez, mismo criterio que el resto del
  // flujo, pero sin necesitar que el vendedor haga nada para que avance.
  const [colaExtra, setColaExtra] = useState<GrupoPendiente[]>([])

  // Cotización acumulada
  const [cotizacionId, setCotizacionId] = useState<string | null>(null)
  const [muebles, setMuebles] = useState<MuebleAgregado[]>([])
```

- [ ] **Step 3: Reemplazar el respaldo local (localStorage)**

Reemplazar el bloque completo (línea ~306-340, desde el comentario "Respaldo local" hasta el segundo `useEffect` de guardado):

```typescript
  // ── Respaldo local de las fotos en armado (localStorage) ────────────────
  // El internet en campo puede ser malo o inexistente — nada de este
  // respaldo depende del servidor, así que sigue funcionando sin conexión.
  // Se guarda cada vez que cambian las fotos y se restaura una sola vez,
  // apenas se conoce el id real de la cotización (nueva o existente, mismo
  // id que ya queda en la URL vía replaceState). Directriz explícita del
  // usuario: si se refresca la página o se pierde la conexión, las fotos ya
  // subidas nunca se pierden.
  const restauradoLocalRef = useRef(false)

  useEffect(() => {
    if (!cotizacionId || restauradoLocalRef.current) return
    restauradoLocalRef.current = true
    try {
      const guardado = localStorage.getItem(`cotizador_fotos_${cotizacionId}`)
      if (!guardado) return
      const parsed = JSON.parse(guardado) as GrupoPendiente[]
      if (Array.isArray(parsed) && parsed.some(g => g.fotos.length > 0)) {
        setGruposPendientes(parsed)
      }
    } catch {
      // Respaldo corrupto o localStorage no disponible — se sigue con la
      // tarjeta vacía normal, nunca bloquea al vendedor.
    }
  }, [cotizacionId])

  useEffect(() => {
    if (!cotizacionId) return
    try {
      localStorage.setItem(`cotizador_fotos_${cotizacionId}`, JSON.stringify(gruposPendientes))
    } catch {
      // Cupo de localStorage lleno (muchas fotos en alta resolución) — no
      // bloquea el flujo, solo se pierde el respaldo local de esta tanda.
    }
  }, [gruposPendientes, cotizacionId])
```

por:

```typescript
  // ── Respaldo local (localStorage) ────────────────────────────────────────
  // El internet en campo puede ser malo o inexistente — nada de este
  // respaldo depende del servidor, así que sigue funcionando sin conexión.
  // Guarda tanto el ítem activo (fotos sin analizar todavía) como los
  // itemsPendientes (ya analizados, con datos que el vendedor pudo haber
  // escrito a mano — precio, materiales — antes de guardarlos), porque
  // ambos representan trabajo real que no se puede perder. Se restaura una
  // sola vez, apenas se conoce el id real de la cotización.
  const restauradoLocalRef = useRef(false)

  useEffect(() => {
    if (!cotizacionId || restauradoLocalRef.current) return
    restauradoLocalRef.current = true
    try {
      const guardado = localStorage.getItem(`cotizador_borrador_${cotizacionId}`)
      if (!guardado) return
      const parsed = JSON.parse(guardado) as { grupoActivo?: GrupoPendiente; itemsPendientes?: ItemConImagen[] }
      if (parsed.grupoActivo && parsed.grupoActivo.fotos.length > 0) setGrupoActivo(parsed.grupoActivo)
      if (Array.isArray(parsed.itemsPendientes) && parsed.itemsPendientes.length > 0) setItemsPendientes(parsed.itemsPendientes)
    } catch {
      // Respaldo corrupto o localStorage no disponible — se sigue con la
      // tarjeta vacía normal, nunca bloquea al vendedor.
    }
  }, [cotizacionId])

  useEffect(() => {
    if (!cotizacionId) return
    try {
      localStorage.setItem(`cotizador_borrador_${cotizacionId}`, JSON.stringify({ grupoActivo, itemsPendientes }))
    } catch {
      // Cupo de localStorage lleno (muchas fotos en alta resolución) — no
      // bloquea el flujo, solo se pierde el respaldo local de esta tanda.
    }
  }, [grupoActivo, itemsPendientes, cotizacionId])
```

- [ ] **Step 4: Reemplazar `agregarFotosAGrupo`/`quitarFotoDeGrupo`/`quitarGrupo`**

Reemplazar (línea ~347-382):

```typescript
  const agregarFotosAGrupo = useCallback(async (grupoId: string, files: File[]) => {
    const actual = gruposPendientes.find(g => g.id === grupoId)
    const disponibles = MAX_FOTOS_POR_TANDA - (actual?.fotos.length ?? 0)
    if (disponibles <= 0) {
      setError(`Ese ítem ya tiene el máximo de ${MAX_FOTOS_POR_TANDA} fotos.`)
      return
    }
    const aProcesar = files.slice(0, disponibles)
    const resultados = await Promise.allSettled(aProcesar.map(f => comprimirImagenBase64(f)))
    const comprimidas: FotoCola[] = []
    let fallidas = 0
    for (const r of resultados) {
      if (r.status === 'fulfilled') comprimidas.push(r.value)
      else fallidas++
    }
    if (comprimidas.length > 0) {
      setGruposPendientes(prev => prev.map(g => g.id === grupoId ? { ...g, fotos: [...g.fotos, ...comprimidas] } : g))
    }
    if (fallidas > 0) {
      setError(`No se pudo procesar ${fallidas} imagen${fallidas > 1 ? 'es' : ''}.${comprimidas.length > 0 ? ' El resto se agregó bien.' : ' Intenta de nuevo.'}`)
    }
  }, [gruposPendientes])

  function quitarFotoDeGrupo(grupoId: string, index: number) {
    setGruposPendientes(prev => prev.map(g => g.id === grupoId ? { ...g, fotos: g.fotos.filter((_, i) => i !== index) } : g))
  }

  // Quita la tarjeta completa de un ítem (todas sus fotos, no una por una).
  // Si es la única que queda, se reemplaza por una tarjeta vacía en vez de
  // dejar la pantalla sin ninguna zona de carga.
  function quitarGrupo(grupoId: string) {
    setGruposPendientes(prev => {
      const restantes = prev.filter(g => g.id !== grupoId)
      return restantes.length > 0 ? restantes : [nuevoGrupoVacio()]
    })
  }
```

por:

```typescript
  const agregarFotosAlActivo = useCallback(async (files: File[]) => {
    const disponibles = MAX_FOTOS_POR_TANDA - grupoActivo.fotos.length
    if (disponibles <= 0) {
      setError(`Ese ítem ya tiene el máximo de ${MAX_FOTOS_POR_TANDA} fotos.`)
      return
    }
    const aProcesar = files.slice(0, disponibles)
    const resultados = await Promise.allSettled(aProcesar.map(f => comprimirImagenBase64(f)))
    const comprimidas: FotoCola[] = []
    let fallidas = 0
    for (const r of resultados) {
      if (r.status === 'fulfilled') comprimidas.push(r.value)
      else fallidas++
    }
    if (comprimidas.length > 0) {
      setGrupoActivo(prev => ({ ...prev, fotos: [...prev.fotos, ...comprimidas] }))
    }
    if (fallidas > 0) {
      setError(`No se pudo procesar ${fallidas} imagen${fallidas > 1 ? 'es' : ''}.${comprimidas.length > 0 ? ' El resto se agregó bien.' : ' Intenta de nuevo.'}`)
    }
  }, [grupoActivo])

  function quitarFotoDelActivo(index: number) {
    setGrupoActivo(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== index) }))
  }
```

- [ ] **Step 5: Actualizar el efecto de pegar (Cmd+V) y el de "advertir al salir"**

Reemplazar (línea ~244-252, "Proteger trabajo no guardado"):

```typescript
  // Proteger trabajo no guardado: advertir al salir si hay progreso pendiente
  useEffect(() => {
    const hayFotosSinProcesar = gruposPendientes.some(g => g.fotos.length > 0)
    const hayProgresoNoGuardado = hayFotosSinProcesar || itemsDetectados.length > 0 || (!cotizacionIdParam && cliente !== null && muebles.length === 0)
    if (!hayProgresoNoGuardado) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gruposPendientes, itemsDetectados.length, cliente, cotizacionIdParam, muebles.length])
```

por:

```typescript
  // Proteger trabajo no guardado: advertir al salir si hay progreso pendiente
  useEffect(() => {
    const hayProgresoNoGuardado = grupoActivo.fotos.length > 0 || itemsPendientes.length > 0 || (!cotizacionIdParam && cliente !== null && muebles.length === 0)
    if (!hayProgresoNoGuardado) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [grupoActivo.fotos.length, itemsPendientes.length, cliente, cotizacionIdParam, muebles.length])
```

Reemplazar (línea ~384-399, el `useEffect` de `onPaste`):

```typescript
  // Pegar una o varias imágenes desde el portapapeles (Cmd+V) — activo
  // mientras la cola se sigue armando, así que varios pegados seguidos se
  // acumulan en vez de perderse. Se agregan al último grupo pendiente.
  useEffect(() => {
    if (procesandoIdx !== null || !cliente) return
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []).filter(i => i.kind === 'file')
      if (items.length === 0) return
      e.preventDefault()
      const archivos = items.map(i => i.getAsFile()).filter((f): f is File => !!f)
      const ultimoGrupo = gruposPendientes[gruposPendientes.length - 1]
      if (archivos.length > 0 && ultimoGrupo) agregarFotosAGrupo(ultimoGrupo.id, archivos)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [procesandoIdx, agregarFotosAGrupo, cliente, gruposPendientes])
```

por:

```typescript
  // Pegar una o varias imágenes desde el portapapeles (Cmd+V) — solo
  // mientras la tarjeta del ítem activo está visible y no está procesando.
  useEffect(() => {
    if (!mostrandoTarjeta || procesando || !cliente) return
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []).filter(i => i.kind === 'file')
      if (items.length === 0) return
      e.preventDefault()
      const archivos = items.map(i => i.getAsFile()).filter((f): f is File => !!f)
      if (archivos.length > 0) agregarFotosAlActivo(archivos)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [mostrandoTarjeta, procesando, agregarFotosAlActivo, cliente])
```

- [ ] **Step 6: Reemplazar el bucle de mensajes "Analizando..." para usar `procesando`**

Reemplazar (línea ~403-414):

```typescript
  useEffect(() => {
    if (estado !== 'analizando') { setAnalizandoMsgIndex(0); return }
    // Nunca vuelve a "Casi listo..." en bucle — con fotos grandes o mala
    // conexión el análisis puede tardar hasta un minuto (medido en vivo:
    // 61.5s), y repetir "Casi listo" por más de un minuto seguido se ve
    // como que la app se congeló. Después del último mensaje real, sube
    // sin tope y el render muestra un aviso de espera fijo en su lugar.
    const interval = setInterval(() => {
      setAnalizandoMsgIndex(i => i + 1)
    }, 2800)
    return () => clearInterval(interval)
  }, [estado])
```

por:

```typescript
  useEffect(() => {
    if (!procesando) { setAnalizandoMsgIndex(0); return }
    // Nunca vuelve a "Casi listo..." en bucle — con fotos grandes o mala
    // conexión el análisis puede tardar hasta un minuto (medido en vivo:
    // 61.5s), y repetir "Casi listo" por más de un minuto seguido se ve
    // como que la app se congeló. Después del último mensaje real, sube
    // sin tope y el render muestra un aviso de espera fijo en su lugar.
    const interval = setInterval(() => {
      setAnalizandoMsgIndex(i => i + 1)
    }, 2800)
    return () => clearInterval(interval)
  }, [procesando])
```

También eliminar el estado `estado`/`EstadoUI` (ya no hace falta un estado de máquina separado, `procesando`+`mostrandoTarjeta`+`itemsPendientes`/`muebles` alcanzan): buscar `const [estado, setEstado] = useState<EstadoUI>('idle')` (línea ~168) y la definición `type EstadoUI = ...` (línea ~43) y borrar ambas — todos los usos de `estado`/`setEstado` se reemplazan en los pasos siguientes de esta tarea y en la Task 7.

- [ ] **Step 7: Reemplazar el bloque completo de análisis/guardado (línea ~416-714)**

Este es el corazón del cambio. Reemplazar TODO el bloque que va desde el comentario `// ── Con IA: ...` (línea ~416) hasta el final de `agregarGrupoNuevo` (línea ~714) — es decir: `analizarGrupoConIA`, `continuarGrupoManual`, `buscarEnCatalogoDesdeTexto`, `actualizarItem`, `quitarDetectado`, `duplicarDetectado`, `elegirCandidato`, `handleClienteListo` (se mantiene, ver abajo), `guardarItemsDetectadosEnCotizacion`, `procesarIndiceCola`, `generarPropuesta`, `confirmarYAvanzar`, `confirmarPiezaComoItemAparte`, `descartarPiezaComoItemAparte`, `agregarGrupoNuevo` — por el siguiente bloque:

```typescript
  // ── Analizar un grupo (Con IA o Manual) — nunca guarda nada, solo
  // devuelve lo que encontró. El llamador decide qué hacer con cada ítem. ──

  async function analizarGrupo(grupo: GrupoPendiente): Promise<{
    items: ItemConImagen[]
    noIdentificados: string[]
    sinMatch: SinMatchConImagen[]
  } | null> {
    if (grupo.modo === 'manual') {
      const item = construirItemStub({
        imagenIndex: 0, imagenPreview: grupo.fotos[0].preview, imagenBase64: grupo.fotos[0].base64,
      })
      return { items: [item], noIdentificados: [], sinMatch: [] }
    }
    try {
      const res = await fetch(conEmpresa('/api/cotizador/diagnostico'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagenes: grupo.fotos.map(c => ({ imagen_base64: c.base64, mime_type: 'image/webp' })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al analizar las imágenes.')
        return null
      }
      const itemsCrudos = (data.items_detectados ?? []) as ItemDetectadoConSnapshot[]
      const items: ItemConImagen[] = await Promise.all(itemsCrudos.map(async (item) => ({
        ...item,
        ...(await construirMiniatura(item.imagen_index, item.bounding_box, grupo.fotos)),
        _uiKey: crypto.randomUUID(),
      })))
      const sinMatchCrudos = (data.sin_match_detalle ?? []) as SinMatchDetalle[]
      const sinMatchNuevo: SinMatchConImagen[] = await Promise.all(sinMatchCrudos.map(async (d) => ({
        ...d,
        ...(await construirMiniatura(d.imagen_index, d.bounding_box, grupo.fotos)),
      })))
      if (items.length === 0 && sinMatchNuevo.length === 0 && (data.no_identificados ?? []).length === 0) {
        setError((grupo.fotos.length > 1 ? 'No se detectó ningún mueble en las fotos.' : 'No se detectó ningún mueble en la foto.') + ' Intenta con otra imagen.')
      }
      return { items, noIdentificados: data.no_identificados ?? [], sinMatch: sinMatchNuevo }
    } catch {
      setError('No se pudo analizar la imagen. Verifica tu conexión.')
      return null
    }
  }

  // Igual, pero para el texto plano de "no_identificados" (la IA nunca lo
  // liga a ninguna foto) — la tarjeta nace sin miniatura, directo a
  // itemsPendientes (no tiene item_id, necesita categoría).
  function buscarEnCatalogoDesdeTexto(index: number) {
    const texto = noIdentificados[index]
    if (!texto) return
    const nuevo = construirItemStub({
      imagenIndex: 0, imagenPreview: '', imagenBase64: '',
      titulo: texto.slice(0, 150), descripcion: texto,
    })
    setItemsPendientes(prev => [...prev, nuevo])
    setNoIdentificados(prev => prev.filter((_, i) => i !== index))
  }

  // ── Guardar un ítem individual — intenta el POST, nunca decide por sí
  // solo qué hacer si falla (eso lo maneja cada llamador). ──

  async function intentarGuardarItem(item: ItemConImagen): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      let id = cotizacionId
      if (!id && cliente) {
        const resCot = await fetch(conEmpresa('/api/cotizador/cotizaciones'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: cliente.id }) })
        const dataCot = await resCot.json()
        if (!resCot.ok) return { ok: false, error: dataCot.error ?? 'Error al crear la cotización.' }
        id = dataCot.id as string
        setCotizacionId(id)
        window.history.replaceState(null, '', conEmpresa(`/empresa/cotizador/nueva?cotizacion_id=${id}`))
      }
      if (!id) return { ok: false, error: 'No se pudo identificar la cotización.' }

      const resMueble = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}/mueble`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.item_id,
          cantidad: item.cantidad,
          imagen_base64: item.imagenBase64,
          mime_type: 'image/webp',
          diagnostico_ia_json: { item_nombre: item.item_nombre, confianza: item.confianza },
          titulo: item.titulo || item.item_nombre,
          descripcion: item.descripcion || undefined,
          servicios_json: item.servicios.filter(s => s.nombre.trim()),
          insumos_json: item.insumos.filter(i => i.nombre.trim() && i.cantidad > 0),
          materiales_json: item.materiales.filter(m => m.nombre.trim() && m.peso_kg > 0 && m.factor_co2_kg > 0),
          factor_rentabilidad: item.factor_rentabilidad,
        }),
      })
      const dataMueble = await resMueble.json()
      if (!resMueble.ok) return { ok: false, error: dataMueble.error ?? `Error al guardar "${item.item_nombre}".` }

      setMuebles(prev => [...prev, {
        id: dataMueble.mueble.id,
        titulo: item.titulo || item.item_nombre,
        cantidad: item.cantidad,
        precio_mueble: dataMueble.mueble.precio_mueble,
        co2_evitado_kg: dataMueble.mueble.co2_evitado_kg,
        imagen_preview: item.imagenPreview,
        precio_mercado_nuevo: null,
        precio_mercado_fuente_url: null,
        precio_mercado_fuente_titulo: null,
        precio_mercado_estado: 'pendiente',
      }])
      dispararPrecioMercado(dataMueble.mueble.id)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Error de conexión al guardar.' }
    }
  }

  // Reintento manual desde "Necesita tu atención" — sirve tanto para un
  // guardado que falló (item_id ya resuelto) como para un ítem que recién
  // consiguió su categoría (item_id que antes estaba vacío).
  async function guardarItemPendiente(item: ItemConImagen) {
    if (!item.item_id) { setError('Elige la categoría del catálogo para este ítem antes de guardar.'); return }
    setError(null)
    const resultado = await intentarGuardarItem(item)
    if (resultado.ok) {
      setItemsPendientes(prev => prev.filter(it => it._uiKey !== item._uiKey))
    } else {
      setItemsPendientes(prev => prev.map(it => it._uiKey === item._uiKey ? { ...it, _errorGuardado: resultado.error } : it))
    }
  }

  function actualizarItemPendiente(uiKey: string | undefined, item: ItemConImagen) {
    setItemsPendientes(prev => prev.map(it => it._uiKey === uiKey ? item : it))
  }

  function quitarItemPendiente(uiKey: string | undefined) {
    setItemsPendientes(prev => prev.filter(it => it._uiKey !== uiKey))
  }

  // ── Orquestador: analiza UN grupo y resuelve cada ítem automáticamente —
  // nunca espera un clic del vendedor para avanzar. ──

  async function procesarGrupo(grupo: GrupoPendiente) {
    setProcesando(true)
    const resultado = await analizarGrupo(grupo)
    setProcesando(false)
    if (!resultado) { drenarColaExtra(); return }

    if (resultado.sinMatch.length > 0) setSinMatch(prev => [...prev, ...resultado.sinMatch])
    if (resultado.noIdentificados.length > 0) setNoIdentificados(prev => [...prev, ...resultado.noIdentificados])

    for (const item of resultado.items) {
      if (item.item_id) {
        const guardado = await intentarGuardarItem(item)
        if (!guardado.ok) setItemsPendientes(prev => [...prev, { ...item, _errorGuardado: guardado.error }])
      } else {
        setItemsPendientes(prev => [...prev, item])
      }
    }

    drenarColaExtra()
  }

  // Arranca lo que haya en colaExtra si nada más está analizando — se llama
  // apenas termina cualquier análisis, así nunca hay dos llamadas a la IA
  // en curso a la vez, pero tampoco hace falta que el vendedor haga nada.
  const colaExtraRef = useRef<GrupoPendiente[]>([])
  colaExtraRef.current = colaExtra

  function drenarColaExtra() {
    const [siguiente, ...resto] = colaExtraRef.current
    if (!siguiente) return
    setColaExtra(resto)
    procesarGrupo(siguiente)
  }

  // Dispara el análisis del ítem activo — único punto de "ya subí las fotos
  // que quería, procesa esto" por ítem (no hay más botones entre pasos).
  async function analizarItemActivo() {
    if (grupoActivo.fotos.length === 0) return
    setMostrandoTarjeta(false)
    const grupo = grupoActivo
    setGrupoActivo(nuevoGrupoVacio(grupo.modo))
    await procesarGrupo(grupo)
  }

  // Crea la cotización apenas se identifica el cliente, no hasta el primer
  // ítem confirmado — antes, elegir cliente vivía solo en memoria: refrescar
  // la página lo perdía todo porque no había `cotizacion_id` en la URL para
  // recargar nada (bug real reportado). Con la cotización creada de una vez
  // y su id en la URL, el mismo efecto que ya recarga cliente+líneas para
  // "agregar más ítems" (arriba) también cubre este caso.
  async function handleClienteListo(c: ClienteIdentificado) {
    setCliente(c)
    try {
      if (cotizacionId) {
        await fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cliente_id: c.id }),
        })
        return
      }
      const res = await fetch(conEmpresa('/api/cotizador/cotizaciones'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: c.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setCotizacionId(data.id)
        window.history.replaceState(null, '', conEmpresa(`/empresa/cotizador/nueva?cotizacion_id=${data.id}`))
      }
    } catch {
      // Falla silenciosa — intentarGuardarItem ya trae su propio intento de
      // creación como respaldo, el vendedor puede seguir subiendo fotos.
    }
  }

  // El vendedor confirma que la pieza extra SÍ es un ítem aparte: entra a
  // la micro-cola interna, se procesa sola cuando le toque.
  function confirmarPiezaComoItemAparte(pieza: SinMatchConImagen) {
    setSinMatch(prev => prev.filter(d => d !== pieza))
    const nuevoGrupo: GrupoPendiente = {
      id: crypto.randomUUID(),
      fotos: [{ base64: pieza.imagenBase64, preview: pieza.imagenPreview }],
      modo: 'ia',
    }
    setColaExtra(prev => [...prev, nuevoGrupo])
    if (!procesando) drenarColaExtra()
  }

  function descartarPiezaComoItemAparte(pieza: SinMatchConImagen) {
    setSinMatch(prev => prev.filter(d => d !== pieza))
  }

  // Botón "+ Agregar otro ítem" — vuelve a mostrar la tarjeta de subir fotos
  // para un ítem nuevo, vacío. Solo tiene sentido cuando no hay nada
  // procesando y la tarjeta actual ya se ocultó (analizandoItemActivo la
  // esconde apenas dispara el análisis).
  function agregarOtroItem() {
    setError(null)
    setNumeroItemActivo(n => n + 1)
    setMostrandoTarjeta(true)
  }
```

**Nota para quien implemente:** `drenarColaExtra` se define con `function` pero se llama antes de su declaración textual dentro de `procesarGrupo` — en JavaScript esto funciona por hoisting de `function` declarations dentro del mismo scope de componente, no hace falta reordenar. Verificar con `npx tsc --noEmit` al final de la Task 7 que no haya ningún error de "usado antes de declararse" (no debería haberlo, pero confirmarlo).

- [ ] **Step 8: `handleClienteListo` ya quedó reescrito en el Step 7 (sin cambios de fondo, solo se movió) — no hay nada más que hacer acá.**

- [ ] **Step 9: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "refactor: reemplazar el modelo de cascada+cola por procesamiento automático de un ítem a la vez (lógica)"
```

El archivo NO compila limpio todavía (el JSX sigue referenciando símbolos viejos) — es esperado, se corrige en la Task 7. No ejecutar `npx tsc --noEmit` como criterio de éxito de esta tarea, solo confirmar que el bloque de arriba quedó pegado tal cual (revisión visual/diff).

---

## Task 7: `page.tsx` — nuevo JSX (3 zonas, sin cascada, sin cola visible)

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx` (JSX completo, línea ~868 en adelante en el archivo original antes de la Task 6)

**Contexto:** esta tarea reescribe todo el render del componente (bloque `return (...)`), reutilizando sin cambios: `AdminPageHeader`, `IdentificacionCliente`, el bloque de "cliente identificado" (tarjeta con nombre/NIT), la lista de "muebles ya agregados" (`Total`/CO2), y los 3 `<Modal>` del final (rescate, tipo de rescate, precio de mercado) — solo cambia cómo se decide CUÁNDO mostrar el botón de rescate (ya no es un botón siempre visible, se dispara desde dentro de una tarjeta pendiente) y toda la sección de "armado/análisis/resultado" de en medio.

- [ ] **Step 1: Agregar estado nuevo para saber desde qué ítem pendiente se abrió el rescate**

Justo debajo de `const [confirmarTipoRescate, setConfirmarTipoRescate] = useState(false)` (línea ~215), agregar:

```typescript
  // Cuando el rescate se abre desde una tarjeta de itemsPendientes (en vez
  // del botón general), guarda cuál para poder quitarla apenas el rescate
  // termine con éxito — su propio stub ya no hace falta, el rescate crea su
  // propio mueble directo.
  const [rescateDesdeUiKey, setRescateDesdeUiKey] = useState<string | undefined>(undefined)
```

- [ ] **Step 2: Adaptar `abrirRescate` y `confirmarRescate` para aceptar el origen**

Reemplazar la firma de `abrirRescate` (línea ~767-776):

```typescript
  async function abrirRescate() {
    setMostrarRescate(true)
    setRescateNombre(''); setRescatePrecio(''); setRescateCo2(''); setRescateCategoriaId('')
    setError(null)
    if (categoriasHoja.length === 0) {
      const res = await fetch(conEmpresa('/api/cotizador/categorias'))
      const data = await res.json()
      if (res.ok) setCategoriasHoja(data.categorias ?? [])
    }
  }
```

por:

```typescript
  async function abrirRescate(desdeUiKey?: string, nombreSugerido?: string) {
    setMostrarRescate(true)
    setRescateDesdeUiKey(desdeUiKey)
    setRescateNombre(nombreSugerido ?? ''); setRescatePrecio(''); setRescateCo2(''); setRescateCategoriaId('')
    setError(null)
    if (categoriasHoja.length === 0) {
      const res = await fetch(conEmpresa('/api/cotizador/categorias'))
      const data = await res.json()
      if (res.ok) setCategoriasHoja(data.categorias ?? [])
    }
  }
```

Dentro de `confirmarRescate`, ubicar el final exitoso (línea ~837-849):

```typescript
      setMuebles(prev => [...prev, {
        id: dataMueble.mueble.id,
        titulo: rescateNombre.trim(),
        cantidad: 1,
        precio_mueble: dataMueble.mueble.precio_mueble,
        co2_evitado_kg: dataMueble.mueble.co2_evitado_kg,
        imagen_preview: null,
        precio_mercado_nuevo: null,
        precio_mercado_fuente_url: null,
        precio_mercado_fuente_titulo: null,
        precio_mercado_estado: 'pendiente',
      }])
      dispararPrecioMercado(dataMueble.mueble.id)
      setMostrarRescate(false)
```

y reemplazarlo por:

```typescript
      setMuebles(prev => [...prev, {
        id: dataMueble.mueble.id,
        titulo: rescateNombre.trim(),
        cantidad: 1,
        precio_mueble: dataMueble.mueble.precio_mueble,
        co2_evitado_kg: dataMueble.mueble.co2_evitado_kg,
        imagen_preview: null,
        precio_mercado_nuevo: null,
        precio_mercado_fuente_url: null,
        precio_mercado_fuente_titulo: null,
        precio_mercado_estado: 'pendiente',
      }])
      dispararPrecioMercado(dataMueble.mueble.id)
      // Si venía de una tarjeta de itemsPendientes, esa tarjeta ya cumplió
      // su propósito (guía de título/descripción) — el rescate creó su
      // propio mueble, así que se quita para no dejar un duplicado fantasma.
      if (rescateDesdeUiKey) quitarItemPendiente(rescateDesdeUiKey)
      setRescateDesdeUiKey(undefined)
      setMostrarRescate(false)
```

- [ ] **Step 3: Reemplazar el `return (...)` completo del componente**

Reemplazar desde `return (` (línea ~871, justo antes de `<div className="pb-6 ...">`) hasta el `)` que cierra la función `NuevaCotizacionContent` (la línea final del archivo, antes de la última `}`), por:

```typescript
  return (
    <div className="pb-6 bg-[var(--bg-primary)] overflow-x-hidden">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminPageHeader titulo={cotizacionIdParam ? 'Agregar ítems' : 'Nueva cotización'} showBack />

        {cargandoExistente ? (
          <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
            <p className={`text-sm ${ts}`}>Cargando la cotización...</p>
          </div>
        ) : (
          <>
            {/* Identificación del cliente — obligatoria antes de subir cualquier foto */}
            {!cliente && (
              <IdentificacionCliente conEmpresa={conEmpresa} onClienteListo={handleClienteListo} />
            )}

            {cliente && (
              <div className={`rounded-[12px] border p-3 mb-4 flex items-center justify-between gap-2 ${cardBg}`}>
                <div className="min-w-0">
                  {(() => {
                    const emp = Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes
                    if (emp && !cliente.telefono) {
                      return (
                        <>
                          <p className={`text-sm font-semibold truncate ${tp}`}>
                            {emp.nombre_comercial ? `${emp.nombre_comercial} (${emp.razon_social})` : emp.razon_social}
                          </p>
                          <p className={`text-xs ${ts}`}>NIT {emp.nit}</p>
                        </>
                      )
                    }
                    return (
                      <>
                        <p className={`text-sm font-semibold truncate ${tp}`}>{cliente.nombre} {cliente.apellido ?? ''}</p>
                        <p className={`text-xs ${ts}`}>
                          {formatTelefonoVista(cliente.telefono, cliente.telefono_indicativo)}
                          {emp ? ` · NIT ${emp.nit}` : ''}
                        </p>
                      </>
                    )
                  })()}
                </div>
                {muebles.length === 0 && (
                  <button onClick={() => setCliente(null)} className="text-xs font-semibold text-[var(--color-brand)] hover-pop hover-press flex-shrink-0">
                    Cambiar
                  </button>
                )}
              </div>
            )}

            {/* Lista de muebles ya agregados a la cotización */}
            {cliente && muebles.length > 0 && (
              <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
                <p className={`text-xs font-semibold mb-3 ${ts}`}>
                  {formatNumero(muebles.length)} línea{muebles.length === 1 ? '' : 's'} agregada{muebles.length === 1 ? '' : 's'}
                </p>
                <div className="space-y-2">
                  {muebles.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {m.imagen_preview && (
                        <img src={m.imagen_preview} alt="" className="w-10 h-10 rounded-[8px] object-cover object-center flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${tp}`}>{m.titulo}{m.cantidad > 1 ? ` × ${m.cantidad}` : ''}</p>
                        <p className={`text-xs ${ts}`}>{formatCOP(m.precio_mueble)}</p>
                        {m.precio_mercado_estado === 'pendiente' && (
                          <p className={`text-xs flex items-center gap-1 mt-0.5 ${ts}`}>
                            <Loader2 size={11} className="animate-spin" /> Buscando precio de referencia...
                          </p>
                        )}
                        {(m.precio_mercado_estado === 'sugerido' || m.precio_mercado_estado === 'confirmado') && m.precio_mercado_nuevo && (
                          <button onClick={() => abrirEdicionPrecio(m)} className="text-xs flex items-center gap-1 mt-0.5 hover-pop hover-press text-[#00827C]">
                            {m.precio_mercado_estado === 'confirmado'
                              ? <CheckCircle size={11} />
                              : <Pencil size={11} />}
                            Nuevo: {formatCOP(m.precio_mercado_nuevo)}
                            {m.precio_mercado_fuente_url && <ExternalLink size={11} />}
                          </button>
                        )}
                        {m.precio_mercado_estado === 'sin_resultado' && (
                          <button onClick={() => abrirEdicionPrecio(m)} className={`text-xs flex items-center gap-1 mt-0.5 hover-pop hover-press ${ts}`}>
                            <Pencil size={11} /> Agregar precio de mercado nuevo
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-bold ${tp}`}>Total</span>
                    <span className="text-sm font-bold text-[#00827C]">{formatCOP(totalPrecio)}</span>
                  </div>
                  <div className={`mt-1 text-xs ${ts}`}>Evitas {formatNumero(totalCo2, { unidad: 'kg CO2 eq' })}</div>
                </div>
              </div>
            )}

            {/* Zona 1: ítem activo — tarjeta de subir fotos, o el skeleton de
                "Analizando..." mientras corre la IA. Nunca las dos a la vez:
                mostrandoTarjeta se apaga apenas se dispara el análisis. */}
            {cliente && mostrandoTarjeta && !procesando && (
              <div className="space-y-4">
                <TarjetaGrupoFotos
                  grupo={grupoActivo}
                  numero={numeroItemActivo}
                  esPrimero={numeroItemActivo === 1}
                  maxFotos={MAX_FOTOS_POR_TANDA}
                  error={error}
                  onCambiarModo={(modo) => setGrupoActivo(prev => ({ ...prev, modo }))}
                  onAgregarFotos={agregarFotosAlActivo}
                  onQuitarFoto={quitarFotoDelActivo}
                />
              </div>
            )}

            {procesando && (
              <div className={`rounded-[12px] border p-6 ${cardBg}`}>
                <SkeletonCard lineas={3} className="border-0 p-0" />
                <p className={`text-sm text-center mt-4 ${ts}`}>
                  {(() => {
                    const mensajes = mensajesAnalizando(1)
                    return analizandoMsgIndex < mensajes.length
                      ? mensajes[analizandoMsgIndex]
                      : 'Sigue en proceso, puede tardar hasta un minuto con conexión lenta.'
                  })()}
                </p>
              </div>
            )}

            {/* Zona 2: necesita tu atención — tarjetas sin categoría (o con
                guardado fallido) + preguntas "¿ítem aparte?" sin responder.
                Pueden acumularse varias a la vez, nunca bloquean que se
                agregue o analice otro ítem. */}
            {itemsPendientes.length > 0 && (
              <div className="space-y-4 mt-4">
                <p className={`text-xs font-semibold ${ts}`}>Necesita tu atención</p>
                {itemsPendientes.map((item) => (
                  <div key={item._uiKey} className="space-y-2">
                    <GrupoItemCard
                      item={item}
                      catalogo={catalogo}
                      conEmpresa={conEmpresa}
                      onChange={(nuevo) => actualizarItemPendiente(item._uiKey, nuevo)}
                      onQuitar={() => quitarItemPendiente(item._uiKey)}
                      onDuplicar={() => {}}
                    />
                    {item._errorGuardado && (
                      <p className="text-sm text-[#FF5E4B] flex items-center gap-1">
                        <WarningCircle size={16} /> {item._errorGuardado}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {!item.item_id && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => abrirRescate(item._uiKey, item.titulo)}
                        >
                          No lo encuentro, crear ítem nuevo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="flex-1"
                        icon={item._errorGuardado ? <RefreshCw size={16} strokeWidth={2.5} /> : undefined}
                        onClick={() => guardarItemPendiente(item)}
                      >
                        {item._errorGuardado ? 'Reintentar guardar' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sinMatch.length > 0 && (
              <div className="space-y-3 mt-4">
                {sinMatch.map((pieza, i) => (
                  <div key={i} className={`rounded-[12px] border p-4 ${isDark ? 'bg-[#F6BF3E]/10 border-[#F6BF3E]/25' : 'bg-[#F6BF3E]/08 border-[#F6BF3E]/20'}`}>
                    <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-[#F6BF3E]' : 'text-[#8a6d1f]'}`}>Se detectó algo más en las fotos</p>
                    <div className="flex items-center gap-3 mb-3">
                      {pieza.imagenPreview && (
                        <img src={pieza.imagenPreview} alt="" className="w-16 h-16 rounded-[8px] object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-semibold ${tp}`}>{pieza.titulo}</p>
                        <p className={`text-xs ${ts}`}>{pieza.descripcion}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold mb-3 ${tp}`}>¿Esto es un ítem aparte?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => descartarPiezaComoItemAparte(pieza)}>No</Button>
                      <Button size="sm" className="flex-1" onClick={() => confirmarPiezaComoItemAparte(pieza)}>Sí, es aparte</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {noIdentificados.length > 0 && (
              <div className={`rounded-[12px] border p-4 mt-4 ${isDark ? 'bg-[#F6BF3E]/10 border-[#F6BF3E]/25' : 'bg-[#F6BF3E]/08 border-[#F6BF3E]/20'}`}>
                <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-[#F6BF3E]' : 'text-[#8a6d1f]'}`}>No reconocidos en el catálogo</p>
                <div className="flex flex-col gap-3">
                  {noIdentificados.map((n, i) => (
                    <div key={`ni-${i}`} className="flex items-center gap-3">
                      <p className={`text-xs flex-1 ${ts}`}>• {n}</p>
                      <button
                        type="button"
                        onClick={() => buscarEnCatalogoDesdeTexto(i)}
                        className="text-xs font-semibold text-[#00827C] hover-pop hover-press flex-shrink-0 px-2 py-1"
                      >
                        Buscar en catálogo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && !procesando && itemsPendientes.length === 0 && (
              <p className="text-sm text-[#FF5E4B] flex items-center gap-1 mt-4">
                <WarningCircle size={16} /> {error}
              </p>
            )}
          </>
        )}
      </div>

      {/* Barra de acciones sticky — mismo patrón que /admin/categorias: degradado de
          desvanecido, nunca línea divisoria dura ni position:fixed. */}
      {!cargandoExistente && cliente && (
        <div className="sticky bottom-0 z-30 w-full bg-[var(--bg-primary)] py-3 border-t border-[var(--border)] -mt-5">
          <div aria-hidden="true" className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
          <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
            {!procesando && mostrandoTarjeta && (
              <Button
                onClick={analizarItemActivo}
                disabled={grupoActivo.fotos.length === 0}
                icon={<ArrowRight size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Analizar este ítem
              </Button>
            )}
            {!procesando && !mostrandoTarjeta && (
              <Button
                variant="secondary"
                onClick={agregarOtroItem}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Agregar otro ítem
              </Button>
            )}
            {procesando && (
              <Button loading disabled className="flex-1 w-full">
                Analizando...
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={procesando || itemsPendientes.length > 0 || muebles.length === 0}
              onClick={() => cotizacionId && router.push(conEmpresa(`/empresa/cotizador/${cotizacionId}`))}
              className="flex-1 w-full"
            >
              Ir a la cotización
            </Button>
          </div>
        </div>
      )}

      {/* Formulario de rescate: ítem que la IA no detectó, o que un ítem
          pendiente no logró encontrar en el catálogo */}
      <Modal
        abierto={mostrarRescate && !confirmarTipoRescate}
        onClose={() => { setMostrarRescate(false); setRescateDesdeUiKey(undefined) }}
        titulo="Agregar ítem"
        descripcion="Descríbelo tal como lo verías en el catálogo. El impacto ambiental es tu mejor estimado, el super_admin lo revisa después."
        textoConfirmar="Continuar"
        onConfirmar={() => { if (validarRescate()) setConfirmarTipoRescate(true) }}
        onCancelar={() => { setMostrarRescate(false); setRescateDesdeUiKey(undefined) }}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre del ítem</label>
            <input value={rescateNombre} onChange={e => setRescateNombre(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]" placeholder="Ej. Silla auxiliar" />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Categoría</label>
            <Selector
              value={rescateCategoriaId}
              onChange={setRescateCategoriaId}
              opciones={[
                { value: '', label: 'Elige una categoría' },
                ...categoriasHoja.map(c => ({ value: c.id, label: c.nombre })),
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Precio estimado</label>
              <input type="number" min={0} value={rescatePrecio} onChange={e => setRescatePrecio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]" placeholder="$" />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>kg CO2 eq evitado</label>
              <input type="number" min={0} step="0.01" value={rescateCo2} onChange={e => setRescateCo2(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]" placeholder="kg" />
            </div>
          </div>
          {error && <p className="text-sm text-[#FF5E4B]">{error}</p>}
        </div>
      </Modal>

      {/* Elección: solo esta cotización vs Ítem Maestro del catálogo */}
      <Modal
        abierto={confirmarTipoRescate}
        onClose={() => setConfirmarTipoRescate(false)}
        titulo="¿Cómo guardamos este ítem?"
        descripcion="'Solo esta cotización' no deja huella en el catálogo compartido. 'Ítem Maestro' lo deja disponible para el resto de tu empresa en futuras cotizaciones."
        textoCancelar="Solo esta cotización"
        textoConfirmar="Guardar como Ítem Maestro"
        onCancelar={() => confirmarRescate(false)}
        onConfirmar={() => confirmarRescate(true)}
      />

      {/* Confirmar/corregir el precio de mercado sugerido por IA (Reporte 1) */}
      <Modal
        abierto={muebleEditandoPrecio !== null}
        onClose={() => setMuebleEditandoPrecio(null)}
        icono={<Leaf size={20} className="text-[#00827C]" />}
        titulo="Precio de mercado nuevo"
        descripcion={(() => {
          const m = muebles.find(x => x.id === muebleEditandoPrecio)
          return m?.precio_mercado_fuente_url ? (
            <>
              Precio sugerido por IA. Confírmalo o corrígelo si no coincide con lo que ves en el mercado.
              {' '}
              <a href={m.precio_mercado_fuente_url} target="_blank" rel="noopener noreferrer" className="text-[#00827C] font-semibold underline inline-flex items-center gap-1">
                Ver fuente{m.precio_mercado_fuente_titulo ? `: ${m.precio_mercado_fuente_titulo}` : ''} <ExternalLink size={11} />
              </a>
            </>
          ) : 'No encontramos una fuente confiable en internet. Ingresa el precio de un mueble nuevo equivalente a mano.'
        })()}
        textoCancelar="Cancelar"
        textoConfirmar={guardandoPrecioMercado ? 'Guardando...' : 'Confirmar precio'}
        onCancelar={() => setMuebleEditandoPrecio(null)}
        onConfirmar={confirmarPrecioMercado}
      >
        <input
          type="number" min={0} value={precioEditadoInput}
          onChange={e => setPrecioEditadoInput(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
          placeholder="$"
        />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4: Limpiar imports que quedaron sin uso**

Con el nuevo JSX, `XCircle` y `Clock` ya no se usan (el "No se detectó ningún mueble" ahora es un mensaje de texto plano vía `error`, y la tarjeta de "en cola" desapareció). Revisar el import de la línea 6 y quitar los que el editor/`tsc` marque como no usados — no quitar ninguno que SÍ siga en uso (`Leaf`, `Drop`, `Plus`, `ArrowRight`, `WarningCircle`, `Loader2`, `ExternalLink`, `CheckCircle`, `Pencil`, `RefreshCw` todos siguen usándose).

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en `page.tsx`. Si aparece algún símbolo residual del modelo viejo (`gruposPendientes`, `colaProcesar`, `procesandoIdx`, `itemsDetectados`, `preguntaItemAparte`, `estado`, `EstadoUI`, `agregarFotosAGrupo`, `quitarFotoDeGrupo`, `quitarGrupo`, `generarPropuesta`, `confirmarYAvanzar`, `procesarIndiceCola`, `guardarItemsDetectadosEnCotizacion`, `agregarGrupoNuevo`, `elegirCandidato`, `duplicarDetectado`, `quitarDetectado`, `actualizarItem`, `totalPrecioDetectado`, `totalCo2Detectado`, `totalAguaDetectada`, `analizarGrupoConIA`, `continuarGrupoManual`), es una referencia que quedó del archivo viejo y hay que terminar de reemplazarla siguiendo el mismo criterio de las Tasks 6-7.

Nota: `totalPrecioDetectado`/`totalCo2Detectado`/`totalAguaDetectada` (línea ~862-864 del archivo original) y su uso en el bloque "Subtotal ítem N / Total" ya no aplican (no hay un `itemsDetectados` agregado sobre el que sumar) — quedan eliminados junto con el resto del modelo viejo, no hace falta un reemplazo equivalente: cada ítem ahora se guarda solo y ya se ve reflejado en el bloque "N líneas agregadas" de arriba (que sí sigue mostrando `totalPrecio`/`totalCo2` de `muebles`).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "refactor: reemplazar el modelo de cascada+cola por procesamiento automático de un ítem a la vez (UI)"
```

---

## Task 8: Verificación en vivo end-to-end

**Files:** ninguno nuevo — solo pruebas.

- [ ] **Step 1: Confirmar que la migración de Task 1 ya corrió**

Preguntar al usuario si ya ejecutó `sql/107_borrador_iniciado_at.sql` en Supabase. Si no, pedírselo antes de continuar (Task 2 y el cron de Task 3 no funcionan sin la columna).

- [ ] **Step 2: Reiniciar el servidor limpio**

```bash
npx pm2 stop reuso && rm -rf .next && npx pm2 restart reuso --update-env
```

- [ ] **Step 3: Script Playwright con cuenta efímera — ítem CON coincidencia de catálogo**

Mismo patrón usado toda esta sesión (`admin.auth.admin.createUser` + esperar ~4s por el lag de replicación conocido + empresa con módulo Cotizador CRM activo + login con `button[aria-label="Aceptar términos legales"]`). Simular:
1. Login, ir a `/empresa/cotizador/nueva`.
2. Identificar cliente.
3. Subir 1 foto real de un mueble que sí exista en el catálogo de la empresa de prueba (o usar `item_materiales`/`items` ya sembrados).
4. Click "Analizar este ítem".
5. Esperar a que `procesando` termine (poll cada 2s hasta 70s máx, dado que el análisis real puede tardar hasta 60s).
6. Confirmar en el DOM: (a) NO aparece ningún botón "Guardar" — el ítem ya se guardó solo; (b) el bloque "N líneas agregadas" ya muestra 1 línea; (c) el botón "Agregar otro ítem" está visible.

Expected: los 3 checks pasan sin que el script haga ningún clic de "guardar".

- [ ] **Step 4: Mismo script — ítem SIN coincidencia de catálogo**

Continuando la misma sesión: subir una foto que no vaya a matchear con nada del catálogo de prueba (o mockear una empresa con catálogo vacío para ese tipo de mueble). Confirmar:
1. Tras analizar, aparece una tarjeta en "Necesita tu atención" (GrupoItemCard con categoría vacía).
2. El campo "Nombre para mostrar" ya trae el título sugerido por la IA (no vacío).
3. Elegir categoría + ítem del catálogo en los selectores, click "Guardar" — la tarjeta desaparece de "Necesita tu atención" y "N líneas agregadas" sube a 2.

- [ ] **Step 5: Confirmar la marca "Borrador" en la lista**

Navegar a `/empresa/cotizador`, confirmar que la cotización recién creada aparece con la etiqueta "Borrador" en la columna de estado (no "Por cotizar").

- [ ] **Step 6: Confirmar `borrador_iniciado_at` en la base**

Con el mismo script (usando el `SUPABASE_SERVICE_ROLE_KEY` como el resto de scripts de esta sesión), consultar `crm_cotizaciones.borrador_iniciado_at` para esa cotización — debe ser un timestamp no nulo, de hace pocos segundos.

- [ ] **Step 7: Limpieza**

Borrar la empresa/usuario/cotización de prueba igual que en todos los scripts anteriores de esta sesión (`crm_cotizaciones`, `crm_clientes`, `modulos_empresa`, `empresas`, `auth.admin.deleteUser`).

- [ ] **Step 8: Reportar resultado al usuario**

Si algún check falla, arreglarlo antes de reportar la tarea como terminada (no se reporta éxito sin evidencia real, ver skill `verification-before-completion`).

---

## Self-Review (ya aplicado al escribir este plan)

1. **Cobertura de la spec:** sección A (procesamiento automático, botón de rescate eliminado como standalone, tope de ítems eliminado) → Tasks 6-7. Sección B (columna, endpoint, cron, badge, aclaración de borrado manual) → Tasks 1-4. Todo cubierto.
2. **Placeholders:** ninguno — cada paso trae el código final completo, no descripciones.
3. **Consistencia de tipos:** `ItemConImagen._errorGuardado` (Task 5) se usa en Task 7 con el mismo nombre; `guardarItemPendiente`/`quitarItemPendiente`/`actualizarItemPendiente` (Task 6) se usan con esos mismos nombres en Task 7; `intentarGuardarItem`/`analizarGrupo`/`procesarGrupo`/`drenarColaExtra`/`agregarOtroItem`/`analizarItemActivo` — mismos nombres en ambas tareas.
