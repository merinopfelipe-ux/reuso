'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { MagnifyingGlass, ShieldCheck } from '@phosphor-icons/react'

function VerificarForm() {
  const [codigo, setCodigo] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Auto-navegar si llegan con ?codigo=RCO2-XXXX-YYYY desde el form del footer
  useEffect(() => {
    const param = searchParams.get('codigo')
    if (param && param.trim()) {
      router.push(`/verificar/${encodeURIComponent(param.trim())}`)
    }
  }, [searchParams, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo.trim()) return
    router.push(`/verificar/${encodeURIComponent(codigo.trim())}`)
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Open Sans', sans-serif",
      color: 'var(--text-primary)',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 32 }}>
          <Image src="/logo-icono.svg" alt="Reuso" width={48} height={48} style={{ margin: '0 auto 16px' }} className="logo-dark-invert" />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Verificación de Certificados
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
            Ingresa el código único del certificado para validar su autenticidad.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: RCO2-XXXX-YYYY o UUID"
            autoFocus
            style={{
              width: '100%',
              padding: '16px 56px 16px 20px',
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              fontSize: 16,
              outline: 'none',
              boxShadow: 'var(--shadow)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute', right: 8, top: 8, bottom: 8, width: 44,
              background: 'var(--color-brand)', border: 'none', borderRadius: 10,
              color: 'var(--text-on-brand)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MagnifyingGlass size={20} />
          </button>
        </form>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <ShieldCheck size={18} color="var(--color-brand)" />
          <span style={{ fontSize: 12, color: 'var(--text-placeholder)', fontWeight: 600, letterSpacing: 0.5 }}>
            RESPALDADO POR SISTEMA DE SEGURIDAD PERMANENTE
          </span>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-placeholder)', lineHeight: 1.6 }}>
          Si el certificado es válido, verás el impacto ambiental detallado y el sello de seguridad digital.
          Si fue revocado, el sistema te alertará de inmediato.
        </p>
      </div>
    </main>
  )
}

export default function VerificarManualPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--color-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </main>
    }>
      <VerificarForm />
    </Suspense>
  )
}
