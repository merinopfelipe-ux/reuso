'use client'

import { useEffect, useState } from 'react'
import { TrendingUp as TrendUp, TrendingDown as TrendDown, Minus } from '@/components/ui/icons'
import type { LucideIcon as Icon } from 'lucide-react'
import { Leaf, Droplet, Package, Medal } from '@/components/ui/icons'

export interface IndicadorSemanal {
  porcentaje: number
  direccion: 'sube' | 'baja' | 'igual'
}

export type FormatoKpi = 'decimal2' | 'agua' | 'entero'
export type IconoKpi = 'leaf' | 'droplets' | 'box' | 'award'

const ICONOS: Record<IconoKpi, Icon> = {
  leaf: Leaf,
  droplets: Droplet,
  box: Package,
  award: Medal,
}

const FORMATEADORES: Record<FormatoKpi, (v: number) => string> = {
  decimal2: (v) => v.toFixed(2),
  agua: (v) => Math.round(v).toLocaleString('es-CO'),
  entero: (v) => String(Math.round(v)),
}

interface Props {
  titulo: string
  valorFinal: number
  formato: FormatoKpi
  unidad?: string
  icono: IconoKpi
  color: string
  indicador?: IndicadorSemanal
}

export function KpiCardAnimado({ titulo, valorFinal, formato, unidad, icono, color, indicador }: Props) {
  const Icono = ICONOS[icono]
  const [valorMostrado, setValorMostrado] = useState(0)

  useEffect(() => {
    if (valorFinal === 0) {
      setValorMostrado(0)
      return
    }
    const duracion = 900
    const pasos = 40
    const intervalo = duracion / pasos
    const incremento = valorFinal / pasos
    let paso = 0

    const timer = setInterval(() => {
      paso++
      if (paso >= pasos) {
        setValorMostrado(valorFinal)
        clearInterval(timer)
      } else {
        setValorMostrado(incremento * paso)
      }
    }, intervalo)

    return () => clearInterval(timer)
  }, [valorFinal])

  const IndicadorIcono = indicador?.direccion === 'sube'
    ? TrendUp
    : indicador?.direccion === 'baja'
      ? TrendDown
      : Minus

  const indicadorColor = indicador?.direccion === 'sube'
    ? '#2E8B6E'
    : indicador?.direccion === 'baja'
      ? '#CC3C2A'
      : 'var(--text-secondary)'

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          flexShrink: 0,
          background: `${color}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icono size={20} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            margin: '0 0 4px',
          }}
        >
          {titulo}
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
          {FORMATEADORES[formato](valorMostrado)}
          {unidad && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 4 }}>
              {unidad}
            </span>
          )}
        </p>
        {indicador && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              marginTop: 6,
              color: indicadorColor,
            }}
          >
            <IndicadorIcono size={12} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {indicador.direccion === 'igual'
                ? 'Sin cambio'
                : `${indicador.direccion === 'sube' ? '+' : '-'}${indicador.porcentaje}%`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 2 }}>
              vs semana anterior
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
