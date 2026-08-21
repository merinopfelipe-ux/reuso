'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Pencil, Trophy, Clock, Sofa, Target, Plus, Trash, ArrowUp, ArrowDown, GripVertical, Eye, EyeOff, MapPinHouse, Question, Funnel, ChartLine, Receipt, Handshake } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatCOP, formatEnteroMillones } from '@/lib/format'

// Meta y Ticket promedio nunca muestran decimales, a diferencia del resto
// de la plataforma (formatCOP sí redondea a 1 decimal) — directriz
// explícita del usuario solo para estas 2 cards, siempre redondeando hacia
// arriba (Math.ceil), nunca hacia el más cercano.
function formatCOPEntero(val: number): string {
  return `$ ${formatEnteroMillones(Math.ceil(val))}`
}
import { Skeleton } from '@/components/ui/skeleton'

import { DateRangePicker } from './date-range-picker'
import { B2BChartCard } from './b2b-chart-card'
import { CityChartCard } from './city-chart-card'
import { capitalizarNombre } from '@/lib/cotizador/capitalizar-nombre'
import { agregarPorCiudad, colorPorPosicionCiudad } from '@/lib/cotizador/ciudades'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface CotizacionResumen {
  estado: string
  total: number
  iva_activo: boolean
  iva_porcentaje: number
  total_muebles: number
  created_at: string | null
  fecha_enviada: string | null
  fecha_apertura_cliente: string | null
  veces_abierta: number
  crm_clientes?: {
    tipo?: string | null
    ciudad?: string | null
    crm_empresas_clientes?: { razon_social: string; nombre_comercial: string | null } | null
  } | null
}

// El IVA es plata que pasa por la empresa hacia la DIAN, nunca ingreso real
// de la venta — la meta se compara siempre contra el valor sin IVA. total =
// base_iva × (1 + iva_porcentaje/100) cuando iva_activo (fórmula real del
// motor de precios, ver sql/044_cotizador_transporte_iva.sql), así que
// dividir deshace el IVA sin necesitar subtotal/transporte/descuento aparte.
function totalSinIva(c: CotizacionResumen): number {
  const total = Number(c.total)
  if (!c.iva_activo || !c.iva_porcentaje) return total
  return total / (1 + Number(c.iva_porcentaje) / 100)
}

// Estados reales de crm_cotizaciones (única fuente de verdad, ver
// src/lib/cotizador/estados.ts) — el embudo personaliza solo nombre, color y
// orden visual, nunca inventa un estado nuevo que la base no tiene.
// "por_cotizar" (borrador, ni siquiera enviado al cliente) queda fuera a
// propósito — no existe para este dashboard, ver cotizacionesReales arriba.
const ESTADOS_REALES = [
  { key: 'enviada', label: 'Enviada' },
  { key: 'en_negociacion', label: 'En negociación' },
  { key: 'esperando_anticipo', label: 'Esperando anticipo' },
  { key: 'cerrado_ganado', label: 'Cerrado ganado' },
  { key: 'cerrado_perdido', label: 'Cerrado perdido' },
  { key: 'cerrado_inviable', label: 'Inviable' },
] as const

interface Etapa {
  // Siempre uno de los 6 estados reales, en orden fijo — no se "vincula"
  // nada por separado ni se agregan etapas sueltas: la lista completa de
  // estados posibles ES el ámbito del embudo. Solo se personaliza cómo se
  // ve cada uno (nombre, color) y si se muestra.
  estado_key: typeof ESTADOS_REALES[number]['key']
  nombre: string
  color: string
  visible: boolean
}

const COLOR_POR_ESTADO: Record<string, string> = {
  enviada: '#59A6E4',
  en_negociacion: '#F6BF3E',
  esperando_anticipo: '#8AD0B2',
  cerrado_ganado: '#00827C',
  cerrado_perdido: '#FF5E4B',
  cerrado_inviable: '#474747',
}

// Por defecto solo se muestran los 3 pasos activos de venta — Cerrado
// perdido e Inviable existen pero arrancan ocultos (el vendedor los puede
// prender desde el editor si los quiere ver en el embudo).
const ETAPAS_DEFAULT: Etapa[] = ESTADOS_REALES.map(es => ({
  estado_key: es.key,
  nombre: es.label,
  color: COLOR_POR_ESTADO[es.key],
  visible: ['enviada', 'en_negociacion', 'esperando_anticipo', 'cerrado_ganado'].includes(es.key),
}))

