'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Leaf, Droplet as Drop, TreeDeciduous as Tree, Bath as Bathtub, RefreshCcw as ArrowsCounterClockwise, CircleHelp as Question, List, LayoutGrid as GridIcon, Sun, Moon, Download, Mail, Share2, ChatCircle, Calendar, Clock, ShieldCheck, Loader2 as CircleNotch, Tag, Hammer, TrendDown } from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { useTopLoader } from 'nextjs-toploader'
import { VistaCot } from './vista-cot'
import { PARAM_EQUIV } from '@/lib/calculos/co2'
import { Modal } from '@/components/ui/modal'
import { ModalImagenZoom } from '@/components/ui/modal-imagen-zoom'
import { formatNumero, formatEnteroMillones } from '@/lib/format'
import DOMPurify from 'isomorphic-dompurify'
import { NOTA_SANITIZE_CONFIG, LEGAL_SANITIZE_CONFIG } from '@/lib/sanitize-notas'
import { LEGAL_TEXTO_DEFECTO, renderLegalTexto } from '@/lib/cotizador/legales'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { renderTextoSimple, conPuntoFinal } from '@/lib/cotizador/texto-simple'
import { calcularDesglose, calcularAnticipo } from '@/lib/cotizador/precio'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { ScanSearch, Scale, Equal } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Mueble {
  id: string
  titulo: string | null
  descripcion: string | null
  tipo_mueble: string
  categoria: string
  oficios_json: { tapiceria?: boolean; pintura?: boolean; carpinteria_superficial?: boolean } | null
  servicios_json?: { nombre: string; precio: number }[] | null
  insumos_json?: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[] | null
  cantidad: number
  precio_mueble: number
  co2_evitado_kg: number
  agua_evitada_l: number
  imagen_url: string | null
  materiales_json?: Record<string, unknown> | null
  peso_estandar_kg?: number | null
  precio_mercado_nuevo: number | null
  precio_mercado_estado: 'pendiente' | 'sugerido' | 'confirmado' | 'sin_resultado'
}

interface Cotizacion {
  id: string
  codigo_cotizacion: string
  estado: string
  subtotal: number
  descuento: number
  descuento_activo: boolean
  descuento_tipo: 'valor' | 'porcentaje'
  transporte_activo: boolean
  transporte_valor: number
  iva_activo: boolean
  iva_porcentaje: number
  validez_activa: boolean
  validez_modo: 'dias' | 'fecha'
  validez_dias: number
  validez_fecha: string | null
  validez_mostrar_galeria?: boolean
  validez_mostrar_lista?: boolean
  anticipo_activo: boolean
  anticipo_porcentaje: number
  forma_pago_activo: boolean
  forma_pago_tipo: 'anticipo' | 'dias'
  forma_pago_dias: number | null
  forma_pago_mostrar_galeria?: boolean
  forma_pago_mostrar_lista?: boolean
  tiempo_entrega_activo?: boolean
  tiempo_entrega?: string | null
  tiempo_entrega_mostrar_galeria?: boolean
  tiempo_entrega_mostrar_lista?: boolean
  garantia_activo?: boolean
  garantia: string | null
  garantia_mostrar_galeria?: boolean
  garantia_mostrar_lista?: boolean
  envio_gratis_activo?: boolean
  envio_gratis_texto?: string | null
  envio_gratis_icono?: string | null
  envio_gratis_mostrar_galeria?: boolean
  envio_gratis_mostrar_lista?: boolean
  nota_mostrar_galeria?: boolean
  nota_mostrar_lista?: boolean
  destacados_json?: { icono: string; texto: string; mostrar_galeria?: boolean; mostrar_lista?: boolean }[]
  legales_json?: string[]
  version: number
  total: number
  co2_evitado_total_kg: number
  agua_evitada_total_l: number
  observaciones: string | null
  created_at?: string
  updated_at?: string
  crm_clientes: {
    tipo?: 'persona' | 'empresa' | null
    nombre: string; apellido: string | null; identificacion: string | null
    telefono: string | null; telefono_indicativo: string | null; email: string | null
    direccion: string | null
    empresa_cliente_id?: string | null
    es_contacto_real?: boolean | null
    crm_empresas_clientes?: { id: string; nit: string | null; razon_social: string; nombre_comercial: string | null; direccion: string | null } | { id: string; nit: string | null; razon_social: string; nombre_comercial: string | null; direccion: string | null }[] | null
  } | null
  empresas: {
    nombre: string
    logo_url: string | null
    logo_svg_url: string | null
    logo_alto_minimo_px: number | null
    nombre_footer_propuesta: string | null
    whatsapp_propuesta: string | null
    mostrar_marca_reuso: boolean
    por_que_elegirnos_json: { parrafo: string; bullets: string[]; imagen_url: string | null; imagen_posicion?: string | null } | null
  } | null
}

interface Props {
  cotizacion: Cotizacion
  muebles: Mueble[]
  token: string
  aperturaId: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCOPCompact(n: number): string {
  // "$2'420.000" — apóstrofo en el corte de millones, regla de src/lib/format.ts
  return '$' + formatEnteroMillones(Math.round(n))
}

// Imagen de "¿Por qué elegirnos?" con placeholder estético — nunca deja el
// espacio en blanco, ni cuando no hay imagen configurada ni cuando la URL
// guardada falla al cargar (ej. se borró de Storage).
function ImagenPorQueElegirnos({ url, alt, isDark, posicion }: { url: string | null; alt: string; isDark: boolean; posicion?: string | null }) {
  const [rota, setRota] = useState(false)
  const mostrarPlaceholder = !url || rota
  const objectPosition = posicion === 'top' ? 'center top' : posicion === 'bottom' ? 'center bottom' : 'center center'

  return (
    <div
      className="w-full h-full min-h-[220px] rounded-[12px] overflow-hidden flex items-center justify-center relative"
      style={{ background: isDark ? 'rgba(214,243,145,0.08)' : 'rgba(0,130,124,0.06)' }}
    >
      {mostrarPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf size={64} strokeWidth={1.5} className={isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          draggable={false}
          src={url}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition }}
          onError={() => setRota(true)}
        />
      )}
    </div>
  )
}


// ── Componente ─────────────────────────────────────────────────────────────────

