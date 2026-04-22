import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Reglamento de Uso',
  robots: { index: false, follow: false },
}

const SECCIONES = [
  { id: 'definiciones', label: 'Definiciones' },
  { id: 'aceptacion', label: 'Aceptación' },
  { id: 'servicio', label: 'Servicio' },
  { id: 'cuenta', label: 'Cuenta' },
  { id: 'obligaciones', label: 'Obligaciones' },
  { id: 'restricciones', label: 'Restricciones' },
  { id: 'licencia', label: 'Licencia' },
  { id: 'propiedad', label: 'Propiedad intelectual' },
  { id: 'responsabilidad', label: 'Responsabilidad' },
  { id: 'ley', label: 'Ley aplicable' },
  { id: 'seguridad-inalterable', label: 'Seguridad Inalterable' },
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

export default function ReglamentoPage() {
  return (
    <LegalPageLayout
      titulo="Reglamento de Uso"
      breadcrumbLabel="Reglamento de Uso"
      secciones={SECCIONES}
      resumen="Al usar la calculadora aceptas este reglamento. Lo más importante: solo puedes usar la plataforma para calcular y certificar el CO₂ que evitas al reutilizar objetos. No puedes copiar, replicar ni extraer la metodología. Tus datos están protegidos. Si incumples, Grupo MLP S.A.S. puede suspender tu acceso de forma inmediata."
      leeTabien={[
        { href: '/legal/terminos', label: 'Términos y Condiciones' },
        { href: '/legal/confidencialidad', label: 'Confidencialidad' },
        { href: '/legal/privacidad', label: 'Política de Privacidad' },
      ]}
    >
      <p style={p}>
        La Calculadora de Reúso, ubicada en <strong>reuso.lurdes.co</strong>, es propiedad de
        Grupo MLP S.A.S., empresa constituida bajo las leyes de la República de Colombia, con
        domicilio en Medellín, Antioquia. Al registrarte o acceder a la plataforma confirmas
        que aceptas este reglamento en su totalidad y que celebras un contrato legalmente
        vinculante con Grupo MLP S.A.S.
      </p>

      <h2 id="definiciones" style={h2}>Definiciones</h2>
      <ul style={ul}>
        <li style={li}>
          <strong>Servicio:</strong> la calculadora estima y certifica el CO₂ evitado al
          mantener objetos en uso en lugar de descartarlos.
        </li>
        <li style={li}>
          <strong>Usuario:</strong> toda persona natural o jurídica que accede o usa la
          plataforma.
        </li>
        <li style={li}>
          <strong>Plataforma:</strong> el sitio web y sus aplicaciones, bajo la marca
          Calculadora de Reúso, propiedad de Grupo MLP S.A.S.
        </li>
        <li style={li}>
          <strong>Grupo MLP S.A.S.:</strong> empresa titular y responsable de la plataforma,
          del tratamiento de datos y de la propiedad intelectual de todos los desarrollos
          asociados.
        </li>
      </ul>

      <h2 id="aceptacion" style={h2}>Aceptación</h2>
      <p style={p}>
        Al usar la calculadora el Usuario acepta este reglamento, los{' '}
        <Link href="/legal/terminos" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          términos y condiciones
        </Link>
        , la{' '}
        <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          política de privacidad
        </Link>{' '}
        y el{' '}
        <Link
          href="/legal/confidencialidad"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          acuerdo de confidencialidad
        </Link>
        . Si el Usuario decide abstenerse de aceptarlos, debe cesar de inmediato el uso de la
        plataforma.
      </p>

      <h2 id="servicio" style={h2}>Servicio y funcionamiento</h2>
      <p style={p}>
        La Calculadora de Reúso es una plataforma en línea que permite registrar objetos
        reutilizados y obtener una estimación certificada del CO₂ equivalente evitado. El
        Usuario puede generar certificados individuales e informes por rango de fecha, cada uno
        con código de verificación único y QR verificable en la plataforma.
      </p>
      <p style={p}>
        Las estimaciones se basan en factores de emisión reconocidos internacionalmente y se
        expresan en kilogramos de CO₂ equivalente (kg CO₂e). Constituyen una herramienta de
        comunicación ambiental y difieren de una auditoría ambiental oficial.
      </p>

      <h2 id="cuenta" style={h2}>Creación de cuenta</h2>
      <p style={p}>
        El Usuario puede registrarse como persona natural o como organización. Las
        organizaciones designan un administrador que puede invitar a otros usuarios mediante
        enlace de invitación. El Usuario asume la responsabilidad sobre la veracidad de la
        información suministrada y sobre la confidencialidad de sus credenciales.
      </p>

      <h2 id="obligaciones" style={h2}>Obligaciones del Usuario</h2>
      <ul style={ul}>
        <li style={li}>
          Mantener la confidencialidad de sus credenciales y abstenerse de compartirlas con
          terceros.
        </li>
        <li style={li}>
          Proporcionar información veraz, completa y actualizada durante el registro y el uso
          de la plataforma.
        </li>
        <li style={li}>
          Usar la plataforma conforme a las leyes colombianas vigentes y a este reglamento.
        </li>
        <li style={li}>
          Informar a Grupo MLP S.A.S. sobre cualquier uso no autorizado de su cuenta.
        </li>
        <li style={li}>
          Respetar el{' '}
          <Link
            href="/legal/confidencialidad"
            style={{ color: 'var(--color-brand)', fontWeight: 600 }}
          >
            acuerdo de confidencialidad
          </Link>{' '}
          y abstenerse de replicar o extraer la metodología de cálculo.
        </li>
      </ul>

      <h2 id="restricciones" style={h2}>Restricciones de uso</h2>
      <p style={p}>El Usuario se obliga a abstenerse de:</p>
      <ul style={ul}>
        <li style={li}>Utilizar la plataforma para fines ilícitos o contrarios al orden público.</li>
        <li style={li}>
          Publicar contenido abusivo, amenazante, obsceno, difamatorio o discriminatorio.
        </li>
        <li style={li}>Suplantar la identidad de otra persona, organización o entidad.</li>
        <li style={li}>
          Aplicar técnicas de ingeniería inversa, descompilación o extracción de datos sobre el
          software de la plataforma.
        </li>
        <li style={li}>
          Emplear scripts automatizados, bots o rastreadores para extraer información de la
          plataforma.
        </li>
        <li style={li}>
          Interferir, obstaculizar o interrumpir el funcionamiento de la plataforma o sus
          servidores.
        </li>
        <li style={li}>Vender, ceder o transferir su cuenta a terceros.</li>
        <li style={li}>
          Realizar capturas de pantalla masivas, enlazamiento (linking) o reproducción de
          contenidos sin autorización escrita de Grupo MLP S.A.S.
        </li>
      </ul>

      <h2 id="licencia" style={h2}>Licencia de uso</h2>
      <p style={p}>
        Grupo MLP S.A.S. otorga al Usuario una licencia limitada, personal, intransferible y
        revocable para acceder y usar la plataforma conforme a este reglamento. El Usuario no
        adquiere ningún derecho sobre el código fuente, diseño, metodología de cálculo, marcas
        ni ningún otro elemento de la plataforma.
      </p>

      <h2 id="propiedad" style={h2}>Propiedad intelectual</h2>
      <p style={p}>
        Todos los derechos de propiedad intelectual sobre la plataforma, su diseño, código
        fuente, metodología de cálculo, factores de emisión, marcas y contenidos pertenecen a
        Grupo MLP S.A.S. Queda absolutamente prohibida su reproducción, distribución,
        modificación o extracción sin autorización escrita. Para conocer el alcance completo de
        las restricciones de confidencialidad, consulta el{' '}
        <Link
          href="/legal/confidencialidad"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          acuerdo de confidencialidad
        </Link>
        .
      </p>

      <h2 id="responsabilidad" style={h2}>Limitación de responsabilidad</h2>
      <p style={p}>
        Grupo MLP S.A.S. declina toda responsabilidad por daños directos, indirectos o
        consecuentes derivados del uso o la imposibilidad de uso de la plataforma. Los valores
        de CO₂e son estimados con base en factores reconocidos internacionalmente y difieren
        de una auditoría ambiental oficial. El Usuario asume de forma exclusiva el riesgo de
        su uso.
      </p>

      <h2 id="ley" style={h2}>Ley aplicable y resolución de controversias</h2>
      <p style={p}>
        Este reglamento se rige por las leyes de la República de Colombia. Ante cualquier
        controversia, las partes agotan primero una instancia de negociación directa y, de
        persistir la controversia, se someten al Tribunal de Arbitramento del Centro de
        Conciliación, Arbitraje y Amigable Composición de Medellín.
      </p>
      <p style={p}>
        Ante cualquier duda, comunícate con Grupo MLP S.A.S. en{' '}
        <a
          href="mailto:servicio@lurdes.co"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          servicio@lurdes.co
        </a>{' '}
        o usa el formulario de{' '}
        <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          consultas legales
        </Link>
        .
      </p>

      <h2 id="seguridad-inalterable" style={h2}>Seguridad Inalterable y Protección de Datos</h2>
      <p style={p}>
        Grupo MLP S.A.S. protege los datos de la plataforma con una tecnología de{' '}
        <strong>Notaría Digital Permanente</strong>. El sistema crea un sello de seguridad único
        para cada cálculo y lo conecta con el registro inmediatamente anterior. Si alguien
        intentara alterar un registro del pasado, el sello se rompe de inmediato y el sistema
        alerta sobre la falta de integridad.
      </p>
      <p style={p}>
        Para los planes Impulso Sostenible e Impacto Ilimitado, la plataforma ofrece un respaldo
        adicional en redes de registro públicas externas (Blockchain). Este proceso funciona
        como un sello notarial externo que demuestra la existencia de los ahorros ambientales
        de forma independiente y permanente, incluso por fuera de la plataforma.
      </p>
    </LegalPageLayout>
  )
}
