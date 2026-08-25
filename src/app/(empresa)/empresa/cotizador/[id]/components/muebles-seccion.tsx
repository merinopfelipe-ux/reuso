'use client'

import { useState } from 'react'
import { Pencil as PencilSimple, Plus, Trash2 as Trash, RefreshCcw as ArrowsCounterClockwise, Eye, EyeSlash } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatCOP, formatNumero } from '@/lib/format'
import { EditarMuebleModal, type MuebleEditable } from './editar-mueble-modal'

export interface Mueble extends MuebleEditable {
  categoria: string
  precio_mueble: number
  co2_evitado_kg: number
  agua_evitada_l: number
  imagen_url: string | null
  oculto?: boolean
}

interface Props {
  muebles: Mueble[]
  cotizacionId: string
  conEmpresa: (url: string) => string
  isDark: boolean
  vistaDefault?: 'lista' | 'cuadro'
  onAgregarMas: () => void
  onMuebleActualizado: (
    mueble: { id: string; precio_mueble: number; co2_evitado_kg: number; agua_evitada_l: number; cantidad: number; servicios_json: unknown; insumos_json: unknown },
    totales: { subtotal: number; total: number; co2_evitado_total_kg: number; agua_evitada_total_l: number }
  ) => void
  onMuebleEliminado?: (
    muebleId: string,
    totales: { subtotal: number; total: number; co2_evitado_total_kg: number; agua_evitada_total_l: number }
  ) => void
}

/**
 * Sección "Muebles" del detalle de cotización — dos formas de ver los mismos
 * datos, no dos features distintas. "Cuadro" (galería, fotos grandes) es el
 * default para clientes B2B (presentaciones), "lista" (compacta) para B2C.
 * El usuario puede cambiar la vista en cualquier momento con el toggle.
 */
export function MueblesSeccion({ muebles, cotizacionId, conEmpresa, onAgregarMas, onMuebleActualizado, onMuebleEliminado }: Props) {
  const [editando, setEditando] = useState<Mueble | null>(null)
  const [eliminandoConfirmId, setEliminandoConfirmId] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [ocultandoId, setOcultandoId] = useState<string | null>(null)

  async function toggleOcultar(m: Mueble) {
    if (ocultandoId) return
    setOcultandoId(m.id)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}/mueble/${m.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oculto: !m.oculto }),
      })
      const d = await res.json()
      if (res.ok) {
        onMuebleActualizado(d.mueble, d.totales)
      }
    } catch (err) {
      console.error('Error al ocultar/mostrar ítem:', err)
    } finally {
      setOcultandoId(null)
    }
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  if (muebles.length === 0) {
    return (
      <div className={`rounded-[12px] border p-6 mb-4 text-center ${cardBg}`}>
        <p className={`text-sm mb-3 ${ts}`}>Esta cotización todavía no tiene ítems.</p>
        <Button size="sm" icon={<Plus size={13} strokeWidth={2.5} />} onClick={onAgregarMas}>
          Agregar ítems
        </Button>
      </div>
    )
  }

  return (
    <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <p className={`text-xs font-semibold ${ts}`}>
          {muebles.length} {muebles.length === 1 ? 'ítem' : 'ítems'}
        </p>
        <Button size="sm" variant="secondary" icon={<Plus size={13} strokeWidth={2.5} />} onClick={onAgregarMas}>
          Agregar más ítems
        </Button>
      </div>

      <div className="space-y-3">
        {muebles.map(m => (
          <div key={m.id} className={`flex items-center gap-3 ${m.oculto ? 'opacity-45' : ''}`}>
            {m.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.imagen_url} alt={m.tipo_mueble || 'Ítem'} className="w-16 h-16 rounded-[8px] object-cover object-center flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-[8px] bg-[var(--bg-input)] flex-shrink-0 flex items-center justify-center">
                <ArrowsCounterClockwise size={18} className="text-[#00827C]/30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${tp}`}>
                {m.titulo || m.tipo_mueble}{m.cantidad > 1 ? ` × ${m.cantidad}` : ''}
                {m.oculto && <span className={`ml-1.5 text-[10px] font-normal ${ts}`}>(oculto, no suma)</span>}
              </p>
              <p className={`text-xs ${ts}`}>
                {formatCOP(Number(m.precio_mueble))} · {formatNumero(m.co2_evitado_kg, { unidad: 'kg CO2 eq' })}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditando(m)}
                className="hover-pop hover-press p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Editar ítem"
              >
                <PencilSimple size={15} />
              </button>
              <button
                type="button"
                onClick={() => toggleOcultar(m)}
                disabled={ocultandoId === m.id}
                className="hover-pop hover-press p-2 rounded-lg text-[#59A6E4] transition-colors cursor-pointer disabled:opacity-50"
                title={m.oculto ? 'Mostrar ítem (volver a sumarlo)' : 'Ocultar ítem (no eliminar, no suma)'}
              >
                {m.oculto ? <EyeSlash size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setEliminandoConfirmId(m.id)}
                className="bg-transparent text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50 p-2 cursor-pointer"
                title="Eliminar ítem"
              >
                <Trash size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <EditarMuebleModal
        mueble={editando}
        conEmpresa={conEmpresa}
        cotizacionId={cotizacionId}
        onClose={() => setEditando(null)}
        onGuardado={(muebleActualizado, totales) => {
          onMuebleActualizado(
            muebleActualizado as Parameters<Props['onMuebleActualizado']>[0],
            totales as Parameters<Props['onMuebleActualizado']>[1]
          )
          setEditando(null)
        }}
        onEliminar={(muebleId, totales) => {
          if (onMuebleEliminado) {
            onMuebleEliminado(
              muebleId,
              totales as Parameters<NonNullable<Props['onMuebleEliminado']>>[1]
            )
          }
          setEditando(null)
        }}
      />

      <Modal
        abierto={!!eliminandoConfirmId}
        onClose={() => setEliminandoConfirmId(null)}
        titulo="¿Eliminar ítem de la cotización?"
        descripcion="Este ítem se quitará de la cotización y se recalcularán los totales automáticamente."
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        textoConfirmar={eliminando ? 'Eliminando...' : 'Eliminar ítem'}
        varianteConfirmar="error"
        onConfirmar={async () => {
          if (!eliminandoConfirmId || eliminando) return
          setEliminando(true)
          try {
            const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}/mueble/${eliminandoConfirmId}`), {
              method: 'DELETE',
            })
            const d = await res.json()
            if (res.ok && onMuebleEliminado) {
              onMuebleEliminado(eliminandoConfirmId, d.totales)
            }
          } catch (err) {
            console.error('Error al eliminar mueble:', err)
          } finally {
            setEliminando(false)
            setEliminandoConfirmId(null)
          }
        }}
        onCancelar={() => setEliminandoConfirmId(null)}
      />
    </div>
  )
}
