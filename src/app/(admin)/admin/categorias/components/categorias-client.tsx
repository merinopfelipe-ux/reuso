'use client'

import { useState, useTransition, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Lucide } from '@/components/ui/lucide-all'
import * as Phosphor from '@phosphor-icons/react'
import { ChevronRight as CaretRight, Plus, Power, Pencil, Copy, Folder, EllipsisVertical as DotsThree, Leaf, CircleDollarSign, Trash, Lock, LockOpen, Sparkles, Loader2, ExternalLink, BrushCleaning, Check, MagnifyingGlass, Square, SquareCheck } from '@/components/ui/icons'
import { SortTh } from '@/components/sort-th'
import type { SortState } from '@/lib/use-sortable'
import { Selector } from '@/components/ui/selector'
import { Button } from '@/components/ui/button'
import { Modal, ModalConfirmarSalida } from '@/components/ui/modal'
import { IconPicker } from '@/components/admin/icon-picker'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { CategoriaConEsquemaBase, ItemConDimensiones, Modulo } from '@/types'
import { formatNumero, formatCOP } from '@/lib/format'
import { TooltipInfo } from '@/components/ui/tooltip-info'

const cardBg = 'bg-(--bg-card) border border-(--border)'
const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const btnPrimario = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-brand text-(--text-on-brand) text-sm font-semibold hover-pop hover-press'
const btnSecundario = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-(--bg-card) border border-(--border) text-(--text-secondary) text-xs font-semibold shadow-2xs hover-pop hover-press cursor-pointer transition-all'
const btnChico = 'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-(--bg-card) border border-(--border) text-(--text-secondary) text-xs font-semibold shadow-2xs hover-pop hover-press cursor-pointer transition-all'
const labelSt = 'block text-xs font-semibold text-(--text-secondary) mb-1.5'
const labelSeccion = 'block text-xs font-bold text-(--text-primary) mb-2.5'

// ── Filas para los editores LIBRES (esquema base / extras: se puede añadir/quitar) ──
interface MaterialRow { id?: string; nombre: string; peso_kg: string; factor_co2_kg: string; factor_agua_l_kg: string; categoria_material: string; origen_fuente: string; detalle_fuente: string; rol_conservacion?: string }
interface ServicioRow { id?: string; nombre: string; precio: string }
interface InsumoRow { id?: string; nombre: string; cantidad: string; unidad: string; precio_unitario: string; peso_kg: string }

