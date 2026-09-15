import { FooterPublic } from '@/components/footer-public'
import { ProteccionPublica } from '@/components/proteccion-publica'
import { getFechaActualizacionLegal } from '@/lib/legal/fecha-actualizacion'
import { EMAIL_CONTACTO_LEGAL } from '@/lib/constants/contacto'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const fechaActualizacion = await getFechaActualizacionLegal()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Sin header global - cada página legal gestiona su propio header sticky */}
      <main style={{ flex: 1 }}>
        <ProteccionPublica>{children}</ProteccionPublica>
      </main>

      <FooterPublic
        ip={fechaActualizacion}
        lastVisit={EMAIL_CONTACTO_LEGAL}
        ipLabel="Última actualización"
        lastVisitLabel="Contacto"
        lastVisitHref={`mailto:${EMAIL_CONTACTO_LEGAL}`}
      />
    </div>
  )
}
