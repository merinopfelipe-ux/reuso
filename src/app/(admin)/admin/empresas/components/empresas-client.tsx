'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink as ArrowSquareOut, Search as MagnifyingGlass, ChevronDown } from '@/components/ui/icons'
import { PlanBadge } from '@/components/admin/plan-badge'
import { BotonDescargar } from '@/components/boton-descargar'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import { Pagination } from '@/components/ui/pagination'
import { formatNumero } from '@/lib/format'
import type { Plan } from '@/types'

interface EmpresaStat {
  id: string; nombre: string; slug: string; plan: Plan; activa: boolean
  sector: string | null; notas_admin: string | null; created_at: string
  total_empleados: number; total_co2: number
}

const PLANES: Plan[] = ['free', 'lab', 'impulso', 'ilimitado']

interface Props {
  empresas: EmpresaStat[]
  total: number
  page: number
  pageSize: number
  search: string
  planFiltro: Plan | ''
}

export function EmpresasClient({ empresas, total, page, pageSize, search, planFiltro }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busquedaLocal, setBusquedaLocal] = useState(search)
  const [abiertoPlan, setAbiertoPlan] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const { sorted: empresasOrdenadas, sort, toggleSort } = useSortable(empresas as unknown as Record<string, unknown>[])

  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    setBusquedaLocal(search)
  }, [search])

  function navegar(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.search) sp.set('search', params.search)
    if (params.plan) sp.set('plan', params.plan)
    if (params.page && params.page !== '1') sp.set('page', params.page)
    if (params.pageSize && params.pageSize !== '25') sp.set('pageSize', params.pageSize)
    startTransition(() => router.push(`/admin/empresas?${sp.toString()}`))
  }

  function onBusquedaChange(val: string) {
    setBusquedaLocal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navegar({ search: val, plan: planFiltro, page: '1', pageSize: String(pageSize) })
    }, 300)
  }

  const queryParams = new URLSearchParams()
  if (search) queryParams.set('search', search)
  if (planFiltro) queryParams.set('plan', planFiltro)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={busquedaLocal}
            onChange={e => onBusquedaChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm outline-none transition-colors focus:border-[var(--color-brand)]"
          />
        </div>

        {/* Filtros: En celular 2 columnas, en desktop en línea */}
        <div className="grid grid-cols-2 sm:flex gap-3">
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setAbiertoPlan(v => !v)}
              className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span className="truncate">{planFiltro ? `Plan: ${planFiltro.charAt(0).toUpperCase() + planFiltro.slice(1)}` : 'Todos los planes'}</span>
              <ChevronDown size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
            </button>
            {abiertoPlan && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAbiertoPlan(false)} />
                <div className="absolute top-full left-0 mt-1.5 w-full sm:w-48 border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                  <div className="p-1 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => { navegar({ search: busquedaLocal, plan: '', page: '1', pageSize: String(pageSize) }); setAbiertoPlan(false) }}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                    >
                      Todos los planes
                    </button>
                    {PLANES.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { navegar({ search: busquedaLocal, plan: p, page: '1', pageSize: String(pageSize) }); setAbiertoPlan(false) }}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Botón Exportar */}
        <div className="w-full sm:w-auto sm:ml-auto flex">
          <div className="w-full sm:w-auto">
            <BotonDescargar endpoint="/api/admin/empresas/exportar" queryParams={queryParams.toString()} label="Exportar" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Tabla */}
        <div className="flex-1 min-w-0 rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                  <SortTh col="nombre" sort={sort} onToggle={toggleSort}>Empresa</SortTh>
                  <SortTh col="plan" sort={sort} onToggle={toggleSort}>Plan</SortTh>
                  <SortTh col="sector" sort={sort} onToggle={toggleSort}>Sector</SortTh>
                  <SortTh col="total_empleados" sort={sort} onToggle={toggleSort} align="right">Empleados</SortTh>
                  <SortTh col="total_co2" sort={sort} onToggle={toggleSort} align="right">CO₂ (kg)</SortTh>
                  <SortTh col="activa" sort={sort} onToggle={toggleSort} align="center">Estado</SortTh>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {empresasOrdenadas.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-brand)' }}>No hay empresas registradas.</td></tr>
                )}
                {(empresasOrdenadas as unknown as EmpresaStat[]).map((emp, idx) => (
                  <tr key={emp.id}
                    onClick={() => router.push(`/admin/empresas/${emp.id}`)}
                    className={`transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                      idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                    }`}
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">{emp.nombre}</td>
                    <td className="px-4 py-3"><PlanBadge plan={emp.plan} /></td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{emp.sector ?? '-'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-right">{formatNumero(emp.total_empleados)}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-right">{formatNumero(emp.total_co2, { unidad: 'kg' })}</td>
                    <td className="px-4 py-3 text-center">
                      <span style={{ 
                        padding: '2px 10px', 
                        borderRadius: 100, 
                        fontSize: 10, 
                        fontWeight: 800, 
                        background: emp.activa ? 'rgba(56,185,142,0.1)' : 'rgba(255,94,75,0.08)', 
                        color: emp.activa ? 'var(--color-success-content)' : 'var(--color-error-content)',
                        border: '1px solid currentColor',
                        opacity: 0.9,
                      }}>
                        {emp.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <a href={`/admin/empresas/${emp.id}`} title="Ver estado de cuenta" style={{ color: 'var(--color-brand)', display: 'inline-flex', alignItems: 'center' }}>
                        <ArrowSquareOut size={14} sinAnimacion />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación — componente único de la plataforma. Siempre después
              de la última fila (nunca antes de la tabla). El texto de conteo
              se acorta primero (min-width:0 + ellipsis) para que el
              paginador — con el selector "N por página" — nunca se
              comprima ni quede oculto detrás de un scroll (bug real
              reportado: había que scrollear para verlo). */}
          <div className="flex items-center justify-between gap-2 px-4 py-4 mt-1 border-t border-[var(--border-light)]">
            <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis min-w-0 text-[var(--text-secondary)]" style={{ flexShrink: 1 }}>
              {total} empresas · Página {page} de {Math.max(1, totalPages)}
            </span>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => navegar({ search: busquedaLocal, plan: planFiltro, page: String(p), pageSize: String(pageSize) })}
                porPagina={pageSize}
                onPorPaginaChange={(n) => navegar({ search: busquedaLocal, plan: planFiltro, page: '1', pageSize: String(n) })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
