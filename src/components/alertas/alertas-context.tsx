'use client'

import { createContext, useContext } from 'react'
import type { Alerta } from '@/types'

export interface AlertaConLeida extends Alerta {
  leida: boolean
}

export interface AlertasContextValue {
  alertas: AlertaConLeida[]
  noLeidasCount: number
  marcarLeida: (alertaId: string) => Promise<void>
  cargando: boolean
}

export const AlertasContext = createContext<AlertasContextValue | null>(null)

export function useAlertas(): AlertasContextValue {
  const ctx = useContext(AlertasContext)
  if (!ctx) throw new Error('useAlertas debe usarse dentro de AlertasProvider')
  return ctx
}
