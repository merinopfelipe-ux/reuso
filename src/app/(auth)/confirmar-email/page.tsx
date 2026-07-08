'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon as CheckCircle, Loader2 as CircleNotch, Mail as Envelope } from '@animateicons/react/lucide'
import { createClient } from '@/lib/supabase/client'
import { OTPInput } from '@/components/otp-input'
import { ThemeToggle } from '@/components/theme-toggle'

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
  const [isDark, setIsDark] = useState(false)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      obs.disconnect()
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  function iniciarCooldown() {
    setCooldown(120)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const confirmar = useCallback(async () => {
    const token = codigo.trim()
    if (token.length !== 6 || loading || exito) return
    setLoading(true)
    setError('')

    const { error: err } = await supabaseRef.current.auth.verifyOtp({
      email: emailParam,
      token,
      type: 'email',
    })

    if (err) {
      const msg = err.message?.toLowerCase() ?? ''
      setError(
        msg.includes('expired') || msg.includes('invalid')
          ? 'El código no es válido o ya expiró. Solicita uno nuevo.'
          : 'No pudimos verificar el código. Intenta de nuevo.'
      )
      setLoading(false)
      return
    }

    setExito(true)
    setTimeout(() => router.push('/login'), 2500)
  }, [codigo, loading, exito, emailParam, router])

  useEffect(() => {
    if (codigo.length === 6) {
      const t = setTimeout(confirmar, 300)
      return () => clearTimeout(t)
    }
  }, [codigo, confirmar])

  async function handleReenviar() {
    if (cooldown > 0 || !emailParam) return
    setReenviando(true)
    setError('')

    const { error: err } = await supabaseRef.current.auth.resend({
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

  const BRAND = isDark ? '#D6F391' : '#00827C'
  const TEXT_DARK = isDark ? '#FFFFFF' : '#1A3A38'
  const TEXT_MED = isDark ? 'rgba(255,255,255,0.70)' : '#4D7C79'
  const TEXT_LIGHT = isDark ? 'rgba(255,255,255,0.40)' : '#7FA8A5'
  const ERROR_BG = isDark ? 'rgba(255,94,75,0.12)' : 'rgba(255,94,75,0.08)'
  const ERROR_BORDER = isDark ? 'rgba(255,94,75,0.40)' : 'rgba(255,94,75,0.25)'

  if (exito) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: isDark ? 'rgba(214,243,145,0.12)' : 'rgba(0,130,124,0.10)',
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

  return (
    <>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: isDark ? 'rgba(214,243,145,0.12)' : 'rgba(0,130,124,0.10)',
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

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: ERROR_BG, border: `1px solid ${ERROR_BORDER}`,
          color: '#FF5E4B', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); confirmar() }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: TEXT_MED, margin: '0 0 12px', textAlign: 'center' }}>
            Código de verificación
          </p>
          <OTPInput value={codigo} onChange={setCodigo} isDark={isDark} disabled={loading} />
        </div>

        <button
          type="submit"
          disabled={loading || codigo.length < 6}
          style={{
            width: '100%', padding: '12px',
            borderRadius: 10,
            background: loading || codigo.length < 6
              ? (isDark ? 'rgba(214,243,145,0.25)' : 'rgba(0,130,124,0.35)')
              : BRAND,
            color: isDark && codigo.length === 6 && !loading ? '#474747' : '#ffffff',
            fontSize: 15, fontWeight: 600,
            border: 'none',
            cursor: loading || codigo.length < 6 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.2s',
          }}
        >
          {loading
            ? <><CircleNotch size={16} style={{ animation: 'spin 1s linear infinite' }} color="currentColor" /> Verificando...</>
            : 'Confirmar cuenta'}
        </button>
      </form>

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
          {reenviando ? 'Enviando...' : cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
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

export default function ConfirmarEmailPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Open Sans', sans-serif",
      padding: '24px',
      userSelect: 'none',
      background: 'var(--bg-primary)',
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
            style={{ height: 36 }}
          />
        </div>
        <Suspense fallback={
          <div style={{ textAlign: 'center', color: '#4D7C79', fontSize: 14 }}>Cargando...</div>
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
