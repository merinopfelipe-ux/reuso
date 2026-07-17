'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout, h2, p } from '@/components/legal/legal-page-layout'
import { Lock, BarChart2 as ChartBar, SlidersHorizontal } from '@/components/ui/icons'

const ICONOS_CONFIANZA = {
  Lock: Lock,
  ChartBar: ChartBar,
  SlidersHorizontal: SlidersHorizontal,
}

const T = {
  ES: {
    titulo: 'Política de Cookies',
    breadcrumb: 'Cookies',
    secciones: [
      { id: 'que-son', label: 'Qué son las cookies' },
      { id: 'esenciales', label: 'Esenciales' },
      { id: 'funcionales', label: 'Funcionales' },
      { id: 'analiticas', label: 'Analíticas' },
      { id: 'terceros', label: 'Terceros' },
      { id: 'gestion', label: 'Gestión y derechos' },
      { id: 'marco-legal', label: 'Base legal' },
    ],
    trust: {
      heading: 'Transparencia total sobre lo que usamos.',
      sub: 'Usamos cookies para que la plataforma funcione, y herramientas como Google Analytics y Hotjar para entender el uso y mejorar tu experiencia.',
      cards: [
        { icon: 'Lock' as const, title: 'Datos protegidos', desc: 'Mantenemos tus datos seguros y no los vendemos a data brokers.' },
        { icon: 'ChartBar' as const, title: 'Analítica para mejorar', desc: 'Si aceptas, usamos Google Analytics para marketing y Hotjar para entender el comportamiento y mapas de calor.' },
        { icon: 'SlidersHorizontal' as const, title: 'Tú decides', desc: 'Puedes cambiar tu elección en cualquier momento desde el panel de cookies.' },
      ],
    },
    prefBtnText: 'Cambiar mis preferencias de cookies',
    s1Title: 'Qué son las cookies',
    s1: 'Las cookies son pequeños archivos de texto que un sitio web almacena en tu dispositivo al visitarlo. Permiten que el sitio recuerde información entre páginas y sesiones: que estás autenticado, tus preferencias de interfaz o si ya tomaste una decisión sobre el uso de cookies.',
    s2Title: '1. Cookies esenciales',
    s2Desc: 'Estas cookies son necesarias para que el sitio funcione. Se activan automáticamente cuando usas la plataforma. No puedes desactivarlas sin que el sitio deje de funcionar. No requieren tu consentimiento (RGPD Art. 5(3) / Directiva ePrivacy).',
    s2Rows: [
      { nombre: 'sb-* (Supabase Auth)', dominio: 'reuso.lurdes.co', duracion: 'Sesión / 1 año', finalidad: 'Gestión de sesión autenticada. Identifica que estás conectado.' },
      { nombre: 'reuso_cookies_consent', dominio: 'reuso.lurdes.co', duracion: '1 año', finalidad: 'Guarda tu elección sobre cookies (esenciales / funcionales / analíticas).' },
      { nombre: '__Host-* / __Secure-*', dominio: 'reuso.lurdes.co', duracion: 'Sesión', finalidad: 'Protección CSRF. Previene ataques de falsificación de solicitudes.' },
      { nombre: '_cfuvid, cf_clearance', dominio: '*.lurdes.co', duracion: 'Sesión / 24 h', finalidad: 'Cookies de seguridad de Cloudflare. Protegen contra bots y ataques DDoS.' },
    ],
    s3Title: '2. Cookies funcionales',
    s3Desc: 'Opcionales. Recuerdan tus preferencias para mejorar tu experiencia. Si las rechazas, la plataforma sigue funcionando pero puede que no recuerde tus ajustes entre sesiones.',
    s3Rows: [
      { nombre: 'reuso_idioma', dominio: 'reuso.lurdes.co', duracion: '1 año', finalidad: 'Guarda tu preferencia de idioma (ES / EN) para los documentos legales y la interfaz.' },
      { nombre: 'reuso_tema', dominio: 'reuso.lurdes.co', duracion: '1 año', finalidad: 'Guarda tu preferencia de modo claro u oscuro.' },
      { nombre: 'reuso_remember_web_*', dominio: 'reuso.lurdes.co', duracion: '30 días', finalidad: 'Mantiene la sesión iniciada si marcas «Recuérdame» en el login.' },
    ],
    s4Title: '3. Cookies analíticas',
    s4Desc: 'Opcionales. Utilizamos Google Analytics para análisis de uso y marketing, y Hotjar para generar mapas de calor y analizar el comportamiento. Solo nos ayudan a entender qué páginas son útiles y a optimizar la plataforma.',
    s4Rows: [
      { nombre: '_ga, _gid (Google Analytics)', dominio: '.lurdes.co', duracion: '2 años / 24 h', finalidad: 'Estadísticas de uso y marketing: páginas vistas, tiempo de sesión.' },
      { nombre: '_hj* (Hotjar)', dominio: '.lurdes.co', duracion: '1 año / Sesión', finalidad: 'Mapas de calor y análisis de comportamiento del usuario.' },
    ],
    s5Title: 'Cookies de terceros',
    s5: [
      { proveedor: 'Supabase', rol: 'Base de datos y autenticación', info: 'Gestiona la sesión y el acceso seguro a tus datos. Opera bajo los mismos acuerdos de privacidad.' },
      { proveedor: 'Vercel', rol: 'Infraestructura y hosting', info: 'Puede establecer cookies técnicas de enrutamiento y rendimiento para servir el sitio correctamente.' },
      { proveedor: 'Cloudflare', rol: 'Seguridad y protección DDoS', info: 'Establece cookies de seguridad (_cfuvid, cf_clearance) para identificar tráfico legítimo y bloquear ataques.' },
      { proveedor: 'Google Analytics', rol: 'Analítica web y marketing', info: 'Recopila datos sobre el tráfico y las interacciones para mejorar nuestros servicios y campañas.' },
      { proveedor: 'Hotjar', rol: 'Mapas de calor y comportamiento', info: 'Nos ayuda a entender cómo los usuarios navegan y hacen clic en la plataforma para optimizar la experiencia.' },
    ],
    s6Title: 'Gestión y derechos',
    s6a: 'También puedes bloquear o eliminar cookies desde la configuración de tu navegador:',
    s6Browsers: [
      'Chrome: Configuración → Privacidad y seguridad → Cookies',
      'Firefox: Opciones → Privacidad y seguridad',
      'Safari: Preferencias → Privacidad',
      'Edge: Configuración → Privacidad, búsqueda y servicios',
    ],
    s6c: 'Ten en cuenta que desactivar las cookies esenciales impide el funcionamiento correcto de la plataforma. Para preguntas concretas escríbenos a',
    s6cMid: 'o usa nuestro',
    s6Form: 'formulario de consultas legales',
    s7Title: 'Base legal',
    s7: [
      { ley: 'RGPD - Art. 5(3) y Directiva ePrivacy (UE)', texto: 'Las cookies esenciales no requieren consentimiento. Las funcionales y analíticas sí. Puedes retirar el consentimiento en cualquier momento.' },
      { ley: 'CCPA (California, EE. UU.)', texto: 'Los residentes de California tienen derecho a saber qué datos se recopilan, a oponerse a su venta (no vendemos datos) y a solicitar su eliminación.' },
      { ley: 'Ley 1581 de 2012 y Decreto 1377/2013 (Colombia)', texto: 'Rige el tratamiento de datos personales en Colombia. Incluye el derecho a conocer, actualizar, rectificar y suprimir la información. Aplica a todos nuestros usuarios colombianos.' },
    ],
    resumen: 'Usamos tres tipos de cookies: esenciales (siempre activas, imprescindibles), funcionales (opcionales, mejoran tu experiencia) y analíticas (opcionales, estadísticas anónimas). No vendemos datos ni rastreamos tu actividad fuera de Reúso. Puedes gestionar tus preferencias en cualquier momento.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Política de Privacidad', descripcion: 'Qué datos recopilamos y cómo los protegemos.' },
      { href: '/legal/ia', label: 'Uso de IA', descripcion: 'Cómo usamos inteligencia artificial en la plataforma.' },
    ],
    thNombre: 'Cookie', thDominio: 'Dominio', thDuracion: 'Duración', thFinalidad: 'Finalidad',
  },
  ENG: {
    titulo: 'Cookie Policy',
    breadcrumb: 'Cookies',
    secciones: [
      { id: 'que-son', label: 'What are cookies' },
      { id: 'esenciales', label: 'Essential' },
      { id: 'funcionales', label: 'Functional' },
      { id: 'analiticas', label: 'Analytics' },
      { id: 'terceros', label: 'Third parties' },
      { id: 'gestion', label: 'Management & rights' },
      { id: 'marco-legal', label: 'Legal basis' },
    ],
    trust: {
      heading: 'Full transparency on what we use.',
      sub: 'We use cookies for the platform to work, and tools like Google Analytics and Hotjar to understand usage and improve your experience.',
      cards: [
        { icon: 'Lock' as const, title: 'Protected data', desc: 'We keep your data secure and do not sell it to data brokers.' },
        { icon: 'ChartBar' as const, title: 'Analytics for improvement', desc: 'If you accept, we use Google Analytics for marketing and Hotjar to understand behavior and heatmaps.' },
        { icon: 'SlidersHorizontal' as const, title: 'You decide', desc: 'Change your choice at any time from the cookie panel.' },
      ],
    },
    prefBtnText: 'Change my cookie preferences',
    s1Title: 'What are cookies',
    s1: 'Cookies are small text files that a website stores on your device when you visit it. They allow the site to remember information between pages and sessions: that you are authenticated, your interface preferences, or whether you have already made a decision about the use of cookies.',
    s2Title: '1. Essential cookies',
    s2Desc: 'These cookies are required for the site to work. They activate automatically when you use the platform. You cannot disable them without the site ceasing to function. They do not require your consent (GDPR Art. 5(3) / ePrivacy Directive).',
    s2Rows: [
      { nombre: 'sb-* (Supabase Auth)', dominio: 'reuso.lurdes.co', duracion: 'Session / 1 year', finalidad: 'Authenticated session management. Identifies that you are logged in.' },
      { nombre: 'reuso_cookies_consent', dominio: 'reuso.lurdes.co', duracion: '1 year', finalidad: 'Stores your cookie choice (essential / functional / analytics).' },
      { nombre: '__Host-* / __Secure-*', dominio: 'reuso.lurdes.co', duracion: 'Session', finalidad: 'CSRF protection. Prevents cross-site request forgery attacks.' },
      { nombre: '_cfuvid, cf_clearance', dominio: '*.lurdes.co', duracion: 'Session / 24 h', finalidad: 'Cloudflare security cookies. Protect against bots and DDoS attacks.' },
    ],
    s3Title: '2. Functional cookies',
    s3Desc: 'Optional. They remember your preferences to improve your experience. If you reject them, the platform continues to work but may not remember your settings between sessions.',
    s3Rows: [
      { nombre: 'reuso_idioma', dominio: 'reuso.lurdes.co', duracion: '1 year', finalidad: 'Stores your language preference (ES / EN) for legal documents and the interface.' },
      { nombre: 'reuso_tema', dominio: 'reuso.lurdes.co', duracion: '1 year', finalidad: 'Stores your light or dark mode preference.' },
      { nombre: 'reuso_remember_web_*', dominio: 'reuso.lurdes.co', duracion: '30 days', finalidad: 'Keeps your session active if you check «Remember me» at login.' },
    ],
    s4Title: '3. Analytics cookies',
    s4Desc: 'Optional. We use Google Analytics for usage analysis and marketing, and Hotjar to generate heatmaps and analyze behavior. They help us understand which pages are useful and optimize the platform.',
    s4Rows: [
      { nombre: '_ga, _gid (Google Analytics)', dominio: '.lurdes.co', duracion: '2 years / 24 h', finalidad: 'Usage statistics and marketing: page views, session time.' },
      { nombre: '_hj* (Hotjar)', dominio: '.lurdes.co', duracion: '1 year / Session', finalidad: 'Heatmaps and user behavior analysis.' },
    ],
    s5Title: 'Third-party cookies',
    s5: [
      { proveedor: 'Supabase', rol: 'Database and authentication', info: 'Manages session and secure access to your data. Operates under the same privacy agreements.' },
      { proveedor: 'Vercel', rol: 'Infrastructure and hosting', info: 'May set technical routing and performance cookies to serve the site correctly.' },
      { proveedor: 'Cloudflare', rol: 'Security and DDoS protection', info: 'Sets security cookies (_cfuvid, cf_clearance) to identify legitimate traffic and block attacks.' },
      { proveedor: 'Google Analytics', rol: 'Web analytics and marketing', info: 'Collects data on traffic and interactions to improve our services and campaigns.' },
      { proveedor: 'Hotjar', rol: 'Heatmaps and behavior', info: 'Helps us understand how users navigate and click on the platform to optimize the experience.' },
    ],
    s6Title: 'Management and rights',
    s6a: 'You can also block or delete cookies from your browser settings:',
    s6Browsers: [
      'Chrome: Settings → Privacy and security → Cookies',
      'Firefox: Options → Privacy and Security',
      'Safari: Preferences → Privacy',
      'Edge: Settings → Privacy, search and services',
    ],
    s6c: 'Note that disabling essential cookies prevents the platform from working correctly. For specific questions write to',
    s6cMid: 'or use our',
    s6Form: 'legal enquiry form',
    s7Title: 'Legal basis',
    s7: [
      { ley: 'GDPR - Art. 5(3) and ePrivacy Directive (EU)', texto: 'Essential cookies do not require consent. Functional and analytics cookies do. You can withdraw consent at any time.' },
      { ley: 'CCPA (California, USA)', texto: 'California residents have the right to know what data is collected, to opt out of its sale (we do not sell data), and to request its deletion.' },
      { ley: 'Law 1581 of 2012 and Decree 1377/2013 (Colombia)', texto: 'Governs personal data processing in Colombia. Includes the right to know, update, correct and delete information. Applies to all our Colombian users.' },
    ],
    resumen: 'We use three types of cookies: essential (always active, indispensable), functional (optional, improve your experience) and analytics (optional, anonymous statistics). We do not sell data or track your activity outside Reúso. You can manage your preferences at any time.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Privacy Policy', descripcion: 'What data we collect and how we protect it.' },
      { href: '/legal/ia', label: 'AI Use', descripcion: 'How we use artificial intelligence in the platform.' },
    ],
    thNombre: 'Cookie', thDominio: 'Domain', thDuracion: 'Duration', thFinalidad: 'Purpose',
  },
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-brand)',
  background: 'rgba(0,130,124,0.06)',
  borderBottom: '1px solid rgba(0,130,124,0.14)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  verticalAlign: 'top',
  borderBottom: '1px solid var(--border)',
  lineHeight: 1.6,
}

