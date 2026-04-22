'use client'

import { useState, useTransition } from 'react'
import { Medal, ArrowSquareOut, XCircle, MagnifyingGlass } from '@phosphor-icons/react'

const C = {
  brand: '#00827C', dark: '#1A3A38', mid: '#4D7C79',
  border: 'rgba(0,130,124,0.12)', light: 'rgba(0,130,124,0.06)',
}

type Cert = {
  id: string
  codigo_verificacion: string
  tipo: 'certificado' | 'informe'
  beneficiario: string | null
  co2_total: number
  created_at: string
  revocado: boolean
  motivo_revocacion: string | null
  revocado_en: string | null
  pdf_url: string | null
  empresa_id: string | null
  empresas: { nombre: string } | { nombre: string }[] | null
}

type Props = { certificados: Cert[]; total: number }

function getNombreEmpresa(cert: Cert): string {
  if (!cert.empresas) return '—'
  if (Array.isArray(cert.empresas)) return cert.empresas[0]?.nombre ?? '—'
  return cert.empresas.nombre
}

export function CertificadosAdminClient({ certificados: inicial, total }: Props) {
  const [certs, setCerts] = useState(inicial)
  const [, startTransition] = useTransition()
  const [filtro, setFiltro] = useState<'todos' | 'validos' | 'revocados'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Cert | null>(null)
  const [motivo, setMotivo] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const visibles = certs.filter(c => {
    if (filtro === 'validos' && c.revocado) return false
    if (filtro === 'revocados' && !c.revocado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return c.codigo_verificacion.toLowerCase().includes(q) ||
        (c.beneficiario ?? '').toLowerCase().includes(q) ||
        getNombreEmpresa(c).toLowerCase().includes(q)
    }
    return true
  })

  async function revocar() {
    if (!modal || motivo.length < 10) { showToast('El motivo debe tener al menos 10 caracteres.'); return }
    const res = await fetch('/api/admin/certificados', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modal.id, motivo_revocacion: motivo }),
    })
    if (!res.ok) { showToast('Error al revocar.'); return }
    setCerts(prev => prev.map(c => c.id === modal.id ? { ...c, revocado: true, motivo_revocacion: motivo } : c))
    setModal(null)
    setMotivo('')
    showToast('Certificado revocado correctamente.')
  }

  const thStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.mid, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }
  const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: C.dark, borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' }

  return (
    <div style={{ paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: C.dark, color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', background: '#fff', padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
          {([['todos', `Todos (${total})`], ['validos', 'Válidos'], ['revocados', 'Revocados']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFiltro(val)} style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700,
              background: filtro === val ? C.brand : 'transparent',
              color: filtro === val ? '#fff' : C.mid,
              transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '8px 14px', flex: 1, maxWidth: 360 }}>
          <MagnifyingGlass size={15} color={C.mid} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, empresa o beneficiario..."
            style={{ border: 'none', outline: 'none', fontSize: 13, color: C.dark, width: '100%', background: 'transparent' }} />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Código</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Empresa</th>
              <th style={thStyle}>Beneficiario</th>
              <th style={thStyle}>CO₂ eq</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: C.mid, padding: 40 }}>
                  <Medal size={32} color={C.mid} style={{ display: 'block', margin: '0 auto 12px' }} />
                  No hay certificados que coincidan.
                </td>
              </tr>
            )}
            {visibles.map(cert => (
              <tr key={cert.id} style={{ background: cert.revocado ? 'rgba(239,68,68,0.03)' : '#fff' }}>
                <td style={tdStyle}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: C.brand }}>{cert.codigo_verificacion}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: cert.tipo === 'certificado' ? C.light : 'rgba(89,166,228,0.1)', color: cert.tipo === 'certificado' ? C.brand : '#59A6E4' }}>
                    {cert.tipo === 'certificado' ? 'Certificado' : 'Informe'}
                  </span>
                </td>
                <td style={tdStyle}>{getNombreEmpresa(cert)}</td>
                <td style={{ ...tdStyle, maxWidth: 140 }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', textDecoration: cert.revocado ? 'line-through' : 'none', opacity: cert.revocado ? 0.5 : 1 }}>
                    {cert.beneficiario}
                  </span>
                </td>
                <td style={tdStyle}>{cert.co2_total >= 1000 ? `${(cert.co2_total / 1000).toFixed(2)} ton` : `${cert.co2_total.toFixed(1)} kg`}</td>
                <td style={tdStyle}>{new Date(cert.created_at).toLocaleDateString('es-CO')}</td>
                <td style={tdStyle}>
                  {cert.revocado ? (
                    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>Revocado</span>
                  ) : (
                    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(56,185,142,0.10)', color: '#38B98E' }}>Válido</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {cert.pdf_url && (
                      <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer" title="Ver PDF"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: C.light, color: C.brand, textDecoration: 'none' }}>
                        <ArrowSquareOut size={14} />
                      </a>
                    )}
                    {!cert.revocado && (
                      <button onClick={() => setModal(cert)} title="Revocar"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.10)', color: '#EF4444', border: 'none', cursor: 'pointer' }}>
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de revocación */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: C.dark, marginBottom: 8 }}>Revocar certificado</h3>
            <p style={{ fontSize: 13, color: C.mid, marginBottom: 4 }}>
              Código: <strong style={{ color: C.brand }}>{modal.codigo_verificacion}</strong>
            </p>
            <p style={{ fontSize: 13, color: C.mid, marginBottom: 20 }}>
              Esta acción no se puede deshacer. El certificado aparecerá como revocado en la página pública de verificación.
            </p>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.mid, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Motivo de revocación (mín. 10 caracteres)
            </label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: El documento contiene errores en los cálculos. Se emitirá uno nuevo."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.dark, outline: 'none', minHeight: 100, resize: 'vertical', marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setMotivo('') }}
                style={{ padding: '10px 22px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.dark, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => startTransition(() => { revocar() })}
                style={{ padding: '10px 22px', borderRadius: 10, background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                Revocar certificado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
