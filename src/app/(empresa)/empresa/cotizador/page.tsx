'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { XCircle, ChevronRight as CaretRight, Buildings, Info, Square, SquareCheck, Trash } from '@/components/ui/icons'
import { Share2 } from 'lucide-react'
import { SelectorEmpresa } from '@/components/ui/selector-empresa'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatCOP, formatNumero, formatFecha, formatHora } from '@/lib/format'
import { formatTelefonoVista } from '@/lib/telefono'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { SalesDashboard } from './components/sales-dashboard'
import { ToolbarVistas, ColumnaHeaderMenu } from './components/toolbar-vistas'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import { Pagination } from '@/components/ui/pagination'
import { useVistas } from '@/lib/cotizador/use-vistas'
import { aplicarFiltros, aplicarOrden, definicionDe, anchoColumna, alineacionColumna, type ClaveColumna } from '@/lib/cotizador/vistas'
import { SkeletonCard, SkeletonLista } from '@/components/ui/skeleton'

// La alineación ahora se maneja desde vistas.ts para unificar título y celda.

// Fecha de columna de tabla: siempre con hora, nunca truncada con "...".
// El salto a un segundo renglón ocurre SOLO SI no cabe en una línea, nunca
// forzado — pero cuando hace falta partir, el corte va EXACTO entre fecha y
// hora, nunca dentro de la fecha ("11 de" / "ago. de 2026") ni dentro de la
// hora ("1:55" / "p.m."). Cada mitad es su propio bloque `whitespace-nowrap`
// (no se puede partir por dentro) separado por un espacio normal (el único
// punto donde el navegador puede saltar de línea). `formatFecha`/
// `formatHora` son la única fuente de verdad del formato ("D de mes. de
// AAAA", con punto).
function FechaColumna({ iso }: { iso: string | null }) {
  return (
    <>
      <span className="whitespace-nowrap">{formatFecha(iso)}</span>{' '}
      <span className="whitespace-nowrap">{formatHora(iso)}</span>
    </>
  )
}

// Celda de la tabla de escritorio según la columna configurada en la vista
// activa — misma fuente de datos (definicionDe) que ordena/filtra, para que
// lo que se ve siempre coincida con lo que se filtró/ordenó.
function renderCeldaColumna(clave: ClaveColumna, c: Cotizacion): React.ReactNode {
  const valor = definicionDe(clave).accessor(c)
  const tipo = definicionDe(clave).tipo
  if (clave === 'estado') {
    const info = ESTADOS.find(e => e.key === c.estado)
    if (!info) return '—'
    // Toda cotización 'por_cotizar' que llega hasta acá ya tiene al menos 1
    // ítem guardado (las de 0 ítems ni siquiera llegan, GET ya las filtra) —
    // así que "Por cotizar" se muestra como "Borrador" en esta lista: se
    // borra sola a las 8h de guardado el primer ítem si no avanza de estado
    // (cron cotizador-purga-borradores-8h), sin afectar el nombre del
    // embudo en ninguna otra pantalla (tabs, sales-dashboard).
    const label = c.estado === 'por_cotizar' ? 'Borrador' : info.label
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{label}</span>
  }
  if (clave === 'codigo_cotizacion') {
    // "COT XXXXXXXX" nunca se parte en móvil ni en tablet — directriz
    // explícita. `whitespace-nowrap` es absoluto ahí; en desktop el ancho
    // generoso de `anchoColumna` ya evita que haga falta partirlo salvo un
    // caso extremo, así que el mismo nowrap alcanza en las 3 pantallas.
    return <span className="whitespace-nowrap">{formatCodigoCotizacion(c.codigo_cotizacion)}</span>
  }
  if (clave === 'cliente_nombre') {
    const nom = c.crm_clientes?.nombre
    if (!nom) return '—'
    const ape = c.crm_clientes?.apellido
    // Si hace falta partir, el corte va EXACTO entre nombre y apellido,
    // nunca a mitad de un nombre/apellido compuesto (2 nombres + 2
    // apellidos) — cada mitad es su propio bloque `whitespace-nowrap`
    // (no se puede partir por dentro), separadas por un espacio normal (el
    // único punto donde el navegador puede saltar de línea).
    // Sin apellido (típico en clientes empresa: la razón social completa
    // vive sola en "nombre", puede ser larga) NO se fuerza whitespace-nowrap
    // — se deja envolver normal dentro del line-clamp-2 del padre. Forzarlo
    // aquí anulaba el line-clamp/break-words de la celda por completo y el
    // nombre quedaba cortado en seco sin "..." (bug real reportado).
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
    // El teléfono nunca se parte ni se corta con "..." — directriz
    // explícita del usuario, mismo criterio que el código de cotización.
    return <span className="whitespace-nowrap">{formatTelefonoVista(c.crm_clientes.telefono, dial)}</span>
  }
  if (tipo === 'fecha') return <FechaColumna iso={valor as string | null} />
  if (clave === 'total') return <span className="font-bold">{formatCOP(Number(valor ?? 0))}</span>
  if (clave === 'co2_evitado_total_kg') return formatNumero(Number(valor ?? 0), { unidad: 'kg CO2 eq' })
  if (clave === 'dias_para_cierre') return valor == null ? '—' : `${valor} d`
  return (valor ?? '—') as string
}

