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
      minHeight: '100vh', background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Open Sans', sans-serif",
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 32 }}>
          <Image src="/logo-icono.svg" alt="Reuso" width={48} height={48} style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A3A38', margin: 0 }}>
            Verificación de Certificados
          </h1>
          <p style={{ fontSize: 14, color: '#4D7C79', marginTop: 8, lineHeight: 1.6 }}>
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
              border: '1px solid rgba(0,130,124,0.15)',
              background: '#fff',
              fontSize: 16,
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,130,124,0.08)',
              color: '#1A3A38',
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute', right: 8, top: 8, bottom: 8, width: 44,
              background: '#00827C', border: 'none', borderRadius: 10,
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MagnifyingGlass size={20} />
          </button>
        </form>

        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <ShieldCheck size={18} color="#00827C" />
          <span style={{ fontSize: 12, color: '#7FA8A5', fontWeight: 600, letterSpacing: 0.5 }}>
            RESPALDADO POR SISTEMA DE SEGURIDAD PERMANENTE
          </span>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: '#7FA8A5', lineHeight: 1.6 }}>
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
      <main style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(0,130,124,0.2)', borderTopColor: '#00827C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </main>
    }>
      <VerificarForm />
    </Suspense>
  )
}
