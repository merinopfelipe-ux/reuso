'use client'

import { useState, useCallback, useTransition, useEffect, useRef } from 'react'
import { Calendar, Filter as Funnel, X, Search as MagnifyingGlass, Loader2 as CircleNotch, Leaf, Droplet as Drop, ShieldCheck, Link as LinkIcon } from '@/components/ui/icons'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { BotonDescargar } from '@/components/boton-descargar'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import { Pagination } from '@/components/ui/pagination'
import { formatFecha, formatNumero } from '@/lib/format'
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


function itemsDeDetalle(detalle: Record<string, DetalleItem | string> | null): DetalleItem[] {
  if (!detalle) return []
  return Object.entries(detalle)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'object')
    .map(([, v]) => v as DetalleItem)
}

function resumenItems(detalle: Record<string, DetalleItem | string> | null): string {
  const items = itemsDeDetalle(detalle)
  if (items.length === 0) return '-'
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
  const [pageSize, setPageSize] = useState(() => parseInt(searchParams.get('limit') ?? '25'))
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

  function cambiarPageSize(nuevo: number) {
    setPageSize(nuevo)
    setPage(1)
    startTransition(() => {
      fetchHistorial(1, desde, hasta, categoria, busqueda, empresaFiltro)
    })
  }

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
            <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_MED }}>
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
            <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_MED }}>
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
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_MED }}>
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
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_MED }}>
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
              <Funnel size={13} sinAnimacion /> Filtrar
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
                <X size={13} sinAnimacion /> Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto border-t border-[var(--border)]">
        {data.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: TEXT_MED }}>
            <p style={{ fontSize: 14, margin: 0 }}>
              {busqueda ? `Sin resultados para "${busqueda}".` : hayFiltros ? 'Sin resultados para los filtros aplicados.' : 'Aún no tienes cálculos registrados.'}
            </p>
          </div>
        ) : (
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                  <SortTh col="fecha" sort={sort} onToggle={toggleSort} align="center">Fecha</SortTh>
                  {mostrarUsuario && (
                    <SortTh col="usuario_nombre" sort={sort} onToggle={toggleSort}>Usuario</SortTh>
                  )}
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Objetos</th>
                  <SortTh col="total_co2" sort={sort} onToggle={toggleSort} align="right">CO₂ eq evitado</SortTh>
                </tr>
              </thead>
              <tbody>
                {(sortedData as unknown as CalculoFila[]).map((c: CalculoFila, idx: number) => {
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setDetalleAbierto(c)}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                        idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                      }`}
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] text-center">
                        {formatFecha(c.fecha)}
                      </td>
                      {mostrarUsuario && (
                        <td className="px-4 py-3 text-[var(--color-brand)]">
                          {c.usuario_nombre ?? '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-[var(--text-secondary)]" style={{ maxWidth: 280 }}>
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                          {resumenItems(c.detalle_json)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--color-brand)] text-right whitespace-nowrap">
                        {formatNumero(c.total_co2, { unidad: 'kg' })}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación — componente único de la plataforma. Siempre después de
          la última fila. El conteo se acorta primero (min-width:0 +
          ellipsis) para que el paginador nunca se comprima ni quede oculto
          detrás de un scroll. */}
      {!esUsuarioLibre && (totalPages > 1 || total > 0) && (
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <p style={{ fontSize: 13, color: TEXT_MED, margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
            Página {page} de {Math.max(1, totalPages)}
          </p>
          <div style={{ flexShrink: 0 }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={cambiarPagina}
              porPagina={pageSize}
              onPorPaginaChange={cambiarPageSize}
            />
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
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: TEXT_MED }}>
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
            className="hover-rotate-90 hover-press"
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
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>kg CO₂ eq evitados</p>
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
              <p style={{ margin: 0, fontSize: 12, color: TEXT_MED }}>litros de agua</p>
            </div>
          </div>

          {/* Tabla de items */}
          {items.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_MED, margin: '0 0 10px' }}>
                Materiales reutilizados
              </p>
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Material</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">Peso / Cant.</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">CO₂ eq</th>
                      </tr>
                    </thead>
                  <tbody>
                    {items.map((item, i) => {
                      return (
                        <tr
                          key={i}
                          className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                            i % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                          }`}
                          style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
                        >
                          <td className="px-4 py-3 text-[var(--text-primary)]">
                            <div className="flex items-start gap-2">
                              <div>
                                <span className="block font-semibold">{item.nombre}</span>
                                <span className="block text-xs text-[var(--text-secondary)]">{item.categoria}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)] text-right whitespace-nowrap">
                            {item.peso_kg != null
                              ? formatNumero(item.peso_kg, { unidad: 'kg' })
                              : `${item.cantidad ?? 1} u.`}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[var(--color-brand)] text-right whitespace-nowrap">
                            {formatNumero(item.co2, { unidad: 'kg' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* Seguridad de Inalterabilidad Digital */}
          <div style={{ marginTop: 24, padding: '16px', borderRadius: 12, background: 'rgba(0,130,124,0.03)', border: '1px dashed rgba(0,130,124,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={14} color={BRAND} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT_DARK }}>
                Protección de Seguridad Permanente
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: TEXT_MED }}>SELLO DE SEGURIDAD (HUELLA ÚNICA)</p>
                <code style={{ fontSize: 12, color: TEXT_DARK, wordBreak: 'break-all', display: 'block', background: 'rgba(255,255,255,0.5)', padding: '4px 6px', borderRadius: 4 }}>
                  {calculo.hash_interno || 'FIRMA_INICIAL'}
                </code>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: TEXT_MED }}>CONEXIÓN DE SEGURIDAD ANTERIOR</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LinkIcon size={10} color={TEXT_MED} />
                  <code style={{ fontSize: 12, color: TEXT_MED, wordBreak: 'break-all', fontStyle: 'italic' }}>
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
