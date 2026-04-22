'use client'

import { X, Info, Tag, Warning } from '@phosphor-icons/react'
import { useAlertas } from './alertas-context'
import type { TipoAlerta } from '@/types'

const PRIORIDAD: Record<TipoAlerta, number> = {
  urgente: 0,
  estado: 1,
  promo: 2,
  info: 3,
}

const COLORES_FONDO: Record<TipoAlerta, string> = {
  info: '#59A6E4',
  promo: '#A8D8A8',
  estado: '#F0C040',
  urgente: '#CC3C2A',
}

const COLORES_TEXTO: Record<TipoAlerta, string> = {
  info: '#FFFFFF',
  promo: '#1A3A38',
  estado: '#1A3A38',
  urgente: '#FFFFFF',
}

const ICONOS: Record<TipoAlerta, React.ElementType> = {
  info: Info,
  promo: Tag,
  estado: Warning,
  urgente: Warning,
}

export function BannerAlerta() {
  const { alertas, marcarLeida, cargando } = useAlertas()

  if (cargando) return null

  const noLeidas = alertas.filter((a) => !a.leida)
  if (noLeidas.length === 0) return null

  const alerta = [...noLeidas].sort((a, b) => PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo])[0]
  const Icono = ICONOS[alerta.tipo]
  const colorFondo = COLORES_FONDO[alerta.tipo]
  const colorTexto = COLORES_TEXTO[alerta.tipo]

  return (
    <div
      style={{
        background: colorFondo,
        color: colorTexto,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        gap: 12,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Icono size={16} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 13, marginRight: 6, flexShrink: 0 }}>
          {alerta.titulo}
        </span>
        <span
          style={{
            fontSize: 13,
            opacity: 0.9,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {alerta.mensaje}
        </span>
      </div>
      <button
        onClick={() => marcarLeida(alerta.id)}
        aria-label="Cerrar alerta"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: colorTexto,
          opacity: 0.8,
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
