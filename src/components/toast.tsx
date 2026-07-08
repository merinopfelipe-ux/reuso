'use client'

import { useEffect, useRef } from 'react'
import { CheckCircleIcon as CheckCircle, XCircleIcon as XCircle, XIcon as X } from '@animateicons/react/lucide'

export type ToastVariant = 'success' | 'error'

export interface ToastItem {
  id: string
  mensaje: string
  variante: ToastVariant
}

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

const DURACION_MS = 5000

export function Toast({ toast, onDismiss }: ToastProps) {
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DURACION_MS)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

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
      <span style={{ fontSize: 14, color: '#1A3A38', flex: 1, lineHeight: 1.4 }}>
        {toast.mensaje}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: '#4D7C79',
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
