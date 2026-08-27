'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react'
import { Trash2 as Trash, Leaf, CircleDollarSign, Plus, Copy, ZoomIn } from '@/components/ui/icons'
import { formatCOP, formatNumero, parseNumero } from '@/lib/format'
import { mergeServicios, mergeInsumos, mergeMateriales } from '@/lib/cotizador/plantillas-base'
import type { ItemDetectadoConSnapshot } from '@/app/api/cotizador/diagnostico/route'
import { ImagenAmpliable } from '@/components/ui/imagen-ampliable'
import { ModalImagenZoom } from '@/components/ui/modal-imagen-zoom'
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { useMaterialDescripciones } from '@/lib/cotizador/use-material-descripciones'

export interface ItemConImagen extends ItemDetectadoConSnapshot {
  // Miniatura para mostrar (recorte si el recuadro fue útil, si no la foto
  // completa) y el base64 que se sube al confirmar — mismo valor, dos
  // nombres porque uno es "qué se ve" y otro es "qué se guarda".
  imagenPreview: string
  imagenBase64: string
  // true cuando la tarjeta se creó sin pasar por la IA (modo Manual, o "Buscar
  // en catálogo" desde un ítem no identificado) — el vendedor elige la
  // categoría/subcategoría él mismo desde cero, `confianza` no aplica.
  manual?: boolean
  // Identificador estable solo para React (nunca se envía al backend) — sin
  // esto, usar el índice del array como key hace que al quitar/duplicar un
  // ítem, React reutilice el estado interno (categoriaSel) de la tarjeta
  // anterior en esa posición, mostrando una categoría que no corresponde.
  _uiKey?: string
  // Presente solo cuando el guardado automático de este ítem ya falló una
  // vez (ej. sin internet) — page.tsx lo usa para mostrar el motivo junto
  // al botón "Reintentar guardar" en vez de un guardado silencioso.
  _errorGuardado?: string
}

interface ItemCatalogo { id: string; nombre: string; categoria_nombre: string | null }

interface Props {
  item: ItemConImagen
  catalogo: ItemCatalogo[]
  conEmpresa: (url: string) => string
  onChange: (item: ItemConImagen) => void
  onQuitar: () => void
  onDuplicar: () => void
  // Fotos crudas del grupo (antes de recortar/procesar) — solo se pasa
  // cuando el grupo tiene MÁS de 1 foto, para ofrecer el selector de "foto
  // principal". Con 1 sola foto en el grupo no hace falta preguntar.
  fotosGrupo?: { base64: string; preview: string }[]
  // Presente SOLO cuando hay más de 1 candidato detectado por la IA sin
  // elegir todavía — pinta el botón "Elegir este ítem" en el encabezado.
  onElegir?: () => void
}

const inputSt = 'px-3 py-2 rounded-xl border text-sm bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all'
const rowInputSt = 'bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]'

/**
 * Tarjeta del "escritorio de cotización" para un ítem recién detectado por
 * la IA — 3 tarjetas hermanas (foto+identificación, costos, cálculo
 * ambiental), apiladas en móvil y lado a lado desde `lg`. Mismo patrón de
 * edición (servicios/insumos/materiales con "+ Añadir", siempre mostrando
 * la lista base aunque esté en cero) que ya usa EditarMuebleModal para una
 * línea ya guardada — ver `src/lib/cotizador/plantillas-base.ts`.
 */
