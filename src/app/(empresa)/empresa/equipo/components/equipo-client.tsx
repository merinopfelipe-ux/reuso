'use client'

import { useState, useCallback } from 'react'
import {
  UserPlus, Envelope, Clock, CheckCircle, XCircle, Users, CircleNotch,
  Copy, Check, Link, Trash, PencilSimple, X, WarningCircle,
} from '@phosphor-icons/react'
import type { Rol } from '@/types'

interface Miembro {
  id: string
  user_id: string
  nombre: string
  email?: string
  rol: string
  created_at: string
}

interface Invitacion {
  id: string
  email: string
  estado: string
  rol_asignado: string
  created_at: string
  expires_at: string
}

interface Props {
  miembros: Miembro[]
  invitaciones: Invitacion[]
  empresaId: string
  rolActual: Rol
  codigoRegistro?: string | null
}

const BRAND = '#00827C'
const BG_LIGHT = '#EBF5F4'
const TEXT_DARK = '#1A3A38'
const TEXT_MED = '#4D7C79'
const BORDER = 'rgba(0,130,124,0.12)'

const ROL_LABELS: Record<string, string> = {
  empresa_admin: 'Administrador',
  empleado: 'Empleado',
  usuario_libre: 'Usuario libre',
  super_admin: 'Super admin',
}

const ROL_COLORS: Record<string, string> = {
  empresa_admin: '#00827C',
  empleado: '#38B98E',
  usuario_libre: '#59A6E4',
  super_admin: '#AD7C43',
}

