'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import { Eye, EyeSlash } from '@phosphor-icons/react'

export default function RegistroPage() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    apodo: '',
    telefono: '',
    email: '',
    password: '',
    password_confirm: '',
    acepta_terminos: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, checked, type } = e.target
    if (name === 'apodo') {
      const clean = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ.]/g, '').slice(0, 15)
      setForm((prev) => ({ ...prev, apodo: clean }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) {
      setError('Completa la verificación de seguridad para continuar.')
      return
    }
    if (form.password !== form.password_confirm) {
      setError('Ingresa contraseñas iguales para continuar.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Completa todos los campos correctamente para continuar.')
      setLoading(false)
      return
    }

    router.push(`/confirmar-email?email=${encodeURIComponent(form.email)}`)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(0,130,124,0.20)',
    background: '#FFFFFF',
    color: '#1A3A38',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#1A3A38',
    marginBottom: 6,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFFFFF',
        fontFamily: "'Open Sans', sans-serif",
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1A3A38', margin: '0 0 8px' }}>
            Crea tu cuenta
          </h2>
          <p style={{ fontSize: 14, color: '#4D7C79', margin: 0 }}>
            Únete y empieza a medir tu impacto ambiental
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(255,94,75,0.08)',
              border: '1px solid rgba(255,94,75,0.25)',
              color: '#FF5E4B',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="nombre" style={labelStyle}>Nombre completo</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              required
              autoComplete="name"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
            />
          </div>

          <div>
            <label htmlFor="apellido" style={labelStyle}>Apellido <span style={{ fontWeight: 400, color: '#7FA8A5' }}>(opcional)</span></label>
            <input
              id="apellido"
              name="apellido"
              type="text"
              value={form.apellido}
              onChange={handleChange}
              placeholder="Tu apellido"
              autoComplete="family-name"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <label htmlFor="apodo" style={{ ...labelStyle, marginBottom: 0 }}>
                ¿Cómo quieres que te llamemos? <span style={{ fontWeight: 400, color: '#7FA8A5' }}>(opcional)</span>
              </label>
              <span style={{ fontSize: 11, color: '#7FA8A5' }}>{form.apodo.length}/15</span>
            </div>
            <input
              id="apodo"
              name="apodo"
              type="text"
              value={form.apodo}
              onChange={handleChange}
              placeholder="Solo letras y puntos"
              autoComplete="nickname"
              maxLength={15}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
            />
          </div>

          <div>
            <label htmlFor="telefono" style={labelStyle}>Teléfono <span style={{ fontWeight: 400, color: '#7FA8A5' }}>(opcional)</span></label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              value={form.telefono}
              onChange={handleChange}
              placeholder="+57 300 0000000"
              autoComplete="tel"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
            />
          </div>

          <div>
            <label htmlFor="email" style={labelStyle}>Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@correo.com"
              required
              autoComplete="email"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
            />
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                required
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: 40 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: '#7FA8A5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="password_confirm" style={labelStyle}>Confirmar contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password_confirm"
                name="password_confirm"
                type={showPasswordConfirm ? 'text' : 'password'}
                value={form.password_confirm}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                required
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: 40 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: '#7FA8A5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPasswordConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13,
              color: '#4D7C79',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              name="acepta_terminos"
              checked={form.acepta_terminos}
              onChange={handleChange}
              required
              aria-required="true"
              style={{ marginTop: 3, accentColor: '#00827C', flexShrink: 0 }}
            />
            <span>
              Al registrarme confirmo que he leído y acepto los{' '}
              <Link href="/legal" target="_blank" style={{ color: '#00827C', fontWeight: 600, textDecoration: 'none' }}>
                términos de uso, políticas de privacidad, tratamiento de datos y demás condiciones legales
              </Link>{' '}
              de la Calculadora de Reúso.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: loading ? '#4D7C79' : '#00827C',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#006B66' }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#00827C' }}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#4D7C79' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/" style={{ color: '#00827C', textDecoration: 'none', fontWeight: 600 }}>
            Ingresa
          </Link>
        </p>
      </div>
    </div>
  )
}
