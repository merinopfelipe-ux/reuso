import { headers } from 'next/headers'
import { FooterPublic } from '@/components/footer-public'
import { ProteccionPublica } from '@/components/proteccion-publica'
import { FECHA_ACTUALIZACION_LEGAL, EMAIL_CONTACTO_LEGAL } from '@/lib/constants/contacto'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  void headers()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Sin header global - cada página legal gestiona su propio header sticky */}
      <main style={{ flex: 1 }}>
        <ProteccionPublica>{children}</ProteccionPublica>
      </main>

      <FooterPublic
        ip={FECHA_ACTUALIZACION_LEGAL}
        lastVisit={EMAIL_CONTACTO_LEGAL}
        ipLabel="Actualización:"
        lastVisitLabel="Contacto:"
        lastVisitHref={`mailto:${EMAIL_CONTACTO_LEGAL}`}
      />
    </div>
  )
}
