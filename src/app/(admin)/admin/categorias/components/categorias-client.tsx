'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import * as Lucide from 'lucide-react'
import { ChevronRight as CaretRight, Plus, Power, Pencil, Folder, EllipsisVertical as DotsThree, Leaf, CircleDollarSign, Trash, Lock, LockOpen } from '@/components/ui/icons'
import { IconPicker } from '@/components/admin/icon-picker'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { CategoriaConEsquemaBase, ItemConDimensiones, Modulo } from '@/types'
import { formatNumero, formatCOP } from '@/lib/format'
import { TooltipInfo } from '@/components/ui/tooltip-info'

const cardBg = 'bg-[var(--bg-card)] border border-[var(--border)]'
const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const btnPrimario = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-brand)] text-[var(--text-on-brand)] text-sm font-semibold hover-pop hover-press'
const btnSecundario = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold shadow-xs hover-pop hover-press cursor-pointer transition-all'
const btnChico = 'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold shadow-xs hover-pop hover-press cursor-pointer transition-all'
const labelSt = 'block text-xs font-semibold text-[var(--text-secondary)] mb-1.5'
const labelSeccion = 'block text-xs font-bold text-[var(--text-primary)] mb-2.5'

// ── Filas para los editores LIBRES (esquema base / extras: se puede añadir/quitar) ──
interface MaterialRow { nombre: string; peso_kg: string; factor_co2_kg: string; factor_agua_l_kg: string; categoria_material: string; origen_fuente: string; detalle_fuente: string }
interface ServicioRow { nombre: string; precio: string }
interface InsumoRow { nombre: string; cantidad: string; unidad: string; precio_unitario: string }

// Taxonomía del Reporte 2 (Mitigación GRI/ESG) — ver skill `dominios-datos`.
const CATEGORIAS_MATERIAL = [
  { value: '', label: 'Sin clasificar' },
  { value: 'madera', label: 'Madera' },
  { value: 'metal', label: 'Metal' },
  { value: 'textil', label: 'Textil' },
  { value: 'cuero', label: 'Cuero' },
  { value: 'plastico', label: 'Plástico' },
  { value: 'vidrio', label: 'Vidrio' },
  { value: 'espuma_relleno', label: 'Espuma / relleno' },
  { value: 'carton_papel', label: 'Cartón / papel' },
  { value: 'otros', label: 'Otros' },
]

const filaMaterial = (): MaterialRow => ({ nombre: '', peso_kg: '', factor_co2_kg: '', factor_agua_l_kg: '', categoria_material: '', origen_fuente: '', detalle_fuente: '' })
const filaServicio = (): ServicioRow => ({ nombre: '', precio: '' })
const filaInsumo = (): InsumoRow => ({ nombre: '', cantidad: '', unidad: '', precio_unitario: '' })

function materialesAFilas(materiales: { nombre: string; peso_kg: number; factor_co2_kg: number; factor_agua_l_kg: number | null; categoria_material?: string | null; origen_fuente: string | null; detalle_fuente: string | null }[]): MaterialRow[] {
  return materiales.map(m => ({ nombre: m.nombre, peso_kg: String(m.peso_kg), factor_co2_kg: String(m.factor_co2_kg), factor_agua_l_kg: m.factor_agua_l_kg != null ? String(m.factor_agua_l_kg) : '', categoria_material: m.categoria_material ?? '', origen_fuente: m.origen_fuente ?? '', detalle_fuente: m.detalle_fuente ?? '' }))
}
function serviciosAFilas(servicios: { nombre: string; precio: number }[]): ServicioRow[] {
  return servicios.map(s => ({ nombre: s.nombre, precio: String(s.precio) }))
}
function insumosAFilas(insumos: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[]): InsumoRow[] {
  return insumos.map(i => ({ nombre: i.nombre, cantidad: String(i.cantidad), unidad: i.unidad, precio_unitario: String(i.precio_unitario) }))
}
function filasAMateriales(rows: MaterialRow[], pesoPorDefecto = 1) {
  return rows.filter(m => m.nombre && m.factor_co2_kg)
    .map(m => ({ nombre: m.nombre, peso_kg: parseFloat(m.peso_kg) || pesoPorDefecto, factor_co2_kg: parseFloat(m.factor_co2_kg), factor_agua_l_kg: m.factor_agua_l_kg ? parseFloat(m.factor_agua_l_kg) : undefined, categoria_material: m.categoria_material || undefined, origen_fuente: m.origen_fuente || undefined, detalle_fuente: m.detalle_fuente || undefined, nivel_confianza: 'baja' as const }))
}
function filasAServicios(rows: ServicioRow[]) {
  return rows.filter(s => s.nombre && s.precio).map(s => ({ nombre: s.nombre, precio: parseFloat(s.precio) }))
}
function filasAInsumos(rows: InsumoRow[]) {
  return rows.filter(i => i.nombre && i.cantidad && i.unidad && i.precio_unitario).map(i => ({ nombre: i.nombre, cantidad: parseFloat(i.cantidad), unidad: i.unidad, precio_unitario: parseFloat(i.precio_unitario) }))
}

// ── Helpers de navegación sobre listas planas (soporta profundidad libre) ──

