'use client'

import { TrophyIcon as Trophy } from '@animateicons/react/lucide'

export interface ItemRanking {
  user_id: string
  nombre: string
  co2: number
  count: number
}

interface Props {
  data: ItemRanking[]
}

const BRAND = '#00827C'
const MEDALLAS = ['#F6BF3E', '#8B9DC3', '#AD7C43']

export default function RankingEmpleados({ data }: Props) {
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
        Sin cálculos registrados aún
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((item, idx) => {
        const medalla = idx < 3 ? MEDALLAS[idx] : null
        const porcentaje = data[0].co2 > 0 ? (item.co2 / data[0].co2) * 100 : 0
        return (
          <div
            key={item.user_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 10,
              background: idx === 0 ? 'rgba(246,191,62,0.08)' : 'transparent',
              border: idx === 0 ? '1px solid rgba(246,191,62,0.2)' : '1px solid transparent',
            }}
          >
            {/* Posición */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              flexShrink: 0,
              background: medalla ? `${medalla}20` : 'rgba(0,130,124,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: medalla ?? BRAND,
            }}>
              {medalla ? <Trophy size={13} color={medalla} /> : idx + 1}
            </div>

            {/* Avatar inicial */}
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              flexShrink: 0,
              background: `${BRAND}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: BRAND,
            }}>
              {(item.nombre ?? '?')[0].toUpperCase()}
            </div>

            {/* Nombre y barra */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}>
                  {item.nombre}
                </span>
                <span style={{ fontSize: 12, color: BRAND, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                  {item.co2.toFixed(1)} kg
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,130,124,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${porcentaje}%`,
                  background: medalla ?? BRAND,
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {item.count} cálculo{item.count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
