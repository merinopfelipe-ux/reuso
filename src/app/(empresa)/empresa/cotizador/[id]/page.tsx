'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle, Copy, Link,
  Leaf, Drop, WhatsappLogo, PaperPlaneTilt,
  CaretDown, CaretUp, Warning,
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
  enlace_publico_token: string | null
  fecha_enviada: string | null
  fecha_apertura_cliente: string | null
  veces_abierta: number
  created_at: string
  updated_at: string
  crm_clientes: { nombre: string; telefono: string | null; email: string | null } | null
  profiles: { nombre: string } | null
  empresa_id: string
}

const ESTADOS = [
  { key: 'por_cotizar',       label: 'Por cotizar' },
  { key: 'enviada',           label: 'Enviada' },
  { key: 'en_negociacion',    label: 'En negociación' },
  { key: 'esperando_anticipo',label: 'Esperando anticipo' },
  { key: 'cerrado_ganado',    label: 'Cerrado ganado' },
  { key: 'cerrado_perdido',   label: 'Cerrado perdido' },
  { key: 'cerrado_inviable',  label: 'Inviable' },
]

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function DetalleCotizacionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [cot, setCot] = useState<Cotizacion | null>(null)
  const [muebles, setMuebles] = useState<Mueble[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [copysAbiertos, setCopysAbiertos] = useState(false)
  const [estadoCambiando, setEstadoCambiando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarEstado, setConfirmarEstado] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!id) return
    async function cargar() {
      setCargando(true)
      try {
        const [resCot, resMuebles] = await Promise.all([
          fetch(`/api/cotizador/cotizaciones/${id}`),
          fetch(`/api/cotizador/cotizaciones/${id}/muebles`),
        ])
        const dCot = await resCot.json()
        const dMuebles = await resMuebles.json()
        if (dCot.cotizacion) setCot(dCot.cotizacion)
        if (dMuebles.muebles) setMuebles(dMuebles.muebles)
        if (dCot.cotizacion?.enlace_publico_token) {
          const base = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin
          setEnlace(`${base}/propuesta/${dCot.cotizacion.enlace_publico_token}`)
        }
      } catch {
        setError('No se pudieron cargar los datos de la cotización. Intenta de nuevo.')
      } finally { setCargando(false) }
    }
    cargar()
  }, [id])

  async function enviarPropuesta() {
    if (!id) return
    setEnviando(true)
    try {
      const res = await fetch(`/api/cotizador/cotizaciones/${id}/enviar`, { method: 'POST' })
      const d = await res.json()
      if (d.enlace) {
        setEnlace(d.enlace)
        setCot(prev => prev ? { ...prev, estado: 'enviada', enlace_publico_token: d.token, fecha_enviada: new Date().toISOString() } : prev)
      }
    } catch {
      setError('No se pudo generar el enlace. Intenta de nuevo.')
    }
    finally { setEnviando(false) }
  }

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
      const res = await fetch(`/api/cotizador/cotizaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        setCot(prev => prev ? { ...prev, estado: nuevoEstado, updated_at: new Date().toISOString() } : prev)
      } else {
        setError('No se pudo actualizar el estado. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión al actualizar el estado.')
    }
    finally { setEstadoCambiando(false) }
  }

  function copiarEnlace() {
    if (!enlace) return
    navigator.clipboard.writeText(enlace).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  // ── Copys WhatsApp dinámicos ───────────────────────────────────────────────

  const clienteNombre = cot?.crm_clientes?.nombre ?? 'Cliente'
  const co2 = Number(cot?.co2_evitado_total_kg ?? 0)
  const arboles = Math.max(1, Math.round(co2 / 8.0))
  const total = Number(cot?.total ?? 0)

  const copys = [
    {
      label: 'Presentación de propuesta',
      texto: `Hola ${clienteNombre}, preparé tu propuesta de restauración. Al restaurar tus muebles evitas ${co2.toFixed(1)} kg de CO2 - lo mismo que ${arboles} ${arboles === 1 ? 'árbol' : 'árboles'} al año. Tu inversión: ${formatCOP(total)}. Revisa tu propuesta aquí: ${enlace ?? '(enlace pendiente)'}`,
    },
    {
      label: 'Seguimiento (sin respuesta)',
      texto: `Hola ${clienteNombre}, quería saber si tuviste la oportunidad de revisar tu propuesta. Recuerda que al restaurar en vez de comprar nuevo, evitas ${co2.toFixed(1)} kg de CO2. Cualquier duda con gusto te ayudo. ${enlace ?? ''}`,
    },
    {
      label: 'Recordatorio cierre',
      texto: `Hola ${clienteNombre}, esta es tu propuesta ${cot?.codigo_cotizacion ?? ''}. Si apruebas hoy coordinamos la recogida esta semana. Evitas ${co2.toFixed(1)} kg de CO2 y recuperas tus muebles como nuevos. ${enlace ?? ''}`,
    },
  ]

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  if (cargando) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {[1,2,3].map(i => <div key={i} className={`h-24 rounded-[12px] animate-pulse ${isDark ? 'bg-white/05' : 'bg-[#00827C]/05'}`} />)}
        </div>
      </div>
    )
  }

  if (!cot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <p className={ts}>Cotización no encontrada.</p>
      </div>
    )
  }

  const fria = ['enviada', 'en_negociacion'].includes(cot.estado) &&
    Math.floor((Date.now() - new Date(cot.updated_at).getTime()) / 86_400_000) >= 2

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Cabecero */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/empresa/cotizador')} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#00827C]/08'} transition-colors`}>
            <ArrowLeft size={20} className={tp} />
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs ${ts} truncate`}>{cot.codigo_cotizacion}</p>
            <p className={`text-base font-semibold truncate ${tp}`}>{clienteNombre}</p>
          </div>
          {fria && (
            <span className="text-xs px-2 py-1 rounded-full font-medium text-[#F6BF3E] bg-[#F6BF3E]/10 flex items-center gap-1">
              <Warning size={12} weight="bold" /> Cotización fría
            </span>
          )}
        </div>

        {/* Estado + cambio */}
        <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
          <p className={`text-xs uppercase tracking-wide font-semibold mb-3 ${ts}`}>Estado del embudo</p>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map(e => (
              <button
                key={e.key}
                disabled={estadoCambiando}
                onClick={() => solicitarCambioEstado(e.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                  cot.estado === e.key
                    ? 'bg-[#00827C] text-white'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline apertura */}
        <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
          <p className={`text-xs uppercase tracking-wide font-semibold mb-3 ${ts}`}>Actividad</p>
          <div className="space-y-2">
            <TimelineItem
              icon={<CheckCircle size={14} weight="duotone" className="text-[#00827C]" />}
              label="Creada"
              fecha={cot.created_at}
              isDark={isDark}
            />
            {cot.fecha_enviada && (
              <TimelineItem
                icon={<PaperPlaneTilt size={14} weight="duotone" className="text-[#59A6E4]" />}
                label="Propuesta enviada"
                fecha={cot.fecha_enviada}
                isDark={isDark}
              />
            )}
            {cot.fecha_apertura_cliente && (
              <TimelineItem
                icon={<CheckCircle size={14} weight="duotone" className="text-[#38B98E]" />}
                label={`Cliente abrió la propuesta${cot.veces_abierta > 1 ? ` · ${cot.veces_abierta} veces` : ''}`}
                fecha={cot.fecha_apertura_cliente}
                isDark={isDark}
              />
            )}
            {cot.estado === 'esperando_anticipo' && (
              <TimelineItem
                icon={<CheckCircle size={14} weight="duotone" className="text-[#D6F391]" />}
                label="Cliente aceptó la propuesta"
                fecha={cot.updated_at}
                isDark={isDark}
              />
            )}
          </div>
        </div>

        {/* Muebles */}
        {muebles.length > 0 && (
          <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
            <p className={`text-xs uppercase tracking-wide font-semibold mb-3 ${ts}`}>
              {muebles.length} {muebles.length === 1 ? 'mueble' : 'muebles'}
            </p>
            <div className="space-y-3">
              {muebles.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  {m.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imagen_url} alt={m.tipo_mueble} className="w-12 h-12 rounded-[8px] object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${tp}`}>{m.tipo_mueble}</p>
                    <p className={`text-xs ${ts}`}>
                      {formatCOP(Number(m.precio_mueble))} · {Number(m.co2_evitado_kg).toFixed(1)} kg CO2
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totales */}
        <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
          <div className="flex justify-between items-center">
            <span className={`text-sm font-bold ${tp}`}>Total</span>
            <span className="text-xl font-bold text-[#00827C]">{formatCOP(Number(cot.total))}</span>
          </div>
          {Number(cot.descuento) > 0 && (
            <p className={`text-xs mt-1 ${ts}`}>Descuento: {formatCOP(Number(cot.descuento))}</p>
          )}
          <div className={`flex gap-4 mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
            <span className={`text-xs flex items-center gap-1 ${ts}`}>
              <Leaf size={12} weight="duotone" className="text-[#38B98E]" />
              {co2.toFixed(1)} kg CO2 evitado
            </span>
            <span className={`text-xs flex items-center gap-1 ${ts}`}>
              <Drop size={12} weight="duotone" className="text-[#59A6E4]" />
              {Number(cot.agua_evitada_total_l).toFixed(0)} L agua
            </span>
          </div>
        </div>

        {/* Enlace público */}
        <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
          <p className={`text-xs uppercase tracking-wide font-semibold mb-3 ${ts}`}>Enlace de propuesta</p>
          {enlace ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-[8px] border px-3 py-2 border-[var(--border)] bg-[var(--bg-input)]">
                <Link size={14} className={ts} />
                <span className={`text-xs flex-1 truncate ${ts}`}>{enlace}</span>
                <button onClick={copiarEnlace} className={`text-xs font-medium flex items-center gap-1 ${copiado ? 'text-[#38B98E]' : 'text-[#00827C]'}`}>
                  <Copy size={14} />
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <a
                href={`https://wa.me/${cot.crm_clientes?.telefono?.replace(/\D/g, '') ? `57${cot.crm_clientes.telefono.replace(/\D/g, '')}` : ''}?text=${encodeURIComponent(`Hola ${clienteNombre}, aquí está tu propuesta: ${enlace}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#25D366]/10 text-[#128C7E] text-sm font-semibold hover:bg-[#25D366]/20 transition-colors"
              >
                <WhatsappLogo size={16} weight="duotone" />
                Envía por WhatsApp
              </a>
            </div>
          ) : (
            <button
              onClick={enviarPropuesta}
              disabled={enviando}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#00827C] text-white text-sm font-semibold hover:bg-[#006B66] transition-colors disabled:opacity-50"
            >
              <PaperPlaneTilt size={16} weight="bold" />
              {enviando ? 'Generando enlace...' : 'Generar y enviar propuesta'}
            </button>
          )}
        </div>

        {/* Banner de error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-[10px] bg-[#FF5E4B]/10 border border-[#FF5E4B]/20 text-sm text-[#FF5E4B] flex items-center gap-2">
            <Warning size={16} weight="fill" />
            {error}
          </div>
        )}

        {/* Copys WhatsApp */}
        <div className={`rounded-[12px] border ${cardBg}`}>
          <button
            className="w-full flex items-center justify-between p-4"
            onClick={() => setCopysAbiertos(p => !p)}
          >
            <div className="flex items-center gap-2">
              <WhatsappLogo size={16} weight="duotone" className="text-[#25D366]" />
              <span className={`text-sm font-semibold ${tp}`}>Mensajes de seguimiento</span>
            </div>
            {copysAbiertos ? <CaretUp size={14} className={ts} /> : <CaretDown size={14} className={ts} />}
          </button>
          {copysAbiertos && (
            <div className={`border-t px-4 pb-4 space-y-3 ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
              <p className={`text-xs pt-3 ${ts}`}>Copia el texto y envíalo por WhatsApp. Incluye el impacto ambiental en voz activa.</p>
              {copys.map((c, i) => (
                <CopyCard key={i} label={c.label} texto={c.texto} isDark={isDark} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal confirmación estado terminal */}
      {confirmarEstado && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-[#474747]/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[16px] border p-6 shadow-xl bg-[var(--bg-card)] border-[var(--border)]">
            <p className={`text-base font-bold mb-2 ${tp}`}>
              {confirmarEstado === 'cerrado_ganado' ? '¡Confirma el cierre ganado!' : 'Confirma el cambio de estado'}
            </p>
            <p className={`text-sm mb-5 ${ts}`}>
              {`¿Quieres marcar esta cotización como "${ESTADOS.find(e => e.key === confirmarEstado)?.label}"? Esta acción cambia el embudo de ventas.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarEstado(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold border transition-colors border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => ejecutarCambioEstado(confirmarEstado)}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${confirmarEstado === 'cerrado_ganado' ? 'bg-[#00827C] text-white hover:bg-[#006B66]' : 'bg-[#FF5E4B] text-white hover:bg-[#e04438]'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
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

function CopyCard({ label, texto, isDark }: { label: string; texto: string; isDark: boolean }) {
  const [copiado, setCopiado] = useState(false)
  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }
  return (
    <div className="rounded-[8px] p-3 border border-[var(--border)] bg-[var(--bg-input)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-[#474747]/70'}`}>{label}</span>
        <button
          onClick={copiar}
          className={`text-xs font-medium flex items-center gap-1 ${copiado ? 'text-[#38B98E]' : 'text-[#00827C]'}`}
        >
          <Copy size={12} />
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/60'}`}>{texto}</p>
    </div>
  )
}
