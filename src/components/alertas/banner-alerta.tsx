'use client'

import {
  X,
  Info,
  Tag,
  TriangleAlert as Warning,
} from 'lucide-react'
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
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, flex: 1 }}>
        <Icono size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'inherit' }}>
            {alerta.titulo}
          </span>
          <span style={{ fontSize: 13, opacity: 0.95, color: 'inherit', lineHeight: 1.4 }}>
            {alerta.mensaje}
          </span>
        </div>
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
        className="hover-rotate-90 hover-press"
      >
        <X size={16} />
      </button>
    </div>
  )
}
