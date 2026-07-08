'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { XIcon as X, ExternalLink as ArrowSquareOut, Search as MagnifyingGlass, ChevronLeft as CaretLeft, ChevronRight as CaretRight } from '@animateicons/react/lucide'
import { PlanBadge } from '@/components/admin/plan-badge'
import { BotonDescargar } from '@/components/boton-descargar'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import type { Plan } from '@/types'

const PAGE_SIZES = [10, 20, 50, 100]

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
  const [seleccionada, setSeleccionada] = useState<EmpresaStat | null>(null)
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [notasGuardadas, setNotasGuardadas] = useState(false)
  const [busquedaLocal, setBusquedaLocal] = useState(search)
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
    if (params.pageSize && params.pageSize !== '20') sp.set('pageSize', params.pageSize)
    startTransition(() => router.push(`/admin/empresas?${sp.toString()}`))
  }

  function onBusquedaChange(val: string) {
    setBusquedaLocal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navegar({ search: val, plan: planFiltro, page: '1' })
    }, 300)
  }

  function abrirDetalle(emp: EmpresaStat) {
    setSeleccionada(emp)
    setNotas(emp.notas_admin ?? '')
  }

  async function cambiarPlan(id: string, plan: Plan) {
    await fetch(`/api/admin/empresas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    startTransition(() => router.refresh())
    if (seleccionada?.id === id) setSeleccionada(prev => prev ? { ...prev, plan } : null)
  }

  async function guardarNotas() {
    if (!seleccionada) return
    setGuardando(true)
    setNotasGuardadas(false)
    await fetch(`/api/admin/empresas/${seleccionada.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas_admin: notas }),
    })
    setGuardando(false)
    setNotasGuardadas(true)
    startTransition(() => router.refresh())
    setTimeout(() => setNotasGuardadas(false), 3000)
  }

  async function toggleActiva(id: string, activa: boolean) {
    await fetch(`/api/admin/empresas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !activa }),
    })
    startTransition(() => router.refresh())
    if (seleccionada?.id === id) setSeleccionada(prev => prev ? { ...prev, activa: !activa } : null)
  }

  const queryParams = new URLSearchParams()
  if (search) queryParams.set('search', search)
  if (planFiltro) queryParams.set('plan', planFiltro)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <MagnifyingGlass size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-placeholder)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={busquedaLocal}
            onChange={e => onBusquedaChange(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-input)',
              color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={planFiltro}
          onChange={e => navegar({ search: busquedaLocal, plan: e.target.value, page: '1' })}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
        >
          <option value="">Todos los planes</option>
          {PLANES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>

        <select
          value={pageSize}
          onChange={e => navegar({ search: busquedaLocal, plan: planFiltro, page: '1', pageSize: e.target.value })}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          aria-label="Registros por página"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} por página</option>)}
        </select>

        <div style={{ marginLeft: 'auto' }}>
          <BotonDescargar endpoint="/api/admin/empresas/exportar" queryParams={queryParams.toString()} label="Exportar" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Tabla */}
        <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-integrated)', borderBottom: '1px solid var(--border)' }}>
                  <SortTh col="nombre" sort={sort} onToggle={toggleSort}>Empresa</SortTh>
                  <SortTh col="plan" sort={sort} onToggle={toggleSort}>Plan</SortTh>
                  <SortTh col="sector" sort={sort} onToggle={toggleSort}>Sector</SortTh>
                  <SortTh col="total_empleados" sort={sort} onToggle={toggleSort}>Empleados</SortTh>
                  <SortTh col="total_co2" sort={sort} onToggle={toggleSort}>CO₂ (kg)</SortTh>
                  <SortTh col="activa" sort={sort} onToggle={toggleSort}>Estado</SortTh>
                  <th style={{ padding: '10px 16px' }} />
                </tr>
              </thead>
              <tbody>
                {empresasOrdenadas.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay empresas registradas.</td></tr>
                )}
                {(empresasOrdenadas as unknown as EmpresaStat[]).map(emp => (
                  <tr key={emp.id}
                    onClick={() => abrirDetalle(emp)}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      background: seleccionada?.id === emp.id ? 'var(--bg-active)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (seleccionada?.id !== emp.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (seleccionada?.id !== emp.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.nombre}</td>
                    <td style={{ padding: '12px 16px' }}><PlanBadge plan={emp.plan} /></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{emp.sector ?? '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{emp.total_empleados}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-brand)', fontWeight: 600 }}>{emp.total_co2.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '2px 10px', 
                        borderRadius: 100, 
                        fontSize: 10, 
                        fontWeight: 800, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: emp.activa ? 'rgba(56,185,142,0.1)' : 'rgba(255,94,75,0.08)', 
                        color: emp.activa ? 'var(--color-success-content)' : 'var(--color-error-content)',
                        border: '1px solid currentColor',
                        opacity: 0.9,
                      }}>
                        {emp.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      <a href={`/admin/empresas/${emp.id}`} title="Ver estado de cuenta" style={{ color: 'var(--color-brand)', display: 'inline-flex', alignItems: 'center' }}>
                        <ArrowSquareOut size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {total} empresas · Página {page} de {Math.max(1, totalPages)}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => navegar({ search: busquedaLocal, plan: planFiltro, page: String(page - 1) })}
                  className="hover-pop hover-press"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: page <= 1 ? 'var(--text-placeholder)' : 'var(--text-primary)', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
                >
                  <CaretLeft size={14} /> Anterior
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => navegar({ search: busquedaLocal, plan: planFiltro, page: String(page + 1) })}
                  className="hover-slide-r hover-press"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: page >= totalPages ? 'var(--text-placeholder)' : 'var(--text-primary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}
                >
                  Siguiente <CaretRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel detalle */}
        {seleccionada && (
          <div style={{ width: 320, flexShrink: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{seleccionada.nombre}</p>
              <button onClick={() => setSeleccionada(null)}
                className="hover-rotate-90 hover-press"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {/* Plan */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Plan</label>
              <select
                value={seleccionada.plan}
                onChange={e => cambiarPlan(seleccionada.id, e.target.value as Plan)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }}
              >
                {PLANES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>

            {/* Toggle activa */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => toggleActiva(seleccionada.id, seleccionada.activa)}
                className="hover-pop hover-press"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: seleccionada.activa ? 'rgba(255,94,75,0.08)' : 'rgba(56,185,142,0.10)', color: seleccionada.activa ? '#CC3C2A' : '#1F8C65', width: '100%', justifyContent: 'center' }}>
                {seleccionada.activa ? 'Desactivar empresa' : 'Activar empresa'}
              </button>
            </div>

            {/* Link a estado de cuenta */}
            <div style={{ marginBottom: 16 }}>
              <a
                href={`/admin/empresas/${seleccionada.id}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--color-brand)', color: 'var(--color-brand)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                <ArrowSquareOut size={13} /> Ver estado de cuenta
              </a>
            </div>

            {/* Notas */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Notas de pago / admin</label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={5}
                placeholder="Anota pagos, acuerdos, etc."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button onClick={guardarNotas} disabled={guardando}
                className={guardando ? '' : 'hover-download hover-press'}
                style={{ marginTop: 8, padding: '7px 16px', borderRadius: 8, background: 'var(--color-brand)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%' }}>
                {guardando ? 'Guardando...' : 'Guardar notas'}
              </button>
              {notasGuardadas && (
                <p style={{ fontSize: 12, color: '#1F8C65', marginTop: 6, textAlign: 'center' }}>Notas guardadas correctamente.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
