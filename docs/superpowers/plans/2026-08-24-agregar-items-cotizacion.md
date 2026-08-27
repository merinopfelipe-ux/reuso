# Agregar ítems por fotos a una cotización — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Este plan reemplaza** a `2026-08-18-grupos-de-fotos-apilados.md` y `2026-08-18-grupos-de-fotos-cotizador.md` (nunca ejecutados, diseño superado). No leerlos ni mezclarlos con este.
>
> **Spec aprobada**: `/Users/merinop/Documents/Automatizaciones/Bobedas/Reuso/journeys/15-agregar-items-cotizacion.md` (vault Obsidian, aprobada por el usuario 2026-08-24 sin cambios).

**Goal:** Reemplazar el flujo de "una tanda de fotos a la vez, se analiza al toque" de `/empresa/cotizador/nueva` por "hasta 4 ítems apilados en cascada, nada se analiza hasta un solo clic en Genera la propuesta, que procesa la cola uno a la vez".

**Architecture:** El estado de "qué se está armando" pasa de variables singulares (`fotos`, `modo`, `itemsDetectados`...) a un array `gruposPendientes: GrupoPendiente[]` (hasta 4, cada uno con sus propias fotos y modo). Al confirmar "Genera la propuesta", una cola de procesamiento (`colaProcesar`, inicializada desde `gruposPendientes` y capaz de crecer si aparece una pieza extra) se consume de a uno: cada grupo llama a la lógica ya existente (`analizarConIA`/`continuarManual`, adaptada para recibir un grupo específico en vez de leer el estado global), resuelve catálogo+pesos, guarda el ítem en la cotización automáticamente, y solo entonces arranca el siguiente de la cola.

**Tech Stack:** Next.js 14 App Router, TypeScript, React state (sin librería de colas externa — un array + un índice basta), Supabase vía los endpoints ya existentes (`/api/cotizador/diagnostico`, `/api/cotizador/cotizaciones/[id]/mueble`), Playwright para verificación en vivo.

**Decisión de diseño explícita (no implícita en la spec, decidida aquí para que el plan sea ejecutable sin pausas)**: cada ítem se **guarda automáticamente** en la cotización apenas su tarjeta queda armada (catálogo + pesos resueltos) — no hace falta un clic de "confirmar" por ítem. Esto es lo único que hace que "Genera la propuesta" sea de verdad un solo clic que arma toda la cotización sin más intervención. El vendedor puede seguir editando cualquier ítem después desde `/empresa/cotizador/[id]`, como ya puede hacer con cualquier mueble guardado hoy. Si el usuario prefiere un clic de confirmación por ítem, es un cambio de una sola línea en el Task 8 (avisar antes de tocarlo).

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/components/ui/modal-imagen-zoom.tsx` | Crear | Visor de imagen ampliada compartido |
| `src/app/cot/[token]/propuesta-client.tsx` | Modificar | Usa el componente compartido en vez de su copia local |
| `src/app/(empresa)/empresa/cotizador/nueva/components/tarjeta-grupo-fotos.tsx` | Crear | Una tarjeta de staging (modo + fotos) de UN grupo pendiente |
| `src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx` | Modificar | Quita "nivel de confianza", agrega zoom a la foto principal |
| `src/app/(empresa)/empresa/cotizador/nueva/page.tsx` | Modificar | Estado nuevo, cascada, cola de procesamiento, guardado automático por ítem |

---

### Task 1: Extraer `ModalImagenZoom` a componente compartido

**Files:**
- Create: `src/components/ui/modal-imagen-zoom.tsx`
- Modify: `src/app/cot/[token]/propuesta-client.tsx:157-211`

- [ ] **Step 1: Crear el componente compartido**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/components/ui/icons'

interface Props {
  imagenUrl: string | null
  onClose: () => void
}

// Visor de imagen ampliada, reutilizable en cualquier pantalla — antes vivía
// solo como función local en propuesta-client.tsx. Nunca usar bg-black/NN
// puro (regla CLAUDE.md): el overlay usa Negro Lurdes #474747 con opacidad.
export function ModalImagenZoom({ imagenUrl, onClose }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!imagenUrl) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imagenUrl, onClose])

  if (!imagenUrl || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-[#474747]/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[85vh] inline-flex items-center justify-center animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-[#474747]/75 hover:bg-[#474747]/95 text-white flex items-center justify-center border border-white/25 shadow-xl transition-all duration-150 hover:scale-105 active:scale-95 flex-shrink-0 cursor-pointer"
          aria-label="Cerrar imagen"
        >
          <X size={18} className="text-white flex-shrink-0" sinAnimacion />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          draggable={false}
          src={imagenUrl}
          alt="Vista ampliada"
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
        />
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: Verificar tipos y lint del archivo nuevo**

Run: `npx tsc --noEmit && npx eslint src/components/ui/modal-imagen-zoom.tsx`
Expected: sin errores.

- [ ] **Step 3: Reemplazar la definición local en `propuesta-client.tsx` por el import**

Modify `src/app/cot/[token]/propuesta-client.tsx`: eliminar por completo la función local `ModalImagenZoom` (líneas 157-211, desde `function ModalImagenZoom({` hasta el `)` que cierra el `createPortal`, inclusive), y agregar el import junto a los demás imports de componentes UI:

```tsx
import { ModalImagenZoom } from '@/components/ui/modal-imagen-zoom'
```

El resto del archivo (el `useState<{ url: string; titulo: string } | null>`, los 2 `onClick` que llaman `setImagenZoom`, y el `<ModalImagenZoom imagenUrl={imagenZoom?.url ?? null} onClose={() => setImagenZoom(null)} />`) no cambia — el componente importado tiene exactamente la misma firma de props.

- [ ] **Step 4: Verificar que sigue compilando**

Run: `npx tsc --noEmit && npx eslint "src/app/cot/[token]/propuesta-client.tsx"`
Expected: sin errores, sin referencias rotas a `ModalImagenZoom`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/modal-imagen-zoom.tsx "src/app/cot/[token]/propuesta-client.tsx"
git commit -m "refactor: extrae ModalImagenZoom a componente compartido y corrige bg-black"
```

---

### Task 2: Quitar "nivel de confianza" y agregar zoom en `GrupoItemCard`

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx`

- [ ] **Step 1: Importar el visor de zoom y agregar estado local**

Al inicio del archivo, junto a los demás imports:

```tsx
import { ModalImagenZoom } from '@/components/ui/modal-imagen-zoom'
```

Dentro de `export function GrupoItemCard(...)`, junto a los otros `useState`:

```tsx
const [zoomAbierto, setZoomAbierto] = useState(false)
```

- [ ] **Step 2: Quitar el badge de confianza, dejar solo "Manual" cuando aplique**

Reemplazar (líneas 144-152):

```tsx
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            item.manual ? 'bg-[#59A6E4]/15 text-[#59A6E4]'
              : item.confianza >= 0.8 ? 'bg-[#38B98E]/15 text-[#38B98E]'
              : item.confianza >= 0.5 ? 'bg-[#F6BF3E]/15 text-[#F6BF3E]'
              : 'bg-[#FF5E4B]/15 text-[#FF5E4B]'
          }`}>
            {item.manual ? 'Manual' : item.confianza >= 0.8 ? 'Alta confianza' : item.confianza >= 0.5 ? 'Confianza media' : 'Baja confianza'}
          </span>
```

