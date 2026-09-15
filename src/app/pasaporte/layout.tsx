import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pasaporte Digital de Producto',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PasaporteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