interface EmpresaOpcion { id: string; nombre: string }

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Cotizacion {
  id: string
  cliente_id: string | null
  codigo_cotizacion: string
  estado: string
  total: number
  subtotal: number
  iva_activo: boolean
  iva_porcentaje: number
  total_muebles: number
  co2_evitado_total_kg: number
  created_at: string
  updated_at: string
  fecha_enviada: string | null
  fecha_apertura_cliente: string | null
  fecha_ultima_apertura_cliente: string | null
  fecha_cierre: string | null
  veces_abierta: number
  enlace_publico_token: string | null
  crm_clientes: {
    nombre: string
    apellido: string | null
    telefono: string | null
    telefono_indicativo: string | null
    email: string | null
    tipo?: string | null
    ciudad?: string | null
    crm_empresas_clientes: { razon_social: string; nombre_comercial: string | null } | null
  } | null
  profiles: { nombre: string } | null
  fria?: boolean
}

// ── Constantes estados ─────────────────────────────────────────────────────────

const ESTADOS: { key: string; label: string; color: string }[] = [
  { key: 'por_cotizar',       label: 'Por cotizar',        color: 'text-[#474747]/60 bg-[#474747]/08' },
  { key: 'enviada',           label: 'Enviada',            color: 'text-[#59A6E4] bg-[#59A6E4]/10' },
  { key: 'en_negociacion',    label: 'En negociación',     color: 'text-[#F6BF3E] bg-[#F6BF3E]/10' },
  { key: 'esperando_anticipo',label: 'Esperando anticipo', color: 'text-[#38B98E] bg-[#38B98E]/10' },
  { key: 'cerrado_ganado',    label: 'Cerrado ganado',     color: 'text-[#00827C] bg-[#00827C]/10' },
  { key: 'cerrado_perdido',   label: 'Cerrado perdido',    color: 'text-[#FF5E4B] bg-[#FF5E4B]/10' },
  { key: 'cerrado_inviable',  label: 'Inviable',           color: 'text-[#474747]/40 bg-[#474747]/05' },
]


// ── Componente ────────────────────────────────────────────────────────────────

export default function PanelCotizadorPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-[var(--bg-primary)]" />}>
      <PanelCotizadorContent />
    </Suspense>
  )
}

function PanelCotizadorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [tabEstado, setTabEstado] = useState('todos')
  const listaRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)

  // ── Selector de empresa (solo super_admin) ──────────────────────────────────
  const [esSuperAdmin, setEsSuperAdmin] = useState(false)
  const [empresas, setEmpresas] = useState<EmpresaOpcion[]>([])
  const [cargandoContexto, setCargandoContexto] = useState(true)
  const empresaId = searchParams.get('empresa_id')

  useEffect(() => {
    fetch('/api/cotizador/empresas')
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        if (d?.empresas) {
          setEsSuperAdmin(true)
          setEmpresas(d.empresas)
        }
      })
      .finally(() => setCargandoContexto(false))
  }, [])

  function cambiarEmpresa(id: string) {
    const params = new URLSearchParams(searchParams)
    if (id) params.set('empresa_id', id); else params.delete('empresa_id')
    router.replace(`/empresa/cotizador?${params}`)
  }

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // La búsqueda NUNCA vuelve a pedirle nada al servidor — se filtra 100% en
  // memoria (cotsFiltradas, abajo) sobre lo que ya está cargado. Antes
  // `busqueda` era dependencia de este fetch y cada letra tecleada
  // recargaba TODO (incluido el embudo de ventas de arriba, que no tiene
  // nada que ver con la búsqueda de la tabla) — daba la sensación de que
  // todo el panel estaba lento. Directriz explícita del usuario: buscar
  // solo debe afectar la tabla, nada de arriba.
  const cargarCotizaciones = useCallback(async (silencioso = false) => {
    if (esSuperAdmin && !empresaId) { setCotizaciones([]); if (!silencioso) setCargando(false); return }
    if (!silencioso) {
      setCargando(true)
      setError(null)
    }
    try {
      const params = new URLSearchParams()
      if (esSuperAdmin && empresaId) params.set('empresa_id', empresaId)
      const res = await fetch(`/api/cotizador/cotizaciones?${params}`, { cache: 'no-store' })
      const d = await res.json()
      if (d.cotizaciones) setCotizaciones(d.cotizaciones)
    } catch {
      if (!silencioso) setError('No se pudieron cargar las cotizaciones. Intenta de nuevo.')
    }
    finally { if (!silencioso) setCargando(false) }
  }, [esSuperAdmin, empresaId])

  // No espera a saber si es super_admin antes de pedir las cotizaciones —
  // para el caso normal (empresa_admin/empleado) esa espera era un viaje de
  // red completo desperdiciado antes de mostrar nada real (bug real
  // reportado: la página se sentía lenta y "cargaba raro"). El único caso
  // que sí depende de esSuperAdmin (super_admin sin empresa_id elegida) ya
  // lo maneja cargarCotizaciones por dentro, y este efecto se vuelve a
  // disparar solo cuando esSuperAdmin cambia de verdad (closure nueva).
  useEffect(() => {
    cargarCotizaciones()
  }, [cargarCotizaciones])

  const vistasHook = useVistas(empresaId)
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [columnaFija, setColumnaFija] = useState<ClaveColumna | null>(null)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [densidad, setDensidad] = useState<'comoda' | 'compacta'>('comoda')

  // Al buscar o cambiar de pestaña de estado, siempre vuelve a la página 1
  // de la tabla y limpia la selección activa (para que la barra masiva y el
  // export no queden con IDs ocultos por el nuevo filtro).
  useEffect(() => { 
    setPagina(1)
    setSeleccionadas(new Set())
  }, [busqueda, tabEstado])

  const linkConEmpresa = useCallback((ruta: string) => {
    if (esSuperAdmin && empresaId) return `${ruta}?empresa_id=${empresaId}`
    return ruta
  }, [esSuperAdmin, empresaId])

  // Borrado masivo: reutiliza el mismo DELETE por id que ya existe para una
  // cotización individual (con cascade + auditoría), no un endpoint nuevo.
  function eliminarSeleccionadas() {
    setBorrando(true)
    const borrados = new Set(seleccionadas)

    // Eliminación optimista síncrona: quitamos de la vista inmediatamente
    // sin ningún 'await' de por medio que pueda bloquear el repintado de React.
    setCotizaciones(prev => prev.filter(c => !borrados.has(c.id)))
    setSeleccionadas(new Set())
    setConfirmandoBorrado(false)
    setBorrando(false) // Desbloquear estado inmediatamente por si se recarga luego

    // Operación de backend en segundo plano — con empresa_id en la URL
    // cuando aplica: cotizadorAuthCheck exige ese parámetro para
    // super_admin (puede operar cualquier empresa, no tiene una propia) y
    // sin él respondía 400 en cada DELETE, aunque la selección de empresa
    // arriba ya estuviera hecha (bug real reportado: "No se pudieron
    // eliminar 9 cotizaciones" — las 9 fallaban siempre, no al azar).
    Promise.all(
      Array.from(borrados).map(id => fetch(linkConEmpresa(`/api/cotizador/cotizaciones/${id}`), { method: 'DELETE' }))
    ).then(responses => {
      const fallidos = responses.filter(r => !r.ok)
      if (fallidos.length > 0) setError(`No se pudieron eliminar ${fallidos.length} cotizaciones.`)
      cargarCotizaciones(true) // Refresco silencioso de sincronización
    }).catch(() => {
      setError('Hubo un problema de conexión al eliminar. Si alguna no se borró, reaparecerá.')
      cargarCotizaciones(true)
    })
  }


  // ── Filtrado local ─────────────────────────────────────────────────────────

  // Búsqueda por código de cotización, nombre/apellido o celular del
  // cliente — SIEMPRE desde el principio (startsWith), no en cualquier
  // parte del texto. Mismo criterio que el filtro `q` de la API (ver
  // /api/cotizador/cotizaciones), este solo cubre el instante entre que se
  // escribe y que llega la respuesta del server.
  const cotsFiltradas = cotizaciones.filter(c => {
    if (tabEstado !== 'todos' && c.estado !== tabEstado) return false
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    const qDigitos = q.replace(/\D/g, '')
    const nombre = (c.crm_clientes?.nombre ?? '').toLowerCase()
    const apellido = (c.crm_clientes?.apellido ?? '').toLowerCase()
    const razonSocial = (c.crm_clientes?.crm_empresas_clientes?.razon_social ?? '').toLowerCase()
    const nombreComercial = (c.crm_clientes?.crm_empresas_clientes?.nombre_comercial ?? '').toLowerCase()
    const telefonoDigitos = (c.crm_clientes?.telefono ?? '').replace(/\D/g, '')
    return (
      c.codigo_cotizacion.toLowerCase().startsWith(q) ||
      nombre.startsWith(q) ||
      apellido.startsWith(q) ||
      razonSocial.startsWith(q) ||
      nombreComercial.startsWith(q) ||
      (qDigitos.length > 0 && telefonoDigitos.startsWith(qDigitos))
    )
  })

  // Filtros y orden de la vista activa (columnas, condiciones, orden) se
  // aplican sobre lo que ya filtraron la búsqueda y las pestañas de estado —
  // mismo dato, una capa más de refinamiento, sin pedir nada nuevo al server.
  const cotsVista = aplicarOrden(aplicarFiltros(cotsFiltradas, vistasHook.borrador.filtros), vistasHook.borrador.orden)
  const columnasVisibles: ClaveColumna[] = vistasHook.borrador.columnas.length > 0 ? vistasHook.borrador.columnas : ['cliente_nombre']

  // Paginador único de la plataforma (regla general) — la vista se filtra/
  // ordena en memoria (arriba) y se pagina también en memoria, sin pedir
  // nada nuevo al server.
  const totalPaginas = Math.max(1, Math.ceil(cotsVista.length / porPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const cotsPagina = cotsVista.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina)

  // Sincronizar el estado de la página si se quedó "huérfano" en una página que ya no existe
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas)
  }, [pagina, totalPaginas])

  // Ahora "Seleccionar Todo" opera estrictamente sobre la página actual
  // para evitar seleccionar ítems ocultos (UX estándar).
  const todasSeleccionadas = cotsPagina.length > 0 && cotsPagina.every(c => seleccionadas.has(c.id))

  function toggleSeleccionada(id: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSeleccionarTodas() {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (cotsPagina.every(c => prev.has(c.id))) {
        // Deseleccionar todo lo de esta página
        cotsPagina.forEach(c => next.delete(c.id))
      } else {
        // Seleccionar todo lo de esta página
        cotsPagina.forEach(c => next.add(c.id))
      }
      return next
    })
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'
  const paddingY = densidad === 'compacta' ? 'py-1' : 'py-2.5'

  function filasParaExportarSeleccionadas() {
    return cotsVista.filter(c => seleccionadas.has(c.id)).map(c => {
      const fila: Record<string, string | number> = {}
      for (const clave of vistasHook.borrador.columnas) {
        const def = definicionDe(clave)
        fila[def.label] = def.accessor(c) ?? ''
      }
      return fila
    })
  }

  return (
    <div className="pb-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {esSuperAdmin && (
          <div className={`rounded-[12px] border p-4 mb-6 flex items-center gap-3 ${cardBg}`}>
            <Buildings size={18} className="text-[#00827C] flex-shrink-0" />
            <div className="flex-1">
              <p className={`text-xs font-semibold ${ts} mb-1`}>Cotizando para</p>
              <SelectorEmpresa empresas={empresas} value={empresaId ?? ''} onChange={cambiarEmpresa} />
            </div>
          </div>
        )}

        {esSuperAdmin && !empresaId && !cargandoContexto && (
          <div className="rounded-[12px] border border-[#59A6E4]/20 bg-[#59A6E4]/10 p-4 mb-4 flex items-center gap-2.5">
            <Info size={18} className="text-[#59A6E4] flex-shrink-0" />
            <p className="text-sm text-[#59A6E4] font-medium">Selecciona una empresa arriba para ver o crear sus cotizaciones.</p>
          </div>
        )}

        {(!esSuperAdmin || empresaId) && (
          cargando ? (
            <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1.5fr_2fr] gap-6 mb-6">
              <SkeletonCard lineas={5} className="h-[280px]" />
              <SkeletonCard lineas={5} className="h-[280px]" />
              <SkeletonCard lineas={5} className="h-[280px]" />
            </div>
          ) : (
            <SalesDashboard
              cotizaciones={cotizaciones}
              empresaId={empresaId}
              isDark={isDark}
              nuevaCotizacionDisabled={esSuperAdmin && !empresaId}
              onNuevaCotizacion={() => router.push(linkConEmpresa('/empresa/cotizador/nueva'))}
              tabEstado={tabEstado}
              onFiltrarEtapa={(estadoKey) => {
                setTabEstado(prev => prev === estadoKey ? 'todos' : estadoKey)
              }}
            />
          )
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-[10px] bg-[#FF5E4B]/10 border border-[#FF5E4B]/20 text-sm text-[#FF5E4B] flex items-center gap-2">
            <XCircle size={16} />
            {error}
          </div>
        )}


        {(!esSuperAdmin || empresaId) && (
          <div ref={listaRef}>
            {/* Barra de herramientas — el filtro por estado ya lo da el
                funnel de arriba (SalesDashboard, onFiltrarEtapa). Filtros/
                orden/columnas de la vista son capas adicionales aparte. */}
            <ToolbarVistas
              busqueda={busqueda}
              onBusquedaChange={setBusqueda}
              vistasHook={vistasHook}
              cotizacionesParaExportar={cotsVista}
              seleccionadas={seleccionadas}
              densidad={densidad}
              setDensidad={setDensidad}
            />

            {/* Barra de acción masiva — solo aparece con selección activa. */}
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

            {/* Lista — el filtro por estado ya lo da el funnel de arriba
                (SalesDashboard, onFiltrarEtapa), sin duplicar pestañas acá. */}
            {cargando ? (
              <SkeletonLista filas={3} />
            ) : cotsVista.length === 0 ? (
              <div className={`rounded-[12px] border p-8 text-center ${cardBg}`}>
                <p className={`text-sm ${ts}`}>No hay cotizaciones que coincidan.</p>
                <Button onClick={() => router.push(linkConEmpresa('/empresa/cotizador/nueva'))} size="sm" className="mt-3">
                  Crea la primera
                </Button>
              </div>
            ) : (
              // Una sola tabla real, en escritorio Y en móvil (pedido
              // explícito) — en pantallas chicas scrollea horizontal en vez
              // de cambiar a tarjetas. Sin animaciones (ni hover-pop de
              // íconos, ni transition-colors en filas): solo cambio de fondo
              // instantáneo, directriz explícita del usuario.
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
                        // La fila YA NO navega entera — solo se resalta al pasar
                        // el cursor. Únicamente Cotización (código) y Nombre
                        // llevan a algún lado (cada una a su propio destino, ver
                        // abajo); el resto de columnas solo resalta, directriz
                        // explícita del usuario.
                        className={`hover:bg-[var(--bg-table-hover)] ${idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'}`}
                        style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                      >
                        <td className={`px-1.5 xl:px-4 ${paddingY}`} onClick={e => e.stopPropagation()}>
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
                          // La columna inmovilizada (sticky) necesita un fondo
                          // OPACO propio: sin esto quedaba transparente y, al
                          // scrollear horizontal, el resto de celdas de la
                          // misma fila se veía transparentar por debajo (bug
                          // real encontrado en la revisión) — usa el mismo
                          // zebra de su fila para que no rompa el patrón.
                          const filaBg = idx % 2 === 1 ? 'var(--bg-zebra)' : 'var(--bg-card)'
                          return (
                            <td
                              key={clave}
                              className={`px-1.5 xl:px-3 ${paddingY} ${alineacion} ${tp}`}
                              style={{
                                // Mismo token muy tenue del encabezado (1.5%), nunca
                                // --color-brand-light (8%, mucho más oscuro) — ese era
                                // el resaltado que el usuario seguía viendo muy fuerte.
                                background: esColumnaActiva ? 'var(--table-orden-activo)' : (columnaFija === clave ? filaBg : undefined),
                                ...(columnaFija === clave ? { position: 'sticky' as const, left: 0, zIndex: 1 } : {}),
                              }}
                            >
                              {/* Ancho tope: regla general del sistema de diseño
                                  (2026-08-17) — en tablet deben caber mínimo 5 columnas
                                  de datos sin contar el check inicial ni el ícono de
                                  abrir del final. La columna inicial y cualquier columna
                                  de nombre permiten 2 líneas (line-clamp + ajuste normal
                                  de texto) para que el contenido se lea completo en vez
                                  de cortarse con "..." — el resto sigue en 1 línea.
                                  El salto a una segunda línea es del navegador (ajuste
                                  normal por palabra), SOLO SI hace falta — nunca se
                                  fuerza nombre/apellido en 2 renglones separados por
                                  defecto, directriz explícita del usuario. Alineación de
                                  contenido por tipo de dato: texto izquierda, fecha/
                                  teléfono centro, número derecha — el título de columna
                                  siempre va a la izquierda, eso no cambia (ver
                                  ColumnaHeaderMenu). */}
                              {clave === 'cliente_nombre' ? (
                                // Nombre lleva a la FICHA DEL CLIENTE, no a la
                                // cotización — directriz explícita, distinto del
                                // resto de la fila (que sí abre la cotización).
                                <span
                                  className={`flex items-center gap-1 xl:gap-2 ${c.cliente_id ? 'cursor-pointer' : ''}`}
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (c.cliente_id) router.push(linkConEmpresa(`/empresa/clientes/${c.cliente_id}`))
                                  }}
                                >
                                  {/* min-w-0: sin esto, un hijo de texto dentro de un
                                      flex padre se niega a encogerse por debajo de su
                                      ancho natural — el line-clamp/max-w quedaban sin
                                      efecto real y la celda empujaba toda la tabla más
                                      ancha que la pantalla (bug real: desborde en
                                      tablet con "..." donde nunca debía cortar). */}
                                  {/* NUNCA "block" junto con "line-clamp-2": line-clamp
                                      necesita fijar su propio display:-webkit-box para
                                      partir a 2 líneas — "block" lo pisaba (ganaba el
                                      cascade) y el texto quedaba en 1 sola línea cortada
                                      en seco sin "...", el bug real reportado. */}
                                  <span className={`${margen} ${anchoColumna(clave).celda} line-clamp-2 break-words`}>
                                    {renderCeldaColumna(clave, c)}
                                  </span>
                                  <CaretRight size={14} className={`${ts} flex-shrink-0`} sinAnimacion />
                                </span>
                              ) : clave === 'codigo_cotizacion' ? (
                                // El "abrir" (>) va junto a Cotización también —
                                // esta celda es la que abre la cotización (la fila
                                // ya no navega entera, ver <tr>).
                                <span
                                  className={`flex items-center gap-1 xl:gap-2 cursor-pointer ${alineacion === 'text-center' ? 'justify-center mx-auto' : ''}`}
                                  onClick={e => {
                                    e.stopPropagation()
                                    router.push(linkConEmpresa(`/empresa/cotizador/${c.id}`))
                                  }}
                                >
                                  {/* min-w-0: sin esto, un hijo de texto dentro de un
                                      flex padre se niega a encogerse por debajo de su
                                      ancho natural — el line-clamp/max-w quedaban sin
                                      efecto real y la celda empujaba toda la tabla más
                                      ancha que la pantalla (bug real: desborde en
                                      tablet con "..." donde nunca debía cortar). */}
                                  {/* NUNCA "block" junto con "line-clamp-2": line-clamp
                                      necesita fijar su propio display:-webkit-box para
                                      partir a 2 líneas — "block" lo pisaba (ganaba el
                                      cascade) y el texto quedaba en 1 sola línea cortada
                                      en seco sin "...", el bug real reportado. */}
                                  <span className={`${margen} ${anchoColumna(clave).celda} line-clamp-2 break-words`}>
                                    {renderCeldaColumna(clave, c)}
                                  </span>
                                  <CaretRight size={14} className={`${ts} flex-shrink-0`} sinAnimacion />
                                </span>
                              ) : (
                                <span className={
                                  // Ancho tope afinado por tipo de dato (regla
                                  // general, `anchoColumna` en vistas.ts) — no un
                                  // mismo número para todas las columnas. En
                                  // desktop (lg+) sube bastante más que en
                                  // tablet/móvil, para que quepan en una sola
                                  // línea sin partirse "si no hace falta".
                                  // "block" nunca junto con "line-clamp-2" — pisa el
                                  // display:-webkit-box que necesita para partir a 2
                                  // líneas (mismo bug ya corregido arriba).
                                  colIdx === 0 ? `${margen} ${anchoColumna(clave).celda} line-clamp-2 break-words`
                                  // Fecha: nunca truncar con "..." — su propio
                                  // FechaColumna ya resuelve el ajuste por
                                  // pantalla (1 línea en móvil/escritorio, 2
                                  // renglones fecha/hora en tablet). Teléfono:
                                  // nunca se parte ni se corta, se ve completo
                                  // siempre — directriz explícita del usuario.
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

                {/* Paginación — componente único de la plataforma. Siempre
                    después de la última fila, fuera del contenedor con
                    scroll horizontal de la tabla (nunca dentro, ese bug ya
                    se reportó). El conteo se acorta primero (min-width:0 +
                    ellipsis) para que el paginador — con el selector "N por
                    página" — nunca se comprima ni quede oculto detrás de un
                    scroll propio. Con MUCHAS páginas, el paginador puede
                    seguir sin caber ni siquiera con el conteo ya en su
                    mínimo — antes eso se filtraba hasta la PÁGINA completa,
                    que quedaba con scroll horizontal en mobile (bug real
                    encontrado en la revisión). `min-w-0` + `overflow-x-auto`
                    en este wrapper puntual (no en el componente Pagination
                    en sí, que otras pantallas siguen usando igual) contiene
                    ese desborde aquí mismo, sin comprimir sus botones. */}
                <div className="flex items-center justify-between gap-2 px-4 py-4 mt-1 border-t border-[var(--border-light)]">
                  <span className={`text-xs whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${ts}`} style={{ flexShrink: 1 }}>
                    {cotsVista.length} cotizaciones · Página {paginaSegura} de {totalPaginas}
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
            )}
          </div>
        )}
      </div>

      <Modal
        abierto={confirmandoBorrado}
        onClose={() => !borrando && setConfirmandoBorrado(false)}
        titulo="Eliminar cotizaciones"
        descripcion="Esta acción no se puede deshacer."
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        varianteConfirmar="error"
        textoConfirmar={borrando ? 'Eliminando...' : 'Eliminar'}
        onConfirmar={eliminarSeleccionadas}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Vas a eliminar {seleccionadas.size} cotización{seleccionadas.size === 1 ? '' : 'es'} de forma permanente, junto con sus muebles, notas e historial.
        </p>
      </Modal>
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────────


