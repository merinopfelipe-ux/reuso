import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Política de Privacidad',
}

const SECCIONES = [
  { id: 'que-recopilamos', label: 'Qué recopilamos' },
  { id: 'como-usamos', label: 'Cómo usamos tus datos' },
  { id: 'con-quien', label: 'Con quién los compartimos' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'derechos', label: 'Tus derechos' },
  { id: 'menores', label: 'Menores de edad' },
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

export default function PrivacidadPage() {
  return (
    <LegalPageLayout
      titulo="Política de Privacidad"
      breadcrumbLabel="Política de Privacidad"
      secciones={SECCIONES}
      resumen="Grupo MLP S.A.S. solo recopila los datos necesarios para prestarte el servicio. No los vende. Puedes solicitar en cualquier momento que los actualicemos, rectifiquemos o eliminemos. Si eres de Europa, aplica el RGPD y tienes derechos adicionales como la portabilidad y el derecho al olvido."
      leeTabien={[
        { href: '/legal/datos', label: 'Tratamiento de Datos' },
        { href: '/legal/terminos', label: 'Términos y Condiciones' },
        { href: '/legal/cookies', label: 'Política de Cookies' },
      ]}
    >
      <p style={p}>
        Grupo MLP S.A.S. respeta la privacidad del Usuario y se compromete a proteger la
        información que registra en la plataforma. Esta política explica cómo recopilamos,
        almacenamos, usamos y divulgamos la información del Usuario. Para un detalle completo
        del marco legal, consulta la{' '}
        <Link href="/legal/datos" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          política de tratamiento de datos personales
        </Link>
        .
      </p>

      <h2 id="que-recopilamos" style={h2}>Qué recopilamos</h2>
      <ul style={ul}>
        <li style={li}>
          <strong>Datos de identificación:</strong> nombre, apellido, apodo opcional, documento
          de identidad (solo cuando aplica para organizaciones).
        </li>
        <li style={li}>
          <strong>Datos de contacto:</strong> correo electrónico, teléfono (opcional).
        </li>
        <li style={li}>
          <strong>Datos de organización:</strong> razón social, NIT, nombre del representante
          legal (solo para cuentas de empresa).
        </li>
        <li style={li}>
          <strong>Datos de uso:</strong> registros de objetos reutilizados, cálculos de CO₂,
          certificados e informes generados.
        </li>
        <li style={li}>
          <strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo,
          páginas visitadas, fecha y hora de acceso.
        </li>
      </ul>

      <h2 id="como-usamos" style={h2}>Cómo usamos tus datos</h2>
      <ul style={ul}>
        <li style={li}>Prestar el servicio de estimación y certificación de CO₂ evitado.</li>
        <li style={li}>Gestionar la cuenta del Usuario y sus accesos a la plataforma.</li>
        <li style={li}>Generar certificados e informes con código de verificación único.</li>
        <li style={li}>Enviar notificaciones relacionadas con el servicio contratado.</li>
        <li style={li}>Cumplir con las obligaciones legales y regulatorias aplicables.</li>
        <li style={li}>Mejorar la plataforma mediante análisis de uso agregado y anónimo.</li>
      </ul>

      <h2 id="con-quien" style={h2}>Con quién compartimos tus datos</h2>
      <p style={p}>
        Grupo MLP S.A.S. no vende la información personal del Usuario. La puede compartir
        solo con:
      </p>
      <ul style={ul}>
        <li style={li}>
          <strong>Proveedores de tecnología:</strong> Supabase (base de datos y autenticación),
          Vercel (hosting). Actúan como encargados del tratamiento bajo acuerdos de
          confidencialidad.
        </li>
        <li style={li}>
          <strong>Autoridades:</strong> cuando la ley colombiana o una orden judicial lo exija.
        </li>
      </ul>

      <h2 id="seguridad" style={h2}>Seguridad</h2>
      <p style={p}>
        Grupo MLP S.A.S. protege la información del Usuario con cifrado de datos en tránsito y
        en reposo, control de acceso por roles específicos y registros de actividad con
        integridad criptográfica. Ningún empleado tiene acceso a las contraseñas de los
        Usuarios.
      </p>

      <h2 id="derechos" style={h2}>Tus derechos</h2>
      <ul style={ul}>
        <li style={li}>
          <strong>Acceso y copia:</strong> solicita una copia de los datos que tenemos sobre ti.
        </li>
        <li style={li}>
          <strong>Rectificación:</strong> actualiza o corrige tu información.
        </li>
        <li style={li}>
          <strong>Supresión:</strong> solicita la eliminación de tus datos cuando no exista
          obligación legal de conservarlos.
        </li>
        <li style={li}>
          <strong>Revocatoria:</strong> retira el consentimiento para el tratamiento de tus datos.
        </li>
        <li style={li}>
          <strong>Portabilidad (RGPD):</strong> si eres de la Unión Europea, recibe tus datos en
          formato estructurado y legible por máquina.
        </li>
      </ul>
      <p style={p}>
        Ejerce estos derechos en{' '}
        <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          servicio@lurdes.co
        </a>{' '}
        o mediante el formulario de{' '}
        <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          consultas legales
        </Link>
        . Respondemos en un máximo de 10 días hábiles.
      </p>

      <h2 id="menores" style={h2}>Menores de edad</h2>
      <p style={p}>
        La plataforma se destina exclusivamente a personas mayores de edad. Si detectamos que
        un menor se ha registrado, eliminamos su información de inmediato.
      </p>

      <h2 id="vigencia" style={h2}>Vigencia y actualizaciones</h2>
      <p style={p}>
        Esta política entra en vigor desde su publicación. Grupo MLP S.A.S. puede actualizarla
        en cualquier momento y notifica al Usuario por correo electrónico o mediante aviso en
        la plataforma. El uso continuado tras la notificación implica la aceptación de los
        cambios.
      </p>

    </LegalPageLayout>
  )
}
