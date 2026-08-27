'use client'

import { Loader2 } from '@/components/ui/icons'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const BASE = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all hover-pop hover-press disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap'

const SIZES: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-sm',
  sm: 'px-3.5 py-1.5 text-xs',
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-brand)] text-[var(--text-on-brand)]',
  secondary: 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]',
  danger: 'bg-[var(--color-error)] text-white',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
}

/**
 * Botón canónico del sistema de diseño. Único componente permitido para
 * acciones primarias/secundarias/destructivas (Guardar, Cancelar, Eliminar).
 * No crear variantes ad-hoc con estilos inline: usar variant/size aquí.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
