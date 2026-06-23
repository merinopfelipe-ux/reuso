import { headers } from 'next/headers'
import { FooterPublic } from '@/components/footer-public'

const FECHA_ACTUALIZACION = '18 de abril de 2026'
const EMAIL_CONTACTO = 'servicio@lurdes.co'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  void headers()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Sin header global - cada página legal gestiona su propio header sticky */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      <FooterPublic
        ip={FECHA_ACTUALIZACION}
        lastVisit={EMAIL_CONTACTO}
        ipLabel="Actualización:"
        lastVisitLabel="Contacto:"
        lastVisitHref="mailto:servicio@lurdes.co"
      />
    </div>
  )
}
