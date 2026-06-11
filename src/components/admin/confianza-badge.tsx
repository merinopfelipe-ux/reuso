import type { NivelConfianza } from '@/types'

const CONFIG: Record<NivelConfianza, { label: string; bg: string; color: string }> = {
  alta:  { label: 'Alta',  bg: 'rgba(56,185,142,0.12)',  color: 'var(--color-success-content)' },
  media: { label: 'Media', bg: 'rgba(246,191,62,0.10)',  color: 'var(--color-warning-content)' },
  baja:  { label: 'Baja',  bg: 'rgba(255,94,75,0.08)',   color: 'var(--color-error-content)' },
}

export function ConfianzaBadge({ nivel }: { nivel: NivelConfianza }) {
  const { label, bg, color } = CONFIG[nivel]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 100,
        fontSize: 10,
        fontWeight: 800,
        
        letterSpacing: '0.04em',
        background: bg,
        color,
        whiteSpace: 'nowrap',
        border: '1px solid currentColor',
        opacity: 0.9,
      }}
    >
      {label}
    </span>
  )
}
