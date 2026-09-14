'use client'

import { useRef, useState, useEffect } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Selector } from '@/components/ui/selector'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 6,
}

const TIPOS = {
  ES: [
    'Datos personales y privacidad',
    'Términos y condiciones',
    'Propiedad intelectual',
    'Confidencialidad',
    'Cookies',
    'Otra consulta',
  ],
  ENG: [
    'Personal data and privacy',
    'Terms and conditions',
    'Intellectual property',
    'Confidentiality',
    'Cookies',
    'Other enquiry',
  ],
}

const TF = {
  ES: {
    nombre_label: 'Nombre completo',
    nombre_placeholder: 'Tu nombre',
    email_label: 'Correo electrónico',
    email_placeholder: 'tu@correo.com',
    tipo_label: 'Tipo de consulta',
    tipo_placeholder: 'Selecciona un tipo',
    mensaje_label: 'Mensaje',
    mensaje_placeholder: 'Describe tu consulta con el mayor detalle posible...',
    error_campos: 'Completa todos los campos para continuar.',
    error_envio: 'Algo salió mal. Intenta de nuevo o escríbenos a soporte@calculadoradereuso.com.',
    enviando: 'Enviando...',
    enviar: 'Enviar consulta',
    exito: () =>
      `Recibimos tu consulta y generamos el ticket de soporte legal correspondiente. Te responderemos en un plazo de 10 a 15 días hábiles a`,
    exitoPost: '.',
  },
  ENG: {
    nombre_label: 'Full name',
    nombre_placeholder: 'Your name',
    email_label: 'Email address',
    email_placeholder: 'you@email.com',
    tipo_label: 'Type of enquiry',
    tipo_placeholder: 'Select a type',
    mensaje_label: 'Message',
    mensaje_placeholder: 'Describe your query in as much detail as possible...',
    error_campos: 'Please complete all fields to continue.',
    error_envio: 'Something went wrong. Try again or email us at soporte@calculadoradereuso.com.',
    enviando: 'Sending...',
    enviar: 'Send enquiry',
    exito: () =>
      `We received your query and created a legal support ticket. We will respond within 10 to 15 business days to`,
    exitoPost: '.',
  },
}

interface DudasFormProps {
  lang?: 'ES' | 'ENG'
}

export function DudasForm({ lang = 'ES' }: DudasFormProps) {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    tipo: '',
    mensaje: '',
    // Honeypot anti-bots: invisible para una persona real (ver JSX).
    sitio_web: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [numeroCaso, setNumeroCaso] = useState('')
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const tf = TF[lang]
  const tipos = TIPOS[lang]

  function set(campo: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.tipo || !form.mensaje) {
      setError(tf.error_campos)
      return
    }
    setError('')
    setEnviando(true)
    try {
      const res = await fetch('/api/legal/dudas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstile_token: turnstileToken || 'skip' }),
      })
      const cuerpo = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(cuerpo?.error || tf.error_envio)
      }
      if (cuerpo?.numero_caso) {
        setNumeroCaso(cuerpo.numero_caso)
      }
      setExito(true)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : tf.error_envio)
      turnstileRef.current?.reset()
      setTurnstileToken('')
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <div
        style={{
          padding: '24px',
          borderRadius: 12,
          background: 'rgba(56,185,142,0.08)',
          border: '1px solid rgba(56,185,142,0.25)',
          color: 'var(--color-success)',
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.6,
        }}
      >
        {numeroCaso && (
          <div style={{ marginBottom: 12 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 6,
                background: 'var(--color-brand-light)',
                color: 'var(--color-brand)',
                fontSize: 13,
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              Caso {numeroCaso}
            </span>
          </div>
        )}
        {tf.exito()}{' '}
        <strong>{form.email}</strong>
        {tf.exitoPost}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="dudas_sitio_web">Sitio web</label>
        <input
          type="text"
          id="dudas_sitio_web"
          name="sitio_web"
          tabIndex={-1}
          autoComplete="off"
          value={form.sitio_web}
          onChange={set('sitio_web')}
        />
      </div>

      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          options={{ size: 'invisible' }}
          onSuccess={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken('')}
          onError={() => setTurnstileToken('')}
        />
      )}

      <div>
        <label style={labelStyle}>{tf.nombre_label}</label>
        <input
          type="text"
          value={form.nombre}
          onChange={set('nombre')}
          placeholder={tf.nombre_placeholder}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>{tf.email_label}</label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder={tf.email_placeholder}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>{tf.tipo_label}</label>
        <Selector
          value={form.tipo}
          onChange={(val) => setForm((prev) => ({ ...prev, tipo: val }))}
          placeholder={tf.tipo_placeholder}
          opciones={tipos.map((t) => ({ value: t, label: t }))}
        />
      </div>

      <div>
        <label style={labelStyle}>{tf.mensaje_label}</label>
        <textarea
          value={form.mensaje}
          onChange={set('mensaje')}
          placeholder={tf.mensaje_placeholder}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: 13, margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 24px',
          borderRadius: 10,
          background: enviando ? (isDark ? 'rgba(214,243,145,0.4)' : 'rgba(0,130,124,0.5)') : 'var(--color-brand)',
          color: isDark ? '#474747' : '#fff',
          fontWeight: 600,
          fontSize: 14,
          border: 'none',
          cursor: enviando ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {enviando && (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        )}
        {enviando ? tf.enviando : tf.enviar}
      </button>
    </form>
  )
}
