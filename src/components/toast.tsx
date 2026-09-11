'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle, XCircle, X } from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { waLink } from '@/lib/constants/contacto'

export type ToastVariant = 'success' | 'error'

export interface ToastItem {
  id: string
  mensaje: string
  variante: ToastVariant
  // true solo para topes de plan reales (cálculos/informes/cotizaciones/
  // DPP/empleados) — agrega el enlace de WhatsApp para ampliar el plan.
  // Nunca se usa para errores genéricos ni cuando falta el asistente de IA
  // (eso cae en modo manual sin ningún aviso, a propósito).
  conAccionPlan?: boolean
}

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

const DURACION_MS = 5000
// El aviso de tope de plan se queda más tiempo — es información que la
// persona necesita poder leer y actuar, no un "listo" de un segundo.
const DURACION_CON_ACCION_MS = 9000

export function Toast({ toast, onDismiss }: ToastProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const duracion = toast.conAccionPlan ? DURACION_CON_ACCION_MS : DURACION_MS

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), duracion)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss, duracion])

  const isSuccess = toast.variante === 'success'
  const Icon = isSuccess ? CheckCircle : XCircle
  const colorBg = isSuccess ? '#F0FBF7' : '#FFF4F3'
  const colorBorder = isSuccess ? '#38B98E' : '#FF5E4B'
  const colorIcon = isSuccess ? '#38B98E' : '#FF5E4B'
  const colorBar = isSuccess ? '#38B98E' : '#FF5E4B'

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: colorBg,
        border: `1px solid ${colorBorder}`,
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        minWidth: 280,
        maxWidth: 380,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Icon size={18} color={colorIcon} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4, display: 'block' }}>
          {toast.mensaje}
        </span>
        {toast.conAccionPlan && (
          <a
            href={waLink('Hola, quiero ampliar mi plan de la Calculadora de Reúso.')}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, fontWeight: 700, color: colorIcon }}
          >
            <WhatsappLogo size={14} />
            Escríbenos para ampliar tu plan
          </a>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--text-secondary)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
        className="hover-rotate-90 hover-press"
      >
        <X size={15} />
      </button>
      {/* Barra de progreso */}
      <div
        ref={progressRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          background: colorBar,
          width: '100%',
          animation: `toast-progress ${DURACION_MS}ms linear forwards`,
          transformOrigin: 'left',
        }}
      />
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}
