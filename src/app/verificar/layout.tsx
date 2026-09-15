import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verificación de informe',
  robots: {
    index: false,
    follow: false,
  },
}

export default function VerificarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