export function SalesDashboard({
  cotizaciones,
  empresaId,
  isDark,
  nuevaCotizacionDisabled,
  tabEstado,
  onNuevaCotizacion,
  onFiltrarEtapa
}: {
  cotizaciones: CotizacionResumen[]
  empresaId: string | null
  isDark: boolean
  nuevaCotizacionDisabled: boolean
  tabEstado?: string
  onNuevaCotizacion: () => void
  onFiltrarEtapa?: (estadoKey: string) => void
}) {
  // Entrada animada de todo el panel (embudo, meta, KPIs) al montar — no
  // espera a la config real de meta/embudo: esperarla hacía que TODA la zona
  // quedara invisible mientras esa petición cargaba, sumándose al tiempo de
  // cotizaciones (bug real reportado: "se demora mucho en cargar"). Los KPIs
  // no dependen de esa config, así que no hay razón para retenerlos. El
  // embudo y la meta sí muestran su propio esqueleto mientras "configListo"
  // es falso (ver más abajo), así nunca se ve el flash de datos por defecto.
  const [configListo, setConfigListo] = useState(false)
  const [entradaAnimada, setEntradaAnimada] = useState(false)


  // Las barras del embudo solo existen en el DOM desde que "configListo" es
  // verdadero (antes se ve su esqueleto) — si usaran el mismo "entradaAnimada"
  // de arriba, ya estaría en true cuando recién montan y la transición de
  // ancho/opacidad nunca se alcanza a ver (bug real reportado: "se perdió la
  // animación"). Necesitan su propio disparo, justo cuando de verdad aparecen.
  const [etapasAnimadas, setEtapasAnimadas] = useState(false)
  useEffect(() => {
    if (!configListo) return
    const id = requestAnimationFrame(() => setEtapasAnimadas(true))
    return () => cancelAnimationFrame(id)
  }, [configListo])

  // Recorrido del arco de la meta: arranca en 0% y viaja hasta el % real,
  // por JavaScript cuadro a cuadro (no transición CSS de cx/cy) — animar
  // cx/cy con CSS mueve el punto en línea recta entre los dos puntos, no
  // sobre la curva del arco (bug real reportado: "no va por el círculo, se
  // ve fatal"). Calculando el ángulo en cada cuadro, el punto sí recorre la
  // curva. El arco (strokeDashoffset) usa el mismo % animado, así los dos
  // quedan siempre sincronizados.
  const [metaPctAnimado, setMetaPctAnimado] = useState(0)
  const metaPctAnimadoRef = useRef(0)
  const metaAnimRef = useRef<number | null>(null)

  const animarHacia = useCallback((targetPct: number, duracionMs = 700) => {
    if (metaAnimRef.current) cancelAnimationFrame(metaAnimRef.current)
    const inicioVal = metaPctAnimadoRef.current
    const inicio = performance.now()
    function tick(ahora: number) {
      const t = Math.min(1, (ahora - inicio) / duracionMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const val = inicioVal + (targetPct - inicioVal) * eased
      metaPctAnimadoRef.current = val
      setMetaPctAnimado(val)
      if (t < 1) {
        metaAnimRef.current = requestAnimationFrame(tick)
      }
    }
    metaAnimRef.current = requestAnimationFrame(tick)
  }, [])


  useEffect(() => {
    const id = requestAnimationFrame(() => setEntradaAnimada(true))
    return () => cancelAnimationFrame(id)
  }, [])
  // Filtro de fechas (por defecto este mes, del 1 hasta hoy) — confirmado
  // explícitamente por el usuario, no un rango rodante de 30 días.
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0])

  // Modales
  const [modalMetaAbierto, setModalMetaAbierto] = useState(false)
  const [modalEtapasAbierto, setModalEtapasAbierto] = useState(false)
  const [modalCiudadesAbierto, setModalCiudadesAbierto] = useState(false)

  // Los 4 KPIs de esta sección son fijos (Tiempo de apertura, Muebles
  // cotizados, Top Ciudades, Tipo de cliente) — Tasa de cierre y Ticket
  // promedio se consolidaron dentro de las cards de Embudo y Meta
  // respectivamente (decisión explícita del usuario, ver esas cards más
  // abajo), así que ya no queda nada que "elegir" entre 6 opciones para 4
  // cupos: los 4 restantes son exactamente los 4 que se muestran siempre.
  // Por eso se retiró el selector "Configurar KPIs visibles" que existía
  // antes — habría quedado como un picker de 4 de 4, sin ninguna elección
  // real que ofrecer.

  // Ciudades
  const DEFAULT_CIUDADES_AGRUPADAS = { "Medellín": [], "Bogotá": [] }
  const [ciudadesAgrupadas, setCiudadesAgrupadas] = useState<Record<string, string[]>>(DEFAULT_CIUDADES_AGRUPADAS)
  const [ciudadesAgruparActivo, setCiudadesAgruparActivo] = useState(false)

  // Metas — mensual y anual se guardan por separado (no uno derivado del
  // otro en cada tecla) para que no arrastren error de redondeo: convertir
  // ida y vuelta en cada dígito (valor/12 y luego ×12) desalineaba el número
  // que el usuario acababa de escribir, bug real reportado ("es muy raro").
  const [metaTipo, setMetaTipo] = useState<'mensual' | 'anual'>('mensual')
  const [metaValorMensual, setMetaValorMensual] = useState(0)
  const [metaValorAnual, setMetaValorAnual] = useState(0)
  const [metaVigencia, setMetaVigencia] = useState(new Date().getFullYear())

  // Etapas
  const [etapas, setEtapas] = useState<Etapa[]>(ETAPAS_DEFAULT)

  // Carga y guardado (API)
  const [guardandoMeta, setGuardandoMeta] = useState(false)
  const [guardandoEtapas, setGuardandoEtapas] = useState(false)
  const [errorMeta, setErrorMeta] = useState<string | null>(null)
  const [errorEtapas, setErrorEtapas] = useState<string | null>(null)

  useEffect(() => {
    let url = '/api/cotizador/dashboard-config'
    if (empresaId) url += `?empresa_id=${empresaId}`
    fetch(url)
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        if (!d) return
        if (d.meta) {
          setMetaTipo(d.meta.tipo)
          if (d.meta.tipo === 'mensual') {
            setMetaValorMensual(d.meta.valor)
            setMetaValorAnual(d.meta.valor * 12)
          } else {
            setMetaValorAnual(d.meta.valor)
            setMetaValorMensual(Math.round(d.meta.valor / 12))
          }
          setMetaVigencia(d.meta.vigencia_anio)
        }
        // Se acepta entre 1 y los 6 estados reales (el usuario puede quitar
        // etapas por completo, no solo ocultarlas) — si viene de una versión
        // vieja del embudo con un estado_key que ya no es válido, se ignora
        // y se usa el default en vez de arriesgarlo.
        const clavesValidas = new Set(ESTADOS_REALES.map(es => es.key))
        if (
          d.embudo && Array.isArray(d.embudo) && d.embudo.length > 0 && d.embudo.length <= ESTADOS_REALES.length &&
          d.embudo.every((e: Etapa) => clavesValidas.has(e.estado_key))
        ) {
          setEtapas(d.embudo)
        }
        if (d.ciudades_agrupadas) {
          const conf = d.ciudades_agrupadas
          const cleaned: Record<string, string[]> = {}
          for (const key in conf) {
            cleaned[capitalizarNombre(key)] = conf[key]
          }
          setCiudadesAgrupadas(cleaned)
        }
        setCiudadesAgruparActivo(!!d.ciudades_agrupar_activo)
      })
      .catch(e => console.error('Error cargando config del dashboard:', e))
      .finally(() => setConfigListo(true))
  }, [empresaId])

  const guardarMeta = async () => {
    setGuardandoMeta(true)
    setErrorMeta(null)
    try {
      let url = '/api/cotizador/dashboard-config'
      if (empresaId) url += `?empresa_id=${empresaId}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meta',
          data: {
            valor: metaTipo === 'mensual' ? metaValorMensual : metaValorAnual,
            tipo: metaTipo,
            vigencia_anio: metaVigencia
          }
        })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErrorMeta(data?.error ?? 'Error al guardar la meta. Intenta de nuevo.')
        return
      }
      setModalMetaAbierto(false)
    } catch {
      setErrorMeta('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoMeta(false)
    }
  }

  const guardarEtapas = async () => {
    setGuardandoEtapas(true)
    setErrorEtapas(null)
    try {
      let url = '/api/cotizador/dashboard-config'
      if (empresaId) url += `?empresa_id=${empresaId}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'embudo',
          data: { etapas }
        })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setErrorEtapas(data?.error ?? 'Error al guardar las etapas. Intenta de nuevo.')
        return
      }
      setModalEtapasAbierto(false)
    } catch {
      setErrorEtapas('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoEtapas(false)
    }
  }

  const [guardandoCiudades, setGuardandoCiudades] = useState(false)
  const [errorCiudades, setErrorCiudades] = useState<string | null>(null)

  const guardarCiudades = async () => {
    setGuardandoCiudades(true)
    setErrorCiudades(null)
    try {
      let url = '/api/cotizador/dashboard-config'
      if (empresaId) url += `?empresa_id=${empresaId}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ciudades_agrupadas', data: { grupos: ciudadesAgrupadas, activo: ciudadesAgruparActivo } })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrorCiudades(data?.error ?? 'Error al guardar ciudades.')
        return
      }
      setModalCiudadesAbierto(false)
    } catch {
      setErrorCiudades('Error de conexión.')
    } finally {
      setGuardandoCiudades(false)
    }
  }

  function actualizarEtapa(i: number, patch: Partial<Etapa>) {
    setEtapas(prev => prev.map((e, j) => j === i ? { ...e, ...patch } : e))
  }

  // "Quitar" (trash) saca la etapa por completo de la lista, distinto de
  // ocultarla del gráfico (el ojito) — separación pedida explícitamente
  // porque son dos acciones distintas para el usuario, aunque las dos
  // parten de los mismos 6 estados reales.
  function quitarEtapa(i: number) {
    setEtapas(prev => prev.filter((_, j) => j !== i))
  }
  function agregarEtapa(estadoKey: Etapa['estado_key']) {
    const es = ESTADOS_REALES.find(e => e.key === estadoKey)
    if (!es) return
    setEtapas(prev => [...prev, { estado_key: es.key, nombre: es.label, color: COLOR_POR_ESTADO[es.key], visible: true }])
  }
  const etapasDisponiblesParaAgregar = ESTADOS_REALES.filter(es => !etapas.some(e => e.estado_key === es.key))

  // Arrastrar y soltar para reordenar el embudo — el orden del arreglo
  // `etapas` ES el orden visual de las barras (etapasVisibles más abajo
  // respeta este mismo orden), así que reordenar aquí mueve el embudo real.
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function moverEtapa(de: number, a: number) {
    const lista = [...etapas]
    const [movida] = lista.splice(de, 1)
    lista.splice(a, 0, movida)
    setEtapas(lista)
  }

  const [nuevoNombreGrupo, setNuevoNombreGrupo] = useState('')
  const [grupoRenombrando, setGrupoRenombrando] = useState<string | null>(null)
  const [nombreEnEdicion, setNombreEnEdicion] = useState('')
  const [grupoAEliminar, setGrupoAEliminar] = useState<string | null>(null)

  function agregarCiudadAGrupo(grupo: string, ciudad: string) {
    if (!ciudad.trim()) return
    setCiudadesAgrupadas(prev => {
      const next = { ...prev }
      if (!next[grupo]) {
        next[grupo] = []
      } else {
        next[grupo] = [...next[grupo]] // Deep clone para forzar re-render
      }
      
      if (!next[grupo].includes(ciudad.trim())) {
        next[grupo].push(ciudad.trim())
      }
      return next
    })
  }

  function quitarCiudad(grupo: string, ciudad: string) {
    setCiudadesAgrupadas(prev => {
      const next = { ...prev }
      if (next[grupo]) {
        next[grupo] = next[grupo].filter(c => c !== ciudad)
      }
      return next
    })
  }

  // Normaliza y compara sin distinguir mayúsculas antes de crear — sin
  // esto, escribir "medellín" cuando ya existe "Medellín" creaba un
  // segundo grupo casi idéntico (el chequeo de arriba comparaba las
  // claves tal cual, sensible a mayúsculas) que además terminaba
  // fusionándose solo al recargar la página, porque la carga sí normaliza
  // con capitalizarNombre — bug real encontrado en la revisión.
  function crearGrupo() {
    const nombre = capitalizarNombre(nuevoNombreGrupo.trim())
    if (!nombre) return
    const yaExiste = Object.keys(ciudadesAgrupadas).some(g => g.toLowerCase() === nombre.toLowerCase())
    if (yaExiste) return
    setCiudadesAgrupadas(prev => ({ ...prev, [nombre]: [] }))
    setNuevoNombreGrupo('')
  }

  function iniciarRenombrarGrupo(grupo: string) {
    setGrupoRenombrando(grupo)
    setNombreEnEdicion(grupo)
  }

  function confirmarRenombrarGrupo() {
    const grupo = grupoRenombrando
    const nuevo = capitalizarNombre(nombreEnEdicion.trim())
    const colisiona = Object.keys(ciudadesAgrupadas).some(g => g.toLowerCase() === nuevo.toLowerCase() && g !== grupo)
    if (grupo && nuevo && nuevo.toLowerCase() !== grupo.toLowerCase() && !colisiona) {
      setCiudadesAgrupadas(prev => {
        const next = { ...prev }
        next[nuevo] = next[grupo]
        delete next[grupo]
        return next
      })
    }
    setGrupoRenombrando(null)
    setNombreEnEdicion('')
  }

  function eliminarGrupo(grupo: string) {
    setCiudadesAgrupadas(prev => {
      const next = { ...prev }
      delete next[grupo]
      return next
    })
    setGrupoAEliminar(null)
  }

  // ── Cálculos ────────────────────────────────────────────────────────────

  function enRango(c: CotizacionResumen, desde: string, hasta: string): boolean {
    if (!c.created_at) return false
    const date = c.created_at.split('T')[0]
    return date >= desde && date <= hasta
  }

  // "Por cotizar" es un borrador que ni siquiera se le ha enviado al
  // cliente — no existe para este dashboard, se descarta desde la base para
  // que no diluya ninguna métrica (tasa de cierre, embudo, etc.).
  const cotizacionesReales = useMemo(() => cotizaciones.filter(c => c.estado !== 'por_cotizar'), [cotizaciones])



  const cotsFiltradas = useMemo(() => {
    return cotizacionesReales.filter(c => {
      if (!c.created_at) return true
      return enRango(c, fechaInicio, fechaFin)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizacionesReales, fechaInicio, fechaFin])

  // Periodo inmediatamente anterior, de la misma duración — única forma
  // honesta de decir "subió/bajó/se estancó": comparar contra un rango real,
  // nunca un porcentaje inventado sin cálculo detrás.
  const diasRango = Math.max(1, Math.round((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86_400_000) + 1)
  let fechaFinPrevia = new Date(new Date(fechaInicio).getTime() - 86_400_000).toISOString().split('T')[0]
  let fechaInicioPrevia = new Date(new Date(fechaInicio).getTime() - diasRango * 86_400_000).toISOString().split('T')[0]

  // Regla especial: si es "este mes" (inicia el día 1 del mes actual),
  // se compara contra TODO el mes anterior (del día 1 al último día del mes pasado).
  const dInicio = new Date(`${fechaInicio}T00:00:00`)
  const dHoy = new Date()
  const esEsteMes = dInicio.getDate() === 1 && dInicio.getMonth() === dHoy.getMonth() && dInicio.getFullYear() === dHoy.getFullYear()
  
  if (esEsteMes) {
    const inicioMesAnterior = new Date(dHoy.getFullYear(), dHoy.getMonth() - 1, 1)
    const finMesAnterior = new Date(dHoy.getFullYear(), dHoy.getMonth(), 0)
    
    // Función helper para formato local y-m-d seguro
    const formatYMD = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    
    fechaInicioPrevia = formatYMD(inicioMesAnterior)
    fechaFinPrevia = formatYMD(finMesAnterior)
  }

  const cotsPeriodoPrevio = useMemo(() => {
    return cotizacionesReales.filter(c => enRango(c, fechaInicioPrevia, fechaFinPrevia))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizacionesReales, fechaInicioPrevia, fechaFinPrevia])

  function metricas(cots: CotizacionResumen[], isGlobal: boolean = false) {
    const activas = cots.filter(c => c.estado === 'enviada')
    const ganadas = cots.filter(c => c.estado === 'cerrado_ganado')
    
    // Tasa de Cierre siempre es sobre el total
    const tasaCierre = cots.length > 0 ? Math.round((ganadas.length / cots.length) * 100) : null

    let totalHoras = 0
    let aperturas = 0
    cots.forEach(c => {
      if (c.fecha_enviada && c.fecha_apertura_cliente) {
        const ms = new Date(c.fecha_apertura_cliente).getTime() - new Date(c.fecha_enviada).getTime()
        if (ms > 0) { totalHoras += ms / (1000 * 60 * 60); aperturas++ }
      }
    })
    const horasPromedio = aperturas > 0 ? totalHoras / aperturas : null

    const enviadas = cots.length > 0 ? activas.length : null

    // Muebles cotizados
    const totalMuebles = cots.length > 0 ? cots.reduce((sum, c) => sum + c.total_muebles, 0) : null

    // Ticket Promedio
    // Si estamos en "Todos" (global), el TPV es el promedio de las Ganadas.
    // Si filtramos por etapa, el TPV es el promedio de las cotizaciones en esa etapa.
    const cotsParaTpv = isGlobal ? ganadas : cots
    const valorVentasPeriodo = cotsParaTpv.reduce((sum, c) => sum + totalSinIva(c), 0)
    const tpv = cotsParaTpv.length > 0 ? valorVentasPeriodo / cotsParaTpv.length : null

    return { tasaCierre, enviadas, horasPromedio, totalMuebles, tpv }
  }

  // KPIs y Cards reaccionan al estado del embudo
  const isGlobalFilter = !tabEstado || tabEstado === 'todos'
  
  const cotsKpi = useMemo(() => {
    if (isGlobalFilter) return cotsFiltradas
    return cotsFiltradas.filter(c => c.estado === tabEstado)
  }, [cotsFiltradas, isGlobalFilter, tabEstado])

  const cotsPeriodoPrevioKpi = useMemo(() => {
    if (isGlobalFilter) return cotsPeriodoPrevio
    return cotsPeriodoPrevio.filter(c => c.estado === tabEstado)
  }, [cotsPeriodoPrevio, isGlobalFilter, tabEstado])

  const actual = metricas(cotsKpi, isGlobalFilter)
  const previo = metricas(cotsPeriodoPrevioKpi, isGlobalFilter)

  function tendencia(actual: number | null, previo: number | null): TendenciaInfo | null {
    if (actual === null || previo === null || (actual === 0 && previo === 0)) return null
    if (actual === previo) return { direccion: 'estancado', deltaPct: 0 }
    const direccion = actual > previo ? 'subio' : 'bajo'
    const deltaPct = previo !== 0 ? Math.round(Math.abs((actual - previo) / previo) * 100) : null
    return { direccion, deltaPct }
  }

  const tCierre = tendencia(actual.tasaCierre, previo.tasaCierre)
  const tTiempo = tendencia(actual.horasPromedio, previo.horasPromedio)
  const tMuebles = tendencia(actual.totalMuebles, previo.totalMuebles)
  const tTicket = tendencia(actual.tpv, previo.tpv)

  const tasaCierre = actual.tasaCierre ?? 0

  let labelTiempo = 'Sin datos'
  if (actual.horasPromedio !== null) {
    const horas = actual.horasPromedio
    if (horas < 1) labelTiempo = (horas * 60).toFixed(1) + ' min'
    else if (horas < 24) labelTiempo = horas.toFixed(1) + ' hrs'
    else labelTiempo = (horas / 24).toFixed(1) + ' d'
  }

  const totalMuebles = actual.totalMuebles ?? 0

  const todasLasGanadas = cotizacionesReales.filter(c => c.estado === 'cerrado_ganado')
  const valorVentasReal = todasLasGanadas.reduce((sum, c) => sum + totalSinIva(c), 0)
  
  // TICKET PROMEDIO — nunca con decimales, siempre redondeado hacia arriba.
  const tpv = actual.tpv ?? 0
  let labelTicket = '$ 0'
  if (tpv >= 1_000_000) {
    const millones = Math.ceil(tpv / 1_000_000)
    labelTicket = `$ ${millones} M`
  } else if (tpv > 0) {
    labelTicket = formatCOPEntero(tpv)
  }

  const metaAComparar = metaTipo === 'mensual' ? metaValorMensual : metaValorAnual
  const metaPorcentaje = Math.min(100, Math.round((valorVentasReal / (metaAComparar || 1)) * 100))

  const radius = 40
  const cx = 50
  const cy = 50
  const anguloAnimado = Math.PI - (Math.PI * metaPctAnimado / 100)
  const dotX = cx + radius * Math.cos(anguloAnimado)
  const dotY = cy - radius * Math.sin(anguloAnimado)
  const gaugeColor = metaPorcentaje < 30 ? '#FF5E4B' : metaPorcentaje < 70 ? '#F6BF3E' : '#38B98E'

  const handleMetaMouseEnter = useCallback(() => {
    metaPctAnimadoRef.current = 0
    animarHacia(metaPorcentaje, 800)
  }, [animarHacia, metaPorcentaje])

  // Dispara el recorrido inicial una sola vez, ya con metaPorcentaje real
  // calculado (necesita los datos de arriba, por eso va después).
  useEffect(() => {
    if (!configListo) return
    animarHacia(metaPorcentaje, 900)
  }, [configListo, metaPorcentaje, animarHacia])

  // Etapas visibles del embudo, en el orden en que el vendedor las dejó —
  // cada conteo/valor es el REAL de cotizaciones en ese estado, nunca un
  // número decorativo si da cero. El valor en pesos por etapa es la
  // necesidad #1 documentada en journeys/07-vendedor.md ("no es una tasa de
  // conversión, es el valor en pesos parado en cada paso"), no solo cuántas hay.
  const etapasVisibles = etapas.filter(e => e.visible)
  const cotsPorEtapa = etapasVisibles.map(e => cotsFiltradas.filter(c => c.estado === e.estado_key))
  const conteosPorEtapa = cotsPorEtapa.map(cs => cs.length)
  const valoresPorEtapa = cotsPorEtapa.map(cs => cs.reduce((s, c) => s + Number(c.total), 0))



  // Ciudades reales del periodo que todavía no están en ningún grupo — se
  // ofrecen como chips para agregar con un clic en el modal "Agrupar
  // ciudades", en vez de obligar a escribir el nombre exacto a ciegas (si el
  // nombre no coincide letra por letra con el de crm_clientes.ciudad, no
  // agrupa nada y no hay ningún aviso — bug de usabilidad real).
  const ciudadesSinAgrupar = useMemo(() => {
    const yaAgrupadas = new Set(
      Object.values(ciudadesAgrupadas).flatMap(lista => lista.map(c => c.toLowerCase().trim()))
    )
    const vistas = new Set<string>()
    const resultado: string[] = []
    for (const c of cotsFiltradas) {
      const ciudad = c.crm_clientes?.ciudad?.trim()
      if (!ciudad) continue
      const key = ciudad.toLowerCase()
      if (yaAgrupadas.has(key) || vistas.has(key)) continue
      vistas.add(key)
      resultado.push(capitalizarNombre(ciudad))
    }
    return resultado.sort((a, b) => a.localeCompare(b))
  }, [cotsFiltradas, ciudadesAgrupadas])

  // Mismo orden y color que la card "Top ciudades" de arriba (ver
  // src/lib/cotizador/ciudades.ts) — antes este editor listaba los grupos
  // en el orden crudo del objeto guardado, sin relación con cuál pesa más,
  // y coloreaba por ESE orden: un grupo con más cotizaciones podía aparecer
  // segundo y en un color distinto al que ya tenía en la card (bug real
  // reportado: "Medellín debe ser rosa, no entiendo por qué lo pusiste de
  // café"). Se reordena por el mismo peso (conteo de cotizaciones) que ya
  // usa el ranking real, mismo modo 'clientes' que la card chica.
  const pesoPorGrupo = useMemo(() => {
    const pesos: Record<string, number> = {}
    agregarPorCiudad(cotsFiltradas, true, ciudadesAgrupadas, 'clientes').forEach(item => {
      pesos[item.name] = item.value
    })
    return pesos
  }, [cotsFiltradas, ciudadesAgrupadas])

  const gruposOrdenados = useMemo(() => {
    return Object.entries(ciudadesAgrupadas)
      .map(([grupo, lista]) => ({ grupo, lista, titulo: capitalizarNombre(grupo) }))
      .sort((a, b) => (pesoPorGrupo[b.titulo] ?? 0) - (pesoPorGrupo[a.titulo] ?? 0))
  }, [ciudadesAgrupadas, pesoPorGrupo])

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  return (
    <div className="mb-8">
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h2 className={`text-2xl font-bold ${tp}`}>¿Cómo van las ventas?</h2>
          <DateRangePicker
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            onChange={(start, end) => {
              setFechaInicio(start)
              setFechaFin(end)
            }}
            isDark={isDark}
          />
        </div>

        <Button
          onClick={onNuevaCotizacion}
          disabled={nuevaCotizacionDisabled}
          icon={<Plus size={16} strokeWidth={2.5} />}
        >
          Nueva cotización
        </Button>
      </div>

      {/* lg (1024px): tablet se ve como escritorio, solo más compacto
          (directriz explícita). El sidebar es un riel que expande de 70px a
          220px al pasar el mouse (hover, ver sidebar.tsx) — un cambio de
          150px en el ancho REAL disponible que Tailwind no puede ver, así
          que con el sidebar expandido esta columna queda más apretada de lo
          que el viewport sugiere. La tabla de cotizaciones (más abajo) ya
          tiene su propio scroll horizontal contenido (`.overflow-x-auto`)
          para ese caso — estas cards NUNCA scrollean, solo se comprimen
          (paddings/tamaños `lg:` más chicos en cada card). */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1.5fr_2fr] gap-6">

        {/* 1. Embudo (2.5 de 6 columnas = 41.7%) */}
        <div
          className={`group rounded-[12px] border ${cardBg} p-3 xl:p-5 flex flex-col relative items-center transition-all duration-500`}
          style={{ opacity: entradaAnimada ? 1 : 0, transform: entradaAnimada ? 'translateY(0)' : 'translateY(12px)' }}
        >
          <button
            onClick={() => setModalEtapasAbierto(true)}
            className={`absolute top-3 right-3 xl:top-4 xl:right-4 p-1.5 rounded-md hover-pop hover:bg-[var(--bg-hover)] transition-colors ${ts}`}
            title="Editar etapas del embudo"
          >
            <Pencil size={12} />
          </button>
          <div className="flex items-center gap-1.5 mb-3 lg:mb-2 xl:mb-3 z-10 w-full text-left">
            <Funnel size={14} className="text-[var(--color-brand)] flex-shrink-0" />
            <h3 className={`text-[12px] font-semibold leading-tight font-sans ${ts}`} style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontStyle: 'normal' }}>
              Funnel de conversión
            </h3>
          </div>

          {!configListo ? (
            <div className="flex-1 flex flex-col gap-1.5 w-full mt-4 mb-2 mx-auto">
              {[100, 85, 70, 55].map((w, i) => (
                <Skeleton key={i} style={{ width: `${w}%`, height: 44, borderRadius: 2 }} />
              ))}
            </div>
          ) : etapasVisibles.length === 0 ? (
            <p className={`text-sm italic py-6 text-center ${ts}`}>Sin etapas visibles. Edita el embudo para mostrar al menos una.</p>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-1 w-full mt-4 mb-2 mx-auto">
              {etapasVisibles.map((etapa, idx) => {
                const count = conteosPorEtapa[idx]
                const valor = valoresPorEtapa[idx]
                const width = 100 - (idx * (28 / etapasVisibles.length))
                const pctDelTotal = conteosPorEtapa[0] > 0 ? Math.round((count / conteosPorEtapa[0]) * 100) : null

                const isActive = tabEstado === etapa.estado_key
                return (
                  <button
                    key={etapa.estado_key}
                    onClick={() => onFiltrarEtapa?.(etapa.estado_key)}
                    title={`Filtrar la lista por "${etapa.nombre}"`}
                    className={`flex items-center justify-between px-2.5 py-2 xl:px-4 xl:py-3 rounded-sm hover:brightness-110 cursor-pointer origin-left mb-1 transition-all ${isActive ? 'ring-2 ring-inset ring-white/80 brightness-110' : 'hover:scale-[1.015]'}`}
                    style={{
                      width: etapasAnimadas ? `${width}%` : '0%',
                      backgroundColor: etapa.color,
                      opacity: etapasAnimadas ? (isActive ? 1 : 0.85) : 0,
                      transition: 'width 500ms, opacity 500ms, transform 200ms',
                      transitionDelay: `${idx * 90}ms, ${idx * 90}ms, 0ms`,
                    }}
                  >
                    <span className="text-white text-[11px] xl:text-xs font-bold truncate pr-2">{etapa.nombre}</span>
                    <span className="text-right flex-shrink-0">
                      <span className="block text-white text-[11px] xl:text-xs font-bold leading-tight">{formatCOP(valor)}</span>
                      <span className="block text-white/80 text-[10px] xl:text-[11px] leading-tight font-medium">
                        {count} COT{pctDelTotal !== null && ` · ${pctDelTotal} %`}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Solo "Tasa de cierre" — "Conversión total del embudo" se quitó
              (confundía con esta, y su significado cambiaba según qué etapa
              el usuario dejara primera/última en su embudo personalizable,
              mientras que Tasa de cierre siempre es la misma cuenta clara:
              % de todo lo del periodo que terminó cerrado ganado). */}
          {(tabEstado === 'todos') && (cotsFiltradas.length > 0 || previo.tasaCierre !== null) && (
            <div className="w-full pt-3 mt-1">
              {/* Apilado en tablet (lg, columna angosta de 2.5 de 6), en
                  línea en mobile (ancho completo) y en desktop (xl, columna
                  ya ancha) — "$ 3,5 M" partiéndose en 2 renglones dentro de
                  un espacio angosto se veía mal (bug real reportado), el
                  valor nunca debe partirse. */}
              <div className="flex items-center justify-between gap-1 lg:flex-col lg:items-center lg:justify-center lg:text-center xl:flex-row xl:items-center xl:justify-between xl:text-left">
                <span className={`flex items-center gap-1.5 text-[12px] font-semibold leading-tight font-sans ${ts}`} style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontStyle: 'normal' }}>
                  <Handshake size={14} className="text-[var(--color-brand)] flex-shrink-0" />
                  Tasa de cierre
                  <span className="group/tt relative inline-flex">
                    <Question size={12} className="cursor-help" />
                    {/* z-[60]: el z-30 anterior quedaba tapado por las 4
                        cards de KPIs de al lado (cada una con su propio
                        z-10 en la cabecera) — bug real reportado ("el de
                        Ticket promedio está por debajo de las 4 cards"). */}
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-[60] w-44 rounded-lg bg-[var(--text-primary)] px-2.5 py-1.5 text-[11px] font-normal leading-snug text-[var(--bg-primary)] opacity-0 scale-95 transition-all group-hover/tt:opacity-100 group-hover/tt:scale-100 text-center">
                      % de todas las cotizaciones del periodo que terminaron cerrado ganado.
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold whitespace-nowrap ${tp}`}>{tasaCierre} %</span>
                  <TendenciaBadge t={tCierre} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Meta (1.5 de 6 columnas = 25%) y Ticket Promedio */}
        <div className="flex flex-col gap-4 xl:gap-6">
          <div
            className={`group flex-1 rounded-[12px] border border-[var(--border)] ${cardBg} p-3 xl:p-5 flex flex-col relative transition-all duration-300 hover:border-[var(--color-brand)]/40`}
            style={{ opacity: entradaAnimada ? 1 : 0, transform: entradaAnimada ? 'translateY(0)' : 'translateY(12px)', transitionDelay: '90ms' }}
            onMouseEnter={handleMetaMouseEnter}
          >
            <button
              onClick={() => setModalMetaAbierto(true)}
              className={`absolute top-3 right-3 xl:top-4 xl:right-4 p-1.5 rounded-md hover-pop hover:bg-[var(--bg-hover)] transition-colors ${ts}`}
              title="Configurar meta de ventas"
            >
              <Pencil size={12} />
            </button>

            <div className="flex items-center gap-1.5 mb-3 lg:mb-2 xl:mb-3 z-10 w-full text-left">
              <ChartLine size={14} className="text-[var(--color-error)] flex-shrink-0" />
              <h3 className={`text-[12px] font-semibold leading-tight font-sans ${ts}`} style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontStyle: 'normal' }}>
                Meta
              </h3>
            </div>

            {!configListo ? (
              <div className="flex-1 w-full flex flex-col items-center justify-center gap-3">
                <div className="w-[80%] max-w-[140px] sm:max-w-[160px] xl:max-w-[200px] aspect-[5/3] rounded-t-full skeleton-shimmer" />
                <Skeleton style={{ width: 96, height: 16, borderRadius: 2 }} />
              </div>
            ) : (
              <div className="flex-1 w-full flex flex-col items-center justify-center gap-1 transition-opacity duration-500" style={{ opacity: configListo ? 1 : 0 }}>
                {metaAComparar > 0 ? (
                  <>
                    <div className="relative w-[80%] max-w-[140px] sm:max-w-[160px] xl:max-w-[200px] aspect-[5/3] overflow-visible mx-auto mt-2">
                      <svg viewBox="0 0 100 60" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="metaGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#FF5E4B" />
                            <stop offset="50%" stopColor="#F6BF3E" />
                            <stop offset="100%" stopColor="#38B98E" />
                          </linearGradient>
                        </defs>
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="url(#metaGaugeGradient)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray="125.66 150"
                          strokeDashoffset={125.66 - (125.66 * metaPctAnimado) / 100}
                        />
                        {metaPctAnimado > 0 && (
                          <>
                            <circle cx={dotX} cy={dotY} r="4" fill={gaugeColor} opacity="0.6">
                              <animate attributeName="r" values="4;10" dur="1.8s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.6;0" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={dotX} cy={dotY} r="4" fill={gaugeColor} stroke="white" strokeWidth="1.5" />
                          </>
                        )}
                      </svg>
                      <div className="absolute inset-x-0 top-[70%] -translate-y-1/2 flex justify-center">
                        <span className={`text-xl sm:text-2xl xl:text-3xl font-black leading-none ${tp}`}>
                          {Math.round(metaPctAnimado)} %
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center mt-2 mb-1">
                      <span className={`text-sm xl:text-base font-black ${tp}`}>{formatCOPEntero(valorVentasReal)}</span>
                      <span className={`text-[11px] xl:text-xs font-normal ${ts}`}>de {formatCOPEntero(metaAComparar)}</span>
                    </div>
                  </>
                ) : (
                  <p className={`text-xs text-center italic py-4 ${ts}`}>Aún no tienes una meta configurada.</p>
                )}
              </div>
            )}
          </div>

          {configListo && (
            <div
              className={`group rounded-[12px] border border-[var(--border)] ${cardBg} p-3 xl:p-4 flex flex-col justify-center transition-all duration-300 hover:border-[var(--color-brand)]/40`}
              style={{ opacity: entradaAnimada ? 1 : 0, transform: entradaAnimada ? 'translateY(0)' : 'translateY(12px)', transitionDelay: '120ms' }}
            >
              <div className="flex items-center gap-1.5 mb-2 z-10 w-full text-left">
                <Receipt size={14} className="text-[var(--color-success)] flex-shrink-0" />
                <h3 className={`text-[12px] font-semibold leading-tight font-sans ${ts}`} style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontStyle: 'normal' }}>
                  Ticket promedio
                </h3>
                <span className="group/tt relative inline-flex">
                  <Question size={12} className="cursor-help" />
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-[60] w-44 rounded-lg bg-[var(--text-primary)] px-2.5 py-1.5 text-[11px] font-normal leading-snug text-[var(--bg-primary)] opacity-0 scale-95 transition-all group-hover/tt:opacity-100 group-hover/tt:scale-100 text-center">
                    {tabEstado === 'todos' 
                      ? 'Promedio del valor de las cotizaciones cerradas ganadas en el periodo.'
                      : 'Promedio del valor de las cotizaciones en esta etapa.'}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-base xl:text-xl font-bold ${tp}`}>{labelTicket}</span>
                <TendenciaBadge t={tTicket} />
              </div>
            </div>
          )}
        </div>

        {/* 3. KPIs (2 de 6 columnas = 33.3%): 2 números chicos arriba (fila
            baja) y las 2 cards de gráfico abajo (fila alta) — las de abajo
            necesitan más espacio real para que la torta/barras se vean bien,
            las de arriba son solo un número + una tendencia. */}
        <div
          // La fila de las 2 cards de gráfico (abajo) necesita más alto que
          // la de números (arriba), pero en tablet la columna de KPIs es
          // angosta (2fr de 6) — con la misma proporción de escritorio la
          // card de "Tipo de cliente" se veía enorme y vacía (mucho alto,
          // poco contenido). Proporción más modesta en lg, la cómoda de
          // escritorio recién en xl donde la columna ya tiene ancho real.
          className="grid grid-cols-2 grid-rows-[auto_1.1fr] xl:grid-rows-[auto_1.7fr] gap-2 xl:gap-4 transition-all duration-500"
          style={{ opacity: entradaAnimada ? 1 : 0, transform: entradaAnimada ? 'translateY(0)' : 'translateY(12px)', transitionDelay: '180ms' }}
        >
          <KpiCard icon={<Clock size={14} className="text-[#F6BF3E]" />} label={['Tiempo', 'de apertura']} value={labelTiempo} t={tTiempo} cardBg={cardBg} tp={tp} ts={ts} />
          <KpiCard icon={<Sofa size={14} className="text-[#38B98E]" />} label={['Muebles', 'cotizados']} value={String(totalMuebles)} t={tMuebles} cardBg={cardBg} tp={tp} ts={ts} />
          <CityChartCard cotizaciones={cotsKpi} ciudadesAgrupadas={ciudadesAgrupadas} agrupar={ciudadesAgruparActivo} onConfigClick={() => setModalCiudadesAbierto(true)} cardBg={cardBg} tp={tp} ts={ts} />
          <B2BChartCard cotizaciones={cotsKpi} cardBg={cardBg} tp={tp} ts={ts} />
        </div>

      </div>

      {/* MODAL: METAS */}
      <Modal
        abierto={modalMetaAbierto}
        titulo="Configurar meta de ventas"
        descripcion="Define cuánto quieres vender este periodo."
        icono={<Trophy size={20} className="text-[var(--color-brand)]" />}
        onClose={() => { setModalMetaAbierto(false); setErrorMeta(null); }}
        onConfirmar={guardarMeta}
        onCancelar={() => { setModalMetaAbierto(false); setErrorMeta(null); }}
        textoConfirmar={guardandoMeta ? 'Guardando...' : 'Guardar meta'}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className={`block text-sm font-medium ${tp} mb-1.5`}>Tipo de meta</label>
            <div className="flex bg-[var(--bg-input)] rounded-lg p-1 border border-[var(--border)]">
              <button
                onClick={() => { setMetaValorMensual(Math.round(metaValorAnual / 12)); setMetaTipo('mensual') }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${metaTipo === 'mensual' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
              >Mensual</button>
              <button
                onClick={() => { setMetaValorAnual(metaValorMensual * 12); setMetaTipo('anual') }}
                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${metaTipo === 'anual' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
              >Anual</button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${tp} mb-1.5`}>
              Valor {metaTipo === 'mensual' ? 'Mensual' : 'Anual'}
            </label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 ${ts}`}>$</span>
              <InputMoneda
                value={metaTipo === 'mensual' ? metaValorMensual : metaValorAnual}
                onChange={(val) => metaTipo === 'mensual' ? setMetaValorMensual(val) : setMetaValorAnual(val)}
                className={`w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 outline-none ${tp}`}
              />
            </div>
            <p className={`text-xs mt-1.5 ${ts}`}>
              {metaTipo === 'mensual'
                ? `Equivale a ${formatCOP(metaValorMensual * 12)} anuales.`
                : `Se dividirá en ${formatCOP(Math.round(metaValorAnual / 12))} por mes.`}
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${tp} mb-1.5`}>Vigencia (Año)</label>
            <select
              value={metaVigencia}
              onChange={e => setMetaVigencia(Number(e.target.value))}
              className={`w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none ${tp}`}
            >
              {[metaVigencia - 1, metaVigencia, metaVigencia + 1, metaVigencia + 2]
                .filter((y, i, arr) => arr.indexOf(y) === i)
                .sort()
                .map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {errorMeta && <p className="text-sm text-[#FF5E4B]">{errorMeta}</p>}
        </div>
      </Modal>

      {/* MODAL: ETAPAS EMBUDO */}
      <Modal
        abierto={modalEtapasAbierto}
        titulo="Etapas del Embudo"
        descripcion="Personaliza, oculta o quita cada etapa del embudo."
        icono={<Target size={20} className="text-[var(--color-brand)]" />}
        onClose={() => { setModalEtapasAbierto(false); setErrorEtapas(null); }}
        onConfirmar={guardarEtapas}
        onCancelar={() => { setModalEtapasAbierto(false); setErrorEtapas(null); }}
        textoConfirmar={guardandoEtapas ? 'Guardando...' : 'Guardar etapas'}
        ancho="lg"
      >
        <div className="space-y-1.5 pt-1">
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {etapas.map((etapa, i) => (
              <div
                key={etapa.estado_key}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== i) moverEtapa(dragIndex, i)
                  setDragIndex(null)
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg transition-opacity ${cardBg} ${etapa.visible ? '' : 'opacity-50'} ${dragIndex === i ? 'opacity-30' : ''}`}
              >
                <GripVertical size={14} className={`${ts} cursor-grab flex-shrink-0`} />
                <input
                  type="color"
                  value={etapa.color}
                  onChange={(e) => actualizarEtapa(i, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-none p-0 outline-none flex-shrink-0"
                  title="Color"
                />
                <input
                  type="text"
                  value={etapa.nombre}
                  onChange={(e) => actualizarEtapa(i, { nombre: e.target.value })}
                  className={`flex-1 min-w-0 bg-transparent outline-none text-sm font-medium ${tp}`}
                />
                <button
                  onClick={() => actualizarEtapa(i, { visible: !etapa.visible })}
                  className="p-1.5 rounded-md hover-pop hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0"
                  title={etapa.visible ? 'Ocultar del embudo' : 'Mostrar en el embudo'}
                >
                  {etapa.visible
                    ? <Eye size={15} className={ts} />
                    : <EyeOff size={15} className={ts} />}
                </button>
                <button
                  onClick={() => quitarEtapa(i)}
                  className="p-1.5 flex-shrink-0 bg-transparent text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50"
                  title="Quitar esta etapa por completo"
                >
                  <Trash size={15} />
                </button>
              </div>
            ))}
          </div>

          {etapasDisponiblesParaAgregar.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {etapasDisponiblesParaAgregar.map(es => (
                <button
                  key={es.key}
                  onClick={() => agregarEtapa(es.key)}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-dashed border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors ${ts}`}
                >
                  <Plus size={12} />
                  {es.label}
                </button>
              ))}
            </div>
          )}

          {errorEtapas && <p className="text-sm text-[#FF5E4B]">{errorEtapas}</p>}
        </div>
      </Modal>

      {/* MODAL: CIUDADES AGRUPADAS — rediseñado: el usuario reportó que no
          era claro/no funcionaba. Cambios reales, no solo cosméticos:
          (1) agregar una ciudad a un grupo ya NO es escribir su nombre a
          ciegas (un typo silenciosamente no agrupaba nada) — ahora se elige
          con un clic entre las ciudades REALES de tus cotizaciones que aún
          no están en ningún grupo; (2) el switch de arriba explica con un
          ejemplo real qué cambia al activarlo; (3) cuando el switch está
          apagado, los grupos se ven atenuados para que quede claro que
          existen pero no se están aplicando todavía. */}
      <Modal
        abierto={modalCiudadesAbierto}
        titulo="Agrupar ciudades"
        descripcion="Junta ciudades vecinas bajo un solo nombre."
        icono={<MapPinHouse size={20} className="text-[var(--color-rosa)]" />}
        colorIcono="var(--color-rosa)"
        onClose={() => { setModalCiudadesAbierto(false); setErrorCiudades(null); setNuevoNombreGrupo(''); setGrupoRenombrando(null); }}
        onConfirmar={guardarCiudades}
        onCancelar={() => { setModalCiudadesAbierto(false); setErrorCiudades(null); setNuevoNombreGrupo(''); setGrupoRenombrando(null); }}
        textoConfirmar={guardandoCiudades ? 'Guardando...' : 'Guardar'}
        ancho="sm"
      >
        <div className="space-y-5 pt-2 overflow-x-hidden">
          {errorCiudades && <p className="text-sm text-[#FF5E4B]">{errorCiudades}</p>}

          <div className="flex items-center justify-between border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-card)]">
            <div className="pr-4">
              <p className={`text-sm font-semibold ${tp}`}>Agrupar por área metropolitana</p>
              <p className={`text-xs ${ts} mt-0.5`}>
                {ciudadesAgruparActivo
                  ? 'Activado: Top Ciudades muestra los grupos de abajo consolidados, en vez de cada ciudad suelta.'
                  : 'Apagado: aunque armes grupos abajo, Top Ciudades sigue mostrando cada ciudad por separado.'}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={ciudadesAgruparActivo}
              onClick={() => setCiudadesAgruparActivo(!ciudadesAgruparActivo)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out border border-[var(--border)] ${ciudadesAgruparActivo ? 'bg-[var(--color-brand)] border-transparent' : 'bg-[var(--bg-hover)]'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ciudadesAgruparActivo ? 'translate-x-4' : 'translate-x-[1px]'}`} />
            </button>
          </div>

          <div className={`space-y-3 transition-opacity ${ciudadesAgruparActivo ? '' : 'opacity-50'}`}>
            <label className={`text-sm font-semibold ${tp}`}>Tus grupos</label>

            {Object.entries(ciudadesAgrupadas).length === 0 ? (
              <p className={`text-xs italic text-center py-2 ${ts}`}>Todavía no armaste ningún grupo — créalo abajo.</p>
            ) : (
              <div className="space-y-3 lg:space-y-2 lg:max-h-[300px] lg:overflow-y-auto lg:pr-1 xl:pr-2 xl:max-h-[360px] scrollbar-thin">
              {gruposOrdenados
                .map(({ grupo, lista, titulo }, idxGrupo) => {
                // Mismo color que le toca a este grupo en la card "Top
                // ciudades" (ordenado por el mismo peso real) — ver
                // gruposOrdenados/pesoPorGrupo arriba.
                const colorGrupo = colorPorPosicionCiudad(idxGrupo, titulo)
                return (
                <div key={grupo} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {grupoRenombrando === grupo ? (
                      <input
                        autoFocus
                        value={nombreEnEdicion}
                        onChange={e => setNombreEnEdicion(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmarRenombrarGrupo()
                          if (e.key === 'Escape') { setGrupoRenombrando(null); setNombreEnEdicion('') }
                        }}
                        onBlur={confirmarRenombrarGrupo}
                        className={`flex-1 bg-[var(--bg-input)] border border-[var(--color-brand)] rounded-md px-2 py-1 outline-none text-sm ${tp}`}
                      />
                    ) : (
                      <p className={`text-sm font-bold flex items-center gap-1.5 ${tp}`}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorGrupo }} />
                        {grupo} <span className={`font-normal ${ts}`}>({lista.length} {lista.length === 1 ? 'ciudad' : 'ciudades'})</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => iniciarRenombrarGrupo(grupo)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Renombrar grupo"><Pencil size={12} /></button>
                      <button onClick={() => setGrupoAEliminar(grupo)} className="p-1 bg-transparent text-[var(--color-rosa)] transition-opacity duration-200 hover:opacity-50" title="Eliminar grupo"><Trash size={14} /></button>
                    </div>
                  </div>

                  {lista.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {/* Texto del nombre SIEMPRE en negro (tp) — con
                          colores claros como pistacho de texto casi no se
                          alcanzaba a leer sobre el fondo tintado (bug real
                          reportado). El color del grupo se queda en el
                          fondo/borde tintado, nunca en el texto. */}
                      {lista.map(c => (
                        <span
                          key={c}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tp}`}
                          style={{ backgroundColor: `color-mix(in srgb, ${colorGrupo} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${colorGrupo} 35%, transparent)` }}
                        >
                          {c}
                          <button onClick={() => quitarCiudad(grupo, c)} className="bg-transparent text-[var(--color-rosa)] transition-opacity duration-200 hover:opacity-50">
                            <Trash size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {ciudadesSinAgrupar.length > 0 ? (
                    <div>
                      <p className={`text-[11px] mb-1 ${ts}`}>Toca para agregar a este grupo:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ciudadesSinAgrupar.map(c => (
                          <button
                            key={c}
                            onClick={() => agregarCiudadAGrupo(grupo, c)}
                            className="inline-flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-2.5 py-1 text-xs font-medium hover-pop hover:border-[var(--color-brand)]/40 transition-colors"
                          >
                            <Plus size={11} /> {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className={`text-[11px] italic ${ts}`}>No quedan más ciudades sueltas del periodo para agregar.</p>
                  )}
                </div>
              )})}
            </div>
            )}
          </div>

          <div className="space-y-2 pt-4">
            <label className={`text-sm font-semibold ${tp}`}>Crear grupo nuevo</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={nuevoNombreGrupo}
                onChange={e => setNuevoNombreGrupo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && crearGrupo()}
                placeholder="nombre (ej. eje cafetero)"
                className={`w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 outline-none text-sm ${tp}`}
              />
              <Button onClick={crearGrupo} variant="secondary" className="px-3 w-full sm:w-auto" disabled={!nuevoNombreGrupo.trim()}>
                <Plus size={16} /> Crear
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmar eliminar grupo — reemplaza el confirm() nativo del navegador */}
      <Modal
        abierto={grupoAEliminar !== null}
        titulo="¿Eliminar este grupo?"
        descripcion={grupoAEliminar ? `Se elimina "${grupoAEliminar}" y se desvinculan todas sus ciudades. No se puede deshacer.` : ''}
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        varianteConfirmar="error"
        textoConfirmar="Eliminar"
        onClose={() => setGrupoAEliminar(null)}
        onCancelar={() => setGrupoAEliminar(null)}
        onConfirmar={() => grupoAEliminar && eliminarGrupo(grupoAEliminar)}
        ancho="sm"
      />
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────────────

