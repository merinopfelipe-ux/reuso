'use client'

import { useState, useEffect } from 'react'

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
    error_envio: 'Algo salió mal. Intenta de nuevo o escríbenos a servicio@lurdes.co.',
    enviando: 'Enviando...',
    enviar: 'Enviar consulta',
    exito: () =>
      `Recibimos tu consulta. Te respondemos en un máximo de 10 días hábiles a`,
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
    error_envio: 'Something went wrong. Try again or email us at servicio@lurdes.co.',
    enviando: 'Sending...',
    enviar: 'Send enquiry',
    exito: () =>
      `We received your query. We will respond within 10 business days to`,
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
  })
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

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
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setExito(true)
    } catch {
      setError(tf.error_envio)
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
        {tf.exito()}{' '}
        <strong>{form.email}</strong>
        {tf.exitoPost}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
        <select value={form.tipo} onChange={set('tipo')} style={inputStyle}>
          <option value="">{tf.tipo_placeholder}</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
          padding: '11px 24px',
          borderRadius: 10,
          background: enviando ? 'rgba(0,130,124,0.5)' : 'var(--color-brand)',
          color: isDark ? '#474747' : '#fff',
          fontWeight: 600,
          fontSize: 14,
          border: 'none',
          cursor: enviando ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {enviando ? tf.enviando : tf.enviar}
      </button>
    </form>
  )
}