por:

```tsx
          {item.manual && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#59A6E4]/15 text-[#59A6E4]">
              Manual
            </span>
          )}
          {!item.manual && <span />}
```

(El `<span />` vacío conserva el `justify-between` del contenedor padre cuando no es manual, sin dejar el badge de confianza. `item.confianza` queda sin leerse en este archivo — el campo puede seguir llegando del backend, no hace falta tocar el tipo `ItemDetectadoConSnapshot`.)

- [ ] **Step 3: Hacer la foto principal clicable para ampliarla**

Reemplazar (líneas 172-179):

```tsx
        {item.imagenPreview && (
          // Alto fijo, ancho natural — nunca se fuerza a cuadrado ni se
          // vuelve a recortar aquí. El recuadro que ya devolvió la IA es el
          // que decide qué parte de la foto es relevante, no el CSS.
          <div className="w-full flex items-center justify-center rounded-[12px] bg-[var(--bg-input)] overflow-hidden">
            <img src={item.imagenPreview} alt="" className="h-48 w-auto max-w-full object-contain" />
          </div>
        )}
```

por:

```tsx
        {item.imagenPreview && (
          // Alto fijo, ancho natural — nunca se fuerza a cuadrado ni se
          // vuelve a recortar aquí. El recuadro que ya devolvió la IA es el
          // que decide qué parte de la foto es relevante, no el CSS.
          <button
            type="button"
            onClick={() => setZoomAbierto(true)}
            className="w-full flex items-center justify-center rounded-[12px] bg-[var(--bg-input)] overflow-hidden cursor-zoom-in"
            title="Ampliar imagen"
          >
            <img src={item.imagenPreview} alt="" className="h-48 w-auto max-w-full object-contain" />
          </button>
        )}
        <ModalImagenZoom imagenUrl={zoomAbierto ? item.imagenPreview : null} onClose={() => setZoomAbierto(false)} />
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"`
Expected: sin errores. Si `tsc` marca `item.confianza` como no usado en algún otro punto del archivo, dejarlo — sigue siendo parte del tipo, solo no se lee más para UI.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx"
git commit -m "fix: quita nivel de confianza y agrega zoom de imagen en GrupoItemCard"
```

---

### Task 3: Crear `TarjetaGrupoFotos` (una tarjeta de staging)

Extrae la "zona de carga" actual (hoy única, en `page.tsx:871-962`) a un componente que se pueda repetir hasta 4 veces, uno por grupo pendiente.

**Files:**
- Create: `src/app/(empresa)/empresa/cotizador/nueva/components/tarjeta-grupo-fotos.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
'use client'
/* eslint-disable @next/next/no-img-element */

import { useRef } from 'react'
import { Camera, Sparkles, Pencil, ClipboardPaste as Clipboard, X, TriangleAlert as Warning } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export type ModoAnalisis = 'ia' | 'manual'

export interface FotoCola { base64: string; preview: string }

export interface GrupoPendiente {
  id: string
  fotos: FotoCola[]
  modo: ModoAnalisis
}

interface Props {
  grupo: GrupoPendiente
  numero: number
  esPrimero: boolean
  maxFotos: number
  error: string | null
  onCambiarModo: (modo: ModoAnalisis) => void
  onAgregarFotos: (files: File[]) => void
  onQuitarFoto: (index: number) => void
}

