'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Cookie,
  X,
  CheckCircle,
  Lock,
} from 'lucide-react'

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
    heading: 'Tu privacidad, tus reglas',
    text: 'Usamos cookies esenciales para que la plataforma funcione. Con tu permiso, también activamos cookies que recuerdan tus preferencias y nos dicen qué mejorar.',
    text2: 'Si aceptas, aprovechas todo. Si rechazas, solo usamos lo estrictamente necesario. Puedes cambiar esto cuando quieras.',
    privacidad: 'Privacidad',
    politica: 'Política de cookies',
    btnEsenciales: 'Solo esenciales',
    btnPersonalizar: 'Personalizar',
    btnAceptarTodo: 'Aceptar todo',
    personalizarTitle: 'Personalizar cookies',
    btnGuardar: 'Guardar preferencias',
    catEsenciales: 'Esenciales',
    catEsencialesDesc: 'Siempre activas. Mantienen tu sesión, protegen los formularios y guardan tu elección aquí.',
    catFuncionales: 'Funcionales',
    catFuncionalesDesc: 'Recuerdan tu modo (día/noche), idioma y si quieres mantener la sesión entre visitas.',
    catAnaliticas: 'Analíticas',
    catAnaliticasDesc: 'Nos dicen qué secciones usas más para ayudarnos a mejorar. Nunca identifican personas.',
  },
  ENG: {
    heading: 'Your privacy, your call',
    text: 'We use essential cookies to keep the platform running. With your permission, we also enable cookies that remember your preferences and help us improve.',
    text2: 'Accept all to get the full experience, or decline to keep only what\'s strictly necessary. You can change this anytime.',
    privacidad: 'Privacy',
    politica: 'Cookie policy',
    btnEsenciales: 'Essential only',
    btnPersonalizar: 'Customize',
    btnAceptarTodo: 'Accept all',
    personalizarTitle: 'Customize cookies',
    btnGuardar: 'Save preferences',
    catEsenciales: 'Essential',
    catEsencialesDesc: 'Always on. They keep your session active, protect forms, and save your choice here.',
    catFuncionales: 'Functional',
    catFuncionalesDesc: 'Remember your theme (light/dark), language, and whether to keep your session active.',
    catAnaliticas: 'Analytics',
    catAnaliticasDesc: 'Tell us which sections you use most so we can improve. Never identify individuals.',
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
        boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      {/* Franja decorativa superior */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, var(--color-brand) 0%, var(--color-pistacho) 50%, var(--color-brand) 100%)' }} />

      {step === 'banner' && (
        <div style={{ background: 'var(--bg-card)', padding: '20px 24px' }}>
          {/* Encabezado */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--color-brand-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Cookie size={20} color="var(--color-brand)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {t.heading}
              </p>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {t.text}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {t.text2}{' '}
                <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'underline' }}>
                  {t.privacidad}
                </Link>
                {' · '}
                <Link href="/legal/cookies" style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'underline' }}>
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
            <button onClick={aceptarTodo} style={btnPrimary} className="hover-pop hover-press">
              <CheckCircle size={14} />
              {t.btnAceptarTodo}
            </button>
          </div>
        </div>
      )}

      {step === 'personalizar' && (
        <div style={{ background: 'var(--bg-card)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t.personalizarTitle}</p>
            <button onClick={() => setStep('banner')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }} className="hover-rotate-90 hover-press">
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {/* Esenciales - bloqueadas */}
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
            <button onClick={guardarPreferencias} style={btnPrimary} className="hover-pop hover-press">
              <CheckCircle size={14} />
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
        background: locked ? 'var(--color-brand-light)' : 'var(--bg-hover)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
          {locked && <Lock size={12} color="var(--color-brand)" />}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</span>
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
          background: checked ? 'var(--color-brand)' : 'var(--border)',
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
  background: 'var(--color-brand)',
  color: 'var(--text-on-brand)',
  fontSize: 13,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 8px var(--border-light)',
}

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 10,
  background: 'transparent',
  color: 'var(--color-brand)',
  fontSize: 13,
  fontWeight: 600,
  border: '1.5px solid var(--color-brand)',
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
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
