'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Save as FloppyDisk, CheckCircle } from '@/components/ui/icons'

const BRAND = '#00827C'
const BORDER = 'rgba(0,130,124,0.12)'
const TEXT_DARK = '#1A3A38'
const TEXT_MED = '#4D7C79'

const SECTORES = [
  'Tecnología', 'Manufactura', 'Servicios', 'Retail / Comercio',
  'Educación', 'Salud', 'Construcción', 'Transporte y logística',
  'Alimentos y bebidas', 'Moda y textil', 'Otro',
]

interface Props {
  empresaId: string
  nombre: string
  sector: string | null
  logoUrl: string | null
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1.5px solid ${BORDER}`,
  background: 'var(--surface)',
  color: TEXT_DARK,
  fontSize: 15,
  outline: 'none',
  userSelect: 'none',
  boxSizing: 'border-box',
}

export default function ConfiguracionClient({ nombre: nombreInicial, sector: sectorInicial, logoUrl: logoUrlInicial }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ nombre: nombreInicial, sector: sectorInicial ?? '' })
  const [logoUrl, setLogoUrl] = useState<string | null>(logoUrlInicial)
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrlInicial)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)

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
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `logos/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) return null
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    let nuevoLogoUrl = logoUrl
    if (logoFile) {
      nuevoLogoUrl = await subirLogo(logoFile)
      if (!nuevoLogoUrl) {
        setError('Error al subir el logo.')
        setGuardando(false)
        return
      }
      setLogoUrl(nuevoLogoUrl)
    }

    const res = await fetch('/api/empresa/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        sector: form.sector || null,
        logo_url: nuevoLogoUrl,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al guardar.')
      setGuardando(false)
      return
    }

    setGuardado(true)
    setLogoFile(null)
    setTimeout(() => setGuardado(false), 3000)
    setGuardando(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Logo */}
      <div>
        <label style={{ display: 'block', marginBottom: 10, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          Logo de la empresa
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: 14, flexShrink: 0,
              background: logoPreview ? 'transparent' : `${BRAND}12`,
              border: `2px dashed ${BRAND}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden',
            }}
          >
            {logoPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Upload size={24} color={BRAND} />
            }
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              background: 'none',
              border: `1.5px solid ${BRAND}`,
              color: BRAND, borderRadius: 8,
              padding: '7px 16px', fontSize: 13,
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            {logoPreview ? 'Cambiar logo' : 'Subir logo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          Nombre de la empresa
        </label>
        <input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          Sector
        </label>
        <select name="sector" value={form.sector} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Sin sector especificado</option>
          {SECTORES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <p style={{ color: '#e53e3e', fontSize: 13, margin: 0, padding: '8px 12px', background: '#fff5f5', borderRadius: 6 }}>
          {error}
        </p>
      )}

      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
        <button
          type="submit"
          disabled={guardando}
          className={guardando ? '' : 'hover-download hover-press'}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 24px', borderRadius: 8, border: 'none',
            background: guardado ? '#38B98E' : guardando ? `${BRAND}80` : BRAND,
            color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: guardando ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s',
          }}
        >
          {guardado ? (
            <><CheckCircle size={17} /> Guardado</>
          ) : guardando ? (
            'Guardando…'
          ) : (
            <><FloppyDisk size={17} /> Guardar cambios</>
          )}
        </button>
      </div>

      <p style={{ fontSize: 12, color: TEXT_MED, margin: 0 }}>
        El plan y el estado de la cuenta los gestiona el equipo de Calculadora de Reúso. Contacta a soporte para cambios.
      </p>
    </form>
  )
}
