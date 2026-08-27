'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, Leaf } from '@/components/ui/icons'
import { SelectorCiiu } from '@/components/ui/selector-ciiu'
import { SelectorPais, PAISES } from '@/components/ui/selector-pais'
import { SelectorCiudad } from '@/components/ui/selector-ciudad'
import { SelectorRegion } from '@/components/ui/selector-region'
import { InputDireccion } from '@/components/ui/input-direccion'
import { InputDocumento } from '@/components/ui/input-documento'
import { InputTelefono } from '@/components/ui/input-telefono'
import { formatearNIT } from '@/lib/formatters'

const BRAND = '#00827C'

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
  const [form, setForm] = useState({ 
    nombre: '', 
    sector: '',
    nit: '',
    dv: '',
    telefono: '',
    indicativo: PAISES[0].dial,
    pais: '',
    region: '',
    ciudad: '',
    direccion: '',
    sitio_web: ''
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    if (name === 'nit') {
      setForm((prev) => ({ ...prev, nit: formatearNIT(value) }))
    } else if (name === 'dv') {
      setForm((prev) => ({ ...prev, dv: value.replace(/[^\d]/g, '').slice(0, 1) }))
    } else if (name === 'telefono') {
      setForm((prev) => ({ ...prev, telefono: value.replace(/[^\d]/g, '') }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
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
      body: JSON.stringify({ 
        nombre: form.nombre, 
        sector: form.sector || undefined, 
        logo_url,
        nit: form.dv ? `${form.nit}-${form.dv}` : form.nit,
        telefono: `${form.indicativo} ${form.telefono}`.trim(),
        pais: form.pais,
        region: form.region,
        ciudad: form.ciudad,
        direccion: form.direccion,
        sitio_web: form.sitio_web || undefined
      }),
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

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          NIT / RFC / NIF
        </label>
        <InputDocumento value={form.nit} onChange={(val) => setForm(p => ({...p, nit: val}))} style={{ ...inputStyle, width: '100%', padding: '0 12px' }} placeholder="900.123.456" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Actividad económica (CIIU) (opcional)
        </label>
        <SelectorCiiu
          value={form.sector}
          onChange={(val) => setForm((prev) => ({ ...prev, sector: val }))}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Teléfono celular <span style={{ color: '#e53e3e' }}>*</span>
        </label>
        <InputTelefono
          indicativo={form.indicativo}
          onChangeIndicativo={(val) => setForm(p => ({...p, indicativo: val}))}
          telefono={form.telefono}
          onChangeTelefono={(val) => setForm(p => ({...p, telefono: val}))}
          required
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          País <span style={{ color: '#e53e3e' }}>*</span>
        </label>
        <SelectorPais value={form.pais} onChange={(val) => setForm((prev) => ({ ...prev, pais: val, region: '', ciudad: '' }))} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
            Departamento / Región <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <SelectorRegion pais={form.pais} value={form.region} onChange={(val) => setForm((prev) => ({ ...prev, region: val, ciudad: '' }))} disabled={!form.pais} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
            Ciudad <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <SelectorCiudad pais={form.pais} region={form.region} value={form.ciudad} onChange={(val) => setForm((prev) => ({ ...prev, ciudad: val }))} disabled={!form.pais || !form.region} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Dirección física <span style={{ color: '#e53e3e' }}>*</span>
        </label>
        <InputDireccion value={form.direccion} onChange={(val) => setForm((prev) => ({ ...prev, direccion: val }))} paisCodigo={PAISES.find(p => p.nombre === form.pais)?.codigo} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
          Sitio Web
        </label>
        <input name="sitio_web" value={form.sitio_web} onChange={handleChange} style={inputStyle} placeholder="https://ejemplo.com" type="url" />
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
