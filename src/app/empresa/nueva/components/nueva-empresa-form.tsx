'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UploadIcon as Upload, LeafIcon as Leaf } from '@animateicons/react/lucide'

const BRAND = '#00827C'

const SECTORES = [
  'Tecnología',
  'Manufactura',
  'Servicios',
  'Retail / Comercio',
  'Educación',
  'Salud',
  'Construcción',
  'Transporte y logística',
  'Alimentos y bebidas',
  'Moda y textil',
  'Otro',
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 15,
  outline: 'none',
  userSelect: 'none',
  boxSizing: 'border-box',
}

export default function NuevaEmpresaForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ nombre: '', sector: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function subirLogo(file: File): Promise<string | null> {
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `logos/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    setUploading(false)
    if (error) return null
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre de la empresa es obligatorio.'); return }
    setLoading(true)
    setError('')

    let logo_url: string | null = null
    if (logoFile) {
      logo_url = await subirLogo(logoFile)
      if (!logo_url) {
        setError('Error al subir el logo. Intenta de nuevo.')
        setLoading(false)
        return
      }
    }

    const res = await fetch('/api/empresa/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: form.nombre, sector: form.sector || undefined, logo_url }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear la empresa.')
      setLoading(false)
      return
    }

    router.push('/empresa')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: 96,
            height: 96,
            borderRadius: 16,
            background: logoPreview ? 'transparent' : `${BRAND}15`,
            border: `2px dashed ${BRAND}60`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Upload size={28} color={BRAND} />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            background: 'none',
            border: `1.5px solid ${BRAND}`,
            color: BRAND,
            borderRadius: 8,
            padding: '6px 16px',
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {logoFile ? 'Cambiar logo' : 'Subir logo (opcional)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Nombre de la empresa <span style={{ color: '#e53e3e' }}>*</span>
        </label>
        <input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="Ej: Ecomoda Colombia S.A.S."
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Sector (opcional)
        </label>
        <select
          name="sector"
          value={form.sector}
          onChange={handleChange}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Selecciona un sector</option>
          {SECTORES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && (
        <p style={{
          color: '#e53e3e',
          fontSize: 14,
          margin: 0,
          padding: '8px 12px',
          background: '#fff5f5',
          borderRadius: 6,
        }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || uploading}
        style={{
          background: loading || uploading ? `${BRAND}80` : BRAND,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '13px',
          fontSize: 16,
          fontWeight: 600,
          cursor: loading || uploading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {uploading ? 'Subiendo logo…' : loading ? 'Creando empresa…' : 'Crear empresa'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        <Leaf size={12} style={{ verticalAlign: 'middle', marginRight: 3, color: BRAND }} />
        Tu empresa comenzará en plan Free. El equipo de Calculadora de Reúso te contactará para ampliar el plan.
      </p>
    </form>
  )
}
