'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, CircleNotch, Envelope } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

// ── Constantes de estilo ────────────────────────────────────────────────────
const BRAND = '#00827C'
const TEXT_DARK = '#1A3A38'
const TEXT_MED = '#4D7C79'
const TEXT_LIGHT = '#7FA8A5'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  border: '1.5px solid rgba(0,130,124,0.20)',
  background: '#FFFFFF',
  color: TEXT_DARK,
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: '0.15em',
  textAlign: 'center',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box' as const,
  fontFamily: "'Open Sans', sans-serif",
}

// ── Componente interno (usa useSearchParams) ────────────────────────────────
function ConfirmarEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') ?? ''

  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  function iniciarCooldown() {
    setCooldown(120)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleConfirmar(e: React.FormEvent) {
    e.preventDefault()
    const token = codigo.trim()
    if (token.length < 6) {
      setError('Ingresa el código de 6 dígitos que recibiste.')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.verifyOtp({
      email: emailParam,
      token,
      type: 'email',
    })

    if (err) {
      const msg = err.message?.toLowerCase() ?? ''
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('El código no es válido o ya expiró. Solicita uno nuevo.')
      } else {
        setError('No pudimos verificar el código. Intenta de nuevo.')
      }
      setLoading(false)
      return
    }

    setExito(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  async function handleReenviar() {
    if (cooldown > 0 || !emailParam) return
    setReenviando(true)
    setError('')

    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: emailParam,
    })

    setReenviando(false)
    if (err) {
      setError('No pudimos reenviar el código. Intenta de nuevo en unos minutos.')
      return
    }
    iniciarCooldown()
  }

  // ── Estado de éxito ───────────────────────────────────────────────────────
  if (exito) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(0,130,124,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle size={36} color={BRAND} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT_DARK, margin: '0 0 10px' }}>
          Cuenta confirmada
        </h2>
        <p style={{ fontSize: 14, color: TEXT_MED, margin: '0 0 6px', lineHeight: 1.6 }}>
          Bienvenido. Redirigiendo al inicio de sesión...
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <CircleNotch size={20} color={BRAND} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    )
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Icono */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(0,130,124,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <Envelope size={28} color={BRAND} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: TEXT_DARK, margin: '0 0 8px', textAlign: 'center' }}>
        Confirma tu correo
      </h2>
      <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 28px', textAlign: 'center', lineHeight: 1.6 }}>
        Enviamos un código de 6 dígitos a{' '}
        <strong style={{ color: TEXT_DARK }}>{emailParam || 'tu correo'}</strong>.
        Ingrésalo para activar tu cuenta.
      </p>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(255,94,75,0.08)', border: '1px solid rgba(255,94,75,0.25)',
          color: '#FF5E4B', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleConfirmar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TEXT_MED, marginBottom: 8, textAlign: 'center' }}>
            Código de verificación
          </label>
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
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = BRAND }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || codigo.length < 6}
          style={{
            width: '100%', padding: '12px',
            borderRadius: 10,
            background: loading || codigo.length < 6 ? 'rgba(0,130,124,0.35)' : BRAND,
            color: '#ffffff', fontSize: 15, fontWeight: 600,
            border: 'none',
            cursor: loading || codigo.length < 6 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
          }}
        >
          {loading
            ? <><CircleNotch size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
            : 'Confirmar cuenta'}
        </button>
      </form>

      {/* Reenviar */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: '0 0 6px' }}>
          ¿No recibiste el código?
        </p>
        <button
          onClick={handleReenviar}
          disabled={cooldown > 0 || reenviando || !emailParam}
          style={{
            background: 'transparent', border: 'none',
            color: cooldown > 0 ? TEXT_LIGHT : BRAND,
            fontSize: 13, fontWeight: 600, cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          {reenviando
            ? 'Enviando...'
            : cooldown > 0
              ? `Reenviar en ${cooldown}s`
              : 'Reenviar código'}
        </button>
      </div>

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: TEXT_LIGHT }}>
        <Link href="/login" style={{ color: TEXT_MED, textDecoration: 'none', fontWeight: 600 }}>
          ← Volver al inicio de sesión
        </Link>
      </p>
    </>
  )
}

// ── Página principal (envuelve en Suspense por useSearchParams) ──────────────
export default function ConfirmarEmailPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FFFFFF',
      fontFamily: "'Open Sans', sans-serif",
      padding: '24px',
      userSelect: 'none',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Suspense fallback={
          <div style={{ textAlign: 'center', color: TEXT_MED, fontSize: 14 }}>Cargando...</div>
        }>
          <ConfirmarEmailContent />
        </Suspense>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}
