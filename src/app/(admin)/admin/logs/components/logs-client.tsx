'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Filter as Funnel,
  ChevronLeft as CaretLeft,
  ChevronRight as CaretRight,
} from 'lucide-react'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import type { LogAuditoria } from '@/types'

const PAGE_SIZES = [10, 20, 50, 100]

interface Props {
  logs: LogAuditoria[]
  total: number
  page: number
  pageSize: number
  accionFiltro: string
  desde: string
  hasta: string
  accionesDisponibles: string[]
}

export function LogsClient({ logs, total, page, pageSize, accionFiltro, desde, hasta, accionesDisponibles }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const { sorted: logsOrdenados, sort, toggleSort } = useSortable(logs as unknown as Record<string, unknown>[])

  const totalPages = Math.ceil(total / pageSize)

  function navegar(params: { accion?: string; desde?: string; hasta?: string; page?: string; pageSize?: string }) {
    const sp = new URLSearchParams()
    const a = params.accion ?? accionFiltro
    const d = params.desde ?? desde
    const h = params.hasta ?? hasta
    const p = params.page ?? '1'
    const ps = params.pageSize ?? String(pageSize)
    if (a) sp.set('accion', a)
    if (d) sp.set('desde', d)
    if (h) sp.set('hasta', h)
    if (p !== '1') sp.set('page', p)
    if (ps !== '20') sp.set('pageSize', ps)
    startTransition(() => router.push(`/admin/logs?${sp.toString()}`))
  }

  function limpiar() {
    startTransition(() => router.push('/admin/logs'))
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const inputSt: React.CSSProperties = {
    padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  }

  const hayFiltros = accionFiltro || desde || hasta

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <Funnel size={15} style={{ color: 'var(--text-secondary)' }} />
        <select style={inputSt} value={accionFiltro} onChange={e => navegar({ accion: e.target.value, page: '1' })}>
          <option value="">Todas las acciones</option>
          {accionesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" style={inputSt} value={desde}
          onChange={e => navegar({ desde: e.target.value, page: '1' })} title="Desde" />
        <input type="date" style={inputSt} value={hasta}
          onChange={e => navegar({ hasta: e.target.value, page: '1' })} title="Hasta" />
        <select
          value={pageSize}
          onChange={e => navegar({ page: '1', pageSize: e.target.value })}
          style={inputSt}
          aria-label="Registros por página"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} por página</option>)}
        </select>
        {hayFiltros && (
          <button onClick={limpiar}
            className="hover-pop hover-press"
            style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Limpiar
          </button>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          {total} registros
        </span>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <SortTh col="created_at" sort={sort} onToggle={toggleSort}>Fecha</SortTh>
                <SortTh col="accion" sort={sort} onToggle={toggleSort}>Acción</SortTh>
                <SortTh col="user_id" sort={sort} onToggle={toggleSort}>Usuario</SortTh>
                <SortTh col="ip" sort={sort} onToggle={toggleSort}>IP</SortTh>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logsOrdenados.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay logs que coincidan con los filtros.
                </td></tr>
              )}
              {(logsOrdenados as unknown as LogAuditoria[]).map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatFecha(log.created_at)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <code style={{ fontSize: 11, background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-brand)' }}>
                      {log.accion}
                    </code>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                    {log.user_id?.slice(0, 8) ?? '-'}...
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-placeholder)', fontSize: 12 }}>
                    {log.ip ?? '-'}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(log.detalle_json)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {total} registros · Página {page} de {Math.max(1, totalPages)}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={page <= 1}
                onClick={() => navegar({ page: String(page - 1) })}
                className="hover-pop hover-press"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: page <= 1 ? 'var(--text-placeholder)' : 'var(--text-primary)', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                <CaretLeft size={14} /> Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => navegar({ page: String(page + 1) })}
                className="hover-slide-r hover-press"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: page >= totalPages ? 'var(--text-placeholder)' : 'var(--text-primary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                Siguiente <CaretRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
