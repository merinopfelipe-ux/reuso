'use client'

import { useState, useTransition } from 'react'
import {
  Save as FloppyDisk,
  Upload,
  FileText,
  Medal,
} from 'lucide-react'

const C = {
  brand: 'var(--color-brand)', dark: 'var(--text-primary)', mid: 'var(--text-secondary)',
  border: 'var(--border)', light: 'var(--bg-hover)',
}

type Plantilla = {
  id: string
  tipo: 'certificado' | 'informe'
  activa: boolean
  encabezado_html: string | null
  pie_legal: string | null
  firmante_nombre: string | null
  firmante_cargo: string | null
  firma_imagen_url: string | null
  updated_at: string
}

type Props = { plantillas: Plantilla[] }

const TIPOS: { id: 'certificado' | 'informe'; label: string; icon: typeof FileText }[] = [
  { id: 'certificado', label: 'Certificado', icon: Medal },
  { id: 'informe', label: 'Informe', icon: FileText },
]

export function PlantillasClient({ plantillas: inicial }: Props) {
  const [plantillas, setPlantillas] = useState(inicial)
  const [tab, setTab] = useState<'certificado' | 'informe'>('certificado')
  const [, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const plantilla = plantillas.find(p => p.tipo === tab)

  const [form, setForm] = useState<Record<string, string>>({})

  function getField(campo: keyof Plantilla): string {
    if (form[`${tab}_${campo}`] !== undefined) return form[`${tab}_${campo}`]
    return (plantilla?.[campo] as string) ?? ''
  }

  function setField(campo: string, val: string) {
    setForm(prev => ({ ...prev, [`${tab}_${campo}`]: val }))
  }

  async function guardar() {
    const payload = {
      id: plantilla?.id,
      tipo: tab,
      firmante_nombre: getField('firmante_nombre'),
      firmante_cargo: getField('firmante_cargo'),
      encabezado_html: getField('encabezado_html'),
      pie_legal: getField('pie_legal'),
      firma_imagen_url: getField('firma_imagen_url'),
    }
    const res = await fetch('/api/admin/plantillas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) { showToast('Error al guardar.'); return }
    const { data } = await res.json() as { data: Plantilla }
    setPlantillas(prev => {
      const exists = prev.find(p => p.id === data.id)
      if (exists) return prev.map(p => p.id === data.id ? data : p)
      return [...prev, data]
    })
    showToast('Plantilla guardada correctamente.')
  }

  async function toggleActiva() {
    if (!plantilla) return
    const res = await fetch('/api/admin/plantillas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plantilla.id, tipo: tab, activa: !plantilla.activa }),
    })
    if (!res.ok) { showToast('Error al cambiar estado.'); return }
    const { data } = await res.json() as { data: Plantilla }
    setPlantillas(prev => prev.map(p => p.id === data.id ? data : p))
    showToast(data.activa ? 'Plantilla activada.' : 'Plantilla desactivada.')
  }

  async function handleFirmaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes.'); return }
    if (file.size > 2 * 1024 * 1024) { showToast('La imagen no puede superar 2 MB.'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'firmas')

    const res = await fetch('/api/admin/config/upload', { method: 'POST', body: formData })
    setUploading(false)
    if (!res.ok) { showToast('Error al subir la imagen.'); return }
    const { url } = await res.json() as { url: string }
    setField('firma_imagen_url', url)
    showToast('Imagen subida. Guarda la plantilla para aplicar los cambios.')
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.mid, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.dark, outline: 'none', background: 'var(--bg-input)' }
  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }
  const btnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, background: C.brand, color: 'var(--text-on-brand)', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
        {TIPOS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="hover-pop" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            color: tab === t.id ? C.brand : C.mid,
            borderBottom: tab === t.id ? `2px solid ${C.brand}` : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 680 }}>
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          {/* Estado activa */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.dark, margin: 0 }}>
                Plantilla de {tab === 'certificado' ? 'Certificado' : 'Informe'}
              </p>
              <p style={{ fontSize: 12, color: C.mid, margin: '4px 0 0' }}>
                {plantilla ? `Última actualización: ${new Date(plantilla.updated_at).toLocaleDateString('es-CO')}` : 'Aún no configurada'}
              </p>
            </div>
            {plantilla && (
              <button onClick={toggleActiva} className="hover-pop hover-press" style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 800,
                background: plantilla.activa ? 'rgba(56,185,142,0.12)' : C.light,
                color: plantilla.activa ? '#38B98E' : C.mid,
              }}>
                {plantilla.activa ? 'Activa' : 'Inactiva'}
              </button>
            )}
          </div>

          {/* Firmante */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Nombre del firmante</label>
              <input value={getField('firmante_nombre')} onChange={e => setField('firmante_nombre', e.target.value)} style={inputStyle} placeholder="Ej: María López" />
            </div>
            <div>
              <label style={labelStyle}>Cargo</label>
              <input value={getField('firmante_cargo')} onChange={e => setField('firmante_cargo', e.target.value)} style={inputStyle} placeholder="Ej: Directora de Sostenibilidad" />
            </div>
          </div>

          {/* Encabezado */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Encabezado personalizado (max 200 chars)</label>
            <textarea value={getField('encabezado_html')} onChange={e => setField('encabezado_html', e.target.value.slice(0, 200))}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Texto libre que aparece en la cabecera del documento" />
            <p style={{ fontSize: 11, color: C.mid, marginTop: 4 }}>{getField('encabezado_html').length}/200</p>
          </div>

          {/* Pie legal */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Pie legal (max 500 chars)</label>
            <textarea value={getField('pie_legal')} onChange={e => setField('pie_legal', e.target.value.slice(0, 500))}
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              placeholder="Este documento es emitido por Reuso..." />
            <p style={{ fontSize: 11, color: C.mid, marginTop: 4 }}>{getField('pie_legal').length}/500</p>
          </div>

          {/* Firma imagen */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Imagen de firma</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {getField('firma_imagen_url') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getField('firma_imagen_url')} alt="Firma" style={{ height: 60, objectFit: 'contain', border: `1px solid ${C.border}`, borderRadius: 8, padding: 4, background: 'var(--bg-primary)' }} />
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: C.light, color: C.brand, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1px solid ${C.border}` }}>
                <Upload size={15} />
                {uploading ? 'Subiendo...' : 'Subir firma (PNG/JPG, max 2 MB)'}
                <input type="file" accept="image/*" onChange={handleFirmaUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>
          </div>

          <button onClick={() => startTransition(() => { guardar() })} className="hover-download hover-press" style={btnStyle}>
            <FloppyDisk size={15} />
            Guardar plantilla
          </button>
        </div>

        <div style={{ background: C.light, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, color: C.mid, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: C.dark }}>Variables disponibles en el encabezado y pie:</strong><br />
            {'{{empresa}}'} · {'{{beneficiario}}'} · {'{{co2_total}}'} · {'{{periodo}}'} · {'{{codigo}}'}<br />
            La firma solo aparece en documentos si hay una imagen cargada y la plantilla está activa.
          </p>
        </div>
      </div>
    </div>
  )
}
