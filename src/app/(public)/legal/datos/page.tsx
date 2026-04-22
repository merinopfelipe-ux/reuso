import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Tratamiento de Datos Personales',
  description:
    'Política de Tratamiento de Datos Personales de Grupo MLP S.A.S., conforme a la Ley 1581 de 2012.',
}

const SECCIONES = [
  { id: 'objetivos', label: 'Objetivos' },
  { id: 'alcance', label: 'Alcance' },
  { id: 'destinatarios', label: 'Destinatarios' },
  { id: 'definiciones', label: 'Definiciones' },
  { id: 'finalidades', label: 'Finalidades' },
  { id: 'derechos', label: 'Derechos del titular' },
  { id: 'menores', label: 'Menores de edad' },
  { id: 'peticiones', label: 'Peticiones y reclamos' },
  { id: 'vigencia', label: 'Vigencia' },
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

export default function DatosPage() {
  return (
    <LegalPageLayout
      titulo="Tratamiento de Datos Personales"
      breadcrumbLabel="Tratamiento de Datos"
      secciones={SECCIONES}
      resumen="Grupo MLP S.A.S. trata tus datos para operar la plataforma y prestarte el servicio. No los vende ni los comparte con terceros sin tu autorización. Tienes derecho a conocer, actualizar, rectificar y eliminar tu información en cualquier momento. Si eres de la Unión Europea, aplica también el RGPD y puedes ejercer todos los derechos que este te otorga."
      leeTabien={[
        { href: '/legal/privacidad', label: 'Política de Privacidad' },
        { href: '/legal/terminos', label: 'Términos y Condiciones' },
        { href: '/legal/cookies', label: 'Política de Cookies' },
      ]}
    >
      <p style={p}>
        En desarrollo de la Ley 1581 de 2012 y el Decreto 1377 de 2013, Grupo MLP S.A.S.,
        sociedad domiciliada en Medellín, Colombia, reglamenta el tratamiento de los datos
        personales de sus clientes, usuarios, proveedores y aliados. Al entregar cualquier
        tipo de información personal, el titular acepta que Grupo MLP S.A.S. la usa de acuerdo
        con esta política y solo para los propósitos aquí establecidos. Para usuarios en la
        Unión Europea, aplica también el Reglamento General de Protección de Datos (RGPD).
      </p>

      <h2 id="objetivos" style={h2}>Objetivos</h2>
      <p style={p}>
        Grupo MLP S.A.S. establece los criterios para el tratamiento de datos personales, que
        comprende toda operación sobre datos: recolección, almacenamiento, uso, circulación y
        supresión. La empresa puede actuar como responsable o encargado del tratamiento según
        el caso.
      </p>

      <h2 id="alcance" style={h2}>Alcance</h2>
      <p style={p}>
        Esta política aplica a los datos de personas naturales almacenados en las bases de
        datos administradas por Grupo MLP S.A.S. e incluye todas las áreas de la empresa que
        involucren datos de carácter personal. Grupo MLP S.A.S. ofrece servicios de
        certificación de impacto ambiental por reúso de objetos a través de la plataforma
        Calculadora de Reúso.
      </p>

      <h2 id="destinatarios" style={h2}>Destinatarios</h2>
      <p style={p}>Esta política aplica a quienes mantienen cualquier relación con Grupo MLP S.A.S.:</p>
      <ul style={ul}>
        <li style={li}>Clientes y organizaciones</li>
        <li style={li}>Empleados de las organizaciones</li>
        <li style={li}>Usuarios registrados en la plataforma</li>
        <li style={li}>Aliados, contratistas y proveedores</li>
        <li style={li}>Clientes potenciales y terceros interesados</li>
      </ul>

      <h2 id="definiciones" style={h2}>Definiciones</h2>
      <ul style={ul}>
        <li style={li}>
          <strong>Autorización:</strong> consentimiento previo, expreso e informado del titular
          para el tratamiento de sus datos.
        </li>
        <li style={li}>
          <strong>Base de datos:</strong> listado organizado con los datos personales objeto de
          tratamiento.
        </li>
        <li style={li}>
          <strong>Dato personal:</strong> cualquier información vinculada a una persona natural
          determinada o determinable.
        </li>
        <li style={li}>
          <strong>Dato sensible:</strong> dato que afecta la intimidad del titular o cuyo uso
          indebido puede generar discriminación (origen racial, orientación política, salud, vida
          sexual, datos biométricos, entre otros).
        </li>
        <li style={li}>
          <strong>Habeas data:</strong> derecho fundamental de toda persona a conocer, actualizar,
          rectificar y cancelar la información personal que recibe tratamiento.
        </li>
        <li style={li}>
          <strong>Titular del dato:</strong> persona natural cuyos datos son objeto de
          tratamiento.
        </li>
        <li style={li}>
          <strong>Responsable del tratamiento:</strong> Grupo MLP S.A.S., quien decide sobre la
          base de datos y el tratamiento.
        </li>
        <li style={li}>
          <strong>Encargado del tratamiento:</strong> persona natural o jurídica que realiza el
          tratamiento de datos por cuenta del responsable.
        </li>
        <li style={li}>
          <strong>Transferencia:</strong> envío de datos a un tercero dentro o fuera del
          territorio nacional para su tratamiento.
        </li>
      </ul>

      <h2 id="finalidades" style={h2}>Finalidades del tratamiento</h2>
      <p style={p}>
        Grupo MLP S.A.S. trata los datos para las siguientes finalidades, estrictamente
        relacionadas con su objeto social:
      </p>
      <ul style={ul}>
        <li style={li}>Celebración y ejecución de contratos de servicio.</li>
        <li style={li}>Creación y gestión de accesos en la plataforma.</li>
        <li style={li}>Elaboración y envío de facturas y documentos comerciales.</li>
        <li style={li}>Realización de encuestas y seguimiento de calidad del servicio.</li>
        <li style={li}>Envío de comunicaciones relacionadas con el servicio contratado.</li>
        <li style={li}>Actividades de mercadeo y comunicación institucional.</li>
        <li style={li}>Envío de información a entidades gubernamentales o judiciales cuando la ley lo exija.</li>
        <li style={li}>Prevención de fraudes y actividades de seguridad.</li>
        <li style={li}>Capacitación y entrenamiento de usuarios.</li>
      </ul>
      <p style={p}>
        Grupo MLP S.A.S. no usa los datos para propósitos diferentes a los aquí establecidos
        sin contar con autorización expresa del titular o sin que medie una excepción legal.
      </p>

      <h2 id="derechos" style={h2}>Derechos del titular</h2>
      <p style={p}>
        El titular de los datos personales tiene los siguientes derechos:
      </p>
      <ul style={ul}>
        <li style={li}>
          <strong>Habeas data:</strong> conocer, actualizar, rectificar y excluir su información
          de las bases de datos de Grupo MLP S.A.S.
        </li>
        <li style={li}>
          <strong>Revocatoria del consentimiento:</strong> revocar la autorización otorgada para
          un tratamiento específico, salvo excepciones legales o contractuales.
        </li>
        <li style={li}>
          <strong>Oposición:</strong> oponerse al tratamiento de sus datos cuando no exista
          obligación legal que lo impida.
        </li>
        <li style={li}>
          <strong>Presentar quejas y reclamos:</strong> ante Grupo MLP S.A.S. o ante la
          Superintendencia de Industria y Comercio.
        </li>
        <li style={li}>
          <strong>Solicitar prueba de autorización:</strong> pedir constancia del consentimiento
          otorgado para el tratamiento.
        </li>
      </ul>
      <p style={p}>
        Para usuarios en la Unión Europea, aplican adicionalmente los derechos de portabilidad,
        supresión (&ldquo;derecho al olvido&rdquo;) y limitación del tratamiento que establece el RGPD.
      </p>

      <h2 id="menores" style={h2}>Menores de edad</h2>
      <p style={p}>
        Grupo MLP S.A.S. prohíbe el tratamiento de datos personales de menores de edad, salvo
        los datos de naturaleza pública. Los derechos de los menores los ejercen sus representantes
        legales. Si la plataforma detecta que un menor de edad se ha registrado, cancela su
        cuenta y elimina su información de manera inmediata.
      </p>

      <h2 id="peticiones" style={h2}>Peticiones, quejas y reclamos</h2>
      <p style={p}>
        El titular tiene derecho a realizar de forma gratuita consultas, solicitudes y reclamos
        sobre el tratamiento de sus datos. La solicitud debe incluir nombre completo, descripción
        de la consulta, dirección, teléfono y correo electrónico.
      </p>
      <p style={p}>
        Grupo MLP S.A.S. responde en un plazo máximo de 10 días hábiles contados desde la fecha
        de radicación. Cuando no sea posible responder en ese plazo, la empresa informa los
        motivos de la demora y la fecha en que atenderá la solicitud, que no puede superar los
        cinco días hábiles adicionales.
      </p>
      <p style={p}>
        Envía tu solicitud a:{' '}
        <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          servicio@lurdes.co
        </a>
        . También puedes usar el formulario de{' '}
        <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          consultas legales
        </Link>
        .
      </p>

      <h2 id="vigencia" style={h2}>Vigencia</h2>
      <p style={p}>
        Esta política entra en vigencia desde su publicación. Las bases de datos de Grupo MLP
        S.A.S. tienen una vigencia de 10 años, prorrogables por períodos iguales. Grupo MLP
        S.A.S. puede revisar y modificar esta política en cualquier momento. Los cambios rigen
        desde su publicación en la plataforma.
      </p>
    </LegalPageLayout>
  )
}