// Una tarjeta de staging por ítem — se repite hasta 4 veces en cascada en
// page.tsx, ninguna analiza nada por sí sola. El disparo real vive en
// "Genera la propuesta", en page.tsx.
export function TarjetaGrupoFotos({ grupo, numero, esPrimero, maxFotos, error, onCambiarModo, onAgregarFotos, onQuitarFoto }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const ts = 'text-[var(--text-secondary)]'
  const tp = 'text-[var(--text-primary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  function handleFotoSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onAgregarFotos(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
      <p className={`text-xs font-semibold mb-3 ${ts}`}>Ítem {numero}</p>

      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex rounded-full border p-1" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => onCambiarModo('ia')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
              grupo.modo === 'ia' ? 'bg-[#00827C] text-white' : ts
            }`}
          >
            <Sparkles size={14} sinAnimacion /> Con IA
          </button>
          <button
            type="button"
            onClick={() => onCambiarModo('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
              grupo.modo === 'manual' ? 'bg-[#00827C] text-white' : ts
            }`}
          >
            <Pencil size={14} sinAnimacion /> Manual
          </button>
        </div>
      </div>

      {grupo.fotos.length === 0 ? (
        <>
          <div className="w-14 h-14 rounded-full bg-[#00827C]/10 flex items-center justify-center mx-auto mb-4">
            <Camera size={28} className="text-[#00827C]" sinAnimacion />
          </div>
          <p className={`text-base font-semibold mb-1 ${tp}`}>
            {esPrimero ? 'Sube las fotos del mueble' : 'Sube las fotos de este ítem'}
          </p>
          <p className={`text-sm mb-1 ${ts}`}>
            {grupo.modo === 'ia'
              ? `La IA detecta todos los muebles que veas, hasta ${maxFotos} fotos a la vez`
              : `Elige tú la categoría y llena todo a mano, hasta ${maxFotos} fotos a la vez`}
          </p>
          <p className={`text-xs mb-4 flex items-center justify-center gap-1 text-center ${ts}`}>
            <Clipboard size={13} className="flex-shrink-0" sinAnimacion /> También puedes pegar imágenes copiadas: ⌘V en Mac, Ctrl+V en PC
          </p>
        </>
      ) : (
        <div className="flex gap-2 overflow-x-auto mb-4">
          {grupo.fotos.map((f, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={f.preview} alt="" className="h-24 rounded-[10px] object-cover bg-[var(--bg-input)]" />
              <button
                type="button"
                onClick={() => onQuitarFoto(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#474747] text-white flex items-center justify-center shadow-md hover-pop hover-press"
                title="Quitar esta foto"
              >
                <X size={11} strokeWidth={2.5} sinAnimacion />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button onClick={() => inputRef.current?.click()} variant={grupo.fotos.length > 0 ? 'secondary' : 'primary'}>
        {grupo.fotos.length > 0 ? 'Agregar otra foto' : 'Elegir fotos'}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFotoSeleccionada}
      />
      {error && (
        <p className="mt-3 text-sm text-[#FF5E4B] flex items-center justify-center gap-1"><Warning size={16} sinAnimacion /> {error}</p>
      )}
    </div>
  )
}
```

Nota: se quitó el botón "Analizar X fotos con IA" / "Continuar manual con X fotos" que existía en la versión vieja de esta tarjeta (Task 4/5 del requisito 3 de la spec) — ya no analiza nada por su cuenta.

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(empresa)/empresa/cotizador/nueva/components/tarjeta-grupo-fotos.tsx"`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/components/tarjeta-grupo-fotos.tsx"
git commit -m "feat: componente TarjetaGrupoFotos para staging de ítems en cascada"
```

---

### Task 4: Nuevo estado en `page.tsx` — array de grupos pendientes

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:1-200`

- [ ] **Step 1: Importar el nuevo componente y sus tipos**

Junto a los imports existentes (cerca de la línea 14):

```tsx
import { TarjetaGrupoFotos, type GrupoPendiente, type FotoCola } from './components/tarjeta-grupo-fotos'
```

- [ ] **Step 2: Cambiar la constante de tope y agregar helper de id**

Reemplazar (línea 48):

```tsx
const MAX_FOTOS_POR_TANDA = 3
```

por:

```tsx
const MAX_FOTOS_POR_TANDA = 4
const MAX_ITEMS_POR_COTIZACION = 4

function nuevoGrupoVacio(modo: ModoAnalisis = 'ia'): GrupoPendiente {
  return { id: crypto.randomUUID(), fotos: [], modo }
}
```

- [ ] **Step 3: Reemplazar el estado singular de staging por el array**

Reemplazar (líneas 175-188):

```tsx
  const [fotos, setFotos] = useState<{ base64: string; preview: string }[]>([])
  const [itemsDetectados, setItemsDetectados] = useState<ItemConImagen[]>([])
  const [noIdentificados, setNoIdentificados] = useState<string[]>([])
  const [sinMatch, setSinMatch] = useState<SinMatchConImagen[]>([])
  const [observaciones, setObservaciones] = useState('')

  // Con IA (por defecto) analiza y clasifica solo; Manual salta la IA por
  // completo y deja que el vendedor elija categoría y llene todo a mano
  // desde la misma tarjeta — siempre visible, el vendedor decide antes de
  // subir o pegar cualquier foto.
  const [modo, setModo] = useState<ModoAnalisis>('ia')
```

por:

```tsx
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
  const [observaciones, setObservaciones] = useState('')

  // Cola de procesamiento — se llena al confirmar "Genera la propuesta" con
  // los gruposPendientes que sí tienen fotos, y puede CRECER en caliente si
  // al procesar un grupo aparece una pieza extra que el vendedor confirma
  // como ítem aparte (ver Task 7). procesandoIdx === null significa que la
  // cola no está corriendo (estamos en la etapa de armar, no de procesar).
  const [colaProcesar, setColaProcesar] = useState<GrupoPendiente[]>([])
  const [procesandoIdx, setProcesandoIdx] = useState<number | null>(null)
```

- [ ] **Step 4: Verificar que `fotos.length`/`modo` que quedaron sueltos no rompan el build todavía**

No correr `tsc` aquí — quedará roto hasta terminar el Task 5, que reemplaza todos los usos. Seguir directo al siguiente task sin commitear a medias (este Task 4 y el Task 5 son una sola unidad de compilación).

---

### Task 5: Adaptar `agregarFotos`, paste y quitar-foto al grupo activo

Hoy estas funciones leen/escriben el estado global `fotos`. Deben operar sobre el grupo de `gruposPendientes` que corresponda (mientras se arma) o sobre `colaProcesar[procesandoIdx]` (mientras se procesa, para la vista de "Analizando"/"Resultado" que sigue mostrando las fotos de ese grupo).

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:280-343` (rango aproximado, buscar por nombre de función)

- [ ] **Step 1: Reescribir `agregarFotos` para recibir el id del grupo destino**

Buscar la función `agregarFotos` (usa `useCallback`, referencia `fotos.length` en sus dependencias — línea ~333 según la lectura previa) y reemplazar su firma y cuerpo por:

```tsx
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
```

(Mantener la firma real de `comprimirImagenBase64` — revisar `src/lib/image-compress.ts` si el nombre del resultado no coincide con `{ base64, preview }`; ya se usaba así en el código original, no cambia.)

- [ ] **Step 2: Reescribir `quitarFotoCola` para recibir el id del grupo**

Reemplazar (línea 335-337):

```tsx
  function quitarFotoCola(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }
```

por:

```tsx
  function quitarFotoDeGrupo(grupoId: string, index: number) {
    setGruposPendientes(prev => prev.map(g => g.id === grupoId ? { ...g, fotos: g.fotos.filter((_, i) => i !== index) } : g))
  }
```

- [ ] **Step 3: Adaptar el listener de pegar (Cmd+V) al último grupo pendiente**

Reemplazar el `useEffect` de paste (línea ~361-372) por:

```tsx
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

- [ ] **Step 4: Quitar el `useEffect` de rotación de mensajes "Analizando..." de fotos.length global**

Reemplazar (línea 347-354):

```tsx
  useEffect(() => {
    if (estado !== 'analizando') { setAnalizandoMsgIndex(0); return }
    const totalMensajes = mensajesAnalizando(fotos.length).length
    const interval = setInterval(() => {
      setAnalizandoMsgIndex(i => (i + 1) % totalMensajes)
    }, 2800)
    return () => clearInterval(interval)
  }, [estado, fotos.length])
```

por (usa la cantidad de fotos del grupo que se está procesando ahora):

```tsx
  useEffect(() => {
    if (estado !== 'analizando') { setAnalizandoMsgIndex(0); return }
    const nFotos = procesandoIdx !== null ? (colaProcesar[procesandoIdx]?.fotos.length ?? 1) : 1
    const totalMensajes = mensajesAnalizando(nFotos).length
    const interval = setInterval(() => {
      setAnalizandoMsgIndex(i => (i + 1) % totalMensajes)
    }, 2800)
    return () => clearInterval(interval)
  }, [estado, procesandoIdx, colaProcesar])
```

- [ ] **Step 5: Quitar el handler viejo `handleFotoSeleccionada` y el `inputFotoRef`**

Ya no hacen falta — `TarjetaGrupoFotos` trae su propio `<input type="file">` interno. Eliminar la declaración `const inputFotoRef = useRef<HTMLInputElement>(null)` (línea 160) y la función `handleFotoSeleccionada` (líneas 339-343).

- [ ] **Step 6: Commit intermedio (todavía no compila del todo — Task 6 termina la migración)**

No commitear todavía. Seguir directo al Task 6.

---

### Task 6: Reescribir `analizarConIA`/`continuarManual` para operar sobre un grupo específico

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:374-440`

- [ ] **Step 1: Reescribir `analizarConIA`**

Reemplazar (líneas 378-421):

```tsx
  async function analizarConIA() {
    if (fotos.length === 0) return
    setError(null)
    setEstado('analizando')

    try {
      const res = await fetch(conEmpresa('/api/cotizador/diagnostico'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagenes: fotos.map(c => ({ imagen_base64: c.base64, mime_type: 'image/webp' })),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al analizar las imágenes.')
        setEstado('idle')
        return
      }

      const itemsCrudos = (data.items_detectados ?? []) as ItemDetectadoConSnapshot[]
      const itemsConImagen: ItemConImagen[] = await Promise.all(itemsCrudos.map(async (item) => ({
        ...item,
        ...(await construirMiniatura(item.imagen_index, item.bounding_box, fotos)),
        _uiKey: crypto.randomUUID(),
      })))

      const sinMatchCrudos = (data.sin_match_detalle ?? []) as SinMatchDetalle[]
      const sinMatchConImagen: SinMatchConImagen[] = await Promise.all(sinMatchCrudos.map(async (d) => ({
        ...d,
        ...(await construirMiniatura(d.imagen_index, d.bounding_box, fotos)),
      })))

      setItemsDetectados(itemsConImagen)
      setNoIdentificados(data.no_identificados ?? [])
      setSinMatch(sinMatchConImagen)
      setObservaciones(data.observaciones_visuales ?? '')
      setEstado('resultado')
    } catch {
      setError('No se pudo analizar la imagen. Verifica tu conexión.')
      setEstado('idle')
    }
  }
```

por (recibe el grupo a procesar como parámetro en vez de leer `fotos` global; ya no cambia `estado` — eso lo maneja el orquestador del Task 8):

```tsx
  async function analizarGrupoConIA(grupo: GrupoPendiente): Promise<boolean> {
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
        return false
      }

      const itemsCrudos = (data.items_detectados ?? []) as ItemDetectadoConSnapshot[]
      const itemsConImagen: ItemConImagen[] = await Promise.all(itemsCrudos.map(async (item) => ({
        ...item,
        ...(await construirMiniatura(item.imagen_index, item.bounding_box, grupo.fotos)),
        _uiKey: crypto.randomUUID(),
      })))

      const sinMatchCrudos = (data.sin_match_detalle ?? []) as SinMatchDetalle[]
      const sinMatchConImagen: SinMatchConImagen[] = await Promise.all(sinMatchCrudos.map(async (d) => ({
        ...d,
        ...(await construirMiniatura(d.imagen_index, d.bounding_box, grupo.fotos)),
      })))

      setItemsDetectados(itemsConImagen)
      setNoIdentificados(data.no_identificados ?? [])
      setSinMatch(sinMatchConImagen)
      setObservaciones(data.observaciones_visuales ?? '')
      return true
    } catch {
      setError('No se pudo analizar la imagen. Verifica tu conexión.')
      return false
    }
  }
```

- [ ] **Step 2: Reescribir `continuarManual`**

Reemplazar (líneas 426-440):

```tsx
  function continuarManual() {
    if (fotos.length === 0) return
    setError(null)
    // Un solo ítem por grupo, sin importar cuántas fotos tenga — usa la
    // primera como imagen por defecto, el vendedor puede cambiarla desde el
    // selector de "foto principal" dentro de GrupoItemCard.
    const item = construirItemStub({
      imagenIndex: 0, imagenPreview: fotos[0].preview, imagenBase64: fotos[0].base64,
    })
    setItemsDetectados([item])
    setNoIdentificados([])
    setSinMatch([])
    setObservaciones('')
    setEstado('resultado')
  }
```

por:

```tsx
  function continuarGrupoManual(grupo: GrupoPendiente) {
    const item = construirItemStub({
      imagenIndex: 0, imagenPreview: grupo.fotos[0].preview, imagenBase64: grupo.fotos[0].base64,
    })
    setItemsDetectados([item])
    setNoIdentificados([])
    setSinMatch([])
    setObservaciones('')
  }
```

- [ ] **Step 3: Verificar tipos (esperado: errores en el resto del archivo, todavía sin terminar)**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"`
Expected: errores en `iniciarNuevoGrupo`, `handleGenerarPropuesta`, `handleConfirmarTodos` y en el JSX (todos usan `fotos`/`modo` que ya no existen) — normal en este punto, se resuelven en los Tasks 7 y 8. No commitear todavía.

---

### Task 7: "Agregar otro ítem" apila en cascada (no reinicia)

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:618-628`

- [ ] **Step 1: Reemplazar `iniciarNuevoGrupo`**

Reemplazar (líneas 618-628):

```tsx
  // Botón fijo "+ Agregar otro ítem" de la barra inferior —
  // descarta cualquier revisión sin confirmar del grupo actual (si la
  // había) y vuelve a la zona de carga en blanco.
  function iniciarNuevoGrupo() {
    setEstado('idle')
    setFotos([])
    setItemsDetectados([])
    setNoIdentificados([])
    setSinMatch([])
    setError(null)
  }
```

por:

```tsx
  // Botón fijo "+ Agregar otro ítem" de la barra inferior — SUMA una
  // tarjeta nueva en blanco debajo de las que ya existen, nunca las
  // reemplaza. Solo tiene sentido mientras se está armando (procesandoIdx
  // === null); una vez arrancó "Genera la propuesta" este botón se oculta
  // (ver JSX del Task 9).
  function agregarGrupoNuevo() {
    setError(null)
    setGruposPendientes(prev => prev.length >= MAX_ITEMS_POR_COTIZACION ? prev : [...prev, nuevoGrupoVacio()])
  }
```

- [ ] **Step 2: No verificar tipos todavía (el JSX sigue roto hasta el Task 9)**

Seguir directo al Task 8.

---

### Task 8: Guardado automático por ítem (adaptar `handleConfirmarTodos`)

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:533-611`

- [ ] **Step 1: Reescribir `handleConfirmarTodos` → `guardarItemsDetectadosEnCotizacion`**

Reemplazar el cuerpo completo de la función (líneas 533-611, desde `async function handleConfirmarTodos()` hasta su `}` de cierre) por una versión que ya no depende de `setEstado('guardando')`/`setEstado('resultado')` como control del flujo (eso lo maneja el orquestador del Task 9) y que devuelve si guardó bien o no:

```tsx
  // Guarda TODOS los itemsDetectados vigentes (el resultado del grupo que
  // se está procesando ahora mismo) en la cotización — se llama automático
  // apenas la tarjeta de un ítem queda armada, sin esperar un clic aparte
  // del vendedor (ver Task 9). Devuelve false si algo falló, para que el
  // orquestador detenga la cola en vez de seguir con el siguiente ítem.
  async function guardarItemsDetectadosEnCotizacion(): Promise<boolean> {
    if (itemsDetectados.length === 0 || !cliente) return false
    if (itemsDetectados.some(it => !it.item_id)) {
      setError('Elige la categoría del catálogo para cada ítem antes de continuar.')
      return false
    }
    setError(null)

    try {
      let id = cotizacionId
      if (!id) {
        const resCot = await fetch(conEmpresa('/api/cotizador/cotizaciones'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: cliente.id }) })
        const dataCot = await resCot.json()
        if (!resCot.ok) { setError(dataCot.error ?? 'Error al crear la cotización.'); return false }
        id = dataCot.id as string
        setCotizacionId(id)
        window.history.replaceState(null, '', conEmpresa(`/empresa/cotizador/nueva?cotizacion_id=${id}`))
      }

      const nuevos: MuebleAgregado[] = []

      for (const item of itemsDetectados) {
        const resMueble = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}/mueble`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: item.item_id,
            cantidad: item.cantidad,
            imagen_base64: item.imagenBase64,
            mime_type: 'image/webp',
            diagnostico_ia_json: { item_nombre: item.item_nombre, confianza: item.confianza },
            titulo: item.titulo,
            descripcion: item.descripcion || undefined,
            servicios_json: item.servicios.filter(s => s.nombre.trim()),
            insumos_json: item.insumos.filter(i => i.nombre.trim() && i.cantidad > 0),
            materiales_json: item.materiales.filter(m => m.nombre.trim() && m.peso_kg > 0 && m.factor_co2_kg > 0),
            factor_rentabilidad: item.factor_rentabilidad,
          }),
        })
        const dataMueble = await resMueble.json()
        if (!resMueble.ok) { setError(dataMueble.error ?? `Error al guardar "${item.item_nombre}".`); return false }

        nuevos.push({
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
        })
      }

      setMuebles(prev => [...prev, ...nuevos])
      for (const nuevo of nuevos) dispararPrecioMercado(nuevo.id)
      return true
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      return false
    }
  }
