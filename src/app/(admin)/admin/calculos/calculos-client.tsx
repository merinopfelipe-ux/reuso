'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Warning, X, Check } from '@phosphor-icons/react'

const C = {
  brand: 'var(--color-brand)', dark: 'var(--text-primary)', mid: 'var(--text-secondary)',
  border: 'var(--border)', light: 'var(--bg-hover)',
  error: 'var(--color-error)',
}

interface Calculo {
  id: string
  user_id: string
  empresa_id: string | null
  fecha: string
  total_co2: number
  total_agua: number
  estado: string | null
  motivo_anulacion: string | null
  anulado_en: string | null
  created_at: string
  profiles: { nombre: string; apellido: string | null } | null
  empresas: { nombre: string } | null
}

export function CalculosAdminClient({ calculos: inicial, total }: { calculos: Calculo[]; total: number }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [calculos, setCalculos] = useState(inicial)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'anulado'>('todos')

  const filtrados = filtroEstado === 'todos' ? calculos : calculos.filter(c => (c.estado ?? 'activo') === filtroEstado)

  async function confirmarAnulacion() {
    if (!anulando || motivo.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres.')
      return
    }
    setGuardando(true); setError('')
    const res = await fetch(`/api/admin/calculos?id=${anulando}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo_anulacion: motivo }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Ocurrió un error.')
    } else {
      setCalculos(prev => prev.map(c => c.id === anulando ? { ...c, estado: 'anulado', motivo_anulacion: motivo } : c))
      setAnulando(null); setMotivo('')
      startTransition(() => router.refresh())
    }
    setGuardando(false)
  }

  function formatCo2(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${v.toFixed(1)} kg` }

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Filtros + total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: C.mid }}>{total} registros totales</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['todos', 'activo', 'anulado'] as const).map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${filtroEstado === f ? C.brand : C.border}`, background: filtroEstado === f ? C.light : 'var(--bg-card)', color: filtroEstado === f ? C.brand : C.mid, transition: 'all 0.2s' }}>
              {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Anulados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 16 }}>
          <Calculator size={40} color={C.border} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>Sin resultados</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.light }}>
                {['Fecha', 'Usuario', 'Empresa', 'CO₂eq', 'Agua', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: C.mid, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => {
                const activo = (c.estado ?? 'activo') === 'activo'
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, opacity: activo ? 1 : 0.55, background: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-hover)' }}>
                    <td style={{ padding: '10px 14px', color: C.dark, whiteSpace: 'nowrap' }}>
                      {new Date(c.fecha).toLocaleDateString('es-CO')}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.dark }}>
                      {c.profiles ? `${c.profiles.nombre}${c.profiles.apellido ? ` ${c.profiles.apellido}` : ''}` : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.mid }}>{c.empresas?.nombre ?? '-'}</td>
                    <td style={{ padding: '10px 14px', color: C.brand, fontWeight: 600 }}>{formatCo2(c.total_co2)}</td>
                    <td style={{ padding: '10px 14px', color: C.mid }}>{(c.total_agua / 1000).toFixed(1)} m³</td>
                    <td style={{ padding: '10px 14px' }}>
                      {activo ? (
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(56,185,142,0.12)', color: '#1F8C65' }}>Activo</span>
                      ) : (
                        <span title={c.motivo_anulacion ?? ''} style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(255,94,75,0.10)', color: '#CC3C2A', cursor: 'help' }}>Anulado</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {activo && (
                        <button onClick={() => { setAnulando(c.id); setMotivo(''); setError('') }}
                          style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid rgba(255,94,75,0.3)`, background: 'rgba(255,94,75,0.06)', color: C.error, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Warning size={11} /> Anular
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal anulación */}
      {anulando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(71,71,71,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow)', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: 0 }}>Anular cálculo</p>
              <button onClick={() => setAnulando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color={C.mid} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: C.mid, marginBottom: 14 }}>
              Esta acción excluye el cálculo de los totales. No se puede deshacer.
            </p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Describe el motivo de anulación..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--bg-input)' }}
            />
            {error && <p style={{ fontSize: 12, color: C.error, marginTop: 6 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={confirmarAnulacion} disabled={guardando}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: C.error, color: '#fff', fontWeight: 700, fontSize: 13, cursor: guardando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Check size={14} /> {guardando ? 'Anulando...' : 'Confirmar anulación'}
              </button>
              <button onClick={() => setAnulando(null)}
                style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'var(--bg-primary)', color: C.mid, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
