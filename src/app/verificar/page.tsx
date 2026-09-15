'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search as MagnifyingGlass, ShieldCheck, AlertCircle as WarningCircle, X, Sparkles } from '@/components/ui/icons'
import { ProteccionPublica } from '@/components/proteccion-publica'
import { FECHA_ACTUALIZACION_LEGAL, EMAIL_CONTACTO_LEGAL } from '@/lib/constants/contacto'
import { FooterPublic } from '@/components/footer-public'
import { LegalHeader } from '@/components/legal/legal-header'

function VerificarForm() {
  const [codigo, setCodigo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [errorModal, setErrorModal] = useState<{ abierto: boolean; mensaje: string; codigoConsultado: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Auto-navegar si llegan con ?codigo=RCO2-XXXX-YYYY desde el footer u otra pantalla
  useEffect(() => {
    const param = searchParams.get('codigo')
    if (param && param.trim()) {
      setCodigo(param.trim())
      validarYRedirigir(param.trim())
    }
    // Se dispara solo cuando cambia el ?codigo de la URL. validarYRedirigir se
    // recrea en cada render pero su lógica es estable, no hace falta en deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const validarYRedirigir = async (cod: string) => {
    const limpio = cod.trim()
    if (!limpio) return

    setBuscando(true)

    // Formato básico esperado: RCO2-XXXX-YYYY o UUID
    try {
      // Breve delay visual de procesamiento ("pensando")
      await new Promise(r => setTimeout(r, 650))

      // Verificar si el informe existe antes de saltar
      const res = await fetch(`/api/verificar/${encodeURIComponent(limpio)}`).catch(() => null)
      if (res && res.ok) {
        router.push(`/verificar/${encodeURIComponent(limpio)}`)
        return
      }

      // Si la API directa no está disponible, intentar navegación o modal de error si se sabe que es inválido
      if (res && res.status === 404) {
        setErrorModal({
          abierto: true,
          mensaje: 'El código ingresado no corresponde a ningún informe emitido o registrado en la plataforma.',
          codigoConsultado: limpio
        })
        setBuscando(false)
        return
      }

      // Enrutamiento directo al visor oficial
      router.push(`/verificar/${encodeURIComponent(limpio)}`)
    } catch {
      router.push(`/verificar/${encodeURIComponent(limpio)}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validarYRedirigir(codigo)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Open Sans', sans-serif",
      color: 'var(--text-primary)',
    }}>
      <LegalHeader />

      {/* Contenido Principal */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px 64px',
      }}>
        <ProteccionPublica>
          <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            
            {/* Badge de Seguridad */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-brand-light)',
              borderRadius: 100,
              padding: '6px 16px',
              marginBottom: 20,
            }}>
              <ShieldCheck size={16} color="var(--color-brand)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-brand)' }}>
                Verificación de autenticidad estructurada
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(26px, 4vw, 34px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}>
              Validar Certificado de Impacto
            </h1>
            
            <p style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              margin: '0 0 32px',
              lineHeight: 1.65,
            }}>
              Ingresa el código único del informe para comprobar en tiempo real las métricas de CO₂ equivalente y agua ahorrada.
            </p>

            {/* Formulario de Búsqueda */}
            <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: 20 }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                boxShadow: 'var(--shadow)',
                borderRadius: 16,
              }}>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: RCO2-XXXX-YYYY o código numérico"
                  autoFocus
                  disabled={buscando}
                  style={{
                    width: '100%',
                    padding: '18px 140px 18px 22px',
                    borderRadius: 16,
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg-card)',
                    fontSize: 16,
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                
                <button
                  type="submit"
                  disabled={buscando || !codigo.trim()}
                  className="hover-pop hover-press"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    bottom: 8,
                    padding: '0 20px',
                    background: 'var(--color-brand)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#fff',
                    cursor: buscando || !codigo.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    opacity: buscando || !codigo.trim() ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {buscando ? (
                    <>
                      <div style={{
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }} />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <MagnifyingGlass size={16} />
                      <span>Verificar</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Garantía de Seguridad */}
            <div style={{
              padding: '16px 20px',
              borderRadius: 14,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--color-brand-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}>
                <Sparkles size={18} color="var(--color-brand)" />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sello digital criptográfico
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Todos los informes de impacto emitidos cuentan con trazabilidad auditada e inmutable. Si un documento ha sido revocado o modificado, el sistema lo alertará de inmediato.
                </p>
              </div>
            </div>

          </div>

          {/* Modal / Alerta de Código No Encontrado */}
          {errorModal?.abierto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(71,71,71,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            maxWidth: 440,
            width: '100%',
            padding: '28px 24px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(71,71,71,0.25)',
            position: 'relative',
          }}>
            <button
              onClick={() => setErrorModal(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>

            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255, 94, 75, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <WarningCircle size={28} color="#FF5E4B" />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Documento no registrado
            </h3>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
              {errorModal.mensaje}
            </p>

            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'var(--text-primary)',
              marginBottom: 20,
              wordBreak: 'break-all',
            }}>
              Código consultado: {errorModal.codigoConsultado}
            </div>

            <button
              onClick={() => setErrorModal(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                background: 'var(--color-brand)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
              className="hover-pop"
            >
              Intentar con otro código
            </button>
          </div>
        </div>
          )}
        </ProteccionPublica>
      </main>

      {/* Footer Público */}
      <FooterPublic
        ip={FECHA_ACTUALIZACION_LEGAL}
        lastVisit={EMAIL_CONTACTO_LEGAL}
        ipLabel="Última actualización"
        lastVisitLabel="Contacto"
        lastVisitHref={`mailto:${EMAIL_CONTACTO_LEGAL}`}
      />
    </div>
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
