import type { Plan } from '@/types'
import { Leaf, FlaskConical, TrendingUp, Crown } from '@/components/ui/icons'

export const PLAN_CONFIG: Record<Plan, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  free:      { label: 'Explora',            bg: 'rgba(152,95,161,0.15)', color: '#985fa1', icon: Leaf },
  lab:       { label: 'Circular Lab',       bg: 'rgba(0,130,124,0.12)',   color: '#00827C', icon: FlaskConical },
  impulso:   { label: 'Impulso Sostenible', bg: 'rgba(89,166,228,0.15)',  color: '#59A6E4', icon: TrendingUp },
  ilimitado: { label: 'Impacto Ilimitado',  bg: 'rgba(246,191,62,0.15)', color: '#F6BF3E', icon: Crown },
}

export function PlanBadge({ plan }: { plan: Plan }) {
  const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free
  const IconComponent = cfg.icon
  return (
    <span
      className="plan-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
        border: `1px solid ${cfg.color}40`,
      }}
    >
      <IconComponent size={13} color={cfg.color} />
      {cfg.label}
    </span>
  )
}
