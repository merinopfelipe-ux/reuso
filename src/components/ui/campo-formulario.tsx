'use client'

import type { ReactNode } from 'react'

/** Clases canónicas de input para páginas de detalle. Importar y usar cuando
 *  se necesite el string de clase fuera de CampoFormulario (ej. textarea).
 *  Radio de 8px por token (rounded-input), igual que Selector e InputTelefono. */
export const CLASE_CAMPO = 'rounded-input border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed w-full'
export const CLASE_ETIQUETA = 'text-xs font-semibold text-(--text-secondary)'

interface CampoFormularioProps {
  label: string
  /** Texto de ayuda debajo del campo. */
  hint?: string
  /** Ocupa ambas columnas en un grid de 2. */
  ancho?: 'normal' | 'completo'
  /** El hijo trae sus propios botones o selectores (Selector, SelectorPais, InputTelefono,
   *  SelectorCiiu...). Usa div en vez de label: dentro de un label, el clic en un botón
   *  se dispara dos veces y el menú se abre y se cierra de inmediato. */
  compuesto?: boolean
  children: ReactNode
}

/**
 * Envuelve un input/select/textarea con la etiqueta y los estilos canónicos.
 *
 * Uso:
 *   <CampoFormulario label="Nombre">
 *     <input className={CLASE_CAMPO} value={...} onChange={...} />
 *   </CampoFormulario>
 *
 * Para textarea añadir min-h al child:
 *   <textarea className={`${CLASE_CAMPO} min-h-[80px]`} ... />
 *
 * Para componentes con botones propios (selectores, teléfono):
 *   <CampoFormulario label="País" compuesto>
 *     <SelectorPais value={pais} onChange={setPais} />
 *   </CampoFormulario>
 */
export function CampoFormulario({ label, hint, ancho = 'normal', compuesto = false, children }: CampoFormularioProps) {
  const Envoltura = compuesto ? 'div' : 'label'
  return (
    <Envoltura className={`flex flex-col gap-1 ${ancho === 'completo' ? 'sm:col-span-2' : ''}`}>
      <span className={CLASE_ETIQUETA}>{label}</span>
      {children}
      {hint && <span className="text-[11px] text-(--text-placeholder)">{hint}</span>}
    </Envoltura>
  )
}
