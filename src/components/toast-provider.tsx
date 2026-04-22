'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { Toast, type ToastItem, type ToastVariant } from './toast'

interface ToastContextValue {
  toast: {
    success: (mensaje: string) => void
    error: (mensaje: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((mensaje: string, variante: ToastVariant) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, mensaje, variante }])
  }, [])

  const toast = {
    success: (mensaje: string) => add(mensaje, 'success'),
    error: (mensaje: string) => add(mensaje, 'error'),
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
