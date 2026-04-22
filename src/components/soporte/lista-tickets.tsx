'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Lifebuoy, CircleNotch, ArrowRight } from '@phosphor-icons/react'
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

const BRAND = '#00827C'
const BG_LIGHT = '#EBF5F4'
const TEXT_DARK = '#1A3A38'
const TEXT_MED = '#4D7C79'
const BORDER = 'rgba(0,130,124,0.12)'

const LABEL_COLORS: Record<EstadoTicket, { bg: string, text: string }> = {
  abierto: { bg: 'rgba(0,130,124,0.1)', text: BRAND },
  en_proceso: { bg: 'rgba(173,124,67,0.1)', text: '#AD7C43' },
  resuelto: { bg: 'rgba(56,185,142,0.1)', text: '#38B98E' },
  cerrado: { bg: 'rgba(127,168,165,0.1)', text: '#7FA8A5' },
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
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT_DARK, margin: '0 0 4px' }}>
              Incidencias y Soporte
            </h2>
            <p style={{ fontSize: 13, color: TEXT_MED, margin: 0 }}>
              Registra casos de ayuda, preguntas o sugerencias y nuestro equipo te asistirá.
            </p>
          </div>
          {!esAdmin && (
            <button
              onClick={() => setMostrandoCrear(true)}
              style={{
                background: BRAND, color: '#fff', border: 'none', borderRadius: 10,
                padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={16} /> Crear Ticket
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <CircleNotch size={24} style={{ animation: 'spin 1s linear infinite', color: BRAND, margin: '0 auto' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: TEXT_MED }}>
              <Lifebuoy size={36} style={{ color: BORDER, margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, margin: '0 0 6px' }}>No hay tickets que mostrar.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: BG_LIGHT, textAlign: 'left', color: TEXT_MED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                    style={{ borderTop: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,130,124,0.03)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '16px 20px', color: TEXT_DARK }}>
                      <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{ticket.titulo}</p>
                      <span style={{ fontSize: 12, color: TEXT_MED }}>{TIPO_LABELS[ticket.tipo]}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        background: LABEL_COLORS[ticket.estado].bg,
                        color: LABEL_COLORS[ticket.estado].text,
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        {ticket.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', color: TEXT_MED, fontSize: 13 }}>
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24, zIndex: 101, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, color: TEXT_DARK, fontWeight: 700 }}>Nuevo Ticket</h3>
        
        {error && <div style={{ background: 'rgba(255,94,75,0.1)', color: '#FF5E4B', fontSize: 13, padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_MED, marginBottom: 6 }}>Asunto</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, outline: 'none', background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 14 }} placeholder="Describa brevemente el problema" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_MED, marginBottom: 6 }}>Motivo / Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoTicket)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, outline: 'none', background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 14 }}>
              {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TEXT_MED, marginBottom: 6 }}>Detalles (opcional: puedes copiar fotos aquí después en la vista de detalle)</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={5} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, outline: 'none', background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 14, resize: 'none' }} placeholder="Proporcione toda la información que considere relevante..." />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: TEXT_MED, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleCrear} disabled={loading} style={{ padding: '10px 16px', background: BRAND, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? <CircleNotch size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Enviar Ticket'}
          </button>
        </div>
      </div>
    </>
  )
}
