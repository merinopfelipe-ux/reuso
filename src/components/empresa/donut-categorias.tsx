'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export interface ItemDonut {
  categoria: string
  co2: number
  porcentaje: number
}

interface Props {
  data: ItemDonut[]
}

const COLORES = ['#00827C', '#38B98E', '#59A6E4', '#F6BF3E', '#AD7C43', '#FF5E4B', '#9B59B6', '#2ECC71']

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: ItemDonut }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid rgba(0,130,124,0.2)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      userSelect: 'none',
    }}>
      <p style={{ margin: '0 0 2px', fontWeight: 600, color: 'var(--text)' }}>{item.categoria}</p>
      <p style={{ margin: 0, color: 'var(--text-muted)' }}>
        {item.co2.toFixed(2)} kg · {item.porcentaje}%
      </p>
    </div>
  )
}

export default function DonutCategorias({ data }: Props) {
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
        Sin datos de categorías
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="co2"
          nameKey="categoria"
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORES[idx % COLORES.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', userSelect: 'none' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
