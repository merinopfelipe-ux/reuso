'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, PaperPlaneRight, CircleNotch, Info } from '@phosphor-icons/react'
import type { EstadoTicket, PrioridadTicket } from './lista-tickets'

interface Mensaje {
  id: string
  mensaje_html: string
  es_admin: boolean
  created_at: string
  profiles: { nombre: string, avatar_url: string, rol: string }
}

interface TicketDetalle {
  id: string
  titulo: string
  user_id: string
  estado: EstadoTicket
  prioridad: PrioridadTicket
  created_at: string
  profiles_user: { nombre: string, email: string }
}

interface Props {
  ticketId: string
  ticketEstado: EstadoTicket
  esAdmin: boolean
  onClose: () => void
}

const BRAND = '#00827C'
const BG_LIGHT = '#EBF5F4'
const TEXT_DARK = '#1A3A38'
const TEXT_MED = '#4D7C79'
const BORDER = 'rgba(0,130,124,0.12)'

export function HiloTicket({ ticketId, esAdmin, onClose }: Props) {
  const [ticket, setTicket] = useState<TicketDetalle | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [resolviendo, setResolviendo] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const fetchHilo = useCallback(async () => {
    try {
      const [resT, resM] = await Promise.all([
        fetch(`/api/tickets/${ticketId}`),
        fetch(`/api/tickets/${ticketId}/mensajes`)
      ])
      if (resT.ok) setTicket(await resT.json())
      if (resM.ok) setMensajes((await resM.json()).data)
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => { fetchHilo() }, [fetchHilo])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items ?? [])
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = ev => {
          const src = ev.target?.result as string
          document.execCommand('insertHTML', false, `<img src="${src}" style="max-width:100%;border-radius:6px;display:block;margin:8px 0;" />`)
        }
        reader.readAsDataURL(blob)
        return
      }
    }
  }, [])

  const handleEnviar = async () => {
    const html = boxRef.current?.innerHTML.trim()
    if (!html) return
    setEnviando(true)
    
    await fetch(`/api/tickets/${ticketId}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje_html: html })
    })
    
    if (boxRef.current) boxRef.current.innerHTML = ''
    await fetchHilo()
    setEnviando(false)
  }

  const cambiarEstado = async (nuevoEstado: EstadoTicket) => {
    setResolviendo(true)
    await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    })
    await fetchHilo()
    setResolviendo(false)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(500px, 100vw)', background: 'var(--bg-card)', zIndex: 101, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.1)' }}>
        
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircleNotch size={32} style={{ animation: 'spin 1s linear infinite', color: BRAND }} />
          </div>
        ) : ticket ? (
          <>
            {/* Cabecera */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, color: TEXT_MED, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>TICKET #{ticket.id.slice(0, 8)}</span>
                <h3 style={{ margin: '4px 0', fontSize: 18, color: TEXT_DARK, lineHeight: 1.3 }}>{ticket.titulo}</h3>
                <span style={{ fontSize: 13, color: TEXT_MED }}>
                  Creado por {ticket.profiles_user?.nombre} &middot; Estado: <strong>{ticket.estado.replace('_', ' ')}</strong>
                </span>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color={TEXT_MED} /></button>
            </div>

            {/* Hilo Histórico */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: BG_LIGHT, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mensajes.map((m) => {
                const isMe = esAdmin === m.es_admin
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                       <div style={{ width: 24, height: 24, borderRadius: '50%', background: BRAND, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {m.profiles?.nombre?.charAt(0) ?? 'A'}
                       </div>
                       <span style={{ fontSize: 11, color: TEXT_MED }}>{isMe ? 'Tú' : m.profiles?.rol === 'super_admin' ? 'Soporte Técnico' : m.profiles?.nombre}</span>
                    </div>
                    <div
                      style={{
                        background: isMe ? BRAND : '#fff',
                        color: isMe ? '#fff' : TEXT_DARK,
                        padding: '12px 16px', borderRadius: 12,
                        maxWidth: '85%', fontSize: 14,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        lineHeight: 1.5,
                        wordWrap: 'break-word',
                      }}
                      dangerouslySetInnerHTML={{ __html: m.mensaje_html }}
                    />
                    <span style={{ fontSize: 10, color: 'rgba(0,130,124,0.5)', marginTop: 4 }}>
                       {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Enviar / Responder */}
            <div style={{ padding: '20px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: 'var(--bg-card)' }}>
              {ticket.estado === 'cerrado' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TEXT_MED, fontSize: 13, justifyContent: 'center', padding: '16px 0' }}>
                   <Info size={16} /> Este ticket ha sido cerrado y no admite más respuestas.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                  <div
                    ref={boxRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Escribe tu respuesta aquí (puedes pegar imágenes)..."
                    onPaste={handlePaste}
                    style={{
                      border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px',
                      minHeight: 80, maxHeight: 160, overflowY: 'auto',
                      fontSize: 14, color: TEXT_DARK, outline: 'none', background: 'var(--bg-input)'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = BRAND}
                    onBlur={e => e.currentTarget.style.borderColor = BORDER}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     {!esAdmin ? (
                        <button onClick={() => cambiarEstado('cerrado')} disabled={resolviendo} style={{ background: 'transparent', border: 'none', color: TEXT_MED, fontSize: 13, fontWeight: 600, cursor: resolviendo ? 'not-allowed' : 'pointer' }}>
                          Marcar como Solucionado
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                           <button onClick={() => cambiarEstado('cerrado')} disabled={resolviendo} style={{ background: 'rgba(255,94,75,0.1)', color: '#FF5E4B', padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                             Cerrar ticket
                           </button>
                           {ticket.estado !== 'resuelto' && (
                              <button onClick={() => cambiarEstado('resuelto')} disabled={resolviendo} style={{ background: 'rgba(56,185,142,0.1)', color: '#38B98E', padding: '6px 12px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                 Marcar Resuelto
                              </button>
                           )}
                        </div>
                     )}
                     <button
                        onClick={handleEnviar}
                        disabled={enviando}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: BRAND, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer' }}
                     >
                       {enviando ? <CircleNotch size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><PaperPlaneRight size={16} /> Enviar</>}
                     </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
