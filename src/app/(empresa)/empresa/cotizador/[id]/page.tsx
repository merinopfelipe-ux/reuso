'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTopLoader } from 'nextjs-toploader'
import { ArrowLeft, CheckCircle, Copy, Link, MessageSquare as ChatCircle, TriangleAlert as Warning, Pencil as PencilSimple, Square, SquareCheck, Trash2 as Trash, Loader2 as CircleNotch, Download, RefreshCw as ArrowsCounterClockwise, Calendar, Clock, CreditCard, ShieldCheck, Save, Mail } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { LogoSpinner } from '@/components/ui/logo-spinner'
import DOMPurify from 'isomorphic-dompurify'
import { NOTA_SANITIZE_CONFIG, LEGAL_SANITIZE_CONFIG } from '@/lib/sanitize-notas'
import { LEGAL_TEXTO_DEFECTO, renderLegalTexto } from '@/lib/cotizador/legales'
import { renderTextoSimple, conPuntoFinal } from '@/lib/cotizador/texto-simple'
import { formatNumero, formatCOP, parseNumero, formatFecha as formatFechaConHora } from '@/lib/format'
import { formatTelefonoVista } from '@/lib/telefono'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { ModuloTrazabilidad } from './components/modulo-trazabilidad'
import { ModuloNotas } from './components/modulo-notas'
import { MueblesSeccion, type Mueble } from './components/muebles-seccion'
import { ESTADOS_COTIZACION, ESTADOS_EMBUDO } from '@/lib/cotizador/estados'
import { calcularDesglose } from '@/lib/cotizador/precio'
import { SelectorCiudad, CIUDAD_DEFECTO } from '@/components/ui/selector-ciudad'
import { InputDireccion } from '@/components/ui/input-direccion'
import { InputPrecio, InputConUnidad } from '@/components/ui/formatted-number-input'
import { IconPicker } from '@/components/admin/icon-picker'
import { DynamicIcon } from '@/components/ui/dynamic-icon'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface EmpresaClienteInfo { id: string; nit: string; razon_social: string; nombre_comercial: string | null; direccion: string | null }

interface Cotizacion {
  id: string
  codigo_cotizacion: string
  estado: string
  subtotal: number
  descuento_activo: boolean
  descuento: number
  descuento_tipo: 'valor' | 'porcentaje'
  transporte_activo: boolean
  transporte_valor: number
  iva_activo: boolean
  iva_porcentaje: number
  validez_activa: boolean
  validez_modo: 'dias' | 'fecha'
  validez_dias: number
  validez_fecha: string | null
  validez_mostrar_galeria: boolean
  validez_mostrar_lista: boolean
  anticipo_activo: boolean
  anticipo_porcentaje: number
  forma_pago_activo: boolean
  forma_pago_tipo: 'anticipo' | 'dias'
  forma_pago_dias: number | null
  forma_pago_mostrar_galeria: boolean
  forma_pago_mostrar_lista: boolean
  tiempo_entrega_activo: boolean
  tiempo_entrega: string | null
  tiempo_entrega_mostrar_galeria: boolean
  tiempo_entrega_mostrar_lista: boolean
  garantia_activo: boolean
  garantia: string | null
  garantia_mostrar_galeria: boolean
  garantia_mostrar_lista: boolean
  envio_gratis_activo: boolean
  envio_gratis_texto: string | null
  envio_gratis_icono: string | null
  envio_gratis_mostrar_galeria: boolean
  envio_gratis_mostrar_lista: boolean
  nota_mostrar_galeria: boolean
  nota_mostrar_lista: boolean
  destacados_json: { icono: string; texto: string; mostrar_galeria?: boolean; mostrar_lista?: boolean }[]
  legales_json: string[]
  total: number
  co2_evitado_total_kg: number
  agua_evitada_total_l: number
  observaciones: string | null
  enlace_publico_token: string | null
  fecha_enviada: string | null
  fecha_apertura_cliente: string | null
  veces_abierta: number
  created_at: string
  updated_at: string
  cliente_id: string | null
  crm_clientes: {
    id: string; tipo: 'persona' | 'empresa'; nombre: string; apellido: string | null
    identificacion: string | null
    telefono: string | null; telefono_indicativo: string | null; email: string | null
    ciudad: string | null; direccion: string | null; direccion_notas: string | null; empresa_cliente_id: string | null
    es_contacto_real: boolean
    crm_empresas_clientes: EmpresaClienteInfo | EmpresaClienteInfo[] | null
  } | null
  empresa_id: string
}

interface ContactoEmpresa { id: string; nombre: string; apellido: string | null; email: string | null; telefono: string | null; telefono_indicativo: string | null }

interface CambioEstado {
  id: string
  estado_anterior: string | null
  estado_nuevo: string
  created_at: string
}

const ESTADOS = ESTADOS_COTIZACION

function formatFecha(iso: string) {
  return formatFechaConHora(iso, { conHora: true })
}

function labelEstado(key: string) {
  return ESTADOS.find(e => e.key === key)?.label ?? key
}

// Doble check por bloque de "Detalles": controla si ese bloque se muestra en
// la vista galería, en la vista lista, en ambas o en ninguna — independiente
// del check "activo" general (que decide si el bloque está configurado).
function ChecksVista({ galeria, lista, onGaleria, onLista }: { galeria: boolean; lista: boolean; onGaleria: () => void; onLista: () => void }) {
  return (
    <div className="flex items-center gap-3 mt-1.5 mb-1 pl-6">
      <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={onGaleria}>
        {galeria
          ? <SquareCheck size={14} className="text-[var(--color-brand)] flex-shrink-0" />
          : <Square size={14} className="text-[var(--text-secondary)] flex-shrink-0" />}
        <span className="text-xs text-[var(--text-secondary)]">Galería</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={onLista}>
        {lista
          ? <SquareCheck size={14} className="text-[var(--color-brand)] flex-shrink-0" />
          : <Square size={14} className="text-[var(--text-secondary)] flex-shrink-0" />}
        <span className="text-xs text-[var(--text-secondary)]">Lista</span>
      </label>
    </div>
  )
}

// Fecha de vencimiento de la validez — según el modo, cuenta días calendario
// desde la creación o usa la fecha específica que fijó el vendedor.
function formatFechaValidez(cot: Cotizacion): string {
  const fecha = cot.validez_modo === 'fecha' && cot.validez_fecha
    ? new Date(`${cot.validez_fecha}T00:00:00`)
    : new Date(new Date(cot.created_at).getTime() + cot.validez_dias * 86_400_000)
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function DetalleCotizacionPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-[var(--bg-primary)]" />}>
      <DetalleCotizacionContent />
    </Suspense>
  )
}

function DetalleCotizacionContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const empresaIdParam = searchParams.get('empresa_id')
  const conEmpresa = useCallback((url: string) =>
    empresaIdParam ? `${url}${url.includes('?') ? '&' : '?'}empresa_id=${empresaIdParam}` : url,
  [empresaIdParam])

  const topLoader = useTopLoader()
  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const [cot, setCot] = useState<Cotizacion | null>(null)
  const [contactosEmpresa, setContactosEmpresa] = useState<ContactoEmpresa[]>([])
  const [muebles, setMuebles] = useState<Mueble[]>([])
  const [estadoHistorial, setEstadoHistorial] = useState<CambioEstado[]>([])
  const [cargando, setCargando] = useState(true)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [modalCorreoAbierto, setModalCorreoAbierto] = useState(false)
  const [correoDestino, setCorreoDestino] = useState('')
  // Cuál fila de crm_clientes corresponde al correo elegido — null cuando el
  // vendedor escribió un correo libre en vez de elegir un contacto de la
  // lista. El backend usa esto para no confundir la identidad de un contacto
  // con la de otro al guardar el correo o al saludar en el email.
  const [contactoIdSeleccionado, setContactoIdSeleccionado] = useState<string | null>(null)
  const [mensajeCorreo, setMensajeCorreo] = useState('')
  const [guardarCorreo, setGuardarCorreo] = useState(false)
  const [enviandoCorreo, setEnviandoCorreo] = useState(false)
  const [estadoCambiando, setEstadoCambiando] = useState(false)
  const [mostrarTodaActividad, setMostrarTodaActividad] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarEstado, setConfirmarEstado] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [editandoTotales, setEditandoTotales] = useState(false)
  const [descuentoActivoInput, setDescuentoActivoInput] = useState(false)
  const [descuentoInput, setDescuentoInput] = useState('0')
  const [descuentoTipoInput, setDescuentoTipoInput] = useState<'valor' | 'porcentaje'>('valor')
  const [ivaActivoInput, setIvaActivoInput] = useState(false)
  const [ivaPorcentajeInput, setIvaPorcentajeInput] = useState('19')
  // Transporte va en Totales (primero) porque es interno: se suma a los
  // ítems para dar la sensación de entrega gratis, nunca aparece solo.
  const [transporteActivoInput, setTransporteActivoInput] = useState(false)
  const [transporteValorInput, setTransporteValorInput] = useState('0')
  const [guardandoTotales, setGuardandoTotales] = useState(false)
  // ── "Detalles": todo colapsado por defecto — cada checkbox activa y
  // despliega su propio campo, y se puede quitar de nuevo apagándolo. Un
  // solo Guardar para todo el bloque (salvo la Nota, que ya tenía el suyo).
  const [notaActivaInput, setNotaActivaInput] = useState(false)
  const [notaTextoInput, setNotaTextoInput] = useState('')
  const [notaMostrarGaleriaInput, setNotaMostrarGaleriaInput] = useState(true)
  const [notaMostrarListaInput, setNotaMostrarListaInput] = useState(true)
  const [validezActivaInput, setValidezActivaInput] = useState(false)
  const [validezModoInput, setValidezModoInput] = useState<'dias' | 'fecha'>('dias')
  const [validezDiasInput, setValidezDiasInput] = useState('30')
  const [validezFechaInput, setValidezFechaInput] = useState('')
  const [validezMostrarGaleriaInput, setValidezMostrarGaleriaInput] = useState(true)
  const [validezMostrarListaInput, setValidezMostrarListaInput] = useState(true)
  const [formaPagoActivaInput, setFormaPagoActivaInput] = useState(false)
  const [anticipoPorcentajeInput, setAnticipoPorcentajeInput] = useState('60')
  const [formaPagoTipoInput, setFormaPagoTipoInput] = useState<'anticipo' | 'dias'>('anticipo')
  const [formaPagoDiasInput, setFormaPagoDiasInput] = useState('30')
  const [formaPagoMostrarGaleriaInput, setFormaPagoMostrarGaleriaInput] = useState(true)
  const [formaPagoMostrarListaInput, setFormaPagoMostrarListaInput] = useState(true)
  const [tiempoEntregaActivaInput, setTiempoEntregaActivaInput] = useState(true)
  const [tiempoEntregaInput, setTiempoEntregaInput] = useState('25 a 30 días hábiles')
  const [tiempoEntregaMostrarGaleriaInput, setTiempoEntregaMostrarGaleriaInput] = useState(true)
  const [tiempoEntregaMostrarListaInput, setTiempoEntregaMostrarListaInput] = useState(true)
  const [garantiaActivaInput, setGarantiaActivaInput] = useState(false)
  const [garantiaInput, setGarantiaInput] = useState('Materiales de alta calidad, mano de obra calificada.')
  const [garantiaMostrarGaleriaInput, setGarantiaMostrarGaleriaInput] = useState(true)
  const [garantiaMostrarListaInput, setGarantiaMostrarListaInput] = useState(true)
  const [envioGratisActivoInput, setEnvioGratisActivoInput] = useState(false)
  const [envioGratisTextoInput, setEnvioGratisTextoInput] = useState('Recogemos y entregamos Gratis')
  const [envioGratisIconoInput, setEnvioGratisIconoInput] = useState('Truck')
  const [envioGratisMostrarGaleriaInput, setEnvioGratisMostrarGaleriaInput] = useState(true)
  const [envioGratisMostrarListaInput, setEnvioGratisMostrarListaInput] = useState(true)
  const [destacadosInput, setDestacadosInput] = useState<{ icono: string; texto: string; mostrar_galeria?: boolean; mostrar_lista?: boolean }[]>([])
  const [editandoDetalles, setEditandoDetalles] = useState(false)
  const [guardandoDetalles, setGuardandoDetalles] = useState(false)
  const [legalesInput, setLegalesInput] = useState<string[]>([])
  const [editandoLegales, setEditandoLegales] = useState(false)
  const [guardandoLegales, setGuardandoLegales] = useState(false)
  const [editandoCliente, setEditandoCliente] = useState(false)
  const [clienteForm, setClienteForm] = useState({
    nombre: '', apellido: '', identificacion: '', email: '', ciudad: CIUDAD_DEFECTO, direccion: '', direccion_notas: '',
    razon_social: '', nombre_comercial: '', empresa_direccion: '',
  })
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [guardandoGlobal, setGuardandoGlobal] = useState(false)
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)

  async function ejecutarGuardadoGlobal() {
    if (!id || guardandoGlobal) return
    setGuardandoGlobal(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify({ observaciones: cot?.observaciones ?? '' }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'No se pudo guardar la cotización.'); return }

      const [resCot, resMuebles] = await Promise.all([
        fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), { cache: 'no-store' }),
        fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}/muebles`), { cache: 'no-store' }),
      ])
      const dCot = await resCot.json()
      const dMuebles = await resMuebles.json()
      if (dCot.cotizacion) setCot(dCot.cotizacion)
      if (dMuebles.muebles) setMuebles(dMuebles.muebles)

      setGuardadoExitoso(true)
      setTimeout(() => setGuardadoExitoso(false), 3000)
    } catch {
      setError('Error al sincronizar y guardar la cotización. Intenta de nuevo.')
    } finally {
      setGuardandoGlobal(false)
    }
  }

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!id) return

    // Carga progresiva: la cotización (lo esencial, header/totales/estado)
    // se pide sola y la pantalla se destraba en cuanto llega — muebles e
    // historial ya no la bloquean, se piden después y solo actualizan su
    // propia sección cuando llegan. Antes las 3 peticiones iban juntas en un
    // solo Promise.all y toda la pantalla se quedaba en blanco hasta que las
    // 3 terminaran, aunque la cotización ya estuviera lista hace rato (bug
    // real reportado: "da la apariencia de ser un sistema muy lento").
    async function intentarCotizacion() {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), { cache: 'no-store' })
      const d = await res.json()
      return { res, d }
    }

    async function cargarCotizacion() {
      setCargando(true)
      try {
        // Primer intento en su propio try — si lanza (ej. respuesta que no
        // era JSON válido), antes eso saltaba derecho al catch de afuera sin
        // pasar por el reintento (bug real: el reintento nunca se
        // ejecutaba en ese caso exacto). Ahora un fallo en el primer
        // intento, sea por excepción o por !ok, activa igual el segundo.
        let resultado: Awaited<ReturnType<typeof intentarCotizacion>> | null = null
        try {
          resultado = await intentarCotizacion()
        } catch { /* se reintenta abajo */ }

        if (!resultado || !resultado.res.ok) {
          await new Promise(r => setTimeout(r, 700))
          resultado = await intentarCotizacion()
        }

        const { res, d } = resultado
        // Mostrar siempre el motivo real que dio el backend (401/400/404/500)
        // en vez de asumir "no encontrada" para cualquier falla — antes esto
        // ocultaba el error verdadero (permiso, empresa incorrecta, etc.).
        if (!res.ok) {
          setError(d.error ?? 'No se pudo cargar la cotización.')
          return
        }
        if (d.cotizacion) {
          setCot(d.cotizacion)
          sincronizarDetallesInputs(d.cotizacion)
          const base = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin
          setEnlace(`${base}/cot/${d.cotizacion.enlace_publico_token ?? d.cotizacion.codigo_cotizacion}`)
        }
        if (d.contactos_empresa) setContactosEmpresa(d.contactos_empresa)
      } catch {
        setError('No se pudieron cargar los datos de la cotización. Intenta de nuevo.')
      } finally { setCargando(false) }
    }

    async function cargarMueblesEHistorial() {
      try {
        const [resMuebles, resHistorial] = await Promise.all([
          fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}/muebles`), { cache: 'no-store' }),
          fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}/estado-historial`), { cache: 'no-store' }),
        ])
        const dMuebles = await resMuebles.json().catch(() => null)
        const dHistorial = await resHistorial.json().catch(() => null)
        if (dMuebles?.muebles) setMuebles(dMuebles.muebles)
        if (dHistorial?.data) setEstadoHistorial(dHistorial.data)
      } catch (e) {
        console.error('Error cargando muebles/historial:', e)
      }
    }

    cargarCotizacion()
    cargarMueblesEHistorial()
  }, [id, conEmpresa])

  const ESTADOS_TERMINALES = ['cerrado_ganado', 'cerrado_perdido', 'cerrado_inviable']

  function solicitarCambioEstado(nuevoEstado: string) {
    if (ESTADOS_TERMINALES.includes(nuevoEstado)) {
      setConfirmarEstado(nuevoEstado)
    } else {
      void ejecutarCambioEstado(nuevoEstado)
    }
  }

  async function ejecutarCambioEstado(nuevoEstado: string) {
    if (!id || estadoCambiando) return
    setConfirmarEstado(null)
    setEstadoCambiando(true)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        const ahora = new Date().toISOString()
        setCot(prev => prev ? { ...prev, estado: nuevoEstado, updated_at: ahora } : prev)
        setEstadoHistorial(prev => (
          prev.length > 0 && prev[prev.length - 1].estado_nuevo === nuevoEstado
            ? prev
            : [...prev, { id: `local-${ahora}`, estado_anterior: cot?.estado ?? null, estado_nuevo: nuevoEstado, created_at: ahora }]
        ))
      } else {
        setError('No se pudo actualizar el estado. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión al actualizar el estado.')
    }
    finally { setEstadoCambiando(false) }
  }

  async function handleDescargarPdf(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!cot || descargandoPdf) return
    // Descarga autenticada desde /empresa — no pasa por el enlace público ni
    // cuenta contra el límite de descargas del cliente (ver rate limit en
    // /api/cotizador/propuesta/[token]/pdf).
    const descargaUrl = `/api/cotizador/cotizaciones/${cot.id}/pdf`
    setDescargandoPdf(true)
    topLoader.start()

    try {
      const res = await fetch(conEmpresa(descargaUrl))
      if (!res.ok) throw new Error('Error al generar PDF')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `Cotizacion_${cot.codigo_cotizacion}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
      if (!enlace) {
        const base = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin
        setEnlace(`${base}/cot/${cot.codigo_cotizacion}`)
      }
    } catch (err) {
      console.error('Error al descargar PDF:', err)
      setError('No se pudo descargar el PDF. Intenta de nuevo.')
    } finally {
      topLoader.done()
      setDescargandoPdf(false)
    }
  }

  function copiarEnlace() {
    if (!enlace) return
    navigator.clipboard.writeText(enlace).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  function abrirModalCorreo() {
    const conCorreo = contactosEmpresa.find(c => c.email)
    setCorreoDestino(conCorreo?.email ?? cot?.crm_clientes?.email ?? '')
    setContactoIdSeleccionado(conCorreo?.id ?? null)
    setMensajeCorreo('')
    setGuardarCorreo(false)
    setModalCorreoAbierto(true)
  }

  async function enviarCorreoPropuesta() {
    if (!cot || enviandoCorreo || !correoDestino.trim()) return
    setEnviandoCorreo(true)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${cot.id}/enviar-correo`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: correoDestino.trim(),
          mensaje: mensajeCorreo.trim() || undefined,
          guardarCorreo,
          contacto_id: contactoIdSeleccionado ?? undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'No se pudo enviar el correo.')
      if (d.enlace) setEnlace(d.enlace)
      setCot(prev => prev ? { ...prev, estado: prev.estado === 'por_cotizar' ? 'enviada' : prev.estado } : prev)
      setModalCorreoAbierto(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo. Intenta de nuevo.')
    } finally {
      setEnviandoCorreo(false)
    }
  }

  function abrirEditarTotales() {
    if (!cot) return
    setTransporteActivoInput(cot.transporte_activo ?? false)
    setTransporteValorInput(String(cot.transporte_valor ?? 0))
    setDescuentoActivoInput(cot.descuento_activo ?? false)
    setDescuentoInput(String(cot.descuento ?? 0))
    setDescuentoTipoInput(cot.descuento_tipo ?? 'valor')
    setIvaActivoInput(cot.iva_activo ?? false)
    setIvaPorcentajeInput(String(cot.iva_porcentaje ?? 19))
    setEditandoTotales(true)
  }

  async function guardarTotales() {
    if (!id || guardandoTotales) return
    setGuardandoTotales(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporte_activo: transporteActivoInput,
          transporte_valor: Math.max(0, parseNumero(transporteValorInput)),
          descuento_activo: descuentoActivoInput,
          descuento: Math.max(0, parseNumero(descuentoInput)),
          descuento_tipo: descuentoTipoInput,
          iva_activo: ivaActivoInput,
          iva_porcentaje: Math.min(100, Math.max(0, parseNumero(ivaPorcentajeInput))),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'No se pudo guardar. Intenta de nuevo.'); return }
      setCot(prev => prev ? { ...prev, ...d } : prev)
      setEditandoTotales(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoTotales(false)
    }
  }

  function sincronizarDetallesInputs(c: Cotizacion) {
    setFormaPagoActivaInput(c.forma_pago_activo ?? true)
    setAnticipoPorcentajeInput(String(c.anticipo_porcentaje ?? 60))
    setFormaPagoTipoInput(c.forma_pago_tipo ?? 'anticipo')
    setFormaPagoDiasInput(String(c.forma_pago_dias ?? 30))
    setFormaPagoMostrarGaleriaInput(c.forma_pago_mostrar_galeria ?? true)
    setFormaPagoMostrarListaInput(c.forma_pago_mostrar_lista ?? true)

    setNotaActivaInput(!!c.observaciones)
    setNotaTextoInput(c.observaciones ?? '')
    setNotaMostrarGaleriaInput(c.nota_mostrar_galeria ?? true)
    setNotaMostrarListaInput(c.nota_mostrar_lista ?? true)

    setValidezActivaInput(c.validez_activa ?? true)
    setValidezModoInput(c.validez_modo ?? 'dias')
    setValidezDiasInput(String(c.validez_dias ?? 30))
    setValidezFechaInput(c.validez_fecha ?? '')
    setValidezMostrarGaleriaInput(c.validez_mostrar_galeria ?? true)
    setValidezMostrarListaInput(c.validez_mostrar_lista ?? true)

    setTiempoEntregaActivaInput(c.tiempo_entrega_activo ?? true)
    setTiempoEntregaInput(c.tiempo_entrega ?? '25 a 30 días hábiles')
    setTiempoEntregaMostrarGaleriaInput(c.tiempo_entrega_mostrar_galeria ?? true)
    setTiempoEntregaMostrarListaInput(c.tiempo_entrega_mostrar_lista ?? true)

    setGarantiaActivaInput(c.garantia_activo ?? true)
    setGarantiaInput(c.garantia ?? 'Materiales de alta calidad, mano de obra calificada.')
    setGarantiaMostrarGaleriaInput(c.garantia_mostrar_galeria ?? true)
    setGarantiaMostrarListaInput(c.garantia_mostrar_lista ?? true)

    setEnvioGratisActivoInput(c.envio_gratis_activo ?? false)
    setEnvioGratisTextoInput(c.envio_gratis_texto ?? 'Recogemos y entregamos Gratis')
    // Ícono fijo en camión — ya no es elegible, siempre se guarda 'Truck'
    // sin importar lo que tuviera guardado de antes.
    setEnvioGratisIconoInput('Truck')
    setEnvioGratisMostrarGaleriaInput(c.envio_gratis_mostrar_galeria ?? true)
    setEnvioGratisMostrarListaInput(c.envio_gratis_mostrar_lista ?? true)

    setDestacadosInput(c.destacados_json ?? [])
  }

  function abrirEditarDetalles() {
    if (!cot) return
    sincronizarDetallesInputs(cot)
    setEditandoDetalles(true)
  }

  async function guardarDetalles() {
    if (!id || guardandoDetalles) return
    setGuardandoDetalles(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forma_pago_activo: formaPagoActivaInput,
          forma_pago_mostrar_galeria: formaPagoMostrarGaleriaInput,
          forma_pago_mostrar_lista: formaPagoMostrarListaInput,
          anticipo_activo: true,
          anticipo_porcentaje: Math.min(100, Math.max(0, parseNumero(anticipoPorcentajeInput) || 60)),
          forma_pago_tipo: formaPagoTipoInput,
          forma_pago_dias: Math.min(365, Math.max(1, Math.round(parseNumero(formaPagoDiasInput)) || 30)),
          observaciones: notaActivaInput ? notaTextoInput : '',
          nota_mostrar_galeria: notaMostrarGaleriaInput,
          nota_mostrar_lista: notaMostrarListaInput,
          validez_activa: validezActivaInput,
          validez_modo: validezModoInput,
          validez_dias: Math.min(365, Math.max(1, Math.round(parseNumero(validezDiasInput)) || 30)),
          validez_fecha: validezFechaInput || null,
          validez_mostrar_galeria: validezMostrarGaleriaInput,
          validez_mostrar_lista: validezMostrarListaInput,
          tiempo_entrega_activo: tiempoEntregaActivaInput,
          tiempo_entrega: tiempoEntregaInput,
          tiempo_entrega_mostrar_galeria: tiempoEntregaMostrarGaleriaInput,
          tiempo_entrega_mostrar_lista: tiempoEntregaMostrarListaInput,
          garantia_activo: garantiaActivaInput,
          garantia: garantiaInput,
          garantia_mostrar_galeria: garantiaMostrarGaleriaInput,
          garantia_mostrar_lista: garantiaMostrarListaInput,
          envio_gratis_activo: envioGratisActivoInput,
          envio_gratis_texto: envioGratisTextoInput,
          envio_gratis_icono: envioGratisIconoInput,
          envio_gratis_mostrar_galeria: envioGratisMostrarGaleriaInput,
          envio_gratis_mostrar_lista: envioGratisMostrarListaInput,
          destacados_json: destacadosInput.filter(d => d.texto.trim()),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'No se pudo guardar. Intenta de nuevo.'); return }
      setCot(prev => prev ? { ...prev, ...d } : prev)
      setEditandoDetalles(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoDetalles(false)
    }
  }

  function abrirEditarLegales() {
    if (!cot) return
    setLegalesInput(cot.legales_json?.length ? cot.legales_json : [LEGAL_TEXTO_DEFECTO])
    setEditandoLegales(true)
  }

  async function guardarLegales() {
    if (!id || guardandoLegales) return
    setGuardandoLegales(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legales_json: legalesInput.map(t => t.trim()).filter(Boolean),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'No se pudo guardar. Intenta de nuevo.'); return }
      setCot(prev => prev ? { ...prev, ...d } : prev)
      setEditandoLegales(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoLegales(false)
    }
  }

  function abrirEditarCliente() {
    if (!cot?.crm_clientes) return
    const empresaInfo = Array.isArray(cot.crm_clientes.crm_empresas_clientes)
      ? cot.crm_clientes.crm_empresas_clientes[0]
      : cot.crm_clientes.crm_empresas_clientes
    setClienteForm({
      nombre: cot.crm_clientes.nombre ?? '',
      apellido: cot.crm_clientes.apellido ?? '',
      identificacion: cot.crm_clientes.identificacion ?? '',
      email: cot.crm_clientes.email ?? '',
      ciudad: cot.crm_clientes.ciudad ?? CIUDAD_DEFECTO,
      direccion: cot.crm_clientes.direccion ?? '',
      direccion_notas: cot.crm_clientes.direccion_notas ?? '',
      razon_social: empresaInfo?.razon_social ?? '',
      nombre_comercial: empresaInfo?.nombre_comercial ?? '',
      empresa_direccion: empresaInfo?.direccion ?? '',
    })
    setEditandoCliente(true)
  }

  async function guardarCliente() {
    if (!cot?.crm_clientes || guardandoCliente) return
    setGuardandoCliente(true)
    setError(null)
    try {
      const esEmpresa = !!cot.crm_clientes.empresa_cliente_id
      const res = await fetch(conEmpresa(`/api/cotizador/clientes/${cot.crm_clientes.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: clienteForm.nombre,
          apellido: clienteForm.apellido || null,
          identificacion: clienteForm.identificacion || null,
          email: clienteForm.email || '',
          ciudad: clienteForm.ciudad || null,
          direccion: clienteForm.direccion || null,
          direccion_notas: clienteForm.direccion_notas || null,
          ...(esEmpresa ? {
            razon_social: clienteForm.razon_social,
            nombre_comercial: clienteForm.nombre_comercial || null,
            empresa_direccion: clienteForm.empresa_direccion || null,
          } : {}),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'No se pudo guardar el cliente. Intenta de nuevo.'); return }
      setCot(prev => prev ? { ...prev, crm_clientes: prev.crm_clientes ? { ...prev.crm_clientes, ...d.cliente } : prev.crm_clientes } : prev)
      setEditandoCliente(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoCliente(false)
    }
  }

  async function eliminarCotizacion() {
    if (!id || eliminando) return
    setEliminando(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${id}`), { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'No se pudo eliminar la cotización. Intenta de nuevo.'); setEliminando(false); return }
      router.push(conEmpresa('/empresa/cotizador'))
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setEliminando(false)
    }
  }

  function handleAgregarMasItems() {
    if (!id) return
    router.push(conEmpresa(`/empresa/cotizador/nueva?cotizacion_id=${id}`))
  }

  // Recalcula los totales de la cotización a partir de las líneas actualizadas
  // en vez de volver a pedirle todo al servidor — más rápido y evita otro round-trip.
  // Los totales SIEMPRE vienen del servidor (recalcular_totales_cotizacion,
  // fórmula completa con transporte/IVA/descuento) — nunca se recalculan
  // aquí, para no duplicar la lógica de precios en dos lugares.
  function handleMuebleActualizado(
    muebleActualizado: { id: string; precio_mueble: number; co2_evitado_kg: number; agua_evitada_l: number; cantidad: number; servicios_json: unknown; insumos_json: unknown; imagen_url?: string | null },
    totales: { subtotal: number; total: number; co2_evitado_total_kg: number; agua_evitada_total_l: number }
  ) {
    setMuebles(prev => prev.map(m => {
      if (m.id !== muebleActualizado.id) return m
      const imagenUrlDefinitiva = muebleActualizado.imagen_url && muebleActualizado.imagen_url.startsWith('http')
        ? muebleActualizado.imagen_url
        : m.imagen_url
      return { ...m, ...muebleActualizado, imagen_url: imagenUrlDefinitiva } as Mueble
    }))
    setCot(c => c ? { ...c, ...totales } : c)
  }

  function handleMuebleEliminado(
    muebleId: string,
    totales: { subtotal: number; total: number; co2_evitado_total_kg: number; agua_evitada_total_l: number }
  ) {
    setMuebles(prev => prev.filter(m => m.id !== muebleId))
    setCot(c => c ? { ...c, ...totales } : c)
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  if (cargando) {
    // Mismo tratamiento exacto que loading.tsx de esta ruta (solo ícono y
    // círculos, sin texto) — antes eran dos avisos de carga distintos que se
    // veían uno detrás del otro al entrar (bug real reportado: "aparecen
    // muchas cosas y textos que dicen cargando").
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center bg-[var(--bg-primary)]">
        <LogoSpinner size={96} />
      </div>
    )
  }

  if (!cot) {
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center bg-[var(--bg-primary)]">
        <p className={ts}>{error ?? 'Cotización no encontrada.'}</p>
      </div>
    )
  }

  const fria = ['enviada', 'en_negociacion'].includes(cot.estado) &&
    Math.floor((Date.now() - new Date(cot.updated_at).getTime()) / 86_400_000) >= 2

  return (
    <div className="pb-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Cabecero */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(conEmpresa('/empresa/cotizador'))} className={`p-2 rounded-full hover-pop hover-press ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#00827C]/08'} transition-colors`}>
            <ArrowLeft size={20} className={tp} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-base font-semibold truncate ${tp}`}>
              {formatCodigoCotizacion(cot.codigo_cotizacion)}
            </h1>
          </div>
          {fria && (
            <span className="text-xs px-2 py-1 rounded-full font-medium text-[#F6BF3E] bg-[#F6BF3E]/10 flex items-center gap-1">
              <Warning size={12} strokeWidth={2.5} /> Cotización fría
            </span>
          )}

          {/* Botón Sincronizar */}
          <button
            type="button"
            onClick={ejecutarGuardadoGlobal}
            disabled={guardandoGlobal}
            title="Forzar sincronización con la propuesta pública"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all duration-200 cursor-pointer hover-pop hover-press ${
              guardadoExitoso
                ? 'bg-[#38B98E] text-white shadow-xs'
                : 'bg-[var(--color-brand)] text-[var(--text-on-brand)] shadow-xs hover:opacity-90'
            }`}
          >
            {guardadoExitoso ? (
              <>
                <CheckCircle size={14} />
                <span>Sincronizado</span>
              </>
            ) : guardandoGlobal ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <ArrowsCounterClockwise size={14} strokeWidth={2.5} />
                <span>Sincronizar</span>
              </>
            )}
          </button>

          <button
            onClick={() => setConfirmandoEliminar(true)}
            className="p-2 rounded-full hover-pop hover-press hover:bg-[#FF5E4B]/10 transition-colors"
            title="Eliminar cotización"
          >
            <Trash size={18} className="text-[#FF5E4B]" />
          </button>
        </div>

        {/* Banner de error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-[10px] bg-[#FF5E4B]/10 border border-[#FF5E4B]/20 text-sm text-[#FF5E4B] flex items-center gap-2">
            <Warning size={16} />
            {error}
          </div>
        )}

        {/* Desktop: 2 columnas. Izquierda = lo que se comparte con el cliente
            (enlace de la propuesta, muebles, totales). Derecha = estado del
            negocio (embudo, actividad, trazabilidad, notas internas).
            Mobile: una sola columna apilada. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* ── Columna izquierda ── */}
          <div>
            {/* Ficha del cliente — editable desde aquí mismo, sin salir de la
                cotización (además de /empresa/clientes/[id], que sigue existiendo).
                El lápiz despliega la edición ahí mismo, sin popup. */}
            {cot.crm_clientes && (
              <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-semibold ${ts}`}>Cliente</p>
                  {!editandoCliente && (
                    <button onClick={abrirEditarCliente} className="hover-pop hover-press p-1" title="Editar ficha del cliente">
                      <PencilSimple size={14} className={ts} />
                    </button>
                  )}
                </div>

                {!editandoCliente ? (
                  <>
                    <p className={`text-sm font-semibold ${tp}`}>
                      {cot.crm_clientes.nombre}{cot.crm_clientes.apellido ? ` ${cot.crm_clientes.apellido}` : ''}
                    </p>
                    {(() => {
                      const empresaInfo = Array.isArray(cot.crm_clientes.crm_empresas_clientes)
                        ? cot.crm_clientes.crm_empresas_clientes[0]
                        : cot.crm_clientes.crm_empresas_clientes
                      return empresaInfo?.razon_social && (
                        <p className={`text-xs ${ts}`}>{empresaInfo.razon_social}</p>
                      )
                    })()}
                    {cot.crm_clientes.email && <p className={`text-xs ${ts}`}>{cot.crm_clientes.email}</p>}
                    {cot.crm_clientes.telefono && (
                      <p className={`text-xs ${ts}`}>{formatTelefonoVista(cot.crm_clientes.telefono, cot.crm_clientes.telefono_indicativo)}</p>
                    )}
                    {(cot.crm_clientes.direccion || cot.crm_clientes.ciudad) && (
                      <p className={`text-xs mt-1 ${ts}`}>
                        {[cot.crm_clientes.direccion, cot.crm_clientes.ciudad].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre</label>
                        <input
                          value={clienteForm.nombre}
                          onChange={e => setClienteForm(p => ({ ...p, nombre: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className={`text-xs font-semibold mb-1 block ${ts}`}>Apellido</label>
                        <input
                          value={clienteForm.apellido}
                          onChange={e => setClienteForm(p => ({ ...p, apellido: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                    {cot.crm_clientes.tipo === 'persona' && (
                      <div>
                        <label className={`text-xs font-semibold mb-1 block ${ts}`}>Cédula</label>
                        <input
                          value={clienteForm.identificacion}
                          onChange={e => setClienteForm(p => ({ ...p, identificacion: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                          placeholder="Opcional"
                          inputMode="numeric"
                        />
                      </div>
                    )}
                    <div>
                      <label className={`text-xs font-semibold mb-1 block ${ts}`}>Correo</label>
                      <input
                        type="email"
                        value={clienteForm.email}
                        onChange={e => setClienteForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs font-semibold mb-1 block ${ts}`}>Ciudad</label>
                        <SelectorCiudad
                          value={clienteForm.ciudad}
                          onChange={ciudad => setClienteForm(p => ({ ...p, ciudad }))}
                          conEmpresa={conEmpresa}
                        />
                      </div>
                      <div>
                        <label className={`text-xs font-semibold mb-1 block ${ts}`}>Dirección</label>
                        <InputDireccion
                          value={clienteForm.direccion}
                          onChange={direccion => setClienteForm(p => ({ ...p, direccion }))}
                          paisCodigo="CO"
                          paisNombre="Colombia"
                          ciudad={clienteForm.ciudad}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-semibold mb-1 block ${ts}`}>Notas sobre la dirección</label>
                      <input
                        value={clienteForm.direccion_notas}
                        onChange={e => setClienteForm(p => ({ ...p, direccion_notas: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                        placeholder="Ej. torre, apto, punto de referencia"
                      />
                    </div>
                    {cot.crm_clientes.empresa_cliente_id && (
                      <>
                        <div className={`pt-2 mt-1 border-t ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                          <p className={`text-xs font-semibold mb-2 ${ts}`}>Empresa</p>
                        </div>
                        <div>
                          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Razón social</label>
                          <input
                            value={clienteForm.razon_social}
                            onChange={e => setClienteForm(p => ({ ...p, razon_social: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre comercial</label>
                            <input
                              value={clienteForm.nombre_comercial}
                              onChange={e => setClienteForm(p => ({ ...p, nombre_comercial: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                              placeholder="Opcional"
                            />
                          </div>
                          <div>
                            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Dirección de la empresa</label>
                            <InputDireccion
                              value={clienteForm.empresa_direccion}
                              onChange={empresa_direccion => setClienteForm(p => ({ ...p, empresa_direccion }))}
                              paisCodigo="CO"
                              paisNombre="Colombia"
                              ciudad={clienteForm.ciudad}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex justify-end gap-2 mt-1">
                      <Button variant="secondary" size="sm" onClick={() => setEditandoCliente(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" loading={guardandoCliente} onClick={guardarCliente} icon={<Save size={14} />}>
                        Guardar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compartir — enlace directo, descarga y envío por correo, sin salir de /empresa. */}
            <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
              <p className={`text-xs font-semibold mb-3 ${ts}`}>Compartir</p>
              <div className="flex items-center gap-2 rounded-[8px] border px-3 py-2 border-[var(--border)] bg-[var(--bg-input)] mb-3">
                <Link size={14} className={tp} />
                <span className={`text-xs flex-1 truncate ${tp}`}>
                  {enlace ?? 'Generando enlace...'}
                </span>
                <button onClick={copiarEnlace} className={`text-xs font-medium flex items-center gap-1 flex-shrink-0 hover-copy hover-press ${copiado ? 'text-[#38B98E]' : 'text-[#00827C]'}`}>
                  <Copy size={14} />
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDescargarPdf}
                  loading={descargandoPdf}
                  icon={<Download size={14} strokeWidth={2.5} />}
                  className="flex-1"
                >
                  {descargandoPdf ? 'Generando...' : 'Descargar'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={abrirModalCorreo}
                  icon={<Mail size={14} strokeWidth={2.5} />}
                  className="flex-1"
                >
                  Enviar por correo
                </Button>
              </div>
            </div>

            {/* Muebles — vista de lista o en cuadro (B2B arranca en cuadro) */}
            <MueblesSeccion
              muebles={muebles}
              cotizacionId={id ?? ''}
              conEmpresa={conEmpresa}
              isDark={isDark}
              onAgregarMas={handleAgregarMasItems}
              onMuebleActualizado={handleMuebleActualizado}
              onMuebleEliminado={handleMuebleEliminado}
            />

            {/* Totales — solo lo que ve el cliente en el desglose: subtotal
                (no editable), descuento e IVA, en ese orden, tanto en la
                vista como en el editor. El lápiz despliega la edición ahí
                mismo, sin popup. */}
            <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold ${ts}`}>Totales</p>
                {!editandoTotales && (
                  <button onClick={abrirEditarTotales} className="hover-pop hover-press p-1" title="Editar transporte, descuento e IVA">
                    <PencilSimple size={14} className={ts} />
                  </button>
                )}
              </div>

              {!editandoTotales ? (
                <>
                  {(() => {
                    const desglose = calcularDesglose({
                      subtotal: Number(cot.subtotal),
                      transporte_activo: cot.transporte_activo,
                      transporte_valor: Number(cot.transporte_valor),
                      descuento_activo: cot.descuento_activo,
                      descuento: Number(cot.descuento),
                      descuento_tipo: cot.descuento_tipo,
                      iva_activo: cot.iva_activo,
                      iva_porcentaje: Number(cot.iva_porcentaje),
                    })
                    // El transporte nunca aparece como línea aparte — se
                    // reparte entre los muebles para dar la sensación de que va
                    // incluido, así que el Subtotal ya lo lleva sumado (mismo
                    // criterio en la propuesta pública y en la vista factura).
                    return (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${ts}`}>Subtotal</span>
                          <span className={`text-sm ${tp}`}>{formatCOP(desglose.subtotal + desglose.transporte)}</span>
                        </div>
                        {desglose.descuentoMonto > 0 && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${ts}`}>
                              Descuento{cot.descuento_tipo === 'porcentaje' ? ` (${formatNumero(cot.descuento)}%)` : ''}
                            </span>
                            <span className="text-sm text-[#FF5E4B]">- {formatCOP(desglose.descuentoMonto)}</span>
                          </div>
                        )}
                        {cot.iva_activo && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${ts}`}>IVA ({formatNumero(cot.iva_porcentaje)}%)</span>
                            <span className={`text-sm ${tp}`}>{formatCOP(desglose.ivaMonto)}</span>
                          </div>
                        )}
                        <div className={`flex justify-between items-center pt-2 mt-1 border-t ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                          <span className={`text-sm font-bold ${tp}`}>Total</span>
                          <span className="text-xl font-bold text-[#00827C]">{formatCOP(Number(cot.total))}</span>
                        </div>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <div className="flex flex-col gap-4 pt-1">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setTransporteActivoInput(v => !v)}>
                      {transporteActivoInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Transporte</span>
                    </label>
                    {transporteActivoInput && (
                      <InputPrecio
                        value={transporteValorInput}
                        onChange={setTransporteValorInput}
                        className="w-full"
                      />
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setDescuentoActivoInput(v => !v)}>
                      {descuentoActivoInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Descuento</span>
                    </label>
                    {descuentoActivoInput && (
                      <>
                        <div className="flex items-center justify-start mb-1">
                          <div className={`flex items-center rounded-full border p-0.5 ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                            <button
                              type="button"
                              onClick={() => setDescuentoTipoInput('valor')}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${descuentoTipoInput === 'valor' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
                            >
                              $
                            </button>
                            <button
                              type="button"
                              onClick={() => setDescuentoTipoInput('porcentaje')}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${descuentoTipoInput === 'porcentaje' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
                            >
                              %
                            </button>
                          </div>
                        </div>
                        {descuentoTipoInput === 'porcentaje' ? (
                          <InputConUnidad
                            value={descuentoInput}
                            onChange={setDescuentoInput}
                            unidad="%"
                            className="w-full"
                          />
                        ) : (
                          <InputPrecio
                            value={descuentoInput}
                            onChange={setDescuentoInput}
                            className="w-full"
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setIvaActivoInput(v => !v)}>
                      {ivaActivoInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>IVA</span>
                    </label>
                    {ivaActivoInput && (
                      <InputConUnidad
                        value={ivaPorcentajeInput}
                        onChange={setIvaPorcentajeInput}
                        unidad="%"
                        className="w-full"
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditandoTotales(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" loading={guardandoTotales} onClick={guardarTotales} icon={<Save size={14} />}>
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Detalles — mismo patrón de lápiz que "Totales": por defecto
                solo se ve el resumen de lo que está activo (nota, validez de
                la oferta, forma de pago, garantía), y al editar se despliega
                el formulario completo con una casilla por detalle para
                agregarlo o quitarlo. Un solo Guardar para todo salvo la nota
                (que ya tenía su propio guardado). */}
            <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold ${ts}`}>Detalles</p>
                {!editandoDetalles && (
                  <button onClick={abrirEditarDetalles} className="hover-pop hover-press p-1" title="Editar nota, validez, forma de pago y garantía">
                    <PencilSimple size={14} className={ts} />
                  </button>
                )}
              </div>

              {!editandoDetalles ? (
                <div className="space-y-2.5 text-sm">
                  {/* 0. Recogemos y entregamos gratis: ubicación fija en la vista pública */}
                  {cot.envio_gratis_activo && (
                    <div className="flex items-center gap-2">
                      <DynamicIcon nombre={cot.envio_gratis_icono} size={15} className={`${ts} flex-shrink-0`} />
                      <span
                        className={ts}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(conPuntoFinal(cot.envio_gratis_texto || 'Recogemos y entregamos Gratis')), NOTA_SANITIZE_CONFIG) }}
                      />
                    </div>
                  )}

                  {/* 1. Forma de pago: sin slash (/), texto plano, con punto al final */}
                  {cot.forma_pago_activo && (
                    <div className="flex items-center gap-2">
                      <CreditCard size={15} className={`${ts} flex-shrink-0`} />
                      <div className="min-w-0">
                        <strong className={`font-semibold ${tp}`}>Forma de pago:</strong>{' '}
                        <span className={ts}>
                          {cot.forma_pago_tipo === 'dias'
                            ? `A ${cot.forma_pago_dias ?? 30} días.`
                            : cot.anticipo_activo
                            ? `Anticipo ${cot.anticipo_porcentaje ?? 60}%, restante ${100 - (cot.anticipo_porcentaje ?? 60)}% a la entrega.`
                            : 'Contado a la entrega.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. Nota: empieza en la misma línea después de los dos puntos (sin punto forzado al final) */}
                  {cot.observaciones && (
                    <div className="flex items-start gap-2">
                      <ChatCircle size={15} className={`${ts} flex-shrink-0 mt-0.5`} />
                      <div className="min-w-0 flex-1">
                        <strong className={`font-semibold ${tp}`}>Nota:</strong>{' '}
                        <span className={ts}>{cot.observaciones}</span>
                      </div>
                    </div>
                  )}

                  {/* 3. Validez de la oferta: con punto al final */}
                  {cot.validez_activa && (
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className={`${ts} flex-shrink-0`} />
                      <div className="min-w-0">
                        <strong className={`font-semibold ${tp}`}>Validez de la oferta:</strong>{' '}
                        <span className={ts}>Válida hasta el {formatFechaValidez(cot)}.</span>
                      </div>
                    </div>
                  )}

                  {/* 4. Tiempo de la entrega: con punto al final */}
                  {cot.tiempo_entrega_activo && (
                    <div className="flex items-center gap-2">
                      <Clock size={15} className={`${ts} flex-shrink-0`} />
                      <div className="min-w-0">
                        <strong className={`font-semibold ${tp}`}>Tiempo de la entrega:</strong>{' '}
                        <span className={ts}>
                          {(cot.tiempo_entrega || '25 a 30 días hábiles').endsWith('.')
                            ? (cot.tiempo_entrega || '25 a 30 días hábiles')
                            : `${cot.tiempo_entrega || '25 a 30 días hábiles'}.`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 5. Garantía: sin punto forzado al final */}
                  {cot.garantia_activo && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} className={`${ts} flex-shrink-0`} />
                      <div className="min-w-0">
                        <strong className={`font-semibold ${tp}`}>Garantía:</strong>{' '}
                        <span className={ts}>{cot.garantia || 'Materiales de alta calidad, mano de obra calificada.'}</span>
                      </div>
                    </div>
                  )}

                  {/* 6. Mensajes destacados: lista común, va al final, debajo de lo preestablecido */}
                  {cot.destacados_json?.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <DynamicIcon nombre={d.icono} size={15} className={`${ts} flex-shrink-0`} />
                      <span className={ts} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(d.texto), NOTA_SANITIZE_CONFIG) }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4 pt-1">
                  {/* 0. Transporte (antes "Recogemos y entregamos gratis"):
                      ícono fijo en camión (Truck), solo el texto es editable,
                      ubicación fija en la vista pública (aparte de Mensajes
                      destacados, que va al final). */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setEnvioGratisActivoInput(v => !v)}>
                      {envioGratisActivoInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Transporte</span>
                    </label>
                    {envioGratisActivoInput && (
                      <ChecksVista
                        galeria={envioGratisMostrarGaleriaInput}
                        lista={envioGratisMostrarListaInput}
                        onGaleria={() => setEnvioGratisMostrarGaleriaInput(v => !v)}
                        onLista={() => setEnvioGratisMostrarListaInput(v => !v)}
                      />
                    )}
                    {envioGratisActivoInput && (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={envioGratisTextoInput}
                          onChange={e => setEnvioGratisTextoInput(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                          placeholder="Recogemos y entregamos **Gratis**"
                        />
                        <p className={`text-xs ${ts}`}>Usa **así** para poner una palabra en negrita, ej. **Gratis**.</p>
                      </div>
                    )}
                  </div>

                  {/* 1. Forma de pago */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setFormaPagoActivaInput(v => !v)}>
                      {formaPagoActivaInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Forma de pago</span>
                    </label>
                    {formaPagoActivaInput && (
                      <ChecksVista
                        galeria={formaPagoMostrarGaleriaInput}
                        lista={formaPagoMostrarListaInput}
                        onGaleria={() => setFormaPagoMostrarGaleriaInput(v => !v)}
                        onLista={() => setFormaPagoMostrarListaInput(v => !v)}
                      />
                    )}
                    {formaPagoActivaInput && (
                      <div className="space-y-2">
                        <div className={`flex items-center rounded-full border p-0.5 w-fit ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                          <button
                            type="button"
                            onClick={() => setFormaPagoTipoInput('anticipo')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${formaPagoTipoInput === 'anticipo' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
                          >
                            Anticipo
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormaPagoTipoInput('dias')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${formaPagoTipoInput === 'dias' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
                          >
                            A días
                          </button>
                        </div>
                        {formaPagoTipoInput === 'anticipo' ? (
                          <div className="flex items-center gap-2">
                            <InputConUnidad
                              value={anticipoPorcentajeInput}
                              onChange={setAnticipoPorcentajeInput}
                              unidad="%"
                              className="w-28 flex-shrink-0"
                            />
                            <span className={`text-sm ${ts}`}>de anticipo, resto a la entrega</span>
                          </div>
                        ) : (
                          <InputConUnidad
                            value={formaPagoDiasInput}
                            onChange={setFormaPagoDiasInput}
                            unidad="días calendario"
                            className="w-full"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Nota (Texto plano sin WYSIWYG, sin contenido por defecto) */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setNotaActivaInput(v => !v)}>
                      {notaActivaInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Nota</span>
                    </label>
                    {notaActivaInput && (
                      <ChecksVista
                        galeria={notaMostrarGaleriaInput}
                        lista={notaMostrarListaInput}
                        onGaleria={() => setNotaMostrarGaleriaInput(v => !v)}
                        onLista={() => setNotaMostrarListaInput(v => !v)}
                      />
                    )}
                    {notaActivaInput && (
                      <input
                        type="text"
                        value={notaTextoInput}
                        onChange={e => setNotaTextoInput(e.target.value)}
                        placeholder="Opcional (sin nota por defecto)"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                      />
                    )}
                  </div>

                  {/* 3. Validez de la oferta */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setValidezActivaInput(v => !v)}>
                      {validezActivaInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Validez de la oferta</span>
                    </label>
                    {validezActivaInput && (
                      <ChecksVista
                        galeria={validezMostrarGaleriaInput}
                        lista={validezMostrarListaInput}
                        onGaleria={() => setValidezMostrarGaleriaInput(v => !v)}
                        onLista={() => setValidezMostrarListaInput(v => !v)}
                      />
                    )}
                    {validezActivaInput && (
                      <div className="flex flex-col gap-2">
                        <div className={`flex items-center rounded-full border p-0.5 w-fit ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                          <button
                            type="button"
                            onClick={() => setValidezModoInput('dias')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${validezModoInput === 'dias' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
                          >
                            Días calendario
                          </button>
                          <button
                            type="button"
                            onClick={() => setValidezModoInput('fecha')}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${validezModoInput === 'fecha' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : ts}`}
                          >
                            Fecha específica
                          </button>
                        </div>
                        {validezModoInput === 'dias' ? (
                          <InputConUnidad
                            value={validezDiasInput}
                            onChange={setValidezDiasInput}
                            unidad="días calendario"
                            className="w-full"
                          />
                        ) : (
                          <input
                            type="date"
                            value={validezFechaInput}
                            onChange={e => setValidezFechaInput(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Tiempo de la entrega */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setTiempoEntregaActivaInput(v => !v)}>
                      {tiempoEntregaActivaInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Tiempo de la entrega</span>
                    </label>
                    {tiempoEntregaActivaInput && (
                      <ChecksVista
                        galeria={tiempoEntregaMostrarGaleriaInput}
                        lista={tiempoEntregaMostrarListaInput}
                        onGaleria={() => setTiempoEntregaMostrarGaleriaInput(v => !v)}
                        onLista={() => setTiempoEntregaMostrarListaInput(v => !v)}
                      />
                    )}
                    {tiempoEntregaActivaInput && (
                      <input
                        type="text"
                        value={tiempoEntregaInput}
                        onChange={e => setTiempoEntregaInput(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                        placeholder="25 a 30 días hábiles"
                      />
                    )}
                  </div>

                  {/* 5. Garantía */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none mb-2" onClick={() => setGarantiaActivaInput(v => !v)}>
                      {garantiaActivaInput
                        ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
                        : <Square size={18} className={`${ts} flex-shrink-0`} />
                      }
                      <span className={`text-sm font-medium ${tp}`}>Garantía</span>
                    </label>
                    {garantiaActivaInput && (
                      <ChecksVista
                        galeria={garantiaMostrarGaleriaInput}
                        lista={garantiaMostrarListaInput}
                        onGaleria={() => setGarantiaMostrarGaleriaInput(v => !v)}
                        onLista={() => setGarantiaMostrarListaInput(v => !v)}
                      />
                    )}
                    {garantiaActivaInput && (
                      <input
                        type="text"
                        value={garantiaInput}
                        onChange={e => setGarantiaInput(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                        placeholder="Materiales de alta calidad, mano de obra calificada."
                      />
                    )}
                  </div>

                  {/* 6. Mensajes destacados: lista común, va al final, debajo
                      de lo preestablecido, cada uno con su propio ícono y
                      texto libre. */}
                  <div>
                    <label className={`text-sm font-medium block mb-2 ${tp}`}>Mensajes destacados</label>
                    <div className="flex flex-col gap-3">
                      {destacadosInput.map((d, i) => (
                        <div key={i} className={`flex flex-col gap-2 p-3 rounded-xl border ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${ts}`}>Mensaje {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => setDestacadosInput(prev => prev.filter((_, j) => j !== i))}
                              className="hover-pop hover-press p-1"
                              title="Quitar mensaje"
                            >
                              <Trash size={14} className="text-[#FF5E4B]" />
                            </button>
                          </div>
                          <IconPicker
                            value={d.icono}
                            onChange={icono => setDestacadosInput(prev => prev.map((x, j) => j === i ? { ...x, icono } : x))}
                          />
                          <input
                            type="text"
                            value={d.texto}
                            onChange={e => setDestacadosInput(prev => prev.map((x, j) => j === i ? { ...x, texto: e.target.value } : x))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                            placeholder="Ej. Envíos a nivel nacional"
                          />
                          <ChecksVista
                            galeria={d.mostrar_galeria !== false}
                            lista={d.mostrar_lista !== false}
                            onGaleria={() => setDestacadosInput(prev => prev.map((x, j) => j === i ? { ...x, mostrar_galeria: x.mostrar_galeria === false } : x))}
                            onLista={() => setDestacadosInput(prev => prev.map((x, j) => j === i ? { ...x, mostrar_lista: x.mostrar_lista === false } : x))}
                          />
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDestacadosInput(prev => [...prev, { icono: 'Truck', texto: '' }])}
                      >
                        Agregar mensaje destacado
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditandoDetalles(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" loading={guardandoDetalles} onClick={guardarDetalles} icon={<Save size={14} />}>
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Legales — párrafos libres sin ícono, van antes del pie de
                página en la cotización pública, iguales en ambas vistas. */}
            <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold ${ts}`}>Legales</p>
                {!editandoLegales && (
                  <button onClick={abrirEditarLegales} className="hover-pop hover-press p-1" title="Editar textos legales">
                    <PencilSimple size={14} className={ts} />
                  </button>
                )}
              </div>

              {!editandoLegales ? (
                <div className="space-y-1.5 text-sm">
                  {(cot.legales_json?.length ? cot.legales_json : [LEGAL_TEXTO_DEFECTO]).map((texto, i) => (
                    <p key={i} className={ts} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderLegalTexto(texto), LEGAL_SANITIZE_CONFIG) }} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {legalesInput.map((texto, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={texto}
                        onChange={e => setLegalesInput(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                        placeholder='Ej. Los precios no incluyen instalación eléctrica. Para enlazar: [texto](/legal/terminos)'
                      />
                      <button
                        type="button"
                        onClick={() => setLegalesInput(prev => prev.filter((_, j) => j !== i))}
                        className="hover-pop hover-press p-1 flex-shrink-0"
                        title="Quitar texto legal"
                      >
                        <Trash size={14} className="text-[#FF5E4B]" />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLegalesInput(prev => [...prev, ''])}
                  >
                    Agregar texto legal
                  </Button>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditandoLegales(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" loading={guardandoLegales} onClick={guardarLegales} icon={<Save size={14} />}>
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Columna derecha ── */}
          <div>
            {/* Estado del embudo + Actividad — una sola tarjeta: arriba el
                selector (libre en cualquier dirección entre los 6 estados),
                abajo el registro real de cada cambio. Solo estado del
                embudo — las aperturas del cliente viven en Trazabilidad. */}
            <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
              <p className={`text-xs font-semibold mb-3 ${ts}`}>Estado del embudo</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_EMBUDO.map(e => {
                  const esActual = cot.estado === e.key
                  return (
                    <button
                      key={e.key}
                      disabled={estadoCambiando}
                      onClick={() => solicitarCambioEstado(e.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover-pop hover-press ${
                        esActual
                          ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)] shadow-sm'
                          : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {e.label}
                    </button>
                  )
                })}
              </div>

              <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className={`text-xs font-semibold mb-3 ${ts}`}>Actividad</p>
                {(() => {
                  const items = [
                    {
                      fecha: cot.created_at,
                      icon: <CheckCircle size={14} className="text-[#00827C]" />,
                      label: 'Creada',
                      key: 'creada',
                    },
                    ...estadoHistorial.map(h => ({
                      fecha: h.created_at,
                      icon: <CheckCircle size={14} className={
                        h.estado_nuevo === 'cerrado_ganado' ? 'text-[#38B98E]'
                          : h.estado_nuevo === 'cerrado_perdido' || h.estado_nuevo === 'cerrado_inviable' ? 'text-[#FF5E4B]'
                          : 'text-[#59A6E4]'
                      } />,
                      label: `Pasó a "${labelEstado(h.estado_nuevo)}"`,
                      key: h.id,
                    })),
                  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

                  return (
                    <div className="space-y-2">
                      <div className={`space-y-2 ${mostrarTodaActividad ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
                        {(mostrarTodaActividad ? items : items.slice(0, 3)).map(item => (
                          <TimelineItem key={item.key} icon={item.icon} label={item.label} fecha={item.fecha} isDark={isDark} />
                        ))}
                      </div>
                      {items.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setMostrarTodaActividad(v => !v)}
                          className={`text-xs font-medium text-left hover:underline cursor-pointer ${tp}`}
                        >
                          {mostrarTodaActividad ? 'Ver menos' : `+${items.length - 3} más`}
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Trazabilidad: aperturas de la propuesta pública */}
            {id && <ModuloTrazabilidad cotizacionId={id} conEmpresa={conEmpresa} />}

            {/* Notas internas — separado de trazabilidad, cada una en su tarjeta */}
            {id && <ModuloNotas cotizacionId={id} conEmpresa={conEmpresa} />}
          </div>

        </div>
      </div>

      {/* Modal confirmación estado terminal */}
      <Modal
        abierto={!!confirmarEstado}
        onClose={() => setConfirmarEstado(null)}
        titulo={confirmarEstado === 'cerrado_ganado' ? '¡Confirma el cierre ganado!' : 'Confirma el cambio de estado'}
        descripcion={`¿Quieres marcar esta cotización como "${ESTADOS.find(e => e.key === confirmarEstado)?.label}"? Esta acción cambia el embudo de ventas.`}
        varianteConfirmar={confirmarEstado === 'cerrado_ganado' ? 'brand' : 'error'}
        textoConfirmar="Confirmar"
        onConfirmar={() => confirmarEstado && ejecutarCambioEstado(confirmarEstado)}
      />

      {/* Modal confirmar eliminación de la cotización */}
      <Modal
        abierto={confirmandoEliminar}
        onClose={() => setConfirmandoEliminar(false)}
        titulo="¿Eliminar esta cotización?"
        descripcion={`Se borra ${formatCodigoCotizacion(cot.codigo_cotizacion)} junto con sus muebles, notas y trazabilidad. Esta acción no se puede deshacer.`}
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        varianteConfirmar="error"
        textoConfirmar={eliminando ? 'Eliminando...' : 'Eliminar'}
        onConfirmar={eliminarCotizacion}
        onCancelar={() => setConfirmandoEliminar(false)}
      />

      {/* Modal enviar propuesta por correo */}
      <Modal
        abierto={modalCorreoAbierto}
        onClose={() => setModalCorreoAbierto(false)}
        titulo="Enviar propuesta por correo"
        descripcion="El cliente recibe el enlace de la propuesta y el PDF adjunto."
        icono={<Mail size={22} className="text-[var(--color-brand)]" />}
        textoCancelar="Cancelar"
        textoConfirmar={enviandoCorreo ? 'Enviando...' : 'Enviar'}
        onCancelar={() => setModalCorreoAbierto(false)}
        onConfirmar={enviarCorreoPropuesta}
      >
        {contactosEmpresa.filter(c => c.email).length > 0 && (
          <div className="mb-1">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Contactos de la empresa</label>
            <div className="flex flex-col gap-1.5">
              {contactosEmpresa.filter(c => c.email).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCorreoDestino(c.email!); setContactoIdSeleccionado(c.id) }}
                  className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${contactoIdSeleccionado === c.id ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
                >
                  <span className={`font-semibold ${tp}`}>{c.nombre} {c.apellido ?? ''}</span>
                  <span className={`ml-2 ${ts}`}>{c.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>{contactosEmpresa.filter(c => c.email).length > 0 ? 'O escribe otro correo' : 'Correo del cliente'}</label>
          <input
            type="email"
            value={correoDestino}
            onChange={e => { setCorreoDestino(e.target.value); setContactoIdSeleccionado(null) }}
            placeholder="cliente@correo.com"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Mensaje (opcional)</label>
          <textarea
            value={mensajeCorreo}
            onChange={e => setMensajeCorreo(e.target.value)}
            placeholder="Escribe una nota corta para el cliente"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] resize-none"
          />
        </div>
        <label
          className="flex items-center gap-2 cursor-pointer group select-none"
          onClick={() => setGuardarCorreo(v => !v)}
        >
          {guardarCorreo
            ? <SquareCheck size={18} className="text-[var(--color-brand)] flex-shrink-0" />
            : <Square size={18} className={`${ts} flex-shrink-0`} />
          }
          <span className={`text-xs font-medium ${ts}`}>Guardar este correo en la ficha del cliente</span>
        </label>
      </Modal>

    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function TimelineItem({ icon, label, fecha, isDark }: { icon: React.ReactNode; label: string; fecha: string; isDark: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${isDark ? 'text-white/70' : 'text-[#474747]/70'}`}>{label}</span>
      </div>
      <span className={`text-xs flex-shrink-0 ${isDark ? 'text-white/40' : 'text-[#474747]/40'}`}>
        {formatFecha(fecha)}
      </span>
    </div>
  )
}

