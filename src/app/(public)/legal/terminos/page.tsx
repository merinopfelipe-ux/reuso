import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Términos y Condiciones',
  description: 'Términos y Condiciones de Uso de la Calculadora de Reúso, plataforma de Grupo MLP S.A.S.',
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

export default function TerminosPage() {
  return (
    <LegalPageLayout
      titulo="Términos y Condiciones de Uso"
      breadcrumbLabel="Términos y Condiciones"
      secciones={SECCIONES}
      resumen="Al registrarte o usar la Calculadora de Reúso aceptas estas condiciones. Son las reglas del juego: qué puedes hacer, qué no, y qué hacemos nosotros. Lo más importante: no puedes copiar, replicar ni extraer la metodología de cálculo. Tus datos están protegidos por la Ley 1581 y, si eres de Europa, también por el RGPD."
      leeTabien={[
        { href: '/legal/privacidad', label: 'Política de Privacidad' },
        { href: '/legal/datos', label: 'Tratamiento de Datos' },
        { href: '/legal/reglamento', label: 'Reglamento de Uso' },
      ]}
    >
      <p style={p}>
        Bienvenido a la Calculadora de Reúso, plataforma en línea ubicada en{' '}
        <strong>reuso.lurdes.co</strong>, propiedad de Grupo MLP S.A.S., empresa constituida bajo
        las leyes de la República de Colombia, con domicilio en Medellín, Antioquia. Lee estas
        condiciones antes de usar la plataforma. Al iniciar sesión, registrarte o acceder a la
        calculadora, confirmas que las aceptas en su totalidad y que celebras un contrato
        legalmente vinculante con Grupo MLP S.A.S.
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
        Al usar la calculadora el Usuario acepta estos términos y la{' '}
        <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          política de privacidad y tratamiento de datos
        </Link>
        . Si el Usuario decide abstenerse de aceptarlos, debe cesar de inmediato el uso de la
        plataforma. Estos términos constituyen un contrato legal vinculante entre el Usuario y
        Grupo MLP S.A.S. El grupo también puede actualizar estos términos y notificar al Usuario
        por correo electrónico o mediante aviso en la plataforma.
      </p>

      <h2 id="servicio" style={h2}>Servicio y funcionamiento</h2>
      <p style={p}>
        La Calculadora de Reúso es una plataforma en línea que permite registrar objetos
        reutilizados y obtener una estimación certificada del CO₂ equivalente evitado. El
        Usuario puede generar certificados individuales e informes por rango de fecha, cada uno
        con código de verificación único y QR verificable en{' '}
        <strong>reuso.lurdes.co/verificar</strong>.
      </p>
      <p style={p}>
        Las estimaciones se basan en factores de emisión reconocidos internacionalmente y se
        expresan en kilogramos de CO₂ equivalente (kg CO₂e). Constituyen una herramienta de
        comunicación ambiental y difieren de una auditoría ambiental oficial.
      </p>
      <p style={p}>
        El alcance del servicio disponible varía según el plan contratado (Explora, Circular
        Lab, Impulso Sostenible o Impacto Ilimitado). Para conocer los límites de cada plan,
        consulta el{' '}
        <Link href="/legal/reglamento" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          Reglamento de Uso
        </Link>
        .
      </p>

      <h2 id="cuenta" style={h2}>Creación de cuenta</h2>
      <p style={p}>
        El Usuario puede registrarse como persona natural o como organización. Las
        organizaciones designan un administrador que puede invitar a otros usuarios mediante
        enlace de invitación. El registro requiere nombre completo, correo electrónico y
        contraseña. Las organizaciones deben proporcionar además razón social y NIT.
      </p>
      <p style={p}>
        El Usuario asume la responsabilidad sobre la veracidad de la información suministrada y
        sobre la confidencialidad de sus credenciales. La plataforma se destina exclusivamente
        a personas mayores de edad conforme a la legislación colombiana.
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
          Usar la plataforma conforme a las leyes colombianas vigentes y a los presentes
          términos.
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
        <li style={li}>
          Utilizar la plataforma para fines ilícitos o contrarios al orden público.
        </li>
        <li style={li}>
          Publicar contenido abusivo, amenazante, obsceno, difamatorio o discriminatorio.
        </li>
        <li style={li}>
          Suplantar la identidad de otra persona, organización o entidad.
        </li>
        <li style={li}>
          Aplicar técnicas de ingeniería inversa, descompilación o extracción de datos sobre
          el software de la plataforma.
        </li>
        <li style={li}>
          Emplear scripts automatizados, bots o rastreadores para extraer información de la
          plataforma.
        </li>
        <li style={li}>
          Interferir, obstaculizar o interrumpir el funcionamiento de la plataforma o sus
          servidores.
        </li>
        <li style={li}>
          Vender, ceder o transferir su cuenta a terceros.
        </li>
      </ul>

      <h2 id="licencia" style={h2}>Licencia de uso</h2>
      <p style={p}>
        Grupo MLP S.A.S. otorga al Usuario una licencia limitada, personal, intransferible y
        revocable para acceder y usar la plataforma conforme a estos términos. El Usuario no
        adquiere ningún derecho sobre el código fuente, diseño, metodología de cálculo, marcas
        ni ningún otro elemento de la plataforma. La plataforma incorpora software de terceros
        licenciados a Grupo MLP S.A.S. bajo sus respectivas condiciones.
      </p>

      <h2 id="propiedad" style={h2}>Propiedad intelectual</h2>
      <p style={p}>
        Todos los derechos de propiedad intelectual sobre la plataforma, su diseño, código
        fuente, metodología de cálculo, factores de emisión, marcas y contenidos pertenecen a
        Grupo MLP S.A.S. Queda absolutamente prohibida la reproducción, distribución,
        modificación, extracción o cualquier forma de uso de estos activos sin autorización
        escrita de Grupo MLP S.A.S. Para un detalle completo de las restricciones de uso de la
        información, consulta el{' '}
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
      <p style={p}>
        Grupo MLP S.A.S. declina responsabilidad sobre el contenido de sitios web de terceros
        a los que la plataforma pueda enlazar. El acceso a dichos sitios se realiza bajo la
        exclusiva responsabilidad del Usuario.
      </p>

      <h2 id="ley" style={h2}>Ley aplicable y resolución de controversias</h2>
      <p style={p}>
        Estos términos se rigen por las leyes de la República de Colombia, incluyendo la Ley
        1266 de 2008, la Ley 1480 de 2011 (Estatuto del Consumidor) y la Ley 1581 de 2012
        (protección de datos personales). Para usuarios en la Unión Europea, aplica también el
        Reglamento General de Protección de Datos (RGPD). Ante cualquier controversia, las
        partes agotan primero una instancia de negociación directa y, de persistir la
        controversia, se someten al Tribunal de Arbitramento del Centro de Conciliación,
        Arbitraje y Amigable Composición de Medellín.
      </p>
      <p style={p}>
        Ante cualquier duda, comunícate con Grupo MLP S.A.S. en{' '}
        <a
          href="mailto:servicio@lurdes.co"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          servicio@lurdes.co
        </a>
        . El equipo responde en un plazo máximo de 15 días hábiles.
      </p>
    </LegalPageLayout>
  )
}
