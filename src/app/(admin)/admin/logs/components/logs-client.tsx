'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Filter as Funnel, Download, Copy } from '@/components/ui/icons'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import { CasillaCabecera, CasillaFila, BarraSeleccion } from '@/components/tabla/seleccion'
import { MenuFila } from '@/components/tabla/menu-fila'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import { Pagination } from '@/components/ui/pagination'
import { Selector } from '@/components/ui/selector'
import { formatFecha as formatFechaBase } from '@/lib/format'
import type { LogAuditoria } from '@/types'

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

  // Los logs de auditoría no se borran desde aquí: solo se seleccionan para exportar.
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const logsPagina = logsOrdenados as unknown as LogAuditoria[]
  const todasPagina = logsPagina.length > 0 && logsPagina.every(l => seleccion.has(l.id))
  const algunasPagina = logsPagina.some(l => seleccion.has(l.id))
  const seleccionados = useMemo(() => logsPagina.filter(l => seleccion.has(l.id)), [logsPagina, seleccion])

  function toggleTodas() {
    setSeleccion(prev => {
      const siguiente = new Set(prev)
      if (todasPagina) logsPagina.forEach(l => siguiente.delete(l.id))
      else logsPagina.forEach(l => siguiente.add(l.id))
      return siguiente
    })
  }

  function toggleFila(id: string) {
    setSeleccion(prev => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  function filasSeleccionadas() {
    return seleccionados.map(l => ({
      Fecha: formatFecha(l.created_at),
      Acción: l.accion,
      Usuario: l.user_id ?? '',
      IP: l.ip ?? '',
      Detalle: JSON.stringify(l.detalle_json),
    }))
  }

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
    if (ps !== '25') sp.set('pageSize', ps)
    startTransition(() => router.push(`/admin/logs?${sp.toString()}`))
  }

  function limpiar() {
    startTransition(() => router.push('/admin/logs'))
  }

  function formatFecha(iso: string) {
    return formatFechaBase(iso, { conHora: true })
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
        <Funnel size={15} style={{ color: 'var(--color-brand)' }} />
        <div style={{ minWidth: 200 }}>
          <Selector
            tamano="sm"
            value={accionFiltro}
            onChange={val => navegar({ accion: val, page: '1' })}
            placeholder="Todas las acciones"
            opciones={[
              { value: '', label: 'Todas las acciones' },
              ...accionesDisponibles.map(a => ({ value: a, label: a })),
            ]}
          />
        </div>
        <input type="date" style={inputSt} value={desde}
          onChange={e => navegar({ desde: e.target.value, page: '1' })} title="Desde" />
        <input type="date" style={inputSt} value={hasta}
          onChange={e => navegar({ hasta: e.target.value, page: '1' })} title="Hasta" />
        {hayFiltros && (
          <button onClick={limpiar}
            style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Limpiar
          </button>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          {total} registros
        </span>
      </div>

        <BarraSeleccion cantidad={seleccionados.length} singular="registro" plural="registros" femenino={false}>
          <BotonDescargarCliente
            data={filasSeleccionadas()}
            nombre="logs_seleccionados"
            tituloPdf="Registros de auditoría seleccionados"
            label="Exportar"
            icon={<Download size={14} />}
          />
        </BarraSeleccion>
      <div className="rounded-card border border-(--border) bg-(--bg-card) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-(--bg-table-header) text-brand">
                <CasillaCabecera todas={todasPagina} algunas={algunasPagina} onToggle={toggleTodas} />
                <SortTh col="created_at" sort={sort} onToggle={toggleSort} align="center">Fecha</SortTh>
                <SortTh col="accion" sort={sort} onToggle={toggleSort}>Acción</SortTh>
                <SortTh col="user_id" sort={sort} onToggle={toggleSort}>Usuario</SortTh>
                <SortTh col="ip" sort={sort} onToggle={toggleSort} align="center">IP</SortTh>
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Detalle</th>
                <th className="px-1 py-2.5 w-8" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {logsOrdenados.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay logs que coincidan con los filtros.
                </td></tr>
              )}
              {(logsOrdenados as unknown as LogAuditoria[]).map((log, idx) => {
                return (
                  <tr
                    key={log.id}
                    className={`cursor-pointer transition-colors duration-150 hover:bg-(--bg-table-hover) ${
                      idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                    }`}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                  >
                    <CasillaFila marcada={seleccion.has(log.id)} onToggle={() => toggleFila(log.id)} label={`Seleccionar registro ${log.accion}`} />
                    <td className="px-4 py-3 whitespace-nowrap text-center text-(--text-secondary)">
                      {formatFecha(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-[11px] bg-(--bg-hover) px-1.5 py-0.5 rounded-[4px] text-(--text-primary)">
                        {log.accion}
                      </code>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {log.user_id?.slice(0, 8) ?? '-'}...
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-(--text-secondary)">
                      {log.ip ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-(--text-secondary) max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {JSON.stringify(log.detalle_json)}
                    </td>
                    <td className="px-1 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <MenuFila
                        label={`Acciones del registro ${log.accion}`}
                        acciones={[
                          {
                            label: 'Copiar detalle',
                            icono: <Copy size={13} />,
                            onClick: () => navigator.clipboard?.writeText(JSON.stringify(log.detalle_json, null, 2)),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación — componente único de la plataforma. Siempre después
            de la última fila. El conteo se acorta primero (min-width:0 +
            ellipsis) para que el paginador nunca se comprima ni quede
            oculto detrás de un scroll. */}
        <div className="flex items-center justify-between gap-2 px-4 py-4 mt-1 border-t border-(--border-light)">
          <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis min-w-0 text-(--text-secondary)" style={{ flexShrink: 1 }}>
            {total} registros · Página {page} de {Math.max(1, totalPages)}
          </span>
          <div className="min-w-0 max-w-full overflow-x-auto">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => navegar({ page: String(p) })}
              porPagina={pageSize}
              onPorPaginaChange={(n) => navegar({ page: '1', pageSize: String(n) })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
