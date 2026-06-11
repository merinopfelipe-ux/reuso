/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { createClient } from '@/lib/supabase/client'

interface Material {
  material: string
  peso_kg: string
  factor_co2_kg: string
  origen_fuente: string
  nivel_confianza: 'alta' | 'media' | 'baja'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--text-primary)',
  fontFamily: "'Open Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 6,
}

const fieldStyle: React.CSSProperties = { marginBottom: 20 }

function FilaMaterial({
  material,
  onChange,
  onRemove,
  isMobile = false,
}: {
  material: Material
  onChange: (m: Material) => void
  onRemove: () => void
  isMobile?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 2fr 1fr auto',
        gap: 8,
        marginBottom: 8,
        alignItems: 'center',
      }}
    >
      <input
        placeholder="Material (ej: madera)"
        value={material.material}
        onChange={(e) => onChange({ ...material, material: e.target.value })}
        style={inputStyle}
      />
      <input
        type="number"
        placeholder="Peso kg"
        min="0"
        step="0.001"
        value={material.peso_kg}
        onChange={(e) => onChange({ ...material, peso_kg: e.target.value })}
        style={inputStyle}
      />
      <input
        type="number"
        placeholder="Factor CO₂"
        min="0"
        step="0.0001"
        value={material.factor_co2_kg}
        onChange={(e) => onChange({ ...material, factor_co2_kg: e.target.value })}
        style={inputStyle}
      />
      <input
        placeholder="Fuente (ecoinvent, ELCD...)"
        value={material.origen_fuente}
        onChange={(e) => onChange({ ...material, origen_fuente: e.target.value })}
        style={inputStyle}
      />
      <select
        value={material.nivel_confianza}
        onChange={(e) =>
          onChange({ ...material, nivel_confianza: e.target.value as 'alta' | 'media' | 'baja' })
        }
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
      <button
        type="button"
        onClick={onRemove}
        style={{
          width: 32,
          height: 36,
          borderRadius: 8,
          border: '1px solid rgba(255,94,75,0.30)',
          background: 'rgba(255,94,75,0.06)',
          color: '#FF5E4B',
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  )
}

async function comprimirImagenWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const MAX = 1200
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('blob null'))
        },
        'image/webp',
        0.85
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function NuevoActivoDppPage() {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [peso_total_kg, setPeso] = useState('')
  const [materiales, setMateriales] = useState<Material[]>([])
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  function handleImagenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB.')
      return
    }
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Completa el nombre del activo.')
      return
    }
    if (!peso_total_kg || parseFloat(peso_total_kg) <= 0) {
      setError('El peso debe ser mayor a 0.')
      return
    }

    setError(null)
    setLoading(true)

    let imagen_url: string | undefined
    if (imagenFile) {
      try {
        const blob = await comprimirImagenWebP(imagenFile)
        const supabase = createClient()
        const path = `dpp/imagenes/${Date.now()}.webp`
        const { data: uploadData } = await supabase.storage
          .from('dpp')
          .upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (uploadData) {
          imagen_url = uploadData.path
        }
      } catch {
        // No bloquear si falla el upload de imagen
      }
    }

    const composicion_json = materiales
      .filter((m) => m.material.trim())
      .map((m) => ({
        material: m.material.trim(),
        peso_kg: parseFloat(m.peso_kg) || 0,
        factor_co2_kg: parseFloat(m.factor_co2_kg) || 0,
        origen_fuente: m.origen_fuente.trim() || undefined,
        nivel_confianza: m.nivel_confianza,
      }))

    const res = await fetch('/api/dpp/activos/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        peso_total_kg: parseFloat(peso_total_kg),
        composicion_json: composicion_json.length > 0 ? composicion_json : undefined,
        imagen_url,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Error al crear el pasaporte. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push(`/empresa/dpp/${data.data.id}`)
  }

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif", maxWidth: 680, margin: '0 auto' }}>
      <AdminPageHeader
        titulo="Registra nuevo activo"
        subtitulo="Crea el pasaporte digital de tu próximo objeto circular"
        showBack
      />

      {error && (
        <div
          style={{
            background: 'rgba(255,94,75,0.08)',
            border: '1px solid rgba(255,94,75,0.25)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#FF5E4B',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Nombre */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Nombre del activo *</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Silla de madera, Mesa de oficina..."
            style={inputStyle}
          />
        </div>

        {/* Descripción */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe brevemente el objeto y su historia..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Peso */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Peso total (kg) *</label>
          <input
            type="number"
            required
            min="0.001"
            step="0.001"
            value={peso_total_kg}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="8.5"
            style={{ ...inputStyle, maxWidth: 200 }}
          />
        </div>

        {/* Imagen */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Imagen del activo</label>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)' }}>
            Opcional · Máx 5 MB · Se comprime automáticamente a WebP
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleImagenChange}
            style={{ fontSize: 13, color: 'var(--text-secondary)' }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imagenPreview && (
            <img
              src={imagenPreview}
              alt="Vista previa"
              style={{
                marginTop: 10,
                borderRadius: 12,
                maxWidth: '100%',
                maxHeight: 200,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </div>

        {/* Materiales */}
        <div style={{ marginTop: 8, marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div>
              <h3
                style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}
              >
                Composición de materiales
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Agrega los materiales para calcular el CO₂ evitado con fuentes verificables
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setMateriales((prev) => [
                  ...prev,
                  { material: '', peso_kg: '', factor_co2_kg: '', origen_fuente: '', nivel_confianza: 'alta' },
                ])
              }
              style={{
                background: 'transparent',
                color: '#00827C',
                border: '1.5px solid rgba(0,130,124,0.40)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Open Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              + Agrega un material
            </button>
          </div>

          {materiales.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              Puedes agregar materiales ahora o después de crear el pasaporte.
            </p>
          )}

          {materiales.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 2fr 1fr auto',
                gap: 8,
                marginBottom: 4,
              }}
            >
              {['Material', 'Peso kg', 'CO₂/kg', 'Fuente', 'Confianza', ''].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    
                    letterSpacing: '0.05em',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {materiales.map((m, i) => (
            <FilaMaterial
              key={i}
              material={m}
              isMobile={isMobile}
              onChange={(updated) =>
                setMateriales((prev) => prev.map((x, j) => (j === i ? updated : x)))
              }
              onRemove={() => setMateriales((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
        </div>

        {/* Submit */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#7FA8A5' : '#00827C',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Open Sans', sans-serif",
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Creando pasaporte...' : 'Crea el pasaporte'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Open Sans', sans-serif",
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
