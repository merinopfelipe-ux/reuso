import type { NivelConfianza } from '@/types'

const CONFIG: Record<NivelConfianza, { label: string; bg: string; color: string }> = {
  alta:  { label: 'Alta',  bg: 'rgba(56,185,142,0.12)',  color: '#1F8C65' },
  media: { label: 'Media', bg: 'rgba(246,191,62,0.15)',  color: '#B88000' },
  baja:  { label: 'Baja',  bg: 'rgba(255,94,75,0.12)',   color: '#CC3C2A' },
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
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
