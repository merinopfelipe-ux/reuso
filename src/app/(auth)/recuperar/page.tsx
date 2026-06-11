'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Key, CircleNotch, Eye, EyeSlash, CheckCircle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'

// ── Constantes de estilo ────────────────────────────────────────────────────
const BRAND = 'var(--color-brand)'
const TEXT_DARK = 'var(--text-primary)'
const TEXT_MED = 'var(--text-secondary)'
const TEXT_LIGHT = 'var(--text-placeholder)'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box' as const,
  fontFamily: "'Open Sans', sans-serif",
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
}

type Paso = 'email' | 'codigo'

export default function RecuperarPage() {
  const router = useRouter()
  const supabase = createClient()

  const [paso, setPaso] = useState<Paso>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showPassConfirm, setShowPassConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // ── Paso 1: solicitar código ──────────────────────────────────────────────
  async function handleSolicitarCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())

    setLoading(false)

    if (err) {
      // Supabase no revela si el email existe — siempre mostrar avance por seguridad
      // Solo mostramos error en casos técnicos reales
      const msg = err.message?.toLowerCase() ?? ''
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
        return
      }
    }

    // Siempre avanzar al paso 2 (no revelar si el email existe)
    setPaso('codigo')
  }

  // ── Paso 2: verificar código + nueva contraseña ───────────────────────────
  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault()

    const token = codigo.trim()
    if (token.length < 6) { setError('Ingresa el código de 6 dígitos que recibiste.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (!/[A-Z]/.test(password)) { setError('La contraseña debe incluir al menos una mayúscula.'); return }
    if (!/[0-9]/.test(password)) { setError('La contraseña debe incluir al menos un número.'); return }
    if (password !== passwordConfirm) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true)
    setError('')

    // Verificar OTP primero — esto inicia una sesión temporal
    const { error: otpErr } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'recovery',
    })

    if (otpErr) {
      const msg = otpErr.message?.toLowerCase() ?? ''
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('El código no es válido o ya expiró. Vuelve al paso anterior.')
      } else {
        setError('No pudimos verificar el código. Intenta de nuevo.')
      }
      setLoading(false)
      return
    }

    // Con sesión activa, actualizar contraseña
    const { error: passErr } = await supabase.auth.updateUser({ password })

    if (passErr) {
      setError('No pudimos actualizar la contraseña. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // Cerrar sesión temporal creada por el OTP
    await supabase.auth.signOut()

    setLoading(false)
    setExito(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  // ── Estado de éxito ───────────────────────────────────────────────────────
  if (exito) {
    return (
      <Wrapper isDark={isDark}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--color-brand-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle size={36} color={BRAND} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT_DARK, margin: '0 0 10px' }}>
            Contraseña actualizada
          </h2>
          <p style={{ fontSize: 14, color: TEXT_MED, lineHeight: 1.6, margin: '0 0 6px' }}>
            Tu contraseña se cambió correctamente. Redirigiendo...
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <CircleNotch size={20} color={BRAND} className="animate-spin" />
          </div>
        </div>
      </Wrapper>
    )
  }

  // ── Paso 1 ────────────────────────────────────────────────────────────────
  if (paso === 'email') {
    return (
      <Wrapper isDark={isDark}>
        <Icono />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT_DARK, margin: '0 0 8px', textAlign: 'center' }}>
          Recuperar contraseña
        </h2>
        <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 28px', textAlign: 'center', lineHeight: 1.6 }}>
          Ingresa tu correo y te enviaremos un código de recuperación de 6 dígitos.
        </p>

        <ErrorBox mensaje={error} />

        <form onSubmit={handleSolicitarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="email-recuperar">Correo electrónico</label>
            <input
              id="email-recuperar"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoFocus
              autoComplete="email"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          <BtnPrimario loading={loading} texto="Enviar código" isDark={isDark} />
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: TEXT_LIGHT }}>
          <Link href="/login" style={{ color: TEXT_MED, textDecoration: 'none', fontWeight: 600 }}>
            ← Volver al inicio de sesión
          </Link>
        </p>
      </Wrapper>
    )
  }

  // ── Paso 2 ────────────────────────────────────────────────────────────────
  return (
    <Wrapper isDark={isDark}>
      <Icono />
      <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT_DARK, margin: '0 0 8px', textAlign: 'center' }}>
        Ingresa el código
      </h2>
      <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 28px', textAlign: 'center', lineHeight: 1.6 }}>
        Enviamos un código a <strong style={{ color: TEXT_DARK }}>{email}</strong>.{' '}
        Úsalo para crear tu nueva contraseña.
      </p>

      <ErrorBox mensaje={error} />

      <form onSubmit={handleCambiarPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Código */}
        <div>
          <label style={{ ...labelStyle, textAlign: 'center' }}>Código de recuperación</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoFocus
            autoComplete="one-time-code"
            style={{ ...inputStyle, textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: '0.15em' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        </div>

        {/* Nueva contraseña */}
        <div>
          <label style={labelStyle} htmlFor="nueva-pass">Nueva contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="nueva-pass"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
              required
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: 40 }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <TogglePass show={showPass} onClick={() => setShowPass(v => !v)} />
          </div>
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label style={labelStyle} htmlFor="confirmar-pass">Confirmar contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="confirmar-pass"
              type={showPassConfirm ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="Repite tu nueva contraseña"
              required
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: 40 }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <TogglePass show={showPassConfirm} onClick={() => setShowPassConfirm(v => !v)} />
          </div>
        </div>

        <BtnPrimario loading={loading} texto="Cambiar contraseña" isDark={isDark} />
      </form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={() => { setPaso('email'); setError(''); setCodigo('') }}
          style={{ background: 'transparent', border: 'none', color: TEXT_MED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          ← Volver al paso anterior
        </button>
      </div>
    </Wrapper>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function Wrapper({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      fontFamily: "'Open Sans', sans-serif",
      padding: '24px',
      userSelect: 'auto',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </div>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-completo.svg"
            alt="Calculadora de Reúso"
            style={{ height: 36, filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
          />
        </div>
        {children}
      </div>
    </div>
  )
}

function Icono() {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: 'var(--color-brand-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 20px',
    }}>
      <Key size={28} color={BRAND} />
    </div>
  )
}

function ErrorBox({ mensaje }: { mensaje: string }) {
  if (!mensaje) return null
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8, marginBottom: 16,
      background: 'rgba(255, 94, 75, 0.1)', border: '1px solid var(--color-error)',
      color: 'var(--color-error-content, #FF5E4B)', fontSize: 13,
    }}>
      {mensaje}
    </div>
  )
}

function BtnPrimario({ loading, texto, isDark }: { loading: boolean; texto: string; isDark: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%', padding: '12px',
        borderRadius: 10,
        background: loading ? 'var(--border)' : isDark ? '#D6F391' : 'var(--color-brand)',
        color: loading ? 'var(--text-secondary)' : isDark ? '#474747' : '#ffffff',
        fontSize: 15, fontWeight: 600,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 0.2s',
      }}
    >
      {loading
        ? <><CircleNotch size={16} className="animate-spin" /> Procesando...</>
        : texto}
    </button>
  )
}

function TogglePass({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'transparent', border: 'none', padding: 0,
        color: TEXT_LIGHT, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
      }}
    >
      {show ? <EyeSlash size={18} /> : <Eye size={18} />}
    </button>
  )
}
