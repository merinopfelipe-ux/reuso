'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  Info,
  Tag,
  TriangleAlert as Warning,
} from 'lucide-react'
import { useAlertas } from './alertas-context'
import type { TipoAlerta } from '@/types'

const ICONOS: Record<TipoAlerta, React.ElementType> = {
  info: Info,
  promo: Tag,
  estado: Warning,
  urgente: Warning,
}

const COLORES_TIPO: Record<TipoAlerta, string> = {
  info: '#59A6E4',
  promo: '#2E8B6E',
  estado: '#B88000',
  urgente: '#CC3C2A',
}

export function CampanaDropdown() {
  const { alertas, noLeidasCount, marcarLeida } = useAlertas()
  const [abierto, setAbierto] = useState(false)
  const refContenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (refContenedor.current && !refContenedor.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const noLeidas = alertas.filter((a) => !a.leida)
  const badgeLabel = noLeidasCount > 99 ? '99+' : String(noLeidasCount)

  return (
    <div ref={refContenedor} style={{ position: 'relative' }}>
      <button
        aria-label="Alertas"
        onClick={() => setAbierto((prev) => !prev)}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: abierto ? 'var(--color-brand-light)' : 'var(--bg-card)',
          color: abierto ? 'var(--color-brand)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
        className="icon-circle hover-bell hover-press"
      >
        <Bell size={20} />
        {noLeidasCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: 'var(--color-error)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              borderRadius: 100,
              minWidth: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
              boxShadow: '0 2px 4px rgba(204, 60, 42, 0.3)',
              border: '2px solid var(--bg-card)'
            }}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {abierto && (
        <div
          style={{
            position: 'absolute',
            top: 42,
            right: 0,
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Notificaciones {noLeidasCount > 0 && `(${noLeidasCount})`}
          </div>

          {noLeidas.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              Sin notificaciones pendientes
            </div>
          ) : (
            noLeidas.map((alerta, idx) => {
              const Icono = ICONOS[alerta.tipo]
              const color = COLORES_TIPO[alerta.tipo]
              return (
                <button
                  key={alerta.id}
                  onClick={() => {
                    marcarLeida(alerta.id)
                    setAbierto(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: idx < noLeidas.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <Icono size={14} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: '0 0 2px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {alerta.titulo}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {alerta.mensaje}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
