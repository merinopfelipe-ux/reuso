'use client'

import React from 'react'
import * as Phosphor from '@phosphor-icons/react'

export interface PhosphorIconProps extends Omit<React.ComponentPropsWithoutRef<any>, 'weight'> {
  size?: number | string
  strokeWidth?: number
  duotone?: boolean
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}

// Wrapper HOC to match Phosphor weight prop to Lucide strokeWidth and duotone props
export function wrapPhosphorIcon(PhosphorIcon: React.ComponentType<any>, defaultColor?: string) {
  const Component = React.forwardRef<SVGSVGElement, PhosphorIconProps>(
    ({ strokeWidth, duotone, weight, color, ...props }, ref) => {
      let resolvedWeight: any = weight || 'regular'
      
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

// Export official brand and social logos from Phosphor Icons, wrapped for visual compatibility
// WhatsApp: #25D366, LinkedIn: #0A66C2, Instagram: #E1306C, Facebook: #1877F2, X: #474747, YouTube: #FF0000
export const WhatsappLogo = wrapPhosphorIcon(Phosphor.WhatsappLogo, '#25D366')
export const LinkedinLogo = wrapPhosphorIcon(Phosphor.LinkedinLogo, '#0A66C2')
export const InstagramLogo = wrapPhosphorIcon(Phosphor.InstagramLogo, '#E1306C')
export const FacebookLogo = wrapPhosphorIcon(Phosphor.FacebookLogo, '#1877F2')
export const XLogo = wrapPhosphorIcon(Phosphor.XLogo, '#474747')
export const YoutubeLogo = wrapPhosphorIcon(Phosphor.YoutubeLogo, '#FF0000')
