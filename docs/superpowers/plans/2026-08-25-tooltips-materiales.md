# Tooltips editables para materiales base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un tooltip de ayuda junto al nombre de cualquier material que coincida con uno de los 8 materiales base del Cotizador, en las 5 pantallas donde se muestra un material — y permitir editar ese texto exclusivamente desde `/admin/categorias`.

**Architecture:** Una tabla nueva y chica (`cotizador_material_descripciones`, sin auditoría) + 2 endpoints (GET público para roles del Cotizador, PATCH restringido) + un componente compartido de solo lectura (`TooltipInfo`) usado en 5 pantallas + un pequeño control de edición inline (lápiz + textarea) exclusivo de `categorias-client.tsx`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres), Zod.

Spec de referencia: `docs/superpowers/specs/2026-08-25-tooltips-materiales-design.md`.

---

## Task 1: Migración SQL — tabla + siembra de los 4 textos

**Files:**
- Create: `sql/108_material_descripciones.sql`

- [ ] **Step 1: Verificar que 108 sigue siendo el siguiente número libre**

Run: `ls sql/ | tail -3`
Expected: el archivo más reciente es `107_borrador_iniciado_at.sql`. Si ya existe un `108_*.sql`, usar el siguiente número libre y ajustar el resto de este plan.

- [ ] **Step 2: Escribir la migración**

```sql
-- sql/108_material_descripciones.sql
-- Texto de ayuda (tooltip) por cada material "base" del Cotizador
-- (src/lib/cotizador/plantillas-base.ts, BASE_MATERIALES). Un solo texto
-- compartido por toda la plataforma, sin columnas de auditoría (decisión
-- explícita del usuario). Se edita exclusivamente desde /admin/categorias
-- y se muestra en modo solo-lectura en cualquier otra pantalla que
-- renderice un material con ese nombre exacto (ver spec
-- 2026-08-25-tooltips-materiales-design.md).
CREATE TABLE IF NOT EXISTS cotizador_material_descripciones (
  nombre text PRIMARY KEY,
  descripcion text NOT NULL DEFAULT ''
);

ALTER TABLE cotizador_material_descripciones ENABLE ROW LEVEL SECURITY;

-- Lectura abierta a cualquier usuario autenticado (empresa_admin, empleado,
-- super_admin) — no hay dato sensible ni de empresa aquí, es un catálogo
-- compartido. Escritura solo vía service role (adminClient en el backend),
-- nunca desde el cliente.
CREATE POLICY material_descripciones_lectura ON cotizador_material_descripciones
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO cotizador_material_descripciones (nombre, descripcion) VALUES
  ('Hierro', ''),
  ('Acero', ''),
  ('Polipropileno', ''),
  ('Espumas rígidas', 'Bloque duro y denso que sostiene la estructura sin deformarse. Ej.: espuma rosada de alta densidad, espuma aglomerada/prensada (chipboard) y poliestireno extruido (para moldes internos).'),
  ('Espumas flexibles', 'Acolchado suave y elástico que brinda comodidad al sentarse. Ej.: Espuma gris clásica de cojines, espuma viscoelástica (memory foam) y espuma de poliuretano suave para respaldos.'),
  ('Madera dura', 'Madera maciza y resistente para partes expuestas o de alto soporte. Ej.: Roble, cedro y nogal (para patas, brazos a la vista y armazones principales).'),
  ('Madera blanda', 'Material liviano y fácil de trabajar para piezas internas. Ej.: Láminas de MDF, triplex/contrachapado de pino y listones de pino cepillado (para fondos, respaldos ciegos y refuerzos ocultos).'),
  ('Cuero', '')
ON CONFLICT (nombre) DO NOTHING;
```

- [ ] **Step 3: Avisar al usuario que corra la migración**

Este proyecto no aplica migraciones automáticamente. El usuario debe correr `sql/108_material_descripciones.sql` en el SQL Editor de Supabase antes de que el resto de las tareas de este plan funcionen en vivo.

- [ ] **Step 4: Commit**

```bash
git add sql/108_material_descripciones.sql
git commit -m "feat: agregar tabla cotizador_material_descripciones con los 4 textos iniciales"
```

---

## Task 2: Endpoints GET/PATCH de descripciones de materiales

**Files:**
- Create: `src/app/api/cotizador/material-descripciones/route.ts`

- [ ] **Step 1: Escribir el endpoint**

