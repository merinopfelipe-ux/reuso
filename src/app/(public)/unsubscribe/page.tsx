// src/app/(public)/unsubscribe/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'

type Estado = 'pendiente' | 'confirmando' | 'exito' | 'error'

function UnsubscribeContent() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [estado, setEstado] = useState<Estado>('pendiente')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsDark(
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark'
      )
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => obs.disconnect()
  }, [])

  const t = {
    bg: isDark ? '#474747' : '#FFFFFF',
    card: isDark ? '#525252' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,130,124,0.12)',
    textPrimary: isDark ? '#FFFFFF' : '#474747',
    textSecondary: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(71,71,71,0.65)',
    shadow: isDark ? '0 8px 24px rgba(0,0,0,0.25)' : '0 8px 24px rgba(0,130,124,0.06)',
  }

  async function confirmarBaja() {
    if (!token) {
      setEstado('error')
      return
    }
    setEstado('confirmando')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      setEstado(data.ok ? 'exito' : 'error')
    } catch {
      setEstado('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      transition: 'background 0.3s',
    }}>
      {/* Logo / Marca */}
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#00827C' }}>reuso</span>
        <span style={{ fontSize: 22, color: t.textSecondary }}>.lurdes.co</span>
      </div>

      <div style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 24,
        padding: '40px 32px',
        maxWidth: 420,
        width: '100%',
        boxShadow: t.shadow,
        textAlign: 'center',
      }}>
        {estado === 'exito' ? (
          <>
            <CheckCircle size={48} color="#38B98E" weight="fill" style={{ margin: '0 auto 20px' }} />
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
              Baja confirmada
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: t.textSecondary, lineHeight: 1.6 }}>
              Te diste de baja. No recibirás más correos de marketing de la Calculadora de Reúso.
            </p>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: 100,
              background: '#00827C',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
            }}>
              Volver al inicio
            </Link>
          </>
        ) : estado === 'error' || !token ? (
          <>
            <WarningCircle size={48} color="#F6BF3E" weight="fill" style={{ margin: '0 auto 20px' }} />
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
              Enlace no válido
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: t.textSecondary, lineHeight: 1.6 }}>
              Este enlace ya fue usado o no es válido. Si quieres darte de baja, usa el enlace del correo más reciente que recibiste.
            </p>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: 100,
              background: '#00827C',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
            }}>
              Volver al inicio
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
              Cancelar suscripción
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: t.textSecondary, lineHeight: 1.6 }}>
              Confirma para dejar de recibir correos de marketing de la Calculadora de Reúso. Los correos del sistema (confirmaciones, recuperación de contraseña) seguirán llegando.
            </p>
            <button
              onClick={confirmarBaja}
              disabled={estado === 'confirmando'}
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                borderRadius: 100,
                background: estado === 'confirmando' ? '#006B66' : '#00827C',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: estado === 'confirmando' ? 'not-allowed' : 'pointer',
                opacity: estado === 'confirmando' ? 0.8 : 1,
                transition: 'all 0.2s',
              }}
            >
              {estado === 'confirmando' ? 'Procesando...' : 'Confirmar baja'}
            </button>
          </>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: t.textSecondary, textAlign: 'center', maxWidth: 340 }}>
        ¿Tienes preguntas? Escríbenos desde la sección de ayuda en tu cuenta.
      </p>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, color: '#474747' }}>Cargando...</span>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
