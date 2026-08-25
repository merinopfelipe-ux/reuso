'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'
import { Trash2 as Trash, Leaf, Plus, CircleDollarSign, Pencil as PencilSimple } from '@/components/ui/icons'
import { formatCOP, formatNumero, parseNumero } from '@/lib/format'
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'
import {
  type Servicio, type Insumo, type Material,
  mergeServicios, mergeInsumos, mergeMateriales,
} from '@/lib/cotizador/plantillas-base'

interface ItemCatalogo { id: string; nombre: string; categoria_nombre: string | null }

export interface MuebleEditable {
  id: string
  item_id: string | null
  titulo: string | null
  descripcion: string | null
  tipo_mueble: string
  cantidad: number
  servicios_json: Servicio[] | null
  insumos_json: Insumo[] | null
  factor_rentabilidad: number
  materiales_json: Material[] | null
  co2_evitado_kg: number
  agua_evitada_l: number
}

interface Props {
  mueble: MuebleEditable | null
  conEmpresa: (url: string) => string
  cotizacionId: string
  onClose: () => void
  onGuardado: (mueble: unknown, totales: unknown) => void
  onEliminar?: (muebleId: string, totales: unknown) => void
}

const inputSt = 'px-3 py-2 rounded-xl border text-sm bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all'

/**
 * Edita el snapshot de una línea YA guardada en la cotización: nombre para
 * mostrar, descripción, coincidencia con el catálogo (item_id), servicios,
 * insumos y materiales por peso. Nunca toca el catálogo compartido — es
 * exclusivo de esta cotización, vía PATCH .../mueble/[muebleId]. Cambiar la
 * "Coincidencia de categoría" reemplaza materiales/servicios/insumos por los
 * del ítem elegido (directriz del usuario 2026-08-07).
 */
