'use client'

import { useState } from 'react'
import { FileText, Building2 as Buildings, TrendingUp as TrendUp, BarChart2 as ChartBar, Clock, Users, Headphones, Layers as Stack } from '@/components/ui/icons'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'

const C = {
  brand: 'var(--color-brand)', dark: 'var(--text-primary)', mid: 'var(--text-secondary)',
  border: 'var(--border)', light: 'var(--bg-hover)',
}

const REPORTES = [
  { tipo: 'empresas_activas',  label: 'Empresas activas',            desc: 'Lista de todas las empresas con plan activo en el sistema.',     icon: Buildings },
  { tipo: 'top_co2',           label: 'Top 10 empresas por CO₂eq',   desc: 'Ranking de empresas con mayor impacto ambiental medido.',    icon: TrendUp },
  { tipo: 'metricas_globales', label: 'Métricas globales',           desc: 'Totales del sistema: cálculos, CO₂, agua, usuarios y empresas.',  icon: ChartBar },
  { tipo: 'empresas_inactivas',label: 'Empresas inactivas (30 días)',desc: 'Empresas que no han registrado cálculos en los últimos 30 días.', icon: Clock },
  { tipo: 'leads_periodo',     label: 'Leads por período',           desc: 'Prospectos capturados con tasa de conversión.',                   icon: Users },
  { tipo: 'tickets_periodo',   label: 'Tickets por período',         desc: 'Solicitudes de soporte y tiempos de resolución.',                 icon: Headphones },
  { tipo: 'co2_por_modulo',    label: 'CO₂eq por módulo',            desc: 'Consolidado de impacto ambiental agrupado por módulo.',           icon: Stack },
] as const

type TipoReporte = typeof REPORTES[number]['tipo']

export function ReportesClient() {

  const [error, setError] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  async function generarData(tipo: TipoReporte) {
    const params = new URLSearchParams({ tipo })
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    const res = await fetch(`/api/admin/reportes?${params}`)
    if (!res.ok) throw new Error('Ocurrió un error al generar el reporte.')
    const json = await res.json()
    const raw = json.data
    const rows: unknown[] = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'leads' in raw) ? (raw as { leads: unknown[] }).leads : [raw]
    return rows
  }

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Filtros de período */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Período (aplica a leads y tickets):</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: C.mid, display: 'block', marginBottom: 3 }}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', background: 'var(--bg-input)' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.mid, display: 'block', marginBottom: 3 }}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', background: 'var(--bg-input)' }} />
          </div>
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: '#FF5E4B', marginBottom: 16 }}>{error}</p>}

      {/* Grid de reportes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {REPORTES.map(r => {
          const Icon = r.icon
          return (
            <div key={r.tipo} className="flex flex-col gap-3 rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)]">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={C.brand} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: '0 0 4px' }}>{r.label}</p>
                  <p style={{ fontSize: 12, color: C.mid, margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
                </div>
              </div>
                <BotonDescargarCliente
                  data={[]}
                  nombre={`reporte_${r.tipo}_${new Date().toISOString().slice(0, 10)}`}
                  tituloPdf={r.label}
                  disabled={false}
                  onGenerarData={async () => {
                    setError('')
                    try {
                      return await generarData(r.tipo)
                    } catch {
                      setError('Ocurrió un error inesperado al generar el reporte.')
                      throw new Error('Failed')
                    }
                  }}
                />
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: C.light, border: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 12, color: C.mid, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          <FileText size={13} />
          Cada reporte se puede descargar en CSV, Excel o PDF, con los mismos datos en los tres formatos.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      ` }} />
    </div>
  )
}
