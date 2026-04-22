'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, Plus, Pulse, Trash, Calendar, CircleNotch } from '@phosphor-icons/react'

// Metricas support
const METRICAS = {
  co2_kg: { label: 'Emisiones CO₂ (kg)', postfix: 'kg CO₂' },
  peso_kg: { label: 'Residuos Desviados (kg)', postfix: 'kg' },
  agua_l: { label: 'Agua Ahorrada (Litros)', postfix: 'Litros' },
  num_calculos: { label: 'Impactos medidos (Cantidad)', postfix: 'Cálculos' }
}

interface Meta {
  id: string
  titulo: string
  descripcion?: string
  metrica: keyof typeof METRICAS
  valor_objetivo: number
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
  progreso_actual: number
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid rgba(0,130,124,0.2)', outline: 'none',
  fontSize: 14, fontFamily: "'Open Sans', sans-serif"
}

const btnBase: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
  cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: '0.2s'
}

export function ListaMetas({ esAdmin }: { esAdmin: boolean }) {
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)
  
  const [forma, setForma] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    titulo: '', descripcion: '', metrica: 'co2_kg', valor_objetivo: '', 
    fecha_inicio: '', fecha_fin: ''
  })

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/metas')
      const data = await res.json()
      setMetas(data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        valor_objetivo: parseFloat(formData.valor_objetivo)
      })
    })
    setSaving(false)
    if (res.ok) {
      setForma(false)
      loadData()
    } else {
      alert('Error creando la meta.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta meta?')) return
    const res = await fetch(`/api/metas/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('No se pudo eliminar la meta. Intenta de nuevo.')
      return
    }
    loadData()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><CircleNotch className="lucide-spin" size={24} color="var(--color-brand)" /></div>

  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Metas Ambientales</h3>
        {esAdmin && (
          <button 
            onClick={() => setForma(!forma)}
            style={{ ...btnBase, background: 'var(--color-brand)', color: '#FFF' }}>
            <Plus size={16} /> Crear Meta
          </button>
        )}
      </div>

      {forma && (
        <form onSubmit={handleCreate} style={{ background: '#FFF', padding: 20, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Título de la meta</label>
              <input required style={inputSt} value={formData.titulo} onChange={e=>setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Reducción 2026" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Métrica</label>
              <select style={inputSt} value={formData.metrica} onChange={e=>setFormData({...formData, metrica: e.target.value})}>
                {Object.entries(METRICAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Objetivo numeral</label>
            <input required type="number" step="0.1" style={inputSt} value={formData.valor_objetivo} onChange={e=>setFormData({...formData, valor_objetivo: e.target.value})} placeholder="Ej: 500" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Fecha de inicio</label>
              <input required type="date" style={inputSt} value={formData.fecha_inicio} onChange={e=>setFormData({...formData, fecha_inicio: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Fecha de fin</label>
              <input required type="date" style={inputSt} value={formData.fecha_fin} onChange={e=>setFormData({...formData, fecha_fin: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={() => setForma(false)} style={{ ...btnBase, background: 'rgba(0,130,124,0.06)', color: 'var(--text-secondary)' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...btnBase, background: 'var(--color-brand)', color: '#FFF' }}>
              {saving ? <CircleNotch size={15} className="lucide-spin" /> : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {metas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, border: '1px dashed var(--border)', borderRadius: 12 }}>
          <Target size={32} color="var(--border)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Aún no has definido ninguna meta.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {metas.map(meta => {
            const percRaw = (meta.progreso_actual / meta.valor_objetivo) * 100
            const perc = Math.min(100, Math.max(0, percRaw))
            const def = METRICAS[meta.metrica as keyof typeof METRICAS]

            return (
              <div key={meta.id} style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,130,124,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pulse size={18} color="var(--color-brand)" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{meta.titulo}</h4>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Calendar size={10} style={{ display:'inline', transform:'translateY(1px)' }}/> {meta.fecha_inicio} a {meta.fecha_fin}
                      </p>
                    </div>
                  </div>
                  {esAdmin && (
                    <button onClick={() => handleDelete(meta.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#FF5E4B' }}>
                      <Trash size={16} />
                    </button>
                  )}
                </div>

                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    <span>{meta.progreso_actual.toFixed(1)} {def.postfix}</span>
                    <span>{meta.valor_objetivo} {def.postfix}</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'rgba(0,130,124,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${perc}%`, height: '100%', background: perc >= 100 ? '#38B98E' : 'var(--color-brand)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>
                  {perc >= 100 && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 700, color: '#38B98E', textAlign: 'center' }}>¡Meta completada!</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .lucide-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}