export default function PropuestaClient({ cotizacion, muebles, token, aperturaId }: Props) {
  const topLoader = useTopLoader()
  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const aceptada = cotizacion.estado === 'esperando_anticipo' || cotizacion.estado === 'cerrado_ganado'
  const [isDark, setIsDark] = useState(false)
  const esB2B = cotizacion.crm_clientes?.tipo === 'empresa' || !!cotizacion.crm_clientes?.crm_empresas_clientes
  const [vista, setVista] = useState<'galeria' | 'lista'>(esB2B ? 'lista' : 'galeria')
  const [modalImpactoAbierto, setModalImpactoAbierto] = useState(false)
  const [limiteDescargasAbierto, setLimiteDescargasAbierto] = useState(false)
  const [menuCompartirAbierto, setMenuCompartirAbierto] = useState(false)
  const [imagenZoom, setImagenZoom] = useState<{ url: string; titulo: string } | null>(null)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const [localAperturaId, setLocalAperturaId] = useState<string | null>(aperturaId)

  useEffect(() => {
    // Si ya tenemos aperturaId del SSR (o cache), no volver a llamar a track. 
    // Aunque con la nueva refactorización siempre viene null al principio.
    if (!token || localAperturaId) return
    
    // Llamar al endpoint asincrónico para registrar la visita sin bloquear renderizado
    fetch(`/api/cotizador/propuesta/${token}/track`, { method: 'POST', keepalive: true })
      .then(res => res.json())
      .then(data => {
        if (data.aperturaId) setLocalAperturaId(data.aperturaId)
      })
      .catch(console.error)
  }, [token, localAperturaId])

  // Tiempo de permanencia — se envía por sendBeacon
  useEffect(() => {
    if (!localAperturaId) return
    const inicio = Date.now()
    let enviado = false
    function enviarDuracion() {
      if (enviado) return
      enviado = true
      const duracion_seg = Math.round((Date.now() - inicio) / 1000)
      const payload = JSON.stringify({ apertura_id: localAperturaId, duracion_seg })
      navigator.sendBeacon?.(`/api/cotizador/propuesta/${token}/tiempo`, new Blob([payload], { type: 'application/json' }))
    }
    function handleVisibility() {
      if (document.visibilityState === 'hidden') enviarDuracion()
    }
    window.addEventListener('pagehide', enviarDuracion)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('pagehide', enviarDuracion)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [localAperturaId, token])

  const tp = isDark ? 'text-white' : 'text-[#474747]'
  const ts70 = isDark ? 'text-white/70' : 'text-[#474747]/70'
  const ts60 = isDark ? 'text-white/60' : 'text-[#474747]/60'
  const ts50 = isDark ? 'text-white/50' : 'text-[#474747]/50'
  const ts40 = isDark ? 'text-white/40' : 'text-[#474747]/40'
  const border = isDark ? 'border-white/10' : 'border-gray-100'

  const clienteNombre = cotizacion.crm_clientes?.nombre ?? 'Cliente'
  const esContactoReal = cotizacion.crm_clientes?.es_contacto_real ?? true
  let b2bNombre = null
  if (cotizacion.crm_clientes?.crm_empresas_clientes) {
    const emp = Array.isArray(cotizacion.crm_clientes.crm_empresas_clientes)
      ? cotizacion.crm_clientes.crm_empresas_clientes[0]
      : cotizacion.crm_clientes.crm_empresas_clientes
    b2bNombre = emp.nombre_comercial || emp.razon_social
  }
  const saludoNombre = esContactoReal ? clienteNombre : null
  // Nombre comercial en TODO lo visible (header, título, WhatsApp, alt de
  // imágenes) — la razón social es SOLO para el pie legal, ver más abajo.
  const empresaNombre = cotizacion.empresas?.nombre ?? 'Lurdes'
  const razonSocialFooter = cotizacion.empresas?.nombre_footer_propuesta ?? empresaNombre
  const logoUrl = cotizacion.empresas?.logo_url   // ya priorizado en page.tsx (PNG/WebP raster)
  const logoSvgUrl = cotizacion.empresas?.logo_svg_url ?? null   // vectorial, día/noche
  const logoAltoPx = Math.max(60, cotizacion.empresas?.logo_alto_minimo_px ?? 60)

  const mostrarMarcaReuso = cotizacion.empresas?.mostrar_marca_reuso ?? true

  // Impacto ambiental
  const co2 = Number(cotizacion.co2_evitado_total_kg)
  const agua = Number(cotizacion.agua_evitada_total_l)
  const arboles = Math.max(1, Math.round(co2 / (PARAM_EQUIV.CO2_arbol_anual_kg / 365)))
  const duchas = Math.round(agua / PARAM_EQUIV.litros_ducha_5min)

  // Valor: cuánto costaría nuevo vs. lo que se paga por restaurar. Solo se
  // cuentan los muebles con precio de mercado ya sugerido/confirmado —
  // comparar contra un precio nuevo faltante daría un porcentaje engañoso.
  // El "valor de la reparación" es precio_mueble (lo que el cliente paga,
  // ya incluye la cantidad), NUNCA el costo interno de servicios+insumos:
  // esta es una página pública, mostrar el costo interno revelaría el
  // margen de ganancia a cualquiera con el enlace.
  const mueblesConPrecioNuevo = muebles.filter(
    (m): m is Mueble & { precio_mercado_nuevo: number } =>
      m.precio_mercado_nuevo !== null && m.precio_mercado_nuevo > 0
  )
  const valorNuevoTotal = mueblesConPrecioNuevo.reduce((s, m) => s + m.precio_mercado_nuevo * m.cantidad, 0)
  const valorReparacionTotal = mueblesConPrecioNuevo.reduce((s, m) => s + Number(m.precio_mueble), 0)
  const porcentajeAhorro = valorNuevoTotal > 0
    ? Math.round(((valorNuevoTotal - valorReparacionTotal) / valorNuevoTotal) * 100)
    : 0
  const mostrarValor = mueblesConPrecioNuevo.length > 0 && valorNuevoTotal > valorReparacionTotal

  // Formato para modal de impacto ambiental
  const totalCO2Str = formatNumero(co2)

  const materialMap = new Map<string, number>()
  muebles.forEach((m) => {
    const qty = m.cantidad ?? 1
    if (Array.isArray(m.materiales_json) && m.materiales_json.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.materiales_json.forEach((mat: any) => {
        const nombre = mat.nombre || mat.material || mat.nombre_material
        const peso = Number(mat.peso_kg ?? mat.peso ?? 0)
        if (nombre && peso > 0) {
          materialMap.set(nombre, (materialMap.get(nombre) ?? 0) + peso * qty)
        }
      })
    } else if (m.peso_estandar_kg && Number(m.peso_estandar_kg) > 0) {
      const nombre = m.categoria || m.tipo_mueble || 'materiales del elemento'
      materialMap.set(nombre, (materialMap.get(nombre) ?? 0) + Number(m.peso_estandar_kg) * qty)
    }
  })

  let totalPeso = 0
  materialMap.forEach((peso) => { totalPeso += peso })
  const totalPesoStr = formatNumero(totalPeso)

  const fechaCreacion = cotizacion.created_at
    ? new Date(cotizacion.created_at).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : '-'
  const fechaMod = cotizacion.updated_at
    ? new Date(cotizacion.updated_at).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : '-'
  const fechaCreacionLarga = cotizacion.created_at
    ? new Date(cotizacion.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'
  const fechaValidezLarga = (() => {
    if (cotizacion.validez_modo === 'fecha' && cotizacion.validez_fecha) {
      return new Date(`${cotizacion.validez_fecha}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (!cotizacion.created_at) return '-'
    return new Date(new Date(cotizacion.created_at).getTime() + cotizacion.validez_dias * 86_400_000)
      .toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  })()



  const propuestaUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = encodeURIComponent(`Hola${saludoNombre ? ' ' + saludoNombre : ''}, aquí está tu propuesta de restauración: ${propuestaUrl}`)
  const shareUrl = `https://wa.me/?text=${shareText}`

  function registrarCompartido(medio: 'whatsapp' | 'correo') {
    const payload = JSON.stringify({ medio })
    navigator.sendBeacon?.(`/api/cotizador/propuesta/${token}/compartir`, new Blob([payload], { type: 'application/json' }))
  }
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`Tu propuesta de ${empresaNombre}`)}&body=${encodeURIComponent(`Hola${saludoNombre ? ' ' + saludoNombre : ''}, aquí está tu propuesta de restauración: ${propuestaUrl}`)}`
  const descargaUrl = `/api/cotizador/propuesta/${token}/pdf`

  async function handleDescargarPdf(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (descargandoPdf) return
    setDescargandoPdf(true)
    topLoader.start()

    try {
      const res = await fetch(descargaUrl)
      if (res.status === 429) {
        setLimiteDescargasAbierto(true)
        return
      }
      if (!res.ok) throw new Error('Error al generar la propuesta PDF')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `Cotizacion_${cotizacion.codigo_cotizacion}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
    } catch (err) {
      console.error('Error descargando la propuesta PDF:', err)
    } finally {
      topLoader.done()
      setDescargandoPdf(false)
    }
  }



  // Bloqueo de clic derecho/copiar/cortar/seleccionar texto: decisión de
  // seguridad a propósito, no un error — evita que un tercero copie fácil
  // el contenido de la cotización pública (precios, fotos). Confirmado
  // explícitamente con el usuario el 2026-08-11, no quitar sin volver a
  // preguntar.
  return (
    <div
      className={`min-h-screen flex flex-col justify-between font-sans transition-colors duration-300 select-none ${isDark ? 'bg-[#474747]' : 'bg-white'}`}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >

      {/* ── Barra superior Liquid Glass ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: isDark ? 'rgba(71, 71, 71, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(8px) saturate(180%)',
          WebkitBackdropFilter: 'blur(8px) saturate(180%)',
          padding: '10px 32px',
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Difuminado gris debajo del header, sin línea — se desvanece hacia
            transparente, sticky junto con el header (es su hijo). */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            height: 18,
            background: isDark
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.18), transparent)'
              : 'linear-gradient(to bottom, rgba(71,71,71,0.10), transparent)',
            pointerEvents: 'none',
          }}
        />
        <div className="flex items-center gap-3">
          {/* El logo REEMPLAZA el nombre — nunca se muestran los dos juntos.
              Sin logo, se ve el nombre comercial en texto. */}
          {logoSvgUrl ? (
            // De noche se fuerza el logo a blanco puro con un filtro CSS
            // (brightness(0) invert(1)): convierte cualquier trazo con
            // opacidad a negro sólido y lo invierte a blanco, sin importar de
            // qué color venga el SVG original — no hace falta una placa de
            // fondo ni saber si el archivo usa currentColor. <img>, no
            // next/image: un SVG cargado así no ejecuta scripts embebidos
            // (ver skill seguridad-reuso).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              draggable={false}
              src={logoSvgUrl}
              alt={empresaNombre}
              className="w-auto object-contain flex-shrink-0"
              style={{ height: logoAltoPx, ...(isDark ? { filter: 'brightness(0) invert(1)' } : {}) }}
            />
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              draggable={false}
              src={logoUrl}
              alt={empresaNombre}
              className="w-auto object-contain flex-shrink-0 rounded-[8px]"
              style={{ height: logoAltoPx }}
            />
          ) : (
            <span className={`text-base font-semibold ${tp}`}>{empresaNombre}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {/* Switch Galería / Lista */}
          <div className={`flex items-center p-0.5 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
            <button
              type="button"
              onClick={() => setVista('galeria')}
              className={`w-9 h-9 rounded-full flex items-center justify-center relative cursor-pointer transition-all duration-200 ${
                vista === 'galeria'
                  ? isDark
                    ? 'bg-[#00827C] text-white shadow-xs'
                    : 'bg-white text-[#00827C] shadow-sm'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
              }`}
              aria-label="Galería"
            >
              <GridIcon size={18} strokeWidth={2.5} />
              <span className="legal-tooltip legal-tooltip--bottom">Galería</span>
            </button>
            <button
              type="button"
              onClick={() => setVista('lista')}
              className={`w-9 h-9 rounded-full flex items-center justify-center relative cursor-pointer transition-all duration-200 ${
                vista === 'lista'
                  ? isDark
                    ? 'bg-[#00827C] text-white shadow-xs'
                    : 'bg-white text-[#00827C] shadow-sm'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
              }`}
              aria-label="Lista"
            >
              <List size={18} strokeWidth={2.5} />
              <span className="legal-tooltip legal-tooltip--bottom">Lista</span>
            </button>
          </div>

          {/* Descargar */}
          <button
            type="button"
            onClick={handleDescargarPdf}
            disabled={descargandoPdf}
            className="legal-header-btn disabled:opacity-50"
            aria-label="Descargar propuesta"
          >
            {descargandoPdf ? <CircleNotch size={18} className="animate-spin" /> : <Download size={18} />}
            <span className="legal-tooltip legal-tooltip--bottom">
              {descargandoPdf ? 'Generando...' : 'Descargar'}
            </span>
          </button>

          {/* Compartir — WhatsApp o Correo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuCompartirAbierto(v => !v)}
              className="legal-header-btn"
              aria-label="Compartir propuesta"
            >
              <Share2 size={18} />
              <span className="legal-tooltip legal-tooltip--bottom">Compartir</span>
            </button>
            {menuCompartirAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuCompartirAbierto(false)} />
                <div
                  className={`absolute right-0 top-[calc(100%+8px)] z-50 min-w-[170px] rounded-2xl border overflow-hidden ${
                    isDark ? 'bg-[#2a2a2a] border-white/15' : 'bg-white border-black/10'
                  }`}
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
                >
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { registrarCompartido('whatsapp'); setMenuCompartirAbierto(false) }}
                    className={`flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${isDark ? 'text-white hover:bg-white/10' : 'text-[#474747] hover:bg-black/5'}`}
                  >
                    <WhatsappLogo size={16} /> WhatsApp
                  </a>
                  <a
                    href={mailtoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { registrarCompartido('correo'); setMenuCompartirAbierto(false) }}
                    className={`flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${isDark ? 'text-white hover:bg-white/10' : 'text-[#474747] hover:bg-black/5'}`}
                  >
                    <Mail size={16} /> Correo
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">

        {vista === 'lista' ? (
          (() => {
            const cli = cotizacion.crm_clientes
            const empInfo = cli?.crm_empresas_clientes
              ? (Array.isArray(cli.crm_empresas_clientes) ? cli.crm_empresas_clientes[0] : cli.crm_empresas_clientes)
              : null
            return (
              <VistaCot
                codigoCotizacion={cotizacion.codigo_cotizacion}
                fechaLarga={fechaCreacionLarga}
                clienteNombre={clienteNombre}
                clienteApellido={cotizacion.crm_clientes?.apellido ?? null}
                clienteIdentificacion={cotizacion.crm_clientes?.identificacion ?? null}
                clienteTelefono={cotizacion.crm_clientes?.telefono ?? null}
                clienteTelefonoIndicativo={cotizacion.crm_clientes?.telefono_indicativo ?? null}
                clienteDireccion={cotizacion.crm_clientes?.direccion ?? null}
                clienteEmail={cotizacion.crm_clientes?.email ?? null}
                clienteTipo={cotizacion.crm_clientes?.tipo ?? (empInfo ? 'empresa' : 'persona')}
                esContactoReal={esContactoReal}
                empresaRazonSocial={empInfo?.razon_social ?? empInfo?.nombre_comercial ?? null}
                empresaNit={empInfo?.nit ?? null}
                empresaDireccion={empInfo?.direccion ?? null}
            muebles={muebles}
            subtotal={Number(cotizacion.subtotal)}
            descuentoActivo={cotizacion.descuento_activo}
            descuento={Number(cotizacion.descuento)}
            descuentoTipo={cotizacion.descuento_tipo}
            transporteActivo={cotizacion.transporte_activo}
            transporteValor={Number(cotizacion.transporte_valor)}
            ivaActivo={cotizacion.iva_activo}
            ivaPorcentaje={Number(cotizacion.iva_porcentaje)}
            validezActiva={cotizacion.validez_activa && cotizacion.validez_mostrar_lista !== false}
            fechaValidezLarga={fechaValidezLarga}
            observaciones={cotizacion.nota_mostrar_lista !== false ? cotizacion.observaciones : null}
            anticipoActivo={cotizacion.anticipo_activo}
            anticipoPorcentaje={cotizacion.anticipo_porcentaje}
            formaPagoActivo={cotizacion.forma_pago_activo && cotizacion.forma_pago_mostrar_lista !== false}
            formaPagoTipo={cotizacion.forma_pago_tipo}
            formaPagoDias={cotizacion.forma_pago_dias}
            tiempoEntregaActivo={cotizacion.tiempo_entrega_activo !== false && cotizacion.tiempo_entrega_mostrar_lista !== false}
            tiempoEntrega={cotizacion.tiempo_entrega}
            garantiaActivo={cotizacion.garantia_activo !== false && cotizacion.garantia_mostrar_lista !== false}
            garantiaTexto={cotizacion.garantia}
            envioGratisActivo={!!cotizacion.envio_gratis_activo && cotizacion.envio_gratis_mostrar_lista !== false}
            envioGratisTexto={cotizacion.envio_gratis_texto}
            envioGratisIcono={cotizacion.envio_gratis_icono}
            destacados={(cotizacion.destacados_json ?? []).filter(d => d.mostrar_lista !== false)}
            onVerImagen={(url, titulo) => setImagenZoom({ url, titulo })}
            total={Number(cotizacion.total)}
            isDark={isDark}
            token={token}
            onDescargarPdf={handleDescargarPdf}
            descargandoPdf={descargandoPdf}
          />
            )
          })()
        ) : (
          <>

        {/* ── Encabezado ── */}
        <div className="text-center mb-10 print:hidden">
          <h1 className={`text-3xl md:text-4xl font-bold mb-1 ${tp}`}>{b2bNombre || saludoNombre ? `Hola ${b2bNombre || saludoNombre},` : 'Hola,'}</h1>
          <p className={`text-base ${ts60}`}>Tenemos lista tu cotización:</p>
        </div>

        {/* ── Muebles ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12 lg:gap-14 mb-12">
          {muebles.map((m, index) => {
            const tituloMueble = m.titulo || m.tipo_mueble
            const isLastOdd = muebles.length % 2 !== 0 && index === muebles.length - 1
            
            return (
            <div 
              key={m.id} 
              className={`flex gap-5 items-start ${isLastOdd ? 'sm:col-span-2 sm:justify-self-center sm:w-[calc(50%-1rem)] md:w-[calc(50%-1.5rem)] lg:w-[calc(50%-1.75rem)]' : ''}`}
            >
              {m.imagen_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  draggable={false}
                  src={m.imagen_url}
                  alt={tituloMueble}
                  loading="lazy"
                  onClick={() => setImagenZoom({ url: m.imagen_url!, titulo: tituloMueble })}
                  className="w-28 sm:w-36 h-28 sm:h-36 object-cover object-center rounded-[10px] flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className={`w-28 sm:w-36 h-28 sm:h-36 rounded-[10px] flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-[#F5FAFA]'}`}>
                  <ArrowsCounterClockwise size={22} className="text-[#00827C]/30" />
                </div>
              )}
              <div className="min-w-0">
                <p className={`text-base font-semibold ${tp}`}>{tituloMueble}</p>
                {m.descripcion && (
                  <p className={`text-sm mt-0.5 ${ts60}`}>{m.descripcion}</p>
                )}
                <p className={`text-base font-medium mt-1 ${tp}`}>{formatCOPCompact(Number(m.precio_mueble))}</p>
              </div>
            </div>
            )
          })}
        </div>

        {/* ── Inversión — el desglose va primero, el total (Inversión) va al
            final, después de sumar todo. El transporte nunca aparece como
            línea aparte: se reparte entre los muebles para dar la sensación
            de que va incluido, así que el Subtotal ya lo lleva sumado
            (descuento e IVA sí se muestran siempre explícitos). ── */}
        <div className={`text-center ${cotizacion.transporte_activo ? 'mb-10' : 'mb-4'}`}>
          <p className={`text-base font-semibold mb-2 ${tp}`}>Inversión</p>
          {(() => {
            const desglose = calcularDesglose({
              subtotal: Number(cotizacion.subtotal),
              transporte_activo: cotizacion.transporte_activo,
              transporte_valor: Number(cotizacion.transporte_valor),
              descuento_activo: cotizacion.descuento_activo,
              descuento: Number(cotizacion.descuento),
              descuento_tipo: cotizacion.descuento_tipo,
              iva_activo: cotizacion.iva_activo,
              iva_porcentaje: Number(cotizacion.iva_porcentaje),
            })
            const hayDesglose = desglose.descuentoMonto > 0 || cotizacion.iva_activo
            return (
              <>
                {hayDesglose && (
                  <div className={`text-sm mb-1 space-y-0.5 ${ts60}`}>
                    <p>Subtotal: {formatCOPCompact(desglose.subtotal + desglose.transporte)}</p>
                    {desglose.descuentoMonto > 0 && (
                      <p>Descuento{cotizacion.descuento_tipo === 'porcentaje' ? ` (${cotizacion.descuento} %)` : ''}: - {formatCOPCompact(desglose.descuentoMonto)}</p>
                    )}
                    {cotizacion.iva_activo && <p>IVA ({cotizacion.iva_porcentaje} %): {formatCOPCompact(desglose.ivaMonto)}</p>}
                  </div>
                )}
                <p className={`text-4xl font-bold ${tp}`}>{formatCOPCompact(Number(cotizacion.total))}</p>
              </>
            )
          })()}
        </div>

        {/* ── Recogemos y entregamos gratis — ubicación fija, independiente
            del aviso automático de transporte de abajo y de Mensajes
            destacados (que va al final, junto a Garantía). ── */}
        {cotizacion.envio_gratis_activo && cotizacion.envio_gratis_mostrar_galeria !== false && (
          <div className="flex items-center justify-center gap-2 text-base my-10">
            <DynamicIcon nombre={cotizacion.envio_gratis_icono} size={18} className="text-[#38B98E]" />
            <span
              className="text-[#38B98E] font-medium"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(conPuntoFinal(cotizacion.envio_gratis_texto || 'Recogemos y entregamos Gratis')), NOTA_SANITIZE_CONFIG) }}
            />
          </div>
        )}

        {/* ── Transporte de recogida/entrega (servicio, no el costo de flete) ── */}
        {!cotizacion.transporte_activo && (
          <div className={`flex items-center justify-center gap-2 text-sm mb-10 py-3 ${ts50}`}>
            <ArrowsCounterClockwise size={16} className={ts40} />
            Transporte de recogida y entrega sin costo
          </div>
        )}
          </>
        )}

        {/* ── Módulos exclusivos de la vista Galería ── */}
        <div className="print:hidden">
          {vista === 'galeria' && (
          <>
            {/* 1. Forma de pago (diseño original obligatorio) */}
            {cotizacion.forma_pago_activo && cotizacion.forma_pago_mostrar_galeria !== false && (cotizacion.forma_pago_tipo === 'dias' ? (
              <div className="mb-6 text-center">
                <p className={`text-sm font-semibold mb-1 ${tp}`}>Forma de pago</p>
                <p className={`text-sm ${ts50}`}>A {cotizacion.forma_pago_dias ?? 30} días.</p>
              </div>
            ) : cotizacion.anticipo_activo ? (
              <div className="mb-6">
                <div className="text-center mb-3">
                  <p className={`text-sm font-semibold ${tp}`}>Forma de pago</p>
                </div>
                <div className="flex items-center justify-center gap-10 text-center">
                  {(() => {
                    const { anticipo, restante } = calcularAnticipo(Number(cotizacion.total), Number(cotizacion.anticipo_porcentaje))
                    return (
                      <>
                        <div>
                          <p className={`text-xs ${ts50}`}>Anticipo · {cotizacion.anticipo_porcentaje} %</p>
                          <p className={`text-2xl font-bold mt-0.5 ${tp}`}>{formatCOPCompact(anticipo)}</p>
                        </div>
                        <div className={`w-px h-10 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                        <div>
                          <p className={`text-xs ${ts50}`}>A la entrega</p>
                          <p className={`text-2xl font-bold mt-0.5 ${tp}`}>{formatCOPCompact(restante)}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <div className="mb-6 text-center">
                <p className={`text-sm font-semibold mb-1 ${tp}`}>Forma de pago</p>
                <p className={`text-sm ${ts50}`}>Contado a la entrega.</p>
              </div>
            ))}

            {/* 2. Nota: singular "Nota", contenido en la misma línea tras los dos puntos. Sin punto forzado al final */}
            {cotizacion.observaciones && cotizacion.nota_mostrar_galeria !== false && (
              <div className="text-center mt-6 mb-4">
                <div className={`text-sm ${ts50} inline-flex items-center justify-center gap-1.5 flex-wrap`}>
                  <ChatCircle size={15} className="flex-shrink-0" />
                  <span className={`font-semibold ${tp}`}>Nota:</span>
                  <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(cotizacion.observaciones), NOTA_SANITIZE_CONFIG) }} />
                </div>
              </div>
            )}

            {/* 3. Validez de la oferta: con punto al final */}
            {cotizacion.validez_activa && cotizacion.validez_mostrar_galeria !== false && (
              <div className="text-center mt-4 mb-4">
                <div className={`text-sm ${ts50} inline-flex items-center justify-center gap-1.5 flex-wrap`}>
                  <Calendar size={15} className="flex-shrink-0" />
                  <span className={`font-semibold ${tp}`}>Validez de la oferta:</span>
                  <span>Válida hasta el {fechaValidezLarga}.</span>
                </div>
              </div>
            )}

            {/* 4. Tiempo de la entrega: con punto al final */}
            {cotizacion.tiempo_entrega_activo !== false && cotizacion.tiempo_entrega_mostrar_galeria !== false && (
              <div className="text-center mt-4 mb-4">
                <div className={`text-sm ${ts50} inline-flex items-center justify-center gap-1.5 flex-wrap`}>
                  <Clock size={15} className="flex-shrink-0" />
                  <span className={`font-semibold ${tp}`}>Tiempo de la entrega:</span>
                  <span>
                    {(cotizacion.tiempo_entrega || '25 a 30 días hábiles').endsWith('.')
                      ? (cotizacion.tiempo_entrega || '25 a 30 días hábiles')
                      : `${cotizacion.tiempo_entrega || '25 a 30 días hábiles'}.`}
                  </span>
                </div>
              </div>
            )}

            {/* 5. Garantía: sin punto forzado al final */}
            {cotizacion.garantia_activo !== false && cotizacion.garantia_mostrar_galeria !== false && cotizacion.garantia && (
              <div className="text-center mt-4 mb-6">
                <div className={`text-sm ${ts50} inline-flex items-center justify-center gap-1.5 flex-wrap`}>
                  <ShieldCheck size={15} className="flex-shrink-0" />
                  <span className={`font-semibold ${tp}`}>Garantía:</span>
                  <span>{cotizacion.garantia}</span>
                </div>
              </div>
            )}

            {/* 6. Mensajes destacados: lista común, va al final, debajo de lo preestablecido, sin color especial */}
            {(() => {
              const destacadosGaleria = (cotizacion.destacados_json ?? []).filter(d => d.mostrar_galeria !== false)
              return destacadosGaleria.length > 0 && (
                <div className="flex flex-col items-center gap-2 mt-4 mb-6">
                  {destacadosGaleria.map((d, i) => (
                    <div key={i} className={`text-sm ${ts50} inline-flex items-center justify-center gap-1.5 flex-wrap`}>
                      <DynamicIcon nombre={d.icono} size={15} className="flex-shrink-0" />
                      <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(d.texto), NOTA_SANITIZE_CONFIG) }} />
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Línea divisoria y Descarga tu cotización (Vista Galería) */}
            <div className={`pt-6 pb-6 border-t mb-10 text-center ${border}`}>
              <button
                type="button"
                onClick={handleDescargarPdf}
                disabled={descargandoPdf}
                className={`inline-flex items-center gap-1.5 text-sm underline ${ts50} hover:opacity-80 transition-colors disabled:opacity-50 cursor-pointer`}
              >
                {descargandoPdf ? <CircleNotch size={14} className="animate-spin" /> : <Download size={14} />}
                {descargandoPdf ? 'Generando PDF...' : 'Descarga tu cotización'}
              </button>
            </div>
          </>
          )}
        </div>

        {/* ── A partir de aquí, mismos módulos en ambas vistas (propuesta y
            cotización): impacto ambiental, aprobación y por qué elegirnos. ── */}

        {/* ── Valor: nuevo vs. restaurado — encima del impacto ambiental,
            a pedido explícito del usuario (2026-08-27), sacado del plan de
            Reportes V2 para construirlo ahora, suelto. Solo aparece si al
            menos un mueble tiene precio de mercado nuevo confirmado o
            sugerido; "valor de la reparación" es SIEMPRE precio_mueble (lo
            que paga el cliente), nunca el costo interno de servicios+insumos
            — esta es una página pública, mostrar el costo interno revelaría
            el margen de ganancia a cualquiera con el enlace. */}
        {mostrarValor && (
          <div className="mb-10 print:hidden">
            <div className="text-center mb-5">
              <h2 className={`text-xl font-bold ${tp}`}>Tu ahorro frente a comprar nuevo</h2>
              <p className={`text-sm mt-0.5 ${ts50}`}>Comparado con el precio de mercado de un producto nuevo equivalente</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`rounded-[16px] p-5 flex items-center gap-3 ${isDark ? 'bg-white/5' : 'bg-[#474747]/[0.03]'}`}>
                <div className={`w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-[#474747]/08'}`}>
                  <Tag size={26} className={tp} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tp}`}>Nuevo, en el mercado</p>
                  <p className={`text-2xl font-bold leading-tight ${tp}`}>{formatCOPCompact(valorNuevoTotal)}</p>
                </div>
              </div>
              <div className={`rounded-[16px] p-5 flex items-center gap-3 ${isDark ? 'bg-[#00827C]/10' : 'bg-[#00827C]/[0.04]'}`}>
                <div className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#00827C]/12">
                  <Hammer size={26} className="text-[#00827C]" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tp}`}>Restaurado, con nosotros</p>
                  <p className={`text-2xl font-bold leading-tight ${tp}`}>{formatCOPCompact(valorReparacionTotal)}</p>
                </div>
              </div>
              <div className={`rounded-[16px] p-5 flex items-center gap-3 ${isDark ? 'bg-[#38B98E]/10' : 'bg-[#38B98E]/[0.06]'}`}>
                <div className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#38B98E]/15">
                  <TrendDown size={26} className="text-[#38B98E]" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tp}`}>Ahorras</p>
                  <p className="text-2xl font-bold leading-tight text-[#38B98E]">{porcentajeAhorro}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Impacto ambiental — cada tarjeta cuenta UNA historia completa:
            "ahorras X" y a qué equivale, conectados por una flecha, en vez
            de dos cifras sueltas una al lado de la otra. ── */}
        <div className="mb-10 print:hidden">
          <div className="text-center mb-5">
            <h2 className={`text-xl font-bold ${tp}`}>Tu decisión le hace bien al planeta</h2>
            <p className={`text-sm mt-0.5 ${ts50}`}>Esto es lo que evitas al elegir restaurar en vez de comprar nuevo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta 1: CO2 → árboles — dos filas del mismo peso visual */}
            <div className={`rounded-[16px] p-5 flex flex-col gap-3 ${isDark ? 'bg-[#00827C]/10' : 'bg-[#00827C]/[0.04]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#00827C]/12">
                  <ArrowsCounterClockwise size={26} className="text-[#00827C]" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tp}`}>Ahorras</p>
                  <p className={`text-2xl font-bold leading-tight ${tp}`}>
                    {Math.round(co2)}
                  </p>
                  <p className={`text-sm ${ts60}`}>kg de CO<sub>2</sub> eq
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <div className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#00827C]/12">
                  <Tree size={26} className="text-[#00827C]" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tp}`}>Equivale a</p>
                  <p className={`text-2xl font-bold leading-tight ${tp}`}>
                    {arboles}
                  </p>
                  <p className={`text-sm ${ts60}`}>{arboles === 1 ? 'árbol' : 'árboles'} absorbiendo CO₂ en 1 día
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: agua → duchas — dos filas del mismo peso visual */}
            <div className={`rounded-[16px] p-5 flex flex-col gap-3 ${isDark ? 'bg-[#59A6E4]/10' : 'bg-[#59A6E4]/[0.05]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#59A6E4]/12">
                  <Drop size={26} className="text-[#59A6E4]" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tp}`}>Ahorras</p>
                  <p className={`text-2xl font-bold leading-tight ${tp}`}>
                    {formatEnteroMillones(Math.round(agua))}
                  </p>
                  <p className={`text-sm ${ts60}`}>litros de agua
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <div className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#59A6E4]/12">
                  <Bathtub size={26} className="text-[#59A6E4]" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tp}`}>Equivale a</p>
                  <p className={`text-2xl font-bold leading-tight ${tp}`}>
                    {duchas}
                  </p>
                  <p className={`text-sm ${ts60}`}>{duchas === 1 ? 'ducha' : 'duchas'} de 5 min
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right mt-2">
            <button
              type="button"
              onClick={() => setModalImpactoAbierto(true)}
              className={`text-xs ${ts50} hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors`}
            >
              <Question size={13} /> ¿Cómo lo medimos?
            </button>
          </div>
        </div>

        {/* ── Propuesta Aceptada badge (si aplica) ── */}
        {aceptada && (
          <div className="text-center mb-10 print:hidden">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#38B98E]/10 text-[#38B98E] font-semibold">
              <CheckCircle size={20} />
              Propuesta aceptada - Te contactamos pronto
            </div>
          </div>
        )}

        {/* ── ¿Por qué elegirnos? (solo vista galería) — 100% personalizable
            desde /admin/empresas. No hay contenido por defecto: si la
            empresa no la configuró, la sección simplemente no se muestra. ── */}
        {vista === 'galeria' && cotizacion.empresas?.por_que_elegirnos_json && (() => {
          const config = cotizacion.empresas.por_que_elegirnos_json
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-stretch">
              <div>
                <h2 className={`text-xl font-bold mb-2 ${tp}`}>¿Por qué elegirnos?</h2>
                <p className={`text-sm mb-4 ${ts70}`} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(config.parrafo), NOTA_SANITIZE_CONFIG) }} />
                <ul className="space-y-2">
                  {config.bullets.map((item, idx) => (
                    <li key={idx} className={`flex items-start gap-2 text-sm ${ts70}`}>
                      <CheckCircle size={16} className="text-[#00827C] flex-shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(item), NOTA_SANITIZE_CONFIG) }} />
                    </li>
                  ))}
                </ul>
              </div>
              <ImagenPorQueElegirnos url={config.imagen_url} alt={empresaNombre} isDark={isDark} posicion={config.imagen_posicion} />
            </div>
          )
        })()}

        {/* ── Metadatos ── */}
        <div className={`flex justify-between text-xs pt-4 mb-6 ${ts40}`}>
          <div>
            <p>
              {formatCodigoCotizacion(cotizacion.codigo_cotizacion)}
            </p>
            <p>Versión N.º {cotizacion.version}</p>
          </div>
          <div className="text-right">
            <p>Fecha de creación: {fechaCreacion}</p>
            <p>Última modificación: {fechaMod}</p>
          </div>
        </div>

      </main>

      {/* ── Legales: párrafos libres, sin íconos, antes del pie de página ── */}
      <div className="w-full mb-6 mt-4">
        <div className={`max-w-5xl mx-auto px-4 md:px-6 flex flex-col gap-1.5 text-sm text-center ${ts50}`}>
          {(cotizacion.legales_json?.length ? cotizacion.legales_json : [LEGAL_TEXTO_DEFECTO]).map((texto, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderLegalTexto(texto), LEGAL_SANITIZE_CONFIG) }} />
          ))}
        </div>
      </div>

      {/* ── Pie de página ── */}
      <footer
        className="text-xs px-4 md:px-8 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300 print:hidden"
        style={{
          background: isDark
            ? 'linear-gradient(0deg, rgba(214,243,145,0.06) 0%, transparent 100%)'
            : 'linear-gradient(0deg, rgba(214,243,145,0.2) 0%, transparent 100%)',
        }}
      >
        <div className={`flex flex-col gap-1 text-center md:text-left ${ts60}`}>
          <span>© Todos los derechos reservados. {razonSocialFooter}</span>
          {mostrarMarcaReuso && (
            <span className={ts40}>
              Hecho desde la{' '}
              <a
                href="https://reuso.lurdes.co"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-inherit"
              >
                Calculadora de Reúso
              </a>
            </span>
          )}
        </div>

        <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right max-w-md w-full md:w-auto">
          <span className={ts60}>
            Esta propuesta es solo para ti. No puedes compartir su contenido ni usarla con fines comerciales sin autorización.
          </span>
          <button
            type="button"
            onClick={() => {
              const next = !isDark
              document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
              localStorage.setItem('theme', next ? 'dark' : 'light')
            }}
            className="p-1.5 rounded-full hover-pop hover-press transition-opacity opacity-70 hover:opacity-100 cursor-pointer"
            aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={isDark ? 'Modo día' : 'Modo noche'}
          >
            {isDark ? (
              <Sun size={18} strokeWidth={2} className="text-[#F6BF3E]" />
            ) : (
              <Moon size={18} strokeWidth={2} className="text-[var(--text-secondary)]" />
            )}
          </button>
        </div>
      </footer>

      {/* ── Modal unificado ¿Cómo calculamos tu impacto? ── */}
      <Modal
        abierto={modalImpactoAbierto}
        onClose={() => setModalImpactoAbierto(false)}
        icono={null}
        titulo="¿Cómo calculamos tu impacto?"
        tituloCentrado
        ancho="lg"
        textoCancelar="Entendido"
        textoConfirmar="Ver metodología"
        onCancelar={() => setModalImpactoAbierto(false)}
        onConfirmar={() => {
          window.open('/legal/medicion', '_blank')
          setModalImpactoAbierto(false)
        }}
      >
        <div 
          className="flex flex-col sm:flex-row gap-5 sm:gap-6 mt-1 sm:-mt-1 select-none"
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onPaste={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Columna Izquierda: Datos */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Tabla de Materiales */}
            {materialMap.size > 0 && (
              <div className="mb-4 rounded-[12px] overflow-hidden border border-[var(--border)] shadow-sm bg-[var(--bg-card)]">
                <table className="w-full text-left border-collapse text-[11.5px]">
                  <thead>
                    <tr className="bg-[var(--bg-table-header)] border-b border-[var(--border)]">
                      <th className="py-2 px-3 font-semibold text-[var(--color-brand)]">Material recuperado</th>
                      <th className="py-2 px-3 font-semibold text-[var(--color-brand)] text-right w-[100px]">Peso estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(materialMap.entries()).map(([nombre, peso], idx) => (
                      <tr 
                        key={idx}
                        className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-table-hover)] transition-colors ${
                          idx % 2 !== 0 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                        }`}
                      >
                        <td className="py-1.5 px-3 text-[var(--text-primary)] font-medium capitalize">
                          {nombre}
                        </td>
                        <td className="py-1.5 px-3 text-[var(--text-primary)] font-bold text-right">
                          {formatNumero(peso)} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ecuación Visual */}
            <div className="flex items-center justify-between gap-1 p-3 sm:p-4 rounded-[16px] bg-gradient-to-br from-[var(--bg-hover)] to-[var(--bg-card)] border border-[var(--border)] shadow-sm relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-[var(--color-brand)]/10 blur-2xl rounded-full" />
              
              <div className="flex flex-col items-center flex-1 relative z-10">
                <span className="text-xl font-black text-[var(--text-primary)] leading-none mb-1">{totalPesoStr}</span>
                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Kilos</span>
                <span className="text-[9px] font-medium text-[var(--text-secondary)] opacity-80 leading-none mt-0.5">recuperados</span>
              </div>

              <div className="text-[var(--color-brand)] opacity-50 font-black text-lg relative z-10 mb-1">
                ×
              </div>

              <div className="flex flex-col items-center flex-1 relative z-10">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-brand)]/10 mb-1">
                  <Leaf size={12} className="text-[var(--color-brand)]" />
                </div>
                <span className="text-[9px] uppercase font-bold text-[var(--text-primary)] tracking-wider">Impacto</span>
                <span className="text-[9px] font-medium text-[var(--text-secondary)] opacity-80 leading-none mt-0.5">por material</span>
              </div>

              <div className="text-[var(--color-brand)] opacity-50 relative z-10 mb-1">
                <Equal size={14} strokeWidth={3} />
              </div>

              <div className="flex flex-col items-center flex-1 relative z-10">
                <span className="text-xl font-black text-[var(--color-brand)] leading-none mb-1">{totalCO2Str}</span>
                <span className="text-[9px] uppercase font-bold text-[var(--text-primary)] tracking-wider">CO₂</span>
                <span className="text-[9px] font-medium text-[var(--color-brand)] opacity-80 leading-none mt-0.5">evitado</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Explicación */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Timeline de Pasos */}
            <div className="relative px-2 sm:px-4 space-y-1">
              <div className="absolute left-[24px] sm:left-[32px] top-4 bottom-4 w-px bg-gradient-to-b from-[var(--color-brand)]/60 via-[var(--color-brand)]/30 to-transparent" />

              {/* Paso 1 */}
              <div className="group relative flex items-start gap-3 p-1.5 -mx-1.5 rounded-2xl hover:bg-[var(--bg-hover)] transition-all duration-300 cursor-default">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-card)] border-2 border-[var(--color-brand)]/30 group-hover:border-[var(--color-brand)] group-hover:bg-[var(--color-brand)] shadow-sm flex-shrink-0 z-10 transition-all duration-300">
                  <ScanSearch size={14} className={`text-[var(--color-brand)] ${isDark ? 'group-hover:text-[#1c1c1c]' : 'group-hover:text-white'} transition-colors duration-300`} />
                </div>
                <div className="flex flex-col gap-0.5 pt-1">
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">1. ¿De qué está hecho?</span>
                  <span className="text-[12px] text-[var(--text-secondary)] leading-relaxed pr-2">Vemos los materiales principales de tus elementos para saber exactamente qué estamos salvando.</span>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="group relative flex items-start gap-3 p-1.5 -mx-1.5 rounded-2xl hover:bg-[var(--bg-hover)] transition-all duration-300 cursor-default">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-card)] border-2 border-[var(--color-brand)]/30 group-hover:border-[var(--color-brand)] group-hover:bg-[var(--color-brand)] shadow-sm flex-shrink-0 z-10 transition-all duration-300">
                  <Scale size={14} className={`text-[var(--color-brand)] ${isDark ? 'group-hover:text-[#1c1c1c]' : 'group-hover:text-white'} transition-colors duration-300`} />
                </div>
                <div className="flex flex-col gap-0.5 pt-1">
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">2. ¿Cuánto pesa?</span>
                  <span className="text-[12px] text-[var(--text-secondary)] leading-relaxed pr-2">Estimamos el volumen que estás evitando desechar y que de otro modo terminaría en la basura.</span>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="group relative flex items-start gap-3 p-1.5 -mx-1.5 rounded-2xl hover:bg-[var(--bg-hover)] transition-all duration-300 cursor-default">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-card)] border-2 border-[var(--color-brand)]/30 group-hover:border-[var(--color-brand)] group-hover:bg-[var(--color-brand)] shadow-sm flex-shrink-0 z-10 transition-all duration-300">
                  <ShieldCheck size={14} className={`text-[var(--color-brand)] ${isDark ? 'group-hover:text-[#1c1c1c]' : 'group-hover:text-white'} transition-colors duration-300`} />
                </div>
                <div className="flex flex-col gap-0.5 pt-1">
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">3. ¿De dónde sale el dato?</span>
                  <span className="text-[12px] text-[var(--text-secondary)] leading-relaxed pr-2">Usamos matrices de <strong>Análisis de Ciclo de Vida (ACV)</strong> para estimar tu ahorro de forma estructurada.</span>
                </div>
              </div>
            </div>

            <p className="text-center sm:text-left text-[11px] leading-relaxed mt-5 pt-4 border-t border-[var(--border)] opacity-70 px-2 sm:px-4">
              Valores de referencia para evidenciar tu aporte al planeta. Conoce más sobre nuestras fuentes en la metodología.
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Modal límite de descargas ── */}
      <Modal
        abierto={limiteDescargasAbierto}
        onClose={() => setLimiteDescargasAbierto(false)}
        titulo="Superaste el límite de descargas"
        descripcion="Ya descargaste esta propuesta varias veces. Si necesitas otra copia, escríbenos y con gusto te la reenviamos."
        textoCancelar="Cerrar"
        textoConfirmar="Entendido"
        onCancelar={() => setLimiteDescargasAbierto(false)}
        onConfirmar={() => setLimiteDescargasAbierto(false)}
      />

      <ModalImagenZoom
        imagenUrl={imagenZoom?.url ?? null}
        onClose={() => setImagenZoom(null)}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .legal-header-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
        }

        [data-theme="light"] .legal-header-btn {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.5);
          color: #474747;
        }
        [data-theme="light"] .legal-header-btn:hover,
        [data-theme="light"] .legal-header-btn--active {
          background: rgba(0, 130, 124, 0.1);
          color: #00827C;
          border-color: rgba(0, 130, 124, 0.3);
        }

        [data-theme="dark"] .legal-header-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
        }
        [data-theme="dark"] .legal-header-btn:hover,
        [data-theme="dark"] .legal-header-btn--active {
          background: #D6F391;
          color: #474747;
          border-color: transparent;
        }

        .legal-tooltip {
          position: absolute;
          background: #ffffff;
          color: #474747;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transform: translateX(-50%) translateY(4px);
          transition: opacity 0.18s ease, transform 0.18s ease;
          z-index: 100;
        }

        [data-theme="dark"] .legal-tooltip {
          background: #2a2a2a;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        }
        
        .legal-tooltip--bottom {
          top: calc(100% + 8px);
          left: 50%;
        }

        .legal-header-btn:hover .legal-tooltip,
        button:hover .legal-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      ` }} />
    </div>
  )
}