```

- [ ] **Step 2: No verificar tipos todavía (el orquestador y el JSX faltan — Task 9)**

Seguir directo al Task 9.

---

### Task 9: El orquestador — "Genera la propuesta" procesa la cola uno a uno

Este es el corazón del rediseño: reemplaza el `handleGenerarPropuesta` actual (que solo navegaba) por la función que arranca y avanza la cola, incluida la pregunta "¿es un ítem aparte?" para piezas extra detectadas en `sinMatch`.

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:613-616`

- [ ] **Step 1: Agregar estado para la pregunta de "ítem aparte"**

Junto a los demás `useState` de la Task 4, agregar:

```tsx
  // Cuando el grupo que se está procesando trae sin_match_detalle (una
  // pieza detectada que no es la principal, ej. una mesa junto al sofá), se
  // le pregunta al vendedor si es un ítem aparte ANTES de seguir con el
  // resto de la cola — no se decide en silencio ni en ningún sentido.
  const [preguntaItemAparte, setPreguntaItemAparte] = useState<SinMatchConImagen | null>(null)
```

- [ ] **Step 2: Reemplazar `handleGenerarPropuesta` por el orquestador**

Reemplazar (líneas 613-616):

```tsx
  function handleGenerarPropuesta() {
    if (!cotizacionId) return
    router.push(conEmpresa(`/empresa/cotizador/${cotizacionId}`))
  }
```

