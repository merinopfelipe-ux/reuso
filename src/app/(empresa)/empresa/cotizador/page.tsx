'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search as MagnifyingGlass,
  Filter as Funnel,
  Leaf,
  CircleDollarSign as CurrencyCircleDollar,
  Percent,
  Clock,
  CheckCircle,
  XCircle,
  TriangleAlert as Warning,
  ChevronRight as CaretRight,
} from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Cotizacion {
  id: string
  codigo_cotizacion: string
  estado: string
  total: number
  subtotal: number
  co2_evitado_total_kg: number
  created_at: string
  updated_at: string
  fecha_enviada: string | null
  fecha_apertura_cliente: string | null
  veces_abierta: number
  enlace_publico_token: string | null
  crm_clientes: { nombre: string; telefono: string | null } | null
  profiles: { nombre: string } | null
  fria?: boolean
}

// ── Constantes estados ─────────────────────────────────────────────────────────

const ESTADOS: { key: string; label: string; color: string }[] = [
  { key: 'por_cotizar',       label: 'Por cotizar',        color: 'text-[#474747]/60 bg-[#474747]/08' },
  { key: 'enviada',           label: 'Enviada',            color: 'text-[#59A6E4] bg-[#59A6E4]/10' },
  { key: 'en_negociacion',    label: 'En negociación',     color: 'text-[#F6BF3E] bg-[#F6BF3E]/10' },
  { key: 'esperando_anticipo',label: 'Esperando anticipo', color: 'text-[#38B98E] bg-[#38B98E]/10' },
  { key: 'cerrado_ganado',    label: 'Cerrado ganado',     color: 'text-[#00827C] bg-[#00827C]/10' },
  { key: 'cerrado_perdido',   label: 'Cerrado perdido',    color: 'text-[#FF5E4B] bg-[#FF5E4B]/10' },
  { key: 'cerrado_inviable',  label: 'Inviable',           color: 'text-[#474747]/40 bg-[#474747]/05' },
]

