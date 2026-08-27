'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Power, Trash2, Trash } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'
import { SelectorEmpresa } from '@/components/ui/selector-empresa'
import type { Alerta, TipoAlerta, TipoDestinatario } from '@/types'
import { formatFecha } from '@/lib/format'

const TIPO_CONFIG: Record<TipoAlerta, { label: string; bg: string; color: string }> = {
  info:    { label: 'Info',     bg: 'rgba(89,166,228,0.12)',  color: '#2B7FBF' },
  promo:   { label: 'Promo',   bg: 'rgba(0,130,124,0.12)',   color: 'var(--color-brand)' },
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
  const [aEliminar, setAEliminar] = useState<Alerta | null>(null)
  const [eliminando, setEliminando] = useState(false)

  async function toggleAlerta(id: string, activa: boolean) {
    await fetch(`/api/admin/alertas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !activa }),
    })
    startTransition(() => router.refresh())
  }

  async function eliminarAlerta() {
    if (!aEliminar) return
    setEliminando(true)
    await fetch(`/api/admin/alertas/${aEliminar.id}`, { method: 'DELETE' })
    setEliminando(false)
    setAEliminar(null)
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

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={() => setMostrarForm(!mostrarForm)}>
          Nueva alerta
        </Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tipo</label>
                <Selector
                  value={form.tipo}
                  onChange={val => setForm(p => ({ ...p, tipo: val as TipoAlerta }))}
                  opciones={[
                    { value: 'info', label: 'Info' },
                    { value: 'promo', label: 'Promo' },
                    { value: 'estado', label: 'Estado' },
                    { value: 'urgente', label: 'Urgente' },
                  ]}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Destinatario</label>
                <Selector
                  value={form.destinatario_tipo}
                  onChange={val => setForm(p => ({ ...p, destinatario_tipo: val as TipoDestinatario, destinatario_id: '' }))}
                  opciones={[
                    { value: 'todos', label: 'Todos los usuarios' },
                    { value: 'empresa', label: 'Empresa específica' },
                  ]}
                />
              </div>
            </div>
            {form.destinatario_tipo === 'empresa' && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Empresa</label>
                <SelectorEmpresa empresas={empresas} value={form.destinatario_id} onChange={val => setForm(p => ({ ...p, destinatario_id: val }))} placeholder="- Selecciona empresa -" />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Expira el (opcional)</label>
              <input style={inputSt} type="datetime-local" value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button type="submit" variant="primary" size="md" loading={guardando}>
              {guardando ? 'Publicando...' : 'Publicar alerta'}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setMostrarForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertas.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No hay alertas creadas.</p>}
        {alertas.map(a => {
          const cfg = TIPO_CONFIG[a.tipo]
          return (
            <div key={a.id} className="flex items-start gap-3.5 rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)]">
              <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{cfg.label}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{a.titulo}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.mensaje}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-placeholder)' }}>
                  {formatFecha(a.created_at)} · Para: {a.destinatario_tipo}
                  {a.expires_at ? ` · Expira: ${formatFecha(a.expires_at)}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleAlerta(a.id, a.activa)} title={a.activa ? 'Desactivar' : 'Activar'}
                  className="hover-pop hover-press"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: a.activa ? 'rgba(56,185,142,0.10)' : 'rgba(255,94,75,0.08)', color: a.activa ? '#1F8C65' : '#CC3C2A' }}>
                  <Power size={13} /> {a.activa ? 'Activa' : 'Inactiva'}
                </button>
                <button onClick={() => setAEliminar(a)} title="Eliminar"
                  className="hover-pop hover-press"
                  style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--text-secondary)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        abierto={!!aEliminar}
        onClose={() => setAEliminar(null)}
        titulo="¿Eliminar esta alerta?"
        descripcion="Se borra para siempre, no se puede deshacer."
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        textoConfirmar={eliminando ? 'Eliminando...' : 'Sí, eliminar'}
        varianteConfirmar="error"
        onConfirmar={eliminarAlerta}
      />
    </div>
  )
}