function nuevoIdFila(prefijo = 'row'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

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

const filaMaterial = (): MaterialRow => ({ id: nuevoIdFila('mat'), nombre: '', peso_kg: '', factor_co2_kg: '', factor_agua_l_kg: '', categoria_material: '', origen_fuente: '', detalle_fuente: '', rol_conservacion: 'se_conserva' })
const filaServicio = (): ServicioRow => ({ id: nuevoIdFila('serv'), nombre: '', precio: '' })
const filaInsumo = (): InsumoRow => ({ id: nuevoIdFila('ins'), nombre: '', cantidad: '', unidad: '', precio_unitario: '', peso_kg: '' })

function materialesAFilas(materiales: { id?: string; nombre: string; peso_kg: number; factor_co2_kg: number; factor_agua_l_kg: number | null; categoria_material?: string | null; origen_fuente: string | null; detalle_fuente: string | null; rol_conservacion?: string | null }[]): MaterialRow[] {
  return materiales.map(m => ({ id: m.id || nuevoIdFila('mat'), nombre: m.nombre, peso_kg: String(m.peso_kg), factor_co2_kg: String(m.factor_co2_kg), factor_agua_l_kg: m.factor_agua_l_kg != null ? String(m.factor_agua_l_kg) : '', categoria_material: m.categoria_material ?? '', origen_fuente: m.origen_fuente ?? '', detalle_fuente: m.detalle_fuente ?? '', rol_conservacion: m.rol_conservacion ?? '' }))
}
function serviciosAFilas(servicios: { id?: string; nombre: string; precio: number }[]): ServicioRow[] {
  return servicios.map(s => ({ id: s.id || nuevoIdFila('serv'), nombre: s.nombre, precio: String(s.precio) }))
}
function insumosAFilas(insumos: { id?: string; nombre: string; cantidad: number; unidad: string; precio_unitario: number; peso_kg?: number | null }[]): InsumoRow[] {
  return insumos.map(i => ({ id: i.id || nuevoIdFila('ins'), nombre: i.nombre, cantidad: String(i.cantidad), unidad: i.unidad, precio_unitario: String(i.precio_unitario), peso_kg: i.peso_kg != null ? String(i.peso_kg) : '' }))
}
function filasAMateriales(rows: MaterialRow[], pesoPorDefecto = 1) {
  return rows.filter(m => m.nombre && m.factor_co2_kg)
    .map(m => ({ nombre: m.nombre, peso_kg: parseFloat(m.peso_kg) || pesoPorDefecto, factor_co2_kg: parseFloat(m.factor_co2_kg), factor_agua_l_kg: m.factor_agua_l_kg ? parseFloat(m.factor_agua_l_kg) : undefined, categoria_material: m.categoria_material || undefined, origen_fuente: m.origen_fuente || undefined, detalle_fuente: m.detalle_fuente || undefined, nivel_confianza: 'baja' as const, rol_conservacion: m.rol_conservacion || undefined }))
}
function filasAServicios(rows: ServicioRow[]) {
  return rows
    .filter(s => s.nombre.trim() && s.precio.trim() !== '' && !isNaN(parseFloat(s.precio)))
    .map(s => ({ nombre: s.nombre.trim(), precio: parseFloat(s.precio) }))
}
function filasAInsumos(rows: InsumoRow[]) {
  return rows
    .filter(i => i.nombre.trim() && i.cantidad.trim() !== '' && !isNaN(parseFloat(i.cantidad)) && i.unidad.trim() && i.precio_unitario.trim() !== '' && !isNaN(parseFloat(i.precio_unitario)))
    .map(i => ({
      nombre: i.nombre.trim(),
      cantidad: parseFloat(i.cantidad),
      unidad: i.unidad.trim(),
      precio_unitario: parseFloat(i.precio_unitario),
      peso_kg: i.peso_kg ? parseFloat(i.peso_kg) : undefined,
    }))
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

export function normalizarBaseNombreItem(nombre: string): string {
  if (!nombre) return ''
  let s = nombre.toLowerCase().trim()
  const ciudades = [
    'medellin', 'medellín', 'bogota', 'bogotá', 'cali', 'barranquilla', 'cartagena',
    'bucaramanga', 'pereira', 'manizales', 'santa marta', 'cucuta', 'cúcuta', 'ibague', 'ibagué',
    'villavicencio', 'pasto', 'neiva', 'armenia', 'valledupar', 'monteria', 'montería',
    'sincelejo', 'popayan', 'popayán', 'tunja', 'riohacha', 'florencia', 'yopal', 'quibdo',
    'quibdó', 'inirida', 'inírida', 'mocoa', 'leticia', 'nacional', 'local'
  ]
  const ciudadesPattern = ciudades.join('|')
  
  // Quitar sufijos de precios: ej. " - $500.000", " $120.000 COP"
  s = s.replace(/\s*[-–—/]?\s*\$\s*[\d.,]+/gi, '')
  s = s.replace(/\s*[-–—/]?\s*[\d.,]+\s*(cop|pesos)\b/gi, '')
  // Quitar sufijo con guión, raya o barra con ciudad: ej. " - Medellín", " - Bogotá)"
  s = s.replace(new RegExp(`\\s*[-–—/]\\s*(${ciudadesPattern})(?=[^a-záéíóúüñ]|$)`, 'gi'), '')
  // Quitar ciudad entre paréntesis: ej. "(Medellín)", "(Bogotá)"
  s = s.replace(new RegExp(`\\s*\\((${ciudadesPattern})\\)\\s*`, 'gi'), ' ')
  // Quitar ciudad al final: ej. " Silla oficina Medellín"
  s = s.replace(new RegExp(`\\s+(${ciudadesPattern})\\s*\\)?$`, 'gi'), '')

  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buscarHermanoConPesos(
  nombreItem: string,
  itemIdActual: string | null | undefined,
  itemsCategoria: ItemConDimensiones[]
): ItemConDimensiones | null {
  const base = normalizarBaseNombreItem(nombreItem)
  if (!base) return null
  return itemsCategoria.find(h => {
    if (itemIdActual && h.id === itemIdActual) return false
    if (normalizarBaseNombreItem(h.nombre) !== base) return false
    return h.item_materiales && h.item_materiales.some(m => (m.peso_kg || 0) > 0)
  }) ?? null
}

import { extraerCiudadDeNombre, generarNombreDuplicadoCiudad } from '@/lib/ciudad-item'
export { extraerCiudadDeNombre, generarNombreDuplicadoCiudad }

import { InputPrecio, InputConUnidad, InputCantidadInsumo } from '@/components/ui/formatted-number-input'
import { parsearIcono } from '@/lib/icono-nombre'

// ── Menú de tres puntos (Editar / Duplicar / Desactivar) ───────────────────────

function MenuTresPuntos({
  activa,
  visibilidad,
  onEditar,
  onDuplicar,
  onToggleActiva,
  onToggleVisibilidad,
  onEliminar,
}: {
  activa: boolean
  visibilidad?: 'global' | 'restringido'
  onEditar: () => void
  onDuplicar?: () => void
  onToggleActiva: () => void
  onToggleVisibilidad?: () => void
  onEliminar?: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function fuera(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  return (
    <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button onClick={() => setAbierto(v => !v)} className="p-2 rounded-lg hover-pop hover-press" style={{ color: 'var(--color-brand)' }}>
        <DotsThree size={18} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-card overflow-hidden border border-(--border) bg-(--bg-card) shadow-lg">
          <button onClick={() => { setAbierto(false); onEditar() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-(--text-primary)">
            <Pencil size={14} /> Editar
          </button>
          {onDuplicar && (
            <button onClick={() => { setAbierto(false); onDuplicar() }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-(--text-primary)">
              <Copy size={14} /> Duplicar
            </button>
          )}
          <button onClick={() => { setAbierto(false); onToggleActiva() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-(--text-primary)">
            <Power size={14} /> {activa ? 'Desactivar' : 'Activar'}
          </button>
          {onToggleVisibilidad && (
            <button onClick={() => { setAbierto(false); onToggleVisibilidad() }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-(--text-primary)">
              {visibilidad === 'restringido' ? <><LockOpen size={14} /> Volver a global</> : <><Lock size={14} /> Restringir visibilidad</>}
            </button>
          )}
          {onEliminar && (
            <button onClick={() => { setAbierto(false); onEliminar() }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover-pop text-error">
              <Trash size={14} /> Eliminar
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
          className="w-full px-2.5 py-2 rounded-lg border border-(--border) bg-(--bg-input) text-xs text-(--text-primary) resize-none"
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
            className="text-xs font-semibold text-brand hover-pop"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => { setValor(texto); setEditando(false) }} className="text-xs text-(--text-secondary) hover-pop">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <TooltipInfo texto={texto} />
      <button type="button" onClick={() => setEditando(true)} title="Editar descripción" className="p-0.5 text-(--text-secondary) hover:text-brand hover-pop">
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

// Casilla del texto de ayuda de un concepto (material, servicio o insumo),
// para los formularios donde el nombre se escribe a mano. Vacía = ese
// concepto no muestra tooltip en ninguna otra pantalla, que es justamente el
// comportamiento pedido: solo se ve donde hay contenido.
//
// Se guarda sola al salir del campo (onBlur), no espera al botón Guardar de
// la pantalla: el texto vive en su propia tabla compartida por nombre, no en
// la fila del material/servicio/insumo.
function CampoTooltip({ nombre, mapa, setMapa }: {
  nombre: string
  mapa: Record<string, string>
  setMapa: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  const clave = nombre.trim()
  const sinNombre = !clave
  const valor = mapa[clave] ?? ''

  async function guardar() {
    if (sinNombre) return
    await fetch('/api/cotizador/material-descripciones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: clave, descripcion: valor }),
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
        rows={3}
        placeholder={sinNombre ? 'Escribe primero el nombre' : 'Explica qué es, para que quien cotiza no dude'}
        // `overflowY: auto` en vez del corte seco: los textos de referencia
        // pasan de 3 líneas y sin esto la última quedaba cortada a la mitad,
        // sin manera de verla salvo arrastrando la esquina del campo.
        style={{ ...inputSt, resize: 'vertical', minHeight: 76, overflowY: 'auto', lineHeight: 1.45, opacity: sinNombre ? 0.5 : 1 }}
      />
    </div>
  )
}

function EditorMateriales({ titulo, materiales, setMateriales, mostrarPeso, conEmpresa, categoriaNombre }: {
  titulo?: string
  materiales: MaterialRow[]
  setMateriales: React.Dispatch<React.SetStateAction<MaterialRow[]>>
  mostrarPeso?: boolean
  conEmpresa: (url: string) => string
  // Pista de búsqueda para "Sugerir con IA" — nunca cambia el resultado
  // cacheado, solo ayuda a desambiguar materiales genéricos entre categorías.
  categoriaNombre?: string
}) {
  const [descripcionesMaterial, setDescripcionesMaterial] = useMaterialDescripcionesState(conEmpresa)
  const [cargandoFactorIA, setCargandoFactorIA] = useState(false)
  const [discrepanciasFactor, setDiscrepanciasFactor] = useState<Record<string, {
    factor_co2_kg: number | null
    factor_agua_l_kg: number | null
    confianza: 'alta' | 'media' | 'baja' | null
    fuente_titulo: string | null
    fuente_url: string | null
  }>>({})

  async function sugerirFactoresConIA() {
    const validos = materiales.filter(m => m.nombre.trim())
    if (validos.length === 0) return
    setCargandoFactorIA(true)
    try {
      const res = await fetch('/api/admin/materiales/factor-sugerido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materiales: validos.map(m => ({
            nombre: m.nombre.trim(),
            factor_co2_kg_actual: m.factor_co2_kg.trim() ? parseFloat(m.factor_co2_kg) : null,
            factor_agua_l_kg_actual: m.factor_agua_l_kg.trim() ? parseFloat(m.factor_agua_l_kg) : null,
          })),
          categoria_nombre: categoriaNombre || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) return

      const nuevasDiscrepancias: typeof discrepanciasFactor = {}
      setMateriales(prev => prev.map(m => {
        const sugerido = data.materiales.find((s: { nombre: string }) => s.nombre === m.nombre.trim())
        if (!sugerido || sugerido.factor_co2_kg === null) return m

        const actual = parseFloat(m.factor_co2_kg)
        const vacio = !m.factor_co2_kg.trim() || isNaN(actual)
        if (vacio) {
          return {
            ...m,
            factor_co2_kg: String(sugerido.factor_co2_kg),
            factor_agua_l_kg: sugerido.factor_agua_l_kg != null ? String(sugerido.factor_agua_l_kg) : m.factor_agua_l_kg,
            origen_fuente: sugerido.fuente_titulo || m.origen_fuente,
            detalle_fuente: sugerido.fuente_url || m.detalle_fuente,
          }
        }

        const diferencia = Math.abs(sugerido.factor_co2_kg - actual) / actual
        if (diferencia > 0.10 && (sugerido.confianza === 'alta' || sugerido.confianza === 'media')) {
          nuevasDiscrepancias[m.nombre] = sugerido
        }
        return m
      }))
      setDiscrepanciasFactor(nuevasDiscrepancias)
    } finally {
      setCargandoFactorIA(false)
    }
  }

  function aplicarDiscrepancia(nombre: string) {
    const sugerido = discrepanciasFactor[nombre]
    if (!sugerido || sugerido.factor_co2_kg === null) return
    setMateriales(prev => prev.map(m => m.nombre === nombre ? {
      ...m,
      factor_co2_kg: String(sugerido.factor_co2_kg),
      factor_agua_l_kg: sugerido.factor_agua_l_kg != null ? String(sugerido.factor_agua_l_kg) : m.factor_agua_l_kg,
      origen_fuente: sugerido.fuente_titulo || m.origen_fuente,
      detalle_fuente: sugerido.fuente_url || m.detalle_fuente,
    } : m))
    setDiscrepanciasFactor(prev => {
      const resto = { ...prev }
      delete resto[nombre]
      return resto
    })
  }

  function descartarDiscrepancia(nombre: string) {
    setDiscrepanciasFactor(prev => {
      const resto = { ...prev }
      delete resto[nombre]
      return resto
    })
  }

  const content = (
    <>
      {titulo ? <p className="flex items-center gap-2 text-sm font-bold text-brand mb-3"><Leaf size={16} /> {titulo}</p> : null}
      <label className={labelSeccion}>Materiales</label>
      <div className="flex flex-col gap-3 mt-1">
        {materiales.map((m, i) => (
          <div key={i} className="flex flex-col gap-2 pb-3">
            <div className={`grid grid-cols-1 sm:grid-cols-${mostrarPeso ? '4' : '3'} gap-3`}>
              <div>
                <label className={labelSt}>Material</label>
                <input style={inputSt} placeholder="Ej: Madera dura" value={m.nombre} onChange={e => setMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
                {descripcionesMaterial[m.nombre] !== undefined && (
                  <div className="mt-1.5">
                    <TooltipEditable
                      nombre={m.nombre}
                      texto={descripcionesMaterial[m.nombre]}
                      conEmpresa={conEmpresa}
                      onGuardado={(nombre, nuevoTexto) => setDescripcionesMaterial(prev => ({ ...prev, [nombre]: nuevoTexto }))}
                    />
                  </div>
                )}
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
                <Selector style={{ ...inputSt, cursor: 'pointer' }} value={m.categoria_material} onChange={val => setMateriales(r => r.map((x, j) => j === i ? { ...x, categoria_material: val } : x))} opciones={CATEGORIAS_MATERIAL} />
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
            {discrepanciasFactor[m.nombre] && (
              <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'rgba(246,191,62,0.1)', border: '1px solid rgba(246,191,62,0.3)' }}>
                <p className="text-xs text-(--text-primary)">
                  La IA encontró un valor distinto: <strong>{discrepanciasFactor[m.nombre].factor_co2_kg} kg CO₂ eq/kg</strong>
                  {discrepanciasFactor[m.nombre].fuente_titulo ? ` según ${discrepanciasFactor[m.nombre].fuente_titulo}` : ''}. ¿Reemplazar el valor actual?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => descartarDiscrepancia(m.nombre)}>Descartar</Button>
                  <Button size="sm" variant="primary" onClick={() => aplicarDiscrepancia(m.nombre)}>Reemplazar</Button>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-1">
              <button type="button" onClick={() => setMateriales(r => r.filter((_, j) => j !== i))} className="flex items-center gap-1.5 text-xs font-bold text-error transition-opacity duration-200 hover:opacity-50">
                <Trash size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button type="button" onClick={() => setMateriales(r => [...r, filaMaterial()])} className={btnChico}><Plus size={12} /> Añadir material</button>
        <button
          type="button"
          onClick={sugerirFactoresConIA}
          disabled={cargandoFactorIA || materiales.every(m => !m.nombre.trim())}
          className={`${btnChico} disabled:opacity-40`}
          style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
        >
          {cargandoFactorIA ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Sugerir con IA
        </button>
      </div>
    </>
  )

  if (titulo) {
    return <div className={`rounded-2xl p-4 ${cardBg}`}>{content}</div>
  }
  return content
}

function BotonSugerirPeso({ nombre, unidad, endpoint, onSugerido, contextoItem }: {
  nombre: string
  unidad: string
  endpoint: string
  onSugerido: (pesoKg: number) => void
  contextoItem?: string
}) {
  const [cargando, setCargando] = useState(false)

  async function sugerir() {
    if (!nombre.trim()) return
    setCargando(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), unidad: unidad || 'unidad', contexto_item: contextoItem || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.ok) onSugerido(data.peso_kg)
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={sugerir}
      disabled={cargando || !nombre.trim()}
      title="Sugerir peso con IA"
      className="p-1.5 rounded-lg text-brand hover-pop hover-press disabled:opacity-40"
      style={{ background: 'var(--color-brand-light)' }}
    >
      <Sparkles size={14} sinAnimacion />
    </button>
  )
}

function BotonCompletarMaterialesIA({ nombreItem, categoriaNombre, materiales, onCompletado, cargando, setCargando }: {
  nombreItem: string
  categoriaNombre: string
  materiales: { nombre: string }[]
  onCompletado: (resultados: {
    nombre: string
    peso_kg: number | null
    rol: string | null
    confianza?: 'alta' | 'media' | 'baja' | null
    fuente_titulo?: string | null
    fuente_url?: string | null
  }[], proveedor?: string) => void
  cargando: boolean
  setCargando: (c: boolean) => void
}) {
  const [fase, setFase] = useState('')
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const deshabilitado = !nombreItem.trim() || materiales.length === 0

  useEffect(() => {
    if (!cargando) {
      setFase('')
      return
    }
    setFase('Buscando fichas técnicas en internet (Perplexity)...')
    const t1 = setTimeout(() => {
      setFase('Extrayendo especificaciones y densidades...')
    }, 4000)
    const t2 = setTimeout(() => {
      setFase('Calculando estimaciones de peso...')
    }, 8000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [cargando])

  async function completar() {
    if (deshabilitado || cargando) return
    setCargando(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/materiales/peso-sugerido-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_item: nombreItem.trim(),
          categoria_nombre: categoriaNombre,
          materiales: materiales.map(m => m.nombre),
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok && Array.isArray(data.materiales)) {
        onCompletado(
          data.materiales.map((m: {
            nombre: string
            peso_kg_estimado: number | null
            rol: string | null
            confianza?: 'alta' | 'media' | 'baja' | null
            fuente_titulo?: string | null
            fuente_url?: string | null
          }) => ({
            nombre: m.nombre,
            peso_kg: m.peso_kg_estimado,
            rol: m.rol ?? null,
            confianza: m.confianza ?? null,
            fuente_titulo: m.fuente_titulo ?? null,
            fuente_url: m.fuente_url ?? null,
          })),
          data.proveedor
        )
        setFeedback({
          tipo: 'success',
          texto: `Pesos y fuentes estimadas con éxito usando ${data.proveedor === 'perplexity' ? 'Perplexity' : data.proveedor === 'gemini' ? 'Gemini' : 'IA'}.`
        })
      } else {
        setFeedback({
          tipo: 'error',
          texto: data.error || 'No se pudieron estimar los pesos con IA. Ingrésalos manualmente.'
        })
      }
    } catch {
      setFeedback({
        tipo: 'error',
        texto: 'Error de conexión con el servicio de IA. Intenta de nuevo.'
      })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <button
        type="button"
        onClick={completar}
        disabled={cargando || deshabilitado}
        className={`${btnChico} w-full justify-center transition-all duration-200`}
        style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
      >
        {cargando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {cargando ? (fase || 'Estimando materiales con IA...') : 'Completar materiales con IA'}
      </button>

      {/* Feedback de estado contextual al terminar */}
      {feedback && !cargando && (
        <div
          className={`text-xs px-3 py-2 rounded-lg border flex items-center justify-between gap-2 ${
            feedback.tipo === 'success'
              ? 'bg-[#F0FBF7] text-brand '
              : 'bg-[#FFF4F3] text-error '
          }`}
        >
          <span>{feedback.texto}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function EditorFinanciero({ titulo, servicios, setServicios, insumos, setInsumos, mostrarAplicarExistentes, aplicarExistentes, setAplicarExistentes, categoriaNombre }: {
  titulo?: string
  servicios: ServicioRow[]; setServicios: React.Dispatch<React.SetStateAction<ServicioRow[]>>
  insumos: InsumoRow[]; setInsumos: React.Dispatch<React.SetStateAction<InsumoRow[]>>
  // Solo se pasa al editar una categoría existente — decisión por insumo,
  // nunca una casilla que aplique a todos los costos de una vez.
  mostrarAplicarExistentes?: boolean
  aplicarExistentes?: Record<string, boolean>
  setAplicarExistentes?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  // Pista de búsqueda para "Sugerir peso con IA" — nunca cambia el resultado
  // cacheado, solo ayuda a desambiguar productos genéricos (ver peso-insumo.ts).
  categoriaNombre?: string
}) {
  const content = (
    <>
      {titulo ? <p className="flex items-center gap-2 text-sm font-bold text-brand mb-3"><CircleDollarSign size={16} /> {titulo}</p> : null}

      <label className={labelSeccion}>Servicios</label>
      <div className="flex flex-col gap-2 mb-2">
        {servicios.map((s, i) => (
          <div key={i} className="grid grid-cols-[2fr_auto] gap-2 items-center">
            <input style={inputSt} placeholder="Servicio (ej: Pintor)" value={s.nombre} onChange={e => setServicios(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
            <button type="button" onClick={() => setServicios(r => r.filter((_, j) => j !== i))} className="p-1 text-error transition-opacity duration-200 hover:opacity-50" title="Eliminar"><Trash size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setServicios(r => [...r, filaServicio()])} className={btnChico}><Plus size={12} /> Añadir servicio</button>

      <label className={`${labelSeccion} mt-4`}>Insumos</label>
      <div className="flex flex-col gap-2 mb-2">
        {insumos.map((ins, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="grid grid-cols-2 sm:grid-cols-[1.1fr_0.7fr_0.7fr_0.9fr_auto_auto] gap-2 items-center">
              <input style={inputSt} placeholder="Insumo (ej: Tela)" value={ins.nombre} onChange={e => setInsumos(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
              <input style={inputSt} placeholder="Unidad (ej: metros)" value={ins.unidad} onChange={e => setInsumos(r => r.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))} />
              <InputConUnidad value={ins.peso_kg} onChange={v => setInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: v } : x))} unidad="kg" paso="0.001" />
              <InputPrecio value={ins.precio_unitario} onChange={v => setInsumos(r => r.map((x, j) => j === i ? { ...x, precio_unitario: v } : x))} />
              <BotonSugerirPeso nombre={ins.nombre} unidad={ins.unidad} endpoint="/api/admin/insumos/peso-sugerido" onSugerido={pesoKg => setInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: String(pesoKg) } : x))} contextoItem={categoriaNombre ? `categoría "${categoriaNombre}"` : undefined} />
              <button type="button" onClick={() => setInsumos(r => r.filter((_, j) => j !== i))} className="p-1 text-error transition-opacity duration-200 hover:opacity-50" title="Eliminar"><Trash size={16} /></button>
            </div>
            {mostrarAplicarExistentes && ins.nombre.trim() && (
              <label className="flex items-center gap-1.5 cursor-pointer pl-1">
                <input
                  type="checkbox"
                  checked={aplicarExistentes?.[ins.nombre] ?? false}
                  onChange={e => setAplicarExistentes?.(prev => ({ ...prev, [ins.nombre]: e.target.checked }))}
                  style={{ accentColor: 'var(--color-brand)' }}
                />
                <span className="text-[11px] font-semibold text-(--text-secondary)">Guardar global</span>
                <TooltipInfo texto="Al guardar, aplica el precio de este insumo también a los ítems que ya existen en esta categoría y sus subcategorías (cada uno guardó su propia copia, no se actualiza solo)." />
              </label>
            )}
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
  const [isPending, startTransition] = useTransition()
  const [targetLoading, setTargetLoading] = useState<string | null>(null)

  // La categoría y el ítem abiertos viven en la URL (?nodo=&item=): así la vista
  // actual es un link compartible con el equipo y sobrevive a un refresh/guardado.
  const nodoActualId = searchParams.get('nodo')
  const itemIdParam = searchParams.get('item')
  const [creandoItem, setCreandoItem] = useState(false)
  const [itemParaDuplicar, setItemParaDuplicar] = useState<ItemConDimensiones | null>(null)
  const [editandoId, setEditandoId] = useState<string | 'nuevo-raiz' | 'nuevo-hijo' | null>(null)
  const [mostrarConfirmarSalida, setMostrarConfirmarSalida] = useState(false)
  const [accionSalirPending, setAccionSalirPending] = useState<(() => void) | null>(null)

  function refrescar() { startTransition(() => router.refresh()) }

  function irANodo(id: string | null) {
    setTargetLoading(id ? 'nodo:' + id : 'back')
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) params.set('nodo', id); else params.delete('nodo')
      params.delete('item')
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  function abrirItem(id: string | null) {
    setTargetLoading(id ? 'item:' + id : 'back')
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) params.set('item', id); else params.delete('item')
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
    })
  }

  const nodoActual = categorias.find(c => c.id === nodoActualId) ?? null
  const hijos = hijosDe(categorias, nodoActualId)
  const itemsAqui = nodoActualId ? itemsDe(items, nodoActualId) : []
  const itemAbiertoId: string | 'nuevo' | null = creandoItem ? 'nuevo' : itemIdParam
  const itemAbierto = itemIdParam ? items.find(i => i.id === itemIdParam) ?? null : null

  // Filtros y orden canónico de la tabla de ítems (por defecto alfabético A-Z según Nombre)
  const [busquedaItem, setBusquedaItem] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [sortItems, setSortItems] = useState<SortState>({ col: 'nombre', dir: 'asc' })

  function toggleSortItems(col: string) {
    setSortItems(prev => {
      if (prev.col !== col) return { col, dir: 'asc' }
      if (prev.dir === 'asc') return { col, dir: 'desc' }
      return { col: 'nombre', dir: 'asc' }
    })
  }

  // Selección múltiple para borrado masivo
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [itemsAEliminar, setItemsAEliminar] = useState<ItemConDimensiones[] | null>(null)
  const [eliminandoItems, setEliminandoItems] = useState(false)
  const [errorEliminarItems, setErrorEliminarItems] = useState('')

  // Estado para eliminar categoría sin window.confirm
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<CategoriaConEsquemaBase | null>(null)
  const [eliminandoCategoria, setEliminandoCategoria] = useState(false)
  const [errorEliminarCategoria, setErrorEliminarCategoria] = useState('')

  useEffect(() => {
    setBusquedaItem('')
    setFiltroEstado('')
    setSortItems({ col: 'nombre', dir: 'asc' })
    setSeleccionados(new Set())
  }, [nodoActualId])

  const itemsConCalculos = useMemo(() => {
    return itemsAqui.map(it => {
      const factor = it.factor_rentabilidad || 1
      const precioTotal = (
        it.item_servicios.reduce((s, x) => s + x.precio, 0) +
        it.item_insumos.reduce((s, x) => s + x.cantidad * x.precio_unitario, 0)
      ) * factor
      const totalCo2 = it.item_materiales.reduce((s, x) => s + x.peso_kg * x.factor_co2_kg, 0)
      const ciudad = extraerCiudadDeNombre(it.nombre)
      return {
        ...it,
        precioTotal,
        totalCo2,
        ciudad,
      }
    })
  }, [itemsAqui])

  const itemsFiltrados = useMemo(() => {
    return itemsConCalculos.filter(it => {
      if (busquedaItem.trim()) {
        const q = busquedaItem.trim().toLowerCase()
        const coincideNombre = it.nombre.toLowerCase().includes(q)
        const coincideCiudad = it.ciudad ? it.ciudad.toLowerCase().includes(q) : false
        if (!coincideNombre && !coincideCiudad) return false
      }
      if (filtroEstado) {
        if (filtroEstado === 'activos' && it.activo === false) return false
        if (filtroEstado === 'inactivos' && it.activo !== false) return false
        if ((filtroEstado === 'con-perplexity' || filtroEstado === 'perplexity') && !esItemPerplexity(it)) return false
        if (filtroEstado === 'sin-perplexity' && esItemPerplexity(it)) return false
        if (filtroEstado === 'restringido' && it.visibilidad !== 'restringido') return false
      }
      return true
    })
  }, [itemsConCalculos, busquedaItem, filtroEstado])

  const itemsOrdenados = useMemo(() => {
    const col = sortItems.col || 'nombre'
    const dir = sortItems.dir || 'asc'
    return [...itemsFiltrados].sort((a, b) => {
      let cmp = 0
      if (col === 'nombre') {
        cmp = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      } else if (col === 'co2') {
        cmp = a.totalCo2 - b.totalCo2
      } else if (col === 'precio') {
        cmp = a.precioTotal - b.precioTotal
      }
      return dir === 'asc' ? cmp : -cmp
    })
  }, [itemsFiltrados, sortItems])

  const hayFiltrosItems = busquedaItem.trim() !== '' || filtroEstado !== ''

  const todasSeleccionadas = itemsOrdenados.length > 0 && itemsOrdenados.every(it => seleccionados.has(it.id))

  function toggleSeleccionado(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSeleccionarTodas() {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (todasSeleccionadas) {
        itemsOrdenados.forEach(it => next.delete(it.id))
      } else {
        itemsOrdenados.forEach(it => next.add(it.id))
      }
      return next
    })
  }

  async function ejecutarEliminarItems() {
    if (!itemsAEliminar || itemsAEliminar.length === 0) return
    setEliminandoItems(true)
    setErrorEliminarItems('')
    try {
      const respuestas = await Promise.all(
        itemsAEliminar.map(it => fetch(`/api/admin/items/${it.id}`, { method: 'DELETE' }))
      )
      const fallidos = respuestas.filter(r => !r.ok)
      if (fallidos.length > 0) {
        setErrorEliminarItems(`No se pudieron eliminar ${fallidos.length} ${fallidos.length === 1 ? 'ítem' : 'ítems'}. Es posible que estén en uso.`)
      } else {
        setSeleccionados(prev => {
          const next = new Set(prev)
          itemsAEliminar.forEach(it => next.delete(it.id))
          return next
        })
        setItemsAEliminar(null)
        refrescar()
      }
    } catch {
      setErrorEliminarItems('Hubo un problema de conexión al eliminar los ítems.')
    } finally {
      setEliminandoItems(false)
    }
  }

  async function ejecutarEliminarCategoria() {
    if (!categoriaAEliminar) return
    setEliminandoCategoria(true)
    setErrorEliminarCategoria('')
    try {
      const res = await fetch(`/api/admin/categorias/${categoriaAEliminar.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorEliminarCategoria(err.error || 'No se pudo eliminar la categoría (es posible que esté en uso).')
      } else {
        setCategoriaAEliminar(null)
        refrescar()
      }
    } catch {
      setErrorEliminarCategoria('Hubo un problema de conexión al eliminar la categoría.')
    } finally {
      setEliminandoCategoria(false)
    }
  }

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
      <AdminPageHeader 
        titulo={
          <span className="flex items-center gap-2">
            {titulo}
            {isPending && <Loader2 size={16} className="animate-spin text-brand opacity-70" />}
          </span>
        } 
        showBack 
        onBack={onBack} 
      />

      <ModalConfirmarSalida
        abierto={mostrarConfirmarSalida}
        onConfirmar={() => {
          setMostrarConfirmarSalida(false)
          if (accionSalirPending) accionSalirPending()
        }}
        onCancelar={() => setMostrarConfirmarSalida(false)}
      />

      {/* Modal de confirmación para eliminar ítems (individual o lote) */}
      <Modal
        abierto={!!itemsAEliminar && itemsAEliminar.length > 0}
        onClose={() => {
          if (!eliminandoItems) {
            setItemsAEliminar(null)
            setErrorEliminarItems('')
          }
        }}
        titulo={itemsAEliminar?.length === 1 ? '¿Eliminar ítem?' : '¿Eliminar ítems seleccionados?'}
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        textoConfirmar={eliminandoItems ? 'Eliminando...' : 'Eliminar'}
        textoCancelar="Cancelar"
        varianteConfirmar="error"
        onConfirmar={ejecutarEliminarItems}
      >
        <div className="space-y-2">
          {errorEliminarItems && (
            <p className="text-xs text-error font-medium p-2 rounded-lg bg-[rgba(255,94,75,0.1)]">
              {errorEliminarItems}
            </p>
          )}
          <p className="text-sm text-(--text-primary)">
            {itemsAEliminar?.length === 1 ? (
              <>Vas a eliminar el ítem <strong>{itemsAEliminar[0].nombre}</strong> de forma permanente.</>
            ) : (
              <>Vas a eliminar <strong>{itemsAEliminar?.length} ítems</strong> seleccionados de forma permanente.</>
            )}
          </p>
          <p className="text-xs text-(--text-secondary)">
            Esta acción no se puede deshacer y eliminará sus materiales, servicios e insumos asociados.
          </p>
        </div>
      </Modal>

      {/* Modal de confirmación para eliminar categoría */}
      <Modal
        abierto={!!categoriaAEliminar}
        onClose={() => {
          if (!eliminandoCategoria) {
            setCategoriaAEliminar(null)
            setErrorEliminarCategoria('')
          }
        }}
        titulo="¿Eliminar categoría?"
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        textoConfirmar={eliminandoCategoria ? 'Eliminando...' : 'Eliminar'}
        textoCancelar="Cancelar"
        varianteConfirmar="error"
        onConfirmar={ejecutarEliminarCategoria}
      >
        <div className="space-y-2">
          {errorEliminarCategoria && (
            <p className="text-xs text-error font-medium p-2 rounded-lg bg-[rgba(255,94,75,0.1)]">
              {errorEliminarCategoria}
            </p>
          )}
          <p className="text-sm text-(--text-primary)">
            Vas a eliminar la categoría <strong>{categoriaAEliminar?.nombre}</strong> de forma permanente. Todos sus ítems se perderán.
          </p>
          <p className="text-xs text-(--text-secondary)">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </Modal>

      {itemParaDuplicar && (
        <ModalDuplicarItemCiudad
          item={itemParaDuplicar}
          itemsCategoria={itemsAqui}
          onExito={() => {
            setItemParaDuplicar(null)
            refrescar()
          }}
          onCancelar={() => setItemParaDuplicar(null)}
        />
      )}

      {(itemAbiertoId === 'nuevo' || itemAbierto) && nodoActual ? (
        <PanelItemValores
          item={itemAbierto}
          categoria={nodoActual}
          itemsCategoria={itemsAqui}
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
                    className={`flex flex-col h-full p-4 rounded-xl cursor-pointer transition-colors hover-pop ${cardBg} ${isPending && targetLoading === 'nodo:' + h.id ? 'opacity-50 ring-2 ring-brand ring-offset-1' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      {isPending && targetLoading === 'nodo:' + h.id ? (
                        <Loader2 size={20} className="animate-spin text-brand" />
                      ) : (
                        <IconoDe nombre={h.icono_lucide} className="text-brand" size={20} bg />
                      )}
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
                          onEliminar={() => { setCategoriaAEliminar(h); setErrorEliminarCategoria('') }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-(--text-primary) leading-snug truncate mb-1" title={h.nombre}>{h.nombre}</p>
                    <p className="text-xs text-(--text-secondary) line-clamp-2 mb-4 flex-1" title={h.descripcion || ''}>
                      {h.descripcion || 'Mobiliario y activos circulares.'}
                    </p>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div>
                        <p className="text-[11px] text-(--text-secondary)">Ítems</p>
                        <p className="text-base font-bold text-(--text-primary)">{total}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
                        <CaretRight size={14} className="text-(--text-secondary)" />
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
              {/* Barra de herramientas con buscador y filtros del Sistema de Diseño */}
              <div className="flex items-center gap-3 w-full">
                {/* Buscador */}
                <div className="relative flex-1 max-w-sm min-w-[200px]">
                  <MagnifyingGlass
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-placeholder) pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Buscar ítems..."
                    value={busquedaItem}
                    onChange={e => setBusquedaItem(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-(--border) bg-(--bg-input) text-(--text-primary) outline-hidden focus:border-brand transition-colors box-border"
                  />
                </div>

                {/* Filtro por estado */}
                <div className="shrink-0">
                  <Selector
                    value={filtroEstado}
                    onChange={setFiltroEstado}
                    placeholder="Todos los estados"
                    tamano="md"
                    opciones={[
                      { value: '', label: 'Todos los estados' },
                      { value: 'activos', label: 'Activos' },
                      { value: 'inactivos', label: 'Inactivos' },
                      { value: 'con-perplexity', label: 'Con Perplexity AI' },
                      { value: 'sin-perplexity', label: 'Sin Perplexity AI' },
                      { value: 'restringido', label: 'Visibilidad restringida' },
                    ]}
                    className="w-auto min-w-[200px]"
                  />
                </div>

                {/* Limpiar filtros */}
                {hayFiltrosItems && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaItem('')
                      setFiltroEstado('')
                    }}
                    className="h-9 px-3 rounded-lg text-xs font-medium border border-(--border) bg-(--bg-card) text-(--text-secondary) hover:bg-(--bg-hover) transition-colors cursor-pointer shrink-0"
                  >
                    Limpiar
                  </button>
                )}

                {/* Contador y botón Nuevo ítem */}
                <div className="ml-auto flex items-center gap-3 shrink-0">
                  <span className="text-xs text-(--text-secondary) whitespace-nowrap">
                    {itemsOrdenados.length === itemsAqui.length
                      ? `${itemsAqui.length} ${itemsAqui.length === 1 ? 'ítem' : 'ítems'}`
                      : `${itemsOrdenados.length} de ${itemsAqui.length} ítems`}
                  </span>
                  <Button
                    onClick={() => setCreandoItem(true)}
                    icon={<Plus size={15} />}
                    size="md"
                  >
                    Nuevo ítem
                  </Button>
                </div>
              </div>

              {/* Barra de acción masiva de selección */}
              {seleccionados.size > 0 && (
                <div className="flex items-center justify-between rounded-btn border  bg-brand-light px-4 py-2.5">
                  <span className="text-xs font-semibold text-brand">
                    {seleccionados.size} {seleccionados.size === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSeleccionados(new Set())}
                      className="text-xs font-medium px-2.5 py-1 text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                    >
                      Deseleccionar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItemsAEliminar(itemsAqui.filter(it => seleccionados.has(it.id)))
                        setErrorEliminarItems('')
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-(--bg-card) border border-(--border) text-error transition-opacity duration-200 hover:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <Trash size={14} sinAnimacion /> Eliminar
                    </button>
                  </div>
                </div>
              )}

              {/* Tabla Canónica del Sistema de Diseño con SortTh y Zebra */}
              <div className="rounded-card border border-(--border) bg-(--bg-card) overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-(--bg-table-header) text-brand">
                        <th className="px-3 py-2.5 w-10 text-center">
                          <button
                            type="button"
                            onClick={toggleSeleccionarTodas}
                            className="inline-flex items-center justify-center cursor-pointer"
                            title={todasSeleccionadas ? 'Deseleccionar todos' : 'Seleccionar todos'}
                          >
                            {todasSeleccionadas
                              ? <SquareCheck size={18} className="text-brand" sinAnimacion />
                              : <Square size={18} className="text-(--text-secondary) opacity-60 hover:opacity-100 transition-opacity" sinAnimacion />}
                          </button>
                        </th>
                        <SortTh col="nombre" sort={sortItems} onToggle={toggleSortItems}>
                          Nombre
                        </SortTh>
                        <SortTh col="co2" sort={sortItems} onToggle={toggleSortItems} align="right">
                          CO₂
                        </SortTh>
                        <SortTh col="precio" sort={sortItems} onToggle={toggleSortItems} align="right">
                          Precio
                        </SortTh>
                        <th className="px-4 py-2.5 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {itemsOrdenados.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-xs text-(--text-secondary)"
                          >
                            {itemsAqui.length === 0
                              ? 'No hay ítems registrados en esta categoría.'
                              : 'No se encontraron ítems con los filtros aplicados.'}
                          </td>
                        </tr>
                      )}
                      {itemsOrdenados.map((it, idx) => (
                        <tr
                          key={it.id}
                          className={`transition-colors duration-150 cursor-pointer hover:bg-(--bg-table-hover) ${
                            idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                          }`}
                          style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                          onClick={() => abrirItem(it.id)}
                        >
                          <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleSeleccionado(it.id)}
                              className="inline-flex items-center justify-center cursor-pointer"
                              title={seleccionados.has(it.id) ? 'Deseleccionar ítem' : 'Seleccionar ítem'}
                            >
                              {seleccionados.has(it.id)
                                ? <SquareCheck size={18} className="text-brand" sinAnimacion />
                                : <Square size={18} className="text-(--text-secondary) opacity-50 hover:opacity-100 transition-opacity" sinAnimacion />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-(--text-primary)">
                            <span className={`inline-flex items-center gap-1.5 font-medium ${isPending && targetLoading === 'item:' + it.id ? 'opacity-50' : ''}`}>
                              {it.visibilidad === 'restringido' && <Lock size={12} className="text-brand shrink-0" />}
                              {isPending && targetLoading === 'item:' + it.id && <Loader2 size={12} className="animate-spin text-brand shrink-0" />}
                              {it.nombre}
                              {esItemPerplexity(it) && <BadgePerplexity />}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-(--text-primary) whitespace-nowrap">
                            {formatNumero(it.totalCo2, { unidad: 'kg CO₂ eq' })}
                          </td>
                          <td className="px-4 py-3 text-right text-(--text-primary) whitespace-nowrap">
                            {formatCOP(it.precioTotal)}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <MenuTresPuntos
                              activa={it.activo !== false}
                              visibilidad={it.visibilidad ?? 'global'}
                              onEditar={() => abrirItem(it.id)}
                              onDuplicar={() => setItemParaDuplicar(it)}
                              onToggleActiva={async () => {
                                await fetch(`/api/admin/items/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: it.activo === false }) })
                                refrescar()
                              }}
                              onToggleVisibilidad={async () => {
                                const nueva = it.visibilidad === 'restringido' ? 'global' : 'restringido'
                                await fetch(`/api/admin/items/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibilidad: nueva }) })
                                refrescar()
                              }}
                              onEliminar={() => {
                                setItemsAEliminar([it])
                                setErrorEliminarItems('')
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
function IconoDe({ nombre, size = 18, className, bg }: { nombre: string; size?: number; className?: string; bg?: boolean }) {
  // Import estático de lucide-react/phosphor (ya los carga IconPicker en esta
  // misma página) — un import() dinámico aquí generaba un chunk <facade>
  // frágil en Turbopack que se rompía con cualquier HMR ("module factory is
  // not available"), error real y repetible, no un problema de pestaña vieja.
  const { libreria, nombre: nombreIcono } = parsearIcono(nombre || '')
  const excluido = nombreIcono === 'Icon' || nombreIcono === 'DynamicIcon' || nombreIcono === 'IconNode' || nombreIcono === 'IconBase' || nombreIcono === 'IconContext'
  const Comp = (nombreIcono && !excluido)
    ? (libreria === 'phosphor'
        ? (Phosphor as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; weight?: string; strokeWidth?: number }>>)[nombreIcono]
        : (Lucide as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; weight?: string; strokeWidth?: number }>>)[nombreIcono])
    : null
  const propsLibreria = libreria === 'phosphor' ? { weight: 'regular' } : { strokeWidth: 1.3 }
  const contenido = Comp ? <Comp size={size} className={className} {...propsLibreria} /> : <Folder size={size} className={className} strokeWidth={1.3} />
  if (!bg) return contenido
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-brand-light)' }}>
      {contenido}
    </div>
  )
}

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
  // Decisión por insumo, en la misma página, sin modal aparte: cada insumo
  // tiene su propia casilla "Guardar global" — solo los marcados aplican su
  // precio a los ítems que ya existen en esta categoría y sus subcategorías
  // (cada uno guarda su propia copia del precio, así que un cambio en la
  // matriz no les llega solo — ver /api/admin/categorias/[id]/aplicar-precios-insumos).
  const [aplicarExistentesPorInsumo, setAplicarExistentesPorInsumo] = useState<Record<string, boolean>>({})

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
    const insumosValidos = filasAInsumos(insumos)
    const body = {
      nombre, icono_lucide: iconoLucide,
      descripcion: descripcion || (modo === 'crear' ? undefined : null),
      ...(modo === 'crear' ? { parent_id: parentId ?? undefined, modulo_id: moduloId || undefined } : { modulo_id: moduloId || null }),
      materiales_base: materialesValidos,
      servicios_base: filasAServicios(servicios),
      insumos_base: insumosValidos,
    }
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar.')
      setGuardando(false)
      return
    }

    if (modo === 'editar' && nodo) {
      const cambios = insumosValidos
        .filter(i => aplicarExistentesPorInsumo[i.nombre])
        .map(i => ({ nombre: i.nombre, precio_unitario: i.precio_unitario }))
      if (cambios.length > 0) {
        await fetch(`/api/admin/categorias/${nodo.id}/aplicar-precios-insumos`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cambios }),
        }).catch(() => {})
      }
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
          <div className="flex justify-between items-center mb-1">
            <label className={labelSt}>Descripción (máx. 140 caracteres)</label>
            <span className="text-[11px] text-(--text-secondary)">{descripcion.length}/140</span>
          </div>
          <input
            style={inputSt}
            maxLength={140}
            placeholder="Ej: Muebles de comedor y activos circulares"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value.replace(/\r?\n|\r/g, ' '))}
          />
        </div>
        {modo === 'crear' && !parentId && (
          <div>
            <label className={labelSt}>Módulo (opcional)</label>
            <Selector style={inputSt} value={moduloId} onChange={val => setModuloId(val)} placeholder="Sin módulo" opciones={[{value: '', label: 'Sin módulo'}, ...modulos.map(m => ({ value: m.id, label: m.nombre }))]} />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {modo === 'crear' && nodoPadre && (
        <p className="text-xs text-(--text-secondary) px-1">Esquema base pre-llenado desde &ldquo;{nodoPadre.nombre}&rdquo; — ajústalo antes de guardar.</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EditorFinanciero
          titulo="Costos"
          servicios={servicios} setServicios={setServicios}
          insumos={insumos} setInsumos={setInsumos}
          mostrarAplicarExistentes={modo === 'editar'}
          aplicarExistentes={aplicarExistentesPorInsumo}
          setAplicarExistentes={setAplicarExistentesPorInsumo}
          categoriaNombre={nombre || nodoPadre?.nombre || undefined}
        />
        <EditorMateriales titulo="Cálculo ambiental (obligatorio)" materiales={materiales} setMateriales={setMateriales} conEmpresa={(url: string) => url} categoriaNombre={nombre || nodoPadre?.nombre || undefined} />
      </div>

      <div className="sticky bottom-0 z-30 w-full bg-(--bg-primary) py-3 px-4 flex items-center justify-center gap-3 mt-3">
        <div
          aria-hidden="true"
          className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-linear-to-t/srgb from-(--bg-primary) to-transparent"
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

// Badge informativo del rol de un material frente a la acción de
// Badge interactivo del rol de un material frente a la acción de restauración.
// Permite alternar entre "Se conserva" y "Se reemplaza" con un clic, o definirlo si está pendiente.
function BadgeRolConservacion({
  rol,
  peso,
  onCambiar,
}: {
  rol?: string
  peso?: string | number
  onCambiar?: (nuevoRol: string) => void
}) {
  const pesoNum = typeof peso === 'number' ? peso : parseFloat(String(peso ?? ''))
  // Si el resultado es 0 o no está asignado, no hay necesidad de colocar esta info
  if (isNaN(pesoNum) || pesoNum <= 0) {
    return null
  }

  // Únicamente existen dos estados posibles: "Se conserva" o "Se reemplaza" (sin un tercer estado)
  const esReemplaza = rol === 'se_reemplaza' || rol === 'residuo'
  const esConserva = !esReemplaza

  function handleToggle() {
    if (!onCambiar) return
    onCambiar(esReemplaza ? 'se_conserva' : 'se_reemplaza')
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title="Haz clic para alternar entre 'Se conserva' y 'Se reemplaza'"
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 select-none shadow-2xs transition-transform active:scale-95 cursor-pointer border ${
        esConserva
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          : 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-200'
      }`}
    >
      <span>{esConserva ? 'Se conserva' : 'Se reemplaza'}</span>
      <span className="text-[9px] opacity-60">⇄</span>
    </button>
  )
}

// Ícono oficial de Perplexity AI (isotipo vectorial idéntico al oficial)
export function IconoPerplexity({ className = '', size = 13 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z" />
    </svg>
  )
}

// Logo de Perplexity para marcar ítems enriquecidos con IA (limpio, sin caja ni texto redundante)
export function BadgePerplexity({ title = 'Estimado con Perplexity AI' }: { title?: string; compacto?: boolean }) {
  return (
    <span
      className="inline-flex items-center text-[#00827C] dark:text-[#2DD4BF] hover:opacity-80 transition-opacity shrink-0 cursor-default"
      title={title}
    >
      <IconoPerplexity size={14} className="shrink-0" />
    </span>
  )
}

export function esItemPerplexity(it: ItemConDimensiones | null | undefined): boolean {
  if (!it) return false

  // 1. Si el ítem directamente tiene origen_fuente 'perplexity' o 'openrouter'
  const origItem = (it.origen_fuente || '').toLowerCase()
  if (origItem.includes('perplexity') || origItem.includes('openrouter')) {
    return true
  }

  // 2. Si el detalle_fuente tiene proveedor perplexity o materiales con info de Perplexity
  if (it.detalle_fuente) {
    try {
      const parsed = JSON.parse(it.detalle_fuente)
      if (parsed && typeof parsed === 'object') {
        const prov = String(parsed.proveedor || '').toLowerCase()
        if (prov.includes('perplexity') || prov.includes('openrouter')) {
          return true
        }
        const matsInfo = parsed.materiales_info as Record<string, InfoFuenteMaterial> | undefined
        if (matsInfo && typeof matsInfo === 'object') {
          const tieneFuenteReal = Object.values(matsInfo).some(f => esFuentePerplexity(f))
          if (tieneFuenteReal) return true
        }
      }
    } catch {
      // Texto plano
      const det = it.detalle_fuente.toLowerCase()
      if (det.includes('perplexity') && !det.includes('factor interno') && !det.includes('provisional')) {
        return true
      }
    }
  }

  // 3. Verificar si alguno de sus materiales tiene fuente técnica de Perplexity
  const tieneMatPerplexity = it.item_materiales?.some(m => {
    if (!m.origen_fuente && !m.detalle_fuente) return false
    const det = (m.detalle_fuente || '').toLowerCase()
    if (det.includes('factor interno') || det.includes('interno') || det.includes('provisional')) return false
    if (m.origen_fuente && m.origen_fuente.startsWith('http')) return true
    const orig = (m.origen_fuente || '').toLowerCase()
    if (orig.includes('perplexity') || orig.includes('openrouter')) {
      return true
    }
    return false
  }) ?? false

  return tieneMatPerplexity
}

// Determina si una fuente proviene realmente de Perplexity y no de una estimación interna/provisional
export function esFuentePerplexity(info?: InfoFuenteMaterial | null): info is InfoFuenteMaterial {
  if (!info) return false
  const titulo = (info.fuente_titulo || '').trim().toLowerCase()
  const prov = (info.proveedor || '').toLowerCase()

  // Si es fuente interna o provisional, NUNCA es Perplexity
  if (titulo.includes('factor interno') || titulo.includes('interno') || titulo.includes('provisional')) {
    return false
  }

  // Si el proveedor explícitamente es Perplexity o OpenRouter y tiene razonamiento o URL
  if (prov.includes('perplexity') || prov.includes('openrouter')) {
    return Boolean(info.fuente_url || (info.fuente_titulo && info.fuente_titulo.trim().length > 10))
  }

  // Debe tener una URL real de internet o un título técnico sustancial de IA
  const tieneUrlReal = Boolean(info.fuente_url && info.fuente_url.startsWith('http'))
  const tieneTituloTecnico = Boolean(
    info.fuente_titulo &&
    info.fuente_titulo.trim().length > 15 &&
    (titulo.includes('estimación razonada') || titulo.includes('densidad') || titulo.includes('fuente'))
  )

  return tieneUrlReal || tieneTituloTecnico
}

// Extrae roles de conservación guardados en el JSON de detalle_fuente como respaldo infalible
function extraerRolesRespaldo(detalleFuente?: string | null): Record<string, string> {
  if (!detalleFuente) return {}
  try {
    const parsed = JSON.parse(detalleFuente)
    if (parsed && typeof parsed.roles === 'object' && parsed.roles !== null) {
      return parsed.roles as Record<string, string>
    }
  } catch {
    // Si no es JSON, es texto plano
  }
  return {}
}

export interface InfoFuenteMaterial {
  confianza?: 'alta' | 'media' | 'baja' | null
  fuente_titulo?: string | null
  fuente_url?: string | null
  proveedor?: string | null
}

// Popover flotante contextual de Perplexity AI, anclado directamente al botón.
// Sin backdrop que oscurezca la pantalla, con legibilidad perfecta día/noche y cierre click-outside / Escape.
function BotonInfoPerplexity({
  info,
  nombreMaterial,
  peso,
}: {
  info?: InfoFuenteMaterial
  nombreMaterial: string
  peso?: string | number
}) {
  const [abierto, setAbierto] = useState(false)
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const [montado, setMontado] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMontado(true)
  }, [])

  const posicionar = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return
    const rect = triggerRef.current.getBoundingClientRect()
    const ancho = Math.min(340, window.innerWidth - 24)
    let left = rect.left - 12
    if (left + ancho > window.innerWidth - 12) {
      left = window.innerWidth - ancho - 12
    }
    if (left < 12) left = 12

    const espacioAbajo = window.innerHeight - rect.bottom
    const preferirAbajo = espacioAbajo >= 200 || rect.top < 200

    if (preferirAbajo) {
      setCoords({ top: rect.bottom + 6, left })
    } else {
      setCoords({ bottom: window.innerHeight - rect.top + 6, left })
    }
  }, [])

  function alternar() {
    if (!abierto) posicionar()
    setAbierto(v => !v)
  }

  useEffect(() => {
    if (!abierto) return
    function onClickAfuera(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (popoverRef.current?.contains(e.target as Node)) return
      setAbierto(false)
    }
    function onScroll(e: Event) {
      if (popoverRef.current?.contains(e.target as Node)) return
      posicionar()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('mousedown', onClickAfuera)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', posicionar)
    return () => {
      document.removeEventListener('mousedown', onClickAfuera)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', posicionar)
    }
  }, [abierto, posicionar])

  // Regla: si el resultado es 0 o está vacío, no hay necesidad de decir o colocar esta info
  const pesoNum = typeof peso === 'number' ? peso : parseFloat(String(peso ?? ''))
  if (isNaN(pesoNum) || pesoNum <= 0) return null

  // Regla: si no se consultó Perplexity y es fuente interna, no poner logo ni desplegar nada
  if (!esFuentePerplexity(info)) return null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={alternar}
        className={`inline-flex items-center justify-center p-0.5 text-[#00827C] dark:text-[#2DD4BF] hover:text-[#0891b2] dark:hover:text-[#5eead4] transition-all shrink-0 cursor-pointer ${
          abierto ? 'scale-115 opacity-100' : 'opacity-85 hover:opacity-100 hover:scale-110 active:scale-95'
        }`}
        title="Ver especificaciones y fuentes técnicas de Perplexity"
      >
        <IconoPerplexity size={13} />
      </button>

      {abierto && montado && coords && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-9999 rounded-xl border border-(--border) bg-(--bg-card) p-3.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-(--text-primary)"
          style={{
            width: Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 24 : 340),
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
          }}
        >
          {/* Cabecera compacta del popover */}
          <div className="flex items-center justify-between pb-2 border-b border-(--border)">
            <div className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-sm flex items-center justify-center text-[#00827C] dark:text-[#2DD4BF]"
                style={{ background: 'rgba(45, 212, 191, 0.14)' }}
              >
                <IconoPerplexity size={11} />
              </span>
              <span className="text-xs font-bold tracking-tight text-(--text-primary)">
                Perplexity AI
              </span>
            </div>

            <div className="flex items-center gap-2">
              {info.confianza && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                    info.confianza === 'alta'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : info.confianza === 'media'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-200'
                        : 'bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Confianza {info.confianza}
                </span>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="w-5 h-5 rounded-sm flex items-center justify-center text-(--text-placeholder) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors cursor-pointer text-xs"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Contenido contextual */}
          <div className="pt-2 flex flex-col gap-2">
            <p className="text-xs font-bold text-(--text-primary) leading-tight">
              {nombreMaterial}
            </p>

            {info.fuente_titulo && (
              <p className="text-xs text-(--text-secondary) leading-relaxed italic bg-(--bg-input) p-2.5 rounded-lg border border-(--border)">
                «{info.fuente_titulo}»
              </p>
            )}

            {info.fuente_url && (
              <a
                href={info.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00827C] dark:text-[#2DD4BF] hover:underline pt-0.5 transition-colors"
              >
                <span>Consultar fuente web original</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Modal de confirmación cuando el usuario intenta modificar manualmente el peso de un material estimado por Perplexity
function ModalConfirmacionAjustePerplexity({
  nombreMaterial,
  pesoOriginal,
  nuevoPeso,
  onConfirmar,
  onCancelar,
}: {
  nombreMaterial: string
  pesoOriginal: string
  nuevoPeso: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar()
      if (e.key === 'Enter') onConfirmar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancelar, onConfirmar])

  if (!montado || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onCancelar()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-(--border) bg-(--bg-card) p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-(--text-primary)"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-(--border) mb-4">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#00827C] dark:text-[#2DD4BF]"
            style={{ background: 'rgba(45, 212, 191, 0.14)' }}
          >
            <IconoPerplexity size={18} />
          </span>
          <div>
            <h3 className="text-base font-bold leading-tight text-(--text-primary)">
              ¿Ajustar peso estimado por IA?
            </h3>
            <p className="text-xs text-(--text-secondary)">
              {nombreMaterial}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-(--text-secondary) leading-relaxed mb-6">
          <p>
            El peso de este material (<strong className="text-(--text-primary)">{pesoOriginal} kg</strong>) fue calculado con <strong>Perplexity AI</strong>.
          </p>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
            Si ajustas este número a <strong className="font-bold">{nuevoPeso} kg</strong>, se eliminará la referencia de Perplexity <strong>únicamente de {nombreMaterial}</strong>.
          </div>
          <p className="text-xs text-(--text-placeholder)">
            Los demás materiales conservarán intactas sus fuentes, justificaciones técnicas y vínculos con Perplexity.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-(--border) hover:bg-(--bg-hover) text-(--text-secondary) transition-all cursor-pointer"
          >
            Cancelar (mantener {pesoOriginal} kg)
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:opacity-90 transition-all shadow-2xs cursor-pointer"
          >
            Ajustar solo este número
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const CIUDADES_COLOMBIA_COMUNES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Manizales',
  'Santa Marta',
  'Cúcuta',
  'Ibagué',
]

function ModalDuplicarItemCiudad({
  item,
  itemsCategoria = [],
  onExito,
  onCancelar,
}: {
  item: ItemConDimensiones
  itemsCategoria?: ItemConDimensiones[]
  onExito: () => void
  onCancelar: () => void
}) {
  const [montado, setMontado] = useState(false)
  const ciudadActual = useMemo(() => extraerCiudadDeNombre(item.nombre), [item.nombre])
  const [ciudadNueva, setCiudadNueva] = useState('')
  const [nombreNuevo, setNombreNuevo] = useState(() => item.nombre)
  const [nombreModificadoManualmente, setNombreModificadoManualmente] = useState(false)
  const [duplicando, setDuplicando] = useState(false)
  const [error, setError] = useState('')

  const itemExistenteConMismoNombre = useMemo(() => {
    const limp = nombreNuevo.trim().toLowerCase()
    if (!limp) return null
    return itemsCategoria.find(
      it => it.id !== item.id && it.nombre.trim().toLowerCase() === limp
    ) ?? null
  }, [nombreNuevo, itemsCategoria, item.id])

  useEffect(() => {
    setMontado(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !duplicando) onCancelar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancelar, duplicando])

  const aplicarCiudad = (ciudad: string, manual = false) => {
    setCiudadNueva(ciudad)
    if (!manual) {
      setNombreModificadoManualmente(false)
      setNombreNuevo(generarNombreDuplicadoCiudad(item.nombre, ciudad))
    } else if (!nombreModificadoManualmente) {
      setNombreNuevo(generarNombreDuplicadoCiudad(item.nombre, ciudad))
    }
  }

  async function handleDuplicar() {
    const nombreFinal = nombreNuevo.trim()
    if (!nombreFinal) {
      setError('Por favor ingresa un nombre para el ítem duplicado.')
      return
    }

    const materialesConPeso = (item.item_materiales || []).filter(m => (m.peso_kg || 0) > 0)
    if (materialesConPeso.length === 0) {
      setError('El ítem original no tiene materiales con peso configurado. Configura el ítem de origen para poder duplicarlo a otra ciudad.')
      return
    }

    setDuplicando(true)
    setError('')

    try {
      const materialesPayload = materialesConPeso.map(m => ({
        nombre: m.nombre,
        peso_kg: m.peso_kg,
        factor_co2_kg: m.factor_co2_kg || 0,
        factor_agua_l_kg: m.factor_agua_l_kg ?? undefined,
        categoria_material: m.categoria_material || undefined,
        origen_fuente: m.origen_fuente || undefined,
        detalle_fuente: m.detalle_fuente || undefined,
        nivel_confianza: (m.nivel_confianza || 'baja') as 'alta' | 'media' | 'baja',
        rol_conservacion: (m.rol_conservacion || 'se_conserva') as 'se_conserva' | 'se_reemplaza' | 'desconocido',
      }))

      if (itemExistenteConMismoNombre) {
        const patchPayload = {
          materiales: materialesPayload,
          origen_fuente: item.origen_fuente ?? null,
          detalle_fuente: item.detalle_fuente ?? null,
        }
        const res = await fetch(`/api/admin/items/${itemExistenteConMismoNombre.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'No se pudo actualizar el ítem existente.')
        }
      } else {
        const payload = {
          categoria_id: item.categoria_id,
          nombre: nombreFinal,
          factor_rentabilidad: item.factor_rentabilidad ?? 2,
          activo: item.activo !== false,
          visibilidad: item.visibilidad ?? 'global',
          origen_fuente: item.origen_fuente ?? null,
          detalle_fuente: item.detalle_fuente ?? null,
          materiales: materialesPayload,
          servicios: (item.item_servicios || []).map(s => ({
            nombre: s.nombre,
            precio: s.precio || 0,
          })),
          insumos: (item.item_insumos || []).map(i => ({
            nombre: i.nombre,
            cantidad: i.cantidad || 0,
            unidad: i.unidad || 'unidad',
            precio_unitario: i.precio_unitario || 0,
            peso_kg: i.peso_kg ?? undefined,
          })),
        }

        const res = await fetch('/api/admin/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'No se pudo duplicar el ítem.')
        }
      }

      onExito()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado al duplicar.')
      setDuplicando(false)
    }
  }

  if (!montado || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget && !duplicando) onCancelar()
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-(--border) bg-(--bg-card) p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-(--text-primary) flex flex-col gap-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-(--border)">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-brand"
            style={{ background: 'rgba(0, 130, 124, 0.12)' }}
          >
            <Copy size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-tight text-(--text-primary)">
              Duplicar ítem por ciudad
            </h3>
            <p className="text-xs text-(--text-secondary) truncate">
              Origen: <strong className="text-(--text-primary)">{item.nombre}</strong>
              {ciudadActual && <span> ({ciudadActual})</span>}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-error">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
              Ciudad de destino
            </label>
            <input
              type="text"
              value={ciudadNueva}
              onChange={e => aplicarCiudad(e.target.value, true)}
              placeholder="Ej: Bogotá, Medellín, Cali..."
              style={inputSt}
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CIUDADES_COLOMBIA_COMUNES.map(c => {
                const esActiva = ciudadNueva.trim().toLowerCase() === c.toLowerCase()
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => aplicarCiudad(c, false)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                      esActiva
                        ? 'bg-brand text-white border-transparent font-bold'
                        : 'bg-(--bg-input) border-(--border) text-(--text-secondary) hover:border-brand'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
              Nombre para el nuevo ítem
            </label>
            <input
              type="text"
              value={nombreNuevo}
              onChange={e => {
                setNombreNuevo(e.target.value)
                setNombreModificadoManualmente(true)
              }}
              style={inputSt}
            />
            <p className="text-[11px] text-(--text-placeholder) mt-1">
              Se ajusta automáticamente con la ciudad seleccionada y puedes editarlo si deseas
            </p>
          </div>

          {itemExistenteConMismoNombre && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed">
              <Sparkles size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                Ya existe el ítem <strong>{itemExistenteConMismoNombre.nombre}</strong> en el catálogo. Al confirmar, se actualizarán sus materiales y fuentes de Perplexity para que sea idéntico al de origen, sin crear un duplicado repetido.
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-[#00827C] dark:text-[#2DD4BF] flex items-start gap-2.5 leading-relaxed">
            <Sparkles size={16} className="shrink-0 mt-0.5" />
            <div>
              Se duplican todos los materiales, pesos y datos técnicos idénticos sin consultar a Perplexity, ahorrando tokens. Los servicios y precios quedan listos para ajustar según la ciudad.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border)">
          <button
            type="button"
            onClick={onCancelar}
            disabled={duplicando}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-(--border) hover:bg-(--bg-hover) text-(--text-secondary) transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDuplicar}
            disabled={duplicando}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:opacity-90 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {duplicando ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {itemExistenteConMismoNombre ? 'Actualizando...' : 'Duplicando...'}
              </>
            ) : (
              <>
                <Copy size={14} />
                {itemExistenteConMismoNombre ? 'Actualizar ítem existente' : 'Duplicar ítem'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Panel de valores de ítem: estructura precargada del esquema base + extras propios ──

function PanelItemValores({ item, categoria, itemsCategoria = [], onGuardado, onCancelar }: {
  item: ItemConDimensiones | null
  categoria: CategoriaConEsquemaBase
  itemsCategoria?: ItemConDimensiones[]
  onGuardado: () => void
  onCancelar?: () => void
}) {
  const fuenteInicial = item
  const [nombre, setNombre] = useState(item?.nombre ?? '')
  const [factorRentabilidad, setFactorRentabilidad] = useState(String(item?.factor_rentabilidad ?? 2))
  const [origenFuente, setOrigenFuente] = useState<string>(() => {
    if (esItemPerplexity(item)) return 'perplexity'
    return item?.origen_fuente ?? ''
  })
  // Textos de ayuda de los materiales base — esta pantalla ("Editar ítem")
  // es donde el super_admin realmente los edita, junto a cada material de
  // la lista, no solo en el editor del esquema base de la categoría.
  const [descripcionesMaterial, setDescripcionesMaterial] = useMaterialDescripcionesState((url: string) => url)

  const [pesos, setPesos] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const m of categoria.categoria_materiales_base) {
      const existente = item?.item_materiales.find(im => im.nombre === m.nombre)
      inicial[m.nombre] = existente ? String(existente.peso_kg) : ''
    }
    return inicial
  })
  // Rol frente a la acción de restauración del título (se_conserva/
  // se_reemplaza/desconocido) — lee de la columna nativa item_materiales
  // o del respaldo en JSON detalle_fuente para que nunca se pierda.
  const [rolesConservacion, setRolesConservacion] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    const rolesResp = extraerRolesRespaldo(item?.detalle_fuente)
    for (const m of categoria.categoria_materiales_base) {
      const mNorm = m.nombre.trim().toLowerCase()
      const existente = item?.item_materiales.find(im => im.nombre.trim().toLowerCase() === mNorm)
      const rolRaw = existente?.rol_conservacion || rolesResp[m.nombre] || rolesResp[mNorm]
      const rolEncontrado = rolRaw === 'se_reemplaza' || rolRaw === 'residuo' ? 'se_reemplaza' : 'se_conserva'
      inicial[m.nombre] = rolEncontrado
    }
    return inicial
  })

  // Información técnica detallada (razonamiento, fuente_url, confianza) devuelta por Perplexity
  const [fuentesMaterial, setFuentesMaterial] = useState<Record<string, InfoFuenteMaterial>>(() => {
    const inicial: Record<string, InfoFuenteMaterial> = {}
    for (const im of item?.item_materiales ?? []) {
      const mNorm = im.nombre.trim().toLowerCase()
      if (im.detalle_fuente || im.origen_fuente || im.nivel_confianza) {
        const info: InfoFuenteMaterial = {
          confianza: im.nivel_confianza as 'alta' | 'media' | 'baja',
          fuente_titulo: im.detalle_fuente,
          fuente_url: im.origen_fuente?.startsWith('http') ? im.origen_fuente : null,
          proveedor: im.origen_fuente,
        }
        inicial[im.nombre] = info
        inicial[mNorm] = info
      }
    }
    if (item?.detalle_fuente) {
      try {
        const parsed = JSON.parse(item.detalle_fuente)
        if (parsed?.materiales_info && typeof parsed.materiales_info === 'object') {
          for (const [k, v] of Object.entries(parsed.materiales_info as Record<string, InfoFuenteMaterial>)) {
            inicial[k] = { ...inicial[k], ...v }
            inicial[k.trim().toLowerCase()] = { ...inicial[k], ...v }
          }
        }
      } catch {}
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
  // La cantidad de un insumo (cuánto se usó) solo tiene sentido al armar una
  // cotización puntual — en el catálogo (aquí) un insumo es solo nombre +
  // unidad + precio de referencia, cantidad siempre 1 al guardar, oculta.
  const [preciosUnitarios, setPreciosUnitarios] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const ins of categoria.categoria_insumos_base) {
      const existente = item?.item_insumos.find(ii => ii.nombre === ins.nombre)
      inicial[ins.nombre] = String(existente?.precio_unitario ?? ins.precio_unitario)
    }
    return inicial
  })
  const [pesosInsumo, setPesosInsumo] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const ins of categoria.categoria_insumos_base) {
      const existente = item?.item_insumos.find(ii => ii.nombre === ins.nombre)
      const valor = existente?.peso_kg ?? ins.peso_kg
      inicial[ins.nombre] = valor != null ? String(valor) : ''
    }
    return inicial
  })

  const [cantidades, setCantidades] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const ins of categoria.categoria_insumos_base) {
      const existente = item?.item_insumos.find(ii => ii.nombre === ins.nombre)
      // Nunca heredar ins.cantidad del esquema base: ese valor es siempre 1,
      // un placeholder sin sentido real (la cantidad del catálogo no se
      // edita, ver EditorFinanciero). Bug real: un ítem que nunca guardó
      // este insumo terminaba sumando su costo con 1 metro implícito, sin
      // que nadie lo hubiera elegido para ese ítem puntual. Mismo criterio
      // que ya usan los materiales (pesos) más abajo: vacío si no existe.
      inicial[ins.nombre] = existente ? String(existente.cantidad) : ''
    }
    return inicial
  })

  // Extras: dimensiones que solo aplican a ESTE ítem, no se guardan en el esquema base.
  const nombresBase = useMemo(() => new Set(categoria.categoria_materiales_base.map(m => m.nombre)), [categoria])
  const nombresServBase = useMemo(() => new Set(categoria.categoria_servicios_base.map(s => s.nombre)), [categoria])
  const nombresInsBase = useMemo(() => new Set(categoria.categoria_insumos_base.map(i => i.nombre)), [categoria])
  const [extraMateriales, setExtraMateriales] = useState<MaterialRow[]>(() => {
    const rolesResp = extraerRolesRespaldo(fuenteInicial?.detalle_fuente)
    const extras = (fuenteInicial?.item_materiales ?? []).filter(m => !nombresBase.has(m.nombre))
    return extras.map(m => {
      const mNorm = m.nombre.trim().toLowerCase()
      const rolRaw = m.rol_conservacion || rolesResp[m.nombre] || rolesResp[mNorm]
      const rol = rolRaw === 'se_reemplaza' || rolRaw === 'residuo' ? 'se_reemplaza' : 'se_conserva'
      return {
        id: (m as { id?: string }).id || nuevoIdFila('mat-extra'),
        nombre: m.nombre,
        peso_kg: String(m.peso_kg),
        factor_co2_kg: String(m.factor_co2_kg),
        factor_agua_l_kg: m.factor_agua_l_kg != null ? String(m.factor_agua_l_kg) : '',
        categoria_material: m.categoria_material ?? '',
        origen_fuente: m.origen_fuente ?? '',
        detalle_fuente: m.detalle_fuente ?? '',
        rol_conservacion: rol,
      }
    })
  })
  const [extraServicios, setExtraServicios] = useState<ServicioRow[]>(
    serviciosAFilas((item?.item_servicios ?? []).filter(s => !nombresServBase.has(s.nombre)))
  )
  const [extraInsumos, setExtraInsumos] = useState<InsumoRow[]>(
    insumosAFilas((item?.item_insumos ?? []).filter(i => !nombresInsBase.has(i.nombre)))
  )

  const [serviciosEliminados, setServiciosEliminados] = useState<Set<string>>(new Set())
  const [insumosEliminados, setInsumosEliminados] = useState<Set<string>>(new Set())
  const [materialesEliminados, setMaterialesEliminados] = useState<Set<string>>(new Set())

  // Copia editable del esquema ambiental de la CATEGORÍA (nombre y factores
  // de cada material). El peso sí es de este ítem, pero el nombre, el factor
  // de CO2 y el de agua pertenecen a la categoría: cambiarlos aquí los
  // cambia para todos sus ítems, que es justamente lo pedido ("todos deben
  // tener por categoría el mismo sistema de cálculo ambiental").
  const [esquemaMat, setEsquemaMat] = useState(() => categoria.categoria_materiales_base.map(m => ({
    id: m.id,
    nombre: m.nombre,
    peso_kg: String(m.peso_kg),
    factor_co2_kg: String(m.factor_co2_kg),
    factor_agua_l_kg: m.factor_agua_l_kg != null ? String(m.factor_agua_l_kg) : '',
    categoria_material: m.categoria_material ?? '',
    origen_fuente: m.origen_fuente ?? '',
    detalle_fuente: m.detalle_fuente ?? '',
  })))

  // Mismo criterio para el esquema financiero de la categoría: el nombre del
  // servicio/insumo (y la unidad del insumo) son de la categoría; el precio y
  // la cantidad son de este ítem.
  const [esquemaServ, setEsquemaServ] = useState(() => categoria.categoria_servicios_base.map(s => ({
    id: s.id, nombre: s.nombre, precio: String(s.precio ?? 0),
  })))
  const [esquemaIns, setEsquemaIns] = useState(() => categoria.categoria_insumos_base.map(i => ({
    id: i.id, nombre: i.nombre, unidad: i.unidad, precio_unitario: String(i.precio_unitario), peso_kg: i.peso_kg ?? null,
  })))

  // Id de la fila cuyo detalle está desplegado. La lista se ve compacta
  // (nombre + peso/precio + acciones) y solo la fila que se está editando
  // muestra el formulario completo, para no convertir la pantalla en un
  // muro de campos.
  const [filaAbierta, setFilaAbierta] = useState<string | null>(null)
  const alternarFila = (id: string) => setFilaAbierta(prev => (prev === id ? null : id))

  function moverClave(setter: React.Dispatch<React.SetStateAction<Record<string, string>>>, viejo: string, nuevo: string) {
    setter(p => {
      const { [viejo]: valor, ...resto } = p
      return { ...resto, [nuevo]: valor ?? '' }
    })
  }

  function editarEsquemaServ(id: string, nombre: string) {
    setEsquemaServ(prev => prev.map(x => {
      if (x.id !== id) return x
      if (nombre !== x.nombre) moverClave(setPrecios, x.nombre, nombre)
      return { ...x, nombre }
    }))
  }

  function editarEsquemaIns(id: string, patch: Partial<{ nombre: string; unidad: string }>) {
    setEsquemaIns(prev => prev.map(x => {
      if (x.id !== id) return x
      if (patch.nombre !== undefined && patch.nombre !== x.nombre) {
        moverClave(setPreciosUnitarios, x.nombre, patch.nombre)
        moverClave(setCantidades, x.nombre, patch.nombre)
        moverClave(setPesosInsumo, x.nombre, patch.nombre)
      }
      return { ...x, ...patch }
    }))
  }

  function editarEsquemaMat(id: string, patch: Partial<{ nombre: string; factor_co2_kg: string; factor_agua_l_kg: string }>) {
    setEsquemaMat(prev => prev.map(x => {
      if (x.id !== id) return x
      // Al renombrar, el peso que el vendedor ya escribió para este ítem se
      // mueve a la clave nueva: `pesos` se indexa por nombre.
      if (patch.nombre !== undefined && patch.nombre !== x.nombre) {
        setPesos(p => {
          const { [x.nombre]: valor, ...resto } = p
          return { ...resto, [patch.nombre as string]: valor ?? '' }
        })
      }
      return { ...x, ...patch }
    }))
  }

  function limpiarTodosMateriales() {
    setPesos(prev => {
      const nuevo: Record<string, string> = { ...prev }
      for (const m of esquemaMat) {
        nuevo[m.nombre] = '0'
      }
      return nuevo
    })
    setExtraMateriales(prev => prev.map(m => ({ ...m, peso_kg: '0' })))
    setFuentesMaterial({})
    setOrigenFuente('')
  }

  // Pesos originales devueltos por Perplexity para detectar si el usuario editó el número
  const [pesosOriginalesIA, setPesosOriginalesIA] = useState<Record<string, string>>(() => {
    const orig: Record<string, string> = {}
    for (const im of fuenteInicial?.item_materiales ?? []) {
      const info = fuentesMaterial[im.nombre] || fuentesMaterial[im.nombre.trim().toLowerCase()]
      if (esFuentePerplexity(info) && im.peso_kg > 0) {
        orig[im.nombre] = String(im.peso_kg)
        orig[im.nombre.trim().toLowerCase()] = String(im.peso_kg)
      }
    }
    if (fuenteInicial?.detalle_fuente) {
      try {
        const parsed = JSON.parse(fuenteInicial.detalle_fuente)
        const mats = parsed?.materiales_info as Record<string, InfoFuenteMaterial> | undefined
        if (mats) {
          for (const [k, v] of Object.entries(mats)) {
            if (esFuentePerplexity(v)) {
              const im = fuenteInicial?.item_materiales.find(m => m.nombre.trim().toLowerCase() === k.trim().toLowerCase())
              if (im && im.peso_kg > 0) {
                orig[k] = String(im.peso_kg)
                orig[k.trim().toLowerCase()] = String(im.peso_kg)
              }
            }
          }
        }
      } catch {}
    }
    return orig
  })

  // Conjunto de materiales cuyo peso fue ajustado manualmente por el usuario
  const [materialesAjustadosManualmente, setMaterialesAjustadosManualmente] = useState<Set<string>>(new Set())

  // Estado del popup de confirmación de ajuste de peso estimado
  const [popupAjuste, setPopupAjuste] = useState<{
    nombre: string
    pesoOriginal: string
    nuevoPeso: string
    esExtra?: boolean
    indexExtra?: number
  } | null>(null)

  function verificarAjustePeso(nombre: string, nuevoValor: string, esExtra?: boolean, indexExtra?: number) {
    const k = nombre.trim().toLowerCase()
    if (!k || materialesAjustadosManualmente.has(k)) return
    const pesoOrig = pesosOriginalesIA[nombre] || pesosOriginalesIA[k]
    if (!pesoOrig) return

    const pOrigNum = parseFloat(pesoOrig) || 0
    const pNuevoNum = parseFloat(nuevoValor) || 0

    // Si el número efectivamente cambió respecto al estimado por IA
    if (pOrigNum > 0 && pNuevoNum !== pOrigNum && nuevoValor.trim() !== pesoOrig.trim()) {
      setPopupAjuste({
        nombre,
        pesoOriginal: pesoOrig,
        nuevoPeso: nuevoValor,
        esExtra,
        indexExtra,
      })
    }
  }

  function confirmarDesvinculacionPerplexity() {
    if (!popupAjuste) return
    const { nombre } = popupAjuste
    const k = nombre.trim().toLowerCase()

    // Marca este material como ajustado manualmente
    setMaterialesAjustadosManualmente(prev => new Set(prev).add(k))

    // Elimina la referencia de Perplexity SOLO de este material
    setFuentesMaterial(prev => {
      const copia = { ...prev }
      delete copia[nombre]
      delete copia[k]
      return copia
    })

    setPopupAjuste(null)
  }

  function cancelarDesvinculacionPerplexity() {
    if (!popupAjuste) return
    const { nombre, pesoOriginal, esExtra, indexExtra } = popupAjuste

    // Restaura el peso original de Perplexity en el formulario
    if (esExtra && typeof indexExtra === 'number') {
      setExtraMateriales(r => r.map((x, j) => j === indexExtra ? { ...x, peso_kg: pesoOriginal } : x))
    } else {
      setPesos(p => ({ ...p, [nombre]: pesoOriginal }))
    }

    setPopupAjuste(null)
  }

  const hermanoConPesos = useMemo(() => {
    return buscarHermanoConPesos(nombre, item?.id, itemsCategoria)
  }, [nombre, item?.id, itemsCategoria])

  function copiarPesosDeHermano(hermano: ItemConDimensiones) {
    if (!hermano.item_materiales || hermano.item_materiales.length === 0) return
    const nuevosPesos: Record<string, string> = { ...pesos }
    const nuevosRoles: Record<string, string> = { ...rolesConservacion }
    const nuevasFuentes: Record<string, InfoFuenteMaterial> = { ...fuentesMaterial }
    const nuevosOrigIA: Record<string, string> = { ...pesosOriginalesIA }
    const nuevosExtras: MaterialRow[] = []

    const rolesResp = extraerRolesRespaldo(hermano.detalle_fuente)
    let infoHermano: Record<string, InfoFuenteMaterial> = {}
    if (hermano.detalle_fuente) {
      try {
        const parsed = JSON.parse(hermano.detalle_fuente)
        if (parsed?.materiales_info) infoHermano = parsed.materiales_info
      } catch {}
    }

    for (const im of hermano.item_materiales) {
      const imNorm = im.nombre.trim().toLowerCase()
      const pStr = im.peso_kg != null && im.peso_kg > 0 ? String(im.peso_kg) : ''
      const matchEsquema = esquemaMatVisibles.find(m => m.nombre.trim().toLowerCase() === imNorm)
      const rolRaw = im.rol_conservacion || rolesResp[im.nombre] || rolesResp[imNorm]
      const rol = rolRaw === 'se_reemplaza' || rolRaw === 'residuo' ? 'se_reemplaza' : 'se_conserva'
      const infoFuente: InfoFuenteMaterial = infoHermano[im.nombre] || infoHermano[imNorm] || {
        confianza: im.nivel_confianza as 'alta' | 'media' | 'baja',
        fuente_titulo: im.detalle_fuente,
        fuente_url: im.origen_fuente?.startsWith('http') ? im.origen_fuente : null,
        proveedor: im.origen_fuente,
      }

      if (matchEsquema) {
        nuevosPesos[matchEsquema.nombre] = pStr
        nuevosRoles[matchEsquema.nombre] = rol
        nuevasFuentes[matchEsquema.nombre] = infoFuente
        nuevasFuentes[imNorm] = infoFuente
        if (im.peso_kg && esFuentePerplexity(infoFuente)) {
          nuevosOrigIA[matchEsquema.nombre] = pStr
          nuevosOrigIA[imNorm] = pStr
        }
      } else {
        nuevosExtras.push({
          id: nuevoIdFila('mat-extra'),
          nombre: im.nombre,
          peso_kg: pStr,
          factor_co2_kg: String(im.factor_co2_kg || 0),
          factor_agua_l_kg: im.factor_agua_l_kg != null ? String(im.factor_agua_l_kg) : '',
          categoria_material: im.categoria_material ?? '',
          origen_fuente: im.origen_fuente ?? '',
          detalle_fuente: im.detalle_fuente ?? '',
          rol_conservacion: rol,
        })
        nuevasFuentes[im.nombre] = infoFuente
        nuevasFuentes[imNorm] = infoFuente
        if (im.peso_kg && esFuentePerplexity(infoFuente)) {
          nuevosOrigIA[im.nombre] = pStr
          nuevosOrigIA[imNorm] = pStr
        }
      }
    }

    setPesos(nuevosPesos)
    setRolesConservacion(nuevosRoles)
    setFuentesMaterial(nuevasFuentes)
    setPesosOriginalesIA(nuevosOrigIA)
    if (nuevosExtras.length > 0) setExtraMateriales(nuevosExtras)
    if (hermano.origen_fuente) setOrigenFuente(hermano.origen_fuente)
  }

  const [guardando, setGuardando] = useState(false)
  const [mensajeGuardando, setMensajeGuardando] = useState('')
  const [error, setError] = useState('')
  const [cargandoMaterialesIA, setCargandoMaterialesIA] = useState(false)
  const [cargandoFactorExtra, setCargandoFactorExtra] = useState<Record<string, boolean>>({})

  async function sugerirFactorMaterialExtra(idFila: string, nombreMat: string) {
    if (!nombreMat.trim()) return
    setCargandoFactorExtra(prev => ({ ...prev, [idFila]: true }))
    try {
      const res = await fetch('/api/admin/materiales/factor-sugerido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materiales: [{ nombre: nombreMat.trim(), factor_co2_kg_actual: null, factor_agua_l_kg_actual: null }],
          categoria_nombre: categoria.nombre,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok && Array.isArray(data.materiales) && data.materiales[0]?.factor_co2_kg != null) {
        const sugerido = data.materiales[0]
        setExtraMateriales(prev => prev.map(m => (m.id === idFila || m.nombre.trim().toLowerCase() === nombreMat.trim().toLowerCase()) ? {
          ...m,
          factor_co2_kg: String(sugerido.factor_co2_kg),
          factor_agua_l_kg: sugerido.factor_agua_l_kg != null ? String(sugerido.factor_agua_l_kg) : m.factor_agua_l_kg,
          origen_fuente: sugerido.fuente_url || sugerido.fuente_titulo || m.origen_fuente,
          detalle_fuente: sugerido.fuente_titulo || m.detalle_fuente,
        } : m))
      }
    } catch {
      // Si falla la red no bloquea al usuario
    } finally {
      setCargandoFactorExtra(prev => ({ ...prev, [idFila]: false }))
    }
  }

  const extraMaterialesValidos = useMemo(() => filasAMateriales(extraMateriales), [extraMateriales])
  const extraServiciosValidos = useMemo(() => filasAServicios(extraServicios), [extraServicios])
  const extraInsumosValidos = useMemo(() => filasAInsumos(extraInsumos), [extraInsumos])

  // Filas del esquema de la categoría que este ítem sigue mostrando (los
  // eliminados se marcan por id, no por nombre, porque el nombre es editable).
  const esquemaMatVisibles = useMemo(() => {
    return esquemaMat.filter(m => !materialesEliminados.has(m.id))
  }, [esquemaMat, materialesEliminados])

  const esquemaServVisibles = useMemo(() => {
    return esquemaServ.filter(s => !serviciosEliminados.has(s.id))
  }, [esquemaServ, serviciosEliminados])

  const esquemaInsVisibles = useMemo(() => {
    return esquemaIns.filter(i => !insumosEliminados.has(i.id))
  }, [esquemaIns, insumosEliminados])

  const totalCo2 = useMemo(() => {
    const base = esquemaMatVisibles.reduce((s, m) => {
      const rol = rolesConservacion[m.nombre] === 'residuo' ? 'se_reemplaza' : (rolesConservacion[m.nombre] || 'se_conserva')
      if (rol === 'se_reemplaza') return s
      return s + (parseFloat(pesos[m.nombre]) || 0) * (parseFloat(m.factor_co2_kg) || 0)
    }, 0)
    const extra = extraMaterialesValidos.reduce((s, m) => {
      const rol = m.rol_conservacion || 'se_conserva'
      if (rol === 'se_reemplaza') return s
      return s + m.peso_kg * m.factor_co2_kg
    }, 0)
    return base + extra
  }, [pesos, esquemaMatVisibles, extraMaterialesValidos, rolesConservacion])

  const totalAgua = useMemo(() => {
    const base = esquemaMatVisibles.reduce((s, m) => {
      const rol = rolesConservacion[m.nombre] === 'residuo' ? 'se_reemplaza' : (rolesConservacion[m.nombre] || 'se_conserva')
      if (rol === 'se_reemplaza') return s
      return s + (parseFloat(pesos[m.nombre]) || 0) * (parseFloat(m.factor_agua_l_kg) || 0)
    }, 0)
    const extra = extraMaterialesValidos.reduce((s, m) => {
      const rol = m.rol_conservacion || 'se_conserva'
      if (rol === 'se_reemplaza') return s
      return s + m.peso_kg * (m.factor_agua_l_kg ?? 0)
    }, 0)
    return base + extra
  }, [pesos, esquemaMatVisibles, extraMaterialesValidos, rolesConservacion])

  const subtotal = useMemo(() => {
    const servBase = esquemaServVisibles.reduce((s, x) => s + (parseFloat(precios[x.nombre]) || 0), 0)
    const insBase = esquemaInsVisibles.reduce((s, x) => s + (parseFloat(cantidades[x.nombre]) || 0) * (parseFloat(preciosUnitarios[x.nombre]) || 0), 0)
    const servExtra = extraServiciosValidos.reduce((s, x) => s + x.precio, 0)
    const insExtra = extraInsumosValidos.reduce((s, x) => s + x.cantidad * x.precio_unitario, 0)
    return servBase + insBase + servExtra + insExtra
  }, [precios, preciosUnitarios, cantidades, esquemaServVisibles, esquemaInsVisibles, extraServiciosValidos, extraInsumosValidos])

  const factor = parseFloat(factorRentabilidad) || 1
  const totalPrecio = subtotal * factor

  async function guardar() {
    setError('')
    const nombreLimpio = nombre.replace(/\s*√\s*$/, '').trim()
    if (!nombreLimpio) {
      setError('Ingresa el nombre del ítem.')
      return
    }

    // Verificar si algún material con Perplexity cambió de peso y no ha sido confirmado aún
    for (const [nom, pVal] of Object.entries(pesos)) {
      const k = nom.trim().toLowerCase()
      if (materialesAjustadosManualmente.has(k)) continue
      const pesoOrig = pesosOriginalesIA[nom] || pesosOriginalesIA[k]
      if (pesoOrig) {
        const pOrigNum = parseFloat(pesoOrig) || 0
        const pNuevoNum = parseFloat(pVal) || 0
        if (pOrigNum > 0 && pNuevoNum !== pOrigNum && pVal.trim() !== pesoOrig.trim()) {
          setPopupAjuste({
            nombre: nom,
            pesoOriginal: pesoOrig,
            nuevoPeso: pVal,
          })
          return
        }
      }
    }

    // Comprobar si al menos un material tiene peso mayor a 0
    let tieneAlMenosUnoConPeso = esquemaMatVisibles.some(m => (parseFloat(pesos[m.nombre]) || 0) > 0)
      || extraMaterialesValidos.some(m => m.peso_kg > 0)

    let materialesGuardarFinal: {
      nombre: string
      peso_kg: number
      factor_co2_kg: number
      factor_agua_l_kg?: number
      origen_fuente?: string
      detalle_fuente?: string
      nivel_confianza: 'alta' | 'media' | 'baja'
      rol_conservacion: string
    }[] = []

    let origenFinalCalculado: string | null = origenFuente
    let detalleFuenteFinalCalculado: string | null = null

    // Si está COMPLETAMENTE en ceros:
    if (!tieneAlMenosUnoConPeso) {
      const hermano = buscarHermanoConPesos(nombreLimpio, item?.id, itemsCategoria)
      if (hermano && hermano.item_materiales && hermano.item_materiales.some(m => (m.peso_kg || 0) > 0)) {
        // Heredar directamente del hermano sin gastar tokens en Perplexity
        copiarPesosDeHermano(hermano)
        materialesGuardarFinal = hermano.item_materiales
          .filter(im => (im.peso_kg || 0) > 0)
          .map(im => ({
            nombre: im.nombre,
            peso_kg: im.peso_kg,
            factor_co2_kg: im.factor_co2_kg || 0,
            factor_agua_l_kg: im.factor_agua_l_kg ?? undefined,
            origen_fuente: im.origen_fuente ?? undefined,
            detalle_fuente: im.detalle_fuente ?? undefined,
            nivel_confianza: (im.nivel_confianza || 'baja') as 'alta' | 'media' | 'baja',
            rol_conservacion: (im.rol_conservacion === 'se_reemplaza' ? 'se_reemplaza' : 'se_conserva') as string,
          }))
        origenFinalCalculado = hermano.origen_fuente ?? null
        detalleFuenteFinalCalculado = hermano.detalle_fuente ?? null
        tieneAlMenosUnoConPeso = materialesGuardarFinal.length > 0
      } else {
        // Llamada a Perplexity AI antes de guardar para que no quede en ceros
        setGuardando(true)
        setMensajeGuardando('Estimando pesos con Perplexity AI para evitar ceros...')
        try {
          const matsParaIA = [...esquemaMatVisibles, ...extraMateriales.filter(m => m.nombre.trim())].map(m => m.nombre)
          const resIA = await fetch('/api/admin/materiales/peso-sugerido-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre_item: nombreLimpio,
              categoria_nombre: categoria.nombre,
              materiales: matsParaIA,
            }),
          })
          const dataIA = await resIA.json()
          if (resIA.ok && dataIA.ok && Array.isArray(dataIA.materiales) && dataIA.materiales.length > 0) {
            const prov = dataIA.proveedor || 'perplexity'
            origenFinalCalculado = prov
            setOrigenFuente(prov)

            const nuevosPesosIA: Record<string, string> = {}
            const nuevosPesos: Record<string, string> = { ...pesos }
            const nuevosRoles: Record<string, string> = { ...rolesConservacion }
            const nuevasFuentes: Record<string, InfoFuenteMaterial> = { ...fuentesMaterial }
            const nuevosExtras: MaterialRow[] = [...extraMateriales]

            const listaNuevosMats: typeof materialesGuardarFinal = []

            for (const r of dataIA.materiales as {
              nombre: string
              peso_kg_estimado?: number | null
              rol?: string | null
              confianza?: 'alta' | 'media' | 'baja' | null
              fuente_titulo?: string | null
              fuente_url?: string | null
            }[]) {
              const rNorm = r.nombre.trim().toLowerCase()
              const rolValido = r.rol === 'se_reemplaza' || r.rol === 'residuo' ? 'se_reemplaza' : 'se_conserva'
              const p = r.peso_kg_estimado || 0
              const infoActualizada: InfoFuenteMaterial = {
                confianza: r.confianza ?? null,
                fuente_titulo: r.fuente_titulo ?? null,
                fuente_url: r.fuente_url ?? null,
                proveedor: prov,
              }

              const matchEsquema = esquemaMatVisibles.find(m => m.nombre.trim().toLowerCase() === rNorm)
              if (matchEsquema) {
                if (p > 0) {
                  nuevosPesos[matchEsquema.nombre] = String(p)
                  nuevosPesosIA[matchEsquema.nombre] = String(p)
                  nuevosPesosIA[rNorm] = String(p)
                  listaNuevosMats.push({
                    nombre: matchEsquema.nombre,
                    peso_kg: p,
                    factor_co2_kg: parseFloat(matchEsquema.factor_co2_kg) || 0,
                    factor_agua_l_kg: matchEsquema.factor_agua_l_kg ? parseFloat(matchEsquema.factor_agua_l_kg) : undefined,
                    origen_fuente: r.fuente_url ? r.fuente_url.slice(0, 1900) : prov,
                    detalle_fuente: r.fuente_titulo ? r.fuente_titulo.slice(0, 4000) : undefined,
                    nivel_confianza: (r.confianza || 'baja') as 'alta' | 'media' | 'baja',
                    rol_conservacion: rolValido,
                  })
                }
                nuevosRoles[matchEsquema.nombre] = rolValido
                nuevasFuentes[matchEsquema.nombre] = infoActualizada
                nuevasFuentes[rNorm] = infoActualizada
              } else {
                const matchExtra = nuevosExtras.find(m => m.nombre.trim().toLowerCase() === rNorm)
                if (matchExtra) {
                  if (p > 0) {
                    matchExtra.peso_kg = String(p)
                    nuevosPesosIA[matchExtra.nombre] = String(p)
                    nuevosPesosIA[rNorm] = String(p)
                    listaNuevosMats.push({
                      nombre: matchExtra.nombre,
                      peso_kg: p,
                      factor_co2_kg: parseFloat(matchExtra.factor_co2_kg) || 0,
                      factor_agua_l_kg: matchExtra.factor_agua_l_kg ? parseFloat(matchExtra.factor_agua_l_kg) : undefined,
                      origen_fuente: r.fuente_url ? r.fuente_url.slice(0, 1900) : prov,
                      detalle_fuente: r.fuente_titulo ? r.fuente_titulo.slice(0, 4000) : undefined,
                      nivel_confianza: (r.confianza || 'baja') as 'alta' | 'media' | 'baja',
                      rol_conservacion: rolValido,
                    })
                  }
                  matchExtra.rol_conservacion = rolValido
                  matchExtra.origen_fuente = r.fuente_url || prov
                  matchExtra.detalle_fuente = r.fuente_titulo || matchExtra.detalle_fuente
                } else if (p > 0) {
                  const nuevoExtra: MaterialRow = {
                    id: nuevoIdFila('mat-extra'),
                    nombre: r.nombre,
                    peso_kg: String(p),
                    factor_co2_kg: '',
                    factor_agua_l_kg: '',
                    categoria_material: '',
                    origen_fuente: r.fuente_url || prov,
                    detalle_fuente: r.fuente_titulo || '',
                    rol_conservacion: rolValido,
                  }
                  nuevosExtras.push(nuevoExtra)
                  listaNuevosMats.push({
                    nombre: r.nombre,
                    peso_kg: p,
                    factor_co2_kg: 0,
                    factor_agua_l_kg: undefined,
                    origen_fuente: r.fuente_url ? r.fuente_url.slice(0, 1900) : prov,
                    detalle_fuente: r.fuente_titulo ? r.fuente_titulo.slice(0, 4000) : undefined,
                    nivel_confianza: (r.confianza || 'baja') as 'alta' | 'media' | 'baja',
                    rol_conservacion: rolValido,
                  })
                }
                nuevasFuentes[r.nombre] = infoActualizada
                nuevasFuentes[rNorm] = infoActualizada
              }
            }

            setPesos(nuevosPesos)
            setRolesConservacion(nuevosRoles)
            setFuentesMaterial(nuevasFuentes)
            setPesosOriginalesIA(prev => ({ ...prev, ...nuevosPesosIA }))
            setExtraMateriales(nuevosExtras)

            materialesGuardarFinal = listaNuevosMats
            tieneAlMenosUnoConPeso = listaNuevosMats.length > 0

            const mapaRolesIA: Record<string, string> = {}
            for (const [nom, rol] of Object.entries(nuevosRoles)) {
              if (rol) {
                mapaRolesIA[nom] = rol
                mapaRolesIA[nom.trim().toLowerCase()] = rol
              }
            }
            detalleFuenteFinalCalculado = JSON.stringify({
              proveedor: prov,
              roles: mapaRolesIA,
              materiales_info: nuevasFuentes,
              actualizado_at: new Date().toISOString(),
            })
          } else {
            setError(dataIA.error || 'No se pudieron estimar los pesos con Perplexity AI. Ingresa el peso de al menos un material.')
            setGuardando(false)
            setMensajeGuardando('')
            return
          }
        } catch {
          setError('Error de conexión con Perplexity AI al estimar pesos. Intenta de nuevo.')
          setGuardando(false)
          setMensajeGuardando('')
          return
        }
      }
    }

    if (!tieneAlMenosUnoConPeso) {
      setError('Coloca el peso de al menos un material. El impacto ambiental no puede quedar en cero.')
      setGuardando(false)
      setMensajeGuardando('')
      return
    }

    // Si no provino de una estimación en caliente de ceros, construir los materiales con el estado actual
    if (materialesGuardarFinal.length === 0) {
      const mapaRoles: Record<string, string> = {}
      for (const [nom, rol] of Object.entries(rolesConservacion)) {
        const pesoVal = parseFloat(pesos[nom]) || 0
        const rolFinal = rol || (pesoVal > 0 ? 'se_conserva' : '')
        if (rolFinal) {
          mapaRoles[nom] = rolFinal
          mapaRoles[nom.trim().toLowerCase()] = rolFinal
        }
      }
      for (const m of extraMaterialesValidos) {
        const rolFinal = m.rol_conservacion || 'se_conserva'
        mapaRoles[m.nombre] = rolFinal
        mapaRoles[m.nombre.trim().toLowerCase()] = rolFinal
      }

      const tieneRoles = Object.keys(rolesConservacion).length > 0
      const tieneFuentes = Object.keys(fuentesMaterial).length > 0

      materialesGuardarFinal = [
        ...esquemaMatVisibles
          .filter(m => parseFloat(pesos[m.nombre]) > 0)
          .map(m => {
            const mInfo = fuentesMaterial[m.nombre] || fuentesMaterial[m.nombre.trim().toLowerCase()]
            const esManual = materialesAjustadosManualmente.has(m.nombre.trim().toLowerCase())
            const esPerpReal = !esManual && esFuentePerplexity(mInfo)
            const matOrigen = mInfo?.fuente_url
              ? mInfo.fuente_url.slice(0, 1900)
              : (esPerpReal ? 'perplexity' : (m.origen_fuente && m.origen_fuente !== 'perplexity' ? m.origen_fuente : undefined))
            return {
              nombre: m.nombre,
              peso_kg: parseFloat(pesos[m.nombre]),
              factor_co2_kg: parseFloat(m.factor_co2_kg) || 0,
              factor_agua_l_kg: m.factor_agua_l_kg ? parseFloat(m.factor_agua_l_kg) : undefined,
              origen_fuente: matOrigen,
              detalle_fuente: esManual ? undefined : (mInfo?.fuente_titulo ? mInfo.fuente_titulo.slice(0, 4000) : (m.detalle_fuente || undefined)),
              nivel_confianza: (mInfo?.confianza || 'baja') as 'alta' | 'media' | 'baja',
              rol_conservacion: rolesConservacion[m.nombre] === 'residuo' ? 'se_reemplaza' : (rolesConservacion[m.nombre] || 'se_conserva'),
            }
          }),
        ...extraMaterialesValidos.map(m => {
          const mInfo = fuentesMaterial[m.nombre] || fuentesMaterial[m.nombre.trim().toLowerCase()]
          const esManual = materialesAjustadosManualmente.has(m.nombre.trim().toLowerCase())
          const esPerpReal = !esManual && esFuentePerplexity(mInfo)
          const matOrigen = mInfo?.fuente_url
            ? mInfo.fuente_url.slice(0, 1900)
            : (esPerpReal ? 'perplexity' : (m.origen_fuente && m.origen_fuente !== 'perplexity' ? m.origen_fuente : undefined))
          return {
            ...m,
            origen_fuente: matOrigen,
            detalle_fuente: esManual ? undefined : (mInfo?.fuente_titulo ? mInfo.fuente_titulo.slice(0, 4000) : (m.detalle_fuente || undefined)),
            nivel_confianza: (mInfo?.confianza || m.nivel_confianza || 'baja') as 'alta' | 'media' | 'baja',
            rol_conservacion: m.rol_conservacion === 'residuo' ? 'se_reemplaza' : (m.rol_conservacion || 'se_conserva'),
          }
        }),
      ]

      const algunMaterialTienePerp = materialesGuardarFinal.some(m => m.origen_fuente === 'perplexity' || (m.origen_fuente && m.origen_fuente.startsWith('http')))
      origenFinalCalculado = algunMaterialTienePerp ? 'perplexity' : (item?.origen_fuente && item.origen_fuente !== 'perplexity' ? item.origen_fuente : null)

      if (tieneRoles || tieneFuentes || algunMaterialTienePerp) {
        const infoFiltrada: Record<string, InfoFuenteMaterial> = {}
        for (const [k, v] of Object.entries(fuentesMaterial)) {
          if (!materialesAjustadosManualmente.has(k.trim().toLowerCase())) {
            infoFiltrada[k] = v
          }
        }
        detalleFuenteFinalCalculado = JSON.stringify({
          proveedor: algunMaterialTienePerp ? 'perplexity' : (item?.origen_fuente ?? 'interno'),
          roles: mapaRoles,
          materiales_info: infoFiltrada,
          actualizado_at: new Date().toISOString(),
        })
      }
    }

    const materiales = materialesGuardarFinal
    const origenFinal = origenFinalCalculado
    const detalleFuenteFinal = detalleFuenteFinalCalculado

    const servicios = [
      ...esquemaServVisibles
        .filter(s => {
          const p = parseFloat(precios[s.nombre])
          return s.nombre.trim() && (isNaN(p) || p >= 0)
        })
        .map(s => {
          const p = parseFloat(precios[s.nombre])
          return { nombre: s.nombre.trim(), precio: isNaN(p) ? 0 : p }
        }),
      ...extraServiciosValidos,
    ]

    const insumos = [
      ...esquemaInsVisibles
        .filter(i => {
          const c = parseFloat(cantidades[i.nombre])
          const p = parseFloat(preciosUnitarios[i.nombre])
          return i.nombre.trim() && (isNaN(c) || c >= 0) && (isNaN(p) || p >= 0)
        })
        .map(i => {
          const c = parseFloat(cantidades[i.nombre])
          const p = parseFloat(preciosUnitarios[i.nombre])
          return {
            nombre: i.nombre.trim(),
            cantidad: isNaN(c) ? 0 : c,
            unidad: i.unidad,
            precio_unitario: isNaN(p) ? 0 : p,
            peso_kg: pesosInsumo[i.nombre] ? parseFloat(pesosInsumo[i.nombre]) : undefined,
          }
        }),
      ...extraInsumosValidos,
    ]

    setGuardando(true); setError('')

    // El nombre y los factores de cada material pertenecen a la CATEGORÍA:
    // si el super_admin los editó (o quitó un material) desde este ítem, el
    // cambio se propaga al esquema base y por lo tanto a todos los ítems de
    // esa categoría. El peso, en cambio, es solo de este ítem.
    const esquemaCambio = esquemaMat.some(f => {
      const orig = categoria.categoria_materiales_base.find(o => o.id === f.id)
      return !!orig && (
        f.nombre !== orig.nombre
        || (parseFloat(f.factor_co2_kg) || 0) !== orig.factor_co2_kg
        || (f.factor_agua_l_kg ? parseFloat(f.factor_agua_l_kg) : null) !== orig.factor_agua_l_kg
      )
    })

    if (esquemaCambio) {
      const materialesBase = esquemaMat
        .filter(f => f.nombre.trim())
        .map(f => ({
          nombre: f.nombre.trim(),
          peso_kg: parseFloat(f.peso_kg) || 1,
          factor_co2_kg: parseFloat(f.factor_co2_kg) || 0,
          factor_agua_l_kg: f.factor_agua_l_kg ? parseFloat(f.factor_agua_l_kg) : undefined,
          categoria_material: f.categoria_material || undefined,
          origen_fuente: f.origen_fuente || undefined,
          detalle_fuente: f.detalle_fuente || undefined,
          nivel_confianza: 'baja' as const,
        }))
      const resCat = await fetch(`/api/admin/categorias/${categoria.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materiales_base: materialesBase }),
      })
      if (!resCat.ok) {
        const d = await resCat.json().catch(() => ({}))
        setError(d.error ?? 'Error al actualizar el esquema de la categoría.')
        setGuardando(false)
        setMensajeGuardando('')
        return
      }
    }

    // Mismo criterio para los costos: solo si cambió el NOMBRE o la UNIDAD de
    // un servicio/insumo que sigue existiendo en el esquema, el esquema
    // financiero de la categoría se actualiza para todos sus ítems.
    const servCambio = esquemaServ.some(f => {
      const orig = categoria.categoria_servicios_base.find(o => o.id === f.id)
      return !!orig && f.nombre !== orig.nombre
    })
    const insCambio = esquemaIns.some(f => {
      const orig = categoria.categoria_insumos_base.find(o => o.id === f.id)
      return !!orig && (f.nombre !== orig.nombre || f.unidad !== orig.unidad)
    })

    if (servCambio || insCambio) {
      const cuerpo: Record<string, unknown> = {}
      if (servCambio) {
        cuerpo.servicios_base = esquemaServ
          .filter(f => f.nombre.trim())
          .map(f => ({ nombre: f.nombre.trim(), precio: parseFloat(f.precio) || 0 }))
      }
      if (insCambio) {
        cuerpo.insumos_base = esquemaIns
          .filter(f => f.nombre.trim())
          .map(f => ({ nombre: f.nombre.trim(), cantidad: 1, unidad: f.unidad || 'unidad', precio_unitario: parseFloat(f.precio_unitario) || 0, peso_kg: f.peso_kg ?? undefined }))
      }
      const resCat = await fetch(`/api/admin/categorias/${categoria.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      if (!resCat.ok) {
        const d = await resCat.json().catch(() => ({}))
        setError(d.error ?? 'Error al actualizar los costos de la categoría.')
        setGuardando(false)
        setMensajeGuardando('')
        return
      }
    }

    const url = item ? `/api/admin/items/${item.id}` : '/api/admin/items'
    const method = item ? 'PATCH' : 'POST'
    const body = item
      ? {
          nombre: nombreLimpio,
          factor_rentabilidad: factor,
          materiales,
          servicios,
          insumos,
          origen_fuente: origenFinal,
          detalle_fuente: detalleFuenteFinal,
        }
      : {
          categoria_id: categoria.id,
          nombre: nombreLimpio,
          factor_rentabilidad: factor,
          materiales,
          servicios,
          insumos,
          origen_fuente: origenFinal,
          detalle_fuente: detalleFuenteFinal,
        }

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Error al guardar.')
      setGuardando(false)
      setMensajeGuardando('')
      return
    }

    onGuardado()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-2xl p-4 ${cardBg}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className={labelSt}>Nombre del ítem</label>
          {(origenFuente === 'perplexity' || esItemPerplexity(item)) && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00827C] dark:text-[#2DD4BF] bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <IconoPerplexity size={12} /> Estimado con Perplexity AI
            </span>
          )}
        </div>
        <input style={inputSt} placeholder="Ej: Mesa 4 puestos" value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus={!item} />
        {hermanoConPesos && (
          <div className="mt-3 flex items-center justify-between p-2.5 px-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-[#00827C] dark:text-[#2DD4BF]">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={14} className="shrink-0" />
              <span className="truncate">
                Especificaciones compartidas con <strong>{hermanoConPesos.nombre}</strong> (pesos y fuentes sincronizados para ahorrar tokens).
              </span>
            </div>
            <button
              type="button"
              onClick={() => copiarPesosDeHermano(hermanoConPesos)}
              className="underline hover:opacity-80 font-medium ml-2 shrink-0 cursor-pointer text-xs"
            >
              Copiar de nuevo
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Costos — estructura precargada, solo se llenan precios/cantidades */}
        <div className={`rounded-2xl p-4 ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-bold text-brand"><CircleDollarSign size={16} /> Costos</p>
            </div>

            <label className={labelSeccion}>Servicios</label>
            {esquemaServVisibles.length === 0 && extraServicios.length === 0 && (
              <p className="text-xs text-(--text-placeholder) italic mb-2">Sin servicios asignados.</p>
            )}

            {esquemaServVisibles.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-2">
                {esquemaServVisibles.map(fila => (
                  <div key={fila.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 min-w-0 flex items-center gap-1 text-sm text-(--text-primary)">
                        <span>{fila.nombre}</span>
                        <TooltipInfo texto={descripcionesMaterial[fila.nombre] ?? ''} />
                      </p>
                      <div className="w-28 shrink-0">
                        <InputPrecio value={precios[fila.nombre] ?? ''} onChange={v => setPrecios(p => ({ ...p, [fila.nombre]: v }))} />
                      </div>
                      <button type="button" onClick={() => alternarFila(fila.id)}
                        className="p-1 text-(--text-secondary) hover:text-brand transition-colors shrink-0"
                        title="Editar servicio">
                        <Pencil size={15} sinAnimacion />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setServiciosEliminados(prev => new Set(prev).add(fila.id))
                          setPrecios(p => ({ ...p, [fila.nombre]: '' }))
                        }}
                        className="p-1 text-error transition-opacity duration-200 hover:opacity-50 shrink-0"
                        title="Eliminar servicio"
                      >
                        <Trash size={16} sinAnimacion />
                      </button>
                    </div>
                    {filaAbierta === fila.id && (
                      <div className="flex flex-col gap-2 pl-1 pb-3 border-b border-(--border)">
                        <div>
                          <label className={labelSt}>Servicio</label>
                          <input style={inputSt} placeholder="Ej: Pintor" value={fila.nombre}
                            onChange={e => editarEsquemaServ(fila.id, e.target.value)} />
                        </div>
                        <CampoTooltip nombre={fila.nombre} mapa={descripcionesMaterial} setMapa={setDescripcionesMaterial} />
                        <div className="flex justify-end items-center mt-1">
                          <button
                            type="button"
                            onClick={() => setFilaAbierta(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                          >
                            <Check size={13} /> Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {extraServicios.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {extraServicios.map((s, i) => {
                  const sId = s.id || `extra-serv-${i}`
                  const abierto = filaAbierta === sId
                  return (
                    <div key={sId} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <p className="flex-1 min-w-0 flex items-center gap-1 text-sm text-(--text-primary)">
                          <span>{s.nombre.trim() || '(Servicio adicional)'}</span>
                          {s.nombre.trim() && <TooltipInfo texto={descripcionesMaterial[s.nombre] ?? ''} />}
                        </p>
                        <div className="w-28 shrink-0">
                          <InputPrecio
                            value={s.precio}
                            onChange={v => setExtraServicios(r => r.map((x, j) => j === i ? { ...x, precio: v } : x))}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => alternarFila(sId)}
                          className="p-1 text-(--text-secondary) hover:text-brand transition-colors shrink-0"
                          title="Editar servicio"
                        >
                          <Pencil size={15} sinAnimacion />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExtraServicios(r => r.filter((_, j) => j !== i))
                            if (filaAbierta === sId) setFilaAbierta(null)
                          }}
                          className="p-1 text-error transition-opacity duration-200 hover:opacity-50 shrink-0"
                          title="Eliminar servicio"
                        >
                          <Trash size={16} sinAnimacion />
                        </button>
                      </div>
                      {abierto && (
                        <div className="flex flex-col gap-2 pl-1 pb-3 border-b border-(--border)">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelSt}>Servicio</label>
                              <input
                                style={inputSt}
                                placeholder="Ej: Pintor"
                                value={s.nombre}
                                onChange={e => setExtraServicios(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                              />
                            </div>
                            <div>
                              <label className={labelSt}>Precio</label>
                              <InputPrecio
                                value={s.precio}
                                onChange={v => setExtraServicios(r => r.map((x, j) => j === i ? { ...x, precio: v } : x))}
                              />
                            </div>
                          </div>
                          <CampoTooltip nombre={s.nombre} mapa={descripcionesMaterial} setMapa={setDescripcionesMaterial} />
                          <div className="flex justify-between items-center mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setExtraServicios(r => r.filter((_, j) => j !== i))
                                setFilaAbierta(null)
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-error transition-opacity duration-200 hover:opacity-50"
                            >
                              <Trash size={14} /> Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setFilaAbierta(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                            >
                              <Check size={13} /> Guardar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const nuevo = filaServicio()
                setExtraServicios(r => [...r, nuevo])
                setFilaAbierta(nuevo.id!)
              }}
              className={`${btnChico} mb-4`}
            >
              <Plus size={12} /> Añadir servicio
            </button>

            <label className={`${labelSeccion} mt-2`}>Insumos</label>
            {esquemaInsVisibles.length === 0 && extraInsumos.length === 0 && (
              <p className="text-xs text-(--text-placeholder) italic mb-2">Sin insumos asignados.</p>
            )}

            {esquemaInsVisibles.map(fila => {
              const cantNum = parseFloat(String(cantidades[fila.nombre] ?? '0').replace(',', '.'))
              const esCero = isNaN(cantNum) || cantNum === 0
              return (
                <div
                  key={fila.id}
                  className={`flex flex-col gap-2 mb-2 transition-opacity duration-200 ${
                    esCero ? 'opacity-55 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className={`flex-1 min-w-0 flex items-center gap-1.5 text-sm transition-colors ${
                        esCero ? 'text-(--text-secondary) opacity-70 font-normal' : 'text-(--text-primary) font-medium'
                      }`}
                    >
                      <span>{fila.nombre}</span>
                      <TooltipInfo texto={descripcionesMaterial[fila.nombre] ?? ''} />
                    </p>
                    <div className="w-32 shrink-0">
                      <InputCantidadInsumo
                        value={cantidades[fila.nombre] ?? 0}
                        onChange={v => setCantidades(p => ({ ...p, [fila.nombre]: String(v) }))}
                        unidad={fila.unidad || 'ud'}
                      />
                    </div>
                    <div className={`w-28 shrink-0 transition-opacity ${esCero ? 'opacity-55' : 'opacity-100'}`}>
                      <InputPrecio value={preciosUnitarios[fila.nombre] ?? ''} onChange={v => setPreciosUnitarios(p => ({ ...p, [fila.nombre]: v }))} />
                    </div>
                    <button type="button" onClick={() => alternarFila(fila.id)}
                      className="p-1 text-(--text-secondary) hover:text-brand transition-colors shrink-0"
                      title="Editar insumo">
                      <Pencil size={15} sinAnimacion />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInsumosEliminados(prev => new Set(prev).add(fila.id))
                        setCantidades(p => ({ ...p, [fila.nombre]: '' }))
                        setPreciosUnitarios(p => ({ ...p, [fila.nombre]: '' }))
                        setPesosInsumo(p => ({ ...p, [fila.nombre]: '' }))
                      }}
                      className="p-1 text-error transition-opacity duration-200 hover:opacity-50 shrink-0"
                      title="Eliminar insumo"
                    >
                      <Trash size={16} sinAnimacion />
                    </button>
                  </div>
                  {filaAbierta === fila.id && (
                    <div className="flex flex-col gap-2 pl-1 pb-3 border-b border-(--border)">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={labelSt}>Insumo</label>
                          <input style={inputSt} placeholder="Ej: Tela" value={fila.nombre}
                            onChange={e => editarEsquemaIns(fila.id, { nombre: e.target.value })} />
                        </div>
                        <div>
                          <label className={labelSt}>Unidad</label>
                          <input style={inputSt} placeholder="Ej: metros" value={fila.unidad}
                            onChange={e => editarEsquemaIns(fila.id, { unidad: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1">
                          <label className={labelSt}>Peso</label>
                          <InputConUnidad value={pesosInsumo[fila.nombre] ?? ''} onChange={v => setPesosInsumo(p => ({ ...p, [fila.nombre]: v }))} unidad="kg" paso="0.001" />
                        </div>
                        <div className="pb-2.5">
                          <BotonSugerirPeso nombre={fila.nombre} unidad={fila.unidad} endpoint="/api/admin/insumos/peso-sugerido" onSugerido={pesoKg => setPesosInsumo(p => ({ ...p, [fila.nombre]: String(pesoKg) }))} contextoItem={`${nombre} (categoría: ${categoria.nombre})`} />
                        </div>
                      </div>
                      <CampoTooltip nombre={fila.nombre} mapa={descripcionesMaterial} setMapa={setDescripcionesMaterial} />
                      <div className="flex justify-end items-center mt-1">
                        <button
                          type="button"
                          onClick={() => setFilaAbierta(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                        >
                          <Check size={13} /> Guardar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {extraInsumos.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {extraInsumos.map((ins, i) => {
                  const insId = ins.id || `extra-ins-${i}`
                  const abierto = filaAbierta === insId
                  const cantNum = typeof ins.cantidad === 'string' ? parseFloat(ins.cantidad.replace(',', '.')) : ins.cantidad
                  const esCero = isNaN(cantNum) || cantNum === 0
                  return (
                    <div
                      key={insId}
                      className={`flex flex-col gap-2 transition-opacity duration-200 ${
                        esCero ? 'opacity-55 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <p
                          className={`flex-1 min-w-0 flex items-center gap-1.5 text-sm transition-colors ${
                            esCero ? 'text-(--text-secondary) opacity-70 font-normal' : 'text-(--text-primary) font-medium'
                          }`}
                        >
                          <span>{ins.nombre.trim() || '(Insumo adicional)'}</span>
                          {ins.nombre.trim() && <TooltipInfo texto={descripcionesMaterial[ins.nombre] ?? ''} />}
                        </p>
                        <div className="w-32 shrink-0">
                          <InputCantidadInsumo
                            value={ins.cantidad}
                            onChange={v => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, cantidad: String(v) } : x))}
                            unidad={ins.unidad || 'ud'}
                          />
                        </div>
                        <div className={`w-28 shrink-0 transition-opacity ${esCero ? 'opacity-55' : 'opacity-100'}`}>
                          <InputPrecio
                            value={ins.precio_unitario}
                            onChange={v => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, precio_unitario: v } : x))}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => alternarFila(insId)}
                          className="p-1 text-(--text-secondary) hover:text-brand transition-colors shrink-0"
                          title="Editar insumo"
                        >
                          <Pencil size={15} sinAnimacion />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExtraInsumos(r => r.filter((_, j) => j !== i))
                            if (filaAbierta === insId) setFilaAbierta(null)
                          }}
                          className="p-1 text-error transition-opacity duration-200 hover:opacity-50 shrink-0"
                          title="Eliminar insumo"
                        >
                          <Trash size={16} sinAnimacion />
                        </button>
                      </div>
                      {abierto && (
                        <div className="flex flex-col gap-2 pl-1 pb-3 border-b border-(--border)">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelSt}>Insumo</label>
                              <input style={inputSt} placeholder="Ej: Tela" value={ins.nombre} onChange={e => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
                            </div>
                            <div>
                              <label className={labelSt}>Unidad</label>
                              <input style={inputSt} placeholder="Ej: metros" value={ins.unidad} onChange={e => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))} />
                            </div>
                          </div>
                          <div className="flex items-end gap-1">
                            <div className="flex-1">
                              <label className={labelSt}>Peso</label>
                              <InputConUnidad value={ins.peso_kg} onChange={v => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: v } : x))} unidad="kg" paso="0.001" />
                            </div>
                            <div className="pb-2.5">
                              <BotonSugerirPeso nombre={ins.nombre} unidad={ins.unidad} endpoint="/api/admin/insumos/peso-sugerido" onSugerido={pesoKg => setExtraInsumos(r => r.map((x, j) => j === i ? { ...x, peso_kg: String(pesoKg) } : x))} contextoItem={`${nombre} (categoría: ${categoria.nombre})`} />
                            </div>
                          </div>
                          <CampoTooltip nombre={ins.nombre} mapa={descripcionesMaterial} setMapa={setDescripcionesMaterial} />
                          <div className="flex justify-between items-center mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setExtraInsumos(r => r.filter((_, j) => j !== i))
                                setFilaAbierta(null)
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-error transition-opacity duration-200 hover:opacity-50"
                            >
                              <Trash size={14} /> Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setFilaAbierta(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                            >
                              <Check size={13} /> Guardar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const nuevo = { ...filaInsumo(), cantidad: '1' }
                setExtraInsumos(r => [...r, nuevo])
                setFilaAbierta(nuevo.id!)
              }}
              className={`${btnChico} mb-2`}
            >
              <Plus size={12} /> Añadir insumo
            </button>
          </div>

          <div className="mt-4 pt-4 flex flex-col gap-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--text-secondary)">Subtotal</span>
              <span className="text-(--text-primary) font-semibold text-right whitespace-nowrap">{formatNumero(subtotal, { moneda: true })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--text-secondary)">Factor de rentabilidad</span>
              <div className="w-20">
                <div className="flex items-center gap-1 rounded-lg px-2" style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  <span className="text-xs text-(--text-secondary)">x</span>
                  <input type="number" step="0.1" value={factorRentabilidad} onChange={e => setFactorRentabilidad(e.target.value)}
                    style={{ textAlign: 'right', padding: '8px 2px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-(--text-primary)">Total del ítem</span>
              <span className="text-base font-bold text-brand text-right whitespace-nowrap">{formatNumero(totalPrecio, { moneda: true })}</span>
            </div>
          </div>
        </div>

        {/* Cálculo ambiental */}
        <div className={`rounded-2xl p-4 ${cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-bold text-brand"><Leaf size={16} /> Cálculo ambiental</p>
            </div>

            <div className="flex items-center gap-1.5 mb-2.5">
              <label className="text-xs font-bold text-(--text-primary)">Materiales</label>
              <button
                type="button"
                onClick={limpiarTodosMateriales}
                title="Limpiar"
                className="inline-flex items-center gap-1 text-(--text-placeholder) hover:text-brand transition-colors p-1 -my-1 rounded-sm cursor-pointer group"
              >
                <BrushCleaning size={15} />
                <span className="hidden group-hover:inline-block text-[11px] font-medium text-(--text-secondary)">
                  limpiar
                </span>
              </button>
            </div>
            {esquemaMatVisibles.length === 0 && extraMateriales.length === 0 && (
              <p className="text-xs text-(--text-placeholder) italic mb-2">Sin materiales asignados.</p>
            )}

            {esquemaMatVisibles.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-3">
                {esquemaMatVisibles.map(fila => (
                  <div key={fila.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 min-w-0 flex items-center flex-wrap gap-1.5 text-sm font-medium text-(--text-primary)">
                        <span>{fila.nombre}</span>
                        <TooltipInfo texto={descripcionesMaterial[fila.nombre] ?? ''} />
                        <BotonInfoPerplexity
                          info={fuentesMaterial[fila.nombre] || fuentesMaterial[fila.nombre.trim().toLowerCase()]}
                          nombreMaterial={fila.nombre}
                          peso={pesos[fila.nombre]}
                        />
                        <BadgeRolConservacion
                          rol={rolesConservacion[fila.nombre]}
                          peso={pesos[fila.nombre]}
                          onCambiar={nuevoRol => setRolesConservacion(p => ({ ...p, [fila.nombre]: nuevoRol }))}
                        />
                      </p>
                      <div className="w-28 shrink-0">
                        {cargandoMaterialesIA ? (
                          <div className="h-9 w-full rounded-lg skeleton-shimmer flex items-center justify-end px-3 text-xs font-semibold text-brand border border-(--border)">
                            <span className="animate-pulse">calculando...</span>
                          </div>
                        ) : (
                          <InputConUnidad
                            value={pesos[fila.nombre] ?? ''}
                            onChange={v => setPesos(p => ({ ...p, [fila.nombre]: v }))}
                            onBlur={() => verificarAjustePeso(fila.nombre, pesos[fila.nombre] ?? '')}
                            unidad="kg"
                            paso="0.01"
                          />
                        )}
                      </div>
                      <button type="button" onClick={() => alternarFila(fila.id)}
                        className="p-1 text-(--text-secondary) hover:text-brand transition-colors shrink-0"
                        title="Editar material">
                        <Pencil size={15} sinAnimacion />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMaterialesEliminados(prev => new Set(prev).add(fila.id))
                          setPesos(p => ({ ...p, [fila.nombre]: '' }))
                        }}
                        className="p-1 text-error transition-opacity duration-200 hover:opacity-50 shrink-0"
                        title="Eliminar material"
                      >
                        <Trash size={16} sinAnimacion />
                      </button>
                    </div>
                    {filaAbierta === fila.id && (
                      <div className="flex flex-col gap-2 pl-1 pb-3 border-b border-(--border)">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className={labelSt}>Material</label>
                            <input style={inputSt} placeholder="Ej: Madera dura" value={fila.nombre}
                              onChange={e => editarEsquemaMat(fila.id, { nombre: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelSt}>Rol de conservación</label>
                            <select
                              style={inputSt}
                              value={rolesConservacion[fila.nombre] === 'se_reemplaza' || rolesConservacion[fila.nombre] === 'residuo' ? 'se_reemplaza' : 'se_conserva'}
                              onChange={e => setRolesConservacion(p => ({ ...p, [fila.nombre]: e.target.value }))}
                            >
                              <option value="se_conserva">Se conserva</option>
                              <option value="se_reemplaza">Se reemplaza</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelSt}>Factor CO₂ eq (por 1 kg)</label>
                            <InputConUnidad value={fila.factor_co2_kg} onChange={v => editarEsquemaMat(fila.id, { factor_co2_kg: v })} unidad="kg CO₂ eq/kg" paso="0.0001" />
                          </div>
                          <div>
                            <label className={labelSt}>Agua (por 1 kg)</label>
                            <InputConUnidad value={fila.factor_agua_l_kg} onChange={v => editarEsquemaMat(fila.id, { factor_agua_l_kg: v })} unidad="L agua/kg" paso="0.1" />
                          </div>
                        </div>
                        <CampoTooltip nombre={fila.nombre} mapa={descripcionesMaterial} setMapa={setDescripcionesMaterial} />
                        <div className="flex justify-end items-center mt-1">
                          <button
                            type="button"
                            onClick={() => setFilaAbierta(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                          >
                            <Check size={13} /> Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {extraMateriales.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {extraMateriales.map((m, i) => {
                  const matId = m.id || `extra-mat-${i}`
                  const abierto = filaAbierta === matId
                  return (
                    <div key={matId} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm text-(--text-primary)">
                          <span className="truncate">{m.nombre.trim() || '(Material adicional)'}</span>
                          {m.nombre.trim() && <TooltipInfo texto={descripcionesMaterial[m.nombre] ?? ''} />}
                          <BotonInfoPerplexity
                            info={fuentesMaterial[m.nombre] || fuentesMaterial[m.nombre.trim().toLowerCase()]}
                            nombreMaterial={m.nombre || 'Material adicional'}
                            peso={m.peso_kg}
                          />
                          <BadgeRolConservacion
                            rol={m.rol_conservacion}
                            peso={m.peso_kg}
                            onCambiar={nuevoRol => setExtraMateriales(r => r.map((x, j) => j === i ? { ...x, rol_conservacion: nuevoRol } : x))}
                          />
                        </div>
                        <div className="w-28 shrink-0">
                          {cargandoMaterialesIA ? (
                            <div className="h-9 w-full rounded-lg skeleton-shimmer flex items-center justify-end px-3 text-xs font-semibold text-brand border border-(--border)">
                              <span className="animate-pulse">calculando...</span>
                            </div>
                          ) : (
                            <InputConUnidad
                              value={m.peso_kg}
                              onChange={v => setExtraMateriales(r => r.map((x, j) => j === i ? { ...x, peso_kg: v } : x))}
                              onBlur={() => verificarAjustePeso(m.nombre, m.peso_kg, true, i)}
                              unidad="kg"
                              paso="0.01"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => alternarFila(matId)}
                          className="p-1 text-(--text-secondary) hover:text-brand transition-colors shrink-0"
                          title="Editar material"
                        >
                          <Pencil size={15} sinAnimacion />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExtraMateriales(r => r.filter((_, j) => j !== i))
                            if (filaAbierta === matId) setFilaAbierta(null)
                          }}
                          className="p-1 text-error transition-opacity duration-200 hover:opacity-50 shrink-0"
                          title="Eliminar material"
                        >
                          <Trash size={16} sinAnimacion />
                        </button>
                      </div>
                      {abierto && (
                        <div className="flex flex-col gap-2 pl-1 pb-3 border-b border-(--border)">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <label className={labelSt}>Material adicional</label>
                              <input style={inputSt} placeholder="Ej: Madera dura" value={m.nombre} onChange={e => setExtraMateriales(r => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} />
                            </div>
                            <div>
                              <label className={labelSt}>Rol de conservación</label>
                              <select
                                style={inputSt}
                                value={m.rol_conservacion === 'se_reemplaza' || m.rol_conservacion === 'residuo' ? 'se_reemplaza' : 'se_conserva'}
                                onChange={e => setExtraMateriales(r => r.map((x, j) => j === i ? { ...x, rol_conservacion: e.target.value } : x))}
                              >
                                <option value="se_conserva">Se conserva</option>
                                <option value="se_reemplaza">Se reemplaza</option>
                              </select>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-(--text-secondary)">Factor CO₂ eq</label>
                                <button
                                  type="button"
                                  disabled={!m.nombre.trim() || !!cargandoFactorExtra[matId]}
                                  onClick={() => sugerirFactorMaterialExtra(matId, m.nombre)}
                                  className="text-[11px] font-semibold text-brand hover:opacity-75 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                                  title="Buscar factor de emisión con IA"
                                >
                                  {cargandoFactorExtra[matId] ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                  Sugerir con IA
                                </button>
                              </div>
                              <InputConUnidad value={m.factor_co2_kg} onChange={v => setExtraMateriales(r => r.map((x, j) => j === i ? { ...x, factor_co2_kg: v } : x))} unidad="kg CO₂ eq/kg" paso="0.0001" />
                            </div>
                            <div>
                              <label className={labelSt}>Agua (por 1 kg)</label>
                              <InputConUnidad value={m.factor_agua_l_kg} onChange={v => setExtraMateriales(r => r.map((x, j) => j === i ? { ...x, factor_agua_l_kg: v } : x))} unidad="L agua/kg" paso="0.1" />
                            </div>
                          </div>
                          <CampoTooltip nombre={m.nombre} mapa={descripcionesMaterial} setMapa={setDescripcionesMaterial} />
                          <div className="flex justify-between items-center mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setExtraMateriales(r => r.filter((_, j) => j !== i))
                                setFilaAbierta(null)
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-error transition-opacity duration-200 hover:opacity-50"
                            >
                              <Trash size={14} /> Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setFilaAbierta(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand text-white hover:opacity-90 shadow-2xs transition-all cursor-pointer"
                            >
                              <Check size={13} /> Guardar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const nuevo = filaMaterial()
                setExtraMateriales(r => [...r, nuevo])
                setFilaAbierta(nuevo.id!)
              }}
              className={`${btnChico} mb-2`}
            >
              <Plus size={12} /> Añadir material
            </button>

            <BotonCompletarMaterialesIA
              nombreItem={nombre}
              categoriaNombre={categoria.nombre}
              materiales={[...esquemaMatVisibles, ...extraMateriales.filter(m => m.nombre.trim())]}
              cargando={cargandoMaterialesIA}
              setCargando={setCargandoMaterialesIA}
              onCompletado={(resultados, prov) => {
                const p = prov || 'perplexity'
                setOrigenFuente(p)
                const nuevosPesosIA: Record<string, string> = {}
                for (const r of resultados) {
                  const rNorm = r.nombre.trim().toLowerCase()
                  const rolValido = r.rol === 'se_conserva' || r.rol === 'se_reemplaza' || r.rol === 'desconocido' ? r.rol : ''
                  const matchEsquema = esquemaMatVisibles.find(m => m.nombre.trim().toLowerCase() === rNorm)
                  const infoActualizada: InfoFuenteMaterial = {
                    confianza: r.confianza ?? null,
                    fuente_titulo: r.fuente_titulo ?? null,
                    fuente_url: r.fuente_url ?? null,
                    proveedor: p,
                  }

                  if (r.peso_kg !== null && r.peso_kg !== undefined && r.peso_kg > 0) {
                    nuevosPesosIA[r.nombre] = String(r.peso_kg)
                    nuevosPesosIA[rNorm] = String(r.peso_kg)
                    if (matchEsquema) nuevosPesosIA[matchEsquema.nombre] = String(r.peso_kg)
                  }

                  if (matchEsquema) {
                    if (r.peso_kg !== null && r.peso_kg !== undefined) setPesos(prev => ({ ...prev, [matchEsquema.nombre]: String(r.peso_kg) }))
                    if (rolValido) setRolesConservacion(prev => ({ ...prev, [matchEsquema.nombre]: rolValido }))
                    setFuentesMaterial(prev => ({
                      ...prev,
                      [matchEsquema.nombre]: infoActualizada,
                      [rNorm]: infoActualizada,
                    }))
                  } else {
                    const matchExtra = extraMateriales.find(m => m.nombre.trim().toLowerCase() === rNorm)
                    if (matchExtra) {
                      setExtraMateriales(prev => prev.map(m => m.nombre.trim().toLowerCase() === rNorm ? {
                        ...m,
                        peso_kg: r.peso_kg !== null && r.peso_kg !== undefined ? String(r.peso_kg) : m.peso_kg,
                        rol_conservacion: rolValido || m.rol_conservacion,
                        origen_fuente: r.fuente_url || p,
                        detalle_fuente: r.fuente_titulo || m.detalle_fuente,
                      } : m))
                      setFuentesMaterial(prev => ({
                        ...prev,
                        [matchExtra.nombre]: infoActualizada,
                        [rNorm]: infoActualizada,
                      }))
                      if (!matchExtra.factor_co2_kg.trim() && matchExtra.id) {
                        sugerirFactorMaterialExtra(matchExtra.id, matchExtra.nombre)
                      }
                    } else {
                      // La IA descubrió un material adicional para este ítem que no estaba en la categoría
                      const nuevoId = nuevoIdFila('mat-extra')
                      const nuevoMat: MaterialRow = {
                        id: nuevoId,
                        nombre: r.nombre,
                        peso_kg: r.peso_kg !== null && r.peso_kg !== undefined ? String(r.peso_kg) : '',
                        factor_co2_kg: '',
                        factor_agua_l_kg: '',
                        categoria_material: '',
                        origen_fuente: r.fuente_url || p,
                        detalle_fuente: r.fuente_titulo || '',
                        rol_conservacion: rolValido || 'se_conserva',
                      }
                      setExtraMateriales(prev => [...prev, nuevoMat])
                      setFuentesMaterial(prev => ({
                        ...prev,
                        [r.nombre]: infoActualizada,
                        [rNorm]: infoActualizada,
                      }))
                      sugerirFactorMaterialExtra(nuevoId, r.nombre)
                    }
                  }
                }
                setPesosOriginalesIA(prev => ({ ...prev, ...nuevosPesosIA }))
                setMaterialesAjustadosManualmente(new Set())
              }}
            />
          </div>

          <div className="mt-4 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-(--text-primary)">Total CO₂ eq evitado</span>
              <span className="text-sm font-bold text-brand text-right whitespace-nowrap">{formatNumero(totalCo2, { unidad: 'kg CO₂ eq' })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-(--text-primary)">Total agua evitada</span>
              <span className="text-sm font-bold text-[#59A6E4] text-right whitespace-nowrap">{formatNumero(totalAgua, { unidad: 'L' })}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="sticky bottom-0 z-30 w-full bg-(--bg-primary) py-3 px-4 flex items-center justify-center gap-3 mt-3">
        <div
          aria-hidden="true"
          className="absolute -top-6 left-0 right-0 h-6 pointer-events-none bg-linear-to-t/srgb from-(--bg-primary) to-transparent"
        />
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={btnSecundario}>
            Cancelar
          </button>
        )}
        <button onClick={guardar} disabled={guardando} className={btnPrimario}>
          {guardando ? (mensajeGuardando || 'Guardando...') : 'Guardar'}
        </button>
      </div>

      {popupAjuste && (
        <ModalConfirmacionAjustePerplexity
          nombreMaterial={popupAjuste.nombre}
          pesoOriginal={popupAjuste.pesoOriginal}
          nuevoPeso={popupAjuste.nuevoPeso}
          onConfirmar={confirmarDesvinculacionPerplexity}
          onCancelar={cancelarDesvinculacionPerplexity}
        />
      )}
    </div>
  )
}
