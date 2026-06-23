'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  ArrowUpRight, CheckCircle, ChatCircleText,
  Leaf, Drop, Tree, Bathtub, ArrowsCounterClockwise,
  Question,
} from '@phosphor-icons/react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Mueble {
  id: string
  tipo_mueble: string
  categoria: string
  oficios_json: { tapiceria?: boolean; pintura?: boolean; carpinteria_superficial?: boolean } | null
  precio_mueble: number
  co2_evitado_kg: number
  agua_evitada_l: number
  imagen_url: string | null
}

interface Cotizacion {
  id: string
  codigo_cotizacion: string
  estado: string
  subtotal: number
  descuento: number
  total: number
  co2_evitado_total_kg: number
  agua_evitada_total_l: number
  observaciones: string | null
  created_at?: string
  updated_at?: string
  crm_clientes: { nombre: string; telefono: string | null; email: string | null } | null
  empresas: {
    nombre: string
    logo_url: string | null
    nombre_footer_propuesta: string | null
    whatsapp_propuesta: string | null
    mostrar_marca_reuso: boolean
  } | null
}

interface Props {
  cotizacion: Cotizacion
  muebles: Mueble[]
  token: string
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const PARAM_CO2_ARBOL = 8.0
const PARAM_AGUA_DUCHA_5MIN = 50   // litros en ducha de 5 min

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCOPCompact(n: number): string {
  // "$2'420.000"
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}

function oficiosDesc(of: Mueble['oficios_json']): string {
  if (!of) return ''
  const lista: string[] = []
  if (of.tapiceria) lista.push('Tapizado en tela a elección')
  if (of.pintura) lista.push('Pintura natural')
  if (of.carpinteria_superficial) lista.push('Carpintería')
  return lista.join('. ') + (lista.length ? '.' : '')
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function PropuestaClient({ cotizacion, muebles, token }: Props) {
  const [aceptando, setAceptando] = useState(false)
  const [aceptada, setAceptada] = useState(
    cotizacion.estado === 'esperando_anticipo' || cotizacion.estado === 'cerrado_ganado'
  )
  const [errorAceptar, setErrorAceptar] = useState<string | null>(null)

  const clienteNombre = cotizacion.crm_clientes?.nombre ?? 'Cliente'
  const empresaNombre = cotizacion.empresas?.nombre_footer_propuesta ?? cotizacion.empresas?.nombre ?? 'Lurdes'
  const logoUrl = cotizacion.empresas?.logo_url   // ya priorizado en page.tsx
  const clienteTelRaw = cotizacion.crm_clientes?.telefono?.replace(/\D/g, '')
  // WhatsApp configurable: primero el de la empresa, luego el teléfono del cliente
  const waEmpresa = cotizacion.empresas?.whatsapp_propuesta
  const mostrarMarcaReuso = cotizacion.empresas?.mostrar_marca_reuso ?? true

  // Impacto ambiental
  const co2 = Number(cotizacion.co2_evitado_total_kg)
  const agua = Number(cotizacion.agua_evitada_total_l)
  const arboles = Math.max(1, Math.round(co2 / PARAM_CO2_ARBOL))
  const duchas = Math.round(agua / PARAM_AGUA_DUCHA_5MIN)

  // Número de propuesta a partir del código
  const numeroPropuesta = cotizacion.codigo_cotizacion.split('-').pop() ?? '-'
  const fechaCreacion = cotizacion.created_at
    ? new Date(cotizacion.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '-'
  const fechaMod = cotizacion.updated_at
    ? new Date(cotizacion.updated_at).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '-'

  async function aceptarPropuesta() {
    setAceptando(true)
    setErrorAceptar(null)
    try {
      const res = await fetch(`/api/cotizador/propuesta/${token}/aceptar`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErrorAceptar(d.error ?? 'No pudimos registrar tu aceptación. Intenta de nuevo.'); return }
      setAceptada(true)
    } catch {
      setErrorAceptar('Error de conexión. Intenta de nuevo.')
    } finally {
      setAceptando(false)
    }
  }

  const shareText = encodeURIComponent(`Hola ${clienteNombre}, aquí está tu propuesta de restauración: ${typeof window !== 'undefined' ? window.location.href : ''}`)
  const shareUrl = `https://wa.me/?text=${shareText}`

  // "Tengo dudas" usa el WhatsApp de la empresa si está configurado; si no, el teléfono del cliente; si no, ocultar
  const waDestino = waEmpresa ?? (clienteTelRaw ? `57${clienteTelRaw}` : null)
  const dudaUrl = waDestino
    ? `https://wa.me/${waDestino}?text=${encodeURIComponent(`Hola, tengo una duda sobre mi propuesta ${cotizacion.codigo_cotizacion} de ${empresaNombre}.`)}`
    : null

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Barra superior ── */}
      <header className="border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <Image src={logoUrl} alt={empresaNombre} width={40} height={40} className="rounded-[8px] object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-[8px] bg-[#00827C]/10 flex items-center justify-center">
              <Leaf size={20} weight="duotone" className="text-[#00827C]" />
            </div>
          )}
          <span className="text-base font-semibold text-[#474747]">{empresaNombre}</span>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[#474747]/70 hover:text-[#474747] transition-colors"
        >
          <ArrowUpRight size={16} weight="bold" />
          Compartir
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">

        {/* ── Encabezado ── */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[#474747] mb-1">Hola {clienteNombre},</h1>
          <p className="text-base text-[#474747]/60">Tenemos lista tu cotización:</p>
        </div>

        {/* ── Muebles ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {muebles.map((m) => (
            <div key={m.id} className="flex gap-3 items-start">
              {m.imagen_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imagen_url}
                  alt={m.tipo_mueble}
                  className="w-28 h-20 object-cover rounded-[8px] flex-shrink-0"
                />
              ) : (
                <div className="w-28 h-20 bg-[#F5FAFA] rounded-[8px] flex-shrink-0 flex items-center justify-center">
                  <ArrowsCounterClockwise size={22} className="text-[#00827C]/30" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#474747]">{m.tipo_mueble}</p>
                {oficiosDesc(m.oficios_json) && (
                  <p className="text-sm text-[#474747]/60 mt-0.5">{oficiosDesc(m.oficios_json)}</p>
                )}
                <p className="text-base font-medium text-[#474747] mt-1">{formatCOPCompact(Number(m.precio_mueble))}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Inversión ── */}
        <div className="text-center mb-4">
          <p className="text-base font-semibold text-[#474747] mb-1">Inversión:</p>
          <p className="text-4xl font-bold text-[#474747]">{formatCOPCompact(Number(cotizacion.subtotal))}</p>
          {Number(cotizacion.descuento) > 0 && (
            <p className="text-sm text-[#474747]/60 mt-1">Descuento: {formatCOPCompact(Number(cotizacion.descuento))}</p>
          )}
          {Number(cotizacion.descuento) > 0 && (
            <p className="text-sm font-semibold text-[#474747] mt-0.5">Total: {formatCOPCompact(Number(cotizacion.total))}</p>
          )}
          {cotizacion.observaciones && (
            <p className="text-sm text-[#474747]/50 mt-2 italic">{cotizacion.observaciones}</p>
          )}
        </div>

        {/* ── Transporte ── */}
        <div className="flex items-center justify-center gap-2 text-sm text-[#474747]/50 mb-10 border-t border-b border-gray-100 py-3">
          <ArrowsCounterClockwise size={16} weight="duotone" className="text-[#474747]/40" />
          Transporte de recogida y entrega sin costo
        </div>

        {/* ── Impacto ambiental ── */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-[#474747] text-center mb-4">Tu decisión le hace bien al planeta</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* CO2 */}
            <div className="border border-gray-200 rounded-[10px] p-4 text-center">
              <div className="flex items-center gap-1 text-xs text-[#474747]/50 mb-1 justify-center">
                <span>Evitas:</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <ArrowsCounterClockwise size={28} weight="duotone" className="text-[#00827C]" />
                <span className="text-3xl font-bold text-[#474747]">{co2 >= 1 ? co2.toFixed(0) : co2.toFixed(1)}</span>
              </div>
              <p className="text-xs text-[#474747]/60">
                kg de CO<sub>2</sub>
              </p>
            </div>
            {/* Árboles */}
            <div className="border border-gray-200 rounded-[10px] p-4 text-center">
              <div className="flex items-center gap-1 text-xs text-[#474747]/50 mb-1 justify-center">
                <span>Equivale a:</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Tree size={28} weight="duotone" className="text-[#38B98E]" />
                <span className="text-3xl font-bold text-[#474747]">{arboles}</span>
              </div>
              <p className="text-xs text-[#474747]/60">
                árboles tomando CO<sub>2</sub> en un día.
              </p>
            </div>
            {/* Agua */}
            <div className="border border-gray-200 rounded-[10px] p-4 text-center">
              <div className="flex items-center gap-1 text-xs text-[#474747]/50 mb-1 justify-center">
                <span>Evitas:</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Drop size={28} weight="duotone" className="text-[#59A6E4]" />
                <span className="text-3xl font-bold text-[#474747]">{agua >= 1000 ? agua.toLocaleString('es-CO') : agua.toFixed(0)}</span>
              </div>
              <p className="text-xs text-[#474747]/60">litros de agua</p>
            </div>
            {/* Duchas */}
            <div className="border border-gray-200 rounded-[10px] p-4 text-center">
              <div className="flex items-center gap-1 text-xs text-[#474747]/50 mb-1 justify-center">
                <span>Equivale a:</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bathtub size={28} weight="duotone" className="text-[#59A6E4]" />
                <span className="text-3xl font-bold text-[#474747]">{duchas}</span>
              </div>
              <p className="text-xs text-[#474747]/60">duchas de cinco minutos.</p>
            </div>
          </div>
          <div className="text-right mt-2">
            <a href="https://reuso.lurdes.co/legal/medicion" className="text-xs text-[#00827C] hover:underline inline-flex items-center gap-1">
              <Question size={13} /> ¿Cómo lo medimos?
            </a>
          </div>
        </div>

        {/* ── CTA aceptar ── */}
        <div className="text-center mb-10">
          {aceptada ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#38B98E]/10 text-[#38B98E] font-semibold">
              <CheckCircle size={20} weight="duotone" />
              Propuesta aceptada - Te contactamos pronto
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#474747] mb-4">{clienteNombre}, puedes aprobar esta propuesta:</h2>
              {errorAceptar && (
                <p className="text-sm text-[#FF5E4B] mb-3">{errorAceptar}</p>
              )}
              <button
                onClick={aceptarPropuesta}
                disabled={aceptando}
                className="px-8 py-3.5 rounded-full bg-[#00827C] text-white text-base font-semibold hover:bg-[#006B66] transition-colors disabled:opacity-60"
              >
                {aceptando ? 'Registrando...' : 'Quiero el servicio'}
              </button>
              {dudaUrl && (
                <div className="mt-4">
                  <a
                    href={dudaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#474747]/50 hover:text-[#474747] transition-colors"
                  >
                    <ChatCircleText size={16} weight="duotone" />
                    Tengo dudas
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── ¿Por qué elegirnos? ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-center">
          <div>
            <h2 className="text-xl font-bold text-[#474747] mb-2">¿Por qué elegirnos?</h2>
            <p className="text-sm text-[#474747]/70 mb-4">
              Restauramos muebles con amor: tapicería, pintura y carpintería hechos a mano, piezas únicas.
            </p>
            <ul className="space-y-2">
              {[
                'Alargamos la vida útil de tus muebles.',
                'Decoramos tu hogar reutilizando lo que ya tienes.',
                'Escuchamos la historia de cada pieza y la transformamos.',
                'Transporte de recogida y entrega sin costo.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#474747]/80">
                  <CheckCircle size={16} weight="duotone" className="text-[#00827C] flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {logoUrl && (
            <div className="flex justify-center">
              <Image
                src={logoUrl}
                alt={empresaNombre}
                width={200}
                height={200}
                className="rounded-[12px] object-contain"
              />
            </div>
          )}
        </div>

        {/* ── Metadatos ── */}
        <div className="flex justify-between text-xs text-[#474747]/40 border-t border-gray-100 pt-4 mb-6">
          <div>
            <p>Propuesta No. {numeroPropuesta}</p>
            <p>Código: {cotizacion.codigo_cotizacion}</p>
          </div>
          <div className="text-right">
            <p>Fecha de creación {fechaCreacion}</p>
            <p>Última modificación {fechaMod}</p>
          </div>
        </div>
      </main>

      {/* ── Pie de página ── */}
      <footer className="bg-[#474747] text-white/60 text-xs px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span>© Todos los derechos reservados. {empresaNombre}</span>
          {mostrarMarcaReuso && (
            <span className="text-white/40">
              Hecho con <span className="text-[#D6F391]">Calculadora de Reúso</span> · reuso.lurdes.co
            </span>
          )}
        </div>
        <span>Esta propuesta es solo para ti. No puedes compartir su contenido ni usarla con fines comerciales sin autorización.</span>
      </footer>
    </div>
  )
}
