'use client'

import { useEffect, useState } from 'react'
import { Lock, Plus, X, CaretDown, CaretRight, Square, SquareCheck as CheckSquare } from '@/components/ui/icons'

const C = {
  brand: 'var(--color-brand)',
  dark: 'var(--text-primary)',
  mid: 'var(--text-secondary)',
  border: 'var(--border)',
  light: 'var(--bg-hover)',
}

interface ItemRestringido {
  id: string
  nombre: string
  creado_por_empresa_id: string | null
  categoria_id: string
  categoria: { nombre: string } | { nombre: string }[] | null
  creador: { nombre: string } | { nombre: string }[] | null
  item_permisos_empresa: { id: string; empresa_id: string; empresas?: { nombre: string } | { nombre: string }[] | null }[]
}

function nombreDe(v: { nombre: string } | { nombre: string }[] | null | undefined): string {
  const o = Array.isArray(v) ? v[0] : v
  return o?.nombre ?? '—'
}

// Un ítem restringido puede venir de dos orígenes: un vendedor lo creó desde
// el Cotizador (creado_por_empresa_id apunta a esa empresa), o el super_admin
// lo restringió manualmente desde /admin/categorias (creado_por_empresa_id
// queda null, porque nunca perteneció a ninguna empresa).
function origenDe(it: ItemRestringido): string {
  return it.creado_por_empresa_id ? nombreDe(it.creador) : 'el catálogo maestro'
}

