import type { Plan } from '@/types'

const PLAN_CONFIG: Record<Plan, { label: string; bg: string; color: string }> = {
  free:      { label: 'Explora',           bg: 'var(--color-brand-light)', color: 'var(--color-success-content)' },
  lab:       { label: 'Circular Lab',      bg: 'var(--color-brand-light)', color: 'var(--color-brand)' },
  impulso:   { label: 'Impulso Sostenible', bg: 'rgba(89,166,228,0.15)',    color: 'var(--color-info-content)' },
  ilimitado: { label: 'Impacto Ilimitado', bg: 'var(--bg-integrated)',     color: 'var(--color-success-content)' },
}

export function PlanBadge({ plan }: { plan: Plan }) {
  const { label, bg, color } = PLAN_CONFIG[plan]
  return (
    <span
      className="plan-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 700,
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
