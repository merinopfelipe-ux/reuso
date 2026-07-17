'use client'

import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { ResultadosFinancieros } from '@/types'

interface Props {
  resultados: ResultadosFinancieros
  moneda: string
}

function formatK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(Math.round(n))
}

export function GraficaMetricas({ resultados, moneda }: Props) {
  const datosCostos = [
    { nombre: 'TCO', valor: resultados.tco },
    { nombre: 'Costo evitado', valor: resultados.costo_evitado },
  ]

  const datosCirc = [
    { nombre: 'E-ROI %', valor: resultados.e_roi },
    { nombre: 'ICE %', valor: resultados.ice_porcentaje },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '20px',
      fontFamily: "'Open Sans', sans-serif"
    }}>
      {/* Gráfica de Costos */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
          Costos ({moneda})
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={datosCostos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCostos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00827C" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#00827C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,130,124,0.08)" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#7FA8A5' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#7FA8A5' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${moneda} ${formatK(v)}`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => [`${moneda} ${Math.round(Number(value ?? 0)).toLocaleString('es-CO')}`, '']}
            />
            <Area type="monotone" dataKey="valor" stroke="#00827C" strokeWidth={2} fill="url(#gradCostos)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfica de Circularidad y Retorno */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
          Circularidad y Retorno (%)
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={datosCirc} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,130,124,0.08)" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#7FA8A5' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#7FA8A5' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, '']}
            />
            <Line type="monotone" dataKey="valor" stroke="#38B98E" strokeWidth={2.5} dot={{ r: 4, fill: '#38B98E' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
