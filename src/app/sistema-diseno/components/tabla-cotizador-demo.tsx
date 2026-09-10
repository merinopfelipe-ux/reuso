'use client'

import React, { useState, useMemo } from 'react'
import {
  ToolbarVistas,
  ColumnaHeaderMenu,
} from '@/app/(empresa)/empresa/cotizador/components/toolbar-vistas'
import {
  definicionDe,
  anchoColumna,
  alineacionColumna,
  type ClaveColumna,
  type VistaCotizador,
  type CotizacionParaVista,
} from '@/lib/cotizador/vistas'
import { formatCOP, formatNumero, formatFecha, formatHora } from '@/lib/format'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { formatTelefonoVista } from '@/lib/telefono'
import { Pagination } from '@/components/ui/pagination'
import { SquareCheck, Square, CaretRight, Trash, Share2 } from '@/components/ui/icons'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import { Modal } from '@/components/ui/modal'

const ESTADOS: { key: string; label: string; color: string }[] = [
  { key: 'por_cotizar', label: 'Por cotizar', color: 'text-[#474747]/60 bg-[#474747]/08' },
  { key: 'enviada', label: 'Enviada', color: 'text-[#59A6E4] bg-[#59A6E4]/10' },
  { key: 'en_negociacion', label: 'En negociación', color: 'text-[#F6BF3E] bg-[#F6BF3E]/10' },
  { key: 'esperando_anticipo', label: 'Esperando anticipo', color: 'text-[#38B98E] bg-[#38B98E]/10' },
  { key: 'cerrado_ganado', label: 'Cerrado ganado', color: 'text-[#00827C] bg-[#00827C]/10' },
  { key: 'cerrado_perdido', label: 'Cerrado perdido', color: 'text-[#FF5E4B] bg-[#FF5E4B]/10' },
  { key: 'cerrado_inviable', label: 'Inviable', color: 'text-[#474747]/40 bg-[#474747]/05' },
]

function FechaColumna({ iso }: { iso: string | null }) {
  return (
    <>
      <span className="whitespace-nowrap">{formatFecha(iso)}</span>{' '}
      <span className="whitespace-nowrap">{formatHora(iso)}</span>
    </>
  )
}

