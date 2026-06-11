'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { Calendar, Funnel, X, CaretLeft, CaretRight, MagnifyingGlass, CircleNotch, Leaf, Drop, ShieldCheck, Link as LinkIcon } from '@phosphor-icons/react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { BotonDescargar } from '@/components/boton-descargar'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import type { Rol } from '@/types'

interface DetalleItem {
  categoria: string
  nombre: string
  /** peso ingresado por el usuario en kg (v4.3+) */
  peso_kg?: number
  /** cantidad en unidades (legado pre-v4.3) */
  cantidad?: number
  co2: number
}

interface CalculoFila {
  id: string
  user_id: string
  fecha: string
  total_co2: number
  total_agua: number
  detalle_json: Record<string, DetalleItem | string> | null
  usuario_nombre?: string | null
  hash_interno?: string | null
  hash_previo?: string | null
}

interface Props {
  calculos: CalculoFila[]
  total: number
  rol: Rol
  categorias: string[]
  empresas?: { id: string; nombre: string }[]
  refreshKey?: number
}

const BRAND = '#00827C'
const BG_LIGHT = 'var(--bg-integrated)'
const TEXT_DARK = 'var(--text-primary)'
const TEXT_MED = 'var(--text-secondary)'
const BORDER = 'var(--border)'
const PAGE_SIZES = [10, 20, 50, 100]

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function itemsDeDetalle(detalle: Record<string, DetalleItem | string> | null): DetalleItem[] {
  if (!detalle) return []
  return Object.entries(detalle)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'object')
    .map(([, v]) => v as DetalleItem)
}

function resumenItems(detalle: Record<string, DetalleItem | string> | null): string {
  const items = itemsDeDetalle(detalle)
  if (items.length === 0) return '—'
  const primeros = items.slice(0, 3)
  const partes = primeros.map((e) => {
    if (e.peso_kg != null) return `${e.peso_kg} kg ${e.nombre}`
    return `${e.cantidad ?? 1}× ${e.nombre}`
  })
  if (items.length > 3) partes.push(`+${items.length - 3} más`)
  return partes.join(', ')
}

