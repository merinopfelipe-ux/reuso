'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Power, Check, X, Building2 as Buildings, Pencil as PencilSimple, Layers as Stack } from '@/components/ui/icons'
import { IconPicker } from '@/components/admin/icon-picker'
import type { LineaNegocio } from '@/types'
import * as LucideIcons from 'lucide-react'

// Extender localmente para la UI
interface LineaNegocioConStats extends LineaNegocio {
  total_empresas: number
}

const C = {
  brand: 'var(--color-brand)',
  dark: 'var(--text-primary)',
  mid: 'var(--text-secondary)',
  border: 'var(--border)',
  light: 'var(--bg-hover)',
  hover: 'var(--bg-hover)',
}

function LucidePreview({ name }: { name: string }) {
  if (!name || name === 'Icon' || name === 'DynamicIcon' || name === 'IconNode') return <Stack size={20} color={C.mid} />
  const Icon = (LucideIcons as Record<string, unknown>)[name] as React.ComponentType<{ size?: number; color?: string }> | undefined
  if (!Icon) return <Stack size={20} color={C.mid} />
  return <Icon size={20} color={C.brand} />
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', border: 'none', background: C.brand, color: 'var(--text-on-brand)',
  transition: 'background 0.2s',
}

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', border: `1px solid ${C.border}`, background: 'var(--bg-primary)',
  color: C.dark, transition: 'background 0.2s',
}

export function LineasNegocioClient({ lineas }: { lineas: LineaNegocioConStats[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ clave: '', nombre: '', icono_lucide: 'Box', descripcion: '' })
  const [editForm, setEditForm] = useState({ clave: '', nombre: '', icono_lucide: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function crearLinea(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true); setError('')
    const res = await fetch('/api/admin/lineas-negocio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al crear la línea de negocio.')
    } else {
      setMostrarForm(false)
      setForm({ clave: '', nombre: '', icono_lucide: 'Box', descripcion: '' })
      startTransition(() => router.refresh())
    }
    setGuardando(false)
  }

  async function guardarEdicion(id: string) {
    setGuardando(true); setError('')
    const res = await fetch(`/api/admin/lineas-negocio/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al actualizar.')
    } else {
      setEditandoId(null)
      startTransition(() => router.refresh())
    }
    setGuardando(false)
  }

  async function toggleActivo(id: string, activa: boolean) {
    await fetch(`/api/admin/lineas-negocio/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !activa }),
    })
    startTransition(() => router.refresh())
  }

  function iniciarEdicion(m: LineaNegocioConStats) {
    setEditandoId(m.id)
    setEditForm({ clave: m.clave, nombre: m.nombre, icono_lucide: m.icono_lucide, descripcion: m.descripcion ?? '' })
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Botón nueva línea */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button style={btnPrimary} className="hover-pop hover-press" onClick={() => setMostrarForm(v => !v)}>
          <Plus size={15} />
          Nueva Línea de Negocio
        </button>
      </div>

      {/* Formulario nueva línea */}
      {mostrarForm && (
        <form onSubmit={crearLinea} style={{
          background: C.light, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Nueva Línea de Negocio</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.mid, display: 'block', marginBottom: 4 }}>Clave *</label>
              <input
                value={form.clave} required
                onChange={e => setForm({ ...form, clave: e.target.value })}
                placeholder="ej. muebles"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.mid, display: 'block', marginBottom: 4 }}>Nombre *</label>
              <input
                value={form.nombre} required
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="ej. Muebles"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.mid, display: 'block', marginBottom: 4 }}>Ícono</label>
              <IconPicker value={form.icono_lucide} onChange={icono => setForm({ ...form, icono_lucide: icono })} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: C.mid, display: 'block', marginBottom: 4 }}>Descripción</label>
            <input
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción opcional"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {error && <p style={{ fontSize: 12, color: '#FF5E4B', marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={guardando} style={btnPrimary} className={guardando ? '' : 'hover-download hover-press'}>
              {guardando ? 'Guardando...' : 'Crear Línea'}
            </button>
            <button type="button" style={btnSecondary} className="hover-pop hover-press" onClick={() => setMostrarForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de líneas */}
      {lineas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.mid }}>
          <Stack size={40} color={C.border} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>Sin líneas de negocio</p>
          <p style={{ fontSize: 13 }}>Crea tu primera línea (ej. Muebles) para habilitarla a las empresas.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {lineas.map((m) => (
          <div key={m.id} className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)]" style={{ opacity: m.activa ? 1 : 0.55 }}>
            {editandoId === m.id ? (
              /* Modo edición */
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
                  <input
                    value={editForm.clave} disabled
                    title="La clave no se puede editar después de creada"
                    style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.mid, outline: 'none', background: C.light }}
                  />
                  <input
                    value={editForm.nombre}
                    onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none' }}
                  />
                  <IconPicker value={editForm.icono_lucide} onChange={icono => setEditForm({ ...editForm, icono_lucide: icono })} />
                </div>
                <input
                  value={editForm.descripcion}
                  onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                  placeholder="Descripción"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                />
                {error && <p style={{ fontSize: 12, color: '#FF5E4B', marginBottom: 6 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...btnSecondary, background: C.brand, color: 'var(--text-on-brand)', border: 'none' }} disabled={guardando} className={guardando ? '' : 'hover-download hover-press'} onClick={() => guardarEdicion(m.id)}>
                    <Check size={13} /> Guardar
                  </button>
                  <button style={btnSecondary} className="hover-rotate-90 hover-press" onClick={() => setEditandoId(null)}>
                    <X size={13} /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* Vista normal */
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LucidePreview name={m.icono_lucide} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: 0 }}>{m.nombre}</p>
                    <p style={{ fontSize: 11, color: C.mid, margin: 0, fontFamily: 'monospace' }}>{m.clave}</p>
                    {m.descripcion && (
                      <p style={{ fontSize: 12, color: C.mid, margin: '2px 0 0', lineHeight: 1.4 }}>{m.descripcion}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 100, background: C.light, fontSize: 11, color: C.mid }}>
                    <Buildings size={11} />
                    {m.total_empresas} {m.total_empresas === 1 ? 'empresa' : 'empresas'}
                  </span>
                  <span style={{
                    padding: '3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                    background: m.activa ? 'rgba(56,185,142,0.12)' : 'rgba(255,94,75,0.10)',
                    color: m.activa ? '#38B98E' : '#FF5E4B',
                  }}>
                    {m.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={btnSecondary} className="hover-pencil hover-press" onClick={() => iniciarEdicion(m)}>
                    <PencilSimple size={12} /> Editar
                  </button>
                  <button
                    style={{ ...btnSecondary, color: m.activa ? '#FF5E4B' : C.brand }}
                    className="hover-pop hover-press"
                    onClick={() => toggleActivo(m.id, m.activa)}
                  >
                    <Power size={12} />
                    {m.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
