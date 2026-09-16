'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Save as FloppyDisk, CheckCircle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Selector } from '@/components/ui/selector'
import { SelectorCiiu } from '@/components/ui/selector-ciiu'

const BRAND = 'var(--color-brand)'
const BORDER = 'var(--border)'
const TEXT_DARK = 'var(--text-primary)'
const TEXT_MED = 'var(--text-secondary)'

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
  plan: string
  nit: string | null
  telefono: string | null
  pais: string | null
  region: string | null
  ciudad: string | null
  direccion: string | null
  sitioWeb: string | null
  sectorCiiuPrincipal: string | null
  sectorCiiuSecundarios: string[]
  nitBloqueado: boolean
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

export default function ConfiguracionClient({
  nombre: nombreInicial, sector: sectorInicial, logoUrl: logoUrlInicial, plan,
  nit: nitInicial, telefono: telefonoInicial, pais: paisInicial, region: regionInicial,
  ciudad: ciudadInicial, direccion: direccionInicial, sitioWeb: sitioWebInicial,
  sectorCiiuPrincipal, sectorCiiuSecundarios, nitBloqueado,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    nombre: nombreInicial, sector: sectorInicial ?? '',
    nit: nitInicial ?? '', telefono: telefonoInicial ?? '', pais: paisInicial ?? '',
    region: regionInicial ?? '', ciudad: ciudadInicial ?? '', direccion: direccionInicial ?? '',
    sitio_web: sitioWebInicial ?? '',
  })
  const [ciiuPrincipal, setCiiuPrincipal] = useState(sectorCiiuPrincipal ?? '')
  const [ciiuSecundarios, setCiiuSecundarios] = useState<string[]>(sectorCiiuSecundarios)
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
        nit: form.nit || null,
        telefono: form.telefono || null,
        pais: form.pais || null,
        region: form.region || null,
        ciudad: form.ciudad || null,
        direccion: form.direccion || null,
        sitio_web: form.sitio_web || null,
        sector_ciiu_principal: ciiuPrincipal || null,
        sector_ciiu_secundarios: ciiuSecundarios.filter(Boolean),
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
      {plan !== 'free' && (
      <div>
        <label style={{ display: 'block', marginBottom: 10, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          Logo de la empresa
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: 14, flexShrink: 0,
              background: logoPreview ? 'transparent' : 'var(--color-brand-light)',
              border: '2px dashed var(--border)',
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
      )}

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
        <Selector
          value={form.sector}
          onChange={val => setForm(prev => ({ ...prev, sector: val }))}
          opciones={[
            { value: '', label: 'Sin sector especificado' },
            ...SECTORES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          NIT{nitBloqueado ? ' (solo el equipo de Calculadora de Reúso puede cambiarlo)' : ''}
        </label>
        <input
          name="nit"
          value={form.nit}
          onChange={handleChange}
          disabled={nitBloqueado}
          style={{ ...inputStyle, opacity: nitBloqueado ? 0.6 : 1, cursor: nitBloqueado ? 'not-allowed' : 'text' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Teléfono</label>
        <input name="telefono" value={form.telefono} onChange={handleChange} style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>País</label>
          <input name="pais" value={form.pais} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Ciudad</label>
          <input name="ciudad" value={form.ciudad} onChange={handleChange} style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Región (opcional)</label>
        <input name="region" value={form.region} onChange={handleChange} style={inputStyle} />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Dirección (opcional)</label>
        <input name="direccion" value={form.direccion} onChange={handleChange} style={inputStyle} />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Sitio web (opcional)</label>
        <input name="sitio_web" value={form.sitio_web} onChange={handleChange} style={inputStyle} placeholder="https://" />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          Actividad CIIU principal (opcional)
        </label>
        <SelectorCiiu value={ciiuPrincipal} onChange={setCiiuPrincipal} />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          Actividad CIIU complementaria 1 (opcional)
        </label>
        <SelectorCiiu
          value={ciiuSecundarios[0] ?? ''}
          onChange={val => setCiiuSecundarios(prev => [val, prev[1] ?? ''].filter((v, i) => v || i === 0))}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
          Actividad CIIU complementaria 2 (opcional)
        </label>
        <SelectorCiiu
          value={ciiuSecundarios[1] ?? ''}
          onChange={val => setCiiuSecundarios(prev => [prev[0] ?? '', val])}
        />
      </div>

      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: 13, margin: 0, padding: '8px 12px', background: 'rgba(255,94,75,0.08)', borderRadius: 6 }}>
          {error}
        </p>
      )}

      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
        <Button
          type="submit"
          loading={guardando}
          icon={guardado ? <CheckCircle size={17} /> : <FloppyDisk size={17} />}
          style={guardado ? { background: 'var(--color-success)', color: '#fff' } : undefined}
        >
          {guardado ? 'Guardado' : 'Guardar cambios'}
        </Button>
      </div>

      <p style={{ fontSize: 12, color: TEXT_MED, margin: 0 }}>
        El plan y el estado de la cuenta los gestiona el equipo de Calculadora de Reúso. Contacta a soporte para cambios.
      </p>
    </form>
  )
}
