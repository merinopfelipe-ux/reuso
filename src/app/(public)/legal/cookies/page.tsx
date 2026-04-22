import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Política de Cookies',
  description: 'Qué cookies usa la Calculadora de Reúso, para qué y cómo puedes gestionarlas.',
}

const SECCIONES = [
  { id: 'que-son', label: '¿Qué son las cookies?' },
  { id: 'que-usamos', label: 'Cookies que usamos' },
  { id: 'terceros', label: 'Cookies de terceros' },
  { id: 'gestion', label: 'Gestión de cookies' },
  { id: 'ley', label: 'Marco legal' },
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

export default function CookiesPage() {
  return (
    <LegalPageLayout
      titulo="Política de Cookies"
      breadcrumbLabel="Política de Cookies"
      secciones={SECCIONES}
      resumen="Usamos cookies técnicas necesarias para que la plataforma funcione correctamente (sesión, preferencias de tema) y cookies de análisis para mejorar el servicio. No usamos cookies publicitarias. Puedes rechazar las cookies no esenciales en cualquier momento desde la configuración de tu navegador."
      leeTabien={[
        { href: '/legal/privacidad', label: 'Política de Privacidad' },
        { href: '/legal/datos', label: 'Tratamiento de Datos' },
        { href: '/legal/terminos', label: 'Términos y Condiciones' },
      ]}
    >
      <h2 id="que-son" style={h2}>¿Qué son las cookies?</h2>
      <p style={p}>
        Las cookies son pequeños archivos de texto que la plataforma almacena en el dispositivo
        del Usuario cuando accede al sitio web. Permiten que la plataforma recuerde información
        entre sesiones, como las preferencias de idioma o el estado de autenticación.
      </p>

      <h2 id="que-usamos" style={h2}>Cookies que usamos</h2>
      <p style={p}>La Calculadora de Reúso usa los siguientes tipos de cookies:</p>
      <ul style={ul}>
        <li style={li}>
          <strong>Cookies de sesión (esenciales):</strong> mantienen activa la sesión del
          Usuario autenticado. Sin ellas la plataforma no puede funcionar. No las puedes
          desactivar mientras uses el servicio.
        </li>
        <li style={li}>
          <strong>Cookies de preferencias:</strong> guardan la configuración de tema claro/oscuro
          y otras preferencias de la interfaz. Mejoran la experiencia del Usuario entre visitas.
        </li>
        <li style={li}>
          <strong>Cookies de consentimiento:</strong> registran si el Usuario aceptó esta
          política de cookies. Caducan después de 12 meses.
        </li>
        <li style={li}>
          <strong>Cookies de análisis (opcionales):</strong> permiten medir el uso de la
          plataforma de forma agregada y anónima para mejorar el servicio. No vinculamos estos
          datos con la identidad del Usuario.
        </li>
      </ul>

      <h2 id="terceros" style={h2}>Cookies de terceros</h2>
      <p style={p}>
        La plataforma utiliza servicios de terceros que pueden instalar sus propias cookies:
      </p>
      <ul style={ul}>
        <li style={li}>
          <strong>Supabase:</strong> proveedor de infraestructura y autenticación. Instala
          cookies técnicas necesarias para la gestión de sesiones seguras.
        </li>
        <li style={li}>
          <strong>Vercel:</strong> proveedor de hosting. Puede instalar cookies técnicas
          relacionadas con el enrutamiento de tráfico y el rendimiento.
        </li>
      </ul>
      <p style={p}>
        Estos terceros tienen sus propias políticas de privacidad. Para más información sobre el
        tratamiento de tus datos, consulta la{' '}
        <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          política de privacidad
        </Link>
        .
      </p>

      <h2 id="gestion" style={h2}>Gestión de cookies</h2>
      <p style={p}>
        El Usuario puede aceptar o rechazar las cookies no esenciales desde la configuración de
        su navegador. La mayoría de navegadores modernos (Chrome, Firefox, Safari, Edge) permiten
        eliminar las cookies almacenadas y bloquear su instalación futura.
      </p>
      <p style={p}>
        Al rechazar las cookies técnicas o de sesión, la plataforma puede dejar de funcionar
        correctamente. Las cookies de análisis y preferencias son opcionales y no afectan la
        funcionalidad principal del servicio.
      </p>

      <h2 id="ley" style={h2}>Marco legal</h2>
      <p style={p}>
        Esta política cumple con las disposiciones de la Ley 1581 de 2012 (protección de datos
        personales en Colombia). Para usuarios en la Unión Europea, aplica también la Directiva
        de Privacidad Electrónica (ePrivacy) y el Reglamento General de Protección de Datos
        (RGPD). Para usuarios en California, aplica la Ley de Privacidad del Consumidor de
        California (CCPA).
      </p>
      <p style={p}>
        Ante cualquier consulta sobre el uso de cookies, comunícate a{' '}
        <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          servicio@lurdes.co
        </a>{' '}
        o usa el formulario de{' '}
        <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          consultas legales
        </Link>
        .
      </p>
    </LegalPageLayout>
  )
}
