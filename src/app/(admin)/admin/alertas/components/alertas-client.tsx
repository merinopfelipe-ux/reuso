'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Power } from '@phosphor-icons/react'
import type { Alerta, TipoAlerta, TipoDestinatario } from '@/types'

const TIPO_CONFIG: Record<TipoAlerta, { label: string; bg: string; color: string }> = {
  info:    { label: 'Info',     bg: 'rgba(89,166,228,0.12)',  color: '#2B7FBF' },
  promo:   { label: 'Promo',   bg: 'rgba(0,130,124,0.12)',   color: '#00827C' },
  estado:  { label: 'Estado',  bg: 'rgba(246,191,62,0.15)',  color: '#B88000' },
  urgente: { label: 'Urgente', bg: 'rgba(255,94,75,0.12)',   color: '#CC3C2A' },
}

interface EmpresaMin { id: string; nombre: string }

export function AlertasClient({ alertas, empresas }: { alertas: Alerta[], empresas: EmpresaMin[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({
    titulo: '', mensaje: '', tipo: 'info' as TipoAlerta,
    destinatario_tipo: 'todos' as TipoDestinatario,
    destinatario_id: '', expires_at: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function toggleAlerta(id: string, activa: boolean) {
    await fetch(`/api/admin/alertas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !activa }),
    })
    startTransition(() => router.refresh())
  }

  async function crearAlerta(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true); setError('')
    const payload = {
      ...form,
      destinatario_id: form.destinatario_tipo !== 'todos' && form.destinatario_id ? form.destinatario_id : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }
    const res = await fetch('/api/admin/alertas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al crear la alerta.')
    } else {
      setMostrarForm(false)
      setForm({ titulo: '', mensaje: '', tipo: 'info', destinatario_tipo: 'todos', destinatario_id: '', expires_at: '' })
      startTransition(() => router.refresh())
    }
    setGuardando(false)
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--border)', transition: 'background 0.2s',
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ ...btnBase, background: 'var(--color-brand)', color: '#fff', border: 'none' }}>
          <Plus size={15} /> Nueva alerta
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={crearAlerta}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <p style={{ margin: '0 0 14px', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Nueva alerta</p>
          {error && <p style={{ color: 'var(--color-error)', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            <input style={inputSt} placeholder="Título *" value={form.titulo}
              onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} required />
            <textarea style={{ ...inputSt, resize: 'vertical' }} placeholder="Mensaje *" rows={3} value={form.mensaje}
              onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo</label>
                <select style={inputSt} value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoAlerta }))}>
                  <option value="info">Info</option>
                  <option value="promo">Promo</option>
                  <option value="estado">Estado</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Destinatario</label>
                <select style={inputSt} value={form.destinatario_tipo} onChange={e => setForm(p => ({ ...p, destinatario_tipo: e.target.value as TipoDestinatario, destinatario_id: '' }))}>
                  <option value="todos">Todos los usuarios</option>
                  <option value="empresa">Empresa específica</option>
                </select>
              </div>
            </div>
            {form.destinatario_tipo === 'empresa' && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Empresa</label>
                <select style={inputSt} value={form.destinatario_id} onChange={e => setForm(p => ({ ...p, destinatario_id: e.target.value }))}>
                  <option value="">— Selecciona empresa —</option>
                  {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Expira el (opcional)</label>
              <input style={inputSt} type="datetime-local" value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" disabled={guardando}
              style={{ ...btnBase, background: 'var(--color-brand)', color: '#fff', border: 'none' }}>
              {guardando ? 'Publicando...' : 'Publicar alerta'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              style={{ ...btnBase, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>Cancelar</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertas.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No hay alertas creadas.</p>}
        {alertas.map(a => {
          const cfg = TIPO_CONFIG[a.tipo]
          return (
            <div key={a.id}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
              <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{cfg.label}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{a.titulo}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.mensaje}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-placeholder)' }}>
                  {formatFecha(a.created_at)} · Para: {a.destinatario_tipo}
                  {a.expires_at ? ` · Expira: ${formatFecha(a.expires_at)}` : ''}
                </p>
              </div>
              <button onClick={() => toggleAlerta(a.id, a.activa)} title={a.activa ? 'Desactivar' : 'Activar'}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: a.activa ? 'rgba(56,185,142,0.10)' : 'rgba(255,94,75,0.08)', color: a.activa ? '#1F8C65' : '#CC3C2A', flexShrink: 0 }}>
                <Power size={13} /> {a.activa ? 'Activa' : 'Inactiva'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
