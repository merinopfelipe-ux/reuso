'use client'

import { useState } from 'react'
import { Calculator, FloppyDisk, History as ClockCounterClockwise, QrCode, Lifebuoy, ArrowRight, ArrowLeft, Check } from '@/components/ui/icons'

const PASOS = [
  {
    icono: Calculator,
    titulo: 'Calcula tu impacto',
    descripcion: 'Usa la calculadora para registrar los objetos que reutilizas.',
  },
  {
    icono: FloppyDisk,
    titulo: 'Guarda tu cálculo',
    descripcion: 'Guarda tu registro para acumular tu huella de CO₂ eq evitado.',
  },
  {
    icono: ClockCounterClockwise,
    titulo: 'Sigue tu progreso',
    descripcion: 'Consulta tu historial y descarga tus informes de impacto.',
  },
  {
    icono: QrCode,
    titulo: 'Descarga tu informe',
    descripcion: 'Genera el PDF con tu código de verificación y QR para compartirlo.',
  },
  {
    icono: Lifebuoy,
    titulo: 'Pide ayuda cuando la necesites',
    descripcion: 'Escríbenos desde Soporte en cualquier momento, sin salir del dashboard.',
  },
]

async function marcarOnboardingVisto() {
  try {
    await fetch('/api/profile/onboarding-visto', { method: 'POST' })
  } catch {
    // Silencioso: si falla, la tarjeta puede reaparecer en la próxima
    // visita, pero no bloqueamos la navegación de la persona por esto.
  }
}

export function OnboardingCard() {
  const [visible, setVisible] = useState(true)
  const [paso, setPaso] = useState(0)

  if (!visible) return null

  const esUltimo = paso === PASOS.length - 1
  const actual = PASOS[paso]
  const Icono = actual.icono

  function siguiente() {
    if (esUltimo) {
      marcarOnboardingVisto()
      setVisible(false)
    } else {
      setPaso((p) => p + 1)
    }
  }

  function omitir() {
    marcarOnboardingVisto()
    setVisible(false)
  }

  return (
    <div
      style={{
        background: 'var(--color-brand-light)',
        border: '1.5px solid var(--color-brand)',
        borderRadius: 16,
        padding: '24px',
        marginBottom: 24,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-brand)', margin: 0 }}>
          ¡Bienvenido a Calculadora de Reúso!
        </p>
        <button
          onClick={omitir}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Omitir
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Conoce lo esencial en {PASOS.length} pasos. Paso {paso + 1} de {PASOS.length}.
      </p>

      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 12,
          padding: '16px',
          border: '1px solid var(--border)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--color-brand-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Icono size={18} color="var(--color-brand)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {actual.titulo}
          </p>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {actual.descripcion}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {PASOS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === paso ? 'var(--color-brand)' : 'var(--border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {paso > 0 && (
            <button
              onClick={() => setPaso((p) => p - 1)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 100,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} /> Atrás
            </button>
          )}
          <button
            onClick={siguiente}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 100, border: 'none',
              background: 'var(--color-brand)', color: 'var(--text-on-brand)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {esUltimo ? (<><Check size={14} /> Listo</>) : (<>Siguiente <ArrowRight size={14} /></>)}
          </button>
        </div>
      </div>
    </div>
  )
}
