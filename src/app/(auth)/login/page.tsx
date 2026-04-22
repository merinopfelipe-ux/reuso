'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import type { Rol } from '@/types'

const REDIRECT: Record<Rol, string> = {
  super_admin: '/admin',
  empresa_admin: '/empresa',
  empleado: '/dashboard',
  usuario_libre: '/dashboard',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const tokenParaEnviar = turnstileToken || 'skip'
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, turnstile_token: tokenParaEnviar }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Verifica tus datos e intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push(REDIRECT[data.rol as Rol] ?? '/dashboard')
    router.refresh()
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Open Sans', sans-serif",
      }}
    >
      {/* Panel izquierdo — verde */}
      <div
        style={{
          flex: '0 0 55%',
          background: 'linear-gradient(160deg, #004945 0%, #00827C 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="login-left-panel"
      >
        {/* Círculo decorativo de fondo */}
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            top: -120,
            right: -120,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            bottom: -80,
            left: -80,
          }}
        />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Image
            src="/logo-completo.svg"
            alt="Calculadora de Reúso"
            width={240}
            height={64}
            style={{ filter: 'brightness(0) invert(1)', marginBottom: 16, objectFit: 'contain' }}
          />
          <p
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 16,
              margin: 0,
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            Cada objeto que reutilizas escribe una historia verde. Mídela, certifícala y compártela.
          </p>

          {/* Stat decorativa */}
          <div
            style={{
              marginTop: 48,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 16,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: '16px 24px',
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 700, color: '#D6F391' }}>
              CO₂
            </span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'left', lineHeight: 1.4 }}>
              evitado<br />certificado
            </span>
          </div>
        </div>
      </div>

      {/* Panel derecho — form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          background: '#FFFFFF',
          minHeight: '100vh',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: '#1A3A38',
              margin: '0 0 8px',
            }}
          >
            Bienvenido
          </h2>
          <p style={{ fontSize: 14, color: '#4D7C79', margin: '0 0 8px' }}>
            Ingresa para ver tu impacto ambiental
          </p>
          <p style={{ fontSize: 14, color: '#1A3A38', margin: '0 0 32px', fontWeight: 500 }}>
            ¿No tienes cuenta?{' '}
            <Link href="#" style={{ color: '#00827C', textDecoration: 'none', fontWeight: 600 }}>
              Regístrate
            </Link>
          </p>

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
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A3A38', marginBottom: 6 }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                style={{
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
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#00827C' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,130,124,0.20)' }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A3A38', marginBottom: 6 }}
              >
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(0,130,124,0.20)',
                    background: '#FFFFFF',
                    color: '#1A3A38',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
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

            {/* Turnstile */}
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken('')}
            />

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
                marginTop: 4,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#006B66' }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#00827C' }}
            >
              {loading ? 'Accediendo...' : 'Acceso'}
            </button>

            <p style={{ margin: '12px 0 0', fontSize: 11, color: '#7FA8A5', textAlign: 'center', lineHeight: 1.6 }}>
              Al acceder confirmas que conoces y aceptas nuestros{' '}
              <Link href="/legal" style={{ color: '#00827C', fontWeight: 600, textDecoration: 'none' }}>
                términos de uso, políticas de privacidad y demás condiciones legales
              </Link>
              .
            </p>
          </form>

          <Link
            href="#"
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: '#F2F9F8',
              color: '#1A3A38',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
              marginTop: 16,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EBF5F4' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F2F9F8' }}
          >
            ¿Has olvidado tu contraseña?
          </Link>
        </div>

        <p
          style={{
            position: 'absolute',
            bottom: 16,
            fontSize: 12,
            color: '#7FA8A5',
          }}
        >
          Desarrollado por Grupo MLP S.A.S.
        </p>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