por:

```tsx
  // Procesa UN índice de la cola: analiza (o arma manual), y si hay una
  // pieza sin_match pendiente de resolver, se detiene ahí — la pregunta al
  // vendedor (Step 3 del JSX) es la que decide si sigue o no. Si no hay
  // pregunta pendiente, guarda el ítem y avanza sola al siguiente.
  async function procesarIndiceCola(idx: number, cola: GrupoPendiente[]) {
    const grupo = cola[idx]
    if (!grupo) { setProcesandoIdx(null); return }

    setProcesandoIdx(idx)
    setEstado('analizando')

    const ok = grupo.modo === 'ia'
      ? await analizarGrupoConIA(grupo)
      : (continuarGrupoManual(grupo), true)

    if (!ok) { setEstado('resultado'); return }
    setEstado('resultado')
    // Si analizarGrupoConIA encontró sin_match, se espera la respuesta del
    // vendedor (preguntaItemAparte, seteado dentro de analizarGrupoConIA
    // vía setSinMatch — ver Step 4) antes de continuar. Si no hay nada que
    // preguntar, se guarda y se avanza de una vez.
  }

  // Dispara la cola completa desde cero — solo los gruposPendientes que sí
  // tienen fotos entran a la cola (una tarjeta vacía sin fotos no genera un
  // ítem fantasma).
  async function generarPropuesta() {
    const inicial = gruposPendientes.filter(g => g.fotos.length > 0)
    if (inicial.length === 0) return
    setColaProcesar(inicial)
    await procesarIndiceCola(0, inicial)
  }

  // Se llama después de que el vendedor ya resolvió (o no había) la
  // pregunta de "ítem aparte" para el grupo actual — guarda ese ítem y
  // avanza al siguiente de la cola, o termina y va a la cotización.
  async function confirmarYAvanzar() {
    const guardado = await guardarItemsDetectadosEnCotizacion()
    if (!guardado) return
    const siguienteIdx = (procesandoIdx ?? 0) + 1
    if (siguienteIdx < colaProcesar.length) {
      await procesarIndiceCola(siguienteIdx, colaProcesar)
    } else {
      setProcesandoIdx(null)
      setEstado('idle')
      if (cotizacionId) router.push(conEmpresa(`/empresa/cotizador/${cotizacionId}`))
    }
  }
```

