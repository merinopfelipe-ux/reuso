'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Plus,
  LifeBuoy as Lifebuoy,
  Loader2 as CircleNotch,
  ArrowRight,
} from 'lucide-react'
import { HiloTicket } from './hilo-ticket'

export type TipoTicket = 'bug' | 'duda' | 'solicitud' | 'queja'
export type PrioridadTicket = 'baja' | 'media' | 'alta' | 'urgente'
export type EstadoTicket = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'

export interface TicketRow {
  id: string
  titulo: string
  tipo: TipoTicket
  prioridad: PrioridadTicket
  estado: EstadoTicket
  created_at: string
  updated_at: string
  unread_admin: [{ count: number }]
}

interface Props {
  esAdmin: boolean
}

const LABEL_COLORS: Record<EstadoTicket, { bg: string, text: string }> = {
  abierto: { bg: 'var(--color-brand-light)', text: 'var(--color-brand)' },
  en_proceso: { bg: 'rgba(173,124,67,0.1)', text: 'var(--color-warning-content)' },
  resuelto: { bg: 'rgba(56,185,142,0.1)',   text: 'var(--color-success-content)' },
  cerrado: { bg: 'var(--bg-hover)',          text: 'var(--text-secondary)' },
}

const TIPO_LABELS: Record<TipoTicket, string> = {
  duda: 'Duda General', bug: 'Problema Técnico', solicitud: 'Solicitud', queja: 'Queja'
}

export function ListaTickets({ esAdmin }: Props) {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketAbierto, setTicketAbierto] = useState<TicketRow | null>(null)
  
  // Modal de creacion
  const [mostrandoCrear, setMostrandoCrear] = useState(false)
  
  const fetchTickets = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/tickets')
    if (res.ok) {
      const data = await res.json()
      setTickets(data.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return (
    <>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: `1px solid var(--border)`, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: '20px', borderBottom: `1px solid var(--border)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Incidencias y Soporte
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Registra casos de ayuda, preguntas o sugerencias y nuestro equipo te asistirá.
            </p>
          </div>
          {!esAdmin && (
            <button
              onClick={() => setMostrandoCrear(true)}
              style={{
                background: 'var(--color-brand)', color: 'var(--text-on-brand)', border: 'none', borderRadius: 10,
                padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
              }}
              className="hover-pop hover-press"
            >
              <Plus size={16} strokeWidth={2.5} /> Crear Ticket
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <CircleNotch size={24} className="pulse-logo" style={{ color: 'var(--color-brand)', margin: '0 auto' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Lifebuoy size={36} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, margin: '0 0 6px' }}>No hay tickets que mostrar.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--bg-integrated)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 700 }}>Asunto</th>
                  <th style={{ padding: '12px 20px', fontWeight: 700 }}>Estado</th>
                  <th style={{ padding: '12px 20px', fontWeight: 700, textAlign: 'right' }}>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr
                    key={ticket.id}
                    onClick={() => setTicketAbierto(ticket)}
                    style={{ borderTop: `1px solid var(--border)`, cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '16px 20px', color: 'var(--text-primary)' }}>
                      <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{ticket.titulo}</p>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{TIPO_LABELS[ticket.tipo]}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: LABEL_COLORS[ticket.estado].bg,
                        color: LABEL_COLORS[ticket.estado].text,
                        padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        border: '1px solid currentColor',
                        opacity: 0.9
                      }}>
                        {ticket.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13 }}>
                      {new Date(ticket.updated_at).toLocaleDateString()}
                      <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />

      {mostrandoCrear && (
        <ModalCrearTicket
          onClose={() => setMostrandoCrear(false)}
          onCreado={() => { setMostrandoCrear(false); fetchTickets() }}
        />
      )}

      {ticketAbierto && (
        <HiloTicket
          ticketId={ticketAbierto.id}
          ticketEstado={ticketAbierto.estado}
          esAdmin={esAdmin}
          onClose={() => { setTicketAbierto(null); fetchTickets() }}
        />
      )}
    </>
  )
}

function ModalCrearTicket({ onClose, onCreado }: { onClose: () => void, onCreado: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoTicket>('duda')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCrear = async () => {
    if (titulo.length < 5 || mensaje.length < 10) {
      setError('El título o mensaje son muy cortos.')
      return
    }
    setLoading(true)
    setError('')
    
    // Convert text area plain text to html with <br>
    const htmlMsg = mensaje.replace(/\\n/g, '<br>')
    
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, tipo, prioridad: 'media', mensaje_html: htmlMsg })
    })

    if (res.ok) {
      onCreado()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(71,71,71,0.3)', backdropFilter: 'blur(8px)', zIndex: 2500 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24, zIndex: 2501, boxShadow: 'var(--shadow)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text-primary)', fontWeight: 700 }}>Nuevo Ticket</h3>
        
        {error && <div style={{ background: 'rgba(255,94,75,0.1)', color: 'var(--color-error-content)', border: '1px solid var(--color-error)', fontSize: 13, padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Asunto</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid var(--border)`, outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14 }} placeholder="Describa brevemente el problema" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Motivo / Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoTicket)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid var(--border)`, outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14 }}>
              {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Detalles (opcional)</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={5} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid var(--border)`, outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, resize: 'none' }} placeholder="Proporcione toda la información que considere relevante..." />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleCrear} disabled={loading} style={{ padding: '10px 20px', background: 'var(--color-brand)', color: 'var(--text-on-brand)', border: 'none', borderRadius: 8, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? <CircleNotch size={16} className="pulse-logo" /> : 'Enviar Ticket'}
          </button>
        </div>
      </div>
    </>
  )
}
