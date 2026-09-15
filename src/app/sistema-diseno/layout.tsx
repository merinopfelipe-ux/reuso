import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sistema de Diseño · Calculadora de Reúso',
  description: 'Guía oficial de componentes, tokens y patrones de diseño.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SistemaDisenoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
