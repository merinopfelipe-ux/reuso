'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LegalPageLayout, h2, p } from '@/components/legal/legal-page-layout'
import {
  Lock,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface ConsentData {
  v: number
  ts: number
  e: boolean
  f: boolean
  a: boolean
}

const CONSENT_KEY = 'reuso_cookies_consent'

const T = {
  ES: {
    titulo: 'Preferencias de cookies',
    breadcrumb: 'Preferencias de cookies',
    secciones: [
      { id: 'eleccion', label: 'Tu elección actual' },
      { id: 'impacto', label: 'Qué cambia' },
      { id: 'retirar', label: 'Retirar consentimiento' },
    ],
    resumen: 'Gestiona las cookies que habilitas en la Calculadora de Reúso. Mantenemos las esenciales siempre activas. Tú decides si activas las funcionales y analíticas. Cambia tus preferencias cuando quieras.',
    leeTabien: [
      { href: '/legal/cookies', label: 'Política de Cookies', descripcion: 'Descripción completa de todas las cookies que usamos.' },
    ],
    s1Title: 'Tu elección actual',
    catEsenciales: 'Esenciales',
    catEsencialesDesc: 'Sesión activa, protección CSRF y tu elección de cookies. Sin estas el sitio no funciona.',
    catFuncionales: 'Funcionales',
    catFuncionalesDesc: 'Recuerdan tu idioma, tu tema de interfaz y la opción de mantener la sesión activa.',
    catAnaliticas: 'Analíticas',
    catAnaliticasDesc: 'Estadísticas de uso anónimas para mejorar la plataforma. Sin terceros externos.',
    s2Title: 'Qué cambia con cada elección',
    impactoE: 'Siempre activas. El sitio funciona, tu sesión está protegida y recuerda tu elección sobre cookies.',
    impactoF: 'Si las activas, recordamos tu idioma preferido, el modo claro u oscuro, y si pediste mantener la sesión.',
    impactoA: 'Si las activas, medimos qué páginas son más útiles. No compartimos estos datos con terceros ni usamos publicidad externa.',
    s3Title: 'Retirar consentimiento',
    s3Desc: 'Puedes eliminar todas las cookies guardadas desde la configuración de tu navegador:',
    browsers: [
      'Chrome: Configuración → Privacidad → Cookies y otros datos',
      'Firefox: Opciones → Privacidad y seguridad',
      'Safari: Preferencias → Privacidad',
      'Edge: Configuración → Privacidad, búsqueda y servicios',
    ],
    btnReiniciar: 'Reiniciar mis preferencias',
    btnGuardar: 'Guardar preferencias',
    savedMsg: 'Preferencias guardadas',
    estadoActual: 'Estado actual',
    siempre: 'Siempre activas',
  },
  ENG: {
    titulo: 'Cookie Preferences',
    breadcrumb: 'Cookie Preferences',
    secciones: [
      { id: 'eleccion', label: 'Your current choice' },
      { id: 'impacto', label: 'What changes' },
      { id: 'retirar', label: 'Withdraw consent' },
    ],
    resumen: 'Manage the cookies you enable on the Reuse Calculator. We keep essential cookies always active. You decide whether to enable functional and analytical cookies. Change your preferences at any time.',
    leeTabien: [
      { href: '/legal/cookies', label: 'Cookie Policy', descripcion: 'Full description of all the cookies we use.' },
    ],
    s1Title: 'Your current choice',
    catEsenciales: 'Essential',
    catEsencialesDesc: 'Active session, CSRF protection, and your cookie choice. Without these, the site does not work.',
    catFuncionales: 'Functional',
    catFuncionalesDesc: 'Remember your language, interface theme, and the option to keep your session active.',
    catAnaliticas: 'Analytics',
    catAnaliticasDesc: 'Anonymous usage statistics to improve the platform. No external third parties.',
    s2Title: 'What changes with each choice',
    impactoE: 'Always active. The site works, your session is protected, and your cookie choice is remembered.',
    impactoF: 'If enabled, we remember your preferred language, light or dark mode, and whether you asked to stay signed in.',
    impactoA: 'If enabled, we measure which pages are most useful. We do not share this data with third parties or use external advertising.',
    s3Title: 'Withdraw consent',
    s3Desc: 'You can delete all stored cookies from your browser settings:',
    browsers: [
      'Chrome: Settings → Privacy → Cookies and other data',
      'Firefox: Options → Privacy and Security',
      'Safari: Preferences → Privacy',
      'Edge: Settings → Privacy, search and services',
    ],
    btnReiniciar: 'Reset my preferences',
    btnGuardar: 'Save preferences',
    savedMsg: 'Preferences saved',
    estadoActual: 'Current state',
    siempre: 'Always active',
  },
}

function loadConsent(): ConsentData | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(CONSENT_KEY)
  if (raw) {
    try { return JSON.parse(raw) as ConsentData } catch { return null }
  }
  return null
}

