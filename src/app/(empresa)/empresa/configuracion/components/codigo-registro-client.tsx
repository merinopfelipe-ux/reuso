'use client'

import { useState } from 'react'
import { Copy, Check, ArrowsClockwise, CircleNotch, Trash, QrCode } from '@phosphor-icons/react'

const BRAND = '#00827C'
const TEXT_MED = '#4D7C79'
const BORDER = 'rgba(0,130,124,0.12)'

interface Props {
  codigoInicial: string | null
}

export function CodigoRegistroClient({ codigoInicial }: Props) {
  const [codigo, setCodigo] = useState<string | null>(codigoInicial)
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generar() {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/empresa/configuracion/codigo-registro', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCodigo(data.codigo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar el código.')
    } finally {
      setCargando(false)
    }
  }

  async function eliminar() {
    if (!confirm('¿Desactivar el código? Los usuarios ya invitados no se verán afectados.')) return
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/empresa/configuracion/codigo-registro', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCodigo(null)
    } catch {
      setError('No se pudo eliminar el código.')
    } finally {
      setCargando(false)
    }
  }

  async function copiar() {
    if (!codigo) return
    await navigator.clipboard.writeText(codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
      padding: 24, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(0,130,124,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <QrCode size={18} color={BRAND} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Código de empresa
          </h3>
          <p style={{ fontSize: 12, color: TEXT_MED, margin: 0 }}>
            Compártelo con tu equipo para que se vinculen al registrarse.
          </p>
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#FF5E4B', marginBottom: 12 }}>{error}</p>
      )}

      {codigo ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Código grande */}
          <div style={{
            flex: 1, minWidth: 160,
            background: 'rgba(0,130,124,0.05)',
            border: `1.5px solid rgba(0,130,124,0.20)`,
            borderRadius: 10, padding: '12px 18px',
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: 26, fontWeight: 800, color: BRAND,
              letterSpacing: '0.15em', fontFamily: 'monospace',
            }}>
              {codigo}
            </span>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={copiar}
              title="Copiar código"
              style={{
                padding: '10px 14px', borderRadius: 8,
                border: `1px solid ${copiado ? '#38B98E' : BORDER}`,
                background: copiado ? 'rgba(56,185,142,0.08)' : 'transparent',
                color: copiado ? '#38B98E' : TEXT_MED,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              {copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </button>

            <button
              onClick={generar}
              disabled={cargando}
              title="Regenerar código"
              style={{
                padding: '10px 14px', borderRadius: 8,
                border: `1px solid ${BORDER}`, background: 'transparent',
                color: TEXT_MED, cursor: cargando ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600,
              }}
            >
              {cargando
                ? <CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <ArrowsClockwise size={14} />}
              Regenerar
            </button>

            <button
              onClick={eliminar}
              disabled={cargando}
              title="Desactivar código"
              style={{
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(255,94,75,0.20)', background: 'rgba(255,94,75,0.04)',
                color: '#FF5E4B', cursor: cargando ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600,
              }}
            >
              <Trash size={14} /> Desactivar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 14, color: TEXT_MED, margin: 0, flex: 1 }}>
            Sin código activo. Genera uno para que tu equipo se vincule al registrarse.
          </p>
          <button
            onClick={generar}
            disabled={cargando}
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none',
              background: BRAND, color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: cargando ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              opacity: cargando ? 0.6 : 1,
            }}
          >
            {cargando
              ? <><CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</>
              : 'Generar código'}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
