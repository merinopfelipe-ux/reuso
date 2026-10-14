'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink as ArrowSquareOut, Download } from '@/components/ui/icons'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import { CasillaCabecera, CasillaFila, BarraSeleccion } from '@/components/tabla/seleccion'
import { MenuFila } from '@/components/tabla/menu-fila'
import { formatFecha as formatFechaBase, formatNumero } from '@/lib/format'

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: '#38B98E' },
  en_reuso: { label: 'En reúso', color: '#00827C' },
  disposicion_final: { label: 'Disposición final', color: '#FF5E4B' },
  archivado: { label: 'Archivado', color: '#8AD0B2' },
}

export interface ActivoDppFila {
  id: string
  codigo_dpp: string | null
  nombre: string | null
  estado: string | null
  n_ciclos: number | null
  created_at: string
  updated_at: string | null
}

function formatFecha(iso: string) {
  return formatFechaBase(iso)
}

// Tabla de activos DPP: casilla para seleccionar, exportar la selección y un menú
// por fila (abrir el activo o su pasaporte público). No hay borrado de activos.
export function TablaDpp({ activos, co2Por }: { activos: ActivoDppFila[]; co2Por: Record<string, number> }) {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())

  const todas = activos.length > 0 && activos.every(a => seleccion.has(a.id))
  const algunas = activos.some(a => seleccion.has(a.id))
  const seleccionados = activos.filter(a => seleccion.has(a.id))

  function toggleTodas() {
    setSeleccion(prev => {
      const siguiente = new Set(prev)
      if (todas) activos.forEach(a => siguiente.delete(a.id))
      else activos.forEach(a => siguiente.add(a.id))
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
    return seleccionados.map(a => {
      const estado = ESTADO_CONFIG[a.estado ?? 'activo'] ?? ESTADO_CONFIG['activo']
      return {
        'Código DPP': a.codigo_dpp ?? '',
        Nombre: a.nombre ?? '',
        Estado: estado.label,
        Ciclos: a.n_ciclos ?? 0,
        'CO₂ eq evitado (kg)': co2Por[a.id] ?? 0,
        Actualizado: formatFecha(a.updated_at ?? a.created_at),
      }
    })
  }

  return (
    <>
      <BarraSeleccion cantidad={seleccionados.length} singular="activo" plural="activos" femenino={false}>
        <BotonDescargarCliente
          data={filasSeleccionadas()}
          nombre="activos_dpp_seleccionados"
          tituloPdf="Activos DPP seleccionados"
          label="Exportar"
          icon={<Download size={14} />}
        />
      </BarraSeleccion>

      <div className="rounded-card border border-(--border) bg-(--bg-card) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-(--bg-table-header) text-brand">
                <CasillaCabecera todas={todas} algunas={algunas} onToggle={toggleTodas} />
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Código DPP</th>
                <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Nombre</th>
                <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Estado</th>
                <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">Ciclos</th>
                <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">CO₂ eq evitado</th>
                <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Actualizado</th>
                <th className="px-1 py-2.5 w-8" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {activos.map((a, idx) => {
                const est = ESTADO_CONFIG[a.estado ?? 'activo'] ?? ESTADO_CONFIG['activo']
                const co2 = co2Por[a.id] ?? 0
                return (
                  <tr
                    key={a.id}
                    className={`transition-colors duration-150 hover:bg-(--bg-table-hover) ${
                      idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                    }`}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                  >
                    <CasillaFila marcada={seleccion.has(a.id)} onToggle={() => toggleFila(a.id)} label={`Seleccionar ${a.nombre ?? a.codigo_dpp ?? 'activo'}`} />
                    <td className="px-4 py-3">
                      <Link href={`/empresa/dpp/${a.id}`} className="font-mono text-xs font-semibold text-brand no-underline">
                        {a.codigo_dpp}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-(--text-primary)">
                      <Link href={`/empresa/dpp/${a.id}`} className="text-inherit no-underline">
                        {a.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span style={{
                        background: `${est.color}1A`, color: est.color,
                        padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      }}>
                        {est.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand text-right">
                      {a.n_ciclos ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: co2 > 0 ? 'var(--color-brand)' : 'var(--text-secondary)', fontWeight: co2 > 0 ? 700 : 400 }}>
                      {co2 > 0 ? formatNumero(co2, { unidad: 'kg' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-(--text-secondary) text-center">
                      {formatFecha(a.updated_at ?? a.created_at)}
                    </td>
                    <td className="px-1 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <MenuFila
                        label={`Acciones de ${a.nombre ?? a.codigo_dpp ?? 'este activo'}`}
                        acciones={[
                          { label: 'Abrir en nueva página', icono: <ArrowSquareOut size={13} />, href: `/empresa/dpp/${a.id}` },
                          ...(a.codigo_dpp
                            ? [{ label: 'Ver pasaporte público', icono: <ArrowSquareOut size={13} />, href: `/pasaporte/${a.codigo_dpp}` }]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