- [ ] **Step 3: Agregar los handlers de la pregunta "¿es un ítem aparte?"**

Justo debajo de `confirmarYAvanzar`, agregar:

```tsx
  // El vendedor confirma que la pieza extra SÍ es un ítem aparte: se agrega
  // al FINAL de colaProcesar (no interrumpe al que ya estaba esperando) y
  // se quita de sinMatch para no repetir la pregunta.
  function confirmarPiezaComoItemAparte() {
    if (!preguntaItemAparte) return
    const nuevoGrupo: GrupoPendiente = {
      id: crypto.randomUUID(),
      fotos: [{ base64: preguntaItemAparte.imagenBase64, preview: preguntaItemAparte.imagenPreview }],
      modo: 'ia',
    }
    setColaProcesar(prev => [...prev, nuevoGrupo])
    setSinMatch(prev => prev.filter(d => d !== preguntaItemAparte))
    setPreguntaItemAparte(null)
  }

  // El vendedor dice que NO es un ítem aparte: se descarta, sigue siendo
  // solo contexto de las fotos del ítem actual.
  function descartarPiezaComoItemAparte() {
    if (!preguntaItemAparte) return
    setSinMatch(prev => prev.filter(d => d !== preguntaItemAparte))
    setPreguntaItemAparte(null)
  }
```

- [ ] **Step 4: Enganchar la pregunta dentro de `analizarGrupoConIA`**

Modificar el `analizarGrupoConIA` del Task 6 — después de la línea `setSinMatch(sinMatchConImagen)`, agregar:

```tsx
      setSinMatch(sinMatchConImagen)
      if (sinMatchConImagen.length > 0) setPreguntaItemAparte(sinMatchConImagen[0])
```

(Solo se pregunta por la primera pieza sin_match a la vez — si hay más de una en el mismo grupo, la siguiente se pregunta después de resolver la actual, mismo criterio de "una decisión a la vez, nunca todo junto".)

- [ ] **Step 5: Verificar tipos (todavía falta el JSX — Task 10 lo cierra)**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"`
Expected: errores solo en el JSX (`fotos`, `modo`, botones viejos) — funciones y estado ya cierran bien.

---

### Task 10: Reescribir el JSX — cascada de tarjetas + resultado + pregunta

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:869-1177` (rango aproximado — bloque completo desde el comentario "Zona de carga" hasta el cierre de la barra sticky)

- [ ] **Step 1: Reemplazar la zona de carga única por la cascada de tarjetas**

Reemplazar el bloque completo (desde `{/* Zona de carga de foto...` hasta el cierre del bloque `{cliente && estado === 'idle' && gruposUsados >= 3 && (...)}`, aprox. líneas 869-992) por:

```tsx
        {/* Cascada de tarjetas de staging — una por ítem que se está
            armando, ninguna analiza nada por sí sola. Solo se muestran
            mientras no está corriendo la cola (procesandoIdx === null). */}
        {cliente && procesandoIdx === null && gruposPendientes.map((grupo, i) => (
          <div key={grupo.id} className="mb-4">
            <TarjetaGrupoFotos
              grupo={grupo}
              numero={i + 1}
              esPrimero={i === 0}
              maxFotos={MAX_FOTOS_POR_TANDA}
              error={i === gruposPendientes.length - 1 ? error : null}
              onCambiarModo={(modo) => setGruposPendientes(prev => prev.map(g => g.id === grupo.id ? { ...g, modo } : g))}
              onAgregarFotos={(files) => agregarFotosAGrupo(grupo.id, files)}
              onQuitarFoto={(idx) => quitarFotoDeGrupo(grupo.id, idx)}
            />
          </div>
        ))}

        {cliente && procesandoIdx === null && gruposPendientes.length >= MAX_ITEMS_POR_COTIZACION && (
          <p className={`text-xs text-center mb-4 ${ts}`}>Ya armaste el máximo de {MAX_ITEMS_POR_COTIZACION} ítems para esta cotización.</p>
        )}