// Cuenta cuántos dígitos hay antes de una posición del texto, y encuentra la
// posición equivalente en un texto reformateado — así el cursor no salta a
// mitad de escritura cuando se insertan separadores de miles en vivo (bug
// real reportado: escribir números grandes era imposible con formato en vivo
// "ingenuo", y sin formato el usuario no veía la puntuación mientras tecleaba).
function digitosAntesDe(str: string, pos: number): number {
  return str.slice(0, pos).replace(/\D/g, '').length
}
function posicionParaNDigitos(str: string, n: number): number {
  if (n <= 0) return 0
  let contados = 0
  for (let i = 0; i < str.length; i++) {
    if (/\d/.test(str[i])) {
      contados++
      if (contados === n) return i + 1
    }
  }
  return str.length
}

function InputMoneda({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const formateado = value > 0 ? new Intl.NumberFormat('es-CO').format(value) : ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const cursorPrevio = input.selectionStart ?? input.value.length
    const nDigitos = digitosAntesDe(input.value, cursorPrevio)
    const soloDigitos = input.value.replace(/\D/g, '')
    const numero = soloDigitos ? Math.min(999_999_999_999, parseInt(soloDigitos, 10)) : 0
    onChange(numero)

    requestAnimationFrame(() => {
      if (!ref.current) return
      const nuevoTexto = numero > 0 ? new Intl.NumberFormat('es-CO').format(numero) : ''
      const nuevaPos = posicionParaNDigitos(nuevoTexto, nDigitos)
      ref.current.setSelectionRange(nuevaPos, nuevaPos)
    })
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={formateado}
      onChange={handleChange}
      placeholder="0"
      className={className}
    />
  )
}

