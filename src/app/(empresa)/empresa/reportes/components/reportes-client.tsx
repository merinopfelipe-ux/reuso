'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTopLoader } from 'nextjs-toploader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  CircleDollarSign, Leaf, Truck, ShieldCheck,
  Loader2 as CircleNotch, AlertCircle as WarningCircle, Building2 as Buildings, Info,
} from '@/components/ui/icons'
import { SelectorEmpresa } from '@/components/ui/selector-empresa'
import { formatCOP, formatNumero } from '@/lib/format'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import type { ResultadoRentabilidad } from '@/lib/reportes/rentabilidad'
import type { ResultadoMitigacion } from '@/lib/reportes/mitigacion'
import type { ResultadoLogistica } from '@/lib/reportes/logistica'
import type { ResultadoGobernanza } from '@/lib/reportes/gobernanza'

interface Props {
  empresaNombre: string
  cotizadorActivo: boolean
}

type TabReporte = 'mitigacion' | 'rentabilidad' | 'logistica' | 'gobernanza'

const TABS: { id: TabReporte; label: string; icono: React.ElementType }[] = [
  { id: 'mitigacion', label: 'Mitigación GRI/ESG', icono: Leaf },
  { id: 'rentabilidad', label: 'Rentabilidad', icono: CircleDollarSign },
  { id: 'logistica', label: 'Logística', icono: Truck },
  { id: 'gobernanza', label: 'Gobernanza', icono: ShieldCheck },
]

const ETIQUETA_CATEGORIA: Record<string, string> = {
  madera: 'Madera', metal: 'Metal', textil: 'Textil', cuero: 'Cuero', plastico: 'Plástico',
  vidrio: 'Vidrio', espuma_relleno: 'Espuma / relleno', carton_papel: 'Cartón / papel', otros: 'Otros',
}

const ETIQUETA_VEHICULO: Record<string, string> = {
  liviano_diesel: 'Furgoneta / van ligera', mediano_diesel: 'Camión mediano', pesado_diesel: 'Camión pesado',
}

const BORDER = 'var(--border)'
const TEXT_DARK = 'var(--text-primary)'
const TEXT_MED = 'var(--text-secondary)'
const BRAND = 'var(--color-brand)'

