import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Acuerdo de Confidencialidad',
  description:
    'Al usar la Calculadora de Reúso aceptas no replicar ni extraer su metodología de cálculo.',
  robots: { index: false, follow: false },
}

const SECCIONES = [
  { id: 'objeto', label: 'Objeto' },
  { id: 'definicion', label: 'Información confidencial' },
  { id: 'obligaciones', label: 'Obligaciones' },
  { id: 'exclusiones', label: 'Exclusiones' },
  { id: 'titularidad', label: 'Titularidad' },
  { id: 'uso', label: 'Uso de la información' },
  { id: 'vigencia', label: 'Vigencia' },
  { id: 'ley', label: 'Ley aplicable' },
]

const h2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginTop: 40,
  marginBottom: 12,
  color: 'var(--text-primary)',
}
const p: React.CSSProperties = { marginBottom: 16, lineHeight: 1.85 }
const ul: React.CSSProperties = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' }
const li: React.CSSProperties = { marginBottom: 8 }

export default function ConfidencialidadPage() {
  return (
    <LegalPageLayout
      titulo="Acuerdo de Confidencialidad"
      breadcrumbLabel="Confidencialidad"
      secciones={SECCIONES}
      resumen="Al usar la Calculadora de Reúso aceptas no reproducir, distribuir ni replicar la metodología de cálculo, los factores de emisión ni el diseño de la plataforma. La información que obtienes en la plataforma es confidencial y solo puedes usarla para los fines del servicio. El incumplimiento puede generar responsabilidad legal."
      leeTabien={[
        { href: '/legal/reglamento', label: 'Reglamento de Uso' },
        { href: '/legal/terminos', label: 'Términos y Condiciones' },
        { href: '/legal/privacidad', label: 'Política de Privacidad' },
      ]}
    >
      <p style={p}>
        El uso de la Calculadora de Reúso implica la aceptación de este acuerdo de
        confidencialidad. Grupo MLP S.A.S. comparte con el Usuario información técnica,
        metodológica y de negocio que tiene carácter confidencial. El Usuario se compromete a
        conservarla en reserva y a no revelarla a terceros.
      </p>

      <h2 id="objeto" style={h2}>Objeto</h2>
      <p style={p}>
        Grupo MLP S.A.S. comparte con el Usuario información relacionada con la metodología de
        cálculo, factores de emisión, diseño de la plataforma y conocimiento técnico asociado.
        El Usuario se compromete a conservar y mantener esa información de forma estrictamente
        confidencial y a no revelarla a terceros.
      </p>

      <h2 id="definicion" style={h2}>Qué es la información confidencial</h2>
      <p style={p}>
        El Usuario reconoce y acepta que toda la información impresa, visual, verbal o digital
        que Grupo MLP S.A.S. le suministre directa o indirectamente a través de la plataforma
        constituye información reservada y confidencial. Esto incluye:
      </p>
      <ul style={ul}>
        <li style={li}>La metodología de cálculo de CO₂ equivalente evitado.</li>
        <li style={li}>Los factores de emisión usados en los cálculos.</li>
        <li style={li}>El diseño, código fuente y arquitectura de la plataforma.</li>
        <li style={li}>Los contenidos generados por la plataforma (certificados, informes).</li>
        <li style={li}>
          Cualquier información técnica, comercial o de negocio que Grupo MLP S.A.S. proporcione
          en el contexto del servicio.
        </li>
      </ul>
      <p style={p}>
        El acceso del Usuario a esta información no implica la transferencia de ningún derecho
        sobre ella, incluyendo derechos de propiedad intelectual, know-how o patentes. Para
        más detalles sobre los derechos de propiedad, consulta los{' '}
        <Link href="/legal/terminos" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          términos y condiciones
        </Link>
        .
      </p>

      <h2 id="obligaciones" style={h2}>Obligaciones del Usuario</h2>
      <p style={p}>El Usuario se obliga a:</p>
      <ul style={ul}>
        <li style={li}>
          Proteger y mantener en secreto la información confidencial con el mismo grado de
          precaución que utiliza para proteger su propia información confidencial.
        </li>
        <li style={li}>
          Abstenerse de usar la información confidencial total o parcialmente sin el
          consentimiento escrito previo de Grupo MLP S.A.S.
        </li>
        <li style={li}>
          Abstenerse de revelar la información confidencial a terceros no autorizados
          expresamente por Grupo MLP S.A.S.
        </li>
        <li style={li}>
          Abstenerse de copiar, reproducir, distribuir o elaborar resúmenes o extractos de la
          información confidencial sin autorización escrita.
        </li>
        <li style={li}>
          No utilizar la información para fines comerciales propios ni para construir productos
          o servicios competidores o similares a la Calculadora de Reúso.
        </li>
        <li style={li}>
          Cumplir con el análisis de tráfico, detección de intrusos y medidas de seguridad
          cuando use medios electrónicos en el contexto del servicio.
        </li>
      </ul>

      <h2 id="exclusiones" style={h2}>Exclusiones</h2>
      <p style={p}>
        Este acuerdo no aplica sobre la siguiente información:
      </p>
      <ul style={ul}>
        <li style={li}>
          Información que sea del dominio público al momento de recibirla, o que pase a ser
          pública sin negligencia del Usuario.
        </li>
        <li style={li}>
          Información desarrollada de forma autónoma e independiente por el Usuario, sin
          aprovechamiento de la información recibida.
        </li>
        <li style={li}>
          Información que el Usuario deba revelar por requerimiento legal o de autoridad
          competente. En ese caso, el Usuario informa a Grupo MLP S.A.S. antes de la
          divulgación para que pueda tomar las medidas de protección pertinentes.
        </li>
        <li style={li}>
          Información revelada con aprobación escrita previa de Grupo MLP S.A.S.
        </li>
      </ul>

      <h2 id="titularidad" style={h2}>Titularidad de la información</h2>
      <p style={p}>
        El Usuario reconoce la titularidad de Grupo MLP S.A.S. sobre la información
        confidencial y la usa exclusivamente para los fines del servicio contratado. El acceso
        a la información no crea ninguna relación de sociedad, agencia ni mandato entre el
        Usuario y Grupo MLP S.A.S.
      </p>

      <h2 id="uso" style={h2}>Uso de la información confidencial</h2>
      <p style={p}>
        El Usuario no puede utilizar la información confidencial con fines comerciales propios
        ni para obtener beneficio de un tercero, aunque ese acto no cause perjuicio directo a
        Grupo MLP S.A.S. El Usuario puede usar la información solo en el contexto de los fines
        para los cuales se le proporciona el servicio.
      </p>
      <p style={p}>
        El incumplimiento de este acuerdo constituye violación de secreto comercial y genera
        responsabilidad legal. El perjuicio causado por cada violación lo determina la parte
        afectada conforme a la legislación colombiana y a la normativa de la Comunidad Andina de
        Naciones (CAN) sobre propiedad industrial.
      </p>

      <h2 id="vigencia" style={h2}>Vigencia</h2>
      <p style={p}>
        Las obligaciones de confidencialidad establecidas en este acuerdo tienen vigencia
        indefinida. No expiran al terminar la relación con la plataforma, en especial sobre los
        secretos comerciales y el conocimiento técnico cuya revelación pudiera afectar la
        posición competitiva de Grupo MLP S.A.S.
      </p>

      <h2 id="ley" style={h2}>Ley aplicable y resolución de controversias</h2>
      <p style={p}>
        Este acuerdo se rige por las leyes de la República de Colombia y por la normativa de la
        Comunidad Andina de Naciones sobre información confidencial y secretos industriales
        (artículos 260 a 266 de la Decisión 486 de la Comisión de la CAN). Ante cualquier
        controversia, las partes intentan primero una solución directa y, de no prosperar,
        acuden al Centro de Conciliación, Arbitraje y Amigable Composición de Medellín.
      </p>
    </LegalPageLayout>
  )
}