interface TendenciaInfo { direccion: 'subio' | 'bajo' | 'estancado'; deltaPct: number | null }

// Indicador honesto: solo aparece cuando hay un periodo anterior real con
// qué comparar (nunca un badge decorativo inventado). El % es siempre un
// cálculo real contra el periodo anterior de la misma duración.
function TendenciaBadge({ t }: { t: TendenciaInfo | null }) {
  // Nunca queda vacío: si no hay un periodo anterior real con qué comparar
  // (ej. muy pocas cotizaciones históricas todavía), se muestra un guion
  // neutro en vez de no mostrar nada — para que quede claro que la
  // comparación existe, solo que hoy no hay con qué calcularla.
  if (t === null) {
    return (
      <span className={`text-xs font-bold text-[var(--text-secondary)]/40`} title="Sin datos del periodo anterior para comparar">
        —
      </span>
    )
  }
  if (t.direccion === 'estancado') {
    return (
      <span className="text-xs font-bold text-[var(--text-secondary)]" title="Igual que el periodo anterior">
        —
      </span>
    )
  }
  const Icon = t.direccion === 'subio' ? ArrowUp : ArrowDown
  const color = t.direccion === 'subio' ? '#38B98E' : '#FF5E4B'
  const titulo = `${t.direccion === 'subio' ? 'Subió' : 'Bajó'}${t.deltaPct !== null ? ` ${t.deltaPct} %` : ''} vs. el periodo anterior`
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color }} title={titulo}>
      <Icon size={13} strokeWidth={3} />
      {t.deltaPct !== null ? `${t.deltaPct} %` : (t.direccion === 'subio' ? 'Subió' : 'Bajó')}
    </span>
  )
}

function KpiCard({ icon, label, value, t, cardBg, tp, ts, className, style }: {
  icon: React.ReactNode
  label: [string, string]
  value: string
  t: TendenciaInfo | null
  cardBg: string
  tp: string
  ts: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={`group rounded-[12px] border ${cardBg} p-2 xl:p-3 flex flex-col justify-center h-full cursor-default ${className || ''}`} style={style}>
      <div className="flex items-center gap-1.5 mb-1 xl:mb-2">
        {/* El ícono ya trae su propia animación de hover desde el hub
            (lucide-animated.com o zoom estándar vía wrapIcon) — nunca se
            le agrega un segundo scale encima, o el zoom queda doble. */}
        <span className="flex-shrink-0">{icon}</span>
        <p className={`text-[12px] font-semibold leading-tight font-sans ${ts}`} style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontStyle: 'normal' }}>
          <span className="block xl:inline">{label[0]}</span>
          <span className="hidden xl:inline"> </span>
          <span className="block xl:inline">{label[1]}</span>
        </p>
      </div>
      <p className={`text-base xl:text-xl font-bold ${tp}`}>{value}</p>
      <div className="mt-1">
        <TendenciaBadge t={t} />
      </div>
    </div>
  )
}