const ESTADOS_ACTIVOS = ['por_cotizar', 'enviada', 'en_negociacion', 'esperando_anticipo']

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PanelCotizadorPage() {
  const router = useRouter()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [tabEstado, setTabEstado] = useState('todos')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const cargarCotizaciones = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (filtroEstado) params.set('estado', filtroEstado)
      if (busqueda) params.set('q', busqueda)
      const res = await fetch(`/api/cotizador/cotizaciones?${params}`)
      const d = await res.json()
      if (d.cotizaciones) setCotizaciones(d.cotizaciones)
    } catch {
      setError('No se pudieron cargar las cotizaciones. Intenta de nuevo.')
    }
    finally { setCargando(false) }
  }, [filtroEstado, busqueda])

  useEffect(() => { cargarCotizaciones() }, [cargarCotizaciones])

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const activas = cotizaciones.filter(c => ESTADOS_ACTIVOS.includes(c.estado))
  const ganadas = cotizaciones.filter(c => c.estado === 'cerrado_ganado')
  const cerradas = cotizaciones.filter(c => c.estado.startsWith('cerrado'))
  const tasaCierre = cerradas.length > 0 ? Math.round((ganadas.length / cerradas.length) * 100) : 0
  const valorEmbudo = activas.reduce((s, c) => s + Number(c.total), 0)
  const co2Total = cotizaciones.reduce((s, c) => s + Number(c.co2_evitado_total_kg), 0)

  // ── Filtrado local ─────────────────────────────────────────────────────────

  const cotsFiltradas = cotizaciones.filter(c => {
    if (tabEstado !== 'todos' && c.estado !== tabEstado) return false
    const q = busqueda.toLowerCase()
    if (!q) return true
    return (
      c.codigo_cotizacion.toLowerCase().includes(q) ||
      (c.crm_clientes?.nombre ?? '').toLowerCase().includes(q)
    )
  })

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <AdminPageHeader titulo="Cotizaciones" />
          <button
            onClick={() => router.push('/empresa/cotizador/nueva')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#00827C] text-white text-sm font-semibold hover:bg-[#006B66] transition-colors hover-pop hover-press"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva cotización
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-[10px] bg-[#FF5E4B]/10 border border-[#FF5E4B]/20 text-sm text-[#FF5E4B] flex items-center gap-2">
            <XCircle size={16} />
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard icon={<CurrencyCircleDollar size={20} className="text-[#00827C]" />}
            label="Valor del embudo" value={formatCOP(valorEmbudo)} isDark={isDark} />
          <KpiCard icon={<Percent size={20} className="text-[#38B98E]" />}
            label="Tasa de cierre" value={`${tasaCierre}%`} isDark={isDark} />
          <KpiCard icon={<Leaf size={20} className="text-[#38B98E]" />}
            label="CO2 comprometido" value={`${co2Total.toFixed(1)} kg`} isDark={isDark} />
          <KpiCard icon={<CheckCircle size={20} className="text-[#00827C]" />}
            label="Cotizaciones activas" value={String(activas.length)} isDark={isDark} />
        </div>

        {/* Filtros + búsqueda */}
        <div className={`rounded-[12px] border p-4 mb-4 flex flex-col sm:flex-row gap-3 ${cardBg}`}>
          <div className="flex items-center gap-2 flex-1 rounded-[8px] border border-[var(--border)] px-3 py-2.5 bg-[var(--bg-input)]">
            <MagnifyingGlass size={16} className={ts} />
            <input
              className={`flex-1 bg-transparent text-sm outline-none ${tp} placeholder:opacity-40`}
              placeholder="Busca por cliente o código"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-3 py-2.5 bg-[var(--bg-input)]">
            <Funnel size={16} className={ts} />
            <select
              className={`bg-transparent text-sm outline-none ${tp} cursor-pointer`}
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => (
                <option key={e.key} value={e.key}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs por estado */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 hide-scrollbar">
          <TabBtn label="Todos" value="todos" active={tabEstado} onClick={setTabEstado} isDark={isDark} count={cotizaciones.length} />
          {ESTADOS.map(e => {
            const cnt = cotizaciones.filter(c => c.estado === e.key).length
            if (cnt === 0) return null
            return <TabBtn key={e.key} label={e.label} value={e.key} active={tabEstado} onClick={setTabEstado} isDark={isDark} count={cnt} />
          })}
        </div>

        {/* Lista */}
        {cargando ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className={`h-20 rounded-[12px] animate-pulse ${isDark ? 'bg-white/05' : 'bg-[#00827C]/05'}`} />
            ))}
          </div>
        ) : cotsFiltradas.length === 0 ? (
          <div className={`rounded-[12px] border p-8 text-center ${cardBg}`}>
            <p className={`text-sm ${ts}`}>No hay cotizaciones que coincidan.</p>
            <button onClick={() => router.push('/empresa/cotizador/nueva')}
              className="mt-3 px-4 py-2 rounded-full bg-[#00827C] text-white text-sm font-semibold hover:bg-[#006B66] transition-colors">
              Crea la primera
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {cotsFiltradas.map(c => (
              <CotizacionCard
                key={c.id}
                cot={c}
                isDark={isDark}
                onClick={() => router.push(`/empresa/cotizador/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; isDark: boolean }) {
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'
  return (
    <div className={`rounded-[12px] border p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-1">{icon}
        <span className="text-xs text-[var(--text-placeholder)]">{label}</span>
      </div>
      <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function TabBtn({ label, value, active, onClick, count }: {
  label: string; value: string; active: string; onClick: (v: string) => void; isDark: boolean; count: number
}) {
  const isActive = active === value
  return (
    <button
      onClick={() => onClick(value)}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        isActive
          ? 'bg-[#00827C] text-white'
          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {label} {count > 0 && <span className={`ml-1 opacity-70`}>{count}</span>}
    </button>
  )
}

function CotizacionCard({ cot, onClick }: { cot: Cotizacion; isDark: boolean; onClick: () => void }) {
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'

  const estadoInfo = ESTADOS.find(e => e.key === cot.estado)
  const dias = diasDesde(cot.updated_at)
  const fria = ['enviada', 'en_negociacion'].includes(cot.estado) && dias >= 2

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[12px] border p-4 text-left transition-all ${cardBg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${tp}`}>
              {cot.crm_clientes?.nombre ?? 'Sin cliente'}
            </span>
            {estadoInfo && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoInfo.color}`}>
                {estadoInfo.label}
              </span>
            )}
            {fria && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-[#F6BF3E] bg-[#F6BF3E]/10 flex items-center gap-1">
                <Warning size={11} strokeWidth={2.5} /> Fría {dias}d
              </span>
            )}
            {cot.fecha_apertura_cliente && (
              <span className={`text-xs flex items-center gap-1 ${ts}`}>
                <CheckCircle size={11} className="text-[#38B98E]" /> Abierta
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${ts}`}>{cot.codigo_cotizacion}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold ${tp}`}>
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(cot.total))}
            </p>
            <p className={`text-xs ${ts} flex items-center gap-1 justify-end`}>
              <Leaf size={11} className="text-[#38B98E]" />
              {Number(cot.co2_evitado_total_kg).toFixed(1)} kg CO2
            </p>
          </div>
          <CaretRight size={16} className={ts} />
        </div>
      </div>
      <div className={`flex items-center gap-1 mt-2 text-xs ${ts}`}>
        <Clock size={12} />
        {dias === 0 ? 'Hoy' : `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`}
        {cot.veces_abierta > 0 && (
          <span className="ml-2">· Vista {cot.veces_abierta} {cot.veces_abierta === 1 ? 'vez' : 'veces'}</span>
        )}
      </div>
    </button>
  )
}