```typescript
// src/app/api/cotizador/material-descripciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { BASE_MATERIALES } from '@/lib/cotizador/plantillas-base'

// Mapa { nombre: descripcion } de los 8 materiales base — un solo texto
// compartido por toda la plataforma (sin empresa_id, ver spec). GET abierto
// a cualquier rol con acceso al Cotizador; PATCH solo empresa_admin o
// super_admin (cotizadorAuthCheck ya incluye el bypass automático de
// super_admin), y solo permite tocar uno de los 8 nombres conocidos —
// nunca crea una entrada arbitraria nueva.

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth

  const { data, error } = await adminClient
    .from('cotizador_material_descripciones')
    .select('nombre, descripcion')

  if (error) {
    console.error('[GET /api/cotizador/material-descripciones]', error)
    return NextResponse.json({ error: 'Error al cargar las descripciones.' }, { status: 500 })
  }

  const mapa: Record<string, string> = {}
  for (const fila of (data ?? []) as { nombre: string; descripcion: string }[]) {
    mapa[fila.nombre] = fila.descripcion
  }

  return NextResponse.json({ descripciones: mapa })
}

const patchSchema = z.object({
  nombre: z.enum(BASE_MATERIALES as [string, ...string[]]),
  descripcion: z.string().max(500),
})

export async function PATCH(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth

  const raw = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('cotizador_material_descripciones')
    .upsert({ nombre: parsed.data.nombre, descripcion: parsed.data.descripcion.trim() }, { onConflict: 'nombre' })

  if (error) {
    console.error('[PATCH /api/cotizador/material-descripciones]', error)
    return NextResponse.json({ error: 'Error al guardar la descripción.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo. Ignora errores preexistentes en otros archivos no relacionados.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cotizador/material-descripciones/route.ts
git commit -m "feat: endpoints GET/PATCH para descripciones de materiales base"
```

---

## Task 3: Componente compartido `TooltipInfo` (solo lectura)

**Files:**
- Create: `src/components/ui/tooltip-info.tsx`

**Contexto:** extrae el patrón de tooltip que ya existe duplicado 2 veces en `src/app/(empresa)/empresa/cotizador/components/sales-dashboard.tsx` (ícono `Question` + `group/tt` + span absoluto). No renderiza nada si el texto está vacío — así las 5 pantallas pueden llamarlo siempre, sin condicional propio.

- [ ] **Step 1: Escribir el componente**

```tsx
// src/components/ui/tooltip-info.tsx
'use client'

import { Question } from '@/components/ui/icons'

interface Props {
  texto: string
  className?: string
}

/**
 * Ícono de información con tooltip flotante al pasar el mouse/tocar — mismo
 * patrón ya usado en sales-dashboard.tsx (Ticket promedio, Tasa de cierre),
 * extraído acá para no seguir duplicando el CSS a mano. No renderiza nada
 * si `texto` está vacío, para que el llamador no necesite su propio if.
 */
export function TooltipInfo({ texto, className }: Props) {
  if (!texto) return null
  return (
    <span className={`group/tt relative inline-flex flex-shrink-0 ${className ?? ''}`}>
      <Question size={12} className="cursor-help" sinAnimacion />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-[60] w-52 rounded-lg bg-[var(--text-primary)] px-2.5 py-1.5 text-[11px] font-normal leading-snug text-[var(--bg-primary)] opacity-0 scale-95 transition-all group-hover/tt:opacity-100 group-hover/tt:scale-100 text-center">
        {texto}
      </span>
    </span>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tooltip-info.tsx
git commit -m "feat: extraer componente compartido TooltipInfo"
```

---

## Task 4: Cargar el mapa de descripciones — hook compartido

**Files:**
- Create: `src/lib/cotizador/use-material-descripciones.ts`

**Contexto:** las 5 pantallas necesitan el mismo mapa `{ nombre: descripcion }`, cargado una sola vez. Un hook chico evita repetir el mismo `useEffect`+`fetch` 5 veces.

- [ ] **Step 1: Escribir el hook**