export function HistorialCalculos({ calculos: inicial, total: totalInicial, rol, categorias, empresas, refreshKey }: Props) {
  const esUsuarioLibre = rol === 'usuario_libre'
  const mostrarUsuario = rol === 'super_admin' || rol === 'empresa_admin'
  const [detalleAbierto, setDetalleAbierto] = useState<CalculoFila | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [data, setData] = useState<CalculoFila[]>(inicial)
  const [total, setTotal] = useState(totalInicial)
  const [pageSize, setPageSize] = useState(() => parseInt(searchParams.get('limit') ?? '20'))
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') ?? '1'))
  const { sorted: sortedData, sort, toggleSort } = useSortable(data as unknown as Record<string, unknown>[])
  const [desde, setDesde] = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(() => searchParams.get('hasta') ?? '')
  const [categoria, setCategoria] = useState(() => searchParams.get('categoria') ?? '')
  const [busqueda, setBusqueda] = useState(() => searchParams.get('search') ?? '')
  const [empresaFiltro, setEmpresaFiltro] = useState(() => searchParams.get('empresa_id') ?? '')
  const [isPending, startTransition] = useTransition()
  const [isSearching, setIsSearching] = useState(false)

  const totalPages = Math.ceil(total / pageSize)
  const hayFiltros = desde || hasta || categoria || empresaFiltro
  const debounceTimer = useRef<NodeJS.Timeout>()

  function sincronizarURL(params: {
    page?: number; desde?: string; hasta?: string
    categoria?: string; search?: string; empresa_id?: string
  }) {
    const sp = new URLSearchParams()
    const p = params.page ?? page
    if (p > 1) sp.set('page', String(p))
    const d = params.desde ?? desde
    if (d) sp.set('desde', d)
    const h = params.hasta ?? hasta
    if (h) sp.set('hasta', h)
    const c = params.categoria ?? categoria
    if (c) sp.set('categoria', c)
    const s = params.search ?? busqueda
    if (s) sp.set('search', s)
    const e = params.empresa_id ?? empresaFiltro
    if (e) sp.set('empresa_id', e)
    const qs = sp.toString()
    router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }

  const fetchHistorial = useCallback(
    async (newPage: number, newDesde: string, newHasta: string, newCategoria: string, newSearch: string, newEmpresa: string) => {
      const params = new URLSearchParams()
      params.set('page', String(newPage))
      params.set('limit', String(pageSize))
      if (newDesde) params.set('desde', newDesde)
      if (newHasta) params.set('hasta', newHasta)
      if (newCategoria) params.set('categoria', newCategoria)
      if (newSearch) params.set('search', newSearch)
      if (newEmpresa) params.set('empresa_id', newEmpresa)

      try {
        const res = await fetch(`/api/calculos?${params.toString()}`)
        if (!res.ok) return
        const json = await res.json()
        setData(json.data ?? [])
        setTotal(json.total ?? 0)
      } catch {
        // silencioso
      }
    },
    [pageSize]
  )

  // Debounce para búsqueda
  useEffect(() => {
    if (busqueda === '' && page === 1 && !desde && !hasta && !categoria && !empresaFiltro) return

    clearTimeout(debounceTimer.current)
    setIsSearching(true)

    debounceTimer.current = setTimeout(() => {
      startTransition(async () => {
        setPage(1)
        sincronizarURL({ page: 1, search: busqueda })
        await fetchHistorial(1, desde, hasta, categoria, busqueda, empresaFiltro)
        setIsSearching(false)
      })
    }, 500)

    return () => clearTimeout(debounceTimer.current)
  }, [busqueda, fetchHistorial]) // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarFiltros = useCallback(() => {
    startTransition(() => {
      setPage(1)
      sincronizarURL({ page: 1, desde, hasta, categoria, search: busqueda, empresa_id: empresaFiltro })
      fetchHistorial(1, desde, hasta, categoria, busqueda, empresaFiltro)
    })
  }, [desde, hasta, categoria, busqueda, empresaFiltro, fetchHistorial]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refrescar cuando se guarda un nuevo cálculo desde la Calculadora
  useEffect(() => {
    if (refreshKey === undefined || refreshKey === 0) return
    startTransition(() => {
      fetchHistorial(1, desde, hasta, categoria, busqueda, empresaFiltro)
    })
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const limpiarFiltros = useCallback(() => {
    setDesde('')
    setHasta('')
    setCategoria('')
    setBusqueda('')
    setEmpresaFiltro('')
    setPage(1)
    sincronizarURL({ page: 1, desde: '', hasta: '', categoria: '', search: '', empresa_id: '' })
    startTransition(() => {
      fetchHistorial(1, '', '', '', '', '')
    })
  }, [fetchHistorial]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarPagina = useCallback(
    (nueva: number) => {
      setPage(nueva)
      sincronizarURL({ page: nueva })
      startTransition(() => {
        fetchHistorial(nueva, desde, hasta, categoria, busqueda, empresaFiltro)
      })
    },
    [desde, hasta, categoria, busqueda, empresaFiltro, fetchHistorial] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div id="historial-calculos" style={{
      background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
      overflow: 'hidden', marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT_DARK, margin: '0 0 4px' }}>
              Historial de cálculos
            </h2>
            <p style={{ fontSize: 13, color: TEXT_MED, margin: 0 }}>
              {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
              {esUsuarioLibre && ' · máximo 15'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={pageSize}
              onChange={e => {
                const ps = parseInt(e.target.value)
                setPageSize(ps)
                setPage(1)
                startTransition(() => {
                  fetchHistorial(1, desde, hasta, categoria, busqueda, empresaFiltro)
                })
              }}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 13, outline: 'none' }}
              aria-label="Registros por página"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s} por página</option>)}
            </select>
            <BotonDescargar
              endpoint="/api/calculos/exportar"
              queryParams={new URLSearchParams({
                ...(desde && { desde }),
                ...(hasta && { hasta }),
                ...(categoria && { categoria }),
                ...(busqueda && { search: busqueda }),
                ...(empresaFiltro && { empresa_id: empresaFiltro }),
              }).toString()}
            />
          {/* Búsqueda rápida */}
          <div style={{ position: 'relative', minWidth: 200 }}>
            <div style={{
              position: 'absolute', left: 9, top: '50%',
              transform: 'translateY(-50%)', display: 'flex', alignItems: 'center'
            }}>
              {isSearching ? (
                <CircleNotch size={13} style={{ color: BRAND, animation: 'spin 1.5s linear infinite' }} />
              ) : (
                <MagnifyingGlass size={13} style={{ color: TEXT_MED }} />
              )}
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar objetos..."
              style={{
                paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7,
                borderRadius: 8, border: `1px solid ${BORDER}`,
                background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 13,
                width: '100%', outline: 'none',
              }}
            />
          </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {!esUsuarioLibre && (
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_MED, letterSpacing: '0.04em' }}>
              Desde
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: TEXT_MED, pointerEvents: 'none' }} />
              <input
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)}
                style={{
                  paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 13,
                  width: '100%', outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_MED, letterSpacing: '0.04em' }}>
              Hasta
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: TEXT_MED, pointerEvents: 'none' }} />
              <input
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)}
                style={{
                  paddingLeft: 28, paddingRight: 8, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 13,
                  width: '100%', outline: 'none',
                }}
              />
            </div>
          </div>

          {categorias.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_MED, letterSpacing: '0.04em' }}>
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 13, outline: 'none',
                }}
              >
                <option value="">Todas</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {empresas && empresas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_MED, letterSpacing: '0.04em' }}>
                Empresa
              </label>
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 13, outline: 'none',
                }}
              >
                <option value="">Todas las empresas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={aplicarFiltros}
              disabled={isPending}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: BRAND, color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                opacity: isPending ? 0.7 : 1,
              }}
            >
              <Funnel size={13} /> Filtrar
            </button>

            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                style={{
                  padding: '7px 12px', borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: 'transparent', color: TEXT_MED, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <X size={13} /> Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        {data.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: TEXT_MED }}>
            <p style={{ fontSize: 14, margin: 0 }}>
              {busqueda ? `Sin resultados para "${busqueda}".` : hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'Aún no tienes cálculos registrados.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: BG_LIGHT }}>
                <SortTh col="fecha" sort={sort} onToggle={toggleSort}>Fecha</SortTh>
                {mostrarUsuario && (
                  <SortTh col="usuario_nombre" sort={sort} onToggle={toggleSort}>Usuario</SortTh>
                )}
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: TEXT_MED }}>Objetos</th>
                <SortTh col="total_co2" sort={sort} onToggle={toggleSort} style={{ textAlign: 'right' }}>CO₂ evitado</SortTh>
              </tr>
            </thead>
            <tbody>
              {(sortedData as unknown as CalculoFila[]).map((c: CalculoFila, idx: number) => (
                <tr
                  key={c.id}
                  onClick={() => setDetalleAbierto(c)}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : `rgba(0,130,124,0.02)`,
                    borderBottom: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = `rgba(0,130,124,0.05)` }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? 'transparent' : `rgba(0,130,124,0.02)` }}
                >
                  <td style={{ padding: '10px 16px', color: TEXT_DARK, whiteSpace: 'nowrap' }}>
                    {formatFecha(c.fecha)}
                  </td>
                  {mostrarUsuario && (
                    <td style={{ padding: '10px 16px', color: TEXT_MED }}>
                      {c.usuario_nombre ?? '—'}
                    </td>
                  )}
                  <td style={{ padding: '10px 16px', color: TEXT_MED, maxWidth: 280 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {resumenItems(c.detalle_json)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: BRAND, whiteSpace: 'nowrap' }}>
                    {c.total_co2.toFixed(3)} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {!esUsuarioLibre && totalPages > 1 && (
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 13, color: TEXT_MED, margin: 0 }}>
            Página {page} de {totalPages}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => cambiarPagina(page - 1)}
              disabled={page === 1 || isPending}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
                background: 'var(--bg-card)', color: page === 1 ? TEXT_MED : TEXT_DARK,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CaretLeft size={16} />
            </button>
            <button
              onClick={() => cambiarPagina(page + 1)}
              disabled={page === totalPages || isPending}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
                background: 'var(--bg-card)', color: page === totalPages ? TEXT_MED : TEXT_DARK,
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CaretRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {detalleAbierto && (
        <DetalleModal
          calculo={detalleAbierto}
          onClose={() => setDetalleAbierto(null)}
        />
      )}
    </div>
  )
}

