/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, XCircle, Leaf, Droplet as Drop, Plus, ArrowRight, AlertCircle as WarningCircle, ClipboardPaste as Clipboard, Loader2, ExternalLink, CheckCircle, Pencil, Sparkles, X } from '@/components/ui/icons'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'
import { formatCOP, formatNumero } from '@/lib/format'
import { IdentificacionCliente, type ClienteIdentificado } from './components/identificacion-cliente'
import { formatTelefonoVista } from '@/lib/telefono'
import { GrupoItemCard, type ItemConImagen } from './components/grupo-item-card'
import type { ItemDetectadoConSnapshot, SinMatchDetalle } from '@/app/api/cotizador/diagnostico/route'
import { comprimirImagenBase64, recortarImagenBase64, boundingBoxEsUtil, type BoundingBox } from '@/lib/image-compress'

// ── Tipos locales ─────────────────────────────────────────────────────────────

type EstadoPrecioMercado = 'pendiente' | 'sugerido' | 'confirmado' | 'sin_resultado'
type ModoAnalisis = 'ia' | 'manual'

interface SinMatchConImagen extends SinMatchDetalle {
  imagenPreview: string
  imagenBase64: string
}

interface MuebleAgregado {
  id: string
  titulo: string
  cantidad: number
  precio_mueble: number
  co2_evitado_kg: number
  imagen_preview: string | null
  precio_mercado_nuevo: number | null
  precio_mercado_fuente_url: string | null
  precio_mercado_fuente_titulo: string | null
  precio_mercado_estado: EstadoPrecioMercado
}

type EstadoUI = 'idle' | 'analizando' | 'resultado' | 'guardando'

// Cada conjunto de fotos es de máximo 3 — directriz explícita. No hay tope
// de cuántos conjuntos se pueden subir: al confirmar uno (handleConfirmarTodos),
// el estado vuelve a 'idle' con `fotos`/`itemsDetectados` vacíos, listo para
// subir el siguiente conjunto sin límite.
const MAX_FOTOS_POR_TANDA = 3

function precioUnidad(item: ItemDetectadoConSnapshot): number {
  const servicios = item.servicios.reduce((s, x) => s + x.precio, 0)
  const insumos = item.insumos.reduce((s, x) => s + x.cantidad * x.precio_unitario, 0)
  return (servicios + insumos) * item.factor_rentabilidad
}

// CO2/agua por unidad EN VIVO desde los materiales actuales del ítem (si el
// vendedor los editó en la tarjeta, o si es un ítem Manual que arrancó en
// cero) — nunca el snapshot congelado que trajo la IA al detectar, o el
// resumen "Total de esta foto" quedaría desactualizado apenas alguien toque
// un peso en la Tarjeta 3. Mismo criterio que ya usa el backend en
// mueble/route.ts al recalcular cuando llegan materiales_json.
function co2PorUnidad(item: ItemDetectadoConSnapshot): number {
  return item.materiales.length > 0
    ? item.materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0)
    : item.co2_evitado_kg_unidad
}
function aguaPorUnidad(item: ItemDetectadoConSnapshot): number {
  return item.materiales.length > 0
    ? item.materiales.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0)
    : item.agua_evitada_l_unidad
}

// Recorta la miniatura de un ítem detectado (o usa la foto completa si el
// recuadro no aporta nada) — compartido entre ítems con match y sin match,
// ambos traen el mismo par imagen_index/bounding_box.
async function construirMiniatura(
  imagenIndex: number,
  boundingBox: BoundingBox | null,
  fotosBase: { base64: string; preview: string }[]
): Promise<{ imagenPreview: string; imagenBase64: string }> {
  const foto = fotosBase[imagenIndex] ?? fotosBase[0]
  if (boundingBoxEsUtil(boundingBox)) {
    try {
      const recorte = await recortarImagenBase64(foto.preview, boundingBox)
      return { imagenPreview: recorte.preview, imagenBase64: recorte.base64 }
    } catch {
      // Si el recorte falla por cualquier razón, se usa la foto completa —
      // nunca se rompe el flujo por esto.
    }
  }
  return { imagenPreview: foto.preview, imagenBase64: foto.base64 }
}

