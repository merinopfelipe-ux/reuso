'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { KpiCard } from '@/components/admin/kpi-card'
import { Button } from '@/components/ui/button'
import { Selector } from '@/components/ui/selector'
import { formatNumero } from '@/lib/format'
import {
  Mail,
  CursorClick,
  EnvelopeOpen,
  ArrowLeft,
  WarningCircle,
  MagnifyingGlass,
} from '@/components/ui/icons'

interface Destinatario {
  id: string
  email: string
  nombre: string | null
  empresa_nombre: string | null
  estado: string
  aperturas_count: number
  primera_apertura_at: string | null
  ultima_apertura_at: string | null
  clics_count: number
  primer_clic_at: string | null
  ultimo_clic_at: string | null
  desuscrito: boolean
  created_at: string
}

interface CorreoData {
  id: string
  asunto: string
  preheader: string | null
  cuerpo_html: string
  tipo: string
  segmento: string
  empresa_id: string | null
  destinatarios_count: number
  destinatarios_lista: string[] | null
  enviado_por: string | null
  estado: string
  error_mensaje: string | null
  total_aperturas?: number
  total_clics?: number
  total_desuscritos?: number
  created_at: string
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '-'
  }
}

export function CorreoDetalleClient({
  correo,
  destinatarios,
  empresaNombre,
  remitenteNombre,
}: {
  correo: CorreoData
  destinatarios: Destinatario[]
  empresaNombre: string | null
  remitenteNombre: string | null
}) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const porPagina = 20

  // Cálculo de KPIs
  const totalDestinatarios = destinatarios.length || correo.destinatarios_count || 0
  const totalAbiertos = destinatarios.filter(d => (d.aperturas_count > 0) || d.estado === 'abierto' || d.estado === 'clic').length
  const totalClics = destinatarios.filter(d => (d.clics_count > 0) || d.estado === 'clic').length
  const totalDesuscritos = destinatarios.filter(d => d.desuscrito || d.estado === 'desuscrito').length

  const tasaAperturaNum = totalDestinatarios > 0 ? (totalAbiertos / totalDestinatarios) * 100 : 0
  const tasaClicsNum = totalDestinatarios > 0 ? (totalClics / totalDestinatarios) * 100 : 0
  const tasaDesuscripcionNum = totalDestinatarios > 0 ? (totalDesuscritos / totalDestinatarios) * 100 : 0

  const tasaAperturaStr = `${formatNumero(tasaAperturaNum)} %`
  const tasaClicsStr = `${formatNumero(tasaClicsNum)} %`
  const tasaDesuscripcionStr = `${formatNumero(tasaDesuscripcionNum)} %`

  // Filtrado de destinatarios
  const destinatariosFiltrados = useMemo(() => {
    return destinatarios.filter(d => {
      const cumpleFiltro =
        filtroEstado === 'todos' ||
        (filtroEstado === 'abierto' && (d.aperturas_count > 0 || d.estado === 'abierto' || d.estado === 'clic')) ||
        (filtroEstado === 'clic' && (d.clics_count > 0 || d.estado === 'clic')) ||
        (filtroEstado === 'entregado' && d.estado === 'entregado' && d.aperturas_count === 0) ||
        (filtroEstado === 'desuscrito' && (d.desuscrito || d.estado === 'desuscrito'))

      const q = busqueda.toLowerCase().trim()
      const cumpleBusqueda =
        !q ||
        d.email.toLowerCase().includes(q) ||
        (d.nombre && d.nombre.toLowerCase().includes(q)) ||
        (d.empresa_nombre && d.empresa_nombre.toLowerCase().includes(q))

      return cumpleFiltro && cumpleBusqueda
    })
  }, [destinatarios, filtroEstado, busqueda])

  const totalPaginas = Math.ceil(destinatariosFiltrados.length / porPagina) || 1
  const inicio = (pagina - 1) * porPagina
  const destinatariosPaginados = destinatariosFiltrados.slice(inicio, inicio + porPagina)

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <AdminPageHeader
        titulo={correo.asunto}
        subtitulo={`Enviado el ${formatFecha(correo.created_at)} • Segmento: ${correo.segmento}${empresaNombre ? ` (${empresaNombre})` : ''}`}
        showBack
        accion={
          <Link href="/admin/correos">
            <Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Volver a correos
            </Button>
          </Link>
        }
      />

      {/* 4 KPIs de Rendimiento del Despacho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          titulo="Destinatarios Totales"
          valor={formatNumero(totalDestinatarios)}
          subtitulo="Volumen total despachado"
          icono={Mail}
        />
        <KpiCard
          titulo="Tasa de Apertura"
          valor={tasaAperturaStr}
          subtitulo={`${formatNumero(totalAbiertos)} contactos abrieron el correo`}
          icono={EnvelopeOpen}
        />
        <KpiCard
          titulo="Tasa de Clics (CTR)"
          valor={tasaClicsStr}
          subtitulo={`${formatNumero(totalClics)} interactuaron con enlaces`}
          icono={CursorClick}
        />
        <KpiCard
          titulo="Desuscripciones"
          valor={tasaDesuscripcionStr}
          subtitulo={`${formatNumero(totalDesuscritos)} bajas registradas`}
          icono={WarningCircle}
        />
      </div>

      {/* Layout Grid 3: 66% Tabla de Seguimiento / 33% Previsualización y Metadatos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Principal: Tabla de Destinatarios */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)] space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Trazabilidad por Destinatario
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Registro individual de entregabilidad, aperturas y clics en tiempo real.
                </p>
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => {
                      setBusqueda(e.target.value)
                      setPagina(1)
                    }}
                    placeholder="Buscar contacto..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>

                <div className="w-36">
                  <Selector
                    value={filtroEstado}
                    onChange={val => {
                      setFiltroEstado(val)
                      setPagina(1)
                    }}
                    opciones={[
                      { value: 'todos', label: 'Todos' },
                      { value: 'abierto', label: 'Abiertos' },
                      { value: 'clic', label: 'Con Clics' },
                      { value: 'entregado', label: 'Sin Abrir' },
                      { value: 'desuscrito', label: 'Desuscritos' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Tabla Estricta Reúso */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)] text-xs font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Destinatario</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Empresa</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Primera Apertura</th>
                    <th className="px-4 py-3 text-right">Aperturas</th>
                    <th className="px-4 py-3 text-right">Clics</th>
                  </tr>
                </thead>
                <tbody>
                  {destinatariosPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
                        No se encontraron destinatarios con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    destinatariosPaginados.map((d, idx) => {
                      const bgClass = idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-zebra)]'
                      return (
                        <tr
                          key={d.id || idx}
                          className={`${bgClass} hover:bg-[var(--bg-table-hover)] transition-colors`}
                          style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                        >
                          {/* Destinatario */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-[var(--text-primary)] text-xs">
                              {d.nombre || 'Sin nombre'}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                              {d.email}
                            </div>
                          </td>

                          {/* Empresa */}
                          <td className="px-4 py-3 text-xs text-[var(--text-secondary)] hidden md:table-cell">
                            {d.empresa_nombre || '-'}
                          </td>

                          {/* Estado de entrega */}
                          <td className="px-4 py-3 text-center">
                            {d.desuscrito || d.estado === 'desuscrito' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color-mix(in_srgb,var(--color-error)_12%,transparent)] text-[var(--color-error)]">
                                Desuscrito
                              </span>
                            ) : d.clics_count > 0 || d.estado === 'clic' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] font-semibold">
                                Clic registrado
                              </span>
                            ) : d.aperturas_count > 0 || d.estado === 'abierto' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]">
                                Abierto
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[color-mix(in_srgb,var(--text-secondary)_12%,transparent)] text-[var(--text-secondary)]">
                                Entregado
                              </span>
                            )}
                          </td>

                          {/* Primera apertura */}
                          <td className="px-4 py-3 text-center text-xs text-[var(--text-secondary)] font-mono">
                            {formatFecha(d.primera_apertura_at)}
                          </td>

                          {/* Veces abierto */}
                          <td className="px-4 py-3 text-right text-xs font-medium text-[var(--text-primary)]">
                            {formatNumero(d.aperturas_count)}
                          </td>

                          {/* Clics */}
                          <td className="px-4 py-3 text-right text-xs font-medium text-[var(--text-primary)]">
                            {formatNumero(d.clics_count)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación Desacoplada */}
            {totalPaginas > 1 && (
              <div className="overflow-x-auto min-w-0 border-t border-[var(--border-light)] pt-3 flex items-center justify-between gap-2 text-xs">
                <span className="text-[var(--text-secondary)]">
                  Página {pagina} de {totalPaginas} ({destinatariosFiltrados.length} contactos)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagina === 1}
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagina === totalPaginas}
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Lateral: Ficha Técnica y Vista Previa */}
        <div className="space-y-6">
          {/* Ficha Técnica */}
          <div className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Ficha del Despacho
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
                <span className="text-[var(--text-secondary)]">Estado del envío:</span>
                <span className="font-semibold text-[var(--color-brand)] capitalize">{correo.estado}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
                <span className="text-[var(--text-secondary)]">Tipo:</span>
                <span className="font-medium text-[var(--text-primary)] capitalize">{correo.tipo}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
                <span className="text-[var(--text-secondary)]">Segmento:</span>
                <span className="font-medium text-[var(--text-primary)]">{correo.segmento}</span>
              </div>

              {remitenteNombre && (
                <div className="flex justify-between py-1.5 border-b border-[var(--border-light)]">
                  <span className="text-[var(--text-secondary)]">Despachado por:</span>
                  <span className="font-medium text-[var(--text-primary)]">{remitenteNombre}</span>
                </div>
              )}

              {correo.preheader && (
                <div className="py-1.5 border-b border-[var(--border-light)]">
                  <span className="text-[var(--text-secondary)] block mb-1">Preheader:</span>
                  <span className="text-[var(--text-primary)] italic">{correo.preheader}</span>
                </div>
              )}
            </div>
          </div>

          {/* Vista Previa del Mensaje */}
          <div className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)] space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Contenido Enviado
            </h3>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-4 text-xs text-[var(--text-primary)] max-h-96 overflow-y-auto space-y-3">
              <div
                className="prose prose-sm max-w-none text-[var(--text-primary)]"
                dangerouslySetInnerHTML={{ __html: correo.cuerpo_html }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
