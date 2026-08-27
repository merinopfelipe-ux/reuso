'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Send,
  Users,
  Eye,
  CheckCircle,
  Plus,
  Search as SearchIcon,
} from '@/components/ui/icons'
import { KpiCard } from '@/components/admin/kpi-card'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatFecha, formatNumero } from '@/lib/format'

export interface CorreoEnviado {
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
  created_at: string
}

const SEGMENTO_LABELS: Record<string, string> = {
  todos: 'Todos los usuarios',
  empresa_admin: 'Administradores de Empresa',
  empleado: 'Empleados / Colaboradores',
  usuario_libre: 'Usuarios Libres',
  empresa_especifica: 'Empresa específica',
  leads: 'Leads / Clientes potenciales',
  manual: 'Lista manual de correos',
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  comunicado: {
    label: 'Comunicado',
    color: '#00827C',
    bg: 'rgba(0,130,124,0.1)',
  },
  plataforma: {
    label: 'Plataforma',
    color: '#38B98E',
    bg: 'rgba(56,185,142,0.12)',
  },
  individual: {
    label: 'Individual',
    color: '#F6BF3E',
    bg: 'rgba(246,191,62,0.15)',
  },
}

export function CorreosClient({ correosIniciales }: { correosIniciales: CorreoEnviado[] }) {
  const [correos] = useState<CorreoEnviado[]>(correosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'comunicado' | 'plataforma' | 'individual'>('todos')
  const [correoSeleccionado, setCorreoSeleccionado] = useState<CorreoEnviado | null>(null)

  const totalDespachos = correos.length
  const totalDestinatarios = correos.reduce((sum, c) => sum + (c.destinatarios_count || 0), 0)
  const totalComunicados = correos.filter(c => c.tipo === 'comunicado').length
  const totalPlataforma = correos.filter(c => c.tipo === 'plataforma').length

  const filtrados = correos.filter(c => {
    const matchBusqueda =
      !busqueda ||
      c.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.preheader && c.preheader.toLowerCase().includes(busqueda.toLowerCase()))

    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchBusqueda && matchTipo
  })

  return (
    <div className="space-y-6">
      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Despachos realizados"
          valor={formatNumero(totalDespachos)}
          icono={Send}
        />
        <KpiCard
          titulo="Destinatarios alcanzados"
          valor={formatNumero(totalDestinatarios)}
          icono={Users}
          color="var(--color-brand)"
        />
        <KpiCard
          titulo="Comunicados oficiales"
          valor={formatNumero(totalComunicados)}
          icono={Mail}
          color="var(--color-info)"
        />
        <KpiCard
          titulo="Avisos de plataforma"
          valor={formatNumero(totalPlataforma)}
          icono={CheckCircle}
          color="var(--color-success)"
        />
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['todos', 'comunicado', 'plataforma', 'individual'] as const).map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFiltroTipo(tipo)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                filtroTipo === tipo
                  ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {tipo === 'todos' ? 'Todos los envíos' : TIPO_CONFIG[tipo]?.label ?? tipo}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por asunto..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
          />
        </div>
      </div>

      {/* Tabla de Envíos */}
      {filtrados.length === 0 ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <Mail size={36} className="mx-auto mb-3 text-[var(--text-secondary)] opacity-30" />
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            {busqueda ? 'No hay correos que coincidan con la búsqueda' : 'Aún no se han enviado correos'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Comienza redactando tu primer comunicado o aviso a usuarios y empresas.
          </p>
          <Link
            href="/admin/correos/nuevo"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-4 py-2 text-xs font-bold text-[var(--text-on-brand)] no-underline"
          >
            <Plus size={14} /> Redactar primer correo
          </Link>
        </div>
      ) : (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                  <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Asunto</th>
                  <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Tipo</th>
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Segmento</th>
                  <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">Destinatarios</th>
                  <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, idx) => {
                  const cfgTipo = TIPO_CONFIG[c.tipo] ?? TIPO_CONFIG.comunicado
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setCorreoSeleccionado(c)}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                        idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                      }`}
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-center whitespace-nowrap text-xs">
                        {formatFecha(c.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] font-medium max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {c.asunto}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          style={{
                            backgroundColor: cfgTipo.bg,
                            color: cfgTipo.color,
                            border: `1px solid ${cfgTipo.color}33`,
                          }}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block"
                        >
                          {cfgTipo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                        {SEGMENTO_LABELS[c.segmento] ?? c.segmento}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                        {formatNumero(c.destinatarios_count)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            c.estado === 'enviado'
                              ? 'bg-[rgba(56,185,142,0.12)] text-[#1F8C65]'
                              : c.estado === 'parcial'
                              ? 'bg-[rgba(246,191,62,0.15)] text-[#C79100]'
                              : 'bg-[rgba(255,94,75,0.12)] text-[#CC3C2A]'
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Link href={`/admin/correos/${c.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Eye size={13} />}
                            >
                              Métricas
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Correo */}
      {correoSeleccionado && (
        <Modal
          abierto={!!correoSeleccionado}
          onClose={() => setCorreoSeleccionado(null)}
          titulo={correoSeleccionado.asunto}
          descripcion={`Enviado el ${formatFecha(correoSeleccionado.created_at)} a ${formatNumero(correoSeleccionado.destinatarios_count)} destinatarios (${SEGMENTO_LABELS[correoSeleccionado.segmento] ?? correoSeleccionado.segmento}).`}
          textoConfirmar="Cerrar"
          onConfirmar={() => setCorreoSeleccionado(null)}
          icono={<Mail size={24} />}
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex justify-end">
              <Link href={`/admin/correos/${correoSeleccionado.id}`}>
                <Button variant="primary" size="sm" icon={<Eye size={13} />}>
                  Ver trazabilidad y métricas de apertura
                </Button>
              </Link>
            </div>
            {correoSeleccionado.preheader && (
              <div>
                <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                  Texto de previsualización (Preheader)
                </span>
                <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-input)] p-2 rounded-lg border border-[var(--border)]">
                  {correoSeleccionado.preheader}
                </p>
              </div>
            )}

            <div>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                Contenido del mensaje
              </span>
              <div
                className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: correoSeleccionado.cuerpo_html }}
              />
            </div>

            {correoSeleccionado.error_mensaje && (
              <div className="p-3 rounded-lg bg-[rgba(255,94,75,0.08)] border border-[rgba(255,94,75,0.25)] text-xs text-[#CC3C2A]">
                <p className="font-bold mb-0.5">Reporte de errores:</p>
                <p>{correoSeleccionado.error_mensaje}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
