'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, X, CheckCircle, Lock } from '@phosphor-icons/react'

interface ConsentData {
  v: number
  ts: number
  e: boolean
  f: boolean
  a: boolean
}

const CONSENT_KEY = 'reuso_cookies_consent'
const LEGACY_KEY = 'reuso_cookies_aceptadas'

const T = {
  ES: {
    heading: 'Cookies en Reúso',
    text: 'Usamos cookies esenciales para que el sitio funcione. Con tu permiso, también medimos qué secciones son más útiles. Sin rastreadores ni venta de datos.',
    privacidad: 'Privacidad',
    politica: 'Política de cookies',
    btnEsenciales: 'Solo esenciales',
    btnPersonalizar: 'Personalizar',
    btnAceptarTodo: 'Aceptar todo',
    personalizarTitle: 'Personalizar cookies',
    btnGuardar: 'Guardar preferencias',
    catEsenciales: 'Esenciales',
    catEsencialesDesc: 'Sesión activa, protección CSRF y tu elección de cookies. Sin estas el sitio no funciona.',
    catFuncionales: 'Funcionales',
    catFuncionalesDesc: 'Recuerdan tus preferencias de interfaz y la opción de mantener la sesión activa.',
    catAnaliticas: 'Analíticas',
    catAnaliticasDesc: 'Estadísticas de uso y análisis de comportamiento para mejorar la plataforma. Opcionales.',
  },
  ENG: {
    heading: 'Cookies on Reúso',
    text: 'We use essential cookies to keep the site working. With your permission, we also measure which sections are most useful. No trackers, no data sales.',
    privacidad: 'Privacy',
    politica: 'Cookie policy',
    btnEsenciales: 'Essential only',
    btnPersonalizar: 'Customize',
    btnAceptarTodo: 'Accept all',
    personalizarTitle: 'Customize cookies',
    btnGuardar: 'Save preferences',
    catEsenciales: 'Essential',
    catEsencialesDesc: 'Active session, CSRF protection, and your cookie choice. Without these, the site does not work.',
    catFuncionales: 'Functional',
    catFuncionalesDesc: 'Remember your interface preferences and the option to keep your session active.',
    catAnaliticas: 'Analytics',
    catAnaliticasDesc: 'Usage statistics and behaviour analysis to improve the platform. Optional.',
  }
}

function loadConsent(): ConsentData | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(CONSENT_KEY)
  if (raw) {
    try { return JSON.parse(raw) as ConsentData } catch { return null }
  }
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (legacy === 'true') {
    const migrated: ConsentData = { v: 1, ts: Date.now(), e: true, f: true, a: true }
    localStorage.setItem(CONSENT_KEY, JSON.stringify(migrated))
    localStorage.removeItem(LEGACY_KEY)
    return migrated
  }
  return null
}

function saveConsent(f: boolean, a: boolean) {
  const data: ConsentData = { v: 1, ts: Date.now(), e: true, f, a }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data))
  localStorage.removeItem(LEGACY_KEY)
}

type Step = 'banner' | 'personalizar' | 'hidden'

