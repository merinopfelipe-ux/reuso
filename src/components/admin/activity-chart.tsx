'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from 'recharts'
import { InfoIcon as Info } from '@animateicons/react/lucide'

interface DatoActividad {
  fecha: string
  calculos: number
}

interface ActivityChartProps {
  data: DatoActividad[]
}

export function ActivityChart({ data }: ActivityChartProps) {
  const hasData = data && data.length > 0

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '24px',
        boxShadow: 'var(--shadow)',
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <p style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
        Actividad - últimos 30 días
      </p>
      
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBrand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.20} />
                <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: 13,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="calculos"
              stroke="var(--color-brand)"
              strokeWidth={3}
              fill="url(#gradBrand)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 12,
          padding: '20px',
          border: '2px dashed var(--border-light)',
          borderRadius: 12,
          color: 'var(--text-secondary)'
        }}>
          <Info size={32} style={{ opacity: 0.4 }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Sin actividad detectada</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.8 }}>Los cálculos realizados aparecerán aquí automáticamente.</p>
          </div>
        </div>
      )}
    </div>
  )
}
