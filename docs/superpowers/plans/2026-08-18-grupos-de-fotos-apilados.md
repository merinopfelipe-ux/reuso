# Grupos de fotos apilados en /empresa/cotizador/nueva — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo de "un grupo de fotos a la vez, se resetea al confirmar" por "hasta 3 grupos apilados en la misma pantalla, procesados juntos con un solo botón", en `/empresa/cotizador/nueva`. Además, las cotizaciones sin ningún ítem dejan de acumularse (cron de purga a 24h + filtro en el listado).

**Architecture:** El estado local de React pasa de variables sueltas (`fotos`, `itemsDetectados`, `modo`, etc.) a un array `grupos: GrupoFotos[]` (máx 3), cada uno con su propio modo/fotos/resultado/estado. Un solo botón "Procesar con IA" dispara, por grupo, una llamada independiente a `/api/cotizador/diagnostico` (grupos IA) o la construcción directa de un stub (grupos Manual) — actualizando cada grupo en cuanto su propia promesa resuelve. Cada grupo resuelto se confirma a la cotización con su propio botón, reusando el endpoint existente `POST /api/cotizador/cotizaciones/[id]/mueble` (sin cambios, ya opera sobre un solo ítem). En paralelo, un nuevo cron de purga y un filtro en el GET de listado resuelven las cotizaciones vacías.

**Tech Stack:** Next.js 14 App Router, TypeScript, React (`useState`, sin librería de estado nueva), Supabase (adminClient, sin cambios de esquema), Playwright (verificación en vivo vía script standalone, patrón ya usado en esta sesión).

---

## Task 1: Modelo de datos — `grupos: GrupoFotos[]`

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:41-47` (tipos) y `162-213` (estado)

- [ ] **Step 1: Agregar el tipo `GrupoFotos` y quitar los estados de un solo slot**

Reemplazar (líneas 41-47):
```ts
type EstadoUI = 'idle' | 'analizando' | 'resultado' | 'guardando'

// Cada conjunto de fotos es de máximo 3 — directriz explícita. No hay tope
// de cuántos conjuntos se pueden subir: al confirmar uno (handleConfirmarTodos),
// el estado vuelve a 'idle' con `fotos`/`itemsDetectados` vacíos, listo para
// subir el siguiente conjunto sin límite.
const MAX_FOTOS_POR_TANDA = 3
```
por:
```ts
type EstadoUI = 'idle' | 'guardando'
type EstadoGrupo = 'apilando' | 'procesando' | 'resultado' | 'error'

// Cada grupo de fotos es de máximo 3 fotos y produce UN solo ítem — directriz
// explícita. Hasta 3 grupos se apilan en la misma pantalla antes de procesar
// (ver GrupoFotos abajo); para más ítems, se edita la cotización ya creada.
const MAX_FOTOS_POR_TANDA = 3
const MAX_GRUPOS = 3

interface GrupoFotos {
  id: string
  modo: ModoAnalisis
  fotos: { base64: string; preview: string }[]
  estado: EstadoGrupo
  itemsDetectados: ItemConImagen[]
  noIdentificados: string[]
  sinMatch: SinMatchConImagen[]
  observaciones: string
  errorMsg: string | null
}

function crearGrupoVacio(): GrupoFotos {
  return {
    id: crypto.randomUUID(),
    modo: 'ia',
    fotos: [],
    estado: 'apilando',
    itemsDetectados: [],
    noIdentificados: [],
    sinMatch: [],
    observaciones: '',
    errorMsg: null,
  }
}
```

Nota: `EstadoUI` pierde `'analizando'` y `'resultado'` porque ahora esos dos estados viven POR GRUPO (`GrupoFotos.estado`), no globales. `EstadoUI` solo sigue distinguiendo `'idle'` (viendo la pantalla) de `'guardando'` (un `fetch` de confirmación de grupo en curso, deshabilita botones globales mientras dura).

- [ ] **Step 2: Reemplazar los estados de un solo slot por el array `grupos`**

Reemplazar (líneas 174-187):
```ts
  // Fotos y resultado del diagnóstico multi-ítem — "fotos" es la tanda que se
  // acaba de analizar (una o varias), cada ítem detectado ya trae su propia
  // miniatura (recortada o la foto completa) lista para mostrar y subir.
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
```ts
  // Hasta MAX_GRUPOS grupos apilados en la misma pantalla — cada uno con su
  // propio modo/fotos/resultado. Arranca con 1 grupo vacío listo para usar.
  const [grupos, setGrupos] = useState<GrupoFotos[]>([crearGrupoVacio()])

  function actualizarGrupo(id: string, patch: Partial<GrupoFotos>) {
    setGrupos(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))
  }
```

`MuebleAgregado`/`SinMatchConImagen`/`ModoAnalisis` (líneas 20-39) no cambian.

- [ ] **Step 3: Borrar `analizandoMsgIndex` y su `useEffect` — dependían de `estado === 'analizando'`, que ya no existe (el análisis ahora vive en `GrupoFotos.estado`, no en `EstadoUI` global)**

Borrar la declaración (línea 164):
```ts
  const [analizandoMsgIndex, setAnalizandoMsgIndex] = useState(0)
```

Borrar el `useEffect` completo (líneas 342-351):
```ts
  // Rotar el mensaje de "Analizando..." mientras dura la llamada a la IA —
  // ver mensajesAnalizando() arriba.
  useEffect(() => {
    if (estado !== 'analizando') { setAnalizandoMsgIndex(0); return }
    const totalMensajes = mensajesAnalizando(fotos.length).length
    const interval = setInterval(() => {
      setAnalizandoMsgIndex(i => (i + 1) % totalMensajes)
    }, 2800)
    return () => clearInterval(interval)
  }, [estado, fotos.length])
```

`mensajesAnalizando()` (la función, líneas 128-139) se queda — Task 5 la sigue usando con índice fijo `[0]` por grupo (sin rotación, fuera de alcance de esta ronda: cada grupo procesa en paralelo y de forma independiente, rotar el mensaje de cada uno por separado es una mejora cosmética que se puede retomar después si se pide).

- [ ] **Step 4: Verificar que compila (con errores esperados en el resto del archivo, que se resuelven en las tareas siguientes)**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"`
Expected: varios errores `Cannot find name 'fotos'`/`'itemsDetectados'`/etc., y ya NO debe aparecer ningún error mencionando `analizandoMsgIndex` — esperado, el resto se resuelve en Tasks 2-5. No hacer commit todavía.

- [ ] **Step 5: Actualizar el aviso de "trabajo no guardado" (`beforeunload`) para leer `grupos` en vez de los estados viejos**