const ESTADO_CONFIG: Record<string, { color: string; label: string; icono: React.ElementType }> = {
  pendiente: { color: '#F6BF3E', label: 'Pendiente', icono: Clock },
  aceptada:  { color: '#38B98E', label: 'Aceptada',  icono: CheckCircle },
  expirada:  { color: '#FF5E4B', label: 'Expirada',  icono: XCircle },
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EquipoClient({ miembros: miembrosIniciales, invitaciones: invitacionesIniciales, empresaId, codigoRegistro }: Props) {
  // ── Invitar ──────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]         = useState(false)
  const [emailInvitar, setEmailInvitar]   = useState('')
  const [rolInvitado, setRolInvitado]     = useState<'empleado' | 'empresa_admin'>('empleado')
  const [enviando, setEnviando]           = useState(false)
  const [linkInvitacion, setLinkInvitacion] = useState<string | null>(null)
  const [copiado, setCopiado]             = useState(false)

  // ── Listas reactivas ─────────────────────────────────────────────────────────
  const [miembros, setMiembros]           = useState<Miembro[]>(miembrosIniciales)
  const [invitaciones, setInvitaciones]   = useState<Invitacion[]>(invitacionesIniciales)

  // ── Feedback global ──────────────────────────────────────────────────────────
  const [error, setError]                 = useState<string | null>(null)
  const [exito, setExito]                 = useState<string | null>(null)

  // ── Eliminar miembro ─────────────────────────────────────────────────────────
  const [confirmarElimMiembro, setConfirmarElimMiembro] = useState<string | null>(null)
  const [eliminandoMiembro, setEliminandoMiembro]       = useState<string | null>(null)

  // ── Eliminar invitación ──────────────────────────────────────────────────────
  const [eliminandoInv, setEliminandoInv] = useState<string | null>(null)

  // ── Editar miembro ───────────────────────────────────────────────────────────
  const [editandoMiembro, setEditandoMiembro]   = useState<string | null>(null)
  const [editNombreMiembro, setEditNombreMiembro] = useState('')
  const [guardandoMiembro, setGuardandoMiembro] = useState(false)

  // ── Editar invitación ────────────────────────────────────────────────────────
  const [editandoInv, setEditandoInv]       = useState<string | null>(null)
  const [editEmailInv, setEditEmailInv]     = useState('')
  const [guardandoInv, setGuardandoInv]     = useState(false)

  // ── Handlers — Invitar ───────────────────────────────────────────────────────
  async function copiarLink() {
    if (!linkInvitacion) return
    await navigator.clipboard.writeText(linkInvitacion)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const handleInvitar = useCallback(async () => {
    if (!emailInvitar) return
    setEnviando(true)
    setError(null)
    setExito(null)
    try {
      const res = await fetch('/api/empresa/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInvitar, rol_asignado: rolInvitado, empresa_id: empresaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar la invitación.')
      setInvitaciones(prev => [data.invitacion, ...prev])
      setLinkInvitacion(`${window.location.origin}/invitacion/${data.rawToken as string}`)
      setEmailInvitar('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setEnviando(false)
    }
  }, [emailInvitar, rolInvitado, empresaId])

  // ── Handlers — Eliminar miembro ──────────────────────────────────────────────
  const handleEliminarMiembro = useCallback(async (id: string) => {
    setEliminandoMiembro(id)
    setError(null)
    try {
      const res = await fetch(`/api/empresa/miembros/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setMiembros(prev => prev.filter(m => m.id !== id))
      setExito('Miembro removido del equipo.')
      setTimeout(() => setExito(null), 3000)
    } catch {
      setError('No se pudo remover al miembro.')
    } finally {
      setEliminandoMiembro(null)
      setConfirmarElimMiembro(null)
    }
  }, [])

  // ── Handlers — Eliminar invitación ───────────────────────────────────────────
  const handleEliminarInv = useCallback(async (id: string) => {
    setEliminandoInv(id)
    setError(null)
    try {
      const res = await fetch(`/api/empresa/invitaciones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setInvitaciones(prev => prev.filter(i => i.id !== id))
    } catch {
      setError('No se pudo eliminar la invitación.')
    } finally {
      setEliminandoInv(null)
    }
  }, [])

  // ── Handlers — Editar miembro ────────────────────────────────────────────────
  const handleGuardarMiembro = useCallback(async (id: string) => {
    if (!editNombreMiembro.trim()) return
    setGuardandoMiembro(true)
    try {
      const res = await fetch(`/api/empresa/miembros/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editNombreMiembro }),
      })
      if (!res.ok) throw new Error()
      setMiembros(prev => prev.map(m => m.id === id ? { ...m, nombre: editNombreMiembro.trim() } : m))
      setEditandoMiembro(null)
    } catch {
      setError('No se pudo actualizar el nombre.')
    } finally {
      setGuardandoMiembro(false)
    }
  }, [editNombreMiembro])

  // ── Handlers — Editar email invitación ───────────────────────────────────────
  const handleGuardarInv = useCallback(async (id: string) => {
    if (!editEmailInv.trim()) return
    setGuardandoInv(true)
    try {
      const res = await fetch(`/api/empresa/invitaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmailInv }),
      })
      if (!res.ok) throw new Error()
      setInvitaciones(prev => prev.map(i => i.id === id ? { ...i, email: editEmailInv.trim() } : i))
      setEditandoInv(null)
    } catch {
      setError('No se pudo actualizar el email.')
    } finally {
      setGuardandoInv(false)
    }
  }, [editEmailInv])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {exito && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: 'rgba(56,185,142,0.1)', border: '1px solid rgba(56,185,142,0.3)',
          color: '#38B98E', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle size={16} /> {exito}
        </div>
      )}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: 'rgba(255,94,75,0.08)', border: '1px solid rgba(255,94,75,0.25)',
          color: '#FF5E4B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <WarningCircle size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#FF5E4B', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Miembros activos ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} color={BRAND} />
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Miembros activos</h2>
              <p style={{ fontSize: 12, color: TEXT_MED, margin: 0 }}>{miembros.length} persona{miembros.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: 'none', background: BRAND, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <UserPlus size={15} /> Invitar
          </button>
        </div>

        {miembros.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: TEXT_MED, fontSize: 14 }}>
            Aún no hay miembros registrados.
          </div>
        ) : (
          <div>
            {miembros.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx < miembros.length - 1 ? `1px solid ${BORDER}` : 'none',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(0,130,124,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: BG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: BRAND }}>
                      {(m.nombre ?? '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editandoMiembro === m.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            autoFocus
                            value={editNombreMiembro}
                            onChange={e => setEditNombreMiembro(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleGuardarMiembro(m.id); if (e.key === 'Escape') setEditandoMiembro(null) }}
                            style={{ padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${BRAND}`, fontSize: 13, outline: 'none', flex: 1 }}
                          />
                          <button onClick={() => handleGuardarMiembro(m.id)} disabled={guardandoMiembro}
                            style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {guardandoMiembro ? <CircleNotch size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                          </button>
                          <button onClick={() => setEditandoMiembro(null)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: TEXT_MED }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nombre}</p>
                          <p style={{ fontSize: 11, color: TEXT_MED, margin: 0 }}>{m.email ?? ''} · Desde {formatFecha(m.created_at)}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '3px 10px', background: `${ROL_COLORS[m.rol] ?? '#4D7C79'}18`, color: ROL_COLORS[m.rol] ?? TEXT_MED }}>
                      {ROL_LABELS[m.rol] ?? m.rol}
                    </span>

                    {m.rol !== 'super_admin' && editandoMiembro !== m.id && (
                      <>
                        <button
                          onClick={() => { setEditandoMiembro(m.id); setEditNombreMiembro(m.nombre) }}
                          title="Editar nombre"
                          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px', cursor: 'pointer', color: TEXT_MED, display: 'flex', alignItems: 'center' }}
                        >
                          <PencilSimple size={13} />
                        </button>

                        {confirmarElimMiembro === m.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#FF5E4B', fontWeight: 600 }}>¿Remover?</span>
                            <button
                              onClick={() => handleEliminarMiembro(m.id)}
                              disabled={eliminandoMiembro === m.id}
                              style={{ background: '#FF5E4B', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              {eliminandoMiembro === m.id ? <CircleNotch size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sí'}
                            </button>
                            <button
                              onClick={() => setConfirmarElimMiembro(null)}
                              style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: TEXT_MED }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmarElimMiembro(m.id)}
                            title="Remover del equipo"
                            style={{ background: 'rgba(255,94,75,0.06)', border: '1px solid rgba(255,94,75,0.20)', borderRadius: 6, padding: '5px', cursor: 'pointer', color: '#FF5E4B', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Invitaciones (todas) ─────────────────────────────────────────────── */}
      {invitaciones.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Envelope size={18} color="#F6BF3E" />
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Invitaciones</h2>
                <p style={{ fontSize: 12, color: TEXT_MED, margin: 0 }}>Expiran 7 días después del envío</p>
              </div>
            </div>
          </div>

          <div>
            {invitaciones.map((inv, idx) => {
              const cfg = ESTADO_CONFIG[inv.estado] ?? ESTADO_CONFIG.pendiente
              const IconEstado = cfg.icono
              return (
                <div
                  key={inv.id}
                  style={{
                    padding: '12px 20px',
                    borderBottom: idx < invitaciones.length - 1 ? `1px solid ${BORDER}` : 'none',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(0,130,124,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconEstado size={18} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editandoInv === inv.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              autoFocus
                              type="email"
                              value={editEmailInv}
                              onChange={e => setEditEmailInv(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleGuardarInv(inv.id); if (e.key === 'Escape') setEditandoInv(null) }}
                              style={{ padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${BRAND}`, fontSize: 13, outline: 'none', flex: 1 }}
                            />
                            <button onClick={() => handleGuardarInv(inv.id)} disabled={guardandoInv}
                              style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              {guardandoInv ? <CircleNotch size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                            </button>
                            <button onClick={() => setEditandoInv(null)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: TEXT_MED }}>
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</p>
                            <p style={{ fontSize: 11, color: TEXT_MED, margin: 0 }}>{ROL_LABELS[inv.rol_asignado] ?? inv.rol_asignado} · {formatFecha(inv.created_at)}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '3px 10px', background: `${cfg.color}18`, color: cfg.color }}>
                        {cfg.label}
                      </span>

                      {inv.estado === 'pendiente' && editandoInv !== inv.id && (
                        <button
                          onClick={() => { setEditandoInv(inv.id); setEditEmailInv(inv.email) }}
                          title="Editar email"
                          style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px', cursor: 'pointer', color: TEXT_MED, display: 'flex', alignItems: 'center' }}
                        >
                          <PencilSimple size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => handleEliminarInv(inv.id)}
                        disabled={eliminandoInv === inv.id}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,94,75,0.25)', background: 'rgba(255,94,75,0.06)', color: '#FF5E4B', fontSize: 12, fontWeight: 600, cursor: eliminandoInv === inv.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {eliminandoInv === inv.id ? <CircleNotch size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash size={13} />}
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal invitar ────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2500,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div
            style={{ position: 'absolute', inset: 0 }}
            onClick={() => { setModalOpen(false); setLinkInvitacion(null); setError(null) }}
          />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 420,
            background: 'var(--bg-card)', borderRadius: 16,
            border: `1px solid ${BORDER}`, padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT_DARK, margin: '0 0 6px' }}>
              Invitar al equipo
            </h3>
            <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 20px' }}>
              El destinatario recibirá un enlace para unirse a tu organización.
            </p>

            {error && (
              <p style={{ fontSize: 12, color: '#FF5E4B', marginBottom: 14 }}>{error}</p>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK, display: 'block', marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={emailInvitar}
                onChange={e => setEmailInvitar(e.target.value)}
                placeholder="colaborador@empresa.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK, display: 'block', marginBottom: 6 }}>
                Rol asignado
              </label>
              <select
                value={rolInvitado}
                onChange={e => setRolInvitado(e.target.value as 'empleado' | 'empresa_admin')}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'var(--bg-input)', color: TEXT_DARK, fontSize: 14, outline: 'none' }}
              >
                <option value="empleado">Empleado</option>
                <option value="empresa_admin">Administrador</option>
              </select>
            </div>

            {/* Link copiable tras generar invitación */}
            {linkInvitacion && (
              <div style={{ background: 'rgba(0,130,124,0.08)', border: '1.5px solid rgba(0,130,124,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Link size={14} color={BRAND} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: BRAND }}>Link de invitación</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <p style={{ flex: 1, fontSize: 12, color: TEXT_MED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {linkInvitacion}
                  </p>
                  <button
                    onClick={copiarLink}
                    style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 6, border: `1.5px solid ${BRAND}`, background: copiado ? BRAND : 'transparent', color: copiado ? '#fff' : BRAND, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                  >
                    {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: TEXT_MED, margin: '8px 0 0' }}>
                  Comparte este link por WhatsApp, email o el medio que prefieras. Expira en 7 días.
                </p>
                {codigoRegistro && (
                  <p style={{ fontSize: 11, color: TEXT_MED, margin: '6px 0 0' }}>
                    También puede registrarse en reuso.lurdes.co/registro con el código de empresa:{' '}
                    <strong style={{ color: BRAND, fontFamily: 'monospace' }}>{codigoRegistro}</strong>
                  </p>
                )}
              </div>
            )}

            {!linkInvitacion ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleInvitar}
                  disabled={!emailInvitar || enviando}
                  style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: emailInvitar && !enviando ? BRAND : BG_LIGHT, color: emailInvitar && !enviando ? '#fff' : TEXT_MED, fontSize: 14, fontWeight: 600, cursor: emailInvitar && !enviando ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {enviando ? <><CircleNotch size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</> : 'Generar invitación'}
                </button>
                <button
                  onClick={() => { setModalOpen(false); setLinkInvitacion(null); setError(null) }}
                  style={{ padding: '11px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_DARK, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setModalOpen(false); setLinkInvitacion(null); setError(null); setEmailInvitar('') }}
                style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: BRAND, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Listo
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
