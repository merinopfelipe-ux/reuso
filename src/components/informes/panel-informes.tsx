'use client'

import { useState, useRef } from 'react'
import { FileText, Download, ExternalLink as ArrowSquareOut, X, Calendar, Loader2 as CircleNotch } from '@/components/ui/icons'
import type { Informe } from '@/types'
import { PopupAmbiental } from './popup-ambiental'
import { formatFecha } from '@/lib/format'

interface PanelInformesProps {
  informes: Informe[]
  empresaId?: string | null
  modo: 'personal' | 'empresa'
}

const btn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', border: 'none', transition: 'background 0.2s',
}

export function PanelInformes({ informes, empresaId, modo }: PanelInformesProps) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const isGeneratingRef = useRef(false)
  const [lista, setLista] = useState<Informe[]>(informes)
  const [descargaUrl, setDescargaUrl] = useState<string | null>(null)

  async function generar() {
    if (isGeneratingRef.current) return
    isGeneratingRef.current = true
    setGenerando(true)
    setError('')

    const body: Record<string, unknown> = { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    if (empresaId) body.empresa_id = empresaId

    let res: Response
    let data: Record<string, unknown>
    try {
      res = await fetch('/api/informes/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      data = await res.json()
    } catch {
      setError('Sin conexión. Verifica tu internet e intenta de nuevo.')
      setGenerando(false)
      isGeneratingRef.current = false
      return
    }

    if (!res.ok) {
      setError((data.error as string) ?? 'Ocurrió un error al generar el documento.')
      setGenerando(false)
      isGeneratingRef.current = false
      return
    }

    // Agregar al inicio de la lista
    if (data.pdf_url) {
      const nuevo: Informe = {
        id: data.informe_id as string,
        tipo: 'informe',
        user_id: null,
        empresa_id: empresaId ?? null,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        co2_total: data.co2_total as number,
        agua_total: 0,
        codigo_verificacion: data.codigo_verificacion as string,
        pdf_url: data.pdf_url as string,
        metadata_json: {},
        created_at: new Date().toISOString(),
      }
      setLista(prev => [nuevo, ...prev])
    }

    setModalAbierto(false)
    setFechaInicio('')
    setFechaFin('')
    setGenerando(false)
    isGeneratingRef.current = false

    // Abrir modal de descarga si se generó en lugar de tirar pdf de frente
    if (data.pdf_url) {
      setDescargaUrl(data.pdf_url as string)
    }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: "'Open Sans', sans-serif",
  }

  return (
    <div>
      {/* Sección título */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          {modo === 'empresa' ? 'Documentos de la empresa' : 'Mis documentos de impacto'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {modo === 'empresa'
            ? 'Genera informes del impacto ambiental de tu organización por rango de fechas.'
            : 'Genera tu informe personal por rango de fechas.'}
        </p>
      </div>

      {/* Botón de acción */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <button
          onClick={() => setModalAbierto(true)}
          style={{ ...btn, background: 'var(--color-brand)', color: '#FFFFFF' }}
          className="hover-pop hover-press"
        >
          <FileText size={16} />
          Generar informe
        </button>
      </div>

      {/* Lista de documentos generados */}
      {lista.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '32px 24px', textAlign: 'center',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(0,130,124,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <FileText size={22} color="var(--color-brand)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Aún no hay informes generados
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Genera tu primer informe para ver tu impacto ambiental por período.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {lista.length} documento{lista.length !== 1 ? 's' : ''} generado{lista.length !== 1 ? 's' : ''}
            </span>
          </div>
          {lista.map((inf, i) => {
            const codigo = `RCO2-${inf.codigo_verificacion.slice(0, 4).toUpperCase()}-${inf.codigo_verificacion.slice(4, 8).toUpperCase()}`
            return (
              <div key={inf.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: i < lista.length - 1 ? '1px solid var(--border-light)' : 'none',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(89,166,228,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={18} color="#59A6E4" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    Informe de impacto
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    {inf.fecha_inicio && inf.fecha_fin
                      ? `${formatFecha(inf.fecha_inicio)} - ${formatFecha(inf.fecha_fin)}`
                      : `Emitido el ${formatFecha(inf.created_at)}`}
                    {' · '}
                    <code style={{ fontSize: 10, color: 'var(--color-brand)' }}>{codigo}</code>
                  </p>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-brand)', flexShrink: 0 }}>
                  {inf.co2_total.toFixed(2)} kg CO₂ eq
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a
                    href={`/verificar/${inf.codigo_verificacion}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver en línea"
                    style={{
                      width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 8, background: 'rgba(0,130,124,0.07)', border: 'none', cursor: 'pointer',
                      textDecoration: 'none', color: 'var(--color-brand)',
                    }}
                    className="hover-external"
                  >
                    <ArrowSquareOut size={15} />
                  </a>
                  {inf.pdf_url && (
                    <button
                      onClick={() => setDescargaUrl(inf.pdf_url!)}
                      title="Descargar PDF"
                      style={{
                        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 8, background: 'rgba(0,130,124,0.07)', border: 'none', cursor: 'pointer',
                        color: 'var(--color-brand)',
                      }}
                      className="hover-download hover-press"
                    >
                      <Download size={15} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal informe por fechas */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}
            onClick={() => !generando && setModalAbierto(false)}
          />
          <div style={{
            position: 'relative', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
            boxSizing: 'border-box', zIndex: 51,
            boxShadow: '0 8px 32px rgba(0,130,124,0.12)',
          }}>
            <button
              onClick={() => !generando && setModalAbierto(false)}
              className="hover-rotate-90 hover-press"
              style={{
                position: 'absolute', top: 14, right: 14,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-hover)', border: 'none', borderRadius: 6,
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}
            >
              <X size={14} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(89,166,228,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="#59A6E4" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Generar informe</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Elige el período a incluir</p>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,94,75,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--color-error)', margin: 0 }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <Calendar size={13} /> Fecha de inicio
                </label>
                <input
                  type="date"
                  style={inputSt}
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  max={fechaFin || undefined}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <Calendar size={13} /> Fecha de fin
                </label>
                <input
                  type="date"
                  style={inputSt}
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  min={fechaInicio || undefined}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={generar}
                disabled={generando || !fechaInicio || !fechaFin}
                style={{
                  ...btn, flex: 1, justifyContent: 'center',
                  background: generando || !fechaInicio || !fechaFin ? 'var(--bg-hover)' : 'var(--color-brand)',
                  color: generando || !fechaInicio || !fechaFin ? 'var(--text-secondary)' : '#FFFFFF',
                  cursor: generando || !fechaInicio || !fechaFin ? 'not-allowed' : 'pointer',
                }}
              >
                {generando
                  ? <><CircleNotch size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</>
                  : <><FileText size={15} /> Generar informe</>}
              </button>
              <button
                onClick={() => { setModalAbierto(false); setError('') }}
                disabled={generando}
                style={{ ...btn, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {descargaUrl && (
        <PopupAmbiental
          url={descargaUrl}
          onClose={() => setDescargaUrl(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}
