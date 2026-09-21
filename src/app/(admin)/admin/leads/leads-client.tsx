'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox as Tray, Mail as Envelope, Building2 as Buildings, Calendar, ChevronDown as CaretDown, ChevronUp as CaretUp, Phone, Pencil, Trash2, Download } from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { WA_NUMBER } from '@/lib/constants/contacto'
import { Selector } from '@/components/ui/selector'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

const C = {
  brand: 'var(--color-brand)', dark: 'var(--text-primary)', mid: 'var(--text-secondary)',
  border: 'var(--border)', light: 'var(--bg-hover)',
}

const ESTADOS = ['nuevo', 'contactado', 'convertido', 'descartado'] as const
type EstadoLead = typeof ESTADOS[number]

const ESTADO_CONFIG: Record<EstadoLead, { label: string; bg: string; color: string }> = {
  nuevo:      { label: 'Nuevo',      bg: 'rgba(0,130,124,0.10)',  color: C.brand },
  contactado: { label: 'Contactado', bg: 'rgba(246,191,62,0.15)', color: '#B8860B' },
  convertido: { label: 'Convertido', bg: 'rgba(56,185,142,0.12)', color: '#1F8C65' },
  descartado: { label: 'Descartado', bg: 'rgba(255,94,75,0.10)',  color: '#CC3C2A' },
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
  notas_admin?: string | null
}

interface Evento { id: string; nombre: string; fecha: string }