function ToggleRow({
  label,
  desc,
  checked,
  locked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  locked?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid rgba(0,130,124,0.14)',
        background: locked ? 'rgba(0,130,124,0.04)' : 'var(--bg-card, #fff)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #1A3A38)' }}>{label}</span>
          {locked && <Lock size={13} color="#00827C" />}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary, #4D7C79)', lineHeight: 1.6 }}>{desc}</span>
      </div>
      <button
        onClick={() => !locked && onChange(!checked)}
        disabled={locked}
        aria-checked={checked}
        role="switch"
        style={{
          flexShrink: 0,
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          background: checked ? '#00827C' : '#ddd',
          cursor: locked ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          marginTop: 2,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}

function ImpactoRow({
  label,
  desc,
  active,
  siempreLabel,
}: {
  label: string
  desc: string
  active: boolean | 'always'
  siempreLabel: string
}) {
  const isAlways = active === 'always'
  const isOn = isAlways || active === true
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 14px',
        borderRadius: 10,
        background: isOn ? 'rgba(0,130,124,0.04)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isOn ? 'rgba(0,130,124,0.16)' : 'rgba(0,0,0,0.08)'}`,
      }}
    >
      <div style={{ marginTop: 2, flexShrink: 0 }}>
        {isOn
          ? <CheckCircle size={16} color="#00827C" />
          : <XCircle size={16} color="#aaa" />
        }
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isOn ? 'var(--text-primary, #1A3A38)' : 'var(--text-secondary, #4D7C79)' }}>
            {label}
          </span>
          {isAlways && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#00827C',
              background: 'rgba(0,130,124,0.10)',
              borderRadius: 6,
              padding: '1px 7px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {siempreLabel}
            </span>
          )}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary, #4D7C79)', lineHeight: 1.6 }}>{desc}</span>
      </div>
    </div>
  )
}

export default function CookiesPreferenciasPage() {
  const router = useRouter()
  const [lang, setLang] = useState<'ES' | 'ENG'>('ES')
  const [funcional, setFuncional] = useState(false)
  const [analitica, setAnalitica] = useState(false)
  const [saved, setSaved] = useState(false)

  const checkIdioma = useCallback(() => {
    const stored = localStorage.getItem('reuso_idioma')
    if (stored === 'ENG') setLang('ENG')
    else if (stored === 'ES') setLang('ES')
    else setLang(navigator.language.startsWith('es') ? 'ES' : 'ENG')
  }, [])

  useEffect(() => {
    checkIdioma()
    window.addEventListener('reuso_idioma_change', checkIdioma)
    return () => window.removeEventListener('reuso_idioma_change', checkIdioma)
  }, [checkIdioma])

  useEffect(() => {
    const consent = loadConsent()
    if (consent) {
      setFuncional(consent.f)
      setAnalitica(consent.a)
    }
  }, [])

  function guardarPreferencias() {
    const data: ConsentData = { v: 1, ts: Date.now(), e: true, f: funcional, a: analitica }
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function reiniciarPreferencias() {
    localStorage.removeItem(CONSENT_KEY)
    window.dispatchEvent(new Event('reuso_cookies_reset'))
    router.push('/legal/cookies')
  }

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
      {/* ── Sección 1: Tu elección actual ─────────────────────────── */}
      <section id="eleccion">
        <h2 style={h2}>{t.s1Title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ToggleRow
            label={t.catEsenciales}
            desc={t.catEsencialesDesc}
            checked={true}
            locked
            onChange={() => {}}
          />
          <ToggleRow
            label={t.catFuncionales}
            desc={t.catFuncionalesDesc}
            checked={funcional}
            onChange={setFuncional}
          />
          <ToggleRow
            label={t.catAnaliticas}
            desc={t.catAnaliticasDesc}
            checked={analitica}
            onChange={setAnalitica}
          />
        </div>

        {/* Botón guardar */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            onClick={guardarPreferencias}
            style={{
              background: '#00827C',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 24px',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0,130,124,0.25)',
              transition: 'opacity 0.2s',
            }}
          >
            <CheckCircle size={16} />
            {t.btnGuardar}
          </button>
          {saved && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(56,185,142,0.12)',
                border: '1px solid rgba(56,185,142,0.30)',
                color: '#1A3A38',
                fontSize: 13,
                fontWeight: 600,
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <CheckCircle size={14} color="#38B98E" />
              {t.savedMsg}
            </div>
          )}
        </div>
      </section>

      {/* ── Sección 2: Qué cambia ──────────────────────────────────── */}
      <section id="impacto">
        <h2 style={h2}>{t.s2Title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ImpactoRow
            label={t.catEsenciales}
            desc={t.impactoE}
            active="always"
            siempreLabel={t.siempre}
          />
          <ImpactoRow
            label={t.catFuncionales}
            desc={t.impactoF}
            active={funcional}
            siempreLabel={t.siempre}
          />
          <ImpactoRow
            label={t.catAnaliticas}
            desc={t.impactoA}
            active={analitica}
            siempreLabel={t.siempre}
          />
        </div>
      </section>

      {/* ── Sección 3: Retirar consentimiento ─────────────────────── */}
      <section id="retirar">
        <h2 style={h2}>{t.s3Title}</h2>
        <p style={p}>{t.s3Desc}</p>
        <ul style={{ paddingLeft: 20, marginBottom: 20, lineHeight: 1.85 }}>
          {t.browsers.map((b, i) => (
            <li key={i} style={{ marginBottom: 6, fontSize: 14, color: 'var(--text-primary, #1A3A38)' }}>
              {b}
            </li>
          ))}
        </ul>
        <button
          onClick={reiniciarPreferencias}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 10,
            background: 'transparent',
            color: '#FF5E4B',
            fontSize: 14,
            fontWeight: 600,
            border: '1.5px solid rgba(255,94,75,0.40)',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <XCircle size={16} />
          {t.btnReiniciar}
        </button>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </LegalPageLayout>
  )
}
