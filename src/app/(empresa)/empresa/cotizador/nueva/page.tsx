/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { XCircle, Leaf, Droplet as Drop, Plus, ArrowRight, AlertCircle as WarningCircle, Loader2, ExternalLink, CheckCircle, Pencil, RefreshCw } from '@/components/ui/icons'
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
import { SkeletonCard } from '@/components/ui/skeleton'
import { TarjetaGrupoFotos, type GrupoPendiente, type FotoCola } from './components/tarjeta-grupo-fotos'

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

// Cada ítem admite hasta 4 fotos, y una cotización nueva admite hasta 4
// ítems apilados en cascada — se arman todos primero (sin analizar nada) y
// se procesan en orden, uno a la vez, recién al confirmar "Genera la
// propuesta" (ver procesarIndiceCola/generarPropuesta más abajo).
const MAX_FOTOS_POR_TANDA = 4
const MAX_ITEMS_POR_COTIZACION = 4

function nuevoGrupoVacio(modo: ModoAnalisis = 'ia'): GrupoPendiente {
  return { id: crypto.randomUUID(), fotos: [], modo }
}

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
    const hayFotosSinProcesar = gruposPendientes.some(g => g.fotos.length > 0)
    const hayProgresoNoGuardado = hayFotosSinProcesar || itemsDetectados.length > 0 || (!cotizacionIdParam && cliente !== null && muebles.length === 0)
    if (!hayProgresoNoGuardado) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gruposPendientes, itemsDetectados.length, cliente, cotizacionIdParam, muebles.length])

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
          es_contacto_real: c.es_contacto_real ?? false,
          duplicado_de_id: c.duplicado_de_id ?? null,
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

  // Rotar el mensaje de "Analizando..." mientras dura la llamada a la IA —
  // ver mensajesAnalizando() arriba.
  useEffect(() => {
    if (estado !== 'analizando') { setAnalizandoMsgIndex(0); return }
    const nFotos = procesandoIdx !== null ? (colaProcesar[procesandoIdx]?.fotos.length ?? 1) : 1
    const totalMensajes = mensajesAnalizando(nFotos).length
    const interval = setInterval(() => {
      setAnalizandoMsgIndex(i => (i + 1) % totalMensajes)
    }, 2800)
    return () => clearInterval(interval)
  }, [estado, procesandoIdx, colaProcesar])

  // ── Con IA: una sola llamada a la IA para toda la tanda acumulada, cada
  // ítem detectado ya trae su recuadro para poder recortar su propia
  // miniatura. ──

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
      if (sinMatchConImagen.length > 0) setPreguntaItemAparte(sinMatchConImagen[0])
      return true
    } catch {
      setError('No se pudo analizar la imagen. Verifica tu conexión.')
      return false
    }
  }

  // ── Manual: salta la IA por completo — una tarjeta en blanco por foto,
  // el vendedor elige categoría y llena todo desde GrupoItemCard. ──

  function continuarGrupoManual(grupo: GrupoPendiente) {
    const item = construirItemStub({
      imagenIndex: 0, imagenPreview: grupo.fotos[0].preview, imagenBase64: grupo.fotos[0].base64,
    })
    setItemsDetectados([item])
    setNoIdentificados([])
    setSinMatch([])
    setObservaciones('')
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
      // Si falla, no se muestra error acá — guardarItemsDetectadosEnCotizacion
      // ya trae su propio intento de creación como respaldo (`if (!id) { ... }`),
      // el vendedor puede seguir subiendo fotos sin interrupción.
    } catch {
      // Mismo criterio: falla silenciosa, hay un respaldo más adelante.
    }
  }

  // ── Confirmar: agrega todos los ítems detectados a la cotización ───────────

  // Guarda TODOS los itemsDetectados vigentes (el resultado del grupo que
  // se está procesando ahora mismo) en la cotización — se llama automático
  // apenas la tarjeta de un ítem queda armada, sin esperar un clic aparte
  // del vendedor. Devuelve false si algo falló, para que el orquestador
  // detenga la cola en vez de seguir con el siguiente ítem.
  async function guardarItemsDetectadosEnCotizacion(): Promise<boolean> {
    if (itemsDetectados.length === 0 || !cliente) return false
    if (itemsDetectados.some(it => !it.item_id)) {
      setError('Elige la categoría del catálogo para cada ítem antes de continuar.')
      return false
    }
    setError(null)
    // Protege contra doble clic mientras guarda — sin esto, dos clics
    // seguidos en "Guardar y seguir" disparan dos POST en paralelo y
    // duplican el mueble en la cotización.
    setEstado('guardando')

    try {
      let id = cotizacionId
      if (!id) {
        const resCot = await fetch(conEmpresa('/api/cotizador/cotizaciones'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: cliente.id }) })
        const dataCot = await resCot.json()
        if (!resCot.ok) { setError(dataCot.error ?? 'Error al crear la cotización.'); setEstado('resultado'); return false }
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
        if (!resMueble.ok) { setError(dataMueble.error ?? `Error al guardar "${item.item_nombre}".`); setEstado('resultado'); return false }

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
      setEstado('resultado')
      return false
    }
  }

  // Procesa UN índice de la cola: analiza (o arma manual), y si hay una
  // pieza sin_match pendiente de resolver, se detiene ahí — la pregunta al
  // vendedor es la que decide si sigue o no. Si no hay pregunta pendiente,
  // el vendedor guarda con el botón de la barra inferior y eso avanza sola
  // al siguiente vía confirmarYAvanzar.
  async function procesarIndiceCola(idx: number, cola: GrupoPendiente[]) {
    const grupo = cola[idx]
    if (!grupo) { setProcesandoIdx(null); return }

    setProcesandoIdx(idx)
    setEstado('analizando')
    // Limpia el resultado del ítem anterior ANTES de procesar este — sin
    // esto, si el análisis falla, la pantalla se queda mostrando (y
    // permitiendo volver a guardar) el ítem anterior, que ya se guardó.
    setItemsDetectados([])
    setNoIdentificados([])
    setSinMatch([])
    setObservaciones('')

    await (grupo.modo === 'ia' ? analizarGrupoConIA(grupo) : Promise.resolve(continuarGrupoManual(grupo)))
    setEstado('resultado')
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
    const restante = sinMatch.filter(d => d !== preguntaItemAparte)
    setSinMatch(restante)
    // Si el mismo grupo trajo más de una pieza sin_match, se pregunta por
    // la siguiente recién ahora — una decisión a la vez, nunca todas juntas.
    setPreguntaItemAparte(restante.length > 0 ? restante[0] : null)
  }

  // El vendedor dice que NO es un ítem aparte: se descarta, sigue siendo
  // solo contexto de las fotos del ítem actual.
  function descartarPiezaComoItemAparte() {
    if (!preguntaItemAparte) return
    const restante = sinMatch.filter(d => d !== preguntaItemAparte)
    setSinMatch(restante)
    setPreguntaItemAparte(restante.length > 0 ? restante[0] : null)
  }

  // Botón fijo "+ Agregar otro ítem" de la barra inferior — SUMA una
  // tarjeta nueva en blanco debajo de las que ya existen, nunca las
  // reemplaza. Solo tiene sentido mientras se está armando (procesandoIdx
  // === null); una vez arrancó "Genera la propuesta" este botón se oculta.
  function agregarGrupoNuevo() {
    setError(null)
    setGruposPendientes(prev => prev.length >= MAX_ITEMS_POR_COTIZACION ? prev : [...prev, nuevoGrupoVacio()])
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
              {(() => {
                const emp = Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes
                // Sin celular es la fila-ancla (la empresa misma, sin contacto
                // real elegido) — se muestra el nombre comercial (con la razón
                // social entre paréntesis si existe) y el NIT en su propia
                // línea, nunca el nombre/teléfono vacíos de un contacto.
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

        {/* Cascada de tarjetas de staging — una por ítem que se está
            armando, ninguna analiza nada por sí sola. Solo se muestran
            mientras no está corriendo la cola (procesandoIdx === null).
            El espacio ENTRE tarjetas va con space-y-4 en el contenedor —
            pero el contenedor en sí NO lleva mb-4 propio, mismo criterio
            que los bloques "Analizando" y "Resultado" de más abajo: el
            hueco de 16px antes de la barra sticky ya está resuelto por su
            propio cálculo (-mt-5, ver comentario ahí) sin ayuda de ningún
            margen del contenido. Agregarle mb-4 aquí sumaba un segundo
            hueco de 16px encima del ya calculado, duplicándolo (bug real
            reportado 2026-08-24, corregido dos veces: primero se bajó de
            "un mb-4 por tarjeta" a "uno solo en el contenedor", pero seguía
            sobrando ese único mb-4 también). */}
        {cliente && procesandoIdx === null && (
          <div className="space-y-4">
            {gruposPendientes.map((grupo, i) => (
              <TarjetaGrupoFotos
                key={grupo.id}
                grupo={grupo}
                numero={i + 1}
                esPrimero={i === 0}
                maxFotos={MAX_FOTOS_POR_TANDA}
                error={i === gruposPendientes.length - 1 ? error : null}
                onCambiarModo={(modo) => setGruposPendientes(prev => prev.map(g => g.id === grupo.id ? { ...g, modo } : g))}
                onAgregarFotos={(files) => agregarFotosAGrupo(grupo.id, files)}
                onQuitarFoto={(idx) => quitarFotoDeGrupo(grupo.id, idx)}
                onQuitarGrupo={(gruposPendientes.length > 1 || grupo.fotos.length > 0) ? () => quitarGrupo(grupo.id) : undefined}
              />
            ))}
            {gruposPendientes.length >= MAX_ITEMS_POR_COTIZACION && (
              <p className={`text-xs text-center ${ts}`}>Ya armaste el máximo de {MAX_ITEMS_POR_COTIZACION} ítems para esta cotización.</p>
            )}
          </div>
        )}

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

        {/* Resultado multi-ítem */}
        {(estado === 'resultado' || estado === 'guardando') && (
          <div className="space-y-4">
            {procesandoIdx !== null && colaProcesar[procesandoIdx]?.fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {colaProcesar[procesandoIdx].fotos.map((f, i) => (
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
                <p className={`text-sm ${ts}`}>No se detectó ningún mueble en {(procesandoIdx !== null ? colaProcesar[procesandoIdx]?.fotos.length ?? 0 : 0) > 1 ? 'las fotos' : 'la foto'}. Intenta con otra imagen.</p>
              </div>
            )}

            {itemsDetectados.map((item, i) => (
              <GrupoItemCard
                key={item._uiKey ?? i}
                item={item}
                catalogo={catalogo}
                conEmpresa={conEmpresa}
                fotosGrupo={procesandoIdx !== null ? colaProcesar[procesandoIdx]?.fotos : undefined}
                onElegir={procesandoIdx !== null && colaProcesar[procesandoIdx]?.modo === 'ia' && itemsDetectados.length > 1 ? () => elegirCandidato(i) : undefined}
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
      {(gruposPendientes.some(g => g.fotos.length > 0) || procesandoIdx !== null || cotizacionId || muebles.length > 0) && (
        // El espacio real hasta este botón no es solo el margin: el wrapper
        // de arriba cierra con py-6 (24px de padding inferior) Y este div
        // tiene su propio py-3 (12px de padding superior) antes de la fila
        // de botones. Sin descontar ambos, el hueco visual duplica el
        // espacio de 16px (mb-4) que hay entre el cliente y las fotos.
        // Cuenta exacta: 24px (padding wrapper) + 12px (py-3 de este div)
        // + margen = 16px objetivo → margen = -20px → -mt-5.
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
            {/* El análisis de este ítem falló (itemsDetectados quedó vacío
                al limpiar en procesarIndiceCola) — nada que guardar, se
                reintenta el mismo índice en vez de avanzar y perder sus
                fotos. */}
            {procesandoIdx !== null && estado === 'resultado' && !preguntaItemAparte && itemsDetectados.length === 0 && (
              <Button
                variant="secondary"
                onClick={() => procesarIndiceCola(procesandoIdx, colaProcesar)}
                icon={<RefreshCw size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                Reintentar
              </Button>
            )}
            {procesandoIdx !== null && estado === 'resultado' && !preguntaItemAparte && itemsDetectados.length > 0 && (
              <Button
                onClick={confirmarYAvanzar}
                icon={<Plus size={16} strokeWidth={2.5} />}
                className="flex-1 w-full"
              >
                {procesandoIdx + 1 < colaProcesar.length ? 'Guardar y seguir con el siguiente' : 'Guardar y terminar'}
              </Button>
            )}
            {procesandoIdx !== null && estado === 'guardando' && (
              <Button loading disabled icon={<Plus size={16} strokeWidth={2.5} />} className="flex-1 w-full">
                Guardando...
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
