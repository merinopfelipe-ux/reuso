'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Inbox as Tray,
  Mail as Envelope,
  Phone,
  Pencil,
  Trash2,
  Download,
  Plus,
  MoreHorizontal,
  Check,
  ChevronDown,
  Search as MagnifyingGlass,
  Square,
  SquareCheck,
  Calendar,
  X,
} from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { WA_NUMBER } from '@/lib/constants/contacto'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'

const ESTADOS = ['nuevo', 'contactado', 'convertido', 'descartado'] as const
type EstadoLead = typeof ESTADOS[number]

// Paleta estricta alineada 100% con los tokens del Sistema de Diseño Reúso
const ESTADO_CONFIG: Record<
  EstadoLead,
  { label: string; bg: string; color: string; border: string; dot: string }
> = {
  nuevo: {
    label: 'Nuevo',
    bg: 'var(--color-brand-light)',
    color: 'var(--color-brand)',
    border: 'var(--border)',
    dot: 'var(--color-brand)',
  },
  contactado: {
    label: 'Contactado',
    bg: 'rgba(246, 191, 62, 0.12)',
    color: 'var(--color-warning-content)',
    border: 'rgba(246, 191, 62, 0.3)',
    dot: 'var(--color-warning)',
  },
  convertido: {
    label: 'Convertido',
    bg: 'rgba(56, 185, 142, 0.12)',
    color: 'var(--color-success-content)',
    border: 'rgba(56, 185, 142, 0.3)',
    dot: 'var(--color-success)',
  },
  descartado: {
    label: 'Descartado',
    bg: 'var(--bg-table-hover)',
    color: 'var(--text-secondary)',
    border: 'var(--border)',
    dot: 'var(--text-placeholder)',
  },
}

interface Lead {
  id: string
  nombre: string | null
  email: string | null
  telefono: string | null
  empresa: string | null
  interes: string | null
  mensaje: string | null
  estado: EstadoLead
  created_at: string
  evento_nombre?: string | null
}

interface Evento {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string | null
}

function formatearFechaLead(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { dia: '-', hora: '' }
  const dia = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { dia, hora }
}

/** Separa un nombre completo en Nombre(s) y Apellido(s) para los formularios */
function partirNombreCompleto(nombreCompleto: string | null | undefined): { nombre: string; apellido: string } {
  if (!nombreCompleto) return { nombre: '', apellido: '' }
  const partes = nombreCompleto.trim().split(/\s+/)
  if (partes.length <= 1) return { nombre: partes[0] || '', apellido: '' }
  if (partes.length === 2) return { nombre: partes[0], apellido: partes[1] }
  if (partes.length === 3) return { nombre: partes.slice(0, 2).join(' '), apellido: partes[2] }
  return { nombre: partes.slice(0, 2).join(' '), apellido: partes.slice(2).join(' ') }
}

