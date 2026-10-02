'use client'

import React from 'react'
import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
}

/**
 * Componente oficial de Miga de Pan (Breadcrumb) según el Design System de Reúso.
 * Formato canónico obligatorio (basado en Legales):
 * - Enlaces ancestros navegables: var(--color-brand), fontWeight 500 (font-medium), sin subrayado.
 * - Separador '/': opacity 0.4 (opacidad tenue).
 * - Página actual (último ítem): var(--text-primary), fontWeight 500 (font-medium - NUNCA bold 700/800).
 * - Tamaño: 12px (text-xs), gap: 6px (gap-1.5), flex-wrap: wrap.
 */
export function Breadcrumb({
  items,
  className = '',
  style,
  'aria-label': ariaLabel = 'Ruta de navegación',
}: BreadcrumbProps) {
  if (!items || items.length === 0) return null

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex items-center gap-[6px] text-[12px] flex-wrap text-(--text-secondary) ${className}`}
      style={style}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const hasLink = Boolean(item.href) && !isLast

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {hasLink && item.href ? (
              <Link
                href={item.href}
                className="text-brand font-medium hover:opacity-80 transition-opacity no-underline"
                style={{ color: 'var(--color-brand)', fontWeight: 500, textDecoration: 'none' }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-(--text-primary) font-medium"
                style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <span className="opacity-40 select-none" style={{ opacity: 0.4 }} aria-hidden="true">
                /
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