// ── Modal de detalle de cálculo ───────────────────────────────────────────────

function DetalleModal({ calculo, onClose }: { calculo: CalculoFila; onClose: () => void }) {
  const items = itemsDeDetalle(calculo.detalle_json)

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 100vw)',
        zIndex: 201,
        background: 'var(--bg-card)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header del panel */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT_MED, letterSpacing: '0.05em' }}>
              Detalle del cálculo
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: TEXT_DARK }}>
              {formatFecha(calculo.fecha)}
            </p>
            {calculo.usuario_nombre && (
              <p style={{ margin: '2px 0 0', fontSize: 13, color: TEXT_MED }}>
                {calculo.usuario_nombre}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: TEXT_MED,
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Totales destacados */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
          }}>
            <div style={{
              background: BRAND, borderRadius: 12, padding: '14px 16px', textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <Leaf size={16} color="rgba(255,255,255,0.8)" />
              </div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
                {calculo.total_co2.toFixed(3)}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>kg CO₂ evitados</p>
            </div>
            <div style={{
              background: BG_LIGHT, borderRadius: 12, padding: '14px 16px', textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <Drop size={16} color="#59A6E4" />
              </div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: TEXT_DARK }}>
                {calculo.total_agua.toFixed(0)}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: TEXT_MED }}>litros de agua</p>
            </div>
          </div>

          {/* Tabla de items */}
          {items.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MED, letterSpacing: '0.04em', margin: '0 0 10px' }}>
                Materiales reutilizados
              </p>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: BG_LIGHT }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: TEXT_MED }}>Material</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: TEXT_MED }}>Peso / Cant.</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: TEXT_MED }}>CO₂</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '8px 12px', color: TEXT_DARK }}>
                          <span style={{ fontWeight: 600 }}>{item.nombre}</span>
                          <span style={{ display: 'block', fontSize: 11, color: TEXT_MED }}>{item.categoria}</span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT_MED, whiteSpace: 'nowrap' }}>
                          {item.peso_kg != null
                            ? `${item.peso_kg} kg`
                            : `${item.cantidad ?? 1} u.`}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: BRAND, whiteSpace: 'nowrap' }}>
                          {item.co2.toFixed(3)} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Seguridad de Inalterabilidad Digital */}
          <div style={{ marginTop: 24, padding: '16px', borderRadius: 12, background: 'rgba(0,130,124,0.03)', border: '1px dashed rgba(0,130,124,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={14} color={BRAND} />
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT_DARK, letterSpacing: '0.04em' }}>
                Protección de Seguridad Permanente
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 10, color: TEXT_MED }}>SELLO DE SEGURIDAD (HUELLA ÚNICA)</p>
                <code style={{ fontSize: 10, color: TEXT_DARK, wordBreak: 'break-all', display: 'block', background: 'rgba(255,255,255,0.5)', padding: '4px 6px', borderRadius: 4 }}>
                  {calculo.hash_interno || 'FIRMA_INICIAL'}
                </code>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 10, color: TEXT_MED }}>CONEXIÓN DE SEGURIDAD ANTERIOR</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LinkIcon size={10} color={TEXT_MED} />
                  <code style={{ fontSize: 10, color: TEXT_MED, wordBreak: 'break-all', fontStyle: 'italic' }}>
                    {calculo.hash_previo || 'ORIGEN_REGISTRO'}
                  </code>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        body { overflow: hidden; }
      `}} />
    </>
  )
}
