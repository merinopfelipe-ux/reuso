'use client'

import { useState, useEffect } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useToast } from '@/components/toast-provider'

export default function ConfiguracionSistemaPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(d => {
        setEmail(d.email_notificaciones ?? '')
        setLoadingInit(false)
      })
      .catch(() => setLoadingInit(false))
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_notificaciones: email }),
      })
      if (!res.ok) throw new Error()
      toast.success('Configuración guardada.')
    } catch {
      toast.error('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: "'Open Sans', sans-serif",
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <AdminPageHeader
        titulo="Config. sistema"
        subtitulo="Parámetros globales de la plataforma"
        showBack
      />

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          Notificaciones
        </h2>

        {loadingInit ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Cargando...</p>
        ) : (
          <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Correo de notificaciones de tickets
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
                Además de este correo, los tickets también se envían a todos los super_admin activos.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 24px', background: loading ? '#4D7C79' : 'var(--color-brand)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