const COTIZACIONES_DEMO: CotizacionParaVista[] = [
  {
    id: 'demo-cot-001',
    codigo_cotizacion: 'COT-2026-001',
    estado: 'cerrado_ganado',
    total: 8450000,
    co2_evitado_total_kg: 142.5,
    created_at: '2026-04-14T10:30:00Z',
    updated_at: '2026-04-14T15:20:00Z',
    fecha_enviada: '2026-04-14T11:00:00Z',
    fecha_apertura_cliente: '2026-04-14T12:15:00Z',
    fecha_ultima_apertura_cliente: '2026-04-14T16:00:00Z',
    fecha_cierre: '2026-04-14T17:00:00Z',
    veces_abierta: 4,
    crm_clientes: {
      nombre: 'Grupo Hotelero',
      apellido: 'del Café S.A.S.',
      telefono: '3104567890',
      telefono_indicativo: '+57',
      email: 'compras@hotelcafecolombia.com',
      crm_empresas_clientes: { razon_social: 'Grupo Hotelero del Café S.A.S.', nombre_comercial: 'Hoteles del Café' },
    },
  },
  {
    id: 'demo-cot-002',
    codigo_cotizacion: 'COT-2026-002',
    estado: 'en_negociacion',
    total: 4200000,
    co2_evitado_total_kg: 78.2,
    created_at: '2026-04-13T09:15:00Z',
    updated_at: '2026-04-13T14:40:00Z',
    fecha_enviada: '2026-04-13T10:00:00Z',
    fecha_apertura_cliente: '2026-04-13T11:30:00Z',
    fecha_ultima_apertura_cliente: '2026-04-13T17:20:00Z',
    fecha_cierre: null,
    veces_abierta: 6,
    crm_clientes: {
      nombre: 'Oficinas Ecoeficientes',
      apellido: 'Bogotá',
      telefono: '3209876543',
      telefono_indicativo: '+57',
      email: 'contacto@ecooficinas.co',
      crm_empresas_clientes: { razon_social: 'Oficinas Ecoeficientes Bogotá S.A.S.', nombre_comercial: 'EcoOficinas' },
    },
  },
  {
    id: 'demo-cot-003',
    codigo_cotizacion: 'COT-2026-003',
    estado: 'enviada',
    total: 1850000,
    co2_evitado_total_kg: 31.0,
    created_at: '2026-04-11T14:00:00Z',
    updated_at: '2026-04-11T14:30:00Z',
    fecha_enviada: '2026-04-11T14:30:00Z',
    fecha_apertura_cliente: '2026-04-12T08:45:00Z',
    fecha_ultima_apertura_cliente: '2026-04-12T08:45:00Z',
    fecha_cierre: null,
    veces_abierta: 2,
    crm_clientes: {
      nombre: 'Restaurante Bio-Verde',
      apellido: 'S.A.S.',
      telefono: '3156781234',
      telefono_indicativo: '+57',
      email: 'gerencia@bioverde.com.co',
      crm_empresas_clientes: { razon_social: 'Restaurante Bio-Verde S.A.S.', nombre_comercial: 'Bio-Verde' },
    },
  },
  {
    id: 'demo-cot-004',
    codigo_cotizacion: 'COT-2026-004',
    estado: 'esperando_anticipo',
    total: 12300000,
    co2_evitado_total_kg: 215.8,
    created_at: '2026-04-09T11:20:00Z',
    updated_at: '2026-04-10T16:00:00Z',
    fecha_enviada: '2026-04-09T12:00:00Z',
    fecha_apertura_cliente: '2026-04-09T15:10:00Z',
    fecha_ultima_apertura_cliente: '2026-04-10T11:30:00Z',
    fecha_cierre: null,
    veces_abierta: 5,
    crm_clientes: {
      nombre: 'Corporación Andes',
      apellido: 'Circular',
      telefono: '3112345678',
      telefono_indicativo: '+57',
      email: 'sostenibilidad@andescircular.org',
      crm_empresas_clientes: { razon_social: 'Corporación Andes Circular', nombre_comercial: 'Andes Circular' },
    },
  },
  {
    id: 'demo-cot-005',
    codigo_cotizacion: 'COT-2026-005',
    estado: 'por_cotizar',
    total: 6700000,
    co2_evitado_total_kg: 110.4,
    created_at: '2026-04-07T08:30:00Z',
    updated_at: '2026-04-07T09:00:00Z',
    fecha_enviada: null,
    fecha_apertura_cliente: null,
    fecha_ultima_apertura_cliente: null,
    fecha_cierre: null,
    veces_abierta: 0,
    crm_clientes: {
      nombre: 'Textil & Cuero',
      apellido: 'Sostenible',
      telefono: '3187654321',
      telefono_indicativo: '+57',
      email: 'diseno@textilcuero.com',
      crm_empresas_clientes: { razon_social: 'Textil & Cuero Sostenible S.A.S.', nombre_comercial: 'Textil Circular' },
    },
  },
  {
    id: 'demo-cot-006',
    codigo_cotizacion: 'COT-2026-006',
    estado: 'cerrado_ganado',
    total: 9150000,
    co2_evitado_total_kg: 164.2,
    created_at: '2026-04-05T16:00:00Z',
    updated_at: '2026-04-06T10:15:00Z',
    fecha_enviada: '2026-04-05T16:30:00Z',
    fecha_apertura_cliente: '2026-04-05T18:00:00Z',
    fecha_ultima_apertura_cliente: '2026-04-06T09:30:00Z',
    fecha_cierre: '2026-04-06T10:00:00Z',
    veces_abierta: 3,
    crm_clientes: {
      nombre: 'Mobiliario Urbano',
      apellido: 'Medellín',
      telefono: '3001234567',
      telefono_indicativo: '+57',
      email: 'obras@mobiliariomedellin.co',
      crm_empresas_clientes: { razon_social: 'Mobiliario Urbano Medellín S.A.', nombre_comercial: 'Mobiliario Urbano' },
    },
  },
  {
    id: 'demo-cot-007',
    codigo_cotizacion: 'COT-2026-007',
    estado: 'en_negociacion',
    total: 3400000,
    co2_evitado_total_kg: 52.8,
    created_at: '2026-04-03T11:45:00Z',
    updated_at: '2026-04-04T13:20:00Z',
    fecha_enviada: '2026-04-03T12:15:00Z',
    fecha_apertura_cliente: '2026-04-03T14:00:00Z',
    fecha_ultima_apertura_cliente: '2026-04-04T12:00:00Z',
    fecha_cierre: null,
    veces_abierta: 4,
    crm_clientes: {
      nombre: 'Coworking Verde',
      apellido: 'Poblado',
      telefono: '3139871122',
      telefono_indicativo: '+57',
      email: 'administracion@coworkingverde.com',
      crm_empresas_clientes: { razon_social: 'Coworking Verde Poblado S.A.S.', nombre_comercial: 'Verde Cowork' },
    },
  },
]

