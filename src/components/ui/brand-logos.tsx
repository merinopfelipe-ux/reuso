'use client'

import React from 'react'
import * as Phosphor from '@phosphor-icons/react'

export interface PhosphorIconProps extends Omit<React.ComponentPropsWithoutRef<'svg'>, 'weight'> {
  size?: number | string
  strokeWidth?: number
  duotone?: boolean
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}

// Wrapper HOC to match Phosphor weight prop to Lucide strokeWidth and duotone props
export function wrapPhosphorIcon(
  PhosphorIcon: React.ComponentType<Phosphor.IconProps>,
  defaultColor?: string,
  defaultWeight: PhosphorIconProps['weight'] = 'regular'
) {
  const Component = React.forwardRef<SVGSVGElement, PhosphorIconProps>(
    ({ strokeWidth, duotone, weight, color, ...props }, ref) => {
      let resolvedWeight: PhosphorIconProps['weight'] = weight || defaultWeight

      if (duotone) {
        resolvedWeight = 'duotone'
      } else if (strokeWidth !== undefined) {
        if (strokeWidth <= 1.5) {
          resolvedWeight = 'light'
        } else if (strokeWidth > 2.0) {
          resolvedWeight = 'bold'
        } else {
          resolvedWeight = 'regular'
        }
      }

      return <PhosphorIcon ref={ref} weight={resolvedWeight} color={color || defaultColor || 'currentColor'} {...props} />
    }
  )
  Component.displayName = PhosphorIcon.displayName || 'PhosphorIcon'
  return Component
}

export type WhatsappLogoProps = PhosphorIconProps

// ─── WHATSAPP LOGO (Phosphor Icons) ──────────────────────────────────────────
// Trazo ligero ('light') por defecto para empatar milimétricamente con el grosor
// de los íconos de contorno (como Mail / Envelope de strokeWidth 1.3).
export const WhatsappLogo = wrapPhosphorIcon(Phosphor.WhatsappLogoIcon, undefined, 'light')

// Export official brand and social logos from Phosphor Icons, wrapped for visual compatibility
// Usando nombres *Icon (nombres canónicos en Phosphor v2) para evitar hints de deprecación
// LinkedIn: #0A66C2, Instagram: #E1306C, Facebook: #1877F2, X: #474747, YouTube: #FF0000, TikTok: #474747 (el negro de marca se sustituye por Negro Lurdes)
export const LinkedinLogo = wrapPhosphorIcon(Phosphor.LinkedinLogoIcon, '#0A66C2')
export const InstagramLogo = wrapPhosphorIcon(Phosphor.InstagramLogoIcon, '#E1306C')
export const FacebookLogo = wrapPhosphorIcon(Phosphor.FacebookLogoIcon, '#1877F2')
export const XLogo = wrapPhosphorIcon(Phosphor.XLogoIcon, '#474747')
export const YoutubeLogo = wrapPhosphorIcon(Phosphor.YoutubeLogoIcon, '#FF0000')

export const TiktokLogo = wrapPhosphorIcon(Phosphor.TiktokLogoIcon, '#474747')

