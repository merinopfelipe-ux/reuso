'use client'

import { HiloNotas } from '@/components/crm/hilo-notas'

/**
 * Notas privadas de la cotización — separado de ModuloTrazabilidad (que
 * muestra las aperturas de la propuesta pública). Visible solo para el
 * vendedor, nunca para el cliente (a diferencia de la Nota pública).
 */
export function ModuloNotas({ cotizacionId, conEmpresa }: { cotizacionId: string; conEmpresa: (url: string) => string }) {
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  return (
    <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
      <p className={`text-xs font-semibold mb-3 ${ts}`}>Notas privadas</p>
      <HiloNotas endpointBase={conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}/notas`)} />
    </div>
  )
}
