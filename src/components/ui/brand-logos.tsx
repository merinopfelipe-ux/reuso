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
export function wrapPhosphorIcon(PhosphorIcon: React.ComponentType<any>) {
  const Component = React.forwardRef<SVGSVGElement, PhosphorIconProps>(
    ({ strokeWidth, duotone, weight, ...props }, ref) => {
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

      return <PhosphorIcon ref={ref} weight={resolvedWeight} {...props} />
    }
  )
  Component.displayName = PhosphorIcon.displayName || 'PhosphorIcon'
  return Component
}

// Export official brand and social logos from Phosphor Icons, wrapped for visual compatibility
export const WhatsappLogo = wrapPhosphorIcon(Phosphor.WhatsappLogo)
export const LinkedinLogo = wrapPhosphorIcon(Phosphor.LinkedinLogo)
export const InstagramLogo = wrapPhosphorIcon(Phosphor.InstagramLogo)
export const FacebookLogo = wrapPhosphorIcon(Phosphor.FacebookLogo)
export const XLogo = wrapPhosphorIcon(Phosphor.XLogo)
export const YoutubeLogo = wrapPhosphorIcon(Phosphor.YoutubeLogo)