function hijosDe(categorias: CategoriaConEsquemaBase[], parentId: string | null): CategoriaConEsquemaBase[] {
  return categorias.filter(c => c.parent_id === parentId)
}
function itemsDe(items: ItemConDimensiones[], categoriaId: string): ItemConDimensiones[] {
  return items.filter(i => i.categoria_id === categoriaId)
}
function contarDescendientes(categorias: CategoriaConEsquemaBase[], items: ItemConDimensiones[], nodeId: string): number {
  let total = itemsDe(items, nodeId).length
  for (const hijo of hijosDe(categorias, nodeId)) total += contarDescendientes(categorias, items, hijo.id)
  return total
}

import { InputPrecio, InputConUnidad } from '@/components/ui/formatted-number-input'

// ── Menú de tres puntos (Editar / Desactivar) ───────────────────────────────

function MenuTresPuntos({ activa, visibilidad, onEditar, onToggleActiva, onToggleVisibilidad }: { activa: boolean; visibilidad?: 'global' | 'restringido'; onEditar: () => void; onToggleActiva: () => void; onToggleVisibilidad?: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function fuera(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button onClick={() => setAbierto(v => !v)} className="p-2 rounded-lg hover-pop hover-press" style={{ color: 'var(--color-brand)' }}>
        <DotsThree size={18} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-[12px] overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
          <button onClick={() => { setAbierto(false); onEditar() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-[var(--text-primary)]">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => { setAbierto(false); onToggleActiva() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-[var(--text-primary)]">
            <Power size={14} /> {activa ? 'Desactivar' : 'Activar'}
          </button>
          {onToggleVisibilidad && (
            <button onClick={() => { setAbierto(false); onToggleVisibilidad() }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-[var(--text-primary)]">
              {visibilidad === 'restringido' ? <><LockOpen size={14} /> Volver a global</> : <><Lock size={14} /> Restringir visibilidad</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Editores LIBRES (esquema base y extras de ítem: añadir/quitar filas) ───

// Único lugar de todo el proyecto donde se edita el texto de un tooltip de
// material base — en cualquier otra pantalla es solo lectura (TooltipInfo).
// "Muy fácil de dictar": un <textarea> normal, el dictado por voz del
// sistema operativo ya funciona sobre cualquier campo nativo.
function TooltipEditable({ nombre, texto, conEmpresa, onGuardado }: {
  nombre: string
  texto: string
  conEmpresa: (url: string) => string
  onGuardado: (nombre: string, nuevoTexto: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(texto)
  const [guardando, setGuardando] = useState(false)

  if (editando) {
    return (
      <div className="flex flex-col gap-1.5 w-full mt-1">
        <textarea
          value={valor}
          onChange={e => setValor(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] resize-none"
          placeholder={`Describe qué es "${nombre}"...`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={guardando}
            onClick={async () => {
              setGuardando(true)
              const res = await fetch(conEmpresa('/api/cotizador/material-descripciones'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, descripcion: valor }),
              })
              setGuardando(false)
              if (res.ok) { onGuardado(nombre, valor); setEditando(false) }
            }}
            className="text-xs font-semibold text-[var(--color-brand)] hover-pop"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => { setValor(texto); setEditando(false) }} className="text-xs text-[var(--text-secondary)] hover-pop">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <TooltipInfo texto={texto} />
      <button type="button" onClick={() => setEditando(true)} title="Editar descripción" className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--color-brand)] hover-pop">
        <Pencil size={12} sinAnimacion />
      </button>
    </span>
  )
}

function useMaterialDescripcionesState(conEmpresa: (url: string) => string) {
  const [mapa, setMapa] = useState<Record<string, string>>({})
  useEffect(() => {
    let cancelado = false
    fetch(conEmpresa('/api/cotizador/material-descripciones'))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelado && d) setMapa(d.descripciones ?? {}) })
      .catch(() => {})
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [mapa, setMapa] as const
}

function EditorMateriales({ titulo, materiales, setMateriales, mostrarPeso, conEmpresa }: {
  titulo?: string
  materiales: MaterialRow[]
  setMateriales: React.Dispatch<React.SetStateAction<MaterialRow[]>>
  mostrarPeso?: boolean
  conEmpresa: (url: string) => string
}) {
  const [descripcionesMaterial, setDescripcionesMaterial] = useMaterialDescripcionesState(conEmpresa)
  const content = (
    <>
      {titulo ? <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-brand)] mb-3"><Leaf size={16} /> {titulo}</p> : null}
      <label className={labelSeccion}>Materiales</label>
      <div className="flex flex-col gap-3 mt-1">
        {materiales.map((m, i) => (
          <div key={i} className="flex flex-col gap-2 pb-3">
            <div className={`grid grid-cols-1 sm:grid-cols-${mostrarPeso ? '4' : '3'} gap-3`}>
              <div>
                <label className={labelSt}>Material</label>
                <input style={inputSt} placeholder="Ej: Madera dura" value={m.nombre} onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
                <div className="mt-2">
                  <CampoTooltip nombre={m.nombre} mapa={descripcionesMaterial} setMapa={setDescripcionesMaterial} />
                </div>
              </div>
              {mostrarPeso && (
                <div>
                  <label className={labelSt}>Peso</label>
                  <InputConUnidad value={m.peso_kg} onChange={v => setMateriales(r => r.map((x, j) => j === i ? { ...x, peso_kg: v } : x))} unidad="kg" />
                </div>
              )}
              <div>
                <label className={labelSt}>Factor CO₂ eq (por 1 kg)</label>
                <InputConUnidad value={m.factor_co2_kg} onChange={v => setMateriales(r => r.map((x, j) => j === i ? { ...x, factor_co2_kg: v } : x))} unidad="kg CO₂ eq/kg" paso="0.0001" />
              </div>
              <div>
                <label className={labelSt}>Agua (por 1 kg)</label>
                <InputConUnidad value={m.factor_agua_l_kg} onChange={v => setMateriales(r => r.map((x, j) => j === i ? { ...x, factor_agua_l_kg: v } : x))} unidad="L agua/kg" paso="0.1" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              <div>
                <label className={labelSt}>Tipo de material</label>
                <select style={{ ...inputSt, cursor: 'pointer' }} value={m.categoria_material} onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, categoria_material: e.target.value } : x))}>
                  {CATEGORIAS_MATERIAL.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelSt}>Fuente</label>
                <input style={inputSt} placeholder="Ej: ecoinvent" value={m.origen_fuente} onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, origen_fuente: e.target.value } : x))} />
              </div>
              <div>
                <label className={labelSt}>URL de la fuente</label>
                <input style={inputSt} placeholder="https://..." value={m.detalle_fuente} onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, detalle_fuente: e.target.value } : x))} />
              </div>
            </div>
            <div className="flex justify-end mt-1">
              <button type="button" onClick={() => setMateriales(r => r.filter((_, j) => j !== i))} className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50">
                <Trash size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setMateriales(r => [...r, filaMaterial()])} className={`${btnChico} mt-3`}><Plus size={12} /> Añadir material</button>
    </>
  )

  if (titulo) {
    return <div className={`rounded-2xl p-4 ${cardBg}`}>{content}</div>
  }
  return content
}