function CookieTable({ rows, thNombre, thDominio, thDuracion, thFinalidad }: {
  rows: { nombre: string; dominio: string; duracion: string; finalidad: string }[]
  thNombre: string; thDominio: string; thDuracion: string; thFinalidad: string
}) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 24, borderRadius: 10, border: '1px solid rgba(0,130,124,0.14)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, borderRadius: '10px 0 0 0' }}>{thNombre}</th>
            <th style={thStyle}>{thDominio}</th>
            <th style={thStyle}>{thDuracion}</th>
            <th style={{ ...thStyle, borderRadius: '0 10px 0 0' }}>{thFinalidad}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-primary)' : 'rgba(0,130,124,0.02)' }}>
              <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 12, color: 'var(--color-brand)' }}>{row.nombre}</td>
              <td style={{ ...tdStyle, fontSize: 12 }}>{row.dominio}</td>
              <td style={{ ...tdStyle, fontSize: 12, whiteSpace: 'nowrap' }}>{row.duracion}</td>
              <td style={tdStyle}>{row.finalidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiesPage() {
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
      resumen={t.resumen}
      leeTabien={t.leeTabien}
      transparenciaTexto={null}
    >
      {/* Bloque de confianza "Privacy First" */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.3 }}>
          {t.trust.heading}
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {t.trust.sub}
        </p>
        <div className="legal-trust-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {t.trust.cards.map((card, i) => (
            <div
              key={i}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid rgba(0,130,124,0.14)',
                background: 'rgba(0,130,124,0.03)',
              }}
            >
              <div style={{ color: 'var(--color-brand)', marginBottom: 8 }}>
                {(() => {
                  const Icono = ICONOS_CONFIANZA[card.icon as keyof typeof ICONOS_CONFIANZA]
                  return Icono ? <Icono size={22} /> : null
                })()}
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{card.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Botón para abrir el banner de cookies */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => {
            localStorage.removeItem('reuso_cookies_consent')
            window.dispatchEvent(new Event('reuso_cookies_reset'))
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10,
            background: 'var(--color-brand)', color: '#fff',
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,130,124,0.25)',
          }}
        >
          {t.prefBtnText}
        </button>
      </div>

      {/* 1. Qué son */}
      <section id="que-son">
        <h2 style={h2}>{t.s1Title}</h2>
        <p style={p}>{t.s1}</p>
      </section>

      {/* 2. Esenciales */}
      <section id="esenciales">
        <h2 style={h2}>{t.s2Title}</h2>
        <p style={p}>{t.s2Desc}</p>
        <CookieTable rows={t.s2Rows} thNombre={t.thNombre} thDominio={t.thDominio} thDuracion={t.thDuracion} thFinalidad={t.thFinalidad} />
      </section>

      {/* 3. Funcionales */}
      <section id="funcionales">
        <h2 style={h2}>{t.s3Title}</h2>
        <p style={p}>{t.s3Desc}</p>
        <CookieTable rows={t.s3Rows} thNombre={t.thNombre} thDominio={t.thDominio} thDuracion={t.thDuracion} thFinalidad={t.thFinalidad} />
      </section>

      {/* 4. Analíticas */}
      <section id="analiticas">
        <h2 style={h2}>{t.s4Title}</h2>
        <p style={p}>{t.s4Desc}</p>
        <CookieTable rows={t.s4Rows} thNombre={t.thNombre} thDominio={t.thDominio} thDuracion={t.thDuracion} thFinalidad={t.thFinalidad} />
      </section>

      {/* 5. Terceros */}
      <section id="terceros">
        <h2 style={h2}>{t.s5Title}</h2>
        {t.s5.map((item, i) => (
          <div key={i} style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {item.proveedor} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 12 }}>- {item.rol}</span>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.info}</p>
          </div>
        ))}
      </section>

      {/* 6. Gestión */}
      <section id="gestion">
        <h2 style={h2}>{t.s6Title}</h2>
        <p style={p}>{t.s6a}</p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {t.s6Browsers.map((b, i) => <li key={i} style={{ marginBottom: 4, fontSize: 14, lineHeight: 1.6 }}>{b}</li>)}
        </ul>
        <p style={p}>
          {t.s6c}{' '}
          <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'underline' }}>
            servicio@lurdes.co
          </a>{' '}
          {t.s6cMid}{' '}
          <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'underline' }}>
            {t.s6Form}
          </Link>.
        </p>
      </section>

      {/* 7. Marco legal */}
      <section id="marco-legal">
        <h2 style={h2}>{t.s7Title}</h2>
        {t.s7.map((item, i) => (
          <div key={i} style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(0,130,124,0.14)', background: 'rgba(0,130,124,0.03)' }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--color-brand)' }}>{item.ley}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{item.texto}</p>
          </div>
        ))}
      </section>
    </LegalPageLayout>
  )
}