const VISTA_INICIAL: VistaCotizador = {
  id: 'vista-default',
  nombre: 'Todas las cotizaciones',
  columnas: ['codigo_cotizacion', 'cliente_nombre', 'estado', 'total', 'co2_evitado_total_kg', 'created_at'],
  orden: { campo: 'created_at', dir: 'desc' },
  filtros: [],
}

function renderCeldaColumna(clave: ClaveColumna, c: CotizacionParaVista): React.ReactNode {
  const def = definicionDe(clave)
  const valor = def.accessor(c)
  const tipo = def.tipo
  if (clave === 'estado') {
    const info = ESTADOS.find(e => e.key === c.estado)
    if (!info) return '—'
    const label = c.estado === 'por_cotizar' ? 'Borrador' : info.label
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{label}</span>
  }
  if (clave === 'codigo_cotizacion') {
    return <span className="whitespace-nowrap">{formatCodigoCotizacion(c.codigo_cotizacion)}</span>
  }
  if (clave === 'cliente_nombre') {
    const nom = c.crm_clientes?.nombre
    if (!nom) return '—'
    const ape = c.crm_clientes?.apellido
    if (!ape) return <>{nom}</>
    return (
      <>
        <span className="whitespace-nowrap">{nom}</span>{' '}
        <span className="whitespace-nowrap">{ape}</span>
      </>
    )
  }
  if (clave === 'cliente_telefono') {
    if (!c.crm_clientes?.telefono) return '—'
    const dial = c.crm_clientes.telefono_indicativo ?? '+57'
    return <span className="whitespace-nowrap">{formatTelefonoVista(c.crm_clientes.telefono, dial)}</span>
  }
  if (tipo === 'fecha') return <FechaColumna iso={valor as string | null} />
  if (clave === 'total') return <span className="font-bold">{formatCOP(Number(valor ?? 0))}</span>
  if (clave === 'co2_evitado_total_kg') return formatNumero(Number(valor ?? 0), { unidad: 'kg CO2 eq' })
  if (clave === 'dias_para_cierre') return valor == null ? '—' : `${valor} d`
  return (valor ?? '—') as string
}

