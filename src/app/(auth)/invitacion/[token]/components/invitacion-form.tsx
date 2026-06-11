'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import { Eye, EyeSlash, CheckCircle, CircleNotch, Leaf } from '@phosphor-icons/react'

interface Props {
  token: string
  email: string
  empresaNombre: string
  rolAsignado: string
}

const BRAND = '#00827C'

export default function InvitacionForm({ token, email, empresaNombre, rolAsignado }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({ nombre: '', password: '', password_confirm: '', acepta_terminos: false })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, checked, type } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) { setError('Completa la verificación de seguridad.'); return }
    if (form.password !== form.password_confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/registro-invitacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form, acepta_terminos: true, turnstile_token: turnstileToken }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear la cuenta.')
      setLoading(false)
      return
    }
    setSuccess(true)
    // Redirigir al login con aviso de éxito tras 2s
    setTimeout(() => router.push('/login?invited=true'), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 15,
    outline: 'none',
    userSelect: 'auto',
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <CheckCircle size={56} color={BRAND} style={{ margin: '0 auto 16px' }} />
        <h2 style={{ color: BRAND, fontWeight: 700, fontSize: 22, margin: '0 0 8px' }}>
          ¡Cuenta creada!
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 15 }}>
          Ya puedes ingresar como parte de <strong>{empresaNombre}</strong>.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          Redirigiendo al inicio de sesión...
        </p>
        <CircleNotch size={20} color={BRAND} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Contexto */}
      <div style={{
        background: `${BRAND}15`,
        border: `1.5px solid ${BRAND}40`,
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 4,
      }}>
        <p style={{ margin: 0, fontSize: 14, color: BRAND, fontWeight: 600 }}>
          Invitado a: <span style={{ fontWeight: 700 }}>{empresaNombre}</span>
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          {email} · {rolAsignado === 'empresa_admin' ? 'Administrador' : 'Empleado'}
        </p>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Tu nombre completo
        </label>
        <input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="Nombre y apellido"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Email
        </label>
        <input
          value={email}
          disabled
          style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Contraseña
        </label>
        <div style={{ position: 'relative' }}>
          <input
            name="password"
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
            required
            style={{ ...inputStyle, paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {showPass ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Confirmar contraseña
        </label>
        <div style={{ position: 'relative' }}>
          <input
            name="password_confirm"
            type={showConfirm ? 'text' : 'password'}
            value={form.password_confirm}
            onChange={handleChange}
            placeholder="Repite tu contraseña"
            required
            style={{ ...inputStyle, paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14 }}>
        <input
          type="checkbox"
          name="acepta_terminos"
          checked={form.acepta_terminos}
          onChange={handleChange}
          required
          style={{ marginTop: 2, accentColor: BRAND }}
        />
        <span style={{ color: 'var(--text-muted)' }}>
          Acepto los{' '}
          <span style={{ color: BRAND, fontWeight: 600 }}>términos y condiciones</span>
          {' '}de Calculadora de Reúso
        </span>
      </label>

      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={setTurnstileToken}
        options={{ theme: 'auto' }}
      />

      {error && (
        <p style={{ color: '#e53e3e', fontSize: 14, margin: 0, padding: '8px 12px', background: '#fff5f5', borderRadius: 6 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: loading ? `${BRAND}80` : BRAND,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px',
          fontSize: 16,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {loading ? 'Creando cuenta…' : 'Crear mi cuenta'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
        <Leaf size={13} style={{ verticalAlign: 'middle', marginRight: 4, color: BRAND }} />
        © Grupo MLP S.A.S.
      </p>
    </form>
  )
}
