import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Propuesta comercial',
  robots: {
    index: false,
    follow: false,
  },
}

export default function CotLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
