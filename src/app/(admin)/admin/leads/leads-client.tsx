'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
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
} from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { WA_NUMBER } from '@/lib/constants/contacto'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const ESTADOS = ['nuevo', 'contactado', 'convertido', 'descartado'] as const
type EstadoLead = typeof ESTADOS[number]

const ESTADO_CONFIG: Record<EstadoLead, { label: string; bg: string; color: string; border: string }> = {
  nuevo:      { label: 'Nuevo',      bg: 'rgba(0,130,124,0.10)',  color: '#00827C', border: 'rgba(0,130,124,0.25)' },
  contactado: { label: 'Contactado', bg: 'rgba(246,191,62,0.15)', color: '#B8860B', border: 'rgba(246,191,62,0.35)' },
  convertido: { label: 'Convertido', bg: 'rgba(56,185,142,0.12)', color: '#1F8C65', border: 'rgba(56,185,142,0.30)' },
  descartado: { label: 'Descartado', bg: 'rgba(255,94,75,0.10)',  color: '#CC3C2A', border: 'rgba(255,94,75,0.25)' },
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

export function LeadsClient({ leads: inicial, eventos: eventosIniciales = [] }: { leads: Lead[]; eventos?: Evento[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [leads, setLeads] = useState(inicial)
  const [filtroEstado, setFiltroEstado] = useState<EstadoLead | ''>('')
  const [cambiando, setCambiando] = useState<string | null>(null)
  const [leadActivoFila, setLeadActivoFila] = useState<string | null>(null)

  // ── Gestión de eventos ──
  const [eventos, setEventos] = useState(eventosIniciales)
  const [evNombre, setEvNombre] = useState('')
  const [evFechaInicio, setEvFechaInicio] = useState('')
  const [evFechaFin, setEvFechaFin] = useState('')
  const [evError, setEvError] = useState('')
  const [evGuardando, setEvGuardando] = useState(false)

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

  // ── Crear nuevo contacto manual ──
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [formCrear, setFormCrear] = useState({
    nombre: '',
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

  function abrirCrear() {
    setErrorCrear('')
    setFormCrear({
      nombre: '',
      email: '',
      telefono: '',
      empresa: '',
      interes: '',
      evento_nombre: '',
      mensaje: '',
      estado: 'nuevo',
    })
    setModalCrearAbierto(true)
  }

  async function guardarCrear() {
    if (!formCrear.nombre.trim()) {
      setErrorCrear('El nombre es obligatorio.')
      return
    }
    setErrorCrear('')
    setGuardandoCrear(true)
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formCrear.nombre.trim(),
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
      if (!res.ok) {
        setErrorCrear(data.error ?? 'No pudimos crear el contacto.')
        setGuardandoCrear(false)
        return
      }
      setLeads(prev => [data, ...prev])
      setModalCrearAbierto(false)
      startTransition(() => router.refresh())
    } catch {
      setErrorCrear('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardandoCrear(false)
    }
  }

  // ── Editar lead ──
  const [leadEditando, setLeadEditando] = useState<Lead | null>(null)
  const [formEdit, setFormEdit] = useState({
    nombre: '',
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

  function abrirEdicion(lead: Lead) {
    setLeadEditando(lead)
    setErrorEdit('')
    setFormEdit({
      nombre: lead.nombre ?? '',
      email: lead.email ?? '',
      telefono: lead.telefono ?? '',
      empresa: lead.empresa ?? '',
      interes: lead.interes ?? '',
      evento_nombre: lead.evento_nombre ?? '',
      mensaje: lead.mensaje ?? '',
      estado: lead.estado,
    })
  }

  async function guardarEdicion() {
    if (!leadEditando) return
    setErrorEdit('')
    setGuardandoEdit(true)
    try {
      const res = await fetch(`/api/admin/leads?id=${leadEditando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formEdit.nombre.trim() || null,
          email: formEdit.email.trim() || '',
          telefono: formEdit.telefono.trim() || null,
          empresa: formEdit.empresa.trim() || null,
          interes: formEdit.interes.trim() || null,
          evento_nombre: formEdit.evento_nombre.trim() || null,
          mensaje: formEdit.mensaje.trim() || null,
          estado: formEdit.estado,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorEdit(data.error ?? 'No pudimos guardar los cambios.')
        setGuardandoEdit(false)
        return
      }
      setLeads(prev => prev.map(l => (l.id === leadEditando.id ? { ...l, ...data } : l)))
      setLeadEditando(null)
      startTransition(() => router.refresh())
    } catch {
      setErrorEdit('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardandoEdit(false)
    }
  }

  async function eliminarLead(id: string) {
    if (!window.confirm('¿Seguro que deseas eliminar este lead permanentemente?')) return
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id))
        if (leadEditando?.id === id) setLeadEditando(null)
        startTransition(() => router.refresh())
      }
    } catch {
      alert('Error al intentar eliminar el contacto.')
    }
  }

  async function cambiarEstado(id: string, nuevoEstado: EstadoLead) {
    setCambiando(id)
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (res.ok) {
        setLeads(prev => prev.map(l => (l.id === id ? { ...l, estado: nuevoEstado } : l)))
        startTransition(() => router.refresh())
      }
    } finally {
      setCambiando(null)
    }
  }

  function abrirWhatsApp(lead: Lead) {
    const primerNombre = lead.nombre?.trim().split(/\s+/)[0] ?? ''
    const saludo = primerNombre ? `Hola ${primerNombre}` : 'Hola'

    let textoMensaje = `${saludo}, te contactamos desde la Calculadora de Reúso por tu interés en ${lead.interes ?? 'nuestros planes'}. ¿Tienes un momento para conversar?`

    if (lead.interes === 'Eventos' || lead.evento_nombre) {
      const nomEv = lead.evento_nombre ? ` en ${lead.evento_nombre}` : ' en el evento'
      textoMensaje = `${saludo}, nos conocimos${nomEv} y quedamos en contacto. Te escribimos de la Calculadora de Reúso. ¿Tienes un momento para conversar?`
    }

    const texto = encodeURIComponent(textoMensaje)
    const num = lead.telefono?.replace(/\D/g, '') || WA_NUMBER
    window.open(`https://wa.me/${num}?text=${texto}`, '_blank')
  }

  const conteos = ESTADOS.reduce((acc, e) => {
    acc[e] = leads.filter(l => l.estado === e).length
    return acc
  }, {} as Record<EstadoLead, number>)

  const filtrados = filtroEstado ? leads.filter(l => l.estado === filtroEstado) : leads

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Barra de acciones superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs text-(--text-secondary) m-0">
            Mostrando <strong>{filtrados.length}</strong> {filtrados.length === 1 ? 'prospecto' : 'prospectos'}
            {filtroEstado ? ` en estado "${ESTADO_CONFIG[filtroEstado].label}"` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={abrirCrear}>
            Nuevo contacto
          </Button>
          <a href="/api/admin/leads/exportar" download className="no-underline">
            <Button variant="secondary" size="sm" icon={<Download size={15} />}>
              Exportar a CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Programación de eventos */}
      <div className="rounded-card border border-(--border) bg-(--bg-card) p-4 mb-5">
        <p className="text-sm font-bold text-(--text-primary) mb-1">Eventos</p>
        <p className="text-xs text-(--text-secondary) mb-3">
          Programa nombre y rango de fechas. El correo dirá &quot;Nos encontramos en&quot; + el nombre del evento activo hoy.
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={evNombre}
            onChange={e => setEvNombre(e.target.value)}
            placeholder="Nombre del evento"
            maxLength={120}
            className="rounded-xl border border-(--border) bg-(--bg-input) text-(--text-primary) px-3 py-2 text-xs flex-1 min-w-[180px] outline-hidden focus:border-brand"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={evFechaInicio}
              onChange={e => setEvFechaInicio(e.target.value)}
              className="rounded-xl border border-(--border) bg-(--bg-input) text-(--text-primary) px-3 py-2 text-xs outline-hidden focus:border-brand"
            />
            <span className="text-xs text-(--text-secondary)">hasta</span>
            <input
              type="date"
              value={evFechaFin}
              onChange={e => setEvFechaFin(e.target.value)}
              min={evFechaInicio}
              className="rounded-xl border border-(--border) bg-(--bg-input) text-(--text-primary) px-3 py-2 text-xs outline-hidden focus:border-brand"
            />
          </div>
          <Button size="sm" variant="primary" loading={evGuardando} onClick={crearEvento}>
            Programar
          </Button>
        </div>
        {evError && <p role="alert" className="text-xs text-error mt-2">{evError}</p>}
        {eventos.length > 0 && (
          <ul className="list-none m-0 p-0 flex flex-col gap-1.5 mt-3">
            {eventos.map(ev => {
              const inicio = new Date(`${ev.fecha_inicio}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
              const fin = ev.fecha_fin
                ? new Date(`${ev.fecha_fin}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                : new Date(`${ev.fecha_inicio}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
              const rango = ev.fecha_fin && ev.fecha_fin !== ev.fecha_inicio ? `${inicio} – ${fin}` : fin
              return (
                <li key={ev.id} className="flex items-center justify-between gap-2 text-xs text-(--text-primary) bg-(--bg-input) px-3 py-1.5 rounded-lg border border-(--border)">
                  <span><strong>{ev.nombre}</strong> · {rango}</span>
                  <button
                    onClick={() => borrarEvento(ev.id)}
                    className="text-[11px] font-semibold text-error hover:underline cursor-pointer"
                  >
                    Quitar
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Filtros por estado (KPIs interactivos) */}
      <div className="leads-grid grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {ESTADOS.map(e => {
          const cfg = ESTADO_CONFIG[e]
          const activo = filtroEstado === e
          return (
            <button
              key={e}
              onClick={() => setFiltroEstado(activo ? '' : e)}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                activo ? 'border-brand bg-(--bg-hover) shadow-xs' : 'border-(--border) bg-(--bg-card) hover:bg-(--bg-table-hover)'
              }`}
            >
              <p className="text-2xl font-extrabold m-0 leading-none mb-1" style={{ color: cfg.color }}>
                {conteos[e]}
              </p>
              <p className="text-xs font-medium text-(--text-secondary) m-0">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Tabla Canónica del Sistema de Diseño */}
      {filtrados.length === 0 ? (
        <div className="rounded-card border border-dashed border-(--border) bg-(--bg-card) p-12 text-center">
          <Tray size={38} className="text-(--text-placeholder) mx-auto mb-3" />
          <p className="text-sm font-semibold text-(--text-primary) m-0">
            Sin prospectos{filtroEstado ? ` en estado "${ESTADO_CONFIG[filtroEstado].label}"` : ''}
          </p>
          <p className="text-xs text-(--text-secondary) mt-1">
            Los registros del formulario de la landing o creados manualmente aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-(--border) bg-(--bg-card) overflow-visible shadow-xs">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-(--bg-table-header) text-brand border-b border-(--border)">
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
                  const filaActiva = leadActivoFila === lead.id
                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors duration-150 hover:bg-(--bg-table-hover) ${
                        idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                      } ${filaActiva ? 'relative z-30' : 'relative z-1'}`}
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                    >
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
                              <a href={`mailto:${lead.email}`} className="text-(--text-primary) hover:text-brand hover:underline">
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

                      {/* Interés / Evento */}
                      <td className="px-4 py-3 text-(--text-secondary) whitespace-nowrap text-xs">
                        <div className="flex flex-col gap-0.5">
                          {lead.interes && (
                            <span className="font-medium text-(--text-primary)">{lead.interes}</span>
                          )}
                          {lead.evento_nombre ? (
                            <span className="inline-block text-[11px] text-brand bg-(--color-brand-alpha) px-1.5 py-0.5 rounded-md w-fit font-medium">
                              {lead.evento_nombre}
                            </span>
                          ) : (
                            !lead.interes && <span className="opacity-40">-</span>
                          )}
                        </div>
                      </td>

                      {/* Fecha y hora (en dos líneas independientes) */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-(--text-primary)">{dia}</span>
                          <span className="text-(--text-secondary) text-[11px] mt-0.5">{hora}</span>
                        </div>
                      </td>

                      {/* Selector de Estado con Stacking Context corregido */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <EstadoDropdownLead
                          estado={lead.estado}
                          cambiando={cambiando === lead.id}
                          onCambiar={nuevo => cambiarEstado(lead.id, nuevo)}
                          onOpenChange={abierto => setLeadActivoFila(abierto ? lead.id : null)}
                        />
                      </td>

                      {/* Menú de 3 puntos horizontales */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <MenuTresPuntosLead
                          onEditar={() => abrirEdicion(lead)}
                          onWhatsApp={() => abrirWhatsApp(lead)}
                          onEliminar={() => eliminarLead(lead.id)}
                          onOpenChange={abierto => setLeadActivoFila(abierto ? lead.id : null)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de CREACIÓN MANUAL de Lead */}
      {modalCrearAbierto && (
        <Modal
          abierto={modalCrearAbierto}
          onClose={() => setModalCrearAbierto(false)}
          titulo="Nuevo contacto"
          descripcion="Registra manualmente un prospecto comercial o contacto de evento."
          icono={<Plus size={20} />}
          ancho="lg"
          textoConfirmar="Guardar contacto"
          textoCancelar="Cancelar"
          onConfirmar={guardarCrear}
          onCancelar={() => setModalCrearAbierto(false)}
        >
          <div className="flex flex-col gap-3.5 pt-1">
            {errorCrear && <p role="alert" className="text-xs text-error font-medium">{errorCrear}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">
                  Nombre completo <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCrear.nombre}
                  onChange={e => setFormCrear(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. María Angélica Betancur"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

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
                  type="text"
                  value={formCrear.telefono}
                  onChange={e => setFormCrear(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 300 1234567"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Estado</label>
                <select
                  value={formCrear.estado}
                  onChange={e => setFormCrear(p => ({ ...p, estado: e.target.value as EstadoLead }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand h-[38px]"
                >
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Interés / Fuente</label>
                <input
                  type="text"
                  value={formCrear.interes}
                  onChange={e => setFormCrear(p => ({ ...p, interes: e.target.value }))}
                  placeholder="Ej. Plan Pro, Evento, Demo..."
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Evento vinculado</label>
                <input
                  type="text"
                  value={formCrear.evento_nombre}
                  onChange={e => setFormCrear(p => ({ ...p, evento_nombre: e.target.value }))}
                  placeholder="Nombre del evento"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Notas / Mensaje</label>
              <textarea
                rows={3}
                value={formCrear.mensaje}
                onChange={e => setFormCrear(p => ({ ...p, mensaje: e.target.value }))}
                placeholder="Añade contexto del prospecto o notas de la conversación..."
                className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand resize-none"
              />
            </div>

            {guardandoCrear && <span className="text-xs text-(--text-secondary)">Guardando contacto...</span>}
          </div>
        </Modal>
      )}

      {/* Modal de EDICIÓN de Lead */}
      {leadEditando && (
        <Modal
          abierto={!!leadEditando}
          onClose={() => setLeadEditando(null)}
          titulo="Editar información del Lead"
          descripcion="Modifica cualquier dato del prospecto o añade notas internas."
          icono={<Pencil size={20} />}
          ancho="lg"
          textoConfirmar="Guardar cambios"
          textoCancelar="Cancelar"
          onConfirmar={guardarEdicion}
          onCancelar={() => setLeadEditando(null)}
        >
          <div className="flex flex-col gap-3.5 pt-1">
            {errorEdit && <p role="alert" className="text-xs text-error font-medium">{errorEdit}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Nombre</label>
                <input
                  type="text"
                  value={formEdit.nombre}
                  onChange={e => setFormEdit(p => ({ ...p, nombre: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Empresa</label>
                <input
                  type="text"
                  value={formEdit.empresa}
                  onChange={e => setFormEdit(p => ({ ...p, empresa: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
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
                <label className="text-xs font-semibold text-(--text-secondary)">Celular / Teléfono</label>
                <input
                  type="text"
                  value={formEdit.telefono}
                  onChange={e => setFormEdit(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 300 1234567"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Estado</label>
                <select
                  value={formEdit.estado}
                  onChange={e => setFormEdit(p => ({ ...p, estado: e.target.value as EstadoLead }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand h-[38px]"
                >
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Interés / Fuente</label>
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
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
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

            <div className="flex justify-between items-center pt-2 border-t border-(--border)">
              <button
                type="button"
                onClick={() => eliminarLead(leadEditando.id)}
                className="text-xs font-semibold text-error hover:underline cursor-pointer"
              >
                Eliminar este lead
              </button>
              {guardandoEdit && <span className="text-xs text-(--text-secondary)">Guardando...</span>}
            </div>
          </div>
        </Modal>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .leads-grid { grid-template-columns: 1fr 1fr !important; }
        }
      ` }} />
    </div>
  )
}

// ── Dropdown de Estado con Stacking Context Garantizado ───────────────────────
function EstadoDropdownLead({
  estado,
  cambiando,
  onCambiar,
  onOpenChange,
}: {
  estado: EstadoLead
  cambiando: boolean
  onCambiar: (nuevo: EstadoLead) => void
  onOpenChange: (abierto: boolean) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = ESTADO_CONFIG[estado]

  useEffect(() => {
    onOpenChange(abierto)
  }, [abierto, onOpenChange])

  useEffect(() => {
    if (!abierto) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [abierto])

  return (
    <div ref={ref} className={`relative inline-block ${abierto ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        disabled={cambiando}
        onClick={() => setAbierto(v => !v)}
        style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-150 hover:opacity-85 ${
          cambiando ? 'opacity-50 cursor-wait' : ''
        }`}
      >
        <span>{cfg.label}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div
          className="absolute left-0 top-full mt-1.5 w-36 rounded-xl border border-(--border) bg-(--bg-card) shadow-xl p-1 z-50 overflow-hidden flex flex-col"
          style={{ minWidth: '135px' }}
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
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: itemCfg.color }} />
                  {itemCfg.label}
                </span>
                {seleccionado && <Check size={13} className="text-brand shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Menú de 3 puntos horizontales para acciones ──────────────────────────────
function MenuTresPuntosLead({
  onEditar,
  onWhatsApp,
  onEliminar,
  onOpenChange,
}: {
  onEditar: () => void
  onWhatsApp: () => void
  onEliminar: () => void
  onOpenChange: (abierto: boolean) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onOpenChange(abierto)
  }, [abierto, onOpenChange])

  useEffect(() => {
    if (!abierto) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [abierto])

  return (
    <div ref={ref} className={`relative inline-block ${abierto ? 'z-50' : 'z-10'}`} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        title="Opciones"
        className="w-8 h-8 rounded-lg border border-transparent hover:border-(--border) hover:bg-(--bg-table-hover) flex items-center justify-center text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
      >
        <MoreHorizontal size={17} />
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-(--border) bg-(--bg-card) shadow-xl p-1 z-50 overflow-hidden flex flex-col text-left">
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
            <span>Eliminar lead</span>
          </button>
        </div>
      )}
    </div>
  )
}
