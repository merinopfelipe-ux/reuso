import { ProteccionPublica } from '@/components/proteccion-publica'

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return <ProteccionPublica>{children}</ProteccionPublica>
}