Reemplazar (líneas 234-241):
```ts
  // Proteger trabajo no guardado: advertir al salir si hay progreso pendiente
  useEffect(() => {
    const hayProgresoNoGuardado = fotos.length > 0 || itemsDetectados.length > 0 || (!cotizacionIdParam && cliente !== null && muebles.length === 0)
    if (!hayProgresoNoGuardado) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [fotos.length, itemsDetectados.length, cliente, cotizacionIdParam, muebles.length])
```
por:
```ts
  // Proteger trabajo no guardado: advertir al salir si hay progreso pendiente
  // en CUALQUIER grupo apilado (fotos subidas o ítems ya resueltos sin
  // confirmar), no solo en uno.
  useEffect(() => {
    const hayProgresoEnGrupos = grupos.some(g => g.fotos.length > 0 || g.itemsDetectados.length > 0)
    const hayProgresoNoGuardado = hayProgresoEnGrupos || (!cotizacionIdParam && cliente !== null && muebles.length === 0)
    if (!hayProgresoNoGuardado) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [grupos, cliente, cotizacionIdParam, muebles.length])
```

---

## Task 2: Subir/pegar/quitar fotos por grupo

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:293-369` (`agregarFotos`, `quitarFotoCola`, `handleFotoSeleccionada`, paste listener)

- [ ] **Step 1: Reemplazar `agregarFotos`/`quitarFotoCola`/`handleFotoSeleccionada` para que operen sobre UN grupo por id**

Reemplazar el bloque completo (líneas 293-340):
```ts
  const agregarFotos = useCallback(async (archivos: Blob[]) => {
```
hasta
```ts
    if (files.length > 0) agregarFotos(files)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }
```
por:
```ts
  const agregarFotosAGrupo = useCallback(async (grupoId: string, archivos: Blob[]) => {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    const imagenes = archivos.filter(a => a.type.startsWith('image/'))
    const rechazados = archivos.length - imagenes.length

    if (imagenes.length === 0) {
      setError(rechazados > 0 ? 'Solo se aceptan imágenes, no videos ni otro tipo de archivo.' : 'No se detectó ninguna imagen.')
      return
    }
    if (grupo.fotos.length + imagenes.length > MAX_FOTOS_POR_TANDA) {
      setError(`Sube máximo ${MAX_FOTOS_POR_TANDA} fotos por grupo. Ya tienes ${grupo.fotos.length}.`)
      return
    }
    const pesada = imagenes.find(a => a.size > 10 * 1024 * 1024)
    if (pesada) {
      setError('Cada imagen debe pesar máximo 10 MB. Quita la más pesada e intenta de nuevo.')
      return
    }

    setError(rechazados > 0 ? `Se ignoraron ${rechazados} archivo${rechazados > 1 ? 's' : ''} que no ${rechazados > 1 ? 'eran' : 'era'} imagen.` : null)

    const resultados = await Promise.allSettled(imagenes.map(a => comprimirImagenBase64(a)))
    const comprimidas = resultados
      .filter((r): r is PromiseFulfilledResult<{ base64: string; preview: string }> => r.status === 'fulfilled')
      .map(r => r.value)
    const fallidas = resultados.length - comprimidas.length

    if (comprimidas.length > 0) {
      setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, fotos: [...g.fotos, ...comprimidas] } : g))
    }
    if (fallidas > 0) {
      setError(`No se pudo procesar ${fallidas} imagen${fallidas > 1 ? 'es' : ''}.${comprimidas.length > 0 ? ' El resto se agregó bien.' : ' Intenta de nuevo.'}`)
    }
  }, [grupos])

  function quitarFotoDeGrupo(grupoId: string, index: number) {
    setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, fotos: g.fotos.filter((_, i) => i !== index) } : g))
  }

  const grupoActivoParaInputRef = useRef<string | null>(null)

  function handleFotoSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const grupoId = grupoActivoParaInputRef.current
    if (files.length > 0 && grupoId) agregarFotosAGrupo(grupoId, files)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }
```

`inputFotoRef` (línea 159) se mantiene — un solo `<input type="file">` oculto y compartido, reutilizado por cada grupo (se abre con `grupoActivoParaInputRef.current = grupo.id` antes de `.click()`, ver Task 4).

- [ ] **Step 2: Actualizar el listener de pegado (Cmd+V) para pegar en el ÚLTIMO grupo en `estado: 'apilando'`**

Reemplazar (líneas 353-369):
```ts
  useEffect(() => {
    if (estado !== 'idle' || !cliente) return
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []).filter(i => i.kind === 'file')
      if (items.length === 0) return
      e.preventDefault()
      const archivos = items.map(i => i.getAsFile()).filter((f): f is File => !!f)
      if (archivos.length > 0) agregarFotos(archivos)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [estado, agregarFotos, cliente])