export function CookieBanner() {
  const [step, setStep] = useState<Step>('hidden')
  const [funcional, setFuncional] = useState(false)
  const [analitica, setAnalitica] = useState(false)
  const [esColombia, setEsColombia] = useState(false)
  const [lang, setLang] = useState<'ES' | 'ENG'>('ES')

  useEffect(() => {
    // Detectar si el usuario está en Colombia
    let detectedColombia = false
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const langCO = navigator.language === 'es-CO' || navigator.languages?.includes('es-CO')
      if (tz === 'America/Bogota' || langCO) {
        detectedColombia = true
      }
    } catch {
      // Evitar errores si Intl no está disponible
    }
    setEsColombia(detectedColombia)

    const consent = loadConsent()
    if (!consent) {
      setStep('banner')
      if (detectedColombia) {
        // En Colombia, pre-aceptamos todas por defecto bajo ley de consentimiento implícito/opción de revocación
        setFuncional(true)
        setAnalitica(true)
      } else {
        setFuncional(false)
        setAnalitica(false)
      }
    } else {
      setFuncional(consent.f)
      setAnalitica(consent.a)
    }

    const handleReset = () => setStep('banner')
    window.addEventListener('reuso_cookies_reset', handleReset)
    return () => window.removeEventListener('reuso_cookies_reset', handleReset)
  }, [])

  useEffect(() => {
    const checkIdioma = () => {
      const saved = localStorage.getItem('reuso_idioma') as 'ES' | 'ENG' | null
      if (saved) {
        setLang(saved)
      } else {
        const sys = navigator.language?.toLowerCase() ?? ''
        setLang(sys.startsWith('es') ? 'ES' : 'ENG')
      }
    }
    checkIdioma()
    window.addEventListener('reuso_idioma_change', checkIdioma)
    return () => window.removeEventListener('reuso_idioma_change', checkIdioma)
  }, [])

  function aceptarTodo() {
    saveConsent(true, true)
    setStep('hidden')
  }

  function soloEsenciales() {
    saveConsent(false, false)
    setStep('hidden')
  }

  function abrirPersonalizar() {
    const existing = loadConsent()
    if (existing) {
      setFuncional(existing.f)
      setAnalitica(existing.a)
    } else {
      setFuncional(esColombia)
      setAnalitica(esColombia)
    }
    setStep('personalizar')
  }

  function guardarPreferencias() {
    saveConsent(funcional, analitica)
    setStep('hidden')
  }

  if (step === 'hidden') return null

  const t = T[lang]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'calc(100% - 48px)',
        maxWidth: 700,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,130,124,0.14), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Franja decorativa superior */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #00827C 0%, #D6F391 50%, #00827C 100%)' }} />

      {step === 'banner' && (
        <div style={{ background: '#FFFFFF', padding: '20px 24px' }}>
          {/* Encabezado */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(0,130,124,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Cookie size={20} color="#00827C" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>
                {t.heading}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.65 }}>
                {esColombia ? (
                  lang === 'ES'
                    ? 'Aceptamos cookies esenciales, funcionales y analíticas por defecto para optimizar la plataforma en Colombia bajo la Ley 1581 de 2012. Puedes personalizarlas o revocarlas aquí:'
                    : 'We accept essential, functional and analytical cookies by default to optimize the platform in Colombia under Law 1581 of 2012. You can customize or revoke them here:'
                ) : t.text}{' '}
                <Link href="/legal/privacidad" style={{ color: '#00827C', fontWeight: 600, textDecoration: 'underline' }}>
                  {t.privacidad}
                </Link>
                {' · '}
                <Link href="/legal/cookies" style={{ color: '#00827C', fontWeight: 600, textDecoration: 'underline' }}>
                  {t.politica}
                </Link>
              </p>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={soloEsenciales} style={btnSecondary}>
              {t.btnEsenciales}
            </button>
            <button onClick={abrirPersonalizar} style={btnGhost}>
              {t.btnPersonalizar}
            </button>
            <button onClick={aceptarTodo} style={btnPrimary}>
              <CheckCircle size={14} weight="fill" />
              {t.btnAceptarTodo}
            </button>
          </div>
        </div>
      )}

      {step === 'personalizar' && (
        <div style={{ background: '#FFFFFF', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{t.personalizarTitle}</p>
            <button onClick={() => setStep('banner')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#888' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {/* Esenciales — bloqueadas */}
            <ToggleRow
              label={t.catEsenciales}
              desc={t.catEsencialesDesc}
              checked={true}
              locked
              onChange={() => {}}
            />
            {/* Funcionales */}
            <ToggleRow
              label={t.catFuncionales}
              desc={t.catFuncionalesDesc}
              checked={funcional}
              onChange={setFuncional}
            />
            {/* Analíticas */}
            <ToggleRow
              label={t.catAnaliticas}
              desc={t.catAnaliticasDesc}
              checked={analitica}
              onChange={setAnalitica}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={soloEsenciales} style={btnGhost}>{t.btnEsenciales}</button>
            <button onClick={guardarPreferencias} style={btnPrimary}>
              <CheckCircle size={14} weight="fill" />
              {t.btnGuardar}
            </button>
          </div>
        </div>
      )}
    </div>
  )
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
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: locked ? 'rgba(0,130,124,0.04)' : 'rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,130,124,0.10)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{label}</span>
          {locked && <Lock size={12} color="#00827C" />}
        </div>
        <span style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{desc}</span>
      </div>
      {/* Toggle */}
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

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 18px',
  borderRadius: 10,
  background: '#00827C',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 8px rgba(0,130,124,0.25)',
}

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 10,
  background: 'transparent',
  color: '#00827C',
  fontSize: 13,
  fontWeight: 600,
  border: '1.5px solid rgba(0,130,124,0.40)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '8px 14px',
  borderRadius: 10,
  background: 'transparent',
  color: '#666',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid rgba(0,0,0,0.12)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