export function LeadsClient({
  leads: inicial,
  eventos: eventosIniciales = [],
}: {
  leads: Lead[]
  eventos?: Evento[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [leads, setLeads] = useState(inicial)

  // ── Filtros y búsqueda ──
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoLead | ''>('')
  const [filtroEvento, setFiltroEvento] = useState('')

  // ── Selección múltiple para borrado en grupo ──
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [modalEliminarGrupo, setModalEliminarGrupo] = useState(false)
  const [eliminandoGrupo, setEliminandoGrupo] = useState(false)
  const [errorEliminarGrupo, setErrorEliminarGrupo] = useState('')

  // ── Estado individual y cambio rápido ──
  const [cambiando, setCambiando] = useState<string | null>(null)

  // ── Eliminar individual modal ──
  const [leadAEliminar, setLeadAEliminar] = useState<Lead | null>(null)
  const [eliminandoIndividual, setEliminandoIndividual] = useState(false)
  const [errorEliminarIndividual, setErrorEliminarIndividual] = useState('')

  // ── Panel de gestión de eventos ──
  const [eventos, setEventos] = useState(eventosIniciales)
  const [mostrarGestorEventos, setMostrarGestorEventos] = useState(false)
  const [evNombre, setEvNombre] = useState('')
  const [evFechaInicio, setEvFechaInicio] = useState('')
  const [evFechaFin, setEvFechaFin] = useState('')
  const [evError, setEvError] = useState('')
  const [evGuardando, setEvGuardando] = useState(false)

  // ── Modal de nuevo contacto manual ──
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [formCrear, setFormCrear] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    empresa: '',
    interes: '',
    evento_nombre: '',
    mensaje: '',
    estado: 'nuevo' as EstadoLead,
  })
  const [guardandoCrear, setGuardandoCrear] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  // ── Modal de edición de contacto con Nombre y Apellido separados ──
  const [leadEditando, setLeadEditando] = useState<Lead | null>(null)
  const [formEdit, setFormEdit] = useState({
    id: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    empresa: '',
    interes: '',
    evento_nombre: '',
    mensaje: '',
    estado: 'nuevo' as EstadoLead,
  })
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')

  // Sincronizar leads cuando cambien desde el servidor
  useEffect(() => {
    setLeads(inicial)
  }, [inicial])

  // Limpiar selección de IDs que ya no existen
  useEffect(() => {
    setSeleccionados(prev => {
      const idsActuales = new Set(leads.map(l => l.id))
      const nuevos = new Set(Array.from(prev).filter(id => idsActuales.has(id)))
      return nuevos.size === prev.size ? prev : nuevos
    })
  }, [leads])

  // ── Filtrado interactivo ──
  const filtrados = leads.filter(lead => {
    if (filtroEstado && lead.estado !== filtroEstado) return false
    if (filtroEvento && (lead.evento_nombre ?? '') !== filtroEvento) return false
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase().trim()
    return (
      (lead.nombre ?? '').toLowerCase().includes(q) ||
      (lead.email ?? '').toLowerCase().includes(q) ||
      (lead.empresa ?? '').toLowerCase().includes(q) ||
      (lead.telefono ?? '').toLowerCase().includes(q) ||
      (lead.interes ?? '').toLowerCase().includes(q) ||
      (lead.evento_nombre ?? '').toLowerCase().includes(q) ||
      (lead.mensaje ?? '').toLowerCase().includes(q)
    )
  })

  // Conteo de estados
  const conteos: Record<EstadoLead, number> = {
    nuevo: leads.filter(l => l.estado === 'nuevo').length,
    contactado: leads.filter(l => l.estado === 'contactado').length,
    convertido: leads.filter(l => l.estado === 'convertido').length,
    descartado: leads.filter(l => l.estado === 'descartado').length,
  }

  // ── Selección masiva ──
  const todosSeleccionados = filtrados.length > 0 && filtrados.every(l => seleccionados.has(l.id))

  function toggleSeleccionarTodos() {
    setSeleccionados(prev => {
      if (todosSeleccionados) {
        const siguiente = new Set(prev)
        filtrados.forEach(l => siguiente.delete(l.id))
        return siguiente
      } else {
        const siguiente = new Set(prev)
        filtrados.forEach(l => siguiente.add(l.id))
        return siguiente
      }
    })
  }

  function toggleSeleccionado(id: string) {
    setSeleccionados(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  // ── Cambiar estado rápido ──
  async function cambiarEstado(id: string, nuevoEstado: EstadoLead) {
    setCambiando(id)
    const prev = leads.find(l => l.id === id)?.estado
    setLeads(ls => ls.map(l => (l.id === id ? { ...l, estado: nuevoEstado } : l)))

    const res = await fetch(`/api/admin/leads?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })

    setCambiando(null)
    if (!res.ok) {
      if (prev) setLeads(ls => ls.map(l => (l.id === id ? { ...l, estado: prev } : l)))
    } else {
      startTransition(() => router.refresh())
    }
  }

  // ── Eliminar individual ──
  async function confirmarEliminarIndividual() {
    if (!leadAEliminar) return
    setEliminandoIndividual(true)
    setErrorEliminarIndividual('')

    const res = await fetch(`/api/admin/leads?id=${leadAEliminar.id}`, { method: 'DELETE' })
    setEliminandoIndividual(false)

    if (res.ok) {
      setLeads(ls => ls.filter(l => l.id !== leadAEliminar.id))
      setSeleccionados(prev => {
        const nuevo = new Set(prev)
        nuevo.delete(leadAEliminar.id)
        return nuevo
      })
      setLeadAEliminar(null)
      startTransition(() => router.refresh())
    } else {
      const d = await res.json().catch(() => ({}))
      setErrorEliminarIndividual(d.error ?? 'No se pudo eliminar el contacto.')
    }
  }

  // ── Eliminar en grupo (batch delete) ──
  async function confirmarEliminarGrupo() {
    if (seleccionados.size === 0) return
    setEliminandoGrupo(true)
    setErrorEliminarGrupo('')

    const idsArray = Array.from(seleccionados)
    const res = await fetch(`/api/admin/leads?ids=${idsArray.join(',')}`, { method: 'DELETE' })
    setEliminandoGrupo(false)

    if (res.ok) {
      setLeads(ls => ls.filter(l => !seleccionados.has(l.id)))
      setSeleccionados(new Set())
      setModalEliminarGrupo(false)
      startTransition(() => router.refresh())
    } else {
      const d = await res.json().catch(() => ({}))
      setErrorEliminarGrupo(d.error ?? 'Error al eliminar los prospectos seleccionados.')
    }
  }

  // ── WhatsApp ──
  function abrirWhatsApp(lead: Lead) {
    const rawTel = lead.telefono ? lead.telefono.replace(/[^\d+]/g, '') : ''
    const tel = rawTel.length >= 7 ? (rawTel.startsWith('+') ? rawTel.replace('+', '') : rawTel) : WA_NUMBER
    const texto = encodeURIComponent(
      `Hola ${lead.nombre || ''}, te escribo de Reúso en seguimiento a tu solicitud de información.`
    )
    window.open(`https://wa.me/${tel}?text=${texto}`, '_blank', 'noopener,noreferrer')
  }

  // ── Crear evento ──
  async function crearEvento() {
    setEvError('')
    setEvGuardando(true)
    const res = await fetch('/api/admin/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: evNombre, fecha_inicio: evFechaInicio, fecha_fin: evFechaFin || null }),
    })
    const data = await res.json().catch(() => ({}))
    setEvGuardando(false)
    if (!res.ok) return setEvError(data.error ?? 'No pudimos guardar el evento.')
    setEventos(prev => [data.evento, ...prev].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)))
    setEvNombre('')
    setEvFechaInicio('')
    setEvFechaFin('')
  }

  async function borrarEvento(id: string) {
    const res = await fetch(`/api/admin/eventos?id=${id}`, { method: 'DELETE' })
    if (res.ok) setEventos(prev => prev.filter(e => e.id !== id))
  }

  // ── Crear manual ──
  function abrirCrear() {
    setErrorCrear('')
    setFormCrear({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      empresa: '',
      interes: '',
      evento_nombre: filtroEvento || '',
      mensaje: '',
      estado: 'nuevo',
    })
    setModalCrearAbierto(true)
  }

  async function guardarCrear() {
    const nombreCompleto = [formCrear.nombre.trim(), formCrear.apellido.trim()].filter(Boolean).join(' ')
    if (!nombreCompleto) {
      setErrorCrear('Ingresa al menos el nombre del contacto.')
      return
    }

    setGuardandoCrear(true)
    setErrorCrear('')

    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombreCompleto,
        email: formCrear.email.trim() || null,
        telefono: formCrear.telefono.trim() || null,
        empresa: formCrear.empresa.trim() || null,
        interes: formCrear.interes.trim() || null,
        evento_nombre: formCrear.evento_nombre.trim() || null,
        mensaje: formCrear.mensaje.trim() || null,
        estado: formCrear.estado,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setGuardandoCrear(false)

    if (!res.ok) {
      setErrorCrear(data.error ?? 'Error al registrar el contacto.')
      return
    }

    setLeads(prev => [data, ...prev])
    setModalCrearAbierto(false)
    startTransition(() => router.refresh())
  }

  // ── Editar contacto ──
  function abrirEdicion(lead: Lead) {
    const { nombre, apellido } = partirNombreCompleto(lead.nombre)
    setErrorEdit('')
    setFormEdit({
      id: lead.id,
      nombre,
      apellido,
      email: lead.email ?? '',
      telefono: lead.telefono ?? '',
      empresa: lead.empresa ?? '',
      interes: lead.interes ?? '',
      evento_nombre: lead.evento_nombre ?? '',
      mensaje: lead.mensaje ?? '',
      estado: lead.estado,
    })
    setLeadEditando(lead)
  }

  async function guardarEdicion() {
    if (!leadEditando) return
    const nombreCompleto = [formEdit.nombre.trim(), formEdit.apellido.trim()].filter(Boolean).join(' ')
    if (!nombreCompleto) {
      setErrorEdit('Ingresa al menos el nombre del contacto.')
      return
    }

    setGuardandoEdit(true)
    setErrorEdit('')

    const res = await fetch(`/api/admin/leads?id=${leadEditando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombreCompleto,
        email: formEdit.email.trim() || null,
        telefono: formEdit.telefono.trim() || null,
        empresa: formEdit.empresa.trim() || null,
        interes: formEdit.interes.trim() || null,
        evento_nombre: formEdit.evento_nombre.trim() || null,
        mensaje: formEdit.mensaje.trim() || null,
        estado: formEdit.estado,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setGuardandoEdit(false)

    if (!res.ok) {
      setErrorEdit(data.error ?? 'Error al actualizar el contacto.')
      return
    }

    setLeads(ls => ls.map(l => (l.id === leadEditando.id ? { ...l, ...data } : l)))
    setLeadEditando(null)
    startTransition(() => router.refresh())
  }

  // ── Exportar a CSV (Descarga directa del navegador) ──
  function exportarCSV() {
    const encabezados = ['ID', 'Nombre', 'Email', 'Teléfono', 'Empresa', 'Interés', 'Evento', 'Estado', 'Fecha']
    const filas = filtrados.map(l => [
      `"${l.id}"`,
      `"${(l.nombre ?? '').replace(/"/g, '""')}"`,
      `"${(l.email ?? '').replace(/"/g, '""')}"`,
      `"${(l.telefono ?? '').replace(/"/g, '""')}"`,
      `"${(l.empresa ?? '').replace(/"/g, '""')}"`,
      `"${(l.interes ?? '').replace(/"/g, '""')}"`,
      `"${(l.evento_nombre ?? '').replace(/"/g, '""')}"`,
      `"${l.estado}"`,
      `"${l.created_at}"`,
    ])

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `leads-reuso-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Tarjetas resumen interactivo (KPIs con tokens oficiales) ── */}
      <div className="leads-grid grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ESTADOS.map(e => {
          const cfg = ESTADO_CONFIG[e]
          const activo = filtroEstado === e
          return (
            <button
              key={e}
              type="button"
              onClick={() => setFiltroEstado(activo ? '' : e)}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                activo
                  ? 'border-brand bg-(--bg-hover) shadow-xs'
                  : 'border-(--border) bg-(--bg-card) hover:bg-(--bg-table-hover)'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold m-0 leading-none" style={{ color: cfg.color }}>
                  {conteos[e]}
                </span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
              </div>
              <p className="text-xs font-semibold text-(--text-secondary) mt-1.5 m-0">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* ── Toolbar del Sistema de Diseño ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        {/* Lado izquierdo: Búsqueda y Filtros */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          {/* Campo de búsqueda canónico */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-placeholder) pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email, empresa..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-(--border) bg-(--bg-input) text-sm text-(--text-primary) placeholder:text-(--text-placeholder) outline-hidden focus:border-brand transition-colors"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtro de Estado con Selector */}
          <Selector
            opciones={[
              { value: '', label: 'Todos los estados' },
              { value: 'nuevo', label: 'Nuevo' },
              { value: 'contactado', label: 'Contactado' },
              { value: 'convertido', label: 'Convertido' },
              { value: 'descartado', label: 'Descartado' },
            ]}
            value={filtroEstado}
            onChange={v => setFiltroEstado(v as EstadoLead | '')}
            tamano="sm"
            placeholder="Estado"
            className="w-40"
          />

          {/* Filtro de Evento si existen eventos registrados */}
          {eventos.length > 0 && (
            <Selector
              opciones={[
                { value: '', label: 'Todos los eventos' },
                ...eventos.map(ev => ({ value: ev.nombre, label: ev.nombre })),
              ]}
              value={filtroEvento}
              onChange={v => setFiltroEvento(v)}
              tamano="sm"
              placeholder="Evento"
              className="w-44"
            />
          )}

          {/* Indicador de filtros activos para limpiar */}
          {(filtroEstado || filtroEvento || busqueda) && (
            <button
              type="button"
              onClick={() => {
                setFiltroEstado('')
                setFiltroEvento('')
                setBusqueda('')
              }}
              className="text-xs font-semibold text-brand hover:underline px-2 cursor-pointer whitespace-nowrap"
            >
              Restablecer
            </button>
          )}
        </div>

        {/* Lado derecho: Acciones primarias y herramientas */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón de gestión de eventos desplegable */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMostrarGestorEventos(v => !v)}
            className="gap-1.5"
            title="Administrar eventos comerciales"
          >
            <Calendar size={13} />
            <span>Eventos ({eventos.length})</span>
          </Button>

          {/* Botón Exportar CSV */}
          <Button
            variant="secondary"
            size="sm"
            onClick={exportarCSV}
            disabled={filtrados.length === 0}
            className="gap-1.5"
            title="Exportar listado actual a archivo CSV"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </Button>

          {/* Botón Nuevo contacto manual */}
          <Button variant="primary" size="sm" onClick={abrirCrear} className="gap-1.5 shadow-2xs">
            <Plus size={14} />
            <span>Nuevo contacto</span>
          </Button>
        </div>
      </div>

      {/* ── Gestor de Eventos Colapsable ── */}
      {mostrarGestorEventos && (
        <div className="rounded-card border border-(--border) bg-(--bg-card) p-4 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-brand m-0">Eventos y ferias</p>
              <p className="text-xs text-(--text-secondary) m-0 mt-0.5">
                Los contactos captados durante el rango de fechas quedarán etiquetados automáticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarGestorEventos(false)}
              className="p-1 rounded-lg hover:bg-(--bg-table-hover) text-(--text-secondary) cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <input
              type="text"
              placeholder="Nombre del evento (ej: Climate Week)"
              value={evNombre}
              onChange={e => setEvNombre(e.target.value)}
              className="sm:col-span-2 rounded-xl border border-(--border) bg-(--bg-input) px-3 py-1.5 text-xs text-(--text-primary) outline-hidden focus:border-brand"
            />
            <input
              type="date"
              value={evFechaInicio}
              onChange={e => setEvFechaInicio(e.target.value)}
              className="rounded-xl border border-(--border) bg-(--bg-input) px-2.5 py-1.5 text-xs text-(--text-primary) outline-hidden focus:border-brand"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={evFechaFin}
                onChange={e => setEvFechaFin(e.target.value)}
                className="flex-1 rounded-xl border border-(--border) bg-(--bg-input) px-2.5 py-1.5 text-xs text-(--text-primary) outline-hidden focus:border-brand"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={crearEvento}
                disabled={evGuardando || !evNombre.trim() || !evFechaInicio}
                className="whitespace-nowrap px-3 text-xs"
              >
                {evGuardando ? '...' : 'Crear'}
              </Button>
            </div>
          </div>

          {evError && <p className="text-xs text-error font-medium m-0">{evError}</p>}

          {eventos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-(--border)">
              {eventos.map(ev => {
                const inicio = new Date(ev.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                })
                const fin = ev.fecha_fin
                  ? new Date(ev.fecha_fin + 'T00:00:00').toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : null
                return (
                  <span
                    key={ev.id}
                    className="inline-flex items-center gap-2 text-xs bg-(--bg-input) border border-(--border) px-2.5 py-1 rounded-lg text-(--text-primary)"
                  >
                    <span>
                      <strong>{ev.nombre}</strong> ({fin && fin !== inicio ? `${inicio} – ${fin}` : inicio})
                    </span>
                    <button
                      type="button"
                      onClick={() => borrarEvento(ev.id)}
                      className="text-error hover:opacity-70 cursor-pointer font-bold ml-0.5"
                      title="Eliminar evento"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Barra de Selección Masiva (Borrado en Grupo) ── */}
      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand-light px-4 py-2.5 shadow-2xs">
          <span className="text-xs font-semibold text-brand">
            {seleccionados.size} {seleccionados.size === 1 ? 'prospecto seleccionado' : 'prospectos seleccionados'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSeleccionados(new Set())}
              className="text-xs font-medium px-2.5 py-1 text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
            >
              Deseleccionar
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorEliminarGrupo('')
                setModalEliminarGrupo(true)
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-(--bg-card) border border-(--border) text-error hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
            >
              <Trash2 size={13} />
              <span>Eliminar seleccionados</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tabla Canónica del Sistema de Diseño ── */}
      {filtrados.length === 0 ? (
        <div className="rounded-card border border-dashed border-(--border) bg-(--bg-card) p-12 text-center">
          <Tray size={38} className="text-(--text-placeholder) mx-auto mb-3" />
          <p className="text-sm font-semibold text-(--text-primary) m-0">
            Sin prospectos con los filtros aplicados
          </p>
          <p className="text-xs text-(--text-secondary) mt-1">
            {busqueda || filtroEstado || filtroEvento
              ? 'Prueba modificando la búsqueda o restableciendo los filtros de estado.'
              : 'Los registros del formulario de la landing o creados manualmente aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-(--border) bg-(--bg-card) overflow-x-auto shadow-xs">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-(--bg-table-header) text-brand border-b border-(--border)">
                {/* Checkbox para seleccionar todos */}
                <th className="px-3 py-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSeleccionarTodos}
                    className="inline-flex items-center justify-center cursor-pointer"
                    title={todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  >
                    {todosSeleccionados ? (
                      <SquareCheck size={18} className="text-brand" />
                    ) : (
                      <Square size={18} className="text-(--text-secondary) opacity-50 hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Nombre</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Empresa</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Contacto</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Interés / Evento</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Fecha y hora</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs whitespace-nowrap">Estado</th>
                <th className="px-3 py-2.5 w-12 text-center" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((lead, idx) => {
                const { dia, hora } = formatearFechaLead(lead.created_at)
                const estaSeleccionado = seleccionados.has(lead.id)

                return (
                  <tr
                    key={lead.id}
                    className={`transition-colors duration-150 hover:bg-(--bg-table-hover) ${
                      idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                    }`}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                  >
                    {/* Checkbox de selección individual */}
                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSeleccionado(lead.id)}
                        className="inline-flex items-center justify-center cursor-pointer"
                        title={estaSeleccionado ? 'Deseleccionar prospecto' : 'Seleccionar prospecto'}
                      >
                        {estaSeleccionado ? (
                          <SquareCheck size={18} className="text-brand" />
                        ) : (
                          <Square size={18} className="text-(--text-secondary) opacity-50 hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>

                    {/* Nombre */}
                    <td className="px-4 py-3 text-(--text-primary) font-semibold whitespace-nowrap">
                      {lead.nombre || <span className="opacity-40 font-normal">(sin nombre)</span>}
                    </td>

                    {/* Empresa */}
                    <td className="px-4 py-3 text-(--text-secondary) whitespace-nowrap">
                      {lead.empresa || <span className="opacity-40">-</span>}
                    </td>

                    {/* Contacto (Email + Teléfono) */}
                    <td className="px-4 py-3 text-(--text-secondary)">
                      <div className="flex flex-col gap-1 text-xs">
                        {lead.email && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Envelope size={12} className="text-(--text-secondary) shrink-0" />
                            <a
                              href={`mailto:${lead.email}`}
                              className="text-(--text-primary) hover:text-brand hover:underline"
                            >
                              {lead.email}
                            </a>
                          </span>
                        )}
                        {lead.telefono && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Phone size={12} className="text-(--text-secondary) shrink-0" />
                            <span>{lead.telefono}</span>
                          </span>
                        )}
                        {!lead.email && !lead.telefono && <span className="opacity-40">-</span>}
                      </div>
                    </td>

                    {/* Interés / Evento (si tiene evento, solo muestra "Evento: Nombre", no duplicado) */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {lead.evento_nombre ? (
                        <span className="text-(--text-secondary) text-[12px]">
                          Evento: {lead.evento_nombre}
                        </span>
                      ) : lead.interes ? (
                        <span className="font-medium text-(--text-primary)">{lead.interes}</span>
                      ) : (
                        <span className="opacity-40">-</span>
                      )}
                    </td>

                    {/* Fecha y hora en dos líneas */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-(--text-primary)">{dia}</span>
                        <span className="text-(--text-secondary) text-[11px] mt-0.5">{hora}</span>
                      </div>
                    </td>

                    {/* Selector de Estado Portal-based (Sin solapamientos) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EstadoDropdownLead
                        estado={lead.estado}
                        cambiando={cambiando === lead.id}
                        onCambiar={nuevo => cambiarEstado(lead.id, nuevo)}
                      />
                    </td>

                    {/* Menú de 3 puntos horizontales Portal-based */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <MenuTresPuntosLead
                        onEditar={() => abrirEdicion(lead)}
                        onWhatsApp={() => abrirWhatsApp(lead)}
                        onEliminar={() => {
                          setErrorEliminarIndividual('')
                          setLeadAEliminar(lead)
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de Confirmación: Eliminar en Grupo ── */}
      {modalEliminarGrupo && (
        <Modal
          abierto={modalEliminarGrupo}
          onClose={() => setModalEliminarGrupo(false)}
          titulo={
            seleccionados.size === 1
              ? '¿Eliminar 1 prospecto seleccionado?'
              : `¿Eliminar ${seleccionados.size} prospectos seleccionados?`
          }
          descripcion={`Vas a eliminar permanentemente ${seleccionados.size} registros de contactos comerciales. Esta acción no se puede deshacer.`}
          icono={<Trash2 size={20} className="text-error" />}
          textoConfirmar={eliminandoGrupo ? 'Eliminando...' : 'Sí, eliminar'}
          textoCancelar="Cancelar"
          varianteConfirmar="error"
          onConfirmar={confirmarEliminarGrupo}
          onCancelar={() => setModalEliminarGrupo(false)}
        >
          {errorEliminarGrupo && <p className="text-xs text-error font-medium">{errorEliminarGrupo}</p>}
        </Modal>
      )}

      {/* ── Modal de Confirmación: Eliminar Individual ── */}
      {leadAEliminar && (
        <Modal
          abierto={Boolean(leadAEliminar)}
          onClose={() => setLeadAEliminar(null)}
          titulo="¿Eliminar prospecto comercial?"
          descripcion={`Vas a eliminar a "${leadAEliminar.nombre || 'este prospecto'}" de forma permanente. Esta acción no se puede deshacer.`}
          icono={<Trash2 size={20} className="text-error" />}
          textoConfirmar={eliminandoIndividual ? 'Eliminando...' : 'Sí, eliminar'}
          textoCancelar="Cancelar"
          varianteConfirmar="error"
          onConfirmar={confirmarEliminarIndividual}
          onCancelar={() => setLeadAEliminar(null)}
        >
          {errorEliminarIndividual && <p className="text-xs text-error font-medium">{errorEliminarIndividual}</p>}
        </Modal>
      )}

      {/* ── Modal: Creación Manual con Nombre y Apellido Separados ── */}
      {modalCrearAbierto && (
        <Modal
          abierto={modalCrearAbierto}
          onClose={() => setModalCrearAbierto(false)}
          titulo="Nuevo contacto"
          descripcion="Registra manualmente un prospecto comercial o contacto de evento."
          icono={<Plus size={20} />}
          ancho="lg"
          textoConfirmar={guardandoCrear ? 'Guardando...' : 'Guardar contacto'}
          textoCancelar="Cancelar"
          onConfirmar={guardarCrear}
          onCancelar={() => setModalCrearAbierto(false)}
        >
          <div className="flex flex-col gap-3.5 pt-1">
            {errorCrear && <p role="alert" className="text-xs text-error font-medium">{errorCrear}</p>}

            {/* Nombre y Apellido separados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">
                  Nombre(s) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCrear.nombre}
                  onChange={e => setFormCrear(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. María Angélica"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">
                  Apellido(s)
                </label>
                <input
                  type="text"
                  value={formCrear.apellido}
                  onChange={e => setFormCrear(p => ({ ...p, apellido: e.target.value }))}
                  placeholder="Ej. Betancur Gómez"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Empresa / Organización</label>
                <input
                  type="text"
                  value={formCrear.empresa}
                  onChange={e => setFormCrear(p => ({ ...p, empresa: e.target.value }))}
                  placeholder="Ej. Clothe S.A.S."
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Estado inicial</label>
                <select
                  value={formCrear.estado}
                  onChange={e => setFormCrear(p => ({ ...p, estado: e.target.value as EstadoLead }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand h-[38px]"
                >
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>
                      {ESTADO_CONFIG[e].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Correo electrónico</label>
                <input
                  type="email"
                  value={formCrear.email}
                  onChange={e => setFormCrear(p => ({ ...p, email: e.target.value }))}
                  placeholder="contacto@empresa.com"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Celular / WhatsApp</label>
                <input
                  type="tel"
                  value={formCrear.telefono}
                  onChange={e => setFormCrear(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 300 1234567"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Interés / Asunto</label>
                <input
                  type="text"
                  value={formCrear.interes}
                  onChange={e => setFormCrear(p => ({ ...p, interes: e.target.value }))}
                  placeholder="Ej. Plan Pro, Evento, Cotización..."
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Evento comercial vinculado</label>
                <input
                  type="text"
                  value={formCrear.evento_nombre}
                  onChange={e => setFormCrear(p => ({ ...p, evento_nombre: e.target.value }))}
                  placeholder="Ej. Climate Week Medellín"
                  list="eventos-disponibles-crear"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
                <datalist id="eventos-disponibles-crear">
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.nombre} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Mensaje o notas del contacto</label>
              <textarea
                rows={3}
                value={formCrear.mensaje}
                onChange={e => setFormCrear(p => ({ ...p, mensaje: e.target.value }))}
                placeholder="Anotaciones de la reunión, requerimientos específicos o contexto..."
                className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edición de Contacto con Nombre y Apellido Separados ── */}
      {leadEditando && (
        <Modal
          abierto={Boolean(leadEditando)}
          onClose={() => setLeadEditando(null)}
          titulo="Editar información del contacto"
          descripcion="Actualiza los datos comerciales, estado o notas de seguimiento."
          icono={<Pencil size={20} />}
          ancho="lg"
          textoConfirmar={guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
          textoCancelar="Cancelar"
          onConfirmar={guardarEdicion}
          onCancelar={() => setLeadEditando(null)}
        >
          <div className="flex flex-col gap-3.5 pt-1">
            {errorEdit && <p role="alert" className="text-xs text-error font-medium">{errorEdit}</p>}

            {/* Nombre y Apellido separados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">
                  Nombre(s) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formEdit.nombre}
                  onChange={e => setFormEdit(p => ({ ...p, nombre: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Apellido(s)</label>
                <input
                  type="text"
                  value={formEdit.apellido}
                  onChange={e => setFormEdit(p => ({ ...p, apellido: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Empresa / Organización</label>
                <input
                  type="text"
                  value={formEdit.empresa}
                  onChange={e => setFormEdit(p => ({ ...p, empresa: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Estado comercial</label>
                <select
                  value={formEdit.estado}
                  onChange={e => setFormEdit(p => ({ ...p, estado: e.target.value as EstadoLead }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand h-[38px]"
                >
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>
                      {ESTADO_CONFIG[e].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Correo electrónico</label>
                <input
                  type="email"
                  value={formEdit.email}
                  onChange={e => setFormEdit(p => ({ ...p, email: e.target.value }))}
                  placeholder="ejemplo@empresa.com"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Celular / WhatsApp</label>
                <input
                  type="tel"
                  value={formEdit.telefono}
                  onChange={e => setFormEdit(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 300 1234567"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Interés / Asunto</label>
                <input
                  type="text"
                  value={formEdit.interes}
                  onChange={e => setFormEdit(p => ({ ...p, interes: e.target.value }))}
                  placeholder="Ej. Eventos, Plan Pro..."
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Evento vinculado</label>
                <input
                  type="text"
                  value={formEdit.evento_nombre}
                  onChange={e => setFormEdit(p => ({ ...p, evento_nombre: e.target.value }))}
                  placeholder="Nombre del evento"
                  list="eventos-disponibles-edit"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
                <datalist id="eventos-disponibles-edit">
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.nombre} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Mensaje o notas del contacto</label>
              <textarea
                rows={3}
                value={formEdit.mensaje}
                onChange={e => setFormEdit(p => ({ ...p, mensaje: e.target.value }))}
                className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown de Estado con createPortal (Elimina cualquier bug de solapamiento)
// ─────────────────────────────────────────────────────────────────────────────
function EstadoDropdownLead({
  estado,
  cambiando,
  onCambiar,
}: {
  estado: EstadoLead
  cambiando: boolean
  onCambiar: (nuevo: EstadoLead) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const cfg = ESTADO_CONFIG[estado]

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!abierto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const abrirArriba = window.innerHeight - rect.bottom < 170
      setCoords({
        top: abrirArriba ? rect.top - 165 : rect.bottom + 4,
        left: Math.max(8, Math.min(window.innerWidth - 160, rect.left)),
      })
      setAbierto(true)
    } else {
      setAbierto(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={cambiando}
        onClick={toggle}
        style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-150 hover:opacity-85 ${
          cambiando ? 'opacity-50 cursor-wait' : ''
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
        <span>{cfg.label}</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={e => {
              e.stopPropagation()
              setAbierto(false)
            }}
          />
          <div
            className="fixed rounded-xl border border-(--border) bg-(--bg-card) shadow-2xl p-1 overflow-hidden flex flex-col"
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: '145px',
              zIndex: 9999,
            }}
            onClick={e => e.stopPropagation()}
          >
            {ESTADOS.map(e => {
              const itemCfg = ESTADO_CONFIG[e]
              const seleccionado = e === estado
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setAbierto(false)
                    if (!seleccionado) onCambiar(e)
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 text-left ${
                    seleccionado ? 'bg-(--bg-hover) font-bold' : 'hover:bg-(--bg-table-hover) text-(--text-primary)'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: itemCfg.dot }} />
                    <span>{itemCfg.label}</span>
                  </span>
                  {seleccionado && <Check size={13} className="text-brand shrink-0" />}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Menú de 3 Puntos Horizontales con createPortal (Garantiza visibilidad libre)
// ─────────────────────────────────────────────────────────────────────────────
function MenuTresPuntosLead({
  onEditar,
  onWhatsApp,
  onEliminar,
}: {
  onEditar: () => void
  onWhatsApp: () => void
  onEliminar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!abierto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const abrirArriba = window.innerHeight - rect.bottom < 160
      setCoords({
        top: abrirArriba ? rect.top - 135 : rect.bottom + 4,
        left: Math.max(8, Math.min(window.innerWidth - 180, rect.right - 176)),
      })
      setAbierto(true)
    } else {
      setAbierto(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="Acciones"
        className="w-8 h-8 rounded-lg border border-transparent hover:border-(--border) hover:bg-(--bg-table-hover) flex items-center justify-center text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
      >
        <MoreHorizontal size={17} />
      </button>

      {abierto && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={e => {
              e.stopPropagation()
              setAbierto(false)
            }}
          />
          <div
            className="fixed rounded-xl border border-(--border) bg-(--bg-card) shadow-2xl p-1 overflow-hidden flex flex-col text-left"
            style={{
              top: coords.top,
              left: coords.left,
              width: '176px',
              zIndex: 9999,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Editar */}
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                onEditar()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-(--text-primary) hover:bg-(--bg-table-hover) cursor-pointer transition-colors"
            >
              <Pencil size={13} className="text-brand shrink-0" />
              <span>Editar información</span>
            </button>

            {/* Enviar WhatsApp */}
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                onWhatsApp()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-(--text-primary) hover:bg-(--bg-table-hover) cursor-pointer transition-colors"
            >
              <WhatsappLogo size={13} className="text-[#25D366] shrink-0" color="#25D366" />
              <span>Enviar WhatsApp</span>
            </button>

            <div className="h-px my-1 bg-(--border)" />

            {/* Eliminar */}
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                onEliminar()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-error hover:bg-(--bg-table-hover) cursor-pointer transition-colors"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>Eliminar prospecto</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