function KpiCard({ icono: Icon, color, valor, label }: { icono: React.ElementType; color: string; valor: string; label: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 18, fontWeight: 700, color: TEXT_DARK, margin: 0, lineHeight: 1.2 }}>{valor}</p>
        <p style={{ fontSize: 11, color: TEXT_MED, margin: '2px 0 0', fontWeight: 600 }}>{label}</p>
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`, padding: '20px 20px 12px', marginBottom: 20 }}>
      {children}
    </div>
  )
}

function Tabla({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
  if (filas.length === 0) {
    return <p style={{ padding: '20px 0', fontSize: 13, color: TEXT_MED, textAlign: 'center' }}>Sin datos en este período.</p>
  }
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
              {columnas.map((c, i) => (
                <th key={c} className={`px-4 py-2.5 font-semibold whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, idx) => (
              <tr 
                key={idx} 
                className={`transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'}`}
                style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
              >
                {fila.map((v, i) => (
                  <td key={i} className={`px-4 py-3 text-[var(--text-primary)] ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BotonesExportar({ tipo, params, csvData, csvNombre }: { tipo: TabReporte; params: string; csvData: unknown[]; csvNombre: string }) {
  const topLoader = useTopLoader()
  const [descargandoPdf, setDescargandoPdf] = useState(false)

  async function handleDescargarPdf() {
    if (descargandoPdf) return
    setDescargandoPdf(true)
    topLoader.start()
    try {
      const res = await fetch(`/api/reportes/${tipo}/pdf${params}`)
      if (!res.ok) throw new Error('Error al generar reporte PDF')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `reporte_${tipo}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
    } catch (err) {
      console.error('Error al descargar reporte PDF:', err)
    } finally {
      topLoader.done()
      setDescargandoPdf(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <BotonDescargarCliente
        data={csvData}
        nombre={csvNombre}
        disabled={descargandoPdf || csvData.length === 0}
        onDescargarPdf={handleDescargarPdf}
      />
    </div>
  )
}

export function ReportesClient({ empresaNombre, cotizadorActivo }: Props) {
  const [tab, setTab] = useState<TabReporte>('mitigacion')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  interface DatosPorTab {
    mitigacion?: ResultadoMitigacion
    rentabilidad?: ResultadoRentabilidad
    logistica?: ResultadoLogistica
    gobernanza?: ResultadoGobernanza & { auditoria_tarifas: { id: string; created_at: string; detalle_json: { id?: string; despues?: unknown } | null }[] }
  }
  const [datos, setDatos] = useState<DatosPorTab>({})
  const [cargando, setCargando] = useState<Partial<Record<TabReporte, boolean>>>({})
  const [error, setError] = useState<Partial<Record<TabReporte, string>>>({})

  // ── Selector de empresa (solo super_admin) — mismo patrón que
  // /empresa/cotizador: /api/cotizador/empresas solo devuelve `empresas` si
  // quien pregunta es super_admin, eso es la señal para mostrar el selector.
  // Sin empresa elegida no se carga ningún reporte ni se puede descargar.
  const [esSuperAdmin, setEsSuperAdmin] = useState(false)
  const [empresasOpciones, setEmpresasOpciones] = useState<{ id: string; nombre: string }[]>([])
  const [empresaIdSeleccionada, setEmpresaIdSeleccionada] = useState('')
  const [cargandoContexto, setCargandoContexto] = useState(true)

  useEffect(() => {
    fetch('/api/cotizador/empresas')
      .then(res => (res.ok ? res.json() : null))
      .then(d => { if (d?.empresas) { setEsSuperAdmin(true); setEmpresasOpciones(d.empresas) } })
      .finally(() => setCargandoContexto(false))
  }, [])

  const params = (desde ? `desde=${desde}&` : '') + (hasta ? `hasta=${hasta}&` : '') + (esSuperAdmin && empresaIdSeleccionada ? `empresa_id=${empresaIdSeleccionada}` : '')
  const paramsUrl = params ? `?${params.replace(/&$/, '')}` : ''

  const cargarTab = useCallback(async (t: TabReporte) => {
    if (esSuperAdmin && !empresaIdSeleccionada) { setDatos(prev => ({ ...prev, [t]: undefined })); return }
    setCargando(prev => ({ ...prev, [t]: true }))
    setError(prev => ({ ...prev, [t]: '' }))
    try {
      const res = await fetch(`/api/reportes/${t}${paramsUrl}`)
      const json = await res.json()
      if (!res.ok) { setError(prev => ({ ...prev, [t]: json.error ?? 'Error al cargar el reporte.' })); return }
      setDatos(prev => ({ ...prev, [t]: json.data }))
    } catch {
      setError(prev => ({ ...prev, [t]: 'Error de conexión.' }))
    } finally {
      setCargando(prev => ({ ...prev, [t]: false }))
    }
  }, [paramsUrl, esSuperAdmin, empresaIdSeleccionada])

  // Al cambiar de pestaña, de filtro de fechas o de empresa (super_admin),
  // siempre se recarga esa pestaña (evita mostrar datos que ya no aplican).
  useEffect(() => { if (!cargandoContexto) cargarTab(tab) }, [tab, cargarTab, cargandoContexto])

  function aplicarFiltro() {
    setDatos({})
    cargarTab(tab)
  }

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'

  // Para super_admin, el nombre de archivo del CSV usa la empresa realmente
  // seleccionada, no el prop fijo del server (que siempre es "Tu empresa").
  const nombreParaArchivos = esSuperAdmin
    ? (empresasOpciones.find(e => e.id === empresaIdSeleccionada)?.nombre ?? empresaNombre)
    : empresaNombre

  return (
    <div>
      {/* Selector de empresa (solo super_admin) */}
      {esSuperAdmin && (
        <div style={{ background: 'var(--bg-card)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Buildings size={18} color={BRAND} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: TEXT_MED, display: 'block', marginBottom: 3, fontWeight: 600 }}>Reportando para</label>
            <SelectorEmpresa empresas={empresasOpciones} value={empresaIdSeleccionada} onChange={setEmpresaIdSeleccionada} />
          </div>
        </div>
      )}

      {esSuperAdmin && !empresaIdSeleccionada ? (
        <div style={{ background: 'rgba(89,166,228,0.1)', border: '1px solid rgba(89,166,228,0.2)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Info size={18} color="#59A6E4" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#59A6E4', fontWeight: 500, margin: 0 }}>Elige una empresa arriba para ver y descargar sus reportes.</p>
        </div>
      ) : (
      <>
      {/* Filtro de período */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: TEXT_MED, display: 'block', marginBottom: 3 }}>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT_DARK, background: 'var(--bg-input)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: TEXT_MED, display: 'block', marginBottom: 3 }}>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT_DARK, background: 'var(--bg-input)' }} />
        </div>
        <button onClick={aplicarFiltro} className="hover-pop hover-press" style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: BRAND, color: 'var(--text-on-brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Aplicar
        </button>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, marginBottom: 20, gap: 0, overflowX: 'auto' }}>
        {TABS.map((t) => {
          const Icon = t.icono
          const activo = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', background: 'transparent',
                fontWeight: activo ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap',
                color: activo ? BRAND : TEXT_MED,
                borderBottom: activo ? `2px solid ${BRAND}` : '2px solid transparent',
                marginBottom: -2, cursor: 'pointer',
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'rentabilidad' && !cotizadorActivo && (
        <div style={{ background: 'rgba(246,191,62,0.1)', border: '1px solid rgba(246,191,62,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: TEXT_DARK }}>
          El módulo Cotizador no está activo para tu empresa. Este reporte se llena a medida que cotices muebles.
        </div>
      )}

      {cargando[tab] && (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_MED, gap: 8 }}>
          <CircleNotch size={18} className="animate-spin" /> Cargando reporte...
        </div>
      )}

      {error[tab] && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,94,75,0.08)', color: '#FF5E4B', fontSize: 13, marginBottom: 16 }}>
          <WarningCircle size={16} /> {error[tab]}
        </div>
      )}

      {!cargando[tab] && !error[tab] && tab === 'mitigacion' && datos.mitigacion && (
        <ReporteMitigacion resultado={datos.mitigacion} isDark={isDark} paramsUrl={paramsUrl} empresaNombre={nombreParaArchivos} />
      )}
      {!cargando[tab] && !error[tab] && tab === 'rentabilidad' && datos.rentabilidad && (
        <ReporteRentabilidad resultado={datos.rentabilidad} isDark={isDark} paramsUrl={paramsUrl} empresaNombre={nombreParaArchivos} />
      )}
      {!cargando[tab] && !error[tab] && tab === 'logistica' && datos.logistica && (
        <ReporteLogistica resultado={datos.logistica} paramsUrl={paramsUrl} empresaNombre={nombreParaArchivos} />
      )}
      {!cargando[tab] && !error[tab] && tab === 'gobernanza' && datos.gobernanza && (
        <ReporteGobernanza resultado={datos.gobernanza} paramsUrl={paramsUrl} empresaNombre={nombreParaArchivos} />
      )}
      </>
      )}
    </div>
  )
}

// ── Reporte 2: Mitigación GRI/ESG ────────────────────────────────────────────

function ReporteMitigacion({ resultado, isDark, paramsUrl, empresaNombre }: { resultado: ResultadoMitigacion; isDark: boolean; paramsUrl: string; empresaNombre: string }) {
  const chartData = resultado.desglose_por_material.map(d => ({
    categoria: ETIQUETA_CATEGORIA[d.categoria_material] ?? d.categoria_material,
    co2: d.co2_evitado_kg,
  }))
  const csvData = resultado.desglose_por_material.map(d => ({
    material: ETIQUETA_CATEGORIA[d.categoria_material] ?? d.categoria_material,
    peso_kg: d.peso_kg_total, co2_evitado_kg: d.co2_evitado_kg, agua_evitada_l: d.agua_evitada_l,
  }))

  return (
    <div>
      <BotonesExportar tipo="mitigacion" params={paramsUrl} csvData={csvData} csvNombre={`mitigacion-${empresaNombre}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icono={Leaf} color="#00827C" valor={`${resultado.co2_total_kg.toFixed(2)} kg`} label="CO₂ eq evitado total" />
        <KpiCard icono={Leaf} color="#59A6E4" valor={`${resultado.agua_total_l.toLocaleString('es-CO')} L`} label="Agua ahorrada" />
        <KpiCard icono={ShieldCheck} color="#38B98E" valor={`${resultado.icd_porcentaje.toFixed(1)} %`} label="Índice de Certeza Metodológica" />
      </div>
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 4px' }}>CO₂ evitado por tipo de material</h2>
        <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 16px' }}>Calculadora general + cotizaciones cerradas y ganadas</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: TEXT_MED }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: TEXT_MED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: isDark ? '#525252' : '#fff', border: `1px solid ${BORDER}`, fontSize: 12 }} />
              <Bar dataKey="co2" fill={BRAND} radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ padding: '20px 0', fontSize: 13, color: TEXT_MED, textAlign: 'center' }}>Sin datos en este período.</p>}
      </Card>
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 12px' }}>Desglose por material</h2>
        <Tabla
          columnas={['Material', 'Peso (kg)', 'CO₂ eq (kg)', 'Agua (L)']}
          filas={resultado.desglose_por_material.map(d => [ETIQUETA_CATEGORIA[d.categoria_material] ?? d.categoria_material, d.peso_kg_total.toFixed(2), d.co2_evitado_kg.toFixed(2), d.agua_evitada_l.toFixed(2)])}
        />
      </Card>
    </div>
  )
}

// ── Reporte 1: Rentabilidad ──────────────────────────────────────────────────

function ReporteRentabilidad({ resultado, isDark, paramsUrl, empresaNombre }: { resultado: ResultadoRentabilidad; isDark: boolean; paramsUrl: string; empresaNombre: string }) {
  const chartData = resultado.por_asesor.map(a => ({ asesor: a.asesor_nombre, ahorro: a.ahorro_neto }))
  const csvData = resultado.items.map(i => ({
    mueble: i.titulo, cantidad: i.cantidad, precio_mercado_nuevo: i.precio_mercado_nuevo,
    costo_restauracion: i.costo_restauracion, ahorro_neto: i.ahorro_neto, asesor: i.asesor_nombre ?? '', cliente: i.cliente_nombre ?? '',
  }))

  return (
    <div>
      <BotonesExportar tipo="rentabilidad" params={paramsUrl} csvData={csvData} csvNombre={`rentabilidad-${empresaNombre}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icono={CircleDollarSign} color="#00827C" valor={formatCOP(resultado.ahorro_neto_total)} label="Ahorro neto CAPEX" />
        <KpiCard icono={CircleDollarSign} color="#59A6E4" valor={resultado.margen_costo_beneficio_promedio ? `${resultado.margen_costo_beneficio_promedio.toFixed(2)}x` : '—'} label="Margen costo-beneficio" />
        <KpiCard icono={CircleDollarSign} color="#AD7C43" valor={formatCOP(resultado.total_servicios)} label="Total servicios" />
        <KpiCard icono={CircleDollarSign} color="#F6BF3E" valor={formatCOP(resultado.total_insumos)} label="Total insumos" />
      </div>
      {resultado.omitidos_sin_precio_mercado > 0 && (
        <p style={{ fontSize: 12, color: TEXT_MED, marginBottom: 16 }}>{formatNumero(resultado.omitidos_sin_precio_mercado)} mueble(s) sin precio de mercado confirmado, excluido(s) de estos totales.</p>
      )}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 16px' }}>Ahorro neto por asesor</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="asesor" tick={{ fontSize: 11, fill: TEXT_MED }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: TEXT_MED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: isDark ? '#525252' : '#fff', border: `1px solid ${BORDER}`, fontSize: 12 }} formatter={(v) => formatCOP(Number(v))} />
              <Bar dataKey="ahorro" fill={BRAND} radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p style={{ padding: '20px 0', fontSize: 13, color: TEXT_MED, textAlign: 'center' }}>Sin datos en este período.</p>}
      </Card>
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 12px' }}>Muebles cotizados</h2>
        <Tabla
          columnas={['Mueble', 'Cant.', 'Precio mercado', 'Costo restauración', 'Ahorro neto', 'Asesor']}
          filas={resultado.items.map(i => [i.titulo, i.cantidad, formatCOP(i.precio_mercado_nuevo), formatCOP(i.costo_restauracion), formatCOP(i.ahorro_neto), i.asesor_nombre ?? 'Sin asesor'])}
        />
      </Card>
    </div>
  )
}

// ── Reporte 3: Logística y Residuo Cero ──────────────────────────────────────

function ReporteLogistica({ resultado, paramsUrl, empresaNombre }: { resultado: ResultadoLogistica; paramsUrl: string; empresaNombre: string }) {
  const csvData = resultado.ciclos.map(c => ({
    vehiculo: c.tipo_vehiculo_transporte ? ETIQUETA_VEHICULO[c.tipo_vehiculo_transporte] : '',
    distancia_km: c.distancia_transporte_km, co2_logistica_kg: c.co2_logistica_kg,
    residuo_taller_kg: c.peso_residuo_taller_kg, residuo_reciclado_kg: c.peso_residuo_reciclado_kg, destino: c.destino_residuo ?? '',
  }))

  return (
    <div>
      <BotonesExportar tipo="logistica" params={paramsUrl} csvData={csvData} csvNombre={`logistica-${empresaNombre}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icono={Truck} color="#00827C" valor={`${resultado.co2_logistica_total_kg.toFixed(2)} kg`} label="CO₂ eq de logística" />
        <KpiCard icono={ShieldCheck} color="#38B98E" valor={resultado.tasa_desvio_vertedero_pct !== null ? `${resultado.tasa_desvio_vertedero_pct.toFixed(1)} %` : '—'} label="Tasa de desvío de vertedero" />
        <KpiCard icono={Truck} color="#AD7C43" valor={`${resultado.peso_residuo_taller_total_kg.toFixed(1)} kg`} label="Residuo total de taller" />
      </div>
      <p style={{ fontSize: 11, color: TEXT_MED, marginBottom: 16 }}>Factores de emisión: DEFRA UK Greenhouse Gas Conversion Factors, estimación provisional (nivel de confianza media).</p>
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 12px' }}>Ciclos con transporte y residuo registrado</h2>
        <Tabla
          columnas={['Vehículo', 'Distancia (km)', 'CO₂ eq (kg)', 'Residuo taller (kg)', 'Reciclado (kg)', 'Destino']}
          filas={resultado.ciclos.map(c => [
            c.tipo_vehiculo_transporte ? ETIQUETA_VEHICULO[c.tipo_vehiculo_transporte] : 'Sin transporte',
            c.distancia_transporte_km.toFixed(1), c.co2_logistica_kg.toFixed(2),
            c.peso_residuo_taller_kg.toFixed(1), c.peso_residuo_reciclado_kg.toFixed(1), c.destino_residuo ?? '—',
          ])}
        />
      </Card>
    </div>
  )
}

// ── Reporte 4: Cumplimiento y Gobernanza ─────────────────────────────────────

function ReporteGobernanza({ resultado, paramsUrl, empresaNombre }: {
  resultado: ResultadoGobernanza & { auditoria_tarifas: { id: string; created_at: string; detalle_json: { id?: string; despues?: unknown } | null }[] }
  paramsUrl: string
  empresaNombre: string
}) {
  const csvData = Object.entries(resultado.por_estado).map(([estado, cantidad]) => ({ estado, cantidad }))

  return (
    <div>
      <BotonesExportar tipo="gobernanza" params={paramsUrl} csvData={csvData} csvNombre={`gobernanza-${empresaNombre}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icono={ShieldCheck} color="#00827C" valor={String(resultado.total_tickets)} label="Tickets totales" />
        <KpiCard icono={WarningCircle} color="#FF5E4B" valor={String(resultado.tickets_sin_respuesta)} label="Sin responder" />
        <KpiCard icono={ShieldCheck} color="#59A6E4" valor={resultado.tiempo_primera_respuesta_promedio_horas !== null ? `${resultado.tiempo_primera_respuesta_promedio_horas.toFixed(1)} h` : '—'} label="Primera respuesta (promedio)" />
      </div>
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 12px' }}>Tickets por estado</h2>
        <Tabla columnas={['Estado', 'Cantidad']} filas={Object.entries(resultado.por_estado).map(([estado, cantidad]) => [estado, cantidad])} />
      </Card>
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 4px' }}>Auditoría de tarifas y factores</h2>
        <p style={{ fontSize: 12, color: TEXT_MED, margin: '0 0 12px' }}>Solo ítems del catálogo propio de tu empresa</p>
        <Tabla
          columnas={['Fecha', 'Ítem', 'Campos modificados']}
          filas={resultado.auditoria_tarifas.map(a => [
            new Date(a.created_at).toLocaleString('es-CO'),
            a.detalle_json?.id ?? '—',
            a.detalle_json?.despues ? Object.keys(a.detalle_json.despues as object).join(', ') : '—',
          ])}
        />
      </Card>
    </div>
  )
}