// Tarjeta en blanco para modo Manual (o "Buscar en catálogo" de un ítem no
// identificado) — el vendedor elige la categoría/subcategoría él mismo desde
// el selector que ya trae GrupoItemCard, sin pasar por la IA.
function construirItemStub(opts: {
  imagenIndex: number
  imagenPreview: string
  imagenBase64: string
  titulo?: string
  descripcion?: string
  cantidad?: number
  confianza?: number
}): ItemConImagen {
  return {
    item_id: '',
    item_nombre: '',
    titulo: opts.titulo ?? '',
    descripcion: opts.descripcion ?? '',
    cantidad: opts.cantidad ?? 1,
    confianza: opts.confianza ?? 0,
    imagen_index: opts.imagenIndex,
    bounding_box: null,
    factor_rentabilidad: 2,
    co2_evitado_kg_unidad: 0,
    agua_evitada_l_unidad: 0,
    peso_kg_unidad: 0,
    materiales: [],
    servicios: [],
    insumos: [],
    imagenPreview: opts.imagenPreview,
    imagenBase64: opts.imagenBase64,
    manual: true,
    _uiKey: crypto.randomUUID(),
  }
}

// Mensajes rotativos durante el análisis IA — el tiempo real no baja (una
// sola llamada a Gemini con varias fotos), pero rotar el texto evita que la
// espera se sienta "trabada" con un solo mensaje fijo.
function mensajesAnalizando(nFotos: number): string[] {
  const plural = nFotos > 1
  return [
    `Analizando la${plural ? 's' : ''} foto${plural ? 's' : ''}...`,
    'Detectando muebles...',
    'Comparando con el catálogo...',
    'Casi listo...',
  ]
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-[var(--bg-primary)]" />}>
      <NuevaCotizacionContent />
    </Suspense>
  )
}

function NuevaCotizacionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const empresaIdParam = searchParams.get('empresa_id')
  const cotizacionIdParam = searchParams.get('cotizacion_id')
  const conEmpresa = useCallback((url: string) =>
    empresaIdParam ? `${url}${url.includes('?') ? '&' : '?'}empresa_id=${empresaIdParam}` : url,
    [empresaIdParam])
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Estado del flujo
  const [estado, setEstado] = useState<EstadoUI>('idle')
  const [error, setError] = useState<string | null>(null)
  const [analizandoMsgIndex, setAnalizandoMsgIndex] = useState(0)

  // Cliente identificado — obligatorio antes de subir cualquier foto (ver Fase 2)
  const [cliente, setCliente] = useState<ClienteIdentificado | null>(null)

  // Modo "agregar más ítems": ?cotizacion_id=X llega desde el botón del
  // detalle de una cotización ya creada — se salta la identificación del
  // cliente (ya está fijado) y se sigue guardando en la MISMA cotización.
  const [cargandoExistente, setCargandoExistente] = useState(!!cotizacionIdParam)

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

  // Cotización acumulada
  const [cotizacionId, setCotizacionId] = useState<string | null>(null)
  const [muebles, setMuebles] = useState<MuebleAgregado[]>([])
  // Sube en 1 SOLO al confirmar el ítem resultante de un grupo de fotos (IA
  // o Manual) — nunca vía "rescate" (Buscar en catálogo / Agregar ítem que
  // no existe), esos no consumen un grupo. Tope: 3 grupos por cotización
  // nueva, ver JSX del botón "+ Agregar otro grupo de fotos" más abajo.
  const [gruposUsados, setGruposUsados] = useState(0)

  // Fila de rescate: "Agregar ítem" que la IA no detectó
  const [mostrarRescate, setMostrarRescate] = useState(false)
  const [rescateNombre, setRescateNombre] = useState('')
  const [rescatePrecio, setRescatePrecio] = useState('')
  const [rescateCo2, setRescateCo2] = useState('')
  const [rescateCategoriaId, setRescateCategoriaId] = useState('')
  const [categoriasHoja, setCategoriasHoja] = useState<{ id: string; nombre: string }[]>([])
  const [confirmarTipoRescate, setConfirmarTipoRescate] = useState(false)

  // Catálogo completo (id, nombre, categoria_nombre) para los selectores de
  // "Coincidencia de categoría" de cada GrupoItemCard — se carga una sola
  // vez, no una vez por tarjeta.
  const [catalogo, setCatalogo] = useState<{ id: string; nombre: string; categoria_nombre: string | null }[]>([])

  // Tema
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Catálogo completo, una sola vez, en cuanto hay cliente (lo van a
  // necesitar las tarjetas de ítems detectados apenas llegue una foto).
  useEffect(() => {
    if (!cliente || catalogo.length > 0) return
    let cancelado = false
    fetch(conEmpresa('/api/cotizador/items'))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelado && d) setCatalogo(d.items ?? []) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [cliente, catalogo.length, conEmpresa])

  // Proteger trabajo no guardado: advertir al salir si hay progreso pendiente
  useEffect(() => {
    const hayProgresoNoGuardado = fotos.length > 0 || itemsDetectados.length > 0 || (!cotizacionIdParam && cliente !== null && muebles.length === 0)
    if (!hayProgresoNoGuardado) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [fotos.length, itemsDetectados.length, cliente, cotizacionIdParam, muebles.length])

  // Modo "agregar más ítems": carga la cotización existente (cliente ya fijo
  // + líneas ya guardadas) en vez de arrancar el flujo de identificación.
  useEffect(() => {
    if (!cotizacionIdParam) return
    let cancelado = false
    async function cargarExistente() {
      try {
        const [resCot, resMuebles] = await Promise.all([
          fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionIdParam}`)),
          fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionIdParam}/muebles`)),
        ])
        const dCot = await resCot.json()
        const dMuebles = await resMuebles.json()
        if (cancelado) return
        if (!resCot.ok || !dCot.cotizacion?.crm_clientes) {
          setError(dCot.error ?? 'No se pudo cargar la cotización.')
          return
        }
        const c = dCot.cotizacion.crm_clientes
        setCliente({
          id: dCot.cotizacion.cliente_id,
          tipo: c.tipo, nombre: c.nombre, apellido: c.apellido, identificacion: c.identificacion ?? null,
          telefono: c.telefono, telefono_indicativo: c.telefono_indicativo,
          email: c.email, pais: c.pais ?? null, ciudad: c.ciudad, direccion: c.direccion,
          empresa_cliente_id: c.empresa_cliente_id,
          crm_empresas_clientes: c.crm_empresas_clientes,
        })
        setCotizacionId(cotizacionIdParam)
        if (dMuebles.muebles) {
          setMuebles(dMuebles.muebles.map((m: {
            id: string; titulo: string | null; tipo_mueble: string; cantidad: number; precio_mueble: number
            co2_evitado_kg: number; imagen_url: string | null
            precio_mercado_nuevo: number | null; precio_mercado_fuente_url: string | null; precio_mercado_estado: EstadoPrecioMercado
          }) => ({
            id: m.id, titulo: m.titulo || m.tipo_mueble, cantidad: m.cantidad, precio_mueble: m.precio_mueble,
            co2_evitado_kg: m.co2_evitado_kg, imagen_preview: m.imagen_url,
            precio_mercado_nuevo: m.precio_mercado_nuevo, precio_mercado_fuente_url: m.precio_mercado_fuente_url,
            precio_mercado_fuente_titulo: null, precio_mercado_estado: m.precio_mercado_estado ?? 'pendiente',
          })))
        }
      } catch {
        if (!cancelado) setError('No se pudo cargar la cotización. Intenta de nuevo.')
      } finally {
        if (!cancelado) setCargandoExistente(false)
      }
    }
    cargarExistente()
    return () => { cancelado = true }
  }, [cotizacionIdParam, conEmpresa])

  // ── Acumular fotos en una cola (compartido entre selector de archivo y
  // pegado Cmd+V) — NO dispara ningún análisis todavía. Varios Cmd+V
  // seguidos van sumando a la misma tanda hasta que el vendedor decide
  // analizar (Con IA) o continuar (Manual). ──

  const agregarFotos = useCallback(async (archivos: Blob[]) => {
    const imagenes = archivos.filter(a => a.type.startsWith('image/'))
    const rechazados = archivos.length - imagenes.length

    if (imagenes.length === 0) {
      setError(rechazados > 0 ? 'Solo se aceptan imágenes, no videos ni otro tipo de archivo.' : 'No se detectó ninguna imagen.')
      return
    }
    if (fotos.length + imagenes.length > MAX_FOTOS_POR_TANDA) {
      setError(`Sube máximo ${MAX_FOTOS_POR_TANDA} fotos por tanda. Ya tienes ${fotos.length}.`)
      return
    }
    const pesada = imagenes.find(a => a.size > 10 * 1024 * 1024)
    if (pesada) {
      setError('Cada imagen debe pesar máximo 10 MB. Quita la más pesada e intenta de nuevo.')
      return
    }

    setError(rechazados > 0 ? `Se ignoraron ${rechazados} archivo${rechazados > 1 ? 's' : ''} que no ${rechazados > 1 ? 'eran' : 'era'} imagen.` : null)

    // Promise.allSettled (no Promise.all): si una imagen viene corrupta, no
    // se pierde toda la tanda pegada, solo esa una.
    const resultados = await Promise.allSettled(imagenes.map(a => comprimirImagenBase64(a)))
    const comprimidas = resultados
      .filter((r): r is PromiseFulfilledResult<{ base64: string; preview: string }> => r.status === 'fulfilled')
      .map(r => r.value)
    const fallidas = resultados.length - comprimidas.length

    if (comprimidas.length > 0) setFotos(prev => [...prev, ...comprimidas])
    if (fallidas > 0) {
      setError(`No se pudo procesar ${fallidas} imagen${fallidas > 1 ? 'es' : ''}.${comprimidas.length > 0 ? ' El resto se agregó bien.' : ' Intenta de nuevo.'}`)
    }
  }, [fotos.length])

  function quitarFotoCola(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  function handleFotoSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) agregarFotos(files)
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

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

  // Pegar una o varias imágenes desde el portapapeles (Cmd+V) — activo
  // mientras la cola se sigue armando (estado idle), así que varios pegados
  // seguidos se acumulan en vez de perderse. Cualquier archivo pegado que no
  // sea imagen (ej. un video) se recoge igual para que agregarFotos lo
  // rechace con mensaje, en vez de ignorarlo en silencio.
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

  // ── Con IA: una sola llamada a la IA para toda la tanda acumulada, cada
  // ítem detectado ya trae su recuadro para poder recortar su propia
  // miniatura. ──

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

  // ── Manual: salta la IA por completo — una tarjeta en blanco por foto,
  // el vendedor elige categoría y llena todo desde GrupoItemCard. ──

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

  // "Buscar en catálogo" para un ítem que la IA no logró encuadrar: convierte
  // la pieza no reconocida en una tarjeta en blanco (con su propia foto si la
  // tenía) que reutiliza el mismo selector de categoría de GrupoItemCard, en
  // vez de forzar al vendedor a crear un ítem nuevo a ciegas.
  function buscarEnCatalogoDesdeSinMatch(index: number) {
    const d = sinMatch[index]
    if (!d) return
    const nuevo = construirItemStub({
      imagenIndex: d.imagen_index, imagenPreview: d.imagenPreview, imagenBase64: d.imagenBase64,
      titulo: d.titulo, descripcion: d.descripcion, cantidad: d.cantidad, confianza: d.confianza,
    })
    setItemsDetectados(prev => [...prev, nuevo])
    setSinMatch(prev => prev.filter((_, i) => i !== index))
  }

  // Igual, pero para el texto plano de "no_identificados" (la IA nunca lo
  // liga a ninguna foto) — la tarjeta nace sin miniatura.
  function buscarEnCatalogoDesdeTexto(index: number) {
    const texto = noIdentificados[index]
    if (!texto) return
    const nuevo = construirItemStub({
      imagenIndex: 0, imagenPreview: '', imagenBase64: '',
      titulo: texto.slice(0, 150), descripcion: texto,
    })
    setItemsDetectados(prev => [...prev, nuevo])
    setNoIdentificados(prev => prev.filter((_, i) => i !== index))
  }

  function actualizarItem(index: number, item: ItemConImagen) {
    setItemsDetectados(prev => prev.map((it, i) => i === index ? item : it))
  }

  function quitarDetectado(index: number) {
    setItemsDetectados(prev => prev.filter((_, i) => i !== index))
  }

  function duplicarDetectado(index: number) {
    setItemsDetectados(prev => {
      const original = prev[index]
      if (!original) return prev
      const copia: ItemConImagen = { ...original, titulo: `${original.titulo} (copia)`, _uiKey: crypto.randomUUID() }
      return [...prev.slice(0, index + 1), copia, ...prev.slice(index + 1)]
    })
  }

  // Modo IA con más de 1 candidato: elegir uno colapsa itemsDetectados a
  // solo ese — el grupo de fotos siempre produce UN ítem, nunca varios.
  function elegirCandidato(index: number) {
    setItemsDetectados(prev => prev[index] ? [prev[index]] : prev)
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
        // El vendedor le dio "Cambiar" con la cotización ya creada (sin
        // ítems todavía) — se actualiza el cliente de ESA cotización, en
        // vez de crear una nueva fila huérfana ligada al cliente anterior.
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
      // Si falla, no se muestra error acá — handleConfirmarTodos ya trae su
      // propio intento de creación como respaldo (`if (!id) { ... }`), el
      // vendedor puede seguir subiendo fotos sin interrupción.
    } catch {
      // Mismo criterio: falla silenciosa, hay un respaldo más adelante.
    }
  }

  // ── Confirmar: agrega todos los ítems detectados a la cotización ───────────

  async function handleConfirmarTodos() {
    if (itemsDetectados.length === 0 || !cliente) return
    if (itemsDetectados.some(it => !it.item_id)) {
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
        if (!resCot.ok) { setError(dataCot.error ?? 'Error al crear la cotización.'); setEstado('resultado'); return }
        id = dataCot.id as string
        setCotizacionId(id)
        window.history.replaceState(null, '', conEmpresa(`/empresa/cotizador/nueva?cotizacion_id=${id}`))
      }

      const nuevos: MuebleAgregado[] = []

      // Cada ítem sube su propia miniatura (recortada o la foto completa que
      // le tocó) — ya no se reutiliza una sola imagen para todos, porque con
      // varias fotos y recortes cada ítem puede verse distinto de verdad.
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
            // El editor muestra la lista base aunque esté en cero (para que
            // el vendedor la vea sin tener que "+ Añadir"), pero solo se
            // guarda lo que realmente tiene datos — mismo criterio que
            // EditarMuebleModal al guardar una línea ya creada.
            servicios_json: item.servicios.filter(s => s.nombre.trim()),
            insumos_json: item.insumos.filter(i => i.nombre.trim() && i.cantidad > 0),
            materiales_json: item.materiales.filter(m => m.nombre.trim() && m.peso_kg > 0 && m.factor_co2_kg > 0),
            factor_rentabilidad: item.factor_rentabilidad,
          }),
        })
        const dataMueble = await resMueble.json()
        if (!resMueble.ok) { setError(dataMueble.error ?? `Error al guardar "${item.item_nombre}".`); setEstado('resultado'); return }

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

      // Reiniciar para agregar otra tanda de fotos
      setEstado('idle')
      setFotos([])
      setItemsDetectados([])
      setNoIdentificados([])
      setSinMatch([])
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setEstado('resultado')
    }
  }

  function handleGenerarPropuesta() {
    if (!cotizacionId) return
    router.push(conEmpresa(`/empresa/cotizador/${cotizacionId}`))
  }

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

  // ── Precio de mercado nuevo (IA + búsqueda web) — fire-and-forget ──────────
  // No bloquea el alta del mueble: se dispara después de que ya quedó
  // guardado, y actualiza su fila cuando la búsqueda resuelve.

  async function dispararPrecioMercado(muebleId: string) {
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/muebles/${muebleId}/precio-mercado`), { method: 'POST' })
      const data = await res.json()
      setMuebles(prev => prev.map(m => m.id !== muebleId ? m : {
        ...m,
        precio_mercado_nuevo: data.ok ? data.precio_mercado_nuevo : null,
        precio_mercado_fuente_url: data.ok ? data.precio_mercado_fuente_url : null,
        precio_mercado_fuente_titulo: data.ok ? data.fuente_titulo : null,
        precio_mercado_estado: data.ok ? 'sugerido' : 'sin_resultado',
      }))
    } catch {
      setMuebles(prev => prev.map(m => m.id !== muebleId ? m : { ...m, precio_mercado_estado: 'sin_resultado' }))
    }
  }

  const [muebleEditandoPrecio, setMuebleEditandoPrecio] = useState<string | null>(null)
  const [precioEditadoInput, setPrecioEditadoInput] = useState('')
  const [guardandoPrecioMercado, setGuardandoPrecioMercado] = useState(false)

  function abrirEdicionPrecio(mueble: MuebleAgregado) {
    setMuebleEditandoPrecio(mueble.id)
    setPrecioEditadoInput(mueble.precio_mercado_nuevo ? String(mueble.precio_mercado_nuevo) : '')
  }

  async function confirmarPrecioMercado() {
    if (!muebleEditandoPrecio) return
    const precio = parseFloat(precioEditadoInput)
    if (!precio || precio <= 0) { setError('Ingresa un precio de mercado válido.'); return }
    setGuardandoPrecioMercado(true)
    const muebleId = muebleEditandoPrecio
    const res = await fetch(conEmpresa(`/api/cotizador/muebles/${muebleId}/precio-mercado`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precio_mercado_nuevo: precio }),
    })
    const data = await res.json()
    setGuardandoPrecioMercado(false)
    if (!res.ok) { setError(data.error ?? 'Error al confirmar el precio.'); return }
    setMuebles(prev => prev.map(m => m.id !== muebleId ? m : {
      ...m, precio_mercado_nuevo: data.precio_mercado_nuevo, precio_mercado_estado: 'confirmado',
    }))
    setMuebleEditandoPrecio(null)
  }

  // ── Fila de rescate: crear un ítem que la IA no detectó ─────────────────────

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

  function validarRescate(): boolean {
    if (!rescateNombre.trim()) { setError('Escribe el nombre del ítem.'); return false }
    if (!rescateCategoriaId) { setError('Elige una categoría.'); return false }
    if (!rescateCo2 || parseFloat(rescateCo2) <= 0) { setError('El impacto ambiental (CO2) no puede ser cero.'); return false }
    return true
  }

  async function confirmarRescate(guardarComoMaestro: boolean) {
    setConfirmarTipoRescate(false)
    setError(null)
    try {
      let id = cotizacionId
      if (!id && cliente) {
        const resCot = await fetch(conEmpresa('/api/cotizador/cotizaciones'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: cliente.id }) })
        const dataCot = await resCot.json()
        if (!resCot.ok) { setError(dataCot.error ?? 'Error al crear la cotización.'); return }
        id = dataCot.id as string
        setCotizacionId(id)
        window.history.replaceState(null, '', conEmpresa(`/empresa/cotizador/nueva?cotizacion_id=${id}`))
      }
      if (!id) { return }

      // El ítem SIEMPRE se crea (mueble/route.ts necesita un item_id real del
      // catálogo), pero si es "solo para esta cotización" se borra apenas se
      // guarda el snapshot — la cotización conserva su copia independiente
      // (materiales_json/servicios_json/insumos_json), el catálogo queda limpio.
      const resItem = await fetch(conEmpresa('/api/cotizador/items'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria_id: rescateCategoriaId,
          nombre: rescateNombre.trim(),
          factor_rentabilidad: 2,
          materiales: [{ nombre: 'Estimado por vendedor', peso_kg: 1, factor_co2_kg: parseFloat(rescateCo2), nivel_confianza: 'baja' }],
          servicios: rescatePrecio ? [{ nombre: 'Precio manual', precio: parseFloat(rescatePrecio) || 0 }] : [],
          insumos: [],
        }),
      })
      const dataItem = await resItem.json()
      if (!resItem.ok) { setError(dataItem.error ?? 'Error al crear el ítem.'); return }
      const itemId = dataItem.id as string

      const resMueble = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}/mueble`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          cantidad: 1,
          titulo: rescateNombre.trim(),
          diagnostico_ia_json: { item_nombre: rescateNombre.trim(), agregado_manualmente: true },
        }),
      })
      const dataMueble = await resMueble.json()
      if (!resMueble.ok) { setError(dataMueble.error ?? 'Error al guardar el ítem en la cotización.'); return }

      if (!guardarComoMaestro) {
        await fetch(conEmpresa(`/api/cotizador/items/${itemId}`), { method: 'DELETE' })
      }

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
    } catch {
      setError('Error de conexión al agregar el ítem especial.')
    }
  }

  // ── Colores tema ──────────────────────────────────────────────────────────────

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  const totalPrecioDetectado = itemsDetectados.reduce((s, it) => s + precioUnidad(it) * it.cantidad, 0)
  const totalCo2Detectado = itemsDetectados.reduce((s, it) => s + co2PorUnidad(it) * it.cantidad, 0)
  const totalAguaDetectada = itemsDetectados.reduce((s, it) => s + aguaPorUnidad(it) * it.cantidad, 0)

  const totalPrecio = muebles.reduce((s, m) => s + m.precio_mueble, 0)
  const totalCo2 = muebles.reduce((s, m) => s + m.co2_evitado_kg, 0)

  // ── Render ────────────────────────────────────────────────────────────────────

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
              <p className={`text-sm font-semibold truncate ${tp}`}>{cliente.nombre} {cliente.apellido ?? ''}</p>
              <p className={`text-xs ${ts}`}>
                {formatTelefonoVista(cliente.telefono, cliente.telefono_indicativo)}
                {(() => {
                  const emp = Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes
                  return emp ? ` · NIT ${emp.nit}` : ''
                })()}
              </p>
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

        {/* Zona de carga de foto: archivo o pegar (Cmd+V) — el modo Con IA /
            Manual se elige siempre aquí, antes o mientras se arma la tanda. */}
        {cliente && estado === 'idle' && gruposUsados < 3 && (
          <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
            <div className="flex items-center justify-center mb-4">
              <div className="inline-flex rounded-full border p-1" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setModo('ia')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
                    modo === 'ia' ? 'bg-[#00827C] text-white' : ts
                  }`}
                >
                  <Sparkles size={14} /> Con IA
                </button>
                <button
                  type="button"
                  onClick={() => setModo('manual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
                    modo === 'manual' ? 'bg-[#00827C] text-white' : ts
                  }`}
                >
                  <Pencil size={14} /> Manual
                </button>
              </div>
            </div>

            {fotos.length === 0 ? (
              <>
                <div className="w-14 h-14 rounded-full bg-[#00827C]/10 flex items-center justify-center mx-auto mb-4">
                  <Camera size={28} className="text-[#00827C]" />
                </div>
                <p className={`text-base font-semibold mb-1 ${tp}`}>
                  {muebles.length === 0 ? 'Sube las fotos del mueble' : 'Agrega otra tanda de fotos'}
                </p>
                <p className={`text-sm mb-1 ${ts}`}>
                  {modo === 'ia'
                    ? `La IA detecta todos los muebles que veas, hasta ${MAX_FOTOS_POR_TANDA} fotos a la vez`
                    : `Elige tú la categoría y llena todo a mano, hasta ${MAX_FOTOS_POR_TANDA} fotos a la vez`}
                </p>
                <p className={`text-xs mb-4 flex items-center justify-center gap-1 text-center ${ts}`}>
                  <Clipboard size={13} className="flex-shrink-0" /> También puedes pegar imágenes copiadas, una o varias veces: Cmd+V en Mac, Ctrl+V en PC, o mantén presionado y elige Pegar en iOS
                </p>
              </>
            ) : (
              <div className="flex gap-2 overflow-x-auto mb-4">
                {fotos.map((f, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={f.preview} alt="" className="h-24 rounded-[10px] object-cover bg-[var(--bg-input)]" />
                    <button
                      type="button"
                      onClick={() => quitarFotoCola(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#474747] text-white flex items-center justify-center hover-pop hover-press"
                      title="Quitar esta foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => inputFotoRef.current?.click()} variant={fotos.length > 0 ? 'secondary' : 'primary'}>
                {fotos.length > 0 ? 'Agregar otra foto' : 'Elegir fotos'}
              </Button>
              {fotos.length > 0 && (
                <Button
                  onClick={modo === 'ia' ? analizarConIA : continuarManual}
                  icon={modo === 'ia' ? <Sparkles size={16} /> : <Pencil size={16} />}
                >
                  {modo === 'ia'
                    ? `Analizar ${fotos.length} foto${fotos.length > 1 ? 's' : ''} con IA`
                    : `Continuar manual con ${fotos.length} foto${fotos.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>

            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFotoSeleccionada}
            />
            {error && (
              <p className="mt-3 text-sm text-[#FF5E4B] flex items-center justify-center gap-1">
                <WarningCircle size={16} /> {error}
              </p>
            )}
          </div>
        )}

        {/* Tope de 3 grupos alcanzado */}
        {cliente && estado === 'idle' && gruposUsados >= 3 && (
          <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
            <p className={`text-sm mb-3 ${ts}`}>Ya agregaste 3 ítems a esta cotización. Para agregar más, edítala después de guardarla.</p>
            {cotizacionId && (
              <Button variant="secondary" onClick={() => router.push(conEmpresa(`/empresa/cotizador/${cotizacionId}`))}>
                Ir a la cotización
              </Button>
            )}
          </div>
        )}

        {/* Analizando */}
        {estado === 'analizando' && (
          <div className={`rounded-[12px] border p-6 ${cardBg}`}>
            {fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto mb-4">
                {fotos.map((f, i) => (
                  <img key={i} src={f.preview} alt="Vista previa" className="h-32 flex-shrink-0 rounded-[8px] object-cover bg-[var(--bg-input)]" />
                ))}
              </div>
            )}
            <div className="space-y-3">
              <div className={`h-5 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
              <div className={`h-4 rounded-full w-3/4 animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
              <div className={`h-4 rounded-full w-1/2 animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
            </div>
            <p className={`text-sm text-center mt-4 ${ts}`}>{mensajesAnalizando(fotos.length)[analizandoMsgIndex]}</p>
          </div>
        )}

        {/* Resultado multi-ítem */}
        {(estado === 'resultado' || estado === 'guardando') && (
          <div className="space-y-4">
            {fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {fotos.map((f, i) => (
                  <img key={i} src={f.preview} alt="" className="h-24 flex-shrink-0 rounded-[10px] object-cover bg-[var(--bg-input)]" />
                ))}
              </div>
            )}

            {observaciones && (
              <p className={`text-xs italic ${ts}`}>&ldquo;{observaciones}&rdquo;</p>
            )}

            {itemsDetectados.length === 0 && noIdentificados.length === 0 && sinMatch.length === 0 && (
              <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
                <XCircle size={24} className="text-[#FF5E4B] mx-auto mb-2" />
                <p className={`text-sm ${ts}`}>No se detectó ningún mueble en {fotos.length > 1 ? 'las fotos' : 'la foto'}. Intenta con otra imagen.</p>
              </div>
            )}

            {itemsDetectados.map((item, i) => (
              <GrupoItemCard
                key={item._uiKey ?? i}
                item={item}
                catalogo={catalogo}
                conEmpresa={conEmpresa}
                fotosGrupo={fotos}
                onElegir={modo === 'ia' && itemsDetectados.length > 1 ? () => elegirCandidato(i) : undefined}
                onChange={(nuevo) => actualizarItem(i, nuevo)}
                onQuitar={() => quitarDetectado(i)}
                onDuplicar={() => duplicarDetectado(i)}
              />
            ))}

            {/* Fila de rescate: crear un ítem nuevo que todavía no existe en
                el catálogo (independiente del modo Con IA / Manual) */}
            <button
              type="button"
              onClick={abrirRescate}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border-2 border-dashed text-sm font-semibold transition-colors hover-pop ${ts}`}
              style={{ borderColor: 'var(--border)' }}
            >
              <Plus size={16} /> Agregar ítem que no existe en el catálogo
            </button>

            {/* No reconocidos: piezas SIN_MATCH con foto propia (bounding box)
                primero, luego el texto plano sin foto — ambos con "Buscar en
                catálogo" para vincularlas a un ítem real en vez de crear uno
                nuevo a ciegas. */}
            {(sinMatch.length > 0 || noIdentificados.length > 0) && (
              <div className={`rounded-[12px] border p-4 ${isDark ? 'bg-[#F6BF3E]/10 border-[#F6BF3E]/25' : 'bg-[#F6BF3E]/08 border-[#F6BF3E]/20'}`}>
                <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-[#F6BF3E]' : 'text-[#8a6d1f]'}`}>No reconocidos en el catálogo</p>
                <div className="flex flex-col gap-3">
                  {sinMatch.map((d, i) => (
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
                        onClick={() => buscarEnCatalogoDesdeSinMatch(i)}
                        className="text-xs font-semibold text-[#00827C] hover-pop hover-press flex-shrink-0 px-2 py-1"
                      >
                        Buscar en catálogo
                      </button>
                    </div>
                  ))}
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

            {itemsDetectados.length > 0 && (
              <div className={`rounded-[12px] border p-4 ${cardBg}`}>
                <div className={`flex items-center justify-between ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                  <span className={`text-sm font-bold ${tp}`}>Total de esta foto</span>
                  <span className="text-lg font-bold text-[#00827C]">{formatCOP(totalPrecioDetectado)}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Leaf size={14} className="text-[#38B98E]" />
                  <span className={`text-xs ${ts}`}>{formatNumero(totalCo2Detectado, { unidad: 'kg CO2 eq evitado' })}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Drop size={14} className="text-[#59A6E4]" />
                  <span className={`text-xs ${ts}`}>Total agua evitada: {formatNumero(totalAguaDetectada, { unidad: 'L' })}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-[#FF5E4B] flex items-center gap-1">
                <WarningCircle size={16} /> {error}
              </p>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* Barra de acciones sticky — mismo patrón que /admin/categorias: degradado de
          desvanecido, nunca línea divisoria dura ni position:fixed.
          "Genera la propuesta" debe seguir visible aunque el usuario vuelva al
          estado idle (para subir otra foto) — antes solo aparecía junto con
          "Agregar a la cotización", así que en cuanto se guardaba el primer
          ítem y la pantalla volvía a "Sube otra foto", el botón desaparecía
          por completo y no había forma de terminar la cotización. */}
      {(estado === 'resultado' || estado === 'guardando' || cotizacionId || muebles.length > 0) && (
        <div className="sticky bottom-0 z-30 w-full bg-[var(--bg-primary)] py-3 border-t border-[var(--border)] mt-3">
          <div aria-hidden="true" className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
          <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row gap-3 px-4 sm:px-6 lg:px-8">
            {(estado === 'resultado' || estado === 'guardando') && (
              <Button
                onClick={handleConfirmarTodos}
                disabled={itemsDetectados.length === 0}
                loading={estado === 'guardando'}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                {estado === 'guardando' ? 'Guardando...' : 'Agregar a la cotización'}
              </Button>
            )}
            {estado === 'idle' && gruposUsados < 3 && (
              <Button
                variant="secondary"
                onClick={iniciarNuevoGrupo}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Agregar otro grupo de fotos
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

      {/* Formulario de rescate: ítem que la IA no detectó */}
      <Modal
        abierto={mostrarRescate && !confirmarTipoRescate}
        onClose={() => setMostrarRescate(false)}
        titulo="Agregar ítem"
        descripcion="Descríbelo tal como lo verías en el catálogo. El impacto ambiental es tu mejor estimado, el super_admin lo revisa después."
        textoConfirmar="Continuar"
        onConfirmar={() => { if (validarRescate()) setConfirmarTipoRescate(true) }}
        onCancelar={() => setMostrarRescate(false)}
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