export function GrupoItemCard({ item, catalogo, conEmpresa, onChange, onQuitar, onDuplicar, fotosGrupo, onElegir }: Props) {
  const [categoriaSel, setCategoriaSel] = useState('')
  const [cargandoMatch, setCargandoMatch] = useState(false)
  const [zoomMiniaturaUrl, setZoomMiniaturaUrl] = useState<string | null>(null)
  const descripcionesMaterial = useMaterialDescripciones(conEmpresa)

  const ts = 'text-[var(--text-secondary)]'
  const tp = 'text-[var(--text-primary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  // Autoseleccionar la categoría la primera vez que el catálogo está listo
  useEffect(() => {
    if (item.item_id && catalogo.length > 0 && !categoriaSel) {
      const found = catalogo.find(it => it.id === item.item_id)
      if (found) setCategoriaSel(found.categoria_nombre ?? 'Sin categoría')
    }
  }, [item.item_id, catalogo, categoriaSel])

  const catalogoAgrupado = useMemo(() => {
    const grupos = new Map<string, ItemCatalogo[]>()
    for (const it of catalogo) {
      const key = it.categoria_nombre ?? 'Sin categoría'
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key)!.push(it)
    }
    return Array.from(grupos.entries())
  }, [catalogo])

  const servicios = useMemo(() => mergeServicios(item.servicios), [item.servicios])
  const insumos = useMemo(() => mergeInsumos(item.insumos), [item.insumos])
  const materiales = useMemo(() => mergeMateriales(item.materiales), [item.materiales])

  const precioServicios = servicios.reduce((s, x) => s + x.precio, 0)
  const precioInsumos = insumos.reduce((s, x) => s + x.cantidad * x.precio_unitario, 0)
  const precioTotalItem = (precioServicios + precioInsumos) * item.factor_rentabilidad * item.cantidad
  const co2Total = materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0) * item.cantidad
  const aguaTotal = materiales.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0) * item.cantidad

  // ── Coincidencia de categoría: re-vincula la línea a otro ítem del
  // catálogo. Reemplaza materiales/servicios/insumos por los del ítem nuevo
  // — lo ya editado a mano en esta tarjeta se pierde (mismo criterio que
  // EditarMuebleModal para una línea ya guardada).
  async function elegirCoincidencia(nuevoItemId: string) {
    if (!nuevoItemId || nuevoItemId === item.item_id) return
    setCargandoMatch(true)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/items/${nuevoItemId}`))
      const d = await res.json()
      if (!res.ok) return
      onChange({
        ...item,
        item_id: nuevoItemId,
        item_nombre: d.nombre ?? item.item_nombre,
        servicios: (d.servicios ?? []).map((s: { nombre: string; precio: number }) => ({ nombre: s.nombre, precio: s.precio })),
        insumos: (d.insumos ?? []).map((i: { nombre: string; unidad: string; precio_unitario: number }) => ({ nombre: i.nombre, cantidad: 0, unidad: i.unidad, precio_unitario: i.precio_unitario })),
        materiales: d.materiales ?? [],
      })
    } finally {
      setCargandoMatch(false)
    }
  }

  function actualizarServicio(i: number, patch: Partial<{ nombre: string; precio: number }>) {
    onChange({ ...item, servicios: servicios.map((s, j) => j === i ? { ...s, ...patch } : s) })
  }
  function quitarServicio(i: number) { onChange({ ...item, servicios: servicios.filter((_, j) => j !== i) }) }
  function agregarServicio() {
    onChange({ ...item, servicios: [...servicios, { nombre: '', precio: 0, _esNuevo: true } as unknown as (typeof servicios)[number]] })
  }

  function actualizarInsumo(i: number, patch: Partial<{ nombre: string; cantidad: number; precio_unitario: number }>) {
    onChange({ ...item, insumos: insumos.map((x, j) => j === i ? { ...x, ...patch } : x) })
  }
  function quitarInsumo(i: number) { onChange({ ...item, insumos: insumos.filter((_, j) => j !== i) }) }
  function agregarInsumo() {
    onChange({ ...item, insumos: [...insumos, { nombre: '', cantidad: 0, unidad: 'unidad', precio_unitario: 0, _esNuevo: true } as unknown as (typeof insumos)[number]] })
  }

  function actualizarMaterial(i: number, patch: Partial<{ nombre: string; peso_kg: number }>) {
    onChange({ ...item, materiales: materiales.map((m, j) => j === i ? { ...m, ...patch } : m) })
  }
  function quitarMaterial(i: number) { onChange({ ...item, materiales: materiales.filter((_, j) => j !== i) }) }
  function agregarMaterial() {
    onChange({ ...item, materiales: [...materiales, { nombre: '', peso_kg: 0, factor_co2_kg: 0, factor_agua_l_kg: null, _esNuevo: true } as unknown as (typeof materiales)[number]] })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
      {/* ── Tarjeta 1: Foto + identificación ── */}
      <div className={`rounded-2xl p-4 border flex flex-col gap-3 shadow-xs min-w-0 ${cardBg}`}>
        <div className="flex items-center justify-between gap-2">
          {item.manual && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#59A6E4]/15 text-[#59A6E4]">
              Manual
            </span>
          )}
          {!item.manual && <span />}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onElegir && (
              <button
                type="button"
                onClick={onElegir}
                className="text-xs font-semibold text-white bg-[#00827C] rounded-full px-3 py-1.5 hover-pop hover-press mr-1"
              >
                Elegir este ítem
              </button>
            )}
            <button onClick={onDuplicar} className="hover-pop hover-press p-1.5" title="Duplicar este ítem">
              <Copy size={15} className={ts} />
            </button>
            <button onClick={onQuitar} className="hover-pop hover-press p-1.5" title="Quitar de la cotización">
              <Trash size={15} className="text-[#FF5E4B]" />
            </button>
          </div>
        </div>

        {item.imagenPreview && (
          // Alto fijo, ancho natural — nunca se fuerza a cuadrado ni se
          // vuelve a recortar aquí. El recuadro que ya devolvió la IA es el
          // que decide qué parte de la foto es relevante, no el CSS.
          <ImagenAmpliable
            src={item.imagenPreview}
            alt={item.titulo || 'Ítem detectado'}
            wrapperClassName="w-full flex items-center justify-center rounded-[12px] bg-[var(--bg-input)]"
            imgClassName="h-48 w-auto max-w-full object-contain"
          />
        )}

        {fotosGrupo && fotosGrupo.length > 1 && (
          <div>
            <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Foto principal</label>
            <div className="flex gap-2 overflow-x-auto">
              {fotosGrupo.map((f, idx) => (
                // El clic en la miniatura elige la foto principal — un clic
                // aparte, chico, en la esquina, es lo que amplía. Nunca se
                // fusionan los dos gestos: cambiar el comportamiento del
                // clic principal rompería la selección que ya funcionaba.
                <div key={idx} className="relative flex-shrink-0 group">
                  <button
                    type="button"
                    onClick={() => onChange({ ...item, imagenPreview: f.preview, imagenBase64: f.base64 })}
                    className={`block rounded-[8px] overflow-hidden border-2 transition-colors ${
                      item.imagenPreview === f.preview ? 'border-[#00827C]' : 'border-transparent'
                    }`}
                    title="Usar esta foto como principal"
                  >
                    <img src={f.preview} alt="" className="h-14 w-14 object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setZoomMiniaturaUrl(f.preview) }}
                    aria-label="Ampliar imagen"
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-[#474747]/75 hover:bg-[#474747]/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-zoom-in"
                  >
                    <ZoomIn size={11} className="text-white" sinAnimacion />
                  </button>
                </div>
              ))}
            </div>
            <ModalImagenZoom imagenUrl={zoomMiniaturaUrl} onClose={() => setZoomMiniaturaUrl(null)} />
          </div>
        )}

        <div>
          <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Coincidencia de categoría</label>
          <div className="flex flex-col gap-2">
            <select
              value={categoriaSel}
              onChange={e => {
                const nuevaCategoria = e.target.value
                setCategoriaSel(nuevaCategoria)
                // Si el ítem ya vinculado no pertenece a la nueva categoría,
                // se desvincula — evita que quede un item_id de la categoría
                // anterior guardado a ciegas mientras el segundo selector se
                // ve vacío.
                const opciones = catalogoAgrupado.find(([c]) => c === nuevaCategoria)?.[1] ?? []
                if (item.item_id && !opciones.some(it => it.id === item.item_id)) {
                  onChange({ ...item, item_id: '' })
                }
              }}
              className={inputSt}
            >
              <option value="">-- Sin categoría --</option>
              {catalogoAgrupado.map(([cat]) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={item.item_id}
              onChange={e => elegirCoincidencia(e.target.value)}
              disabled={cargandoMatch || !categoriaSel}
              className={`${inputSt} ${!categoriaSel ? 'opacity-50' : ''}`}
            >
              <option value="">{categoriaSel ? '-- Seleccionar --' : 'Elija una categoría'}</option>
              {categoriaSel && (catalogoAgrupado.find(([c]) => c === categoriaSel)?.[1] || []).map(it => (
                <option key={it.id} value={it.id}>{it.nombre}</option>
              ))}
            </select>
            {cargandoMatch && <p className={`text-xs ${ts}`}>Cargando datos...</p>}
          </div>
        </div>

        <div>
          <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Nombre para mostrar *</label>
          <input
            value={item.titulo}
            onChange={e => onChange({ ...item, titulo: e.target.value })}
            placeholder={item.item_nombre}
            maxLength={55}
            className={inputSt}
          />
        </div>

        <div className="flex-1 flex flex-col min-h-[90px]">
          <label className={`text-xs font-bold tracking-wide mb-1.5 block ${ts}`}>Descripción del ítem</label>
          <textarea
            value={item.descripcion}
            onChange={e => onChange({ ...item, descripcion: e.target.value })}
            placeholder={item.manual ? 'Describe el ítem...' : 'Descripción del ítem generada por la IA...'}
            maxLength={190}
            className={`${inputSt} flex-1 min-h-[76px] resize-none leading-relaxed overflow-y-auto`}
          />
        </div>
      </div>

      {/* ── Tarjeta 2: Costos ── */}
      <div className={`rounded-2xl p-4 border flex flex-col gap-3 shadow-xs min-w-0 ${cardBg}`}>
        <p className="flex items-center gap-2 text-sm font-bold text-[#00827C]">
          <CircleDollarSign size={18} /> Costos
        </p>

        <div className="flex flex-col gap-3">
          <p className={`text-xs font-bold tracking-wide ${ts}`}>Servicios</p>
          {servicios.map((s, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {(s as { _esNuevo?: boolean })._esNuevo ? (
                <input value={s.nombre} onChange={e => actualizarServicio(i, { nombre: e.target.value })} placeholder="Ej: Pintor" className={`flex-1 ${rowInputSt}`} />
              ) : (
                <span className="flex-1 text-sm font-medium text-[var(--text-primary)] min-w-[80px] line-clamp-2 leading-tight" title={s.nombre}>{s.nombre}</span>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm font-medium ${ts}`}>$</span>
                <input type="number" min={0} value={s.precio} onChange={e => actualizarServicio(i, { precio: parseNumero(e.target.value) })} className="w-24 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-right text-sm outline-none focus:border-[#00827C]" />
              </div>
              <button type="button" onClick={() => quitarServicio(i)} className="p-1 text-[#E07D7D] bg-transparent transition-opacity duration-200 hover:opacity-50 flex-shrink-0 cursor-pointer" title="Quitar servicio"><Trash size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={agregarServicio} className="self-start inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3 py-1.5 transition-colors cursor-pointer mt-1">
            <Plus size={13} /> Añadir servicio
          </button>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <p className={`text-xs font-bold tracking-wide ${ts}`}>Insumos</p>
          {insumos.map((ins, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {(ins as { _esNuevo?: boolean })._esNuevo ? (
                <input value={ins.nombre} onChange={e => actualizarInsumo(i, { nombre: e.target.value })} placeholder="Ej: Tela" className={`flex-1 min-w-[80px] ${rowInputSt}`} />
              ) : (
                <span className="flex-1 min-w-[80px] text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight" title={ins.nombre}>{ins.nombre}</span>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent">
                  <input type="number" min={0} step="0.01" value={ins.cantidad} onChange={e => actualizarInsumo(i, { cantidad: parseNumero(e.target.value) })} className="w-12 text-right text-sm outline-none border-none p-0 bg-transparent" />
                  <span className={`text-xs ${ts}`}>{ins.unidad || 'und'}</span>
                </div>
                <span className={`text-sm font-medium ${ts}`}>$</span>
                <input type="number" min={0} value={ins.precio_unitario} onChange={e => actualizarInsumo(i, { precio_unitario: parseNumero(e.target.value) })} className="w-24 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-right text-sm outline-none focus:border-[#00827C]" />
              </div>
              <button type="button" onClick={() => quitarInsumo(i)} className="p-1 text-[#E07D7D] bg-transparent transition-opacity duration-200 hover:opacity-50 flex-shrink-0 cursor-pointer" title="Quitar insumo"><Trash size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={agregarInsumo} className="self-start inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3 py-1.5 transition-colors cursor-pointer mt-1">
            <Plus size={13} /> Añadir insumo
          </button>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <div className="flex justify-between items-center">
            <span className={`text-sm ${ts}`}>Subtotal</span>
            <span className={`text-sm font-bold ${tp}`}>{formatCOP(precioServicios + precioInsumos)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${ts}`}>Factor de rentabilidad</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${ts}`}>x</span>
              <input type="number" min={0} step="0.1" value={item.factor_rentabilidad} onChange={e => onChange({ ...item, factor_rentabilidad: parseFloat(e.target.value) || 0 })} className="w-16 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-center text-sm outline-none focus:border-[#00827C]" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${ts}`}>Cantidad</span>
            <input type="number" min={1} value={item.cantidad} onChange={e => onChange({ ...item, cantidad: Math.max(1, parseInt(e.target.value, 10) || 1) })} className="w-16 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-center text-sm outline-none focus:border-[#00827C]" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
            <span className={`text-sm font-bold ${tp}`}>Total del ítem</span>
            <span className="text-base font-extrabold text-[#00827C]">{formatCOP(precioTotalItem)}</span>
          </div>
        </div>
      </div>

      {/* ── Tarjeta 3: Cálculo ambiental ── */}
      <div className={`rounded-2xl p-4 border flex flex-col gap-3 shadow-xs min-w-0 ${cardBg}`}>
        <p className="flex items-center gap-2 text-sm font-bold text-[#00827C]">
          <Leaf size={18} /> Cálculo ambiental
        </p>

        <div className="flex flex-col gap-3">
          <p className={`text-xs font-bold tracking-wide ${ts}`}>Materiales</p>
          {materiales.map((m, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {(m as { _esNuevo?: boolean })._esNuevo ? (
                <input value={m.nombre} onChange={e => actualizarMaterial(i, { nombre: e.target.value })} placeholder="Ej: Hierro" className={`flex-1 min-w-[80px] ${rowInputSt}`} />
              ) : (
                <span className="flex-1 min-w-[80px] flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]">
                  <span className="line-clamp-2 leading-tight" title={m.nombre}>{m.nombre}</span>
                  <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />
                </span>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent flex-shrink-0">
                <input type="number" min={0} step="0.01" value={m.peso_kg} onChange={e => actualizarMaterial(i, { peso_kg: parseNumero(e.target.value) })} className="w-16 text-right text-sm outline-none border-none p-0 bg-transparent" />
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

        <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[var(--border)]/50">
          <div className="flex justify-between items-center">
            <span className={`text-sm font-bold ${tp}`}>Total CO₂ eq evitado</span>
            <span className="text-sm font-bold text-[#00827C]">{formatNumero(co2Total, { unidad: 'kg CO₂ eq' })}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-sm font-bold ${tp}`}>Total agua evitada</span>
            <span className="text-sm font-bold text-[#59A6E4]">{formatNumero(aguaTotal, { unidad: 'L' })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