export function TablaCotizadorDemo() {
  const [busqueda, setBusqueda] = useState('')
  const [borrador, setBorrador] = useState<VistaCotizador>(VISTA_INICIAL)
  const [columnaFija, setColumnaFija] = useState<ClaveColumna | null>(null)
  const [densidad, setDensidad] = useState<'comoda' | 'compacta'>('comoda')
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(5)
  const [datos, setDatos] = useState<CotizacionParaVista[]>(COTIZACIONES_DEMO)

  const paddingY = densidad === 'compacta' ? 'py-1' : 'py-2.5'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'
  const ts = 'text-[var(--text-secondary)]'
  const tp = 'text-[var(--text-primary)]'

  const columnasVisibles = borrador.columnas

  // Mock vistasHook idéntico a useVistas para conectar ToolbarVistas
  const vistasHook = useMemo(() => ({
    vistas: [VISTA_INICIAL],
    vistaActivaId: 'vista-default',
    borrador,
    setBorrador,
    sinGuardar: false,
    cambiarVistaActiva: () => {},
    guardar: () => {},
    crear: () => {},
    duplicar: () => {},
    eliminar: () => {},
    renombrar: () => {},
  }), [borrador])

  // Filtrado y ordenamiento de cotizaciones
  const cotsFiltradas = useMemo(() => {
    let res = [...datos]

    // Búsqueda
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      res = res.filter(c => {
        const cod = c.codigo_cotizacion.toLowerCase()
        const nom = (c.crm_clientes?.nombre ?? '').toLowerCase()
        const ape = (c.crm_clientes?.apellido ?? '').toLowerCase()
        const razon = (c.crm_clientes?.crm_empresas_clientes?.razon_social ?? '').toLowerCase()
        const comercial = (c.crm_clientes?.crm_empresas_clientes?.nombre_comercial ?? '').toLowerCase()
        return cod.includes(q) || nom.includes(q) || ape.includes(q) || razon.includes(q) || comercial.includes(q)
      })
    }

    // Filtros de estado de la vista
    if (borrador.filtros.length > 0) {
      for (const f of borrador.filtros) {
        if (f.campo === 'estado' && f.tipo === 'texto' && f.contiene) {
          res = res.filter(c => c.estado === f.contiene)
        }
      }
    }

    // Orden
    const { campo, dir } = borrador.orden
    const def = definicionDe(campo)
    res.sort((a, b) => {
      const va = def.accessor(a)
      const vb = def.accessor(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') {
        return dir === 'asc' ? va - vb : vb - va
      }
      const sa = String(va)
      const sb = String(vb)
      return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
    })

    return res
  }, [datos, busqueda, borrador])

  const totalPaginas = Math.max(1, Math.ceil(cotsFiltradas.length / porPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const cotsPagina = cotsFiltradas.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina)

  const todasSeleccionadas = cotsPagina.length > 0 && cotsPagina.every(c => seleccionadas.has(c.id))

  function toggleSeleccionarTodas() {
    if (todasSeleccionadas) {
      setSeleccionadas(prev => {
        const next = new Set(prev)
        cotsPagina.forEach(c => next.delete(c.id))
        return next
      })
    } else {
      setSeleccionadas(prev => {
        const next = new Set(prev)
        cotsPagina.forEach(c => next.add(c.id))
        return next
      })
    }
  }

  function toggleSeleccionada(id: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function filasParaExportarSeleccionadas() {
    return cotsFiltradas
      .filter(c => seleccionadas.has(c.id))
      .map(c => ({
        Cotización: formatCodigoCotizacion(c.codigo_cotizacion),
        Cliente: c.crm_clientes ? [c.crm_clientes.nombre, c.crm_clientes.apellido].filter(Boolean).join(' ') : '—',
        Estado: ESTADOS.find(e => e.key === c.estado)?.label ?? c.estado,
        Total: formatCOP(c.total),
        'CO2 evitado': formatNumero(c.co2_evitado_total_kg, { unidad: 'kg CO2 eq' }),
        Fecha: c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO') : '—',
      }))
  }

  function eliminarSeleccionadas() {
    setDatos(prev => prev.filter(c => !seleccionadas.has(c.id)))
    setSeleccionadas(new Set())
    setConfirmandoBorrado(false)
  }

  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm space-y-4">
      {/* 1. Barra de herramientas EXACTA de /empresa/cotizador */}
      <ToolbarVistas
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        vistasHook={vistasHook}
        cotizacionesParaExportar={cotsFiltradas}
        seleccionadas={seleccionadas}
        densidad={densidad}
        setDensidad={setDensidad}
      />

      {/* 2. Barra de acción masiva — solo aparece con selección activa */}
      {seleccionadas.size > 0 && (
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--color-brand)]/20 bg-[var(--color-brand-light)] px-4 py-2.5 mb-3">
          <span className="text-sm font-semibold text-[var(--color-brand)]">
            {seleccionadas.size} cotización{seleccionadas.size === 1 ? '' : 'es'} seleccionada{seleccionadas.size === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <BotonDescargarCliente
              data={filasParaExportarSeleccionadas()}
              nombre="cotizaciones_seleccionadas"
              tituloPdf="Cotizaciones Seleccionadas"
              label=""
              icon={<Share2 size={14} />}
            />
            <button
              type="button"
              onClick={() => setConfirmandoBorrado(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 bg-transparent text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50"
            >
              <Trash size={15} sinAnimacion /> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* 3. Tabla real idéntica a /empresa/cotizador */}
      <div className={`rounded-[12px] border ${cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                <th className={`px-1.5 xl:px-4 ${paddingY} w-10`}>
                  <button type="button" onClick={toggleSeleccionarTodas} className="flex">
                    {todasSeleccionadas
                      ? <SquareCheck size={20} className="text-[var(--color-brand)]" sinAnimacion />
                      : <Square size={20} className={ts} sinAnimacion />}
                  </button>
                </th>
                {columnasVisibles.map(clave => (
                  <ColumnaHeaderMenu
                    key={clave}
                    clave={clave}
                    borrador={vistasHook.borrador}
                    setBorrador={vistasHook.setBorrador}
                    columnaFija={columnaFija}
                    setColumnaFija={setColumnaFija}
                    densidad={densidad}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {cotsPagina.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`hover:bg-[var(--bg-table-hover)] ${idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'}`}
                  style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                >
                  <td className={`px-1.5 xl:px-4 ${paddingY}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <button type="button" onClick={() => toggleSeleccionada(c.id)} className="flex">
                      {seleccionadas.has(c.id)
                        ? <SquareCheck size={20} className="text-[var(--color-brand)]" sinAnimacion />
                        : <Square size={20} className={ts} sinAnimacion />}
                    </button>
                  </td>
                  {columnasVisibles.map((clave, colIdx) => {
                    const esColumnaActiva = clave === vistasHook.borrador.orden.campo
                    const alineacion = alineacionColumna(clave)
                    const margen = alineacion === 'text-center' ? 'mx-auto' : alineacion === 'text-right' ? 'ml-auto' : 'mr-auto'
                    const filaBg = idx % 2 === 1 ? 'var(--bg-zebra)' : 'var(--bg-card)'
                    return (
                      <td
                        key={clave}
                        className={`px-1.5 xl:px-3 ${paddingY} ${alineacion} ${tp}`}
                        style={{
                          background: esColumnaActiva ? 'var(--table-orden-activo)' : (columnaFija === clave ? filaBg : undefined),
                          ...(columnaFija === clave ? { position: 'sticky' as const, left: 0, zIndex: 1 } : {}),
                        }}
                      >
                        {clave === 'cliente_nombre' ? (
                          <span className="flex items-center gap-1 xl:gap-2 cursor-pointer">
                            <span className={`${margen} ${anchoColumna(clave).celda} line-clamp-2 break-words`}>
                              {renderCeldaColumna(clave, c)}
                            </span>
                            <CaretRight size={14} className={`${ts} flex-shrink-0`} sinAnimacion />
                          </span>
                        ) : clave === 'codigo_cotizacion' ? (
                          <span className={`flex items-center gap-1 xl:gap-2 cursor-pointer ${alineacion === 'text-center' ? 'justify-center mx-auto' : ''}`}>
                            <span className={`${margen} ${anchoColumna(clave).celda} line-clamp-2 break-words`}>
                              {renderCeldaColumna(clave, c)}
                            </span>
                            <CaretRight size={14} className={`${ts} flex-shrink-0`} sinAnimacion />
                          </span>
                        ) : (
                          <span className={
                            colIdx === 0 ? `${margen} ${anchoColumna(clave).celda} line-clamp-2 break-words`
                            : definicionDe(clave).tipo === 'fecha' ? `block ${alineacion === 'text-center' ? 'mx-auto' : alineacion === 'text-right' ? 'ml-auto' : ''} ${margen} ${anchoColumna(clave).celda}`
                            : clave === 'cliente_telefono' ? `block ${alineacion === 'text-center' ? 'mx-auto' : alineacion === 'text-right' ? 'ml-auto' : ''} ${margen} ${anchoColumna(clave).celda} overflow-visible`
                            : `block ${alineacion === 'text-center' ? 'mx-auto' : alineacion === 'text-right' ? 'ml-auto' : ''} ${margen} ${anchoColumna(clave).celda} truncate`
                          }>
                            {renderCeldaColumna(clave, c)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Paginación EXACTA de /empresa/cotizador */}
        <div className="flex items-center justify-between gap-2 px-4 py-4 mt-1 border-t border-[var(--border-light)]">
          <span className={`text-xs whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${ts}`} style={{ flexShrink: 1 }}>
            {cotsFiltradas.length} cotizaciones · Página {paginaSegura} de {totalPaginas}
          </span>
          <div className="min-w-0 max-w-full overflow-x-auto">
            <Pagination
              page={paginaSegura}
              totalPages={totalPaginas}
              onPageChange={setPagina}
              porPagina={porPagina}
              onPorPaginaChange={(n) => { setPorPagina(n); setPagina(1) }}
            />
          </div>
        </div>
      </div>

      <Modal
        abierto={confirmandoBorrado}
        onClose={() => setConfirmandoBorrado(false)}
        titulo="Eliminar cotizaciones"
        descripcion="Esta acción no se puede deshacer."
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        varianteConfirmar="error"
        textoConfirmar="Eliminar"
        onConfirmar={eliminarSeleccionadas}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Vas a eliminar {seleccionadas.size} cotización{seleccionadas.size === 1 ? '' : 'es'} de demostración.
        </p>
      </Modal>
    </div>
  )
}
