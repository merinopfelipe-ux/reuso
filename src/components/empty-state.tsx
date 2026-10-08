import type { ElementType } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icono: ElementType
  titulo: string
  descripcion: string
  cta?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icono: Icono, titulo, descripcion, cta }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--color-brand-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Icono size={28} color="var(--color-brand)" />
      </div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
        {titulo}
      </p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.5 }}>
        {descripcion}
      </p>
      {cta && (
        cta.href ? (
          <Button href={cta.href} className="mt-2">{cta.label}</Button>
        ) : (
          <Button onClick={cta.onClick} className="mt-2">{cta.label}</Button>
        )
      )}
    </div>
  )
}
