'use client'

import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { InputConUnidad } from '@/components/ui/formatted-number-input'
import { TriangleAlert as Warning, CheckCircle } from '@/components/ui/icons'
import { formatNumero } from '@/lib/format'
import { SkeletonLista } from '@/components/ui/skeleton'
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'

interface MaterialFila {
  id: string
  nombre: string
  peso_kg: number
  factor_co2_kg: number
  origen_fuente: string | null
  detalle_fuente: string | null
  nivel_confianza: string
}

interface ItemPendiente {
  id: string
  nombre: string
  peso_kg: number
  co2_por_unidad: number
  created_at: string
  empresas: { nombre: string } | { nombre: string }[] | null
  item_materiales: MaterialFila[]
}

export default function CatalogoPendientesPage() {
  const [items, setItems] = useState<ItemPendiente[]>([])
  const [cargando, setCargando] = useState(true)
  const [abiertoId, setAbiertoId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/items/pendientes-co2')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setCargando(false))
  }, [])

  function empresaNombre(it: ItemPendiente): string {
    const e = Array.isArray(it.empresas) ? it.empresas[0] : it.empresas
    return e?.nombre ?? '—'
  }

  return (
    <div>
      <AdminPageHeader titulo="Catálogo pendiente de revisión CO2" />
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Ítems Maestro creados por vendedores, ya en uso, con factores ambientales provisionales. Complétalos o corrígelos aquí para quitarles la alerta.
      </p>

      {cargando ? (
        <SkeletonLista filas={3} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
          <CheckCircle size={28} className="text-[#38B98E] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">No hay ítems pendientes de revisión.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(it => (
            <ItemPendienteCard
              key={it.id}
              item={it}
              empresaNombre={empresaNombre(it)}
              abierto={abiertoId === it.id}
              onToggle={() => setAbiertoId(prev => prev === it.id ? null : it.id)}
              onGuardado={() => setItems(prev => prev.filter(i => i.id !== it.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemPendienteCard({ item, empresaNombre, abierto, onToggle, onGuardado }: {
  item: ItemPendiente
  empresaNombre: string
  abierto: boolean
  onToggle: () => void
  onGuardado: () => void
}) {
  const [materiales, setMateriales] = useState(() =>
    item.item_materiales.map(m => ({ ...m, peso_kg: String(m.peso_kg), factor_co2_kg: String(m.factor_co2_kg) }))
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const descripcionesMaterial = useMaterialDescripciones((url: string) => url)

  async function guardar() {
    setGuardando(true); setError('')
    const materialesValidos = materiales
      .filter(m => m.nombre && m.factor_co2_kg)
      .map(m => ({
        nombre: m.nombre,
        peso_kg: parseFloat(m.peso_kg) || 0.01,
        factor_co2_kg: parseFloat(m.factor_co2_kg) || 0.0001,
        origen_fuente: m.origen_fuente || undefined,
        detalle_fuente: m.detalle_fuente || undefined,
        nivel_confianza: 'media' as const,
      }))

    if (materialesValidos.length === 0) {
      setError('Agrega al menos un material con impacto ambiental.')
      setGuardando(false)
      return
    }

    const res = await fetch('/api/admin/items/pendientes-co2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, materiales: materialesValidos }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar.')
      setGuardando(false)
      return
    }
    onGuardado()
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-4 text-left hover-pop">
        <div className="flex items-center gap-3 min-w-0">
          <Warning size={18} className="text-[#F6BF3E] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.nombre}</p>
            <p className="text-xs text-[var(--text-secondary)]">{empresaNombre} · {formatNumero(item.co2_por_unidad, { unidad: 'kg CO2 eq' })} actual</p>
          </div>
        </div>
      </button>
      {abierto && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-4">
          <div className="flex flex-col gap-3">
            {materiales.map((m, i) => (
              <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2 items-start">
                <span className="flex items-center gap-1">
                  <input
                    value={m.nombre}
                    onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                    placeholder="Material"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
                  />
                  <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />
                </span>
                <InputConUnidad value={m.peso_kg} onChange={v => setMateriales(r => r.map((x, j) => j === i ? { ...x, peso_kg: v } : x))} unidad="kg" />
                <InputConUnidad value={m.factor_co2_kg} onChange={v => setMateriales(r => r.map((x, j) => j === i ? { ...x, factor_co2_kg: v } : x))} unidad="kg CO2 eq/kg" paso="0.0001" />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMateriales(r => [...r, { id: `nuevo-${r.length}`, nombre: '', peso_kg: '', factor_co2_kg: '', origen_fuente: null, detalle_fuente: null, nivel_confianza: 'media' }])}
              className="text-xs font-semibold text-[var(--color-brand)] self-start hover-pop"
            >
              + Añadir material
            </button>
          </div>
          {error && <p className="text-sm text-[#FF5E4B] mt-3">{error}</p>}
          <div className="flex justify-end mt-4">
            <Button size="sm" loading={guardando} onClick={guardar}>
              Guardar y quitar alerta
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