```

- [ ] **Step 2: Reemplazar el bloque "Analizando"**

Reemplazar (líneas ~994-1007, `{/* Analizando */}` hasta su cierre):

```tsx
        {/* Analizando */}
        {estado === 'analizando' && (
          <div className={`rounded-[12px] border p-6 ${cardBg}`}>
            {procesandoIdx !== null && colaProcesar[procesandoIdx]?.fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto mb-4">
                {colaProcesar[procesandoIdx].fotos.map((f, i) => (
                  <img key={i} src={f.preview} alt="Vista previa" className="h-32 flex-shrink-0 rounded-[8px] object-cover bg-[var(--bg-input)]" />
                ))}
              </div>
            )}
            <SkeletonCard lineas={3} className="border-0 p-0" />
            <p className={`text-sm text-center mt-4 ${ts}`}>
              {mensajesAnalizando(procesandoIdx !== null ? colaProcesar[procesandoIdx]?.fotos.length ?? 1 : 1)[analizandoMsgIndex]}
            </p>
          </div>
        )}
```

- [ ] **Step 3: En el bloque "Resultado", cambiar la fuente de las fotos mostradas arriba**

Dentro del bloque `{(estado === 'resultado' || estado === 'guardando') && (...)}`, reemplazar (líneas ~1012-1018):

```tsx
            {fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {fotos.map((f, i) => (
                  <img key={i} src={f.preview} alt="" className="h-24 flex-shrink-0 rounded-[10px] object-cover bg-[var(--bg-input)]" />
                ))}
              </div>
            )}
```

por:

```tsx
            {procesandoIdx !== null && colaProcesar[procesandoIdx]?.fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {colaProcesar[procesandoIdx].fotos.map((f, i) => (
                  <img key={i} src={f.preview} alt="" className="h-24 flex-shrink-0 rounded-[10px] object-cover bg-[var(--bg-input)]" />
                ))}
              </div>
            )}
```

- [ ] **Step 4: En el mapeo de `itemsDetectados`, pasar las fotos del grupo en proceso (no la variable global `fotos`)**

Reemplazar (línea 1037):

```tsx
                fotosGrupo={fotos}
```

por:

```tsx
                fotosGrupo={procesandoIdx !== null ? colaProcesar[procesandoIdx]?.fotos : undefined}
