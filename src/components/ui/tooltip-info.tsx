'use client'

import { Question } from '@/components/ui/icons'

interface Props {
  texto: string
  className?: string
}

/**
 * Ícono de información con tooltip flotante al pasar el mouse/tocar — mismo
 * patrón ya usado en sales-dashboard.tsx (Ticket promedio, Tasa de cierre),
 * extraído acá para no seguir duplicando el CSS a mano. No renderiza nada
 * si `texto` está vacío, para que el llamador no necesite su propio if.
 */
export function TooltipInfo({ texto, className }: Props) {
  if (!texto) return null
  return (
    <span className={`group/tt relative inline-flex flex-shrink-0 ${className ?? ''}`}>
      <Question size={12} className="cursor-help" sinAnimacion />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-[60] w-52 rounded-lg bg-[var(--text-primary)] px-2.5 py-1.5 text-[11px] font-normal leading-snug text-[var(--bg-primary)] opacity-0 scale-95 transition-all group-hover/tt:opacity-100 group-hover/tt:scale-100 text-center">
        {texto}
      </span>
    </span>
  )
}
