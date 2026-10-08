'use client'

import Link from 'next/link'
import { Loader2 } from '@/components/ui/icons'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'lg' | 'md' | 'sm'

interface ButtonComunProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

type ButtonComoBoton = ButtonComunProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }
type ButtonComoEnlace = ButtonComunProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; disabled?: boolean }

export type ButtonProps = ButtonComoBoton | ButtonComoEnlace

const BASE = 'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-300 hover-pop hover-press disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap'

const SIZES: Record<ButtonSize, string> = {
  lg: 'px-6 py-3.5 sm:px-7 sm:py-4 text-base font-bold shadow-[0_8px_32px_rgba(0,130,124,0.3)] hover:-translate-y-1 hover:scale-105 active:scale-95',
  md: 'px-5 py-2.5 text-sm font-semibold',
  sm: 'px-3.5 py-1.5 text-xs font-semibold',
}

const VARIANTS: Record<ButtonVariant, string> = {
  // text-on-brand: blanco sobre teal en día, #474747 sobre pistacho en noche (regla de contraste del CLAUDE.md).
  primary: 'bg-brand text-(--text-on-brand) hover:bg-brand-hover dark:hover:bg-brand dark:hover:opacity-90',
  secondary: 'bg-(--bg-card) border border-(--border) text-(--text-secondary) hover:bg-(--bg-hover)',
  danger: 'bg-error text-white hover:opacity-90',
  ghost: 'bg-transparent text-(--text-secondary) hover:bg-(--bg-hover)',
}

/**
 * Botón canónico del sistema de diseño. Único componente permitido para
 * acciones primarias/secundarias/destructivas (Guardar, Cancelar, Eliminar).
 * No crear variantes ad-hoc con estilos inline: usar variant/size aquí.
 *
 * Con `href` se renderiza como enlace de Next (navegación sin recarga) con los
 * mismos estilos exactos. Nunca anidar un Button dentro de un Link: un elemento
 * interactivo dentro de otro es HTML inválido y deja dos paradas de teclado.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const clases = `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`
  const contenido = (
    <>
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : icon}
      {children}
    </>
  )

  if (props.href !== undefined) {
    const { href, disabled, ...resto } = props
    const inactivo = disabled || loading
    return (
      <Link
        href={href}
        className={`${clases} ${inactivo ? 'pointer-events-none opacity-50' : ''}`}
        aria-disabled={inactivo || undefined}
        tabIndex={inactivo ? -1 : undefined}
        {...resto}
      >
        {contenido}
      </Link>
    )
  }

  const { type = 'button', disabled, ...resto } = props
  return (
    <button type={type} disabled={disabled || loading} className={clases} {...resto}>
      {contenido}
    </button>
  )
}