```typescript
// src/lib/cotizador/use-material-descripciones.ts
import { useEffect, useState } from 'react'

/**
 * Carga una sola vez el mapa { nombre: descripcion } de los 8 materiales
 * base del Cotizador — compartido por las 5 pantallas que muestran
 * materiales. `conEmpresa` es la misma función que cada pantalla ya usa
 * para anexar `?empresa_id=` cuando aplica (super_admin operando por
 * cuenta de una empresa).
 */
export function useMaterialDescripciones(conEmpresa: (url: string) => string) {
  const [descripciones, setDescripciones] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelado = false
    fetch(conEmpresa('/api/cotizador/material-descripciones'))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelado && d) setDescripciones(d.descripciones ?? {}) })
      .catch(() => {})
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return descripciones
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo.

- [ ] **Step 3: Commit**

```bash
git add src/lib/cotizador/use-material-descripciones.ts
git commit -m "feat: hook compartido para cargar descripciones de materiales base"
```

---

## Task 5: Wire en `grupo-item-card.tsx` (agregar ítem nuevo)

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx`

- [ ] **Step 1: Importar el hook y el componente**

Cerca de los imports existentes (línea 1-9), agregar:

```typescript
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'
```

- [ ] **Step 2: Llamar al hook dentro del componente**

Busca la línea `const [zoomAbierto, setZoomAbierto] = useState(false)` (dentro de `GrupoItemCard`) y agrega justo después:

```typescript
  const descripcionesMaterial = useMaterialDescripciones(conEmpresa)
```

- [ ] **Step 3: Mostrar el tooltip junto al nombre del material**

Busca el bloque (línea ~357-361):

```tsx
              {(m as { _esNuevo?: boolean })._esNuevo ? (
                <input value={m.nombre} onChange={e => actualizarMaterial(i, { nombre: e.target.value })} placeholder="Ej: Hierro" className={`flex-1 min-w-[80px] ${rowInputSt}`} />
              ) : (
                <span className="flex-1 min-w-[80px] text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight" title={m.nombre}>{m.nombre}</span>
              )}
```

Reemplázalo por:

```tsx
              {(m as { _esNuevo?: boolean })._esNuevo ? (
                <input value={m.nombre} onChange={e => actualizarMaterial(i, { nombre: e.target.value })} placeholder="Ej: Hierro" className={`flex-1 min-w-[80px] ${rowInputSt}`} />
              ) : (
                <span className="flex-1 min-w-[80px] flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                  <span className="line-clamp-2 leading-tight" title={m.nombre}>{m.nombre}</span>
                  <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />
                </span>
              )}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"
git commit -m "feat: mostrar tooltip de materiales base al agregar un ítem"
```

---

## Task 6: Wire en `editar-mueble-modal.tsx`

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/[id]/components/editar-mueble-modal.tsx`

- [ ] **Step 1: Importar el hook y el componente**

Agregar junto a los imports existentes:

```typescript
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'
```

- [ ] **Step 2: Llamar al hook**

Busca dónde el componente recibe/usa `conEmpresa` (ya existe como prop o función local, como en el resto del módulo) y agrega, junto a los demás `useState`/hooks del componente:

```typescript
  const descripcionesMaterial = useMaterialDescripciones(conEmpresa)
```

- [ ] **Step 3: Mostrar el tooltip junto al nombre del material**

Busca la línea (~324):

```tsx
                  <input value={m.nombre} onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} placeholder="Ej: Hierro" className="flex-1 bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]" />
