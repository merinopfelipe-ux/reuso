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
      sub: 'Usamos cookies para que la plataforma funcione, y herramientas de analítica y métricas para entender el uso y mejorar tu experiencia.',
      cards: [
        { icon: 'Lock' as const, title: 'Datos protegidos', desc: 'Mantenemos tus datos seguros y no los vendemos a terceros.' },
        { icon: 'ChartBar' as const, title: 'Analítica para mejorar', desc: 'Si aceptas, usamos herramientas de métricas para entender el comportamiento y optimizar el uso.' },
        { icon: 'SlidersHorizontal' as const, title: 'Tú decides', desc: 'Puedes cambiar tu elección en cualquier momento desde el panel de cookies.' },
      ],
    },
    prefBtnText: 'Cambiar mis preferencias de cookies',
    s1Title: 'Qué son las cookies',
    s1: 'Las cookies son pequeños archivos de texto que un sitio web almacena en tu dispositivo al visitarlo. Permiten que el sitio recuerde información entre páginas y sesiones: que estás autenticado, tus preferencias de interfaz o si ya tomaste una decisión sobre el uso de cookies.',
    s2Title: '1. Cookies esenciales',
    s2Desc: 'Estas cookies son necesarias para que el sitio funcione. Se activan automáticamente cuando usas la plataforma. No puedes desactivarlas sin que el sitio deje de funcionar. No requieren tu consentimiento (RGPD Art. 5(3) / Directiva ePrivacy).',
    s2Rows: [
      { nombre: 'sb-* (Autenticación de sesión)', dominio: 'calculadoradereuso.com', duracion: 'Sesión / 1 año', finalidad: 'Gestión de sesión autenticada. Identifica que estás conectado.' },
      { nombre: 'reuso_cookies_consent', dominio: 'calculadoradereuso.com', duracion: '1 año', finalidad: 'Guarda tu elección sobre cookies (esenciales / funcionales / analíticas).' },
      { nombre: '__Host-* / __Secure-*', dominio: 'calculadoradereuso.com', duracion: 'Sesión', finalidad: 'Protección CSRF. Previene ataques de falsificación de solicitudes.' },
      { nombre: '_cfuvid, cf_clearance', dominio: 'calculadoradereuso.com', duracion: 'Sesión / 24 h', finalidad: 'Cookies de seguridad. Protegen contra bots y ataques de denegación de servicio.' },
    ],
    s3Title: '2. Cookies funcionales',
    s3Desc: 'Opcionales. Recuerdan tus preferencias para mejorar tu experiencia. Si las rechazas, la plataforma sigue funcionando pero puede que no recuerde tus ajustes entre sesiones.',
    s3Rows: [
      { nombre: 'reuso_idioma', dominio: 'calculadoradereuso.com', duracion: '1 año', finalidad: 'Guarda tu preferencia de idioma (ES / EN) para los documentos legales y la interfaz.' },
      { nombre: 'reuso_tema', dominio: 'calculadoradereuso.com', duracion: '1 año', finalidad: 'Guarda tu preferencia de modo claro u oscuro.' },
      { nombre: 'reuso_remember_web_*', dominio: 'calculadoradereuso.com', duracion: '30 días', finalidad: 'Mantiene la sesión iniciada si marcas «Recuérdame» en el login.' },
    ],
    s4Title: '3. Cookies analíticas',
    s4Desc: 'Opcionales. Utilizamos métricas web para análisis de uso y optimización de experiencia. Solo nos ayudan a entender qué páginas son útiles y a optimizar la plataforma.',
    s4Rows: [
      { nombre: '_ga, _gid (Analítica web)', dominio: 'calculadoradereuso.com', duracion: '2 años / 24 h', finalidad: 'Estadísticas de uso: páginas vistas, tiempo de sesión.' },
      { nombre: '_clck, _clsk (Mapas de calor)', dominio: 'calculadoradereuso.com', duracion: '1 año / Sesión', finalidad: 'Mapas de calor y grabación de sesión para analizar el comportamiento del usuario (Microsoft Clarity).' },
    ],
    s5Title: 'Cookies de terceros',
    s5: [
      { proveedor: 'Base de datos y autenticación', rol: 'Servidor de Autenticación', info: 'Gestiona la sesión y el acceso seguro a tus datos. Opera bajo estrictos acuerdos de privacidad.' },
      { proveedor: 'Infraestructura y hosting', rol: 'Servidor de Aplicaciones', info: 'Establece cookies técnicas de enrutamiento y rendimiento para servir la plataforma de forma veloz.' },
      { proveedor: 'Seguridad y protección DDoS', rol: 'Proveedor de Seguridad', info: 'Establece cookies de seguridad (_cfuvid, cf_clearance) para identificar tráfico legítimo y bloquear ataques.' },
      { proveedor: 'Analítica web y métricas', rol: 'Proveedor de Métricas', info: 'Recopila datos sobre el tráfico y las interacciones para optimizar la experiencia de uso.' },
      { proveedor: 'Mapas de calor y usabilidad', rol: 'Proveedor de Experiencia', info: 'Nos ayuda a entender cómo los usuarios navegan y hacen clic en la plataforma para optimizar la experiencia.' },
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
      { href: '/legal/cookies/preferencias', label: 'Panel de Preferencias', descripcion: 'Configura y administra tus permisos de cookies.' },
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
      sub: 'We use cookies for the platform to work, and analytics and metrics tools to understand usage and improve your experience.',
      cards: [
        { icon: 'Lock' as const, title: 'Protected data', desc: 'We keep your data secure and do not sell it to third parties.' },
        { icon: 'ChartBar' as const, title: 'Analytics for improvement', desc: 'If you accept, we use metric tools to understand user behavior and optimize performance.' },
        { icon: 'SlidersHorizontal' as const, title: 'You decide', desc: 'Change your choice at any time from the cookie panel.' },
      ],
    },
    prefBtnText: 'Change my cookie preferences',
    s1Title: 'What are cookies',
    s1: 'Cookies are small text files that a website stores on your device when you visit it. They allow the site to remember information between pages and sessions: that you are authenticated, your interface preferences, or whether you have already made a decision about the use of cookies.',
    s2Title: '1. Essential cookies',
    s2Desc: 'These cookies are required for the site to work. They activate automatically when you use the platform. You cannot disable them without the site ceasing to function. They do not require your consent (GDPR Art. 5(3) / ePrivacy Directive).',
    s2Rows: [
      { nombre: 'sb-* (Session Authentication)', dominio: 'calculadoradereuso.com', duracion: 'Session / 1 year', finalidad: 'Authenticated session management. Identifies that you are logged in.' },
      { nombre: 'reuso_cookies_consent', dominio: 'calculadoradereuso.com', duracion: '1 year', finalidad: 'Stores your cookie choice (essential / functional / analytics).' },
      { nombre: '__Host-* / __Secure-*', dominio: 'calculadoradereuso.com', duracion: 'Session', finalidad: 'CSRF protection. Prevents cross-site request forgery attacks.' },
      { nombre: '_cfuvid, cf_clearance', dominio: 'calculadoradereuso.com', duracion: 'Session / 24 h', finalidad: 'Security cookies. Protect against bots and DDoS attacks.' },
    ],
    s3Title: '2. Functional cookies',
    s3Desc: 'Optional. They remember your preferences to improve your experience. If you reject them, the platform continues to work but may not remember your settings between sessions.',
    s3Rows: [
      { nombre: 'reuso_idioma', dominio: 'calculadoradereuso.com', duracion: '1 year', finalidad: 'Stores your language preference (ES / EN) for legal documents and the interface.' },
      { nombre: 'reuso_tema', dominio: 'calculadoradereuso.com', duracion: '1 year', finalidad: 'Stores your light or dark mode preference.' },
      { nombre: 'reuso_remember_web_*', dominio: 'calculadoradereuso.com', duracion: '30 days', finalidad: 'Keeps your session active if you check «Remember me» at login.' },
    ],
    s4Title: '3. Analytics cookies',
    s4Desc: 'Optional. We use web analytics for usage analysis, and heatmaps to analyze behavior. They help us understand which pages are useful and optimize the platform.',
    s4Rows: [
      { nombre: '_ga, _gid (Web Analytics)', dominio: 'calculadoradereuso.com', duracion: '2 years / 24 h', finalidad: 'Usage statistics: page views, session time.' },
      { nombre: '_clck, _clsk (Heatmaps)', dominio: 'calculadoradereuso.com', duracion: '1 year / Session', finalidad: 'Heatmaps and session recording for user behavior analysis (Microsoft Clarity).' },
    ],
    s5Title: 'Third-party cookies',
    s5: [
      { proveedor: 'Database & authentication', rol: 'Authentication Provider', info: 'Manages user session and secure data access under strict privacy agreements.' },
      { proveedor: 'Infrastructure & hosting', rol: 'Application Server', info: 'Sets technical routing and performance cookies to serve the platform efficiently.' },
      { proveedor: 'Security & DDoS protection', rol: 'Security Provider', info: 'Sets security cookies (_cfuvid, cf_clearance) to identify legitimate traffic and mitigate attacks.' },
      { proveedor: 'Web analytics & metrics', rol: 'Metrics Provider', info: 'Collects anonymous traffic data to improve platform usability and user flow.' },
      { proveedor: 'Heatmaps & behavior', rol: 'Experience Provider', info: 'Helps us understand how users navigate and interact with interface elements.' },
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
      { href: '/legal/cookies/preferencias', label: 'Preferences Panel', descripcion: 'Configure and manage your cookie permissions.' },
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
    <div style={{ overflowX: 'auto', marginBottom: 24, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border)' }}>
            {[thNombre, thDominio, thDuracion, thFinalidad].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={`transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
              }`}
              style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
            >
              <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 13, color: 'var(--color-brand)' }}>
                {row.nombre}
              </td>
              <td style={{ ...tdStyle, color: 'var(--color-brand)' }}>{row.dominio}</td>
              <td style={{ ...tdStyle, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.duracion}</td>
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
              className="legal-trust-card"
              style={{
                padding: '14px 16px',
                borderRadius: 12,
              }}
            >
              <div className="legal-trust-icon" style={{ marginBottom: 8 }}>
                {(() => {
                  const Icono = ICONOS_CONFIANZA[card.icon as keyof typeof ICONOS_CONFIANZA]
                  return Icono ? <Icono size={22} /> : null
                })()}
              </div>
              <p className="legal-trust-title" style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>{card.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Botones para gestionar cookies */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <button
          className="btn-cookies-pref"
          onClick={() => {
            localStorage.removeItem('reuso_cookies_consent')
            window.dispatchEvent(new Event('reuso_cookies_reset'))
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,130,124,0.25)',
          }}
        >
          {t.prefBtnText}
        </button>
        <Link
          href="/legal/cookies/preferencias"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10,
            background: 'transparent', color: 'var(--color-brand)',
            border: '1.5px solid var(--color-brand)',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}
        >
          {lang === 'ENG' ? 'Cookie preferences panel →' : 'Panel de preferencias de cookies →'}
        </Link>
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
          <a href="mailto:servicio@calculadoradereuso.com" style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'underline' }}>
            servicio@calculadoradereuso.com
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

      <style dangerouslySetInnerHTML={{ __html: `
        [data-theme="light"] .btn-cookies-pref {
          background: #00827C;
          color: #ffffff;
        }
        [data-theme="dark"] .btn-cookies-pref {
          background: #D6F391;
          color: #474747;
        }
        [data-theme="light"] .legal-trust-card {
          border: 1px solid rgba(0, 130, 124, 0.14);
          background: rgba(0, 130, 124, 0.05);
        }
        [data-theme="light"] .legal-trust-icon {
          color: #00827C;
        }
        [data-theme="light"] .legal-trust-title {
          color: #474747;
        }
        [data-theme="dark"] .legal-trust-card {
          border: 1px solid rgba(214, 243, 145, 0.35);
          background: rgba(214, 243, 145, 0.20);
        }
        [data-theme="dark"] .legal-trust-icon {
          color: #D6F391;
        }
        [data-theme="dark"] .legal-trust-title {
          color: #D6F391;
        }
      `}} />
    </LegalPageLayout>
  )
}
