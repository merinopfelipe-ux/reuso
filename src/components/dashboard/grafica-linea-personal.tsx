'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface PuntoMensualPersonal {
  mes: string
  co2: number
}

interface Props {
  data: PuntoMensualPersonal[]
}

const BRAND = '#00827C'

function TooltipCustom({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: 'var(--shadow)',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 14, color: BRAND, fontWeight: 700 }}>
        {payload[0].value.toFixed(2)} kg CO₂
      </p>
    </div>
  )
}

export default function GraficaLineaPersonal({ data }: Props) {
  const todosCero = data.every((d) => d.co2 === 0)

  if (todosCero) {
    return (
      <div
        style={{
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: 13,
        }}
      >
        Aún no hay datos para mostrar
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<TooltipCustom />} />
          <Line
            type="monotone"
            dataKey="co2"
            stroke={BRAND}
            strokeWidth={2}
            dot={{ r: 3, fill: BRAND, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: BRAND }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
