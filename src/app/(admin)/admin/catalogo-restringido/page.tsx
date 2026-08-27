'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { TriangleAlert as Warning, X, Plus } from '@/components/ui/icons'
import { SkeletonLista } from '@/components/ui/skeleton'
import { formatFecha } from '@/lib/format'

interface EmpresaOpcion { id: string; nombre: string }

interface PermisoFila { id: string; empresa_id: string; empresas: { nombre: string } | { nombre: string }[] | null }

interface ItemRestringido {
  id: string
  nombre: string
  pendiente_revision_co2: boolean
  creado_por_empresa_id: string | null
  created_at: string
  creador: { nombre: string } | { nombre: string }[] | null
  item_permisos_empresa: PermisoFila[]
}

export default function CatalogoRestringidoPage() {
  const [items, setItems] = useState<ItemRestringido[]>([])
  const [empresas, setEmpresas] = useState<EmpresaOpcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [abiertoId, setAbiertoId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/items/restringidos').then(r => r.json()),
      fetch('/api/cotizador/empresas').then(r => r.json()),
    ]).then(([dItems, dEmpresas]) => {
      setItems(dItems.items ?? [])
      setEmpresas(dEmpresas.empresas ?? [])
    }).finally(() => setCargando(false))
  }, [])

  function nombreDe(v: { nombre: string } | { nombre: string }[] | null): string {
    const o = Array.isArray(v) ? v[0] : v
    return o?.nombre ?? '—'
  }

  // Un ítem restringido viene de dos orígenes: un vendedor lo creó desde el
  // Cotizador (creado_por_empresa_id apunta a esa empresa), o el super_admin
  // lo restringió manualmente desde /admin/categorias (creado_por_empresa_id
  // queda null, porque nunca perteneció a ninguna empresa).
  function origenDe(it: ItemRestringido): string {
    return it.creado_por_empresa_id ? nombreDe(it.creador) : 'el catálogo maestro'
  }

  async function otorgar(itemId: string, empresaId: string) {
    if (!empresaId) return
    const res = await fetch(`/api/admin/items/restringidos/${itemId}/permisos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa_id: empresaId }),
    })
    if (res.ok) {
      const empresa = empresas.find(e => e.id === empresaId)
      setItems(prev => prev.map(it => it.id === itemId
        ? { ...it, item_permisos_empresa: [...it.item_permisos_empresa, { id: `tmp-${empresaId}`, empresa_id: empresaId, empresas: { nombre: empresa?.nombre ?? '' } }] }
        : it))
    }
  }

  async function revocar(itemId: string, empresaId: string) {
    const res = await fetch(`/api/admin/items/restringidos/${itemId}/permisos/${empresaId}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.map(it => it.id === itemId
        ? { ...it, item_permisos_empresa: it.item_permisos_empresa.filter(p => p.empresa_id !== empresaId) }
        : it))
    }
  }

  return (
    <div>
      <AdminPageHeader titulo="Catálogo restringido" />
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Esta pantalla solo comparte o revoca acceso a ítems que YA están restringidos: los que un vendedor crea desde el Cotizador, o los que marcaste manualmente en{' '}
        <Link href="/admin/categorias" className="font-semibold text-[var(--color-brand)]">Categorías</Link>. Para restringir un ítem por primera vez, hazlo desde ahí.
      </p>

      {cargando ? (
        <SkeletonLista filas={3} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Todavía no hay ítems restringidos.</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Para restringir uno, ve a un ítem en{' '}
            <Link href="/admin/categorias" className="font-semibold text-[var(--color-brand)]">Categorías</Link>{' '}
            y activa &quot;Restringir visibilidad&quot;. Aquí vas a poder compartirlo o revocarlo por empresa.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(it => (
            <ItemRestringidoCard
              key={it.id}
              item={it}
              empresas={empresas}
              abierto={abiertoId === it.id}
              onToggle={() => setAbiertoId(prev => prev === it.id ? null : it.id)}
              onOtorgar={(empresaId) => otorgar(it.id, empresaId)}
              onRevocar={(empresaId) => revocar(it.id, empresaId)}
              nombreDe={nombreDe}
              origen={origenDe(it)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRestringidoCard({ item, empresas, abierto, onToggle, onOtorgar, onRevocar, nombreDe, origen }: {
  item: ItemRestringido
  empresas: EmpresaOpcion[]
  abierto: boolean
  onToggle: () => void
  onOtorgar: (empresaId: string) => void
  onRevocar: (empresaId: string) => void
  nombreDe: (v: { nombre: string } | { nombre: string }[] | null) => string
  origen: string
}) {
  const [seleccion, setSeleccion] = useState('')
  const empresasConAcceso = new Set(item.item_permisos_empresa.map(p => p.empresa_id))
  const empresasDisponibles = empresas.filter(e => !empresasConAcceso.has(e.id))

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-4 text-left hover-pop">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-2">
            {item.nombre}
            {item.pendiente_revision_co2 && <Warning size={14} className="text-[#F6BF3E] flex-shrink-0" />}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Creado por {origen} · {formatFecha(item.created_at)} · compartido con {item.item_permisos_empresa.length}
          </p>
        </div>
      </button>
      {abierto && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Empresas con acceso</p>
          <div className="flex flex-col gap-2 mb-4">
            {item.item_permisos_empresa.length === 0 && (
              <p className="text-xs italic text-[var(--text-secondary)]">Solo visible para la empresa que lo creó.</p>
            )}
            {item.item_permisos_empresa.map(p => (
              <div key={p.empresa_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-[var(--text-primary)]">{nombreDe(p.empresas)}</span>
                {p.empresa_id !== item.creado_por_empresa_id && (
                  <button onClick={() => onRevocar(p.empresa_id)} className="hover-pop hover-press p-1" title="Revocar acceso">
                    <X size={14} className="text-[#FF5E4B]" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={seleccion}
              onChange={e => setSeleccion(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
            >
              <option value="">Elige una empresa para compartir</option>
              {empresasDisponibles.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <button
              onClick={() => { if (seleccion) { onOtorgar(seleccion); setSeleccion('') } }}
              className="hover-pop hover-press p-2 rounded-lg bg-[#00827C]/10 flex-shrink-0"
              title="Compartir"
            >
              <Plus size={16} className="text-[#00827C]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
