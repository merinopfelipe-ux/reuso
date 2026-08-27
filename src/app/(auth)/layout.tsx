import type { Metadata } from 'next'
import { ProteccionPublica } from '@/components/proteccion-publica'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <ProteccionPublica>{children}</ProteccionPublica>
    </div>
  )
}
