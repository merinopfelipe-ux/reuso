'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertasContext, type AlertaConLeida } from './alertas-context'
import type { Alerta } from '@/types'

export function AlertasProvider({ children }: { children: React.ReactNode }) {
  const [alertas, setAlertas] = useState<AlertaConLeida[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch('/api/alertas')
        if (!res.ok) return
        const data = (await res.json()) as { alertas: Alerta[]; ids_leidas: string[] }
        const combinadas: AlertaConLeida[] = data.alertas.map((a) => ({
          ...a,
          leida: data.ids_leidas.includes(a.id),
        }))
        setAlertas(combinadas)
      } catch {
        // silenciar errores de red
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const marcarLeida = useCallback(async (alertaId: string) => {
    // Actualización optimista
    setAlertas((prev) =>
      prev.map((a) => (a.id === alertaId ? { ...a, leida: true } : a))
    )
    try {
      const res = await fetch('/api/alertas/marcar-leida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertaId }),
      })
      if (!res.ok) throw new Error('Error al marcar')
    } catch {
      // Rollback optimista
      setAlertas((prev) =>
        prev.map((a) => (a.id === alertaId ? { ...a, leida: false } : a))
      )
    }
  }, [])

  const noLeidasCount = alertas.filter((a) => !a.leida).length

  return (
    <AlertasContext.Provider value={{ alertas, noLeidasCount, marcarLeida, cargando }}>
      {children}
    </AlertasContext.Provider>
  )
}
