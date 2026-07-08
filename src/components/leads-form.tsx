'use client'

import { useState } from 'react'
import {
  SendHorizontal as PaperPlaneRight,
  Loader2 as CircleNotch,
  CheckCircle,
} from 'lucide-react'

export function LeadsForm() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    empresa: '',
    mensaje: '',
    interes: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar')

      setEnviado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        background: 'rgba(56,185,142,0.05)',
        borderRadius: 20,
        border: '1px dashed #38B98E'
      }}>
        <CheckCircle size={48} color="#38B98E" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#474747', margin: '0 0 8px' }}>¡Mensaje recibido!</h3>
        <p style={{ fontSize: 14, color: '#6B6B6B', margin: 0 }}>
          Un consultor de impacto se pondrá en contacto contigo en las próximas 24 horas laborables.
        </p>
      </div>
    )
  }

  return (
    <div id="contacto" style={{
      background: '#fff',
      padding: '32px',
      borderRadius: 20,
      boxShadow: '0 10px 40px rgba(0,130,124,0.06)',
      border: '1px solid rgba(0,130,124,0.08)'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#7FA8A5' }}>Nombre completo</label>
            <input
              type="text"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,130,124,0.15)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#7FA8A5' }}>Email corporativo</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="juan@empresa.com"
              style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,130,124,0.15)', fontSize: 14, outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: '#7FA8A5' }}>Empresa</label>
          <input
            type="text"
            name="empresa"
            required
            value={formData.empresa}
            onChange={handleChange}
            placeholder="Nombre de tu organización"
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,130,124,0.15)', fontSize: 14, outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: '#7FA8A5' }}>Plan de interés</label>
          <select
            name="interes"
            value={formData.interes}
            onChange={handleChange}
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,130,124,0.15)', fontSize: 14, outline: 'none', background: '#fff', color: formData.interes ? '#474747' : '#7FA8A5' }}
          >
            <option value="">Selecciona un plan</option>
            <option value="pyme">Pyme - Desde $99/mes</option>
            <option value="corporativo">Corporativo - Desde $299/mes</option>
            <option value="enterprise">Enterprise - Personalizado</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: '#7FA8A5' }}>Mensaje o requerimiento</label>
          <textarea
            name="mensaje"
            required
            rows={4}
            value={formData.mensaje}
            onChange={handleChange}
            placeholder="Cuéntanos cómo podemos ayudarte..."
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,130,124,0.15)', fontSize: 14, outline: 'none', resize: 'none' }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 14, color: '#EF4444', margin: 0, fontWeight: 600 }}>{error}</p>
        )}

        <button
          disabled={loading}
          type="submit"
          style={{
            marginTop: 8,
            padding: '14px',
            borderRadius: 12,
            background: '#00827C',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 12px rgba(0,130,124,0.2)'
          }}
        >
          {loading ? (
            <CircleNotch size={18} style={{ animation: 'spin 2s linear infinite' }} />
          ) : (
            <>
              <PaperPlaneRight size={18} />
              Enviar solicitud
            </>
          )}
        </button>
      </form>
    </div>
  )
}
