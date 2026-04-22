import type { Plan } from '@/types'

const PLAN_CONFIG: Record<Plan, { label: string; bg: string; color: string }> = {
  free:      { label: 'Explora',           bg: 'rgba(77,124,121,0.10)', color: '#4D7C79' },
  lab:       { label: 'Circular Lab',      bg: 'rgba(0,130,124,0.12)',  color: '#00827C' },
  impulso:   { label: 'Impulso Sostenible', bg: 'rgba(89,166,228,0.15)', color: '#2B7FBF' },
  ilimitado: { label: 'Impacto Ilimitado', bg: 'rgba(26,58,56,0.12)',   color: '#1A3A38' },
}

export function PlanBadge({ plan }: { plan: Plan }) {
  const { label, bg, color } = PLAN_CONFIG[plan]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 100,
        fontSize: 12,
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
