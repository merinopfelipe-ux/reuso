'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface PuntoMensual {
  mes: string
  co2: number
}

interface Props {
  data: PuntoMensual[]
}

const BRAND = '#00827C'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid rgba(0,130,124,0.2)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      userSelect: 'none',
    }}>
      <p style={{ margin: '0 0 2px', fontWeight: 600, color: 'var(--text)' }}>{label}</p>
      <p style={{ margin: 0, color: BRAND, fontWeight: 700 }}>
        {payload[0].value.toFixed(2)} kg CO₂
      </p>
    </div>
  )
}

export default function GraficaCO2Mensual({ data }: Props) {
  if (data.length === 0) {
    return (
      <div style={{
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 14,
      }}>
        Sin datos para los últimos 6 meses
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCO2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND} stopOpacity={0.25} />
            <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,130,124,0.08)" />
        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="co2"
          stroke={BRAND}
          strokeWidth={2.5}
          fill="url(#gradCO2)"
          dot={false}
          activeDot={{ r: 5, fill: BRAND }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