```

- [ ] **Step 5: Reemplazar el bloque de "No reconocidos" para usar la pregunta explícita en vez de solo listar con "Buscar en catálogo"**

Reemplazar el bloque completo (líneas ~1056-1096, desde el comentario "No reconocidos" hasta su `)}` de cierre) por:

```tsx
            {/* Pregunta explícita: una pieza sin_match a la vez, nunca una
                lista pasiva — el vendedor decide si es un ítem aparte antes
                de seguir. */}
            {preguntaItemAparte && (
              <div className={`rounded-[12px] border p-4 ${isDark ? 'bg-[#F6BF3E]/10 border-[#F6BF3E]/25' : 'bg-[#F6BF3E]/08 border-[#F6BF3E]/20'}`}>
                <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-[#F6BF3E]' : 'text-[#8a6d1f]'}`}>Se detectó algo más en las fotos</p>
                <div className="flex items-center gap-3 mb-3">
                  {preguntaItemAparte.imagenPreview && (
                    <img src={preguntaItemAparte.imagenPreview} alt="" className="w-16 h-16 rounded-[8px] object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm font-semibold ${tp}`}>{preguntaItemAparte.titulo}</p>
                    <p className={`text-xs ${ts}`}>{preguntaItemAparte.descripcion}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold mb-3 ${tp}`}>¿Esto es un ítem aparte?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={descartarPiezaComoItemAparte}>No</Button>
                  <Button size="sm" className="flex-1" onClick={confirmarPiezaComoItemAparte}>Sí, agregarlo a la cola</Button>
                </div>
              </div>
            )}

            {/* No reconocidos por texto plano (sin foto propia) — sigue
                usando "Buscar en catálogo" directo, no es una pieza nueva
                detectada visualmente. */}
            {noIdentificados.length > 0 && (
              <div className={`rounded-[12px] border p-4 ${isDark ? 'bg-[#F6BF3E]/10 border-[#F6BF3E]/25' : 'bg-[#F6BF3E]/08 border-[#F6BF3E]/20'}`}>
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
```

Nota: `buscarEnCatalogoDesdeSinMatch` (función existente, línea 446) queda sin usar tras este cambio — eliminarla en este mismo step (ya no aplica, la pregunta la reemplaza). Si `tsc`/`eslint` no la marcan como no usada por algún otro llamado, dejarla; si la marcan, borrarla.

- [ ] **Step 6: Reemplazar la barra sticky inferior**

Reemplazar el bloque completo desde `{(estado === 'resultado' || ...) && (` que envuelve los 2 botones (líneas ~1145-1177) — mantener el wrapper `<div className="sticky bottom-0...">` tal cual, solo cambiar el contenido interior:

```tsx
      {(gruposPendientes.some(g => g.fotos.length > 0) || procesandoIdx !== null || cotizacionId || muebles.length > 0) && (
        <div className="sticky bottom-0 z-30 w-full bg-[var(--bg-primary)] py-3 border-t border-[var(--border)] -mt-5">
          <div aria-hidden="true" className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
          <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
            {/* Mientras se arma (procesandoIdx === null): agregar otro ítem
                y generar la propuesta. Mientras se procesa: solo la
                pregunta de "ítem aparte" (arriba) controla el avance, sin
                botones sueltos que puedan interrumpir la cola. */}
            {procesandoIdx === null && (
              <>
                {gruposPendientes.length < MAX_ITEMS_POR_COTIZACION && (
                  <Button
                    variant="secondary"
                    onClick={agregarGrupoNuevo}
                    icon={<Plus size={16} strokeWidth={2.5} />}
                    className="flex-1 w-full"
                  >
                    Agregar otro ítem
                  </Button>
                )}
                <Button
                  onClick={generarPropuesta}
                  disabled={!gruposPendientes.some(g => g.fotos.length > 0)}
                  icon={<ArrowRight size={16} strokeWidth={2.5} />}
                  className="flex-1 w-full"
                >
                  Genera la propuesta
                </Button>
              </>
            )}
            {procesandoIdx !== null && estado === 'resultado' && !preguntaItemAparte && (
              <Button
                onClick={confirmarYAvanzar}
                loading={estado === 'guardando' as EstadoUI}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                {procesandoIdx + 1 < colaProcesar.length ? 'Guardar y seguir con el siguiente' : 'Guardar y terminar'}
              </Button>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 7: Verificar tipos y lint del archivo completo**

Run: `npx tsc --noEmit && npx eslint "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"`
Expected: sin errores. Si aparece algo sobre `elegirCandidato`/`duplicarDetectado`/`quitarDetectado`/`actualizarItem`/`abrirRescate` no definidos, son funciones que ya existían sin cambios en el archivo original — no se tocan en este plan, solo revisar que sus referencias sigan apuntando a las mismas (no se renombraron).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "feat: rediseña Agregar ítems como cascada + cola secuencial (journey 15)"
```

---

### Task 11: Verificación en vivo con Playwright

**Files:**
- Ninguno permanente — script temporal en la raíz del repo, `__verificar_cascada_items.mjs`, borrado al final (mismo patrón usado 3 veces ya en esta sesión: cuenta+empresa+módulo Cotizador CRM efímeros, `browser.close()` en `finally`).

- [ ] **Step 1: Reiniciar el servidor limpio antes de probar**

```bash
npx pm2 stop reuso && rm -rf .next && npx pm2 restart reuso --update-env
```

Esperar a que `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login` devuelva `200` antes de seguir.

- [ ] **Step 2: Escribir y correr el script de verificación**

Debe cubrir, con una cuenta `empresa_admin` efímera (empresa + `modulos_empresas` con "Cotizador CRM" activo, igual que los 3 scripts ya usados hoy):
1. Login, ir a `/empresa/cotizador/nueva`, identificar cliente.
2. Confirmar que aparece 1 sola tarjeta "Ítem 1".
3. Subir 2 fotos al Ítem 1 (usar el mismo PNG 1×1 de prueba ya usado antes en esta sesión).
4. Click en "Agregar otro ítem" → confirmar que aparecen AMBAS tarjetas ("Ítem 1" con sus 2 fotos intactas, "Ítem 2" vacía) — no que la primera se borró.
5. Subir 1 foto al Ítem 2.
6. Click en "Genera la propuesta".
7. Confirmar que aparece el estado "Analizando" mostrando las fotos del Ítem 1 primero (no del Ítem 2).
8. Esperar a que resuelva (o falle limpio si `/api/cotizador/diagnostico` no reconoce el PNG de prueba — en ese caso, confirmar al menos que el error se muestra sin romper la cola, y no seguir el resto del caso 9-10 si no hay match real).
9. Si hay resultado con `item_id`, click en "Guardar y seguir con el siguiente" y confirmar que arranca el análisis del Ítem 2 recién ahí (no antes).
10. Confirmar que en ningún momento aparece el texto "Analizar 1 foto con IA" ni "Continuar manual con 1 foto" (esos botones ya no deben existir).

- [ ] **Step 3: Reportar resultado y limpiar**

Borrar el script temporal y confirmar `git status` sin archivos `__verificar_*` sueltos, igual que las 3 veces anteriores hoy.

- [ ] **Step 4: Documentar en el vault**

Actualizar `journeys/15-agregar-items-cotizacion.md`: cambiar el encabezado de estado de "en construcción" a "✅ construido y verificado en vivo, `<fecha>`". Agregar sección al diario del día correspondiente con el resumen de lo verificado (mismo patrón usado toda esta sesión) — **presentar el resumen en el chat antes de escribirlo en el vault**, por la directriz explícita del usuario de no distribuir sin validar primero (memoria `feedback_validar_antes_de_distribuir`).

---

## Self-review (hecho al escribir este plan)

1. **Cobertura de la spec**: los 10 requisitos numerados en el brief de invocación están cubiertos — 1→Task 4, 2→Task 7, 3→Task 3 (Step de "no incluir botón Analizar"), 4→Tasks 6+9, 5→Task 9 Steps 3-4 + Task 10 Step 5, 6→ya preservado sin tocar `dispararPrecioMercado`, 7→ya preservado (`fotosGrupo` de `GrupoItemCard` sin cambios de lógica), 8→ya preservado (`construirItemStub` sin cambios), 9→Task 2, 10→Task 1.
2. **Placeholders**: ninguno — cada step de código tiene el código real completo, anclado a línea exacta del archivo actual.
3. **Consistencia de tipos/nombres**: `GrupoPendiente`/`FotoCola` se definen una sola vez (Task 3) y se importan en `page.tsx` (Task 4) — verificado que ningún task posterior usa un nombre distinto para el mismo concepto. `analizarConIA`→`analizarGrupoConIA`, `continuarManual`→`continuarGrupoManual`, `handleConfirmarTodos`→`guardarItemsDetectadosEnCotizacion`, `handleGenerarPropuesta`→`generarPropuesta`, `iniciarNuevoGrupo`→`agregarGrupoNuevo`: todos los renombres son consistentes entre el Task que los define y los que los usan después.

**Riesgo conocido, no resuelto en este plan**: los números de línea citados (`page.tsx:869-1177`, etc.) fueron leídos el 2026-08-24 antes de las Tasks 1-9 de este mismo plan — cada Task anterior desplaza las líneas de las siguientes. Ejecutar las Tasks EN ORDEN, y en cada Task releer el archivo real antes de aplicar el diff (buscar por el texto exacto citado, no confiar ciegamente en el número de línea).
