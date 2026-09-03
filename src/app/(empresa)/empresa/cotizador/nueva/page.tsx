/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Leaf, Plus, ArrowRight, AlertCircle as WarningCircle, Loader2, ExternalLink, CheckCircle, Pencil, RefreshCw } from '@/components/ui/icons'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'
import { formatCOP, formatNumero } from '@/lib/format'
import { IdentificacionCliente, type ClienteIdentificado } from './components/identificacion-cliente'
import { formatTelefonoVista } from '@/lib/telefono'
import { GrupoItemCard, type ItemConImagen } from './components/grupo-item-card'
import { ImagenAmpliable } from '@/components/ui/imagen-ampliable'
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

// Cada ítem admite hasta 4 fotos. Ya no hay tope de ítems por cotización —
// se agregan uno a la vez, tantos como el vendedor necesite (decisión
// explícita del usuario, ver spec 2026-08-25-cotizador-agregar-items-
// automatico-design.md): cada ítem se analiza y se guarda automático apenas
// está listo, sin armar varios de antemano.
const MAX_FOTOS_POR_TANDA = 4

function nuevoGrupoVacio(modo: ModoAnalisis = 'ia'): GrupoPendiente {
  return { id: crypto.randomUUID(), fotos: [], modo }
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
  const [error, setError] = useState<string | null>(null)
  const [analizandoMsgIndex, setAnalizandoMsgIndex] = useState(0)

  // Cliente identificado — obligatorio antes de subir cualquier foto (ver Fase 2)
  const [cliente, setCliente] = useState<ClienteIdentificado | null>(null)

  // Modo "agregar más ítems": ?cotizacion_id=X llega desde el botón del
  // detalle de una cotización ya creada — se salta la identificación del
  // cliente (ya está fijado) y se sigue guardando en la MISMA cotización.
  const [cargandoExistente, setCargandoExistente] = useState(!!cotizacionIdParam)

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

  // Fila de rescate: "Agregar ítem" que la IA no detectó
  const [mostrarRescate, setMostrarRescate] = useState(false)
  const [rescateNombre, setRescateNombre] = useState('')
  const [rescatePrecio, setRescatePrecio] = useState('')
  const [rescateCo2, setRescateCo2] = useState('')
  const [rescateCategoriaId, setRescateCategoriaId] = useState('')
  const [categoriasHoja, setCategoriasHoja] = useState<{ id: string; nombre: string }[]>([])
  const [confirmarTipoRescate, setConfirmarTipoRescate] = useState(false)
  // Cuando el rescate se abre desde una tarjeta de itemsPendientes (en vez
  // del botón general), guarda cuál para poder quitarla apenas el rescate
  // termine con éxito — su propio stub ya no hace falta, el rescate crea su
  // propio mueble directo.
  const [rescateDesdeUiKey, setRescateDesdeUiKey] = useState<string | undefined>(undefined)

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
    const hayProgresoNoGuardado = grupoActivo.fotos.length > 0 || itemsPendientes.length > 0 || (!cotizacionIdParam && cliente !== null && muebles.length === 0)
    if (!hayProgresoNoGuardado) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [grupoActivo.fotos.length, itemsPendientes.length, cliente, cotizacionIdParam, muebles.length])

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

  // ── Acumular fotos en una cola (compartido entre selector de archivo y
  // pegado Cmd+V) — NO dispara ningún análisis todavía. Varios Cmd+V
  // seguidos van sumando a la misma tanda hasta que el vendedor decide
  // analizar (Con IA) o continuar (Manual). ──

  const agregarFotosAlActivo = useCallback(async (files: File[]) => {
    const disponibles = MAX_FOTOS_POR_TANDA - grupoActivo.fotos.length
    if (disponibles <= 0) {
      setError(`Ese ítem ya tiene el máximo de ${MAX_FOTOS_POR_TANDA} fotos.`)
      return
    }
    // Tope de tamaño antes de comprimir (Paso D, adm/qa cot-04) — mismo
    // criterio que el formulario de DPP, que valida 5 MB antes de subir.
    // Aquí el tope es 10 MB porque las fotos de mueble suelen incluir varios
    // ángulos y detalles, y el navegador igual comprime a WebP después.
    const dentroDeLimite = files.filter(f => f.size <= 10 * 1024 * 1024)
    if (dentroDeLimite.length < files.length) {
      setError('La imagen no puede superar 10 MB.')
    }
    const aProcesar = dentroDeLimite.slice(0, disponibles)
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

  // Rotar el mensaje de "Analizando..." mientras dura la llamada a la IA —
  // ver mensajesAnalizando() arriba.
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
      // Si venía de una tarjeta de itemsPendientes, esa tarjeta ya cumplió
      // su propósito (guía de título/descripción) — el rescate creó su
      // propio mueble, así que se quita para no dejar un duplicado fantasma.
      if (rescateDesdeUiKey) quitarItemPendiente(rescateDesdeUiKey)
      setRescateDesdeUiKey(undefined)
      setMostrarRescate(false)
    } catch {
      setError('Error de conexión al agregar el ítem especial.')
    }
  }

  // ── Colores tema ──────────────────────────────────────────────────────────────

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

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
                  {formatNumero(muebles.length)} ítem{muebles.length === 1 ? '' : 's'} agregado{muebles.length === 1 ? '' : 's'}
                </p>
                <div className="space-y-2">
                  {muebles.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {m.imagen_preview && (
                        <ImagenAmpliable src={m.imagen_preview} alt={m.titulo} wrapperClassName="w-10 h-10 rounded-[8px] flex-shrink-0" />
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
                        <ImagenAmpliable src={pieza.imagenPreview} alt="Pieza sin identificar" wrapperClassName="w-16 h-16 rounded-[8px] flex-shrink-0" />
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