function Checkbox({ marcado, onClick }: { marcado: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="hover-pop hover-press" style={{ display: 'flex', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
      {marcado
        ? <CheckSquare size={18} color={C.brand} />
        : <Square size={18} color={C.mid} />}
    </button>
  )
}

// Catálogo unificado disponible para ESTA empresa: propios + compartidos por
// otras (con permiso ya otorgado). /admin/catalogo-restringido sigue siendo
// la vista global por ítem (útil para auditar todo el catálogo restringido
// del sistema), esta es la vista centrada en una sola empresa.
//
// El permiso sigue siendo por ítem (tabla item_permisos_empresa, decisión
// explícita del usuario 2026-08-07: mantiene el control más granular y
// permite ítems públicos/privados coexistiendo en una misma categoría). La
// categoría solo se usa aquí para AGRUPAR la lista y facilitar seleccionar
// varios ítems de golpe — no es una unidad de permiso.
export function CatalogoRestringidoEmpresaClient({ empresaId }: { empresaId: string }) {
  const [items, setItems] = useState<ItemRestringido[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [mostrarCompartir, setMostrarCompartir] = useState(false)
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set())
  const [seleccionDisponibles, setSeleccionDisponibles] = useState<Set<string>>(new Set())
  const [seleccionCompartir, setSeleccionCompartir] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/items/restringidos')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setCargando(false))
  }, [])

  async function otorgar(itemIds: string[]) {
    setProcesando(true)
    const resultados = await Promise.allSettled(itemIds.map((itemId) =>
      fetch(`/api/admin/items/restringidos/${itemId}/permisos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: empresaId }),
      }).then((r) => ({ itemId, ok: r.ok }))
    ))
    const otorgados = new Set(
      resultados
        .filter((r): r is PromiseFulfilledResult<{ itemId: string; ok: boolean }> => r.status === 'fulfilled' && r.value.ok)
        .map((r) => r.value.itemId)
    )
    setItems((prev) => prev.map((it) => otorgados.has(it.id)
      ? { ...it, item_permisos_empresa: [...it.item_permisos_empresa, { id: `tmp-${empresaId}-${it.id}`, empresa_id: empresaId }] }
      : it))
    setSeleccionCompartir((prev) => { const next = new Set(prev); otorgados.forEach((id) => next.delete(id)); return next })
    setProcesando(false)
  }

  async function revocar(itemIds: string[]) {
    setProcesando(true)
    const resultados = await Promise.allSettled(itemIds.map((itemId) =>
      fetch(`/api/admin/items/restringidos/${itemId}/permisos/${empresaId}`, { method: 'DELETE' }).then((r) => ({ itemId, ok: r.ok }))
    ))
    const revocados = new Set(
      resultados
        .filter((r): r is PromiseFulfilledResult<{ itemId: string; ok: boolean }> => r.status === 'fulfilled' && r.value.ok)
        .map((r) => r.value.itemId)
    )
    setItems((prev) => prev.map((it) => revocados.has(it.id)
      ? { ...it, item_permisos_empresa: it.item_permisos_empresa.filter((p) => p.empresa_id !== empresaId) }
      : it))
    setSeleccionDisponibles((prev) => { const next = new Set(prev); revocados.forEach((id) => next.delete(id)); return next })
    setProcesando(false)
  }

  function toggleColapsada(categoriaId: string) {
    setColapsadas((prev) => {
      const next = new Set(prev)
      if (next.has(categoriaId)) next.delete(categoriaId)
      else next.add(categoriaId)
      return next
    })
  }

  function toggleSeleccion(set: Set<string>, setSet: (s: Set<string>) => void, itemId: string) {
    const next = new Set(set)
    if (next.has(itemId)) next.delete(itemId)
    else next.add(itemId)
    setSet(next)
  }

  if (cargando) {
    return <p style={{ fontSize: 13, color: C.mid }}>Cargando insumos y materiales...</p>
  }

  // Catálogo disponible para esta empresa: propios + los que ya tienen permiso otorgado.
  const disponibles = items.filter((it) =>
    it.creado_por_empresa_id === empresaId || it.item_permisos_empresa.some((p) => p.empresa_id === empresaId)
  )
  // Para compartir: ítems de OTRAS empresas que esta todavía no tiene.
  const paraCompartir = items.filter((it) =>
    it.creado_por_empresa_id !== empresaId && !it.item_permisos_empresa.some((p) => p.empresa_id === empresaId)
  )

  const gruposDisponibles = agruparPorCategoria(disponibles)
  const gruposCompartir = agruparPorCategoria(paraCompartir)

  return (
    <div>
      {disponibles.length === 0 ? (
        <p style={{ fontSize: 13, color: C.mid, marginBottom: 12 }}>Esta empresa no tiene insumos o materiales base propios ni compartidos todavía.</p>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {seleccionDisponibles.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,94,75,0.06)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{seleccionDisponibles.size} seleccionado{seleccionDisponibles.size > 1 ? 's' : ''}</span>
              <button
                disabled={procesando}
                onClick={() => revocar(Array.from(seleccionDisponibles))}
                className={procesando ? '' : 'hover-pop hover-press'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: procesando ? 'wait' : 'pointer', border: 'none', background: 'rgba(255,94,75,0.10)', color: 'var(--color-error)',
                  opacity: procesando ? 0.6 : 1,
                }}
              >
                <X size={12} /> Quitar acceso a seleccionados
              </button>
            </div>
          )}
          {gruposDisponibles.map((grupo) => {
            const revocablesGrupo = grupo.items.filter((it) => it.creado_por_empresa_id !== empresaId).map((it) => it.id)
            const todasSeleccionadas = revocablesGrupo.length > 0 && revocablesGrupo.every((id) => seleccionDisponibles.has(id))
            const colapsada = colapsadas.has(`disp-${grupo.categoriaId}`)
            return (
              <div key={grupo.categoriaId} style={{ marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.light }}>
                  <button onClick={() => toggleColapsada(`disp-${grupo.categoriaId}`)} className="hover-pop hover-press" style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {colapsada ? <CaretRight size={14} color={C.mid} /> : <CaretDown size={14} color={C.mid} />}
                  </button>
                  {revocablesGrupo.length > 0 && (
                    <Checkbox
                      marcado={todasSeleccionadas}
                      onClick={() => setSeleccionDisponibles((prev) => {
                        const next = new Set(prev)
                        if (todasSeleccionadas) revocablesGrupo.forEach((id) => next.delete(id))
                        else revocablesGrupo.forEach((id) => next.add(id))
                        return next
                      })}
                    />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.dark, flex: 1 }}>{grupo.categoriaNombre}</span>
                  <span style={{ fontSize: 11, color: C.mid }}>{grupo.items.length}</span>
                </div>
                {!colapsada && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
                    {grupo.items.map((it) => {
                      const esPropio = it.creado_por_empresa_id === empresaId
                      const permiso = it.item_permisos_empresa.find((p) => p.empresa_id === empresaId)
                      return (
                        <div key={it.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 10,
                          border: `1px solid ${C.border}`, background: 'var(--bg-card)',
                        }}>
                          {!esPropio && permiso
                            ? <Checkbox marcado={seleccionDisponibles.has(it.id)} onClick={() => toggleSeleccion(seleccionDisponibles, setSeleccionDisponibles, it.id)} />
                            : <Lock size={14} color={C.brand} style={{ flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>{it.nombre}</p>
                            <p style={{ fontSize: 11, color: C.mid, margin: 0 }}>
                              {esPropio ? 'Propio' : `Compartido por ${origenDe(it)}`}
                            </p>
                          </div>
                          {!esPropio && permiso && (
                            <button
                              disabled={procesando}
                              onClick={() => revocar([it.id])}
                              className={procesando ? '' : 'hover-pop hover-press'}
                              style={{
                                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                cursor: procesando ? 'wait' : 'pointer', border: 'none',
                                background: 'rgba(255,94,75,0.10)', color: 'var(--color-error)',
                                opacity: procesando ? 0.6 : 1,
                              }}
                            >
                              <X size={12} /> Quitar acceso
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {paraCompartir.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarCompartir((v) => !v)}
            className="hover-pop hover-press"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.brand, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Plus size={13} /> {mostrarCompartir ? 'Ocultar' : 'Compartir un ítem de otra empresa con esta'}
          </button>
          {mostrarCompartir && (
            <div style={{ marginTop: 10 }}>
              {seleccionCompartir.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,130,124,0.06)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{seleccionCompartir.size} seleccionado{seleccionCompartir.size > 1 ? 's' : ''}</span>
                  <button
                    disabled={procesando}
                    onClick={() => otorgar(Array.from(seleccionCompartir))}
                    className={procesando ? '' : 'hover-pop hover-press'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: procesando ? 'wait' : 'pointer', border: 'none', background: 'rgba(0,130,124,0.10)', color: C.brand,
                      opacity: procesando ? 0.6 : 1,
                    }}
                  >
                    <Plus size={12} /> Dar acceso a seleccionados
                  </button>
                </div>
              )}
              {gruposCompartir.map((grupo) => {
                const idsGrupo = grupo.items.map((it) => it.id)
                const todasSeleccionadas = idsGrupo.every((id) => seleccionCompartir.has(id))
                const colapsada = colapsadas.has(`comp-${grupo.categoriaId}`)
                return (
                  <div key={grupo.categoriaId} style={{ marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.light }}>
                      <button onClick={() => toggleColapsada(`comp-${grupo.categoriaId}`)} className="hover-pop hover-press" style={{ display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {colapsada ? <CaretRight size={14} color={C.mid} /> : <CaretDown size={14} color={C.mid} />}
                      </button>
                      <Checkbox
                        marcado={todasSeleccionadas}
                        onClick={() => setSeleccionCompartir((prev) => {
                          const next = new Set(prev)
                          if (todasSeleccionadas) idsGrupo.forEach((id) => next.delete(id))
                          else idsGrupo.forEach((id) => next.add(id))
                          return next
                        })}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.dark, flex: 1 }}>{grupo.categoriaNombre}</span>
                      <span style={{ fontSize: 11, color: C.mid }}>{grupo.items.length}</span>
                    </div>
                    {!colapsada && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
                        {grupo.items.map((it) => (
                          <div key={it.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--bg-card)',
                          }}>
                            <Checkbox marcado={seleccionCompartir.has(it.id)} onClick={() => toggleSeleccion(seleccionCompartir, setSeleccionCompartir, it.id)} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>{it.nombre}</p>
                              <p style={{ fontSize: 11, color: C.mid, margin: 0 }}>Creado por {origenDe(it)}</p>
                            </div>
                            <button
                              disabled={procesando}
                              onClick={() => otorgar([it.id])}
                              className={procesando ? '' : 'hover-pop hover-press'}
                              style={{
                                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                cursor: procesando ? 'wait' : 'pointer', border: 'none',
                                background: 'rgba(0,130,124,0.10)', color: C.brand,
                                opacity: procesando ? 0.6 : 1,
                              }}
                            >
                              <Plus size={12} /> Dar acceso
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function agruparPorCategoria(items: ItemRestringido[]): { categoriaId: string; categoriaNombre: string; items: ItemRestringido[] }[] {
  const mapa = new Map<string, { categoriaId: string; categoriaNombre: string; items: ItemRestringido[] }>()
  for (const it of items) {
    const id = it.categoria_id ?? 'sin-categoria'
    const nombre = nombreDe(it.categoria) !== '—' ? nombreDe(it.categoria) : 'Sin categoría'
    if (!mapa.has(id)) mapa.set(id, { categoriaId: id, categoriaNombre: nombre, items: [] })
    mapa.get(id)!.items.push(it)
  }
  return Array.from(mapa.values()).sort((a, b) => a.categoriaNombre.localeCompare(b.categoriaNombre))
}
