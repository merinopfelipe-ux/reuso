'use client'

import { usePathname } from 'next/navigation'
import { Footer } from '@/components/footer'

interface FooterPublicProps {
  ip?: string
  lastVisit?: string
  ipLabel?: string
  lastVisitLabel?: string
  lastVisitHref?: string
  showSocialLinks?: boolean
  hasMobileNav?: boolean
}

export function FooterPublic(props: FooterPublicProps) {
  const pathname = usePathname()
  const isLegal = pathname.startsWith('/legal')
  const hideDate = pathname === '/' || pathname.startsWith('/status')
  return (
    <Footer
      {...props}
      ip={hideDate ? undefined : props.ip}
      ipLabel={hideDate ? undefined : (props.ipLabel || 'Última actualización')}
      hideLegalLinks={false}
      variant={isLegal ? 'legal' : 'public'}
    />
  )
}
