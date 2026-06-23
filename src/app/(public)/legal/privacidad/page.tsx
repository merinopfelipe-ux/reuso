'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { Lock, ShieldCheck, HandHeart } from '@phosphor-icons/react'

const ICONOS_PRIVACIDAD = {
  Lock: Lock,
  ShieldCheck: ShieldCheck,
  HandHeart: HandHeart,
}

const T = {
  ES: {
    titulo: 'Política de Privacidad',
    breadcrumb: 'Política de Privacidad',
    secciones: [
      { id: 'que-recopilamos', label: 'Qué recopilamos' },
      { id: 'como-usamos', label: 'Cómo usamos tus datos' },
      { id: 'con-quien', label: 'Con quién los compartimos' },
      { id: 'seguridad', label: 'Seguridad' },
      { id: 'derechos', label: 'Tus derechos' },
      { id: 'menores', label: 'Menores de edad' },
      { id: 'vigencia', label: 'Vigencia' },
    ],
    transparencia: {
      texto: 'En la Calculadora de Reúso protegemos tu información con el mayor rigor. Los modelos de Inteligencia Artificial que asisten en el procesamiento de datos NO utilizan tus datos personales para entrenarse ni los comparten con terceros ajenos a la operación del sistema. Empleamos tus registros exclusivamente para calcular y certificar el impacto ambiental generado.',
      link: 'Lee nuestra política de uso de IA →',
    },
    resumen: 'Solo recopilamos los datos necesarios para prestarte el servicio. No los vendemos. Puedes solicitar en cualquier momento que los actualicemos, rectifiquemos o eliminemos. Si eres de Europa, aplica el RGPD y tienes derechos adicionales como la portabilidad y el derecho al olvido. Si eres de EE. UU. (California), aplica la CCPA. En Colombia aplica la Ley 1581.',
    intro: 'Respetamos tu privacidad y nos comprometemos a proteger la información que registras en la plataforma. Esta política explica cómo recopilamos, almacenamos, usamos y divulgamos tus datos. Para un detalle completo del marco legal, consulta la',
    introLink: 'política de tratamiento de datos personales',
    privacyFirst: {
      titulo: 'Tus datos son tuyos.',
      cards: [
        { icono: 'Lock' as const, nombre: 'No vendemos datos', detalle: 'Nunca compartimos tu información con anunciantes ni brokers.' },
        { icono: 'ShieldCheck' as const, nombre: 'Todo cifrado', detalle: 'Cada conexión usa HTTPS. Tu contraseña vive solo como hash en nuestros servidores.' },
        { icono: 'HandHeart' as const, nombre: 'Tú controlas', detalle: 'Rectifica, descarga o elimina tus datos en cualquier momento desde tu cuenta o por correo.' },
      ],
      cierre: 'Recopilamos lo mínimo para que el servicio funcione. Nada más.',
    },
    queRecopilamos: {
      titulo: 'Qué recopilamos',
      items: [
        { fuerte: 'Datos de identificación:', texto: ' nombre, apellido, apodo opcional, documento de identidad (solo cuando aplica para organizaciones).' },
        { fuerte: 'Datos de contacto:', texto: ' correo electrónico, teléfono (opcional).' },
        { fuerte: 'Datos de organización:', texto: ' razón social, NIT, nombre del representante legal (solo para cuentas de empresa).' },
        { fuerte: 'Datos de uso:', texto: ' registros de objetos reutilizados, cálculos de CO₂, certificados e informes generados.' },
        { fuerte: 'Datos técnicos:', texto: ' dirección IP, tipo de navegador, sistema operativo, páginas visitadas, fecha y hora de acceso.' },
      ],
    },
    comoUsamos: {
      titulo: 'Cómo usamos tus datos',
      items: [
        'Prestar el servicio de estimación y certificación de CO₂ evitado.',
        'Gestionar tu cuenta y tus accesos a la plataforma.',
        'Generar certificados e informes con código de verificación único.',
        'Enviarte notificaciones relacionadas con el servicio contratado.',
        'Cumplir con las obligaciones legales y regulatorias aplicables.',
        'Mejorar la plataforma mediante análisis de uso agregado y anónimo.',
      ],
    },
    conQuien: {
      titulo: 'Con quién compartimos tus datos',
      intro: 'No vendemos tu información personal. Solo la compartimos con:',
      items: [
        { fuerte: 'Proveedores de tecnología:', texto: ' Supabase (base de datos y autenticación), Vercel (hosting). Actúan como encargados del tratamiento bajo acuerdos de confidencialidad.' },
        { fuerte: 'Herramientas de Analítica y Marketing:', texto: ' Google Analytics (análisis de tráfico y marketing) y Hotjar (mapas de calor y comportamiento). Se usan para mejorar la plataforma y entender la interacción de los usuarios.' },
        { fuerte: 'Autoridades:', texto: ' cuando la ley colombiana o una orden judicial lo exija.' },
      ],
    },
    seguridad: {
      titulo: 'Seguridad',
      texto: 'Protegemos tu información con cifrado de datos en tránsito y en reposo, control de acceso por roles específicos y registros de actividad con integridad criptográfica. Ningún empleado tiene acceso a tus contraseñas.',
    },
    derechos: {
      titulo: 'Tus derechos',
      items: [
        { fuerte: 'Acceso y copia:', texto: ' solicita una copia de los datos que tenemos sobre ti.' },
        { fuerte: 'Rectificación:', texto: ' actualiza o corrige tu información.' },
        { fuerte: 'Supresión:', texto: ' solicita la eliminación de tus datos cuando no exista obligación legal de conservarlos.' },
        { fuerte: 'Revocatoria:', texto: ' retira el consentimiento para el tratamiento de tus datos.' },
        { fuerte: 'Portabilidad (RGPD - UE):', texto: ' si eres de la Unión Europea, recibe tus datos en formato estructurado y legible por máquina.' },
        { fuerte: 'Opt-out (CCPA - EE. UU.):', texto: ' si eres residente de California, puedes oponerte a la venta de tu información (no la realizamos, pero te reconocemos el derecho).' },
        { fuerte: 'Ley 1581 (Colombia):', texto: ' como titular tienes derecho a conocer, actualizar, rectificar y suprimir tus datos personales.' },
      ],
      contacto: 'Ejerce estos derechos en',
      link: 'consultas legales',
      respuesta: 'Respondemos en un máximo de 10 días hábiles.',
    },
    menores: {
      titulo: 'Menores de edad',
      texto: 'La plataforma se destina exclusivamente a personas mayores de edad. Si detectamos que un menor se ha registrado, eliminamos su información de inmediato.',
    },
    vigencia: {
      titulo: 'Vigencia y actualizaciones',
      texto: 'Esta política entra en vigor desde su publicación. Podemos actualizarla en cualquier momento y te notificamos por correo electrónico o mediante aviso en la plataforma. El uso continuado tras la notificación implica la aceptación de los cambios.',
    },
    leeTabien: [
      { href: '/legal/datos', label: 'Tratamiento de Datos' },
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
      { href: '/legal/cookies', label: 'Política de Cookies' },
    ],
  },
  ENG: {
    titulo: 'Privacy Policy',
    breadcrumb: 'Privacy Policy',
    secciones: [
      { id: 'que-recopilamos', label: 'What we collect' },
      { id: 'como-usamos', label: 'How we use your data' },
      { id: 'con-quien', label: 'Who we share it with' },
      { id: 'seguridad', label: 'Security' },
      { id: 'derechos', label: 'Your rights' },
      { id: 'menores', label: 'Minors' },
      { id: 'vigencia', label: 'Validity' },
    ],
    transparencia: {
      texto: 'At Calculadora de Reúso we protect your information with the utmost rigor. The Artificial Intelligence models that assist in data processing do NOT use your personal data for training, nor do they share it with third parties outside the operation of the system. We use your records exclusively to calculate and certify the environmental impact generated.',
      link: 'Read our AI usage policy →',
    },
    resumen: 'We only collect the data necessary to provide you with the service. We do not sell it. You can request at any time that we update, correct or delete it. If you are in Europe, the GDPR applies and you have additional rights such as portability and the right to be forgotten. If you are in the US (California), the CCPA applies. In Colombia, Law 1581 applies.',
    intro: 'We respect your privacy and are committed to protecting the information you register on the platform. This policy explains how we collect, store, use and disclose your data. For full details on the legal framework, see the',
    introLink: 'personal data processing policy',
    privacyFirst: {
      titulo: 'Your data belongs to you.',
      cards: [
        { icono: 'Lock' as const, nombre: 'We don\'t sell data', detalle: 'We never share your information with advertisers or data brokers.' },
        { icono: 'ShieldCheck' as const, nombre: 'Everything encrypted', detalle: 'Every connection uses HTTPS. Your password lives only as a hash on our servers.' },
        { icono: 'HandHeart' as const, nombre: 'You are in control', detalle: 'Correct, download or delete your data at any time from your account or by email.' },
      ],
      cierre: 'We collect the minimum needed for the service to work. Nothing more.',
    },
    queRecopilamos: {
      titulo: 'What we collect',
      items: [
        { fuerte: 'Identification data:', texto: ' first name, last name, optional nickname, identity document (only when applicable for organizations).' },
        { fuerte: 'Contact data:', texto: ' email address, phone number (optional).' },
        { fuerte: 'Organization data:', texto: ' legal name, tax ID, legal representative name (for company accounts only).' },
        { fuerte: 'Usage data:', texto: ' records of reused objects, CO₂ calculations, certificates and reports generated.' },
        { fuerte: 'Technical data:', texto: ' IP address, browser type, operating system, pages visited, date and time of access.' },
      ],
    },
    comoUsamos: {
      titulo: 'How we use your data',
      items: [
        'Provide the CO₂ avoided estimation and certification service.',
        'Manage your account and your access to the platform.',
        'Generate certificates and reports with a unique verification code.',
        'Send you notifications related to the contracted service.',
        'Comply with applicable legal and regulatory obligations.',
        'Improve the platform through aggregated and anonymous usage analysis.',
      ],
    },
    conQuien: {
      titulo: 'Who we share your data with',
      intro: 'We do not sell your personal information. We only share it with:',
      items: [
        { fuerte: 'Technology providers:', texto: ' Supabase (database and authentication), Vercel (hosting). They act as data processors under confidentiality agreements.' },
        { fuerte: 'Analytics and Marketing tools:', texto: ' Google Analytics (traffic analysis and marketing) and Hotjar (heatmaps and behavior). They are used to improve the platform and understand user interaction.' },
        { fuerte: 'Authorities:', texto: ' when Colombian law or a court order requires it.' },
      ],
    },
    seguridad: {
      titulo: 'Security',
      texto: 'We protect your information with data encryption in transit and at rest, role-based access control, and activity logs with cryptographic integrity. No employee has access to your passwords.',
    },
    derechos: {
      titulo: 'Your rights',
      items: [
        { fuerte: 'Access and copy:', texto: ' request a copy of the data we hold about you.' },
        { fuerte: 'Rectification:', texto: ' update or correct your information.' },
        { fuerte: 'Erasure:', texto: ' request deletion of your data when there is no legal obligation to keep it.' },
        { fuerte: 'Withdrawal of consent:', texto: ' revoke consent for the processing of your data.' },
        { fuerte: 'Portability (GDPR - EU):', texto: ' if you are in the European Union, receive your data in a structured, machine-readable format.' },
        { fuerte: 'Opt-out (CCPA - US):', texto: ' if you are a California resident, you may opt out of the sale of your information (we do not sell it, but we recognize this right).' },
        { fuerte: 'Law 1581 (Colombia):', texto: ' as a data subject you have the right to know, update, correct and delete your personal data.' },
      ],
      contacto: 'Exercise these rights at',
      link: 'legal inquiries',
      respuesta: 'We respond within a maximum of 10 business days.',
    },
    menores: {
      titulo: 'Minors',
      texto: 'The platform is intended exclusively for adults. If we detect that a minor has registered, we delete their information immediately.',
    },
    vigencia: {
      titulo: 'Validity and updates',
      texto: 'This policy takes effect from its publication. We may update it at any time and will notify you by email or via a notice on the platform. Continued use after notification implies acceptance of the changes.',
    },
    leeTabien: [
      { href: '/legal/datos', label: 'Data Processing' },
      { href: '/legal/terminos', label: 'Terms and Conditions' },
      { href: '/legal/cookies', label: 'Cookie Policy' },
    ],
  },
}

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
  const [lang, setLang] = useState<'ES' | 'ENG'>('ES')
  useEffect(() => {
    const checkIdioma = () => {
      const saved = localStorage.getItem('reuso_idioma')
      if (saved === 'ENG') setLang('ENG')
      else if (saved === 'ES') setLang('ES')
      else setLang(navigator.language.startsWith('es') ? 'ES' : 'ENG')
    }
    checkIdioma()
    window.addEventListener('reuso_idioma_change', checkIdioma)
    return () => window.removeEventListener('reuso_idioma_change', checkIdioma)
  }, [])
  const t = T[lang]

  return (
    <LegalPageLayout
      titulo={t.titulo}
      breadcrumbLabel={t.breadcrumb}
      secciones={t.secciones}
      transparenciaTexto={
        <p style={{ margin: 0 }}>
          {t.transparencia.texto}{' '}
          <Link href="/legal/ia" style={{ color: '#59A6E4', textDecoration: 'underline', fontWeight: 600 }}>
            {t.transparencia.link}
          </Link>
        </p>
      }
      resumen={t.resumen}
      leeTabien={t.leeTabien}
    >
      {/* Bloque Privacy First */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ ...p, fontWeight: 700, fontSize: 20, marginBottom: 20 }}>{t.privacyFirst.titulo}</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}>
          {t.privacyFirst.cards.map((card) => (
            <div
              key={card.nombre}
              style={{
                background: 'rgba(0,130,124,0.04)',
                border: '1px solid rgba(0,130,124,0.18)',
                borderRadius: 10,
                padding: '18px 20px',
              }}
            >
              <div style={{ color: 'var(--color-brand)', marginBottom: 8 }}>
                {(() => {
                  const Icono = ICONOS_PRIVACIDAD[card.icono as keyof typeof ICONOS_PRIVACIDAD]
                  return Icono ? <Icono size={24} weight="regular" /> : null
                })()}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{card.nombre}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{card.detalle}</div>
            </div>
          ))}
        </div>
        <p style={{ ...p, fontStyle: 'italic', marginBottom: 0 }}>{t.privacyFirst.cierre}</p>
      </div>

      <p style={p}>
        {t.intro}{' '}
        <Link href="/legal/datos" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.introLink}
        </Link>
        .
      </p>

      <h2 id="que-recopilamos" style={h2}>{t.queRecopilamos.titulo}</h2>
      <ul style={ul}>
        {t.queRecopilamos.items.map((item, i) => (
          <li key={i} style={li}>
            <strong>{item.fuerte}</strong>{item.texto}
          </li>
        ))}
      </ul>

      <h2 id="como-usamos" style={h2}>{t.comoUsamos.titulo}</h2>
      <ul style={ul}>
        {t.comoUsamos.items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="con-quien" style={h2}>{t.conQuien.titulo}</h2>
      <p style={p}>{t.conQuien.intro}</p>
      <ul style={ul}>
        {t.conQuien.items.map((item, i) => (
          <li key={i} style={li}>
            <strong>{item.fuerte}</strong>{item.texto}
          </li>
        ))}
      </ul>

      <h2 id="seguridad" style={h2}>{t.seguridad.titulo}</h2>
      <p style={p}>{t.seguridad.texto}</p>

      <h2 id="derechos" style={h2}>{t.derechos.titulo}</h2>
      <ul style={ul}>
        {t.derechos.items.map((item, i) => (
          <li key={i} style={li}>
            <strong>{item.fuerte}</strong>{item.texto}
          </li>
        ))}
      </ul>
      <p style={p}>
        {t.derechos.contacto}{' '}
        <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          servicio@lurdes.co
        </a>{' '}
        {lang === 'ES' ? 'o mediante el formulario de' : 'or via the'}{' '}
        <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.derechos.link}
        </Link>
        . {t.derechos.respuesta}
      </p>

      <h2 id="menores" style={h2}>{t.menores.titulo}</h2>
      <p style={p}>{t.menores.texto}</p>

      <h2 id="vigencia" style={h2}>{t.vigencia.titulo}</h2>
      <p style={p}>{t.vigencia.texto}</p>
    </LegalPageLayout>
  )
}
