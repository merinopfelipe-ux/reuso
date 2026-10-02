'use client'

import { Loader2 } from '@/components/ui/icons'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'lg' | 'md' | 'sm'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const BASE = 'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-300 hover-pop hover-press disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap'

const SIZES: Record<ButtonSize, string> = {
  lg: 'px-6 py-3.5 sm:px-7 sm:py-4 text-base font-bold shadow-[0_8px_32px_rgba(0,130,124,0.3)] hover:-translate-y-1 hover:scale-105 active:scale-95',
  md: 'px-5 py-2.5 text-sm font-semibold',
  sm: 'px-3.5 py-1.5 text-xs font-semibold',
}

const VARIANTS: Record<ButtonVariant, string> = {
  // text-on-brand: blanco sobre teal en día, #474747 sobre pistacho en noche (regla de contraste del CLAUDE.md).
  primary: 'bg-[var(--color-brand)] text-[var(--text-on-brand)] hover:bg-[var(--color-brand-hover)] dark:hover:bg-[var(--color-brand)] dark:hover:opacity-90',
  secondary: 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
  danger: 'bg-[var(--color-error)] text-white hover:opacity-90',
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