function estadoBadge(estado: EstadoLead) {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.nuevo
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

export function LeadsClient({ leads: inicial, eventos: eventosIniciales = [] }: { leads: Lead[]; eventos?: Evento[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [leads, setLeads] = useState(inicial)
  const [filtroEstado, setFiltroEstado] = useState<EstadoLead | ''>('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [cambiando, setCambiando] = useState<string | null>(null)
  const [eventos, setEventos] = useState(eventosIniciales)
  const [evNombre, setEvNombre] = useState('')
  const [evFecha, setEvFecha] = useState('')
  const [evError, setEvError] = useState('')
  const [evGuardando, setEvGuardando] = useState(false)

  async function crearEvento() {
    setEvError('')
    setEvGuardando(true)
    const res = await fetch('/api/admin/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: evNombre, fecha: evFecha }) })
    const data = await res.json().catch(() => ({}))
    setEvGuardando(false)
    if (!res.ok) return setEvError(data.error ?? 'No pudimos guardar el evento.')
    setEventos(prev => [data.evento, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)))
    setEvNombre(''); setEvFecha('')
  }

  async function borrarEvento(id: string) {
    const res = await fetch(`/api/admin/eventos?id=${id}`, { method: 'DELETE' })
    if (res.ok) setEventos(prev => prev.filter(e => e.id !== id))
  }

  const [leadEditando, setLeadEditando] = useState<Lead | null>(null)
  const [formEdit, setFormEdit] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: '',
    interes: '',
    evento_nombre: '',
    mensaje: '',
    notas_admin: '',
    estado: 'nuevo' as EstadoLead,
  })
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

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
      notas_admin: lead.notas_admin ?? '',
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
          mensaje: formEdit.mensaje || null,
          notas_admin: formEdit.notas_admin || null,
          estado: formEdit.estado,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorEdit(data.error ?? 'No pudimos guardar los cambios.')
        setGuardandoEdit(false)
        return
      }
      setLeads(prev => prev.map(l => l.id === leadEditando.id ? { ...l, ...data } : l))
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
    setEliminandoId(id)
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id))
        if (leadEditando?.id === id) setLeadEditando(null)
        startTransition(() => router.refresh())
      }
    } finally {
      setEliminandoId(null)
    }
  }

  const filtrados = filtroEstado ? leads.filter(l => l.estado === filtroEstado) : leads

  async function cambiarEstado(id: string, estado: EstadoLead) {
    setCambiando(id)
    await fetch(`/api/admin/leads?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, estado } : l))
    setCambiando(null)
    startTransition(() => router.refresh())
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
    const num = lead.telefono?.replace(/\D/g, '') ?? WA_NUMBER
    window.open(`https://wa.me/${num}?text=${texto}`, '_blank')
  }

  const conteos = ESTADOS.reduce((acc, e) => {
    acc[e] = leads.filter(l => l.estado === e).length
    return acc
  }, {} as Record<EstadoLead, number>)

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Paso D (adm-09 en /admin/qa) — el botón que el QA manual daba por
          hecho y no existía. Descarga todos los leads, no solo la página
          visible, mismo criterio que /api/admin/usuarios/exportar. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <a href="/api/admin/leads/exportar" download>
          <Button variant="secondary" size="sm" icon={<Download size={15} />}>
            Exportar a CSV
          </Button>
        </a>
      </div>

      {/* Eventos: la página /eventos y el correo automático usan el de hoy o el próximo */}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)]" style={{ padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: '0 0 4px' }}>Eventos</p>
        <p style={{ fontSize: 12, color: C.mid, margin: '0 0 12px' }}>
          Programa el nombre y la fecha. El correo dirá &quot;Nos conocemos en&quot; y el nombre del evento de hoy o el próximo.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={evNombre} onChange={e => setEvNombre(e.target.value)} placeholder="Nombre del evento" maxLength={120}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)]" style={{ padding: '8px 12px', fontSize: 13, flex: '1 1 220px' }} />
          <input type="date" value={evFecha} onChange={e => setEvFecha(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)]" style={{ padding: '8px 12px', fontSize: 13 }} />
          <Button size="sm" variant="primary" loading={evGuardando} onClick={crearEvento}>Programar</Button>
        </div>
        {evError && <p role="alert" style={{ fontSize: 12, color: 'var(--color-error)', margin: '8px 0 0' }}>{evError}</p>}
        {eventos.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {eventos.map(ev => (
              <li key={ev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, color: C.dark }}>
                <span><strong>{ev.nombre}</strong>{' · '}{new Date(`${ev.fecha}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <Button size="sm" variant="secondary" onClick={() => borrarEvento(ev.id)}>Quitar</Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* KPIs rápidos */}
      <div className="leads-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {ESTADOS.map(e => {
          const cfg = ESTADO_CONFIG[e]
          return (
            <button key={e} onClick={() => setFiltroEstado(filtroEstado === e ? '' : e)}
              style={{
                padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${filtroEstado === e ? C.brand : C.border}`,
                background: filtroEstado === e ? C.light : 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                color: 'var(--text-primary)',
                transition: 'all 0.2s',
              }}>
              <p style={{ fontSize: 26, fontWeight: 800, color: cfg.color, margin: '0 0 2px' }}>{conteos[e]}</p>
              <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 16 }}>
          <Tray size={40} color={C.border} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>Sin leads{filtroEstado ? ` en estado "${ESTADO_CONFIG[filtroEstado].label}"` : ''}</p>
          <p style={{ fontSize: 13, color: C.mid }}>Cuando alguien complete el formulario de la landing aparecerá aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(lead => {
            const abierto = expandido === lead.id
            return (
              <div key={lead.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                {/* Fila principal */}
                <div className="lead-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{lead.nombre ?? '(sin nombre)'}</span>
                      {estadoBadge(lead.estado)}
                      {lead.interes && (
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, background: 'rgba(89,166,228,0.12)', color: '#2B7FBF' }}>
                          {lead.interes}{lead.evento_nombre ? ` · ${lead.evento_nombre}` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {lead.email && (
                        <span style={{ fontSize: 12, color: C.mid, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Envelope size={11} />{lead.email}
                        </span>
                      )}
                      {lead.empresa && (
                        <span style={{ fontSize: 12, color: C.mid, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Buildings size={11} />{lead.empresa}
                        </span>
                      )}
                      {lead.telefono && (
                        <span style={{ fontSize: 12, color: C.mid, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} />{lead.telefono}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: C.mid, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} />{new Date(lead.created_at).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  </div>

                  {/* Cambiar estado */}
                  <div style={{ minWidth: 140 }}>
                    <Selector
                      value={lead.estado}
                      disabled={cambiando === lead.id}
                      onChange={val => cambiarEstado(lead.id, val as EstadoLead)}
                      opciones={ESTADOS.map(e => ({ value: e, label: ESTADO_CONFIG[e].label }))}
                    />
                  </div>

                  {/* Editar Lead */}
                  <button
                    onClick={() => abrirEdicion(lead)}
                    className="hover-pop hover-press"
                    title="Editar información del lead"
                    style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: C.dark }}
                  >
                    <Pencil size={13} color={C.brand} /> Editar
                  </button>

                  {/* WhatsApp */}
                  <button onClick={() => abrirWhatsApp(lead)}
                    className="hover-pop hover-press"
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <WhatsappLogo size={13} color="white" /> WA
                  </button>

                  {/* Expandir */}
                  <button onClick={() => setExpandido(abierto ? null : lead.id)}
                    className="hover-pop hover-press"
                    style={{ padding: 6, borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {abierto ? <CaretUp size={15} color={C.mid} /> : <CaretDown size={15} color={C.mid} />}
                  </button>
                </div>

                {/* Detalle expandido */}
                {abierto && (
                  <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, background: C.light, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lead.mensaje && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 4 }}>Mensaje</p>
                        <p style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, margin: 0 }}>{lead.mensaje}</p>
                      </div>
                    )}
                    {lead.notas_admin && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.brand, marginBottom: 4 }}>Notas internas (Admin)</p>
                        <p style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, margin: 0 }}>{lead.notas_admin}</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Trash2 size={13} />}
                        loading={eliminandoId === lead.id}
                        onClick={() => eliminarLead(lead.id)}
                        className="text-[var(--color-error)]"
                      >
                        Eliminar lead
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de edición completa de Lead */}
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
            {errorEdit && <p role="alert" className="text-xs text-[var(--color-error)]">{errorEdit}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Nombre</label>
                <input
                  type="text"
                  value={formEdit.nombre}
                  onChange={e => setFormEdit(p => ({ ...p, nombre: e.target.value }))}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Empresa</label>
                <input
                  type="text"
                  value={formEdit.empresa}
                  onChange={e => setFormEdit(p => ({ ...p, empresa: e.target.value }))}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Correo electrónico</label>
                <input
                  type="email"
                  value={formEdit.email}
                  onChange={e => setFormEdit(p => ({ ...p, email: e.target.value }))}
                  placeholder="ejemplo@empresa.com"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Celular / Teléfono</label>
                <input
                  type="text"
                  value={formEdit.telefono}
                  onChange={e => setFormEdit(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 300 1234567"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Estado</label>
                <Selector
                  value={formEdit.estado}
                  onChange={val => setFormEdit(p => ({ ...p, estado: val as EstadoLead }))}
                  opciones={ESTADOS.map(e => ({ value: e, label: ESTADO_CONFIG[e].label }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Interés / Fuente</label>
                <input
                  type="text"
                  value={formEdit.interes}
                  onChange={e => setFormEdit(p => ({ ...p, interes: e.target.value }))}
                  placeholder="Ej. Eventos, Plan Pro..."
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Evento vinculado</label>
                <input
                  type="text"
                  value={formEdit.evento_nombre}
                  onChange={e => setFormEdit(p => ({ ...p, evento_nombre: e.target.value }))}
                  placeholder="Nombre del evento"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Mensaje original</label>
              <textarea
                rows={2}
                value={formEdit.mensaje}
                onChange={e => setFormEdit(p => ({ ...p, mensaje: e.target.value }))}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)] resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Notas internas (Admin)</label>
              <textarea
                rows={2}
                value={formEdit.notas_admin}
                onChange={e => setFormEdit(p => ({ ...p, notas_admin: e.target.value }))}
                placeholder="Añade notas del seguimiento comercial..."
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)] resize-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => eliminarLead(leadEditando.id)}
                className="text-xs font-semibold text-[var(--color-error)] hover:underline cursor-pointer"
              >
                Eliminar este lead
              </button>
              {guardandoEdit && <span className="text-xs text-[var(--text-secondary)]">Guardando...</span>}
            </div>
          </div>
        </Modal>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .leads-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .lead-row { grid-template-columns: 1fr; }
        }
      ` }} />
    </div>
  )
}
