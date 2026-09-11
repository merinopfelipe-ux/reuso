'use client'

import { usePathname } from 'next/navigation'
import { Footer } from '@/components/footer'

interface FooterPublicProps {
  ip?: string
  lastVisit?: string
  ipLabel?: string
  lastVisitLabel?: string
  lastVisitHref?: string
}

export function FooterPublic(props: FooterPublicProps) {
  const pathname = usePathname()
  const hideLegalLinks = pathname.startsWith('/legal')
  const hideDate = pathname === '/' || pathname.startsWith('/status')
  return (
    <Footer
      {...props}
      ip={hideDate ? undefined : props.ip}
      ipLabel={hideDate ? undefined : (props.ipLabel || 'Última actualización:')}
      hideLegalLinks={hideLegalLinks}
    />
  )
}
