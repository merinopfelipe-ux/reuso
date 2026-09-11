'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { Toast, type ToastItem, type ToastVariant } from './toast'

interface ToastContextValue {
  toast: {
    success: (mensaje: string) => void
    error: (mensaje: string) => void
    // Solo para topes de plan reales (HTTP 429 de plan-limits.ts) — agrega
    // el enlace de WhatsApp para ampliar el plan. Nunca usar para errores
    // genéricos ni para el asistente de IA (eso cae en manual sin aviso).
    limite: (mensaje: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((mensaje: string, variante: ToastVariant, conAccionPlan?: boolean) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, mensaje, variante, conAccionPlan }])
  }, [])

  const toast = {
    success: (mensaje: string) => add(mensaje, 'success'),
    error: (mensaje: string) => add(mensaje, 'error'),
    limite: (mensaje: string) => add(mensaje, 'error', true),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Contenedor fijo arriba derecha */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
