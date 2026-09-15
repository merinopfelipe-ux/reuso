import type { ReactNode } from 'react'
import type { Icon } from '@/components/ui/icons'

interface KpiCardProps {
  titulo: string
  valor: ReactNode
  unidad?: string
  subtitulo?: string
  icono: Icon
  color?: string
}

export function KpiCard({ titulo, valor, unidad, subtitulo, icono: Icono, color = 'var(--color-brand)' }: KpiCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        boxShadow: 'var(--shadow)',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icono size={22} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>
          {titulo}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span>{valor}</span>
          {unidad && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
              {unidad}
            </span>
          )}
        </p>
        {subtitulo && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            {subtitulo}
          </p>
        )}
      </div>
    </div>
  )
}
