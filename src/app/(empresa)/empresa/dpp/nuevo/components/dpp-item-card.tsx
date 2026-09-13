'use client'
/* eslint-disable @next/next/no-img-element */

import { useMemo } from 'react'
import { Trash2 as Trash, Leaf, Plus, TriangleAlert as Warning } from '@/components/ui/icons'
import { formatNumero } from '@/lib/format'
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'
import { ImagenAmpliable } from '@/components/ui/imagen-ampliable'
import { Button } from '@/components/ui/button'

// Mismo shape que `Material` de src/lib/cotizador/plantillas-base.ts — se
// redeclara acá (sin importarlo) porque ese archivo trae también los tipos
// de servicios/insumos, dominio financiero que el DPP nunca toca.
export interface MaterialDpp {
  nombre: string
  peso_kg: number
  factor_co2_kg: number
  factor_agua_l_kg: number | null
  origen_fuente?: string | null
  nivel_confianza?: 'alta' | 'media' | 'baja'
  // Bandera persistente para saber si mostrar el input editable en vez del
  // span de solo lectura — nunca se puede inferir de `nombre === ''`,
  // porque eso se rompe apenas el usuario escribe el primer carácter.
  _esNuevo?: boolean
}

export interface ItemDppPendiente {
  _uiKey: string
  titulo: string
  descripcion: string
  confianza: number
  imagenPreview: string
  imagenBase64: string
  materiales: MaterialDpp[]
  manual: boolean
  creando: boolean
  errorCreacion: string | null
}

interface Props {
  item: ItemDppPendiente
  conEmpresa: (url: string) => string
  onChange: (item: ItemDppPendiente) => void
  onQuitar: () => void
  onConfirmar: () => void
}

const inputSt = 'px-3 py-2 rounded-xl border text-sm bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all'
const rowInputSt = 'bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]'

// Umbral de "revisa con atención" — nunca bloquea, solo avisa (diseño
// aprobado 2026-09-12: la IA siempre infiere, el humano siempre confirma).
const UMBRAL_CONFIANZA_BAJA = 0.5

export function DppItemCard({ item, conEmpresa, onChange, onQuitar, onConfirmar }: Props) {
  const descripcionesMaterial = useMaterialDescripciones(conEmpresa)
  const ts = 'text-[var(--text-secondary)]'
  const tp = 'text-[var(--text-primary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  const co2Total = useMemo(
    () => item.materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0),
    [item.materiales]
  )
  const pesoTotal = useMemo(
    () => item.materiales.reduce((s, m) => s + m.peso_kg, 0),
    [item.materiales]
  )

  function actualizarMaterial(i: number, patch: Partial<MaterialDpp>) {
    onChange({ ...item, materiales: item.materiales.map((m, j) => j === i ? { ...m, ...patch } : m) })
  }
  function quitarMaterial(i: number) {
    onChange({ ...item, materiales: item.materiales.filter((_, j) => j !== i) })
  }
  function agregarMaterial() {
    onChange({ ...item, materiales: [...item.materiales, { nombre: '', peso_kg: 0, factor_co2_kg: 0, factor_agua_l_kg: null, _esNuevo: true }] })
  }

  const puedeConfirmar = item.titulo.trim().length > 0 && pesoTotal > 0 && !item.creando

  return (
    <div className={`rounded-2xl p-4 border flex flex-col gap-3 shadow-xs ${cardBg}`}>
      <div className="flex items-center justify-between gap-2">
        {item.manual ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#59A6E4]/15 text-[#59A6E4]">Manual</span>
        ) : item.confianza < UMBRAL_CONFIANZA_BAJA ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#F6BF3E]/15 text-[#F6BF3E] flex items-center gap-1">
            <Warning size={12} sinAnimacion /> Revisa este ítem con atención
          </span>
        ) : <span />}
        <button onClick={onQuitar} className="hover-pop hover-press p-1.5" title="Quitar este ítem">
          <Trash size={15} className="text-[#FF5E4B]" />
        </button>
      </div>

      {item.imagenPreview && (
        <ImagenAmpliable
          src={item.imagenPreview}
          alt={item.titulo || 'Ítem detectado'}
          wrapperClassName="w-full flex items-center justify-center rounded-[12px] bg-[var(--bg-input)]"
          imgClassName="h-40 w-auto max-w-full object-contain"
        />
      )}

      <div>
        <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Nombre del activo *</label>
        <input
          value={item.titulo}
          onChange={e => onChange({ ...item, titulo: e.target.value })}
          placeholder="Silla de madera, Mesa de oficina..."
          maxLength={200}
          className={inputSt}
        />
      </div>

      <div>
        <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Descripción</label>
        <textarea
          value={item.descripcion}
          onChange={e => onChange({ ...item, descripcion: e.target.value })}
          placeholder={item.manual ? 'Describe el objeto y su historia...' : 'Descripción generada por la IA...'}
          maxLength={2000}
          rows={2}
          className={`${inputSt} resize-none`}
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className={`flex items-center gap-2 text-xs font-bold tracking-wide ${ts}`}><Leaf size={14} className="text-[#00827C]" sinAnimacion /> Materiales</p>
        {item.materiales.map((m, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {m._esNuevo ? (
              <input value={m.nombre} onChange={e => actualizarMaterial(i, { nombre: e.target.value })} placeholder="Ej: Hierro" className={`flex-1 min-w-[80px] ${rowInputSt}`} />
            ) : (
              <span className="flex-1 min-w-[80px] flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                <span className="line-clamp-2 leading-tight" title={m.nombre}>{m.nombre}</span>
                <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />
              </span>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent flex-shrink-0">
              <input type="number" min={0} step="0.01" value={m.peso_kg} onChange={e => actualizarMaterial(i, { peso_kg: parseFloat(e.target.value) || 0 })} className="w-16 text-right text-sm outline-none border-none p-0 bg-transparent" />
              <span className={`text-xs ${ts}`}>kg</span>
            </div>
            <button type="button" onClick={() => quitarMaterial(i)} className="p-1 text-[#E07D7D] bg-transparent transition-opacity duration-200 hover:opacity-50 flex-shrink-0 cursor-pointer" title="Quitar material"><Trash size={16} /></button>
          </div>
        ))}
        {item.materiales.length === 0 && <p className={`text-xs italic py-1 ${ts}`}>Sin materiales asignados todavía.</p>}
        <button type="button" onClick={agregarMaterial} className="self-start inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3 py-1.5 transition-colors cursor-pointer mt-1">
          <Plus size={13} sinAnimacion /> Añadir material
        </button>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
        <span className={`text-sm font-bold ${tp}`}>Huella de manufactura</span>
        <span className="text-sm font-bold text-[#00827C]">{formatNumero(co2Total, { unidad: 'kg CO₂ eq' })}</span>
      </div>

      {item.errorCreacion && (
        <p className="text-sm text-[#FF5E4B] flex items-center gap-1"><Warning size={14} sinAnimacion /> {item.errorCreacion}</p>
      )}

      <Button onClick={onConfirmar} loading={item.creando} disabled={!puedeConfirmar}>
        Confirmar y crear este DPP
      </Button>
    </div>
  )
}
