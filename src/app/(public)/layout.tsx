import { EstilosPublicos } from '@/components/estilos-publicos'
import { FooterPublic } from '@/components/footer-public'
import { ProteccionPublica } from '@/components/proteccion-publica'
import { getFechaActualizacionLegal } from '@/lib/legal/fecha-actualizacion'
import { EMAIL_CONTACTO_LEGAL } from '@/lib/constants/contacto'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const fechaActualizacion = await getFechaActualizacionLegal()

  // overflowX clip: el footer se dibuja en versión escritorio hasta que hidrata
  // (isMobile empieza en false) y desbordaba a 556 px en celular. Ese desborde
  // ensanchaba la página y desplazaba la barra móvil fija al hidratar (CLS 0.076).
  // `clip` y no `hidden` para no romper los headers sticky de las legales.
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflowX: 'clip' }}>
      <EstilosPublicos />
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
