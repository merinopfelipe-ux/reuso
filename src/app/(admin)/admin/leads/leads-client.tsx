'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Tray, Envelope, Buildings, Calendar, ChatCircle, CaretDown, CaretUp, Phone } from '@phosphor-icons/react'
import { WA_NUMBER } from '@/lib/constants/contacto'

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
}


function estadoBadge(estado: EstadoLead) {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.nuevo
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

export function LeadsClient({ leads: inicial }: { leads: Lead[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [leads, setLeads] = useState(inicial)
  const [filtroEstado, setFiltroEstado] = useState<EstadoLead | ''>('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [cambiando, setCambiando] = useState<string | null>(null)

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
    const texto = encodeURIComponent(
      `Hola${lead.nombre ? ` ${lead.nombre}` : ''}, te contactamos desde Reuso por tu interés en ${lead.interes ?? 'nuestros planes'}. ¿Tienes un momento para conversar?`
    )
    const num = lead.telefono?.replace(/\D/g, '') ?? WA_NUMBER
    window.open(`https://wa.me/${num}?text=${texto}`, '_blank')
  }

  const conteos = ESTADOS.reduce((acc, e) => {
    acc[e] = leads.filter(l => l.estado === e).length
    return acc
  }, {} as Record<EstadoLead, number>)

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* KPIs rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
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
              <div key={lead.id} style={{
                background: 'var(--bg-card)', borderRadius: 12, border: `1px solid ${C.border}`,
                boxShadow: 'var(--shadow)', overflow: 'hidden',
              }}>
                {/* Fila principal */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{lead.nombre ?? '(sin nombre)'}</span>
                      {estadoBadge(lead.estado)}
                      {lead.interes && (
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, background: 'rgba(89,166,228,0.12)', color: '#2B7FBF' }}>
                          {lead.interes}
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
                  <select
                    value={lead.estado}
                    disabled={cambiando === lead.id}
                    onChange={e => cambiarEstado(lead.id, e.target.value as EstadoLead)}
                    style={{ padding: '5px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.dark, cursor: 'pointer', outline: 'none' }}
                  >
                    {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>)}
                  </select>

                  {/* WhatsApp */}
                  <button onClick={() => abrirWhatsApp(lead)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ChatCircle size={13} /> WA
                  </button>

                  {/* Expandir */}
                  <button onClick={() => setExpandido(abierto ? null : lead.id)}
                    style={{ padding: 6, borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {abierto ? <CaretUp size={15} color={C.mid} /> : <CaretDown size={15} color={C.mid} />}
                  </button>
                </div>

                {/* Detalle expandido */}
                {abierto && lead.mensaje && (
                  <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, background: C.light }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 6 }}>Mensaje</p>
                    <p style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, margin: 0 }}>{lead.mensaje}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .leads-grid { grid-template-columns: 1fr 1fr !important; }
        }
      ` }} />
    </div>
  )
}