```
por:
```ts
  // Pegar (Cmd+V) siempre apunta al último grupo todavía en 'apilando' — si
  // no hay ninguno (los 3 ya están procesando/resueltos), el pegado se
  // ignora en vez de crear un grupo nuevo a ciegas.
  useEffect(() => {
    if (!cliente) return
    function onPaste(e: ClipboardEvent) {
      const grupoDestino = [...grupos].reverse().find(g => g.estado === 'apilando')
      if (!grupoDestino) return
      const items = Array.from(e.clipboardData?.items ?? []).filter(i => i.kind === 'file')
      if (items.length === 0) return
      e.preventDefault()
      const archivos = items.map(i => i.getAsFile()).filter((f): f is File => !!f)
      if (archivos.length > 0) agregarFotosAGrupo(grupoDestino.id, archivos)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [grupos, agregarFotosAGrupo, cliente])
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"`
Expected: los errores de `agregarFotos`/`quitarFotoCola`/`fotos` en el resto del archivo siguen (se resuelven en Tasks 3-5), pero ya NO debe haber error en las líneas que se acaban de reemplazar.

---

## Task 3: Procesar todos los grupos con un solo botón

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:371-437` (`analizarConIA`, `continuarManual`) → se funden en `procesarGrupos`

- [ ] **Step 1: Reemplazar `analizarConIA` + `continuarManual` por `procesarUnGrupo` + `procesarGrupos`**

Reemplazar el bloque completo (líneas 371-437, desde el comentario `// ── Con IA:` hasta el cierre de `continuarManual`):
```ts
  async function procesarUnGrupo(grupo: GrupoFotos) {
    if (grupo.fotos.length === 0) return
    actualizarGrupo(grupo.id, { estado: 'procesando', errorMsg: null })

    if (grupo.modo === 'manual') {
      // Manual no llama IA: una sola tarjeta stub con la primera foto como
      // principal, el vendedor la completa a mano desde GrupoItemCard.
      const item = construirItemStub({
        imagenIndex: 0, imagenPreview: grupo.fotos[0].preview, imagenBase64: grupo.fotos[0].base64,
      })
      actualizarGrupo(grupo.id, { estado: 'resultado', itemsDetectados: [item], noIdentificados: [], sinMatch: [], observaciones: '' })
      return
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
        actualizarGrupo(grupo.id, { estado: 'error', errorMsg: data.error ?? 'Error al analizar las imágenes.' })
        return
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

      actualizarGrupo(grupo.id, {
        estado: 'resultado',
        itemsDetectados: itemsConImagen,
        noIdentificados: data.no_identificados ?? [],
        sinMatch: sinMatchConImagen,
        observaciones: data.observaciones_visuales ?? '',
      })
    } catch {
      actualizarGrupo(grupo.id, { estado: 'error', errorMsg: 'No se pudo analizar la imagen. Verifica tu conexión.' })
    }
  }

  // Un solo botón dispara el procesamiento de TODOS los grupos con fotos
  // pendientes (estado 'apilando') a la vez — cada llamada es independiente
  // (Promise, no Promise.all con await conjunto) para que un grupo lento no
  // retrase que los demás ya muestren su resultado apenas estén listos.
  function procesarGrupos() {
    setError(null)
    for (const grupo of grupos) {
      if (grupo.estado === 'apilando' && grupo.fotos.length > 0) {
        procesarUnGrupo(grupo)
      }
    }
  }

  function reintentarGrupo(grupoId: string) {
    const grupo = grupos.find(g => g.id === grupoId)
    if (grupo) procesarUnGrupo(grupo)
  }
```

Notar: `procesarUnGrupo` recibe el objeto `grupo` completo (no solo el id) para leer `grupo.fotos`/`grupo.modo` en el momento del clic — `actualizarGrupo` sigue haciendo el `setGrupos` funcional real, así que no hay condición de carrera aunque varias promesas de distintos grupos resuelvan en cualquier orden.

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"`
Expected: ya no hay error en `procesarUnGrupo`/`procesarGrupos`. Los errores restantes son en las funciones de Task 4 (`elegirCandidato`, `buscarEnCatalogoDesde...`, `handleConfirmarTodos`, JSX) — esperado.

---

## Task 4: Acciones por grupo resuelto (elegir candidato, editar, confirmar)

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:439-608` (`buscarEnCatalogoDesdeSinMatch`, `buscarEnCatalogoDesdeTexto`, `actualizarItem`, `quitarDetectado`, `duplicarDetectado`, `elegirCandidato`, `handleConfirmarTodos`)

- [ ] **Step 1: Convertir las funciones de edición de `itemsDetectados` a versiones "de grupo" (reciben `grupoId`)**

Reemplazar (líneas 439-488, desde `buscarEnCatalogoDesdeSinMatch` hasta el cierre de `elegirCandidato`):
```ts
  function buscarEnCatalogoDesdeSinMatchDeGrupo(grupoId: string, index: number) {
    const grupo = grupos.find(g => g.id === grupoId)
    const d = grupo?.sinMatch[index]
    if (!grupo || !d) return
    const nuevo = construirItemStub({
      imagenIndex: d.imagen_index, imagenPreview: d.imagenPreview, imagenBase64: d.imagenBase64,
      titulo: d.titulo, descripcion: d.descripcion, cantidad: d.cantidad, confianza: d.confianza,
    })
    actualizarGrupo(grupoId, {
      itemsDetectados: [...grupo.itemsDetectados, nuevo],
      sinMatch: grupo.sinMatch.filter((_, i) => i !== index),
    })
  }

  function buscarEnCatalogoDesdeTextoDeGrupo(grupoId: string, index: number) {
    const grupo = grupos.find(g => g.id === grupoId)
    const texto = grupo?.noIdentificados[index]
    if (!grupo || !texto) return
    const nuevo = construirItemStub({
      imagenIndex: 0, imagenPreview: '', imagenBase64: '',
      titulo: texto.slice(0, 150), descripcion: texto,
    })
    actualizarGrupo(grupoId, {
      itemsDetectados: [...grupo.itemsDetectados, nuevo],
      noIdentificados: grupo.noIdentificados.filter((_, i) => i !== index),
    })
  }

  function actualizarItemDeGrupo(grupoId: string, index: number, item: ItemConImagen) {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    actualizarGrupo(grupoId, { itemsDetectados: grupo.itemsDetectados.map((it, i) => i === index ? item : it) })
  }

  function quitarItemDeGrupo(grupoId: string, index: number) {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    actualizarGrupo(grupoId, { itemsDetectados: grupo.itemsDetectados.filter((_, i) => i !== index) })
  }

  function duplicarItemDeGrupo(grupoId: string, index: number) {
    const grupo = grupos.find(g => g.id === grupoId)
    const original = grupo?.itemsDetectados[index]
    if (!grupo || !original) return
    const copia: ItemConImagen = { ...original, titulo: `${original.titulo} (copia)`, _uiKey: crypto.randomUUID() }
    const nuevos = [...grupo.itemsDetectados.slice(0, index + 1), copia, ...grupo.itemsDetectados.slice(index + 1)]
    actualizarGrupo(grupoId, { itemsDetectados: nuevos })
  }

  // Modo IA con más de 1 candidato: elegir uno colapsa itemsDetectados a
  // solo ese — el grupo de fotos siempre produce UN ítem, nunca varios.
  function elegirCandidatoDeGrupo(grupoId: string, index: number) {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo || !grupo.itemsDetectados[index]) return
    actualizarGrupo(grupoId, { itemsDetectados: [grupo.itemsDetectados[index]] })
  }

  function quitarGrupo(grupoId: string) {
    setGrupos(prev => prev.length > 1 ? prev.filter(g => g.id !== grupoId) : prev)
  }

  function agregarGrupo() {
    setGrupos(prev => prev.length < MAX_GRUPOS ? [...prev, crearGrupoVacio()] : prev)
  }
```

- [ ] **Step 2: Reemplazar `handleConfirmarTodos` por `confirmarGrupo(grupoId)` — confirma UN grupo, no todos**

Reemplazar el bloque completo (líneas 528-608, desde el comentario `// ── Confirmar:` hasta el cierre de `handleConfirmarTodos`):
```ts
  // ── Confirmar UN grupo resuelto a la cotización ─────────────────────────────

  async function confirmarGrupo(grupoId: string) {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo || grupo.itemsDetectados.length === 0 || !cliente) return
    if (grupo.itemsDetectados.some(it => !it.item_id)) {
      setError('Elige la categoría del catálogo para cada ítem antes de continuar.')
      return
    }
    setEstado('guardando')
    setError(null)

    try {
      let id = cotizacionId
      if (!id) {
        const resCot = await fetch(conEmpresa('/api/cotizador/cotizaciones'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: cliente.id }) })
        const dataCot = await resCot.json()
        if (!resCot.ok) { setError(dataCot.error ?? 'Error al crear la cotización.'); setEstado('idle'); return }
        id = dataCot.id as string
        setCotizacionId(id)
        window.history.replaceState(null, '', conEmpresa(`/empresa/cotizador/nueva?cotizacion_id=${id}`))
      }

      const nuevos: MuebleAgregado[] = []

      for (const item of grupo.itemsDetectados) {
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
        if (!resMueble.ok) { setError(dataMueble.error ?? `Error al guardar "${item.item_nombre}".`); setEstado('idle'); return }

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
      setGruposUsados(g => g + 1)

      // Ese grupo ya cumplió su propósito — se quita del array de trabajo,
      // el ítem confirmado ya vive en "muebles" (arriba en pantalla).
      setGrupos(prev => prev.filter(g => g.id !== grupoId))
      setEstado('idle')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setEstado('idle')
    }
  }
```

- [ ] **Step 3: Actualizar `confirmarRescate` para que también funcione sin depender de `itemsDetectados`/`fotos` globales**

`confirmarRescate` (líneas 696-765) no lee `fotos`/`itemsDetectados`/`modo` en ningún punto — solo `cotizacionId`/`cliente`. No necesita cambios de contenido, pero queda en el archivo tal cual (verificar con `grep -n "fotos\|itemsDetectados\|modo" src/app/(empresa)/empresa/cotizador/nueva/page.tsx` tras este paso para confirmar que `confirmarRescate` no aparece en los resultados).

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"`
Expected: los únicos errores restantes deben estar en el JSX (Task 5) y en `iniciarNuevoGrupo`/`handleGenerarPropuesta` si todavía referencian los estados viejos — confirmar con el mensaje de error exacto antes de continuar a Task 5.

- [ ] **Step 5: Borrar `iniciarNuevoGrupo` (ya no aplica — el botón fijo ahora es `agregarGrupo`, ver Task 6)**

Borrar por completo (líneas 615-625):
```ts
  // Botón fijo "+ Agregar otro grupo de fotos" de la barra inferior —
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

---

## Task 5: JSX — grupos apilados y resultado por grupo

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:773-775` (totales), `866-1104` (zona de carga + resultado)

- [ ] **Step 1: Los totales "de esta foto" pasan a calcularse POR GRUPO (función, no constante única)**

Reemplazar (líneas 773-775):
```ts
  const totalPrecioDetectado = itemsDetectados.reduce((s, it) => s + precioUnidad(it) * it.cantidad, 0)
  const totalCo2Detectado = itemsDetectados.reduce((s, it) => s + co2PorUnidad(it) * it.cantidad, 0)
  const totalAguaDetectada = itemsDetectados.reduce((s, it) => s + aguaPorUnidad(it) * it.cantidad, 0)
```
por:
```ts
  function totalesDeGrupo(grupo: GrupoFotos) {
    return {
      precio: grupo.itemsDetectados.reduce((s, it) => s + precioUnidad(it) * it.cantidad, 0),
      co2: grupo.itemsDetectados.reduce((s, it) => s + co2PorUnidad(it) * it.cantidad, 0),
      agua: grupo.itemsDetectados.reduce((s, it) => s + aguaPorUnidad(it) * it.cantidad, 0),
    }
  }
```

- [ ] **Step 2: Reemplazar toda la zona de carga + resultado (líneas 866-1104) por el render de grupos apilados**

Reemplazar desde el comentario `{/* Zona de carga de foto:` (línea 866) hasta el `)}` que cierra el bloque `{(estado === 'resultado' || estado === 'guardando') && (` (línea 1104 — el que precede a `</>`), por:

```tsx
        {/* Grupos apilados — cada uno con su propio toggle IA/Manual, zona
            de carga o resultado, según su GrupoFotos.estado. */}
        {cliente && gruposUsados < 3 && grupos.map((grupo, gi) => (
          <div key={grupo.id} className="mb-4">
            {grupo.estado === 'apilando' && (
              <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="inline-flex rounded-full border p-1" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => actualizarGrupo(grupo.id, { modo: 'ia' })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
                        grupo.modo === 'ia' ? 'bg-[#00827C] text-white' : ts
                      }`}
                    >
                      <Sparkles size={14} /> Con IA
                    </button>
                    <button
                      type="button"
                      onClick={() => actualizarGrupo(grupo.id, { modo: 'manual' })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
                        grupo.modo === 'manual' ? 'bg-[#00827C] text-white' : ts
                      }`}
                    >
                      <Pencil size={14} /> Manual
                    </button>
                  </div>
                  {grupos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarGrupo(grupo.id)}
                      className="text-xs font-semibold text-[#FF5E4B] hover-pop hover-press flex-shrink-0 px-2 py-1"
                    >
                      Quitar este grupo
                    </button>
                  )}
                </div>

                {grupo.fotos.length === 0 ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-[#00827C]/10 flex items-center justify-center mx-auto mb-4">
                      <Camera size={28} className="text-[#00827C]" />
                    </div>
                    <p className={`text-base font-semibold mb-1 ${tp}`}>Sube las fotos del ítem {gi + 1}</p>
                    <p className={`text-sm mb-1 ${ts}`}>
                      {grupo.modo === 'ia'
                        ? `La IA detecta el ítem que veas, hasta ${MAX_FOTOS_POR_TANDA} fotos a la vez`
                        : `Elige tú la categoría y llena todo a mano, hasta ${MAX_FOTOS_POR_TANDA} fotos a la vez`}
                    </p>
                    <p className={`text-xs mb-4 flex items-center justify-center gap-1 text-center ${ts}`}>
                      <Clipboard size={13} className="flex-shrink-0" /> También puedes pegar imágenes copiadas, una o varias veces: ⌘V en Mac, Ctrl+V en PC, o mantén presionado y elige Pegar en iOS
                    </p>
                  </>
                ) : (
                  <div className="flex gap-2 overflow-x-auto mb-4">
                    {grupo.fotos.map((f, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        <img src={f.preview} alt="" className="h-24 rounded-[10px] object-cover bg-[var(--bg-input)]" />
                        <button
                          type="button"
                          onClick={() => quitarFotoDeGrupo(grupo.id, i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#474747] text-white flex items-center justify-center hover-pop hover-press"
                          title="Quitar esta foto"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => { grupoActivoParaInputRef.current = grupo.id; inputFotoRef.current?.click() }}
                  variant={grupo.fotos.length > 0 ? 'secondary' : 'primary'}
                >
                  {grupo.fotos.length > 0 ? 'Agregar otra foto' : 'Elegir fotos'}
                </Button>
              </div>
            )}

            {grupo.estado === 'procesando' && (
              <div className={`rounded-[12px] border p-6 ${cardBg}`}>
                <div className="flex gap-2 overflow-x-auto mb-4">
                  {grupo.fotos.map((f, i) => (
                    <img key={i} src={f.preview} alt="Vista previa" className="h-32 flex-shrink-0 rounded-[8px] object-cover bg-[var(--bg-input)]" />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className={`h-5 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
                  <div className={`h-4 rounded-full w-3/4 animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
                </div>
                <p className={`text-sm text-center mt-4 ${ts}`}>{mensajesAnalizando(grupo.fotos.length)[0]}</p>
              </div>
            )}

            {grupo.estado === 'error' && (
              <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
                <XCircle size={24} className="text-[#FF5E4B] mx-auto mb-2" />
                <p className={`text-sm mb-3 ${ts}`}>{grupo.errorMsg ?? 'No se pudo analizar este grupo.'}</p>
                <Button variant="secondary" onClick={() => reintentarGrupo(grupo.id)}>Reintentar</Button>
              </div>
            )}

            {grupo.estado === 'resultado' && (() => {
              const totales = totalesDeGrupo(grupo)
              return (
                <div className="space-y-4">
                  {grupo.fotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {grupo.fotos.map((f, i) => (
                        <img key={i} src={f.preview} alt="" className="h-24 flex-shrink-0 rounded-[10px] object-cover bg-[var(--bg-input)]" />
                      ))}
                    </div>
                  )}

                  {grupo.observaciones && (
                    <p className={`text-xs italic ${ts}`}>&ldquo;{grupo.observaciones}&rdquo;</p>
                  )}

                  {grupo.itemsDetectados.length === 0 && grupo.noIdentificados.length === 0 && grupo.sinMatch.length === 0 && (
                    <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
                      <XCircle size={24} className="text-[#FF5E4B] mx-auto mb-2" />
                      <p className={`text-sm ${ts}`}>No se detectó ningún ítem en {grupo.fotos.length > 1 ? 'las fotos' : 'la foto'}. Intenta con otra imagen.</p>
                    </div>
                  )}

                  {grupo.itemsDetectados.map((item, i) => (
                    <GrupoItemCard
                      key={item._uiKey ?? i}
                      item={item}
                      catalogo={catalogo}
                      conEmpresa={conEmpresa}
                      fotosGrupo={grupo.fotos}
                      onElegir={grupo.modo === 'ia' && grupo.itemsDetectados.length > 1 ? () => elegirCandidatoDeGrupo(grupo.id, i) : undefined}
                      onChange={(nuevo) => actualizarItemDeGrupo(grupo.id, i, nuevo)}
                      onQuitar={() => quitarItemDeGrupo(grupo.id, i)}
                      onDuplicar={() => duplicarItemDeGrupo(grupo.id, i)}
                    />
                  ))}

                  {grupo.itemsDetectados.length > 0 && (
                    <Button
                      onClick={() => confirmarGrupo(grupo.id)}
                      disabled={estado === 'guardando'}
                      loading={estado === 'guardando'}
                      icon={<Plus size={16} strokeWidth={2.5} />}
                      className="w-full"
                    >
                      Agregar a la cotización
                    </Button>
                  )}

                  {(grupo.sinMatch.length > 0 || grupo.noIdentificados.length > 0) && (
                    <div className={`rounded-[12px] border p-4 ${isDark ? 'bg-[#F6BF3E]/10 border-[#F6BF3E]/25' : 'bg-[#F6BF3E]/08 border-[#F6BF3E]/20'}`}>
                      <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-[#F6BF3E]' : 'text-[#8a6d1f]'}`}>No reconocidos en el catálogo</p>
                      <div className="flex flex-col gap-3">
                        {grupo.sinMatch.map((d, i) => (
                          <div key={`sm-${i}`} className="flex items-center gap-3">
                            {d.imagenPreview && (
                              <img src={d.imagenPreview} alt="" className="w-12 h-12 rounded-[8px] object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0 text-left">
                              <p className={`text-xs font-semibold truncate ${tp}`}>{d.titulo}</p>
                              <p className={`text-xs truncate ${ts}`}>{d.descripcion}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => buscarEnCatalogoDesdeSinMatchDeGrupo(grupo.id, i)}
                              className="text-xs font-semibold text-[#00827C] hover-pop hover-press flex-shrink-0 px-2 py-1"
                            >
                              Buscar en catálogo
                            </button>
                          </div>
                        ))}
                        {grupo.noIdentificados.map((n, i) => (
                          <div key={`ni-${i}`} className="flex items-center gap-3">
                            <p className={`text-xs flex-1 ${ts}`}>• {n}</p>
                            <button
                              type="button"
                              onClick={() => buscarEnCatalogoDesdeTextoDeGrupo(grupo.id, i)}
                              className="text-xs font-semibold text-[#00827C] hover-pop hover-press flex-shrink-0 px-2 py-1"
                            >
                              Buscar en catálogo
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {grupo.itemsDetectados.length > 0 && (
                    <div className={`rounded-[12px] border p-4 ${cardBg}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${tp}`}>Total de este ítem</span>
                        <span className="text-lg font-bold text-[#00827C]">{formatCOP(totales.precio)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Leaf size={14} className="text-[#38B98E]" />
                        <span className={`text-xs ${ts}`}>{formatNumero(totales.co2, { unidad: 'kg CO2 eq evitado' })}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Drop size={14} className="text-[#59A6E4]" />
                        <span className={`text-xs ${ts}`}>Total agua evitada: {formatNumero(totales.agua, { unidad: 'L' })}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        ))}

        {/* Fila de rescate: crear un ítem nuevo que todavía no existe en el
            catálogo, fuera de cualquier grupo de fotos — no cuenta contra el
            tope de 3 grupos. Solo tiene sentido una vez hay cliente. */}
        {cliente && (
          <button
            type="button"
            onClick={abrirRescate}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border-2 border-dashed text-sm font-semibold transition-colors hover-pop mb-4 ${ts}`}
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus size={16} /> Agregar ítem que no existe en el catálogo
          </button>
        )}

        {error && (
          <p className="text-sm text-[#FF5E4B] flex items-center gap-1 mb-4">
            <WarningCircle size={16} /> {error}
          </p>
        )}

        {/* Tope de 3 grupos alcanzado */}
        {cliente && gruposUsados >= 3 && (
          <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
            <p className={`text-sm mb-3 ${ts}`}>Ya agregaste 3 ítems a esta cotización. Para agregar más, edítala después de guardarla.</p>
            {cotizacionId && (
              <Button variant="secondary" onClick={() => router.push(conEmpresa(`/empresa/cotizador/${cotizacionId}`))}>
                Ir a la cotización
              </Button>
            )}
          </div>
        )}
```

Notar: la fila de rescate y el mensaje de error se movieron fuera del `.map()` de grupos (antes vivían dentro del bloque `estado === 'resultado'` de un solo grupo) — ahora son globales a la pantalla, coherente con que "rescate" nunca contó contra el tope de grupos.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva/page.tsx"`
Expected: los únicos errores restantes deben estar en la barra sticky (Task 6, líneas ~1109-1176) — confirmar el mensaje exacto.

---

## Task 6: Barra sticky — agregar grupo / procesar / genera propuesta

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/page.tsx:1109-1176`

- [ ] **Step 1: Reemplazar la condición de visibilidad de la barra y sus 3 botones**

Reemplazar (líneas 1116-1176, desde `{(estado === 'resultado' || estado === 'guardando' || cotizacionId || muebles.length > 0) && (` hasta el `)}` que la cierra):
```tsx
      {(grupos.some(g => g.fotos.length > 0) || cotizacionId || muebles.length > 0) && (
        <div className="sticky bottom-0 z-30 w-full bg-[var(--bg-primary)] py-3 border-t border-[var(--border)] -mt-5">
          <div aria-hidden="true" className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
          <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
            {grupos.length < MAX_GRUPOS && (
              <Button
                variant="secondary"
                onClick={agregarGrupo}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Agregar otro grupo de fotos
              </Button>
            )}
            {grupos.some(g => g.estado === 'apilando' && g.fotos.length > 0) && (
              // primary (verde sólido): alterna con "Agregar otro grupo de
              // fotos" (secondary/borde) — regla de la skill design-system.
              <Button
                variant="primary"
                onClick={procesarGrupos}
                icon={<Sparkles size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Procesar con IA
              </Button>
            )}
            {(cotizacionId || muebles.length > 0) && (
              <Button
                variant="secondary"
                onClick={handleGenerarPropuesta}
                disabled={estado === 'guardando' || gruposUsados === 0}
                icon={<ArrowRight size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Genera la propuesta
              </Button>
            )}
          </div>
        </div>
      )}
```

Nota de alternancia: cuando los 3 botones aparecen juntos (`grupos.length < MAX_GRUPOS` Y algún grupo apilando con fotos Y ya hay cotización/muebles), la secuencia es secondary → primary → secondary, alternando correctamente. Cuando solo aparecen 2, cualquier combinación de las tres restantes también alterna (secondary+primary, o primary+secondary si "Agregar otro grupo" no cabe por el tope). El único caso a vigilar es que **nunca** "Agregar otro grupo de fotos" y "Genera la propuesta" queden pegados siendo ambos secondary sin "Procesar con IA" en medio — pasa si no hay ningún grupo con fotos sin procesar. Corregido: "Genera la propuesta" se deja `secondary` aquí (no `primary` como en la versión anterior) porque ahora el vecino más común de "Agregar otro grupo de fotos" es "Procesar con IA" (primary), y ese es quien debe alternar con él, no "Genera la propuesta". Si "Procesar con IA" no está visible y sí lo están los otros dos, quedan dos `secondary` pegados — para evitarlo, ver Step 2.

- [ ] **Step 2: Corrección de alternancia cuando "Procesar con IA" no está visible**

Si ningún grupo está en `'apilando'` con fotos (ej. ya se procesaron todos), pero sigue habiendo `grupos.length < MAX_GRUPOS` y `(cotizacionId || muebles.length > 0)`, "Agregar otro grupo de fotos" y "Genera la propuesta" quedarían pegados, ambos `secondary`. Cambiar el `variant` de "Genera la propuesta" para que sea condicional:
```tsx
              <Button
                variant={grupos.some(g => g.estado === 'apilando' && g.fotos.length > 0) || grupos.length >= MAX_GRUPOS ? 'secondary' : 'primary'}
```
Sustituir esa única línea (el `variant="secondary"` fijo de "Genera la propuesta" del Step 1) por la de arriba: cuando "Procesar con IA" SÍ está en medio (o cuando "Agregar otro grupo" ya no cabe por el tope, dejando a "Genera la propuesta" sin vecino secondary a su izquierda), se queda `secondary`; en el único caso donde quedaría pegado a "Agregar otro grupo de fotos" sin nada en medio, pasa a `primary` para alternar.

- [ ] **Step 3: Verificar tipos y lint**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/nueva"` y `npx eslint "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"`
Expected: ambos limpios, sin salida. Si queda algún error, es una referencia perdida a `fotos`/`itemsDetectados`/`modo`/`estado === 'resultado'`/`estado === 'analizando'` global — buscar con `grep -n "\bfotos\b\|itemsDetectados\|\bmodo\b" src/app/(empresa)/empresa/cotizador/nueva/page.tsx` y confirmar que las únicas coincidencias son `grupo.fotos`/`grupo.modo`/parámetros de función, nunca la variable global vieja.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(empresa)/empresa/cotizador/nueva/page.tsx"
git commit -m "$(cat <<'EOF'
feat: grupos de fotos apilados en /empresa/cotizador/nueva

Reemplaza el modelo de "confirmar un grupo -> resetear pantalla" por
apilar hasta 3 grupos en la misma vista, cada uno con su propio modo
IA/Manual, y procesarlos juntos con un solo botón "Procesar con IA".
Cada grupo resuelto se confirma con su propio botón. Grupos que
fallan al analizar muestran "Reintentar" sin bloquear a los demás.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Cron de purga de cotizaciones vacías (24h)

**Files:**
- Create: `src/app/api/cron/cotizador-vacias-purga-24h/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Crear el endpoint del cron, mismo patrón exacto que `status-purga-30d/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente (vercel.json). Borra crm_cotizaciones
// que no tengan NINGUNA fila en crm_muebles_cotizados y con más de 24 horas
// desde su creación — evita que abandonar la pantalla de "Nueva cotización"
// sin agregar ningún ítem deje basura permanente (la cotización se crea de
// inmediato al elegir cliente, para no perder esa selección si se refresca
// la página antes de guardar el primer ítem, ver page.tsx handleClienteListo).

interface CotizacionVacia {
  id: string
  codigo_cotizacion: string
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: candidatas, error } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion')
    .lt('created_at', hace24h)

  if (error) {
    console.error('[cron/cotizador-vacias-purga-24h]', error.message)
    return NextResponse.json({ error: 'Error al consultar cotizaciones.' }, { status: 500 })
  }

  if (!candidatas || candidatas.length === 0) {
    return NextResponse.json({ procesadas: 0, purgadas: 0, mensaje: 'Sin cotizaciones que revisar hoy.' })
  }

  let purgadas = 0
  for (const cot of candidatas as CotizacionVacia[]) {
    const { count } = await adminClient
      .from('crm_muebles_cotizados')
      .select('id', { count: 'exact', head: true })
      .eq('cotizacion_id', cot.id)

    if (count && count > 0) continue // tiene ítems, no se toca

    const { error: deleteError } = await adminClient.from('crm_cotizaciones').delete().eq('id', cot.id)
    if (!deleteError) purgadas++
    else console.error(`[cron/cotizador-vacias-purga-24h] error borrando ${cot.codigo_cotizacion}:`, deleteError.message)
  }

  console.log(`[cron/cotizador-vacias-purga-24h] ${purgadas} cotizaciones vacías purgadas de ${candidatas.length} revisadas.`)

  return NextResponse.json({
    procesadas: candidatas.length,
    purgadas,
    mensaje: `${purgadas} cotizaciones vacías purgadas (24h+ sin ítems).`,
  })
}
```

- [ ] **Step 2: Registrar el cron en `vercel.json`**

Reemplazar el array `crons` completo:
```json
{
  "crons": [
    {
      "path": "/api/cron/cotizaciones-frias",
      "schedule": "0 13 * * *"
    },
    {
      "path": "/api/cron/keep-alive-supabase",
      "schedule": "0 13 * * 1,4"
    },
    {
      "path": "/api/cron/cotizador-purga-90d",
      "schedule": "0 14 * * *"
    },
    {
      "path": "/api/cron/cotizador-vacias-purga-24h",
      "schedule": "0 14 * * *"
    },
    {
      "path": "/api/cron/status-purga-30d",
      "schedule": "0 15 * * *"
    },
    {
      "path": "/api/cron/alertas-retencion",
      "schedule": "0 16 * * *"
    }
  ]
}
```
(Se agregó la entrada nueva a las 14:00, misma hora que `cotizador-purga-90d` — ambos tocan la misma tabla pero con criterios excluyentes en la práctica: 90 días vs 24h sin ítems, no compiten por las mismas filas salvo el borde de una cotización vacía Y de más de 90 días, que cualquiera de los dos igual borra sin conflicto.)

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit 2>&1 | grep "cron/cotizador-vacias-purga-24h"`
Expected: sin salida.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/cotizador-vacias-purga-24h/route.ts vercel.json
git commit -m "$(cat <<'EOF'
feat: cron de purga de cotizaciones sin ítems a las 24h

Evita que abandonar /empresa/cotizador/nueva sin agregar ningún ítem
deje cotizaciones vacías permanentes en crm_cotizaciones.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Filtro en el listado — nunca mostrar cotizaciones sin ítems

**Files:**
- Modify: `src/app/api/cotizador/cotizaciones/route.ts:132-139`

- [ ] **Step 1: Filtrar `cotizacionesConMuebles` antes de responder**

Reemplazar (líneas 128-139):
```ts
  // Volumen físico real de la cotización — suma de "cantidad" de cada mueble
  // (no cuenta de filas: un mueble puede tener cantidad > 1). Se calcula acá
  // y se manda como un solo número, en vez de mandar el arreglo completo de
  // muebles a un endpoint que es solo un resumen de lista.
  const cotizacionesConMuebles = cotizaciones.map((c) => ({
    ...c,
    total_muebles: (c.crm_muebles_cotizados ?? []).reduce((sum, m) => sum + (m.cantidad ?? 0), 0),
    fecha_cierre: fechaCierrePorId.get(c.id) ?? null,
    crm_muebles_cotizados: undefined,
  }))

  return NextResponse.json({ cotizaciones: cotizacionesConMuebles })
```
por:
```ts
  // Volumen físico real de la cotización — suma de "cantidad" de cada mueble
  // (no cuenta de filas: un mueble puede tener cantidad > 1). Se calcula acá
  // y se manda como un solo número, en vez de mandar el arreglo completo de
  // muebles a un endpoint que es solo un resumen de lista.
  //
  // Una cotización sin NINGÚN mueble (fila en crm_muebles_cotizados) nunca
  // se lista — regla explícita: no deben verse cotizaciones vacías mientras
  // el vendedor sigue armándolas en /nueva, ni aunque el cron de purga de
  // 24h todavía no haya corrido. `GET /api/cotizador/cotizaciones/[id]` (una
  // sola, por id) SÍ sigue funcionando igual para la propia pantalla de
  // "Nueva cotización" recargando su cliente — este filtro es solo del
  // listado.
  const cotizacionesConMuebles = cotizaciones
    .filter((c) => (c.crm_muebles_cotizados ?? []).length > 0)
    .map((c) => ({
      ...c,
      total_muebles: (c.crm_muebles_cotizados ?? []).reduce((sum, m) => sum + (m.cantidad ?? 0), 0),
      fecha_cierre: fechaCierrePorId.get(c.id) ?? null,
      crm_muebles_cotizados: undefined,
    }))

  return NextResponse.json({ cotizaciones: cotizacionesConMuebles })
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit 2>&1 | grep "cotizador/cotizaciones/route"` y `npx eslint src/app/api/cotizador/cotizaciones/route.ts`
Expected: ambos limpios.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cotizador/cotizaciones/route.ts
git commit -m "$(cat <<'EOF'
fix: el listado de cotizaciones nunca muestra cotizaciones sin ítems

Complementa el cron de purga a 24h: mientras el cron no corre, el
listado ya las oculta desde el primer momento.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Verificación en vivo con Playwright (no solo lectura de código)

**Files:**
- Create (temporal, se borra al terminar): `__debug_grupos_apilados.mjs` en la raíz del proyecto

- [ ] **Step 1: Reiniciar PM2 limpio antes de probar**

```bash
npx pm2 stop reuso && rm -rf .next && npx pm2 flush && npx pm2 restart reuso --update-env
```
Esperar ~15s a que compile, luego `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login` debe dar `200`.

- [ ] **Step 2: Escribir el script de verificación (mismo patrón ya usado esta sesión: cuenta empresa_admin efímera + empresa real + módulo `cotizador_crm` activo, todo se borra al final en un `finally`)**

```js
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

function generarPassword() {
  const bytes = Array.from({ length: 18 }, () => Math.floor(Math.random() * 256))
  return Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '').slice(0, 20) + 'Aa1!'
}

const sufijo = Date.now()
const email = `debug_grupos_apilados_${sufijo}@reuso.lurdes.co`
const password = generarPassword()
let userId, empresaId, moduloEmpresaId

async function limpiar() {
  if (moduloEmpresaId) await supabaseAdmin.from('modulos_empresas').delete().eq('id', moduloEmpresaId)
  if (empresaId) await supabaseAdmin.from('empresas').delete().eq('id', empresaId)
  if (userId) await supabaseAdmin.auth.admin.deleteUser(userId)
  console.log('Limpieza completa.')
}

try {
  const { data: nuevo, error: errUser } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nombre: 'Debug Grupos Apilados' },
  })
  if (errUser || !nuevo.user) throw new Error(`No se pudo crear usuario: ${errUser?.message}`)
  userId = nuevo.user.id

  const { data: empresa, error: errEmpresa } = await supabaseAdmin.from('empresas').insert({
    nombre: 'Debug Grupos Apilados SAS', slug: `debug-grupos-apilados-${sufijo}`, plan: 'impulso', activa: true,
  }).select('id').single()
  if (errEmpresa || !empresa) throw new Error(`No se pudo crear empresa: ${errEmpresa?.message}`)
  empresaId = empresa.id

  await supabaseAdmin.from('profiles').upsert(
    { user_id: userId, email, nombre: 'Debug Grupos Apilados', rol: 'empresa_admin', empresa_id: empresaId },
    { onConflict: 'user_id' }
  )

  const { data: modulo } = await supabaseAdmin.from('modulos').select('id').eq('clave', 'cotizador_crm').eq('activo', true).single()
  const { data: me } = await supabaseAdmin.from('modulos_empresas').insert({ modulo_id: modulo.id, empresa_id: empresaId, activo: true }).select('id').single()
  moduloEmpresaId = me.id

  // El mock de /api/cotizador/diagnostico se salta por completo el mapeo
  // servidor de item_nombre -> item_id real del catálogo (nombreAId en
  // diagnostico/route.ts, línea 301) — sin un item_id válido, "Agregar a la
  // cotización" fallaría la validación "Elige la categoría del catálogo
  // para cada ítem". Se usa un ítem GLOBAL real (visible a cualquier
  // empresa nueva, sin permisos especiales) para que el mock sea honesto.
  const { data: itemGlobal, error: errItem } = await supabaseAdmin
    .from('items').select('id, nombre').eq('activo', true).eq('visibilidad', 'global').limit(1).single()
  if (errItem || !itemGlobal) throw new Error('No hay ningún ítem global activo en el catálogo para usar en el mock.')
  console.log('Usando ítem global real para el mock:', itemGlobal.nombre, itemGlobal.id)

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' })
  const page = await context.newPage()
  page.on('console', msg => { if (msg.type() === 'error') console.log('[browser error]', msg.text()) })

  let llamadasDiagnostico = 0
  await page.route('**/api/cotizador/diagnostico', async route => {
    llamadasDiagnostico++
    const body = JSON.parse(route.request().postData() ?? '{}')
    const nFotos = (body.imagenes ?? []).length
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        items_detectados: [{
          item_id: itemGlobal.id, item_nombre: itemGlobal.nombre, titulo: `${itemGlobal.nombre} (grupo ${llamadasDiagnostico})`, descripcion: 'test',
          cantidad: 1, confianza: 0.9, imagen_index: 0, bounding_box: null,
          factor_rentabilidad: 2, co2_evitado_kg_unidad: 1, agua_evitada_l_unidad: 1, peso_kg_unidad: 1,
          materiales: [], servicios: [], insumos: [],
        }],
        sin_match_detalle: [], no_identificados: [], observaciones_visuales: `debug ${nFotos} fotos`,
      }),
    })
  })

  await page.goto('/login')
  await page.locator('button', { hasText: /Solo esenciales|Essential only/ }).first().click({ timeout: 5000 }).catch(() => {})
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/empresa/, { timeout: 30000 })

  await page.goto('/empresa/cotizador/nueva')
  await page.waitForURL(/\/empresa\/cotizador\/nueva/, { timeout: 15000 })

  const buscarInput = page.locator('input[placeholder*="900123456" i]')
  await buscarInput.waitFor({ timeout: 15000 })
  const telefonoUnico = '3' + String(Date.now()).slice(-9)
  await buscarInput.fill(telefonoUnico)
  await page.getByRole('button', { name: /^Buscar$/ }).click()
  await page.getByText('Cliente nuevo').waitFor({ timeout: 10000 })
  await page.locator('input[placeholder="Nombre"]').fill('DebugApilado')
  await page.locator('input[placeholder="Apellido"]').fill('Prueba')
  await page.locator('input[placeholder="Número de celular"]').fill(telefonoUnico)
  await page.getByRole('button', { name: /Crear y continuar/ }).click()
  await page.getByText('DebugApilado').waitFor({ timeout: 15000 })
  console.log('OK: cliente identificado')

  // Grupo 1: el input de archivo es UNO SOLO, compartido entre los 3 grupos
  // posibles — cada grupo, al hacer clic en su "Elegir fotos"/"Agregar otra
  // foto", guarda su propio id en `grupoActivoParaInputRef` antes de abrir
  // el picker (ver Task 2). Por eso hay que hacer clic en el botón del
  // grupo correcto ANTES de `setInputFiles`, nunca llamarlo a ciegas.
  const fotoTest = { name: 'test.webp', mimeType: 'image/webp', buffer: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3QgAAA', 'base64') }
  await page.getByRole('button', { name: /Elegir fotos/ }).click() // solo el grupo 1 existe todavía, sin ambigüedad
  await page.locator('input[type="file"]').setInputFiles(fotoTest)
  console.log('OK: foto subida al grupo 1')

  // Agregar grupo 2 — el grupo 1 ya tiene foto (muestra miniaturas, no el
  // texto "Sube las fotos"), así que debe quedar exactamente 1 grupo vacío
  // mostrando esa zona de carga en blanco: el grupo 2 recién apilado.
  await page.getByRole('button', { name: /Agregar otro grupo de fotos/ }).click()
  const gruposVacios = await page.getByText(/Sube las fotos del ítem/).count()
  console.log('Grupos vacíos mostrando la zona de carga tras agregar el segundo:', gruposVacios)
  if (gruposVacios !== 1) throw new Error(`Esperaba 1 grupo vacío (el nuevo), hay ${gruposVacios}`)

  // El grupo 1 ya tiene foto -> su botón dice "Agregar otra foto" (secondary).
  // El grupo 2 está vacío -> su botón dice "Elegir fotos" (primary), sin
  // ambigüedad para el selector de abajo.
  await page.getByRole('button', { name: /Elegir fotos/ }).click()
  await page.locator('input[type="file"]').setInputFiles(fotoTest)
  console.log('OK: foto subida al grupo 2, el grupo 1 conserva la suya')

  const miniaturasTotal = await page.locator('img[alt=""]').count()
  console.log('Miniaturas de fotos visibles en pantalla tras ambos grupos con foto:', miniaturasTotal)
  if (miniaturasTotal < 2) throw new Error(`Esperaba al menos 2 miniaturas (una por grupo), hay ${miniaturasTotal}`)

  // Procesar los 2 grupos juntos
  await page.getByRole('button', { name: /Procesar con IA/ }).click()
  await page.getByText('Nombre para mostrar').first().waitFor({ timeout: 15000 })
  const tarjetas = await page.getByText('Nombre para mostrar').count()
  console.log('Tarjetas de ítem resueltas tras procesar:', tarjetas, '| llamadas a diagnostico:', llamadasDiagnostico)
  if (tarjetas !== 2 || llamadasDiagnostico !== 2) throw new Error(`Esperaba 2 tarjetas y 2 llamadas a diagnostico, hubo ${tarjetas} tarjetas y ${llamadasDiagnostico} llamadas`)

  // Confirmar el primer grupo
  await page.getByRole('button', { name: /Agregar a la cotización/ }).first().click()
  await page.getByText('1 línea agregada').waitFor({ timeout: 15000 })
  console.log('OK: primer grupo confirmado, aparece en "líneas agregadas"')

  const tarjetasRestantes = await page.getByText('Nombre para mostrar').count()
  console.log('Tarjetas restantes tras confirmar la primera:', tarjetasRestantes)
  if (tarjetasRestantes !== 1) throw new Error(`Esperaba 1 tarjeta restante, hay ${tarjetasRestantes}`)

  await page.screenshot({ path: '/private/tmp/claude-501/-Users-merinop-Documents-Automatizaciones-Reuso/e2a2eedf-194c-4a3f-be5b-043ef6f7318f/scratchpad/grupos-apilados.png', fullPage: true })
  await browser.close()
  console.log('FIN — todo verificado en vivo.')
} catch (e) {
  console.error('ERROR:', e.message)
  throw e
} finally {
  await limpiar()
}
```

- [ ] **Step 3: Ejecutar y leer la salida completa**

Run: `node __debug_grupos_apilados.mjs`
Expected: todas las líneas `OK:` sin ningún `ERROR:`, y en particular `llamadas a diagnostico: 2` (una por grupo, nunca 1 combinada) y `Tarjetas restantes tras confirmar la primera: 1` (confirmar un grupo no borra el otro). Si algo falla, diagnosticar con `systematic-debugging` antes de tocar más código — no asumir que "ya debería funcionar" por haber seguido el plan.

- [ ] **Step 4: Borrar el script de debug (nunca se comitea)**

```bash
rm -f __debug_grupos_apilados.mjs
git status --porcelain | grep "__debug" || echo "limpio, nada de debug quedó en el repo"
```

---

## Verificación final (spec completa)

- `npx tsc --noEmit` limpio en todo el proyecto (no solo los archivos tocados, por si algún import roto en otro archivo referenciaba algo removido).
- `npx eslint "src/app/(empresa)/empresa/cotizador/nueva/page.tsx" "src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx" src/app/api/cotizador/cotizaciones/route.ts src/app/api/cron/cotizador-vacias-purga-24h/route.ts` limpio.
- Task 9 completado con éxito (verificación en vivo, no solo código leído).
- Recordar al usuario: refresco forzado (Cmd+Shift+R) antes de probar en su propio navegador, y que PM2 quedó reiniciado limpio.
- No se tocó nada del plan de escalabilidad multiempresa.
