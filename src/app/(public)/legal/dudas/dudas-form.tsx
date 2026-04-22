'use client'

import { useState } from 'react'

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

const TIPOS = [
  'Datos personales y privacidad',
  'Términos y condiciones',
  'Propiedad intelectual',
  'Confidencialidad',
  'Cookies',
  'Otra consulta',
]

export function DudasForm() {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    tipo: '',
    mensaje: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  function set(campo: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.tipo || !form.mensaje) {
      setError('Completa todos los campos para continuar.')
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
      setError('Algo salió mal. Intenta de nuevo o escríbenos a servicio@lurdes.co.')
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
        Recibimos tu consulta. Te respondemos en un máximo de 10 días hábiles a{' '}
        <strong>{form.email}</strong>.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={labelStyle}>Nombre completo</label>
        <input
          type="text"
          value={form.nombre}
          onChange={set('nombre')}
          placeholder="Tu nombre"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Correo electrónico</label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="tu@correo.com"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Tipo de consulta</label>
        <select value={form.tipo} onChange={set('tipo')} style={inputStyle}>
          <option value="">Selecciona un tipo</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Mensaje</label>
        <textarea
          value={form.mensaje}
          onChange={set('mensaje')}
          placeholder="Describe tu consulta con el mayor detalle posible..."
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
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          border: 'none',
          cursor: enviando ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {enviando ? 'Enviando...' : 'Enviar consulta'}
      </button>
    </form>
  )
}