function EditorFinanciero({ titulo, servicios, setServicios, insumos, setInsumos }: {
  titulo?: string
  servicios: ServicioRow[]; setServicios: React.Dispatch<React.SetStateAction<ServicioRow[]>>
  insumos: InsumoRow[]; setInsumos: React.Dispatch<React.SetStateAction<InsumoRow[]>>
}) {
  // El esquema base de la categoría es el molde del que heredan todos sus
  // ítems: el nombre de cada servicio/insumo es editable acá y el cambio
  // aplica a toda la categoría. El tooltip acompaña a ese nombre.
  const [descripciones, setDescripciones] = useMaterialDescripcionesState((url: string) => url)
  const content = (
    <>
      {titulo ? <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-brand)] mb-3"><CircleDollarSign size={16} /> {titulo}</p> : null}

      <label className={labelSeccion}>Servicios</label>
      <div className="flex flex-col gap-2 mb-2">
        {servicios.map((s, i) => (
          <div key={i} className="grid grid-cols-[2fr_auto] gap-2 items-start pb-2">
            <div className="flex flex-col gap-2">
              <input style={inputSt} placeholder="Servicio (ej: Pintor)" value={s.nombre} onChange={e => setServicios(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
              <CampoTooltip nombre={s.nombre} mapa={descripciones} setMapa={setDescripciones} />
            </div>
            <button type="button" onClick={() => setServicios(r => r.filter((_, j) => j !== i))} className="p-1 text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50" title="Eliminar"><Trash size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setServicios(r => [...r, filaServicio()])} className={btnChico}><Plus size={12} /> Añadir servicio</button>

      <label className={`${labelSeccion} mt-4`}>Insumos</label>
      <div className="flex flex-col gap-2 mb-2">
        {insumos.map((ins, i) => (
          <div key={i} className="flex flex-col gap-2 pb-2">
            <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_0.8fr_0.9fr_auto] gap-2 items-center">
              <input style={inputSt} placeholder="Insumo (ej: Tela)" value={ins.nombre} onChange={e => setInsumos(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
              <input style={inputSt} placeholder="Unidad (ej: metros)" value={ins.unidad} onChange={e => setInsumos(r => r.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))} />
              <InputPrecio value={ins.precio_unitario} onChange={v => setInsumos(r => r.map((x, j) => j === i ? { ...x, precio_unitario: v } : x))} />
              <button type="button" onClick={() => setInsumos(r => r.filter((_, j) => j !== i))} className="p-1 text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50" title="Eliminar"><Trash size={16} /></button>
            </div>
            <CampoTooltip nombre={ins.nombre} mapa={descripciones} setMapa={setDescripciones} />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setInsumos(r => [...r, { ...filaInsumo(), cantidad: '1' }])} className={btnChico}><Plus size={12} /> Añadir insumo</button>
    </>
  )

  if (titulo) {
    return <div className={`rounded-2xl p-4 ${cardBg}`}>{content}</div>
  }
  return content
}

// ── Componente raíz: maneja toda la navegación como estado, sin rutas ──────

export function CategoriasClient({ categorias, items, modulos }: { categorias: CategoriaConEsquemaBase[]; items: ItemConDimensiones[]; modulos: Modulo[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // La categoría y el ítem abiertos viven en la URL (?nodo=&item=): así la vista
  // actual es un link compartible con el equipo y sobrevive a un refresh/guardado.
  const nodoActualId = searchParams.get('nodo')
  const itemIdParam = searchParams.get('item')
  const [creandoItem, setCreandoItem] = useState(false)
  const [editandoId, setEditandoId] = useState<string | 'nuevo-raiz' | 'nuevo-hijo' | null>(null)
  const [mostrarConfirmarSalida, setMostrarConfirmarSalida] = useState(false)
  const [accionSalirPending, setAccionSalirPending] = useState<(() => void) | null>(null)

  function refrescar() { startTransition(() => router.refresh()) }

  function irANodo(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('nodo', id); else params.delete('nodo')
    params.delete('item')
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  function abrirItem(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set('item', id); else params.delete('item')
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const nodoActual = categorias.find(c => c.id === nodoActualId) ?? null
  const hijos = hijosDe(categorias, nodoActualId)
  const itemsAqui = nodoActualId ? itemsDe(items, nodoActualId) : []
  const itemAbiertoId: string | 'nuevo' | null = creandoItem ? 'nuevo' : itemIdParam
  const itemAbierto = itemIdParam ? items.find(i => i.id === itemIdParam) ?? null : null

  function solicitarSalida(accion: () => void) {
    if (itemAbiertoId || editandoId) {
      setAccionSalirPending(() => accion)
      setMostrarConfirmarSalida(true)
    } else {
      accion()
    }
  }

  // Prevenir navegación accidental del navegador cuando hay una edición abierta
  useEffect(() => {
    if (!itemAbiertoId && !editandoId) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [itemAbiertoId, editandoId])

  // El título de la página ES la miga de pan: muestra dónde estás, la flecha regresa un nivel.
  let titulo = 'Categorías'
  let onBack: (() => void) | undefined

  if (itemAbiertoId) {
    titulo = itemAbierto ? 'Editar ítem' : 'Nuevo ítem'
    onBack = () => solicitarSalida(() => { setCreandoItem(false); abrirItem(null) })
  } else if (editandoId) {
    const editando = editandoId === 'nuevo-raiz' || editandoId === 'nuevo-hijo' ? null : categorias.find(c => c.id === editandoId) ?? null
    const esHijo = editandoId === 'nuevo-hijo' || !!editando?.parent_id
    titulo = editando ? (esHijo ? 'Editar subcategoría' : 'Editar categoría') : (esHijo ? 'Nueva subcategoría' : 'Nueva categoría')
    onBack = () => solicitarSalida(() => setEditandoId(null))
  } else if (nodoActual) {
    titulo = nodoActual.nombre
    onBack = () => irANodo(nodoActual.parent_id)
  }

  return (
    <div>
      <AdminPageHeader titulo={titulo} showBack onBack={onBack} />

      <ModalConfirmarSalida
        abierto={mostrarConfirmarSalida}
        onConfirmar={() => {
          setMostrarConfirmarSalida(false)
          if (accionSalirPending) accionSalirPending()
        }}
        onCancelar={() => setMostrarConfirmarSalida(false)}
      />

      {(itemAbiertoId === 'nuevo' || itemAbierto) && nodoActual ? (
        <PanelItemValores
          item={itemAbierto}
          categoria={nodoActual}
          onGuardado={() => { setCreandoItem(false); abrirItem(null); refrescar() }}
          onCancelar={() => solicitarSalida(() => { setCreandoItem(false); abrirItem(null) })}
        />
      ) : editandoId ? (
        <FormNodo
          modo={editandoId === 'nuevo-raiz' || editandoId === 'nuevo-hijo' ? 'crear' : 'editar'}
          nodo={editandoId === 'nuevo-raiz' || editandoId === 'nuevo-hijo' ? null : categorias.find(c => c.id === editandoId) ?? null}
          parentId={editandoId === 'nuevo-hijo' ? nodoActualId : null}
          nodoPadre={editandoId === 'nuevo-hijo' ? nodoActual : null}
          modulos={modulos}
          onListo={() => { setEditandoId(null); refrescar() }}
          onCancelar={() => solicitarSalida(() => setEditandoId(null))}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Subcategorías — tarjetas tipo panel, 4 columnas en escritorio */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hijos.map(h => {
                const total = contarDescendientes(categorias, items, h.id)
                return (
                  <div key={h.id} onClick={() => irANodo(h.id)}
                    className={`flex flex-col h-full p-4 rounded-xl cursor-pointer transition-colors hover-pop ${cardBg} hover:border-[var(--color-brand)]/30`}>
                    <div className="flex items-start justify-between mb-3">
                      <IconoDe nombre={h.icono_lucide} className="text-[var(--color-brand)]" size={20} bg />
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                          background: h.activa ? 'rgba(56,185,142,0.1)' : 'rgba(255,94,75,0.08)',
                          color: h.activa ? 'var(--color-success-content)' : 'var(--color-error-content)',
                        }}>
                          {h.activa ? 'Activa' : 'Inactiva'}
                        </span>
                        <MenuTresPuntos
                          activa={h.activa}
                          onEditar={() => setEditandoId(h.id)}
                          onToggleActiva={async () => {
                            await fetch(`/api/admin/categorias/${h.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activa: !h.activa }) })
                            refrescar()
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)] leading-snug line-clamp-2 mb-1">{h.nombre}</p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 flex-1">
                      {h.descripcion || 'Sin descripción.'}
                    </p>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div>
                        <p className="text-[11px] text-[var(--text-secondary)]">Ítems</p>
                        <p className="text-base font-bold text-[var(--text-primary)]">{total}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
                        <CaretRight size={14} className="text-[var(--text-secondary)]" />
                      </div>
                    </div>
                  </div>
                )
              })}

              {!(nodoActual && hijos.length === 0) && (
                <button
                  onClick={() => setEditandoId(nodoActualId === null ? 'nuevo-raiz' : 'nuevo-hijo')}
                  className="flex flex-col items-center justify-center gap-2 h-full min-h-[172px] p-4 rounded-xl border-2 border-dashed hover-pop"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
                    <Plus size={18} />
                  </div>
                  <span className="text-sm font-semibold text-center">{nodoActualId === null ? 'Nueva categoría raíz' : 'Nueva subcategoría'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Ítems — solo cuando este nodo NO tiene subcategorías (es donde viven los ítems reales) */}
          {nodoActual && hijos.length === 0 && (
            <div className="flex flex-col gap-3">
              <div className={`rounded-[12px] overflow-hidden border border-[var(--border)] ${cardBg}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                        <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Nombre</th>
                        <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">CO₂</th>
                        <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">Precio</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                  <tbody>
                    {itemsAqui.map((it, idx) => {
                      const factor = it.factor_rentabilidad || 1
                      const precioTotal = (it.item_servicios.reduce((s, x) => s + x.precio, 0) + it.item_insumos.reduce((s, x) => s + x.cantidad * x.precio_unitario, 0)) * factor
                      const totalCo2 = it.item_materiales.reduce((s, x) => s + x.peso_kg * x.factor_co2_kg, 0)
                      return (
                        <tr
                          key={it.id}
                          className={`transition-colors duration-150 cursor-pointer hover:bg-[var(--bg-table-hover)] ${
                            idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                          }`}
                          style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                          onClick={() => abrirItem(it.id)}
                        >
                          <td className="px-4 py-3 text-[var(--text-primary)]">
                            <span className="inline-flex items-center gap-1.5">
                              {it.visibilidad === 'restringido' && <Lock size={12} className="text-[var(--color-brand)] flex-shrink-0" />}
                              {it.nombre}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                            {formatNumero(totalCo2, { unidad: 'kg CO₂ eq' })}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                            {formatCOP(precioTotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MenuTresPuntos
                              activa={it.activo !== false}
                              visibilidad={it.visibilidad ?? 'global'}
                              onEditar={() => abrirItem(it.id)}
                              onToggleActiva={async () => {
                                await fetch(`/api/admin/items/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: it.activo === false }) })
                                refrescar()
                              }}
                              onToggleVisibilidad={async () => {
                                const nueva = it.visibilidad === 'restringido' ? 'global' : 'restringido'
                                await fetch(`/api/admin/items/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibilidad: nueva }) })
                                refrescar()
                              }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  </table>
                </div>
              </div>
              <button
                onClick={() => setCreandoItem(true)}
                className={`self-start flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold hover-pop hover-press ${cardBg} text-[var(--color-brand)]`}
              >
                <Plus size={14} /> Agrega un nuevo ítem
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
function IconoDe({ nombre, size = 18, className, bg }: { nombre: string; size?: number; className?: string; bg?: boolean }) {
  // Import estático de lucide-react (ya lo carga IconPicker en esta misma
  // página) — un import() dinámico aquí generaba un chunk <facade> frágil en
  // Turbopack que se rompía con cualquier HMR ("module factory is not
  // available"), error real y repetible, no un problema de pestaña vieja.
  const Comp = (nombre && nombre !== 'Icon' && nombre !== 'DynamicIcon' && nombre !== 'IconNode')
    ? (Lucide as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[nombre]
    : null
  const contenido = Comp ? <Comp size={size} className={className} /> : <Folder size={size} className={className} />
  if (!bg) return contenido
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,130,124,0.1)' }}>
      {contenido}
    </div>
  )
}

import { ModalConfirmarSalida } from '@/components/ui/modal'

// ── Formulario crear/editar nodo — incluye el esquema base fusionado ───────

function FormNodo({ modo, nodo, parentId, nodoPadre, modulos, onListo, onCancelar }: {
  modo: 'crear' | 'editar'
  nodo: CategoriaConEsquemaBase | null
  parentId?: string | null
  nodoPadre?: CategoriaConEsquemaBase | null
  modulos: Modulo[]
  onListo: () => void
  onCancelar?: () => void
}) {
  const [nombre, setNombre] = useState(nodo?.nombre ?? '')
  const [iconoLucide, setIconoLucide] = useState(nodo?.icono_lucide ?? (nodoPadre?.icono_lucide ?? ''))
  const [descripcion, setDescripcion] = useState(nodo?.descripcion ?? '')
  const [moduloId, setModuloId] = useState(nodo?.modulo_id ?? '')
  const [materiales, setMateriales] = useState<MaterialRow[]>(
    modo === 'editar' ? materialesAFilas(nodo!.categoria_materiales_base) : materialesAFilas(nodoPadre?.categoria_materiales_base ?? [])
  )
  const [servicios, setServicios] = useState<ServicioRow[]>(
    modo === 'editar' ? serviciosAFilas(nodo!.categoria_servicios_base) : serviciosAFilas(nodoPadre?.categoria_servicios_base ?? [])
  )
  const [insumos, setInsumos] = useState<InsumoRow[]>(
    modo === 'editar' ? insumosAFilas(nodo!.categoria_insumos_base) : insumosAFilas(nodoPadre?.categoria_insumos_base ?? [])
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const materialesValidos = filasAMateriales(materiales)
    if (materialesValidos.length === 0) {
      setError('El esquema ambiental es obligatorio: agrega al menos un material.')
      return
    }
    setGuardando(true); setError('')
    const url = modo === 'crear' ? '/api/admin/categorias' : `/api/admin/categorias/${nodo!.id}`
    const method = modo === 'crear' ? 'POST' : 'PATCH'
    const body = {
      nombre, icono_lucide: iconoLucide,
      descripcion: descripcion || (modo === 'crear' ? undefined : null),
      ...(modo === 'crear' ? { parent_id: parentId ?? undefined, modulo_id: moduloId || undefined } : { modulo_id: moduloId || null }),
      materiales_base: materialesValidos,
      servicios_base: filasAServicios(servicios),
      insumos_base: filasAInsumos(insumos),
    }
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar.')
      setGuardando(false)
      return
    }
    onListo()
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div className={`rounded-2xl p-4 flex flex-col gap-3 ${cardBg}`}>
        <div>
          <label className={labelSt}>Nombre</label>
          <input style={inputSt} placeholder="Ej: Comedor" value={nombre} onChange={e => setNombre(e.target.value)} required />
        </div>
        <IconPicker value={iconoLucide} onChange={setIconoLucide} />
        <div>
          <label className={labelSt}>Descripción (opcional)</label>
          <input style={inputSt} placeholder="Ej: Muebles de comedor" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
        {modo === 'crear' && !parentId && (
          <div>
            <label className={labelSt}>Módulo (opcional)</label>
            <select style={inputSt} value={moduloId} onChange={e => setModuloId(e.target.value)}>
              <option value="">Sin módulo</option>
              {modulos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      {modo === 'crear' && nodoPadre && (
        <p className="text-xs text-[var(--text-secondary)] px-1">Esquema base pre-llenado desde &ldquo;{nodoPadre.nombre}&rdquo; — ajústalo antes de guardar.</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EditorFinanciero titulo="Costos" servicios={servicios} setServicios={setServicios} insumos={insumos} setInsumos={setInsumos} />
        <EditorMateriales titulo="Cálculo ambiental (obligatorio)" materiales={materiales} setMateriales={setMateriales} conEmpresa={(url: string) => url} />
      </div>

      <div className="sticky bottom-0 z-30 w-full bg-[var(--bg-primary)] py-3 px-4 flex items-center justify-center gap-3 mt-3">
        <div
          aria-hidden="true"
          className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-[var(--bg-primary)] to-transparent"
        />
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={btnSecundario}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={guardando} className={btnPrimario}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Panel de valores de ítem: estructura precargada del esquema base + extras propios ──

// Casilla del texto de ayuda de un concepto (material, servicio o insumo).
// Vacía = ese concepto no muestra tooltip en ninguna otra pantalla, que es
// justamente el comportamiento pedido: solo se ve donde hay contenido.
//
// Se guarda sola al salir del campo (onBlur), no espera al botón Guardar de
// la pantalla: el texto vive en su propia tabla compartida por nombre, no en
// la fila del material/servicio/insumo. `nombreOriginal` permite mudar el
// texto cuando el super_admin renombró el concepto en la misma edición
// (decisión del usuario: al renombrar, el texto se muda al nombre nuevo).
function CampoTooltip({ nombre, nombreOriginal, mapa, setMapa }: {
  nombre: string
  nombreOriginal?: string
  mapa: Record<string, string>
  setMapa: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  const clave = nombre.trim()
  const claveVieja = (nombreOriginal ?? '').trim()
  // Mientras no se haya escrito nada bajo el nombre nuevo, se muestra el
  // texto que traía el nombre viejo — así al renombrar no parece que la
  // explicación se hubiera borrado.
  const valor = mapa[clave] ?? (claveVieja && claveVieja !== clave ? mapa[claveVieja] ?? '' : '')
  const sinNombre = !clave

  async function guardar() {
    if (sinNombre) return
    await fetch('/api/cotizador/material-descripciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: clave,
        descripcion: valor,
        ...(claveVieja && claveVieja !== clave ? { nombre_anterior: claveVieja } : {}),
      }),
    }).catch(() => {})
  }

  return (
    <div>
      <label className={labelSt}>Tooltip (opcional)</label>
      <textarea
        value={valor}
        onChange={e => setMapa(prev => ({ ...prev, [clave]: e.target.value }))}
        onBlur={guardar}
        disabled={sinNombre}
        maxLength={500}
        rows={2}
        placeholder={sinNombre ? 'Escribe primero el nombre' : 'Explica qué es, para que quien cotiza no dude'}
        style={{ ...inputSt, resize: 'vertical', minHeight: 60, opacity: sinNombre ? 0.5 : 1 }}
      />
    </div>
  )
}

function PanelItemValores({ item, categoria, onGuardado, onCancelar }: {
  item: ItemConDimensiones | null
  categoria: CategoriaConEsquemaBase
  onGuardado: () => void
  onCancelar?: () => void
}) {
  const [nombre, setNombre] = useState(item?.nombre ?? '')
  const [factorRentabilidad, setFactorRentabilidad] = useState(String(item?.factor_rentabilidad ?? 2))
  // Textos de ayuda (tooltips) de materiales, servicios e insumos — esta
  // pantalla ("Editar ítem") es donde el super_admin realmente los escribe,
  // junto a cada concepto. El texto es compartido por nombre en toda la
  // plataforma, y solo se muestra en el resto del sistema si no está vacío.
  const [descripcionesMaterial, setDescripcionesMaterial] = useMaterialDescripcionesState((url: string) => url)

  const [pesos, setPesos] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const m of categoria.categoria_materiales_base) {
      const existente = item?.item_materiales.find(im => im.nombre === m.nombre)
      inicial[m.nombre] = existente ? String(existente.peso_kg) : ''
    }
    return inicial
  })
  const [precios, setPrecios] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const s of categoria.categoria_servicios_base) {
      const existente = item?.item_servicios.find(is => is.nombre === s.nombre)
      inicial[s.nombre] = existente ? String(existente.precio) : ''
    }
    return inicial
  })
  const [cantidades, setCantidades] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const ins of categoria.categoria_insumos_base) {
      const existente = item?.item_insumos.find(ii => ii.nombre === ins.nombre)
      inicial[ins.nombre] = existente ? String(existente.cantidad) : ''
    }
    return inicial
  })
  const [preciosUnitarios, setPreciosUnitarios] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const ins of categoria.categoria_insumos_base) {
      const existente = item?.item_insumos.find(ii => ii.nombre === ins.nombre)
      inicial[ins.nombre] = String(existente?.precio_unitario ?? ins.precio_unitario)
    }
    return inicial
  })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // La lista de materiales/servicios/insumos la manda SIEMPRE la categoría —
  // desde el ítem no se agrega ni se elimina ninguno, solo se ajusta cuánto
  // lleva este mueble de cada uno (dejarlo en 0 equivale a "no aplica aquí").
  // Decisión explícita del usuario: si se agrega o se quita, es para toda la
  // categoría, nunca para un solo ítem.
  const categoriaMaterialesBaseVisibles = categoria.categoria_materiales_base
  const categoriaServiciosBaseVisibles = categoria.categoria_servicios_base
  const categoriaInsumosBaseVisibles = categoria.categoria_insumos_base

  const totalCo2 = useMemo(() => {
    return categoriaMaterialesBaseVisibles.reduce((s, m) => s + (parseFloat(pesos[m.nombre]) || 0) * m.factor_co2_kg, 0)
  }, [pesos, categoriaMaterialesBaseVisibles])

  const totalAgua = useMemo(() => {
    return categoriaMaterialesBaseVisibles.reduce((s, m) => s + (parseFloat(pesos[m.nombre]) || 0) * (m.factor_agua_l_kg ?? 0), 0)
  }, [pesos, categoriaMaterialesBaseVisibles])

  const subtotal = useMemo(() => {
    const servBase = categoriaServiciosBaseVisibles.reduce((s, x) => s + (parseFloat(precios[x.nombre]) || 0), 0)
    const insBase = categoriaInsumosBaseVisibles.reduce((s, x) => s + (parseFloat(cantidades[x.nombre]) || 0) * (parseFloat(preciosUnitarios[x.nombre]) || 0), 0)
    return servBase + insBase
  }, [precios, cantidades, preciosUnitarios, categoriaServiciosBaseVisibles, categoriaInsumosBaseVisibles])

  const factor = parseFloat(factorRentabilidad) || 1
  const totalPrecio = subtotal * factor

  async function guardar() {
    // Solo se guardan los conceptos de la categoría con un valor > 0 en este
    // ítem — dejar uno en 0 es la forma de decir "este mueble no lo lleva",
    // sin sacarlo de la categoría.
    const materiales = categoriaMaterialesBaseVisibles
      .filter(m => parseFloat(pesos[m.nombre]) > 0)
      .map(m => ({ nombre: m.nombre, peso_kg: parseFloat(pesos[m.nombre]), factor_co2_kg: m.factor_co2_kg, origen_fuente: m.origen_fuente ?? undefined, detalle_fuente: m.detalle_fuente ?? undefined, nivel_confianza: 'baja' as const }))

    if (materiales.length === 0) {
      setError('Coloca el peso de al menos un material — el impacto ambiental no puede quedar en cero.')
      return
    }

    const servicios = categoriaServiciosBaseVisibles
      .filter(s => (parseFloat(precios[s.nombre]) || 0) > 0)
      .map(s => ({ nombre: s.nombre, precio: parseFloat(precios[s.nombre]) }))

    const insumos = categoriaInsumosBaseVisibles
      .filter(i => (parseFloat(cantidades[i.nombre]) || 0) > 0)
      .map(i => ({ nombre: i.nombre, cantidad: parseFloat(cantidades[i.nombre]), unidad: i.unidad, precio_unitario: parseFloat(preciosUnitarios[i.nombre]) || i.precio_unitario }))

    setGuardando(true); setError('')
    const url = item ? `/api/admin/items/${item.id}` : '/api/admin/items'
    const method = item ? 'PATCH' : 'POST'
    const body = item
      ? { nombre, factor_rentabilidad: factor, materiales, servicios, insumos }
      : { categoria_id: categoria.id, nombre, factor_rentabilidad: factor, materiales, servicios, insumos }

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar.')
      setGuardando(false)
      return
    }
    onGuardado()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-2xl p-4 ${cardBg}`}>
        <label className={labelSt}>Nombre del ítem</label>
        <input style={inputSt} placeholder="Ej: Mesa 4 puestos" value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus={!item} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Costos — estructura precargada, solo se llenan precios/cantidades */}
        <div className={`rounded-2xl p-4 ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-brand)]"><CircleDollarSign size={16} /> Costos</p>
            </div>

            <label className={labelSeccion}>Servicios</label>
            {categoriaServiciosBaseVisibles.length === 0 && (
              <p className="text-xs text-[var(--text-placeholder)] italic mb-2">Sin servicios asignados.</p>
            )}

            {categoriaServiciosBaseVisibles.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-2">
                {categoriaServiciosBaseVisibles.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <p className="flex-1 flex items-center gap-1 text-sm text-[var(--text-primary)]">
                      {s.nombre}
                      <TooltipEditable
                        nombre={s.nombre}
                        texto={descripcionesMaterial[s.nombre] ?? ''}
                        conEmpresa={(url: string) => url}
                        onGuardado={(nom, txt) => setDescripcionesMaterial(prev => ({ ...prev, [nom]: txt }))}
                      />
                    </p>
                    <div className="w-28 flex-shrink-0">
                      <InputPrecio value={precios[s.nombre] ?? ''} onChange={v => setPrecios(p => ({ ...p, [s.nombre]: v }))} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className={`${labelSeccion} mt-4`}>Insumos</label>
            {categoriaInsumosBaseVisibles.length === 0 && (
              <p className="text-xs text-[var(--text-placeholder)] italic mb-2">Sin insumos asignados.</p>
            )}

            {categoriaInsumosBaseVisibles.map(ins => (
              <div key={ins.id} className="flex items-center gap-2 mb-2">
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <p className="text-sm text-[var(--text-primary)]">{ins.nombre}</p>
                  <TooltipEditable
                    nombre={ins.nombre}
                    texto={descripcionesMaterial[ins.nombre] ?? ''}
                    conEmpresa={(url: string) => url}
                    onGuardado={(nom, txt) => setDescripcionesMaterial(prev => ({ ...prev, [nom]: txt }))}
                  />
                </div>
                <div className="w-24 flex-shrink-0">
                  <InputConUnidad value={cantidades[ins.nombre] ?? ''} onChange={v => setCantidades(c => ({ ...c, [ins.nombre]: v }))} unidad={ins.unidad} paso="0.01" />
                </div>
                <div className="w-28 flex-shrink-0">
                  <InputPrecio value={preciosUnitarios[ins.nombre] ?? ''} onChange={v => setPreciosUnitarios(p => ({ ...p, [ins.nombre]: v }))} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 flex flex-col gap-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span className="text-[var(--text-primary)] font-semibold text-right">{formatNumero(subtotal, { moneda: true })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Factor de rentabilidad</span>
              <div className="w-20">
                <div className="flex items-center gap-1 rounded-lg px-2" style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  <span className="text-xs text-[var(--text-secondary)]">x</span>
                  <input type="number" step="0.1" value={factorRentabilidad} onChange={e => setFactorRentabilidad(e.target.value)}
                    style={{ textAlign: 'right', padding: '8px 2px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">Total del ítem</span>
              <span className="text-base font-bold text-[var(--color-brand)] text-right">{formatNumero(totalPrecio, { moneda: true })}</span>
            </div>
          </div>
        </div>

        {/* Cálculo ambiental */}
        <div className={`rounded-2xl p-4 ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-brand)]"><Leaf size={16} /> Cálculo ambiental</p>
            </div>

            <label className={labelSeccion}>Materiales</label>
            {categoriaMaterialesBaseVisibles.length === 0 && (
              <p className="text-xs text-[var(--text-placeholder)] italic mb-2">Sin materiales asignados.</p>
            )}

            {categoriaMaterialesBaseVisibles.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-3">
                {categoriaMaterialesBaseVisibles.map(m => {
                  return (
                    <div key={m.id} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{m.nombre}</p>
                          <TooltipEditable
                            nombre={m.nombre}
                            texto={descripcionesMaterial[m.nombre] ?? ''}
                            conEmpresa={(url: string) => url}
                            onGuardado={(nom, nuevoTexto) => setDescripcionesMaterial(prev => ({ ...prev, [nom]: nuevoTexto }))}
                          />
                        </div>
                      </div>
                      <div className="w-28 flex-shrink-0">
                        <InputConUnidad value={pesos[m.nombre] ?? ''} onChange={v => setPesos(p => ({ ...p, [m.nombre]: v }))} unidad="kg" paso="0.01" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-[var(--text-secondary)] mt-2 mb-2">
              Para agregar, quitar o renombrar materiales, edita la categoría — el cambio aplica a todos sus ítems. Aquí deja en 0 lo que este mueble no lleve.
            </p>
          </div>

          <div className="mt-4 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">Total CO₂ eq evitado</span>
              <span className="text-sm font-bold text-[var(--color-brand)] text-right">{formatNumero(totalCo2, { unidad: 'kg CO₂ eq' })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--text-primary)]">Total agua evitada</span>
              <span className="text-sm font-bold text-[#59A6E4] text-right">{formatNumero(totalAgua, { unidad: 'L' })}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <div className="sticky bottom-0 z-30 w-full bg-[var(--bg-primary)] py-3 px-4 flex items-center justify-center gap-3 mt-3">
        <div
          aria-hidden="true"
          className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-[var(--bg-primary)] to-transparent"
        />
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={btnSecundario}>
            Cancelar
          </button>
        )}
        <button onClick={guardar} disabled={guardando} className={btnPrimario}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
