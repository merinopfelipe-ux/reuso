'use client'

import { Building2 as Buildings, Info } from '@/components/ui/icons'
import { SelectorEmpresa, type EmpresaOpcion } from '@/components/ui/selector-empresa'

interface ContextoEmpresaProps {
  /** Empresas disponibles para seleccionar. */
  empresas: EmpresaOpcion[]
  /** ID de la empresa actualmente seleccionada (vacío = ninguna). */
  value: string
  onChange: (id: string) => void
  /** Etiqueta encima del selector: "Viendo clientes de", "Cotizando para", etc. */
  etiqueta?: string
  /** Mensaje que aparece cuando no hay empresa seleccionada. */
  mensajeVacio?: string
  /** Si true, ya terminó de cargar el contexto (oculta el aviso mientras carga). */
  listo?: boolean
}

/**
 * Bloque de selección de empresa para el super_admin en vistas de empresa.
 * Incluye el selector y el aviso cuando no hay empresa elegida.
 *
 * Uso:
 *   {esSuperAdmin && (
 *     <ContextoEmpresa
 *       empresas={empresas}
 *       value={empresaId ?? ''}
 *       onChange={cambiarEmpresa}
 *       etiqueta="Viendo clientes de"
 *       mensajeVacio="Selecciona una empresa para ver sus clientes."
 *       listo={!cargandoContexto}
 *     />
 *   )}
 */
export function ContextoEmpresa({
  empresas,
  value,
  onChange,
  etiqueta = 'Viendo datos de',
  mensajeVacio = 'Selecciona una empresa arriba para continuar.',
  listo = true,
}: ContextoEmpresaProps) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Selector de empresa */}
      <div className="rounded-2xl border border-(--border) p-4 flex items-center gap-3 bg-(--bg-card)">
        <Buildings size={18} className="text-[#00827C] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-(--text-secondary) mb-1">{etiqueta}</p>
          <SelectorEmpresa empresas={empresas} value={value} onChange={onChange} />
        </div>
      </div>

      {/* Aviso cuando no hay empresa elegida */}
      {listo && !value && (
        <div className="rounded-2xl border border-[#59A6E4]/20 bg-[#59A6E4]/10 p-4 flex items-center gap-2.5">
          <Info size={18} className="text-[#59A6E4] shrink-0" />
          <p className="text-sm text-[#59A6E4] font-medium">{mensajeVacio}</p>
        </div>
      )}
    </div>
  )
}
