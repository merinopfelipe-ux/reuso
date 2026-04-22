'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CaretDown, CaretRight, Plus, Power } from '@phosphor-icons/react'
import { ConfianzaBadge } from '@/components/admin/confianza-badge'
import type { CategoriaConItems, Modulo, NivelConfianza } from '@/types'

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: 'pointer', border: '1px solid var(--border)', transition: 'background 0.2s',
}

export function CategoriasClient({ categorias, modulos }: { categorias: CategoriaConItems[]; modulos: Modulo[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [mostrarFormCat, setMostrarFormCat] = useState(false)
  const [mostrarFormItem, setMostrarFormItem] = useState<string | null>(null) // categoria_id

  // Form nueva categoría
  const [formCat, setFormCat] = useState({ nombre: '', icono_lucide: '', descripcion: '', modulo_id: '' })
  // Form nuevo item
  const [formItem, setFormItem] = useState({
    nombre: '', peso_kg: '', co2_por_unidad: '',
    nivel_confianza: 'alta' as NivelConfianza,
    origen_fuente: '', detalle_fuente: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function toggleExpand(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function toggleCategoria(id: string, activa: boolean) {
    await fetch(`/api/admin/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !activa }),
    })
    startTransition(() => router.refresh())
  }

  async function toggleItem(id: string, activo: boolean) {
    await fetch(`/api/admin/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !activo }),
    })
    startTransition(() => router.refresh())
  }

  async function crearCategoria(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true); setError('')
    const res = await fetch('/api/admin/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formCat,
        modulo_id: formCat.modulo_id || undefined,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al crear la categoría.')
    } else {
      setMostrarFormCat(false)
      setFormCat({ nombre: '', icono_lucide: '', descripcion: '', modulo_id: '' })
      startTransition(() => router.refresh())
    }
    setGuardando(false)
  }

  async function crearItem(e: React.FormEvent, categoriaId: string) {
    e.preventDefault()
    setGuardando(true); setError('')
    const res = await fetch('/api/admin/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria_id: categoriaId,
        nombre: formItem.nombre,
        peso_kg: parseFloat(formItem.peso_kg),
        co2_por_unidad: parseFloat(formItem.co2_por_unidad),
        nivel_confianza: formItem.nivel_confianza,
        origen_fuente: formItem.origen_fuente || undefined,
        detalle_fuente: formItem.detalle_fuente || undefined,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al crear el item.')
    } else {
      setMostrarFormItem(null)
      setFormItem({ nombre: '', peso_kg: '', co2_por_unidad: '', nivel_confianza: 'alta', origen_fuente: '', detalle_fuente: '' })
      startTransition(() => router.refresh())
    }
    setGuardando(false)
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div>
      {/* Botón nueva categoría */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setMostrarFormCat(!mostrarFormCat)}
          style={{ ...btnBase, background: 'var(--color-brand)', color: '#fff', border: 'none' }}
        >
          <Plus size={15} /> Nueva categoría
        </button>
      </div>

      {/* Form nueva categoría */}
      {mostrarFormCat && (
        <form onSubmit={crearCategoria}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}
        >
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Nueva categoría</p>
          {error && <p style={{ color: 'var(--color-error)', fontSize: 13, margin: '0 0 10px' }}>{error}</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            <input style={inputSt} placeholder="Nombre *" value={formCat.nombre}
              onChange={e => setFormCat(p => ({ ...p, nombre: e.target.value }))} required />
            <input style={inputSt} placeholder="Icono Lucide (ej: Shirt)" value={formCat.icono_lucide}
              onChange={e => setFormCat(p => ({ ...p, icono_lucide: e.target.value }))} required />
            <input style={inputSt} placeholder="Descripción (opcional)" value={formCat.descripcion}
              onChange={e => setFormCat(p => ({ ...p, descripcion: e.target.value }))} />
            <select style={inputSt} value={formCat.modulo_id}
              onChange={e => setFormCat(p => ({ ...p, modulo_id: e.target.value }))}>
              <option value="">Sin módulo</option>
              {modulos.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" disabled={guardando}
              style={{ ...btnBase, background: 'var(--color-brand)', color: '#fff', border: 'none' }}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setMostrarFormCat(false)}
              style={{ ...btnBase, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de categorías */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {categorias.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No hay categorías aún.</p>
        )}
        {categorias.map(cat => (
          <div key={cat.id}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}
          >
            {/* Header categoría */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer' }}
              onClick={() => toggleExpand(cat.id)}
            >
              {expandidas.has(cat.id) ? <CaretDown size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                : <CaretRight size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{cat.nombre}</span>
                <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {cat.items.filter(i => i.activo).length} items activos
                </span>
                {cat.modulo_id && (() => {
                  const mod = modulos.find(m => m.id === cat.modulo_id)
                  return mod ? (
                    <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: 'rgba(0,130,124,0.08)', color: '#00827C' }}>
                      {mod.nombre}
                    </span>
                  ) : null
                })()}
              </div>
              <span style={{
                padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                background: cat.activa ? 'rgba(56,185,142,0.12)' : 'rgba(255,94,75,0.10)',
                color: cat.activa ? '#1F8C65' : '#CC3C2A',
              }}>
                {cat.activa ? 'Activa' : 'Inactiva'}
              </span>
              <button
                onClick={e => { e.stopPropagation(); toggleCategoria(cat.id, cat.activa) }}
                title={cat.activa ? 'Desactivar' : 'Activar'}
                style={{ ...btnBase, padding: '4px 10px', marginLeft: 4 }}
              >
                <Power size={14} style={{ color: cat.activa ? 'var(--color-brand)' : 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Items expandidos */}
            {expandidas.has(cat.id) && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      {['Nombre', 'Peso (kg)', 'CO₂/unidad', 'Confianza', 'Fuente', 'Estado'].map(h => (
                        <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{item.nombre}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{item.peso_kg}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--color-brand)', fontWeight: 600 }}>{item.co2_por_unidad}</td>
                        <td style={{ padding: '10px 16px' }}><ConfianzaBadge nivel={item.nivel_confianza} /></td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.origen_fuente ?? '—'}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <button onClick={() => toggleItem(item.id, item.activo)}
                            style={{ ...btnBase, padding: '3px 10px', fontSize: 11, background: item.activo ? 'rgba(56,185,142,0.10)' : 'rgba(255,94,75,0.08)', color: item.activo ? '#1F8C65' : '#CC3C2A', border: 'none' }}>
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Botón nuevo item */}
                <div style={{ padding: '12px 16px' }}>
                  {mostrarFormItem === cat.id ? (
                    <form onSubmit={e => crearItem(e, cat.id)}
                      style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 16 }}
                    >
                      <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 13 }}>Nuevo item para {cat.nombre}</p>
                      {error && <p style={{ color: 'var(--color-error)', fontSize: 12, margin: '0 0 8px' }}>{error}</p>}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <input style={inputSt} placeholder="Nombre *" value={formItem.nombre}
                          onChange={e => setFormItem(p => ({ ...p, nombre: e.target.value }))} required />
                        <select style={inputSt} value={formItem.nivel_confianza}
                          onChange={e => setFormItem(p => ({ ...p, nivel_confianza: e.target.value as NivelConfianza }))}>
                          <option value="alta">Alta confianza</option>
                          <option value="media">Media confianza</option>
                          <option value="baja">Baja confianza</option>
                        </select>
                        <input style={inputSt} type="number" step="0.001" placeholder="Peso kg *" value={formItem.peso_kg}
                          onChange={e => setFormItem(p => ({ ...p, peso_kg: e.target.value }))} required />
                        <input style={inputSt} type="number" step="0.0001" placeholder="CO₂ por unidad *" value={formItem.co2_por_unidad}
                          onChange={e => setFormItem(p => ({ ...p, co2_por_unidad: e.target.value }))} required />
                        <input style={inputSt} placeholder="Origen fuente" value={formItem.origen_fuente}
                          onChange={e => setFormItem(p => ({ ...p, origen_fuente: e.target.value }))} />
                        <input style={inputSt} placeholder="Detalle fuente" value={formItem.detalle_fuente}
                          onChange={e => setFormItem(p => ({ ...p, detalle_fuente: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button type="submit" disabled={guardando}
                          style={{ ...btnBase, background: 'var(--color-brand)', color: '#fff', border: 'none' }}>
                          {guardando ? 'Guardando...' : 'Guardar item'}
                        </button>
                        <button type="button" onClick={() => setMostrarFormItem(null)}
                          style={{ ...btnBase, background: 'transparent', color: 'var(--text-secondary)' }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setMostrarFormItem(cat.id)}
                      style={{ ...btnBase, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      <Plus size={14} /> Nuevo item
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