export function EditarMuebleModal({ mueble, conEmpresa, cotizacionId, onClose, onGuardado, onEliminar }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [itemId, setItemId] = useState<string | null>(null)
  const [categoriaSel, setCategoriaSel] = useState<string>('')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [factorRentabilidad, setFactorRentabilidad] = useState(2)
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([])
  const [cargandoMatch, setCargandoMatch] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const descripcionesMaterial = useMaterialDescripciones(conEmpresa)

  useEffect(() => {
    if (!mueble) return
    setTitulo(mueble.titulo || mueble.tipo_mueble)
    setDescripcion(mueble.descripcion ?? '')
    setCantidad(mueble.cantidad)
    setFactorRentabilidad(mueble.factor_rentabilidad)
    setItemId(mueble.item_id)
    setServicios(mergeServicios(mueble.servicios_json ?? []))
    setInsumos(mergeInsumos(mueble.insumos_json ?? []))
    setMateriales(mergeMateriales((mueble.materiales_json ?? []).map(m => ({
      nombre: m.nombre, peso_kg: m.peso_kg, factor_co2_kg: m.factor_co2_kg, factor_agua_l_kg: m.factor_agua_l_kg ?? null,
      categoria_material: m.categoria_material ?? null, origen_fuente: m.origen_fuente ?? null,
      detalle_fuente: m.detalle_fuente ?? null, nivel_confianza: m.nivel_confianza,
    }))))
    setError(null)

    let cancelado = false
    fetch(conEmpresa('/api/cotizador/items'))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelado && d) setCatalogo(d.items ?? []) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [mueble, conEmpresa])

  // Autoseleccionar la categoría si ya hay un ítem asignado
  useEffect(() => {
    if (itemId && catalogo.length > 0 && !categoriaSel) {
      const item = catalogo.find(it => it.id === itemId)
      if (item) {
        setCategoriaSel(item.categoria_nombre ?? 'Sin categoría')
      }
    }
  }, [itemId, catalogo, categoriaSel])

  const catalogoAgrupado = useMemo(() => {
    const grupos = new Map<string, ItemCatalogo[]>()
    for (const it of catalogo) {
      const key = it.categoria_nombre ?? 'Sin categoría'
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(it)
    }
    return Array.from(grupos.entries())
  }, [catalogo])

  const ts = 'text-[var(--text-secondary)]'
  const tp = 'text-[var(--text-primary)]'

  const subtotal = servicios.reduce((s, x) => s + x.precio, 0) + insumos.reduce((s, x) => s + x.cantidad * x.precio_unitario, 0)
  const total = subtotal * factorRentabilidad * cantidad
  const totalCo2 = materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0) * cantidad
  const totalAgua = materiales.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0) * cantidad

  // ── Coincidencia de categoría: re-vincula la línea a otro ítem del
  // catálogo. Reemplaza materiales/servicios/insumos por los del ítem nuevo
  // — lo que ya se había editado a mano en esta pantalla se pierde.
  async function elegirCoincidencia(nuevoItemId: string) {
    if (!nuevoItemId || nuevoItemId === itemId) return
    setCargandoMatch(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/items/${nuevoItemId}`))
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'No se pudo cargar ese ítem.'); return }
      setItemId(nuevoItemId)
      setServicios(mergeServicios((d.servicios ?? []).map((s: Servicio) => ({ nombre: s.nombre, precio: s.precio }))))
      setInsumos(mergeInsumos((d.insumos ?? []).map((i: Insumo) => ({ nombre: i.nombre, cantidad: 0, unidad: i.unidad, precio_unitario: i.precio_unitario }))))
      setMateriales(mergeMateriales((d.materiales ?? []).map((m: Material) => ({
        nombre: m.nombre, peso_kg: m.peso_kg, factor_co2_kg: m.factor_co2_kg, factor_agua_l_kg: m.factor_agua_l_kg ?? null,
        categoria_material: m.categoria_material ?? null, origen_fuente: m.origen_fuente ?? null,
        detalle_fuente: m.detalle_fuente ?? null, nivel_confianza: m.nivel_confianza,
      }))))
    } catch {
      setError('Error de conexión al cargar ese ítem.')
    } finally {
      setCargandoMatch(false)
    }
  }

  function agregarServicio() { setServicios(prev => [...prev, { nombre: '', precio: 0 }]) }
  function quitarServicio(i: number) { setServicios(prev => prev.filter((_, j) => j !== i)) }
  function agregarInsumo() { setInsumos(prev => [...prev, { nombre: '', cantidad: 0, unidad: 'unidad', precio_unitario: 0 }]) }
  function quitarInsumo(i: number) { setInsumos(prev => prev.filter((_, j) => j !== i)) }
  function agregarMaterial() { setMateriales(prev => [...prev, { nombre: '', peso_kg: 0, factor_co2_kg: 0, factor_agua_l_kg: null }]) }
  function quitarMaterial(i: number) { setMateriales(prev => prev.filter((_, j) => j !== i)) }

  async function guardar() {
    if (!mueble || guardando || eliminando) return
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}/mueble/${mueble.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descripcion: descripcion.trim() || null,
          cantidad,
          item_id: itemId ?? undefined,
          servicios_json: servicios.filter(s => s.nombre.trim()),
          insumos_json: insumos.filter(i => i.nombre.trim() && i.cantidad > 0),
          materiales_json: materiales.filter(m => m.nombre.trim() && m.peso_kg > 0),
          factor_rentabilidad: factorRentabilidad,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al guardar los cambios.'); return }
      onGuardado(d.mueble, d.totales)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarMueble() {
    if (!mueble || guardando || eliminando) return
    setEliminando(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}/mueble/${mueble.id}`), {
        method: 'DELETE',
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al eliminar el ítem.'); return }
      onEliminar?.(mueble.id, d.totales)
      onClose()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Modal
      abierto={!!mueble}
      onClose={onClose}
      titulo="Editar ítem de cotización"
      descripcion="Los cambios realizados aquí son exclusivos de esta cotización y no modifican el catálogo general."
      icono={<PencilSimple size={20} className="text-[var(--color-brand)]" />}
      textoConfirmar={guardando ? 'Guardando...' : 'Guardar cambios'}
      onConfirmar={guardar}
      onCancelar={onClose}
      ancho="xl"
    >
      <div className="flex flex-col gap-5 py-1">
        {/* Datos principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Categoría</label>
            <Selector
              value={categoriaSel}
              onChange={setCategoriaSel}
              opciones={[
                { value: '', label: '-- Sin categoría --' },
                ...catalogoAgrupado.map(([cat]) => ({ value: cat, label: cat })),
              ]}
            />
          </div>
          <div>
            <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Subcategoría (Ítem)</label>
            <Selector
              value={itemId ?? ''}
              onChange={elegirCoincidencia}
              disabled={cargandoMatch || !categoriaSel}
              opciones={[
                { value: '', label: categoriaSel ? '-- Seleccionar --' : 'Elija una categoría' },
                ...(categoriaSel ? (catalogoAgrupado.find(([c]) => c === categoriaSel)?.[1] || []).map(it => ({ value: it.id, label: it.nombre })) : []),
              ]}
            />
            {cargandoMatch && <p className={`text-xs mt-1 ${ts}`}>Cargando datos...</p>}
          </div>
        </div>

        <div>
          <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Nombre para mostrar *</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={mueble?.tipo_mueble} className={inputSt} />
        </div>

        <div>
          <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Descripción del ítem</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción opcional para el cliente..." maxLength={300} className={inputSt} />
        </div>

        {/* Bloques de Costos y Cálculo Ambiental */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start mt-2">
          {/* Card: Costos */}
          <div className="rounded-2xl p-5 border border-[var(--border)] bg-[var(--bg-card)] flex flex-col gap-3 shadow-xs">
            <p className="flex items-center gap-2 text-sm font-bold text-[#00827C] mb-2">
              <CircleDollarSign size={18} /> Costos
            </p>

            <div className="flex flex-col gap-3">
              <p className={`text-xs font-bold tracking-wide ${ts}`}>Servicios</p>
              {servicios.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input value={s.nombre} onChange={e => setServicios(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} placeholder="Ej: Pintor" className="flex-1 bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]" />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-medium ${ts}`}>$</span>
                    <input type="number" min={0} value={s.precio} onChange={e => setServicios(prev => prev.map((x, j) => j === i ? { ...x, precio: parseNumero(e.target.value) } : x))} className="w-24 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-right text-sm outline-none focus:border-[#00827C]" />
                  </div>
                  <button type="button" onClick={() => quitarServicio(i)} className="p-1 text-[#E07D7D] bg-transparent transition-opacity duration-200 hover:opacity-50 flex-shrink-0 cursor-pointer" title="Quitar servicio"><Trash size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={agregarServicio} className="self-start inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3 py-1.5 transition-colors cursor-pointer mt-1">
                <Plus size={13} /> Añadir servicio
              </button>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <p className={`text-xs font-bold tracking-wide ${ts}`}>Insumos</p>
              {insumos.map((ins, i) => (
                <div key={i} className="flex items-center gap-3 flex-wrap">
                  <input value={ins.nombre} onChange={e => setInsumos(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} placeholder="Ej: Tela" className="flex-1 bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]" />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent">
                      <input type="number" min={0} step="0.01" value={ins.cantidad} onChange={e => setInsumos(prev => prev.map((x, j) => j === i ? { ...x, cantidad: parseNumero(e.target.value) } : x))} className="w-12 text-right text-sm outline-none border-none p-0 bg-transparent" />
                      <span className={`text-xs ${ts}`}>{ins.unidad || 'und'}</span>
                    </div>
                    <span className={`text-sm font-medium ${ts}`}>$</span>
                    <input type="number" min={0} value={ins.precio_unitario} onChange={e => setInsumos(prev => prev.map((x, j) => j === i ? { ...x, precio_unitario: parseNumero(e.target.value) } : x))} className="w-24 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-right text-sm outline-none focus:border-[#00827C]" />
                  </div>
                  <button type="button" onClick={() => quitarInsumo(i)} className="p-1 text-[#E07D7D] bg-transparent transition-opacity duration-200 hover:opacity-50 flex-shrink-0 cursor-pointer" title="Quitar insumo"><Trash size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={agregarInsumo} className="self-start inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3 py-1.5 transition-colors cursor-pointer mt-1">
                <Plus size={13} /> Añadir insumo
              </button>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${ts}`}>Subtotal</span>
                <span className={`text-sm font-bold ${tp}`}>{formatCOP(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${ts}`}>Factor de rentabilidad</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${ts}`}>x</span>
                  <input type="number" min={0} step="0.1" value={factorRentabilidad} onChange={e => setFactorRentabilidad(parseFloat(e.target.value) || 0)} className="w-16 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-center text-sm outline-none focus:border-[#00827C]" />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className={`text-sm font-bold ${tp}`}>Total del ítem</span>
                <span className="text-base font-extrabold text-[#00827C]">{formatCOP(total)}</span>
              </div>
            </div>
          </div>

          {/* Card: Cálculo Ambiental */}
          <div className="rounded-2xl p-5 border border-[var(--border)] bg-[var(--bg-card)] flex flex-col gap-3 shadow-xs">
            <p className="flex items-center gap-2 text-sm font-bold text-[#00827C] mb-2">
              <Leaf size={18} /> Cálculo ambiental
            </p>

            <div className="flex flex-col gap-3">
              <p className={`text-xs font-bold tracking-wide ${ts}`}>Materiales</p>
              {materiales.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex-1 flex items-center gap-1 min-w-[80px]">
                    <input value={m.nombre} onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} placeholder="Ej: Hierro" className="flex-1 bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]" />
                    <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent flex-shrink-0">
                    <input type="number" min={0} step="0.01" value={m.peso_kg} onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, peso_kg: parseNumero(e.target.value) } : x))} className="w-16 text-right text-sm outline-none border-none p-0 bg-transparent" />
                    <span className={`text-xs ${ts}`}>kg</span>
                  </div>
                  <button type="button" onClick={() => quitarMaterial(i)} className="p-1 text-[#E07D7D] bg-transparent transition-opacity duration-200 hover:opacity-50 flex-shrink-0 cursor-pointer" title="Quitar material"><Trash size={16} /></button>
                </div>
              ))}
              {materiales.length === 0 && <p className={`text-xs italic py-1 ${ts}`}>Sin materiales asignados.</p>}
              <button type="button" onClick={agregarMaterial} className="self-start inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3 py-1.5 transition-colors cursor-pointer mt-1">
                <Plus size={13} /> Añadir material
              </button>
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-[var(--border)]/50">
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${tp}`}>Total CO₂ eq evitado</span>
                <span className="text-sm font-bold text-[#00827C]">{formatNumero(totalCo2, { unidad: 'kg CO₂ eq' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${tp}`}>Total agua evitada</span>
                <span className="text-sm font-bold text-[#59A6E4]">{formatNumero(totalAgua, { unidad: 'L' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior: Cantidad y Eliminar */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${ts}`}>Cantidad de ítems:</span>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={e => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`w-20 ${inputSt} text-center font-bold`}
            />
          </div>
          {onEliminar && (
            <button
              type="button"
              onClick={eliminarMueble}
              disabled={guardando || eliminando}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-error)] bg-transparent transition-opacity duration-200 hover:opacity-50 cursor-pointer"
            >
              <Trash size={14} />
              <span>{eliminando ? 'Eliminando...' : 'Eliminar este ítem'}</span>
            </button>
          )}
        </div>

        {error && <p className="text-sm text-[#FF5E4B]">{error}</p>}
      </div>
    </Modal>
  )
}
