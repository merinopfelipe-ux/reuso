'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Search as MagnifyingGlass, Gear, Columns3, Filter as Funnel,
  ArrowUpDown as ArrowsDownUp, Share2, Save as FloppyDisk, Square, SquareCheck, X, Trash,
  EllipsisVertical, ArrowUp, ArrowDown, Pin, PinOff, Plus, CaretDown, Pencil, Copy,
  EllipsisVertical as MoreHorizontal,
} from '@/components/ui/icons'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import { Modal } from '@/components/ui/modal'
import {
  definicionDe, anchoColumna, type ClaveColumna, type VistaCotizador, type OrdenVista, type FiltroCondicion, COLUMNAS_DISPONIBLES,
  type CotizacionParaVista,
} from '@/lib/cotizador/vistas'

// ── Popover genérico botón+panel — renderiza el panel vía portal a
// document.body con posición fija calculada del botón, en vez de absolute
// dentro del elemento (queda atrapado dentro del `overflow-x-auto` de la
// tabla, obligando a hacer scroll adentro de la tabla para verlo completo —
// bug real reportado). Se cierra solo si el usuario scrollea (cualquier
// contenedor, captura=true) en vez de intentar reposicionarse en cada
// evento de scroll. ──
export function Popover({ trigger, children, ancho = 260, alinear = 'right' }: { trigger: (abrir: () => void, abierto: boolean) => React.ReactNode; children: React.ReactNode; ancho?: number; alinear?: 'left' | 'right' }) {
  const [abierto, setAbierto] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [montado, setMontado] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMontado(true), [])

  // Recalcula la posición del panel a partir del botón que lo abrió — se
  // usa al abrir Y de nuevo en cada scroll (nunca para cerrarlo).
  function posicionar() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = alinear === 'right' ? rect.right - ancho : rect.left
    setCoords({ top: rect.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - ancho - 8)) })
  }

  function alternar() {
    if (!abierto) posicionar()
    setAbierto(v => !v)
  }

  // Regla general (vale para TODOS los popovers/menús de la plataforma, no
  // solo este): scrollear la página o cualquier contenedor de atrás NUNCA
  // cierra el menú, lo sigue reposicionando — bug real reportado ("si le
  // doy scroll, se desaparece"), pasaba en todos porque antes cualquier
  // scroll cerraba el popover, incluido el scroll DENTRO del propio panel
  // (ej. la lista de "Editar columnas"). Scrollear dentro del panel no
  // reposiciona ni cierra nada, se ignora por completo.
  useEffect(() => {
    if (!abierto) return
    function onClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (panelRef.current?.contains(e.target as Node)) return
      setAbierto(false)
    }
    function onScroll(e: Event) {
      if (panelRef.current?.contains(e.target as Node)) return
      posicionar()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {trigger(alternar, abierto)}
      {abierto && montado && coords && createPortal(
        <div
          ref={panelRef}
          className="fixed rounded-[10px] border p-3 z-[9999] bg-[var(--bg-card)] border-[var(--border)] shadow-lg"
          style={{ width: ancho, top: coords.top, left: coords.left }}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  )
}

function BotonBarra({ children, onClick, activo }: { children: React.ReactNode; onClick: () => void; activo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
        activo
          ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
          : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {children}
    </button>
  )
}

interface UseVistasResult {
  vistas: VistaCotizador[]
  vistaActivaId: string
  borrador: VistaCotizador
  setBorrador: (v: VistaCotizador | ((prev: VistaCotizador) => VistaCotizador)) => void
  sinGuardar: boolean
  cambiarVistaActiva: (id: string) => void
  guardar: () => void
  crear: (nombre: string) => void
  duplicar: () => void
  eliminar: (id: string) => void
  renombrar: (id: string, nombre: string) => void
}

export function ToolbarVistas<T extends CotizacionParaVista>({
  busqueda, onBusquedaChange, vistasHook, cotizacionesParaExportar, seleccionadas,
  densidad, setDensidad
}: {
  busqueda: string
  onBusquedaChange: (v: string) => void
  vistasHook: UseVistasResult
  cotizacionesParaExportar: T[]
  seleccionadas?: Set<string>
  densidad: 'comoda' | 'compacta'
  setDensidad: (d: 'comoda' | 'compacta') => void
}) {
  const { vistas, vistaActivaId, borrador, setBorrador, sinGuardar, guardar, cambiarVistaActiva, crear, duplicar, eliminar, renombrar } = vistasHook

  const ts = 'text-[var(--text-secondary)]'

  // Selector de vistas guardadas — crear/renombrar usan un input inline
  // dentro del propio panel en vez de prompt() nativo (prohibido en el
  // sistema de diseño), y eliminar pide confirmación con el Modal del
  // sistema en vez de confirm() nativo.
  const [creandoVista, setCreandoVista] = useState(false)
  const [nombreNuevaVista, setNombreNuevaVista] = useState('')
  const [renombrandoId, setRenombrandoId] = useState<string | null>(null)
  const [nombreRenombrar, setNombreRenombrar] = useState('')
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [masAbierto, setMasAbierto] = useState(false)

  function confirmarNuevaVista() {
    const nombre = nombreNuevaVista.trim()
    if (!nombre) { setCreandoVista(false); return }
    crear(nombre)
    setNombreNuevaVista('')
    setCreandoVista(false)
  }

  function confirmarRenombrar(id: string) {
    const nombre = nombreRenombrar.trim()
    if (nombre) renombrar(id, nombre)
    setRenombrandoId(null)
  }

  const vistaAEliminar = vistas.find(v => v.id === eliminandoId)

  function toggleColumna(clave: ClaveColumna) {
    setBorrador(prev => ({
      ...prev,
      columnas: prev.columnas.includes(clave)
        ? prev.columnas.filter(c => c !== clave)
        : [...prev.columnas, clave],
    }))
  }

  function moverColumna(e: React.MouseEvent, idx: number, dir: number) {
    e.stopPropagation()
    if (idx + dir < 0 || idx + dir >= borrador.columnas.length) return
    setBorrador(prev => {
      const nuevas = [...prev.columnas]
      const temp = nuevas[idx]
      nuevas[idx] = nuevas[idx + dir]
      nuevas[idx + dir] = temp
      return { ...prev, columnas: nuevas }
    })
  }

  function actualizarOrden(nuevo: OrdenVista) {
    setBorrador(prev => ({ ...prev, orden: nuevo }))
  }

  function quitarFiltro(idx: number) {
    setBorrador(prev => ({ ...prev, filtros: prev.filtros.filter((_, i) => i !== idx) }))
  }

  function agregarFiltro(campo: ClaveColumna) {
    // Nunca 2 condiciones para el mismo campo — sin este guard, tocar el
    // mismo chip varias veces apilaba filtros duplicados sin ninguna forma
    // de distinguirlos en la lista (bug real encontrado en la revisión).
    if (borrador.filtros.some(f => f.campo === campo)) return
    const def = definicionDe(campo)
    const nuevo: FiltroCondicion = def.tipo === 'texto'
      ? { campo, tipo: 'texto', contiene: '' }
      : def.tipo === 'fecha'
        ? { campo, tipo: 'fecha' }
        : { campo, tipo: 'numero' }
    setBorrador(prev => ({ ...prev, filtros: [...prev.filtros, nuevo] }))
  }

  // Las 3 opciones de descarga (CSV/Excel/PDF) SIEMPRE se preguntan al
  // exportar — regla general de la plataforma, la única excepción es la
  // cotización pública compartida con el cliente (esa es siempre PDF).
  function filasParaExportar() {
    const elementos = seleccionadas && seleccionadas.size > 0
      ? cotizacionesParaExportar.filter(c => seleccionadas.has(c.id))
      : cotizacionesParaExportar

    return elementos.map(c => {
      const fila: Record<string, string | number> = {}
      for (const clave of borrador.columnas) {
        const def = definicionDe(clave)
        fila[def.label] = def.accessor(c) ?? ''
      }
      return fila
    })
  }
  const nombreArchivo = `cotizaciones_${borrador.nombre.toLowerCase().replace(/\s+/g, '_')}`

  // Todos los controles salvo Buscar — se renderizan dos veces: una fila
  // normal en escritorio (oculta en mobile) y dentro del modal "Más" en
  // mobile (oculto en escritorio). Ambas copias leen/escriben el mismo
  // `borrador` del padre, así que nunca divergen entre sí.
  const controles = (
    <>
      {/* Vista guardada */}
      <Popover
        ancho={240}
        trigger={(abrir, abierto) => (
          <BotonBarra onClick={abrir} activo={abierto}>
            {borrador.nombre}<CaretDown size={12} sinAnimacion />
          </BotonBarra>
        )}
      >
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Vistas guardadas</p>
        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto mb-2">
          {vistas.map(v => (
            <div key={v.id} className="flex items-center gap-1 group">
              {renombrandoId === v.id ? (
                <input
                  autoFocus
                  className="flex-1 text-xs px-2 py-1.5 rounded-[6px] border border-[var(--color-brand)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
                  value={nombreRenombrar}
                  onChange={e => setNombreRenombrar(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmarRenombrar(v.id); if (e.key === 'Escape') setRenombrandoId(null) }}
                  onBlur={() => confirmarRenombrar(v.id)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => cambiarVistaActiva(v.id)}
                  className={`flex-1 text-left px-2 py-1.5 rounded-[6px] text-xs font-medium truncate ${v.id === vistaActivaId ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
                >
                  {v.nombre}
                </button>
              )}
              {renombrandoId !== v.id && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button type="button" onClick={() => { setRenombrandoId(v.id); setNombreRenombrar(v.nombre) }} className="p-1 text-[var(--text-secondary)] hover:text-[var(--color-brand)]" aria-label="Renombrar vista">
                    <Pencil size={12} sinAnimacion />
                  </button>
                  {v.id !== 'default' && (
                    <button type="button" onClick={() => setEliminandoId(v.id)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--color-error)]" aria-label="Eliminar vista">
                      <Trash size={12} sinAnimacion />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border)]">
          <button type="button" onClick={duplicar} className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--color-brand)] px-1 py-1">
            <Copy size={13} sinAnimacion /> Duplicar vista actual
          </button>
          {creandoVista ? (
            <input
              autoFocus
              className="text-xs px-2 py-1.5 rounded-[6px] border border-[var(--color-brand)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
              placeholder="Nombre de la vista nueva"
              value={nombreNuevaVista}
              onChange={e => setNombreNuevaVista(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmarNuevaVista(); if (e.key === 'Escape') setCreandoVista(false) }}
              onBlur={confirmarNuevaVista}
            />
          ) : (
            <button type="button" onClick={() => setCreandoVista(true)} className="flex items-center gap-1.5 text-xs font-medium px-1 py-1" style={{ color: 'var(--color-brand)' }}>
              <Plus size={13} sinAnimacion /> Nueva vista
            </button>
          )}
        </div>
      </Popover>

      {/* Engranaje: densidad de fila */}
      <Popover
        ancho={180}
        trigger={(abrir, abierto) => (
          <BotonBarra onClick={abrir} activo={abierto}><Gear size={14} sinAnimacion /></BotonBarra>
        )}
      >
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Densidad de fila</p>
        {(['comoda', 'compacta'] as const).map(d => (
          <label key={d} className="flex items-center gap-2 py-1.5 cursor-pointer select-none" onClick={() => setDensidad(d)}>
            {densidad === d ? <SquareCheck size={18} className="text-[var(--color-brand)]" sinAnimacion /> : <Square size={18} className="text-[var(--text-secondary)]" sinAnimacion />}
            <span className="text-xs text-[var(--text-primary)] capitalize">{d === 'comoda' ? 'Cómoda' : 'Compacta'}</span>
          </label>
        ))}
      </Popover>

      {/* Editar columnas */}
      <Popover
        ancho={260}
        trigger={(abrir, abierto) => (
          <BotonBarra onClick={abrir} activo={abierto}><Columns3 size={14} sinAnimacion /> Editar columnas</BotonBarra>
        )}
      >
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Columnas visibles</p>
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
          {borrador.columnas.map((clave, idx) => {
            const def = definicionDe(clave)
            return (
              <div key={clave} className="flex items-center justify-between py-1 hover:bg-[var(--bg-hover)] rounded px-1 -mx-1 group">
                <label className="flex items-center gap-2 cursor-pointer select-none flex-1" onClick={() => toggleColumna(clave)}>
                  <SquareCheck size={20} className="text-[var(--color-brand)] flex-shrink-0" sinAnimacion />
                  <span className="text-xs text-[var(--text-primary)]">{def.label}</span>
                </label>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={(e) => moverColumna(e, idx, -1)} disabled={idx === 0} className="p-1 disabled:opacity-30 hover:text-[var(--color-brand)] text-[var(--text-secondary)]" aria-label="Mover arriba">
                    <ArrowUp size={12} sinAnimacion />
                  </button>
                  <button type="button" onClick={(e) => moverColumna(e, idx, 1)} disabled={idx === borrador.columnas.length - 1} className="p-1 disabled:opacity-30 hover:text-[var(--color-brand)] text-[var(--text-secondary)]" aria-label="Mover abajo">
                    <ArrowDown size={12} sinAnimacion />
                  </button>
                </div>
              </div>
            )
          })}
          {borrador.columnas.length > 0 && COLUMNAS_DISPONIBLES.filter(d => !borrador.columnas.includes(d.clave)).length > 0 && (
            <div className="pt-2 mt-1" />
          )}
          {COLUMNAS_DISPONIBLES.filter(d => !borrador.columnas.includes(d.clave)).map(def => (
            <label key={def.clave} className="flex items-center gap-2 py-1.5 cursor-pointer select-none hover:bg-[var(--bg-hover)] rounded px-1 -mx-1" onClick={() => toggleColumna(def.clave)}>
              <Square size={20} className="text-[var(--text-secondary)] flex-shrink-0" sinAnimacion />
              <span className="text-xs text-[var(--text-primary)]">{def.label}</span>
            </label>
          ))}
        </div>
      </Popover>

      {/* Filtros */}
      <Popover
        ancho={300}
        trigger={(abrir, abierto) => (
          <BotonBarra onClick={abrir} activo={abierto || borrador.filtros.length > 0}>
            <Funnel size={14} sinAnimacion /> Filtros{borrador.filtros.length > 0 ? ` (${borrador.filtros.length})` : ''}
          </BotonBarra>
        )}
      >
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Condiciones (todas deben cumplirse)</p>
        <div className="flex flex-col gap-3">
          {borrador.filtros.map((f, idx) => {
            const def = definicionDe(f.campo)
            return (
              <div key={idx} className="rounded-[8px] border border-[var(--border)] p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{def.label}</span>
                  <button type="button" onClick={() => quitarFiltro(idx)}>
                    <X size={13} className="text-[var(--text-secondary)]" sinAnimacion />
                  </button>
                </div>
                {f.tipo === 'texto' && (
                  <input
                    className="w-full text-xs px-2 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
                    placeholder="Contiene..."
                    value={f.contiene}
                    onChange={e => setBorrador(prev => ({ ...prev, filtros: prev.filtros.map((x, i) => i === idx ? { ...f, contiene: e.target.value } : x) }))}
                  />
                )}
                {f.tipo === 'fecha' && (
                  <div className="flex gap-1.5">
                    <input type="date" className="w-full text-xs px-2 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
                      value={f.desde ?? ''} onChange={e => setBorrador(prev => ({ ...prev, filtros: prev.filtros.map((x, i) => i === idx ? { ...f, desde: e.target.value || undefined } : x) }))} />
                    <input type="date" className="w-full text-xs px-2 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
                      value={f.hasta ?? ''} onChange={e => setBorrador(prev => ({ ...prev, filtros: prev.filtros.map((x, i) => i === idx ? { ...f, hasta: e.target.value || undefined } : x) }))} />
                  </div>
                )}
                {f.tipo === 'numero' && (
                  <div className="flex gap-1.5">
                    <input type="number" placeholder="Mín" className="w-full text-xs px-2 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
                      value={f.min ?? ''} onChange={e => setBorrador(prev => ({ ...prev, filtros: prev.filtros.map((x, i) => i === idx ? { ...f, min: e.target.value ? Number(e.target.value) : undefined } : x) }))} />
                    <input type="number" placeholder="Máx" className="w-full text-xs px-2 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none"
                      value={f.max ?? ''} onChange={e => setBorrador(prev => ({ ...prev, filtros: prev.filtros.map((x, i) => i === idx ? { ...f, max: e.target.value ? Number(e.target.value) : undefined } : x) }))} />
                  </div>
                )}
              </div>
            )
          })}
          {COLUMNAS_DISPONIBLES.filter(d => !borrador.filtros.some(f => f.campo === d.clave)).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Agregar condición</p>
              <div className="flex flex-wrap gap-1.5">
                {/* Solo campos sin condición activa todavía — evita duplicar
                    la misma condición dos veces (ver guard en agregarFiltro). */}
                {COLUMNAS_DISPONIBLES.filter(d => !borrador.filtros.some(f => f.campo === d.clave)).map(def => (
                  <button
                    key={def.clave}
                    type="button"
                    onClick={() => agregarFiltro(def.clave)}
                    className="px-2 py-1 rounded-full text-[11px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    + {def.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Popover>

      {/* Ordenar */}
      <Popover
        ancho={220}
        trigger={(abrir, abierto) => (
          <BotonBarra onClick={abrir} activo={abierto}><ArrowsDownUp size={14} sinAnimacion /> Ordenar</BotonBarra>
        )}
      >
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Ordenar por</p>
        <div className="flex flex-col gap-1 mb-3">
          {COLUMNAS_DISPONIBLES.map(def => (
            <label key={def.clave} className="flex items-center gap-2 py-1 cursor-pointer select-none" onClick={() => actualizarOrden({ campo: def.clave, dir: borrador.orden.dir })}>
              {borrador.orden.campo === def.clave ? <SquareCheck size={20} className="text-[var(--color-brand)] flex-shrink-0" sinAnimacion /> : <Square size={20} className="text-[var(--text-secondary)] flex-shrink-0" sinAnimacion />}
              <span className="text-xs text-[var(--text-primary)]">{def.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => actualizarOrden({ ...borrador.orden, dir: 'asc' })}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-[6px] ${borrador.orden.dir === 'asc' ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]' : 'border border-[var(--border)] text-[var(--text-secondary)]'}`}>
            Ascendente
          </button>
          <button type="button" onClick={() => actualizarOrden({ ...borrador.orden, dir: 'desc' })}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-[6px] ${borrador.orden.dir === 'desc' ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]' : 'border border-[var(--border)] text-[var(--text-secondary)]'}`}>
            Descendente
          </button>
        </div>
      </Popover>

      <div className="flex items-center">
        <BotonDescargarCliente
          data={filasParaExportar()}
          nombre={nombreArchivo}
          tituloPdf="Cotizaciones"
          label=""
          icon={<Share2 size={14} sinAnimacion />}
        />
      </div>

      {/* Guardar — mismo tamaño/forma (rounded-[8px]) que el resto de los
          botones de esta barra (Filtros/Ordenar/Columnas/engranaje/
          exportar), pedido explícito del usuario ("debe ser igual a los
          demás") — la píldora completa del componente Button canónico no
          combinaba con sus vecinos en este toolbar puntual. Siempre en la
          misma línea, nunca se envuelve ni desaparece (el contenedor
          scrollea horizontal en vez de hacer wrap). */}
      <button
        type="button"
        onClick={guardar}
        disabled={!sinGuardar}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
          sinGuardar
            ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)] cursor-pointer'
            : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-placeholder)] cursor-not-allowed'
        }`}
      >
        <FloppyDisk size={14} sinAnimacion /> Guardar
      </button>
    </>
  )

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Buscar — siempre visible, incluso en mobile */}
      <div className="flex items-center gap-2 flex-1 min-w-[160px] rounded-[8px] border border-[var(--border)] px-3 py-2 bg-[var(--bg-input)] flex-shrink-0">
        <MagnifyingGlass size={16} className={ts} sinAnimacion />
        <input
          className={`flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)] placeholder:opacity-40`}
          placeholder="Busca por cliente o código"
          value={busqueda}
          onChange={e => onBusquedaChange(e.target.value)}
        />
      </div>

      {/* Escritorio: fila completa de controles (display:contents para que
          cada botón participe del flex-wrap del contenedor padre). Mobile
          (< sm): oculta por completo, se reemplaza por el botón "Más". */}
      <div className="hidden sm:contents">
        {controles}
      </div>

      {/* Mobile: un solo botón que abre el resto de los controles en un
          modal — en 375px, una fila con 7 botones + buscador es imposible
          de usar (pedido explícito: no copiar la referencia de escritorio
          tal cual en mobile). */}
      <button
        type="button"
        onClick={() => setMasAbierto(true)}
        className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold whitespace-nowrap flex-shrink-0 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]"
      >
        <MoreHorizontal size={14} sinAnimacion /> Más
      </button>

      <Modal
        abierto={masAbierto}
        onClose={() => setMasAbierto(false)}
        titulo="Más opciones"
        icono={<MoreHorizontal size={22} sinAnimacion />}
        textoCancelar="Cerrar"
        textoConfirmar="Listo"
        onConfirmar={() => setMasAbierto(false)}
        onCancelar={() => setMasAbierto(false)}
      >
        <div className="flex flex-col gap-2 items-stretch [&_button]:justify-start">
          {controles}
        </div>
      </Modal>

      {/* Confirmar eliminar vista — nunca confirm() nativo. */}
      <Modal
        abierto={eliminandoId !== null}
        onClose={() => setEliminandoId(null)}
        titulo="Eliminar vista"
        descripcion={vistaAEliminar ? `"${vistaAEliminar.nombre}" se elimina de este navegador. No afecta las cotizaciones, solo esta configuración guardada de columnas/filtros/orden.` : ''}
        varianteConfirmar="error"
        textoConfirmar="Eliminar"
        onConfirmar={() => { if (eliminandoId) eliminar(eliminandoId); setEliminandoId(null) }}
        onCancelar={() => setEliminandoId(null)}
      />
    </div>
  )
}

// ── Encabezado de columna de la tabla: label + flecha de orden + menú "⋮"
// (orden asc/desc, filtrar por esta columna, inmovilizar, agregar/eliminar
// columna) — mismo patrón visual pedido por el usuario (captura adjunta),
// pero en Title Case en vez de mayúsculas sostenidas (CLAUDE.md prohíbe
// mayúsculas sostenidas en texto visible, la referencia las traía así). ──
export function ColumnaHeaderMenu({ clave, borrador, setBorrador, columnaFija, setColumnaFija, densidad }: {
  clave: ClaveColumna
  borrador: VistaCotizador
  setBorrador: (v: VistaCotizador | ((prev: VistaCotizador) => VistaCotizador)) => void
  columnaFija: ClaveColumna | null
  setColumnaFija: (c: ClaveColumna | null) => void
  densidad: 'comoda' | 'compacta'
}) {
  const def = definicionDe(clave)
  const [mostrarAgregar, setMostrarAgregar] = useState(false)
  const activa = borrador.orden.campo === clave
  const columnasOcultas = COLUMNAS_DISPONIBLES.filter(d => !borrador.columnas.includes(d.clave))

  const paddingY = densidad === 'compacta' ? 'py-1' : 'py-2.5'

  function ordenar(dir: 'asc' | 'desc') {
    setBorrador(prev => ({ ...prev, orden: { campo: clave, dir } }))
  }

  function filtrarPorEstaColumna() {
    if (borrador.filtros.some(f => f.campo === clave)) return
    const nuevo: FiltroCondicion = def.tipo === 'texto'
      ? { campo: clave, tipo: 'texto', contiene: '' }
      : def.tipo === 'fecha'
        ? { campo: clave, tipo: 'fecha' }
        : { campo: clave, tipo: 'numero' }
    setBorrador(prev => ({ ...prev, filtros: [...prev.filtros, nuevo] }))
  }

  function eliminarColumna() {
    setBorrador(prev => ({ ...prev, columnas: prev.columnas.filter(c => c !== clave) }))
    if (columnaFija === clave) setColumnaFija(null)
  }

  function agregarColumna(nueva: ClaveColumna) {
    setBorrador(prev => ({ ...prev, columnas: [...prev.columnas, nueva] }))
    setMostrarAgregar(false)
  }

  // Sin hover-pop/animación — directriz explícita: nada de zoom en íconos
  // dentro de las tablas.
  const itemStyle = 'flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-[6px] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'

  return (
    <th
      className={`group text-left align-middle px-2 xl:px-3 ${paddingY}`}
      style={{
        position: columnaFija === clave ? 'sticky' : undefined,
        left: columnaFija === clave ? 0 : undefined,
        // La columna que ordena actualmente queda marcada con un gris MUY
        // tenue de arriba a abajo (encabezado + cada celda) derivado de
        // Negro Lurdes — el sistema de diseño prohíbe grises genéricos,
        // así que no es un gris suelto, sale de #474747/blanco a 5%
        // (mismo criterio ya usado en /admin/status para "Incidencias
        // Activas"). No depende de hover, es permanente mientras esa
        // columna sea la activa.
        background: columnaFija === clave ? 'var(--bg-card)' : (activa ? 'var(--table-orden-activo)' : undefined),
        zIndex: columnaFija === clave ? 1 : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => ordenar(activa && borrador.orden.dir === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-1 text-xs font-semibold rounded-[4px] px-1 -mx-1 py-0.5 min-w-0">
          {/* Título de columna alineado siempre a la izquierda, directriz explícita del usuario. */}
          <span className={`${anchoColumna(clave).encabezado} ${clave === 'tipo_cliente' ? 'whitespace-pre' : 'whitespace-normal break-words'} leading-tight text-left`} style={{ color: 'var(--color-brand)' }}>{def.label}</span>
          {/* El ícono de orden NO se ve en reposo si esta columna no es la
              activa — solo aparece al pasar el cursor sobre el encabezado
              (group-hover). Si es la activa, siempre visible. */}
          {/* Mismo tamaño e ícono "del sistema" (Lucide, vía wrapIcon) para
              el neutro y el activo — antes se veían distintos porque el
              trazo de ArrowUpDown (doble punta) ocupa menos del viewBox que
              una sola flecha, aunque el size sea igual. sinAnimacion quita
              el zoom automático que wrapIcon agrega por defecto a TODO
              ícono (ver icons.tsx) — antes ningún className propio podía
              sobreescribirlo. */}
          <span className={activa ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}>
            {activa
              ? (borrador.orden.dir === 'asc' ? <ArrowUp size={13} sinAnimacion /> : <ArrowDown size={13} sinAnimacion />)
              : <ArrowsDownUp size={13} sinAnimacion />}
          </span>
        </button>
        <Popover
          ancho={220}
          trigger={(abrir, abierto) => (
            <button
              type="button"
              onClick={abrir}
              className={`p-1 rounded-[4px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] ${abierto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <EllipsisVertical size={14} sinAnimacion />
            </button>
          )}
        >
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => ordenar('asc')} className={itemStyle}><ArrowUp size={14} sinAnimacion /> Orden ascendente</button>
            <button type="button" onClick={() => ordenar('desc')} className={itemStyle}><ArrowDown size={14} sinAnimacion /> Orden descendente</button>
            <button type="button" onClick={filtrarPorEstaColumna} className={itemStyle}><Funnel size={14} sinAnimacion /> Filtrar por esta columna</button>
            <div className="pt-2 mt-1" />
            <button type="button" onClick={() => setColumnaFija(columnaFija === clave ? null : clave)} className={itemStyle}>
              {columnaFija === clave ? <PinOff size={14} sinAnimacion /> : <Pin size={14} sinAnimacion />}
              {columnaFija === clave ? 'Quitar inmovilizado' : 'Inmovilizar columna'}
            </button>
            <button type="button" onClick={() => setMostrarAgregar(v => !v)} className={itemStyle}><Plus size={14} sinAnimacion /> Agregar columna</button>
            {mostrarAgregar && (
              <div className="pl-4 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                {columnasOcultas.length === 0
                  ? <p className="text-[11px] text-[var(--text-secondary)] px-2 py-1">Ya están todas visibles.</p>
                  : columnasOcultas.map(d => (
                    <button key={d.clave} type="button" onClick={() => agregarColumna(d.clave)} className="text-left px-2 py-1.5 rounded-[6px] text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                      {d.label}
                    </button>
                  ))}
              </div>
            )}
            <button type="button" onClick={eliminarColumna} className="flex items-center gap-2 w-full text-left px-2.5 py-2 text-xs font-medium bg-transparent text-[var(--color-error)] transition-opacity duration-200 hover:opacity-50">
              <Trash size={14} sinAnimacion /> Eliminar columna
            </button>
          </div>
        </Popover>
      </div>
    </th>
  )
}
