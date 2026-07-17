'use client'

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from 'recharts'
import { Leaf, Droplet as Drop, TreeDeciduous as Tree, Car } from '@/components/ui/icons'

interface Props {
  serieTemporalCO2: { fecha: string; co2: number; calculos: number }[]
  serieCategoria: { categoria: string; cantidad: number; co2: number }[]
  co2Total: number
  aguaTotal: number
}

const BRAND = '#00827C'
const BG_LIGHT = '#EBF5F4'
const TEXT_DARK = '#1A3A38'
const TEXT_MED = '#4D7C79'
const BORDER = 'rgba(0,130,124,0.12)'

function KpiMini({ icono: Icon, color, valor, label }: {
  icono: React.ElementType; color: string; valor: string; label: string
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: TEXT_DARK, margin: 0, lineHeight: 1 }}>{valor}</p>
        <p style={{ fontSize: 11, color: TEXT_MED, margin: '2px 0 0', fontWeight: 600 }}>{label}</p>
      </div>
    </div>
  )
}

function formatFechaCorta(iso: string) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function TooltipCO2({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${BORDER}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: TEXT_MED, margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: BRAND, fontWeight: 700, margin: 0 }}>{payload[0].value} kg CO₂</p>
      {payload[1] && <p style={{ color: TEXT_MED, margin: '2px 0 0' }}>{payload[1].value} cálculo{payload[1].value !== 1 ? 's' : ''}</p>}
    </div>
  )
}

function TooltipCategoria({ active, payload }: { active?: boolean; payload?: { name: string; value: number; fill: string; payload?: { categoria?: string; cantidad?: number } }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${BORDER}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: TEXT_MED, margin: '0 0 4px' }}>{payload[0]?.payload?.categoria}</p>
      <p style={{ color: BRAND, fontWeight: 700, margin: 0 }}>{payload[0].value} kg CO₂</p>
      <p style={{ color: TEXT_MED, margin: '2px 0 0' }}>{payload[0]?.payload?.cantidad} objetos</p>
    </div>
  )
}

export function ReportesClient({ serieTemporalCO2, serieCategoria, co2Total, aguaTotal }: Props) {
  const arboles = Math.round(co2Total / 8.0)
  const coches = parseFloat((co2Total / 4600).toFixed(2))

  return (
    <div>
      {/* KPIs resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiMini icono={Leaf} color="#00827C" valor={`${co2Total.toFixed(2)} kg`} label="CO₂ total evitado" />
        <KpiMini icono={Drop} color="#59A6E4" valor={`${aguaTotal.toLocaleString('es-CO')} L`} label="Agua ahorrada" />
        <KpiMini icono={Tree} color="#38B98E" valor={String(arboles)} label="Árboles equivalentes" />
        <KpiMini icono={Car} color="#AD7C43" valor={String(coches)} label="Vehículos retirados" />
      </div>

      {/* Gráfica temporal CO₂ */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
        padding: '20px 20px 12px', marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 4px' }}>
          CO₂ evitado - últimos 30 días
        </h2>
        <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 20px' }}>
          Acumulado diario del equipo
        </p>

        {serieTemporalCO2.every((d) => d.co2 === 0) ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_MED, fontSize: 14 }}>
            Sin cálculos en los últimos 30 días.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={serieTemporalCO2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCO2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis
                dataKey="fecha"
                tickFormatter={formatFechaCorta}
                tick={{ fontSize: 11, fill: TEXT_MED }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: TEXT_MED }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipCO2 />} />
              <Area
                type="monotone"
                dataKey="co2"
                stroke={BRAND}
                strokeWidth={2}
                fill="url(#gradCO2)"
                dot={false}
                activeDot={{ r: 5, fill: BRAND }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfica por categoría */}
      {serieCategoria.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
          padding: '20px 20px 12px', marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: '0 0 4px' }}>
            CO₂ por categoría
          </h2>
          <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 20px' }}>
            Total histórico acumulado
          </p>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serieCategoria} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis
                dataKey="categoria"
                tick={{ fontSize: 11, fill: TEXT_MED }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: TEXT_MED }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipCategoria />} />
              <Bar
                dataKey="co2"
                fill={BRAND}
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla resumen por categoría */}
      {serieCategoria.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>
              Resumen por categoría
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: BG_LIGHT }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: TEXT_MED }}>Categoría</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: TEXT_MED }}>Objetos</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: TEXT_MED }}>CO₂ evitado</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 600, color: TEXT_MED }}>% del total</th>
                </tr>
              </thead>
              <tbody>
                {serieCategoria.map((row, idx) => (
                  <tr
                    key={row.categoria}
                    style={{
                      borderBottom: `1px solid ${BORDER}`,
                      background: idx % 2 === 0 ? 'transparent' : `rgba(0,130,124,0.02)`,
                    }}
                  >
                    <td style={{ padding: '10px 20px', color: TEXT_DARK, fontWeight: 600 }}>{row.categoria}</td>
                    <td style={{ padding: '10px 20px', color: TEXT_MED, textAlign: 'right' }}>{row.cantidad}</td>
                    <td style={{ padding: '10px 20px', color: BRAND, fontWeight: 700, textAlign: 'right' }}>
                      {row.co2.toFixed(3)} kg
                    </td>
                    <td style={{ padding: '10px 20px', color: TEXT_MED, textAlign: 'right' }}>
                      {co2Total > 0 ? ((row.co2 / co2Total) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {serieCategoria.length === 0 && serieTemporalCO2.every((d) => d.co2 === 0) && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
        }}>
          <p style={{ fontSize: 15, color: TEXT_MED, margin: 0 }}>
            Aún no hay datos de impacto. Registra objetos reutilizados para ver los reportes.
          </p>
        </div>
      )}
    </div>
  )
}