```

Reemplázala por (envuelve el input existente y agrega el tooltip al lado, sin cambiar su comportamiento):

```tsx
                  <span className="flex-1 flex items-center gap-1 min-w-[80px]">
                    <input value={m.nombre} onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} placeholder="Ej: Hierro" className="flex-1 bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]" />
                    <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />
                  </span>
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo. Si `conEmpresa` no existe como identificador accesible en este componente (revisa cómo se llama la función equivalente aquí — puede tener otro nombre local), usa el nombre real que ya usa el resto del archivo para armar URLs con `empresa_id`, sin inventar una función nueva.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/[id]/components/editar-mueble-modal.tsx"
git commit -m "feat: mostrar tooltip de materiales base al editar un mueble guardado"
```

---

## Task 7: Wire + edición en `categorias-client.tsx` (único lugar editable)

**Files:**
- Modify: `src/app/(admin)/admin/categorias/components/categorias-client.tsx`

- [ ] **Step 1: Importar el hook y el componente**

Agregar junto a los imports existentes:

```typescript
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'
```

- [ ] **Step 2: Escribir el control editable (lápiz + textarea inline)**

Justo antes de `function EditorMateriales(...)` (línea ~125), agregar:

```tsx
// Único lugar de todo el proyecto donde se edita el texto de un tooltip de
// material base — en cualquier otra pantalla es solo lectura (TooltipInfo).
// "Muy fácil de dictar": un <textarea> normal, el dictado por voz del
// sistema operativo ya funciona sobre cualquier campo nativo.
function TooltipEditable({ nombre, texto, conEmpresa, onGuardado }: {
  nombre: string
  texto: string
  conEmpresa: (url: string) => string
  onGuardado: (nombre: string, nuevoTexto: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(texto)
  const [guardando, setGuardando] = useState(false)

  if (editando) {
    return (
      <div className="flex flex-col gap-1.5 w-full mt-1">
        <textarea
          value={valor}
          onChange={e => setValor(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] resize-none"
          placeholder={`Describe qué es "${nombre}"...`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={guardando}
            onClick={async () => {
              setGuardando(true)
              const res = await fetch(conEmpresa('/api/cotizador/material-descripciones'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, descripcion: valor }),
              })
              setGuardando(false)
              if (res.ok) { onGuardado(nombre, valor); setEditando(false) }
            }}
            className="text-xs font-semibold text-[var(--color-brand)] hover-pop"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => { setValor(texto); setEditando(false) }} className="text-xs text-[var(--text-secondary)] hover-pop">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <TooltipInfo texto={texto} />
      <button type="button" onClick={() => setEditando(true)} title="Editar descripción" className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--color-brand)] hover-pop">
        <Pencil size={12} sinAnimacion />
      </button>
    </span>
  )
}
```

Verifica que `Pencil` ya está importado del hub de íconos en este archivo (`@/components/ui/icons`) — si no, agrégalo al import existente.

- [ ] **Step 3: Llamar al hook dentro de `EditorMateriales` y usar el control**

`EditorMateriales` hoy no recibe `conEmpresa` como prop. Amplía su firma (línea ~125-130):

```typescript
function EditorMateriales({ titulo, materiales, setMateriales, mostrarPeso }: {
  titulo?: string
  materiales: MaterialRow[]
  setMateriales: React.Dispatch<React.SetStateAction<MaterialRow[]>>
  mostrarPeso?: boolean
}) {
```

por:

```typescript
function EditorMateriales({ titulo, materiales, setMateriales, mostrarPeso, conEmpresa }: {
  titulo?: string
  materiales: MaterialRow[]
  setMateriales: React.Dispatch<React.SetStateAction<MaterialRow[]>>
  mostrarPeso?: boolean
  conEmpresa: (url: string) => string
}) {
  const [descripcionesMaterial, setDescripcionesMaterial] = useMaterialDescripcionesState(conEmpresa)
```

Como este archivo no usa el hook `useMaterialDescripciones` directo (necesita poder ACTUALIZAR el mapa localmente apenas se guarda una edición, no solo leerlo), agrega esta pequeña variante justo arriba de `EditorMateriales` en el mismo archivo, en vez de reusar el hook de solo lectura de la Task 4:

```typescript
function useMaterialDescripcionesState(conEmpresa: (url: string) => string) {
  const [mapa, setMapa] = useState<Record<string, string>>({})
  useEffect(() => {
    let cancelado = false
    fetch(conEmpresa('/api/cotizador/material-descripciones'))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelado && d) setMapa(d.descripciones ?? {}) })
      .catch(() => {})
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [mapa, setMapa] as const
}
```

Verifica que `useState`/`useEffect` ya están importados en este archivo (es un `'use client'` grande, casi seguro que sí).

- [ ] **Step 4: Usar el control en la fila de material**

Busca el bloque (línea ~139-142):

```tsx
              <div>
                <label className={labelSt}>Material</label>
                <input style={inputSt} placeholder="Ej: Madera dura" value={m.nombre} onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
              </div>
```

Reemplázalo por:

```tsx
              <div>
                <label className={labelSt}>Material</label>
                <input style={inputSt} placeholder="Ej: Madera dura" value={m.nombre} onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
                {descripcionesMaterial[m.nombre] !== undefined && (
                  <div className="mt-1.5">
                    <TooltipEditable
                      nombre={m.nombre}
                      texto={descripcionesMaterial[m.nombre]}
                      conEmpresa={conEmpresa}
                      onGuardado={(nombre, nuevoTexto) => setDescripcionesMaterial(prev => ({ ...prev, [nombre]: nuevoTexto }))}
                    />
                  </div>
                )}
              </div>
```

- [ ] **Step 5: Pasar `conEmpresa` en los 2 call sites de `EditorMateriales`**

Busca las 2 líneas donde se invoca `<EditorMateriales ... />` (cerca de donde estaban las referencias originales, líneas ~136 y ~921 antes de esta tarea) y agrega la prop `conEmpresa={conEmpresa}` a cada una — usa el mismo identificador `conEmpresa` que el resto de este archivo ya usa para armar URLs con `empresa_id` (si el archivo usa otro nombre local para esa función, usa ese nombre real, no inventes uno).

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(admin)/admin/categorias/components/categorias-client.tsx"
git commit -m "feat: editar descripciones de materiales base desde /admin/categorias"
```

---

## Task 8: Wire en `catalogo-pendientes/page.tsx`

**Files:**
- Modify: `src/app/(admin)/admin/catalogo-pendientes/page.tsx`

- [ ] **Step 1: Importar el hook y el componente**

```typescript
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'
```

- [ ] **Step 2: Llamar al hook**

Dentro del componente de esta página (busca dónde ya se define `conEmpresa` o el equivalente local para armar URLs con `empresa_id` — si esta página no maneja empresas múltiples, usa `(url: string) => url` como identidad), agrega:

```typescript
  const descripcionesMaterial = useMaterialDescripciones(conEmpresa)
```

- [ ] **Step 3: Mostrar el tooltip junto al input de nombre**

Busca el bloque (línea ~142-147):

```tsx
                <input
                  value={m.nombre}
                  onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                  placeholder="Material"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                />
```

Reemplázalo por:

```tsx
                <span className="flex items-center gap-1">
                  <input
                    value={m.nombre}
                    onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                    placeholder="Material"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                  />
                  <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />
                </span>
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/admin/catalogo-pendientes/page.tsx"
git commit -m "feat: mostrar tooltip de materiales base en catálogo pendiente"
```

---

## Task 9: Wire en `dpp/nuevo/page.tsx`

**Files:**
- Modify: `src/app/(empresa)/empresa/dpp/nuevo/page.tsx`

**Nota:** en este archivo el campo se llama `material.material`, no `.nombre` — no lo confundas con los demás.

- [ ] **Step 1: Importar el hook y el componente**

```typescript
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'
```

- [ ] **Step 2: Llamar al hook**

Dentro del componente que renderiza `<FilaMaterial>` (busca `conEmpresa` local o equivalente ya usado en este archivo para `empresa_id`), agrega:

```typescript
  const descripcionesMaterial = useMaterialDescripciones(conEmpresa)
```

Pásalo como prop nueva a `FilaMaterial` en su único call site (línea ~520-529):

```tsx
          {materiales.map((m, i) => (
            <FilaMaterial
              key={i}
              material={m}
              isMobile={isMobile}
              descripcion={descripcionesMaterial[m.material] ?? ''}
              onChange={(updated) =>
                setMateriales((prev) => prev.map((x, j) => (j === i ? updated : x)))
              }
              onRemove={() => setMateriales((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
```

- [ ] **Step 3: Recibir la prop y mostrar el tooltip en `FilaMaterial`**

Busca la firma de `FilaMaterial` (línea ~49-59):

```typescript
function FilaMaterial({
  material,
  onChange,
  onRemove,
  isMobile = false,
}: {
  material: Material
  onChange: (m: Material) => void
  onRemove: () => void
  isMobile?: boolean
}) {
```

Reemplázala por:

```typescript
function FilaMaterial({
  material,
  onChange,
  onRemove,
  isMobile = false,
  descripcion = '',
}: {
  material: Material
  onChange: (m: Material) => void
  onRemove: () => void
  isMobile?: boolean
  descripcion?: string
}) {
```

Busca el input del nombre (línea ~70-74):

```tsx
      <input
        placeholder="Material (ej: madera)"
        value={material.material}
        onChange={(e) => onChange({ ...material, material: e.target.value })}
        style={inputStyle}
```

Envuélvelo agregando el tooltip justo después de su cierre (busca el `/>` que lo cierra y agrega inmediatamente después, dentro del mismo contenedor grid):

```tsx
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          placeholder="Material (ej: madera)"
          value={material.material}
          onChange={(e) => onChange({ ...material, material: e.target.value })}
          style={inputStyle}
        />
        <TooltipInfo texto={descripcion} />
      </span>
```

(Ajusta el cierre de la etiqueta original según cómo termine exactamente ese `<input .../>` en el archivo real — mantén cualquier otro atributo que ya tenga, solo se está envolviendo en un `<span>` y agregando el tooltip al lado.)

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(empresa)/empresa/dpp/nuevo/page.tsx"
git commit -m "feat: mostrar tooltip de materiales base en el formulario de DPP nuevo"
```

---

## Task 10: Verificación en vivo

**Files:** ninguno nuevo — solo pruebas.

- [ ] **Step 1: Confirmar que la migración de Task 1 ya corrió**

Preguntar al usuario si ya ejecutó `sql/108_material_descripciones.sql` en Supabase.

- [ ] **Step 2: Reiniciar el servidor limpio**

```bash
npx pm2 stop reuso && rm -rf .next && npx pm2 restart reuso --update-env
```

- [ ] **Step 3: Verificar visualmente en `/empresa/cotizador/nueva`**

Con una cuenta de prueba (mismo patrón de esta sesión: `admin.auth.admin.createUser` + `.upsert()` en `profiles` con `rol: 'empresa_admin'`, `.insert()` en `modulos_empresas` con `clave = 'cotizador_crm'`), llegar hasta la Tarjeta 3 ("Cálculo ambiental") de un ítem — confirmar con Playwright:
1. Aparece un ícono de información junto a "Espumas rígidas", "Espumas flexibles", "Madera dura" y "Madera blanda".
2. NO aparece ningún ícono junto a "Hierro", "Acero", "Polipropileno" o "Cuero" (descripción vacía).
3. Al hacer hover/tap sobre el ícono de "Madera dura", el texto que aparece coincide exactamente con el texto sembrado en Task 1.
4. NO hay ningún lápiz de edición en esta pantalla (edición exclusiva de `/admin/categorias`).

- [ ] **Step 4: Verificar la edición en `/admin/categorias`**

Con una cuenta `super_admin` de prueba, entrar a `/admin/categorias`, editar un ítem del catálogo hasta ver su lista de materiales, confirmar:
1. Junto a "Madera dura" aparece el ícono de información + un lápiz.
2. Al hacer clic en el lápiz, aparece un `<textarea>` con el texto actual.
3. Cambiar el texto y guardar — confirmar que el `PATCH` responde 200 y que el texto se actualiza en pantalla sin recargar.
4. Volver a `/empresa/cotizador/nueva` y confirmar que el tooltip de "Madera dura" ahora muestra el texto nuevo (sin caché viejo).

- [ ] **Step 5: Limpieza**

Borrar la empresa/usuario/cotización de prueba (mismo patrón que el resto de la sesión). Si se cambió el texto de algún material durante la prueba, restaurarlo al valor original de Task 1 antes de terminar.

- [ ] **Step 6: Reportar resultado al usuario**

Si algún check falla, arreglarlo antes de reportar la tarea como terminada.

---

## Self-Review

**1. Cobertura de la spec:** tabla sin auditoría (Task 1) ✓, un solo texto compartido (Task 1, sin `empresa_id`) ✓, GET/PATCH con los roles correctos (Task 2) ✓, componente compartido de solo lectura (Task 3) ✓, edición exclusiva en `/admin/categorias` (Task 7, único lugar con `TooltipEditable`) ✓, las 5 pantallas (Tasks 5, 6, 7, 8, 9) ✓, ícono condicional a texto no vacío (`TooltipInfo` retorna `null` si `texto` está vacío) ✓.

**2. Placeholders:** ninguno — cada paso trae código completo. La única ambigüedad reconocida explícitamente es el nombre real de la función `conEmpresa`/equivalente en `editar-mueble-modal.tsx`, `catalogo-pendientes/page.tsx` y `dpp/nuevo/page.tsx` — cada tarea instruye usar el nombre real ya existente en ese archivo, nunca inventar uno nuevo, porque no se leyeron esos 3 archivos completos antes de escribir este plan (si el patrón difiere de lo asumido, el ejecutor debe adaptarlo al real, no bloquearse).

**3. Consistencia de tipos:** `TooltipInfo({ texto, className })` se usa igual en las 5 tareas de wiring. `useMaterialDescripciones(conEmpresa)` devuelve `Record<string, string>` en Task 4 y se consume igual en Tasks 5, 6, 8, 9. Task 7 usa su propia variante `useMaterialDescripcionesState` (necesita `setState` para reflejar ediciones al instante) en vez del hook de solo lectura — nombrada distinto a propósito para no confundirla con la de Task 4.
