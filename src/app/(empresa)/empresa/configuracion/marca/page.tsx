'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Camera, FloppyDisk, CheckCircle, WarningCircle,
  CheckSquare, Square, Eye, Buildings,
} from '@phosphor-icons/react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface MarcaData {
  logo_propuesta_url: string | null
  nombre_footer_propuesta: string | null
  whatsapp_propuesta: string | null
  mostrar_marca_reuso: boolean
  nombre: string
}

// ── Helper compresión WebP ────────────────────────────────────────────────────

async function comprimirLogoWebP(file: File): Promise<{ base64: string; preview: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      if (img.width < 50 || img.height < 50) {
        reject(new Error('La imagen es demasiado pequeña. Usa una de al menos 50×50 px.'))
        return
      }
      const MAX = 600
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('blob')); return }
          if (blob.size > 2 * 1024 * 1024) {
            reject(new Error('El logo comprimido supera 2 MB. Usa una imagen más pequeña.'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            resolve({ base64: dataUrl.split(',')[1], preview: dataUrl, mime: 'image/webp' })
          }
          reader.readAsDataURL(blob)
        },
        'image/webp',
        0.90
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('load error')) }
    img.src = objectUrl
  })
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ConfigMarcaPage() {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado del formulario
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [logoMime, setLogoMime] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [nombreFooter, setNombreFooter] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [mostrarMarca, setMostrarMarca] = useState(true)
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [errorWa, setErrorWa] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    fetch('/api/cotizador/marca')
      .then(r => r.json())
      .then((d: MarcaData) => {
        setLogoUrl(d.logo_propuesta_url ?? null)
        setLogoPreview(d.logo_propuesta_url ?? null)
        setNombreFooter(d.nombre_footer_propuesta ?? d.nombre ?? '')
        setWhatsapp(d.whatsapp_propuesta ?? '')
        setMostrarMarca(d.mostrar_marca_reuso ?? true)
        setNombreEmpresa(d.nombre ?? '')
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const { base64, preview, mime } = await comprimirLogoWebP(file)
      setLogoBase64(base64)
      setLogoPreview(preview)
      setLogoMime(mime)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la imagen.')
    }
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  function validarWhatsapp(val: string): boolean {
    const limpio = val.replace(/\D/g, '')
    return limpio.length >= 7 && limpio.length <= 15
  }

  async function guardar() {
    if (whatsapp && !validarWhatsapp(whatsapp)) {
      setErrorWa('Escribe el WhatsApp con código de país, solo números. Ej: 573001234567')
      return
    }
    setErrorWa(null)
    setGuardando(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        nombre_footer_propuesta: nombreFooter || null,
        whatsapp_propuesta: whatsapp || null,
        mostrar_marca_reuso: mostrarMarca,
      }
      if (logoBase64 && logoMime) {
        body.logo_base64 = logoBase64
        body.logo_mime = logoMime
      }
      const res = await fetch('/api/cotizador/marca', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al guardar.'); return }
      if (d.logo_propuesta_url) {
        setLogoUrl(d.logo_propuesta_url)
        setLogoBase64(null)
      }
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'
  const inputCls = `w-full px-3 py-2.5 rounded-[8px] text-sm border border-[var(--border)] outline-none transition-colors
    bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-brand)]`

  const logoMostrado = logoPreview ?? logoUrl

  if (cargando) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-[12px] animate-pulse bg-[var(--skeleton-base)]" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-primary)]">
      <div className="max-w-lg mx-auto px-4 py-6">
        <AdminPageHeader titulo="Personaliza tu marca" showBack />
        <p className={`text-sm mb-6 ${ts}`}>
          Así se verá tu propuesta cuando el cliente la abra en su celular.
        </p>

        {/* Preview de la propuesta */}
        <div className={`rounded-[12px] border mb-6 overflow-hidden bg-[var(--bg-card)] border-[var(--border)]`}>
          <div className={`px-4 py-3 border-b flex items-center gap-2 border-[var(--border-light)]`}>
            <Eye size={14} className={ts} />
            <span className={`text-xs font-medium ${ts}`}>Vista previa de la propuesta</span>
          </div>
          {/* Mini encabezado de la propuesta */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              {logoMostrado ? (
                <div className="w-10 h-10 rounded-[8px] flex-shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--bg-input)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoMostrado} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-[8px] flex-shrink-0 flex items-center justify-center border border-[var(--border)] bg-[var(--bg-input)]">
                  <Buildings size={18} className={ts} />
                </div>
              )}
              <div>
                <p className={`text-xs font-semibold ${tp}`}>{nombreFooter || nombreEmpresa || 'Tu empresa'}</p>
                <p className={`text-xs ${ts}`}>Hola Cliente, preparamos tu propuesta</p>
              </div>
            </div>
            <div className="rounded-[8px] p-3 bg-[var(--bg-active)]">
              <p className={`text-xs font-semibold ${tp}`}>¿Tengo dudas?</p>
              {whatsapp && validarWhatsapp(whatsapp)
                ? <p className="text-xs mt-0.5 text-[#25D366]">→ WhatsApp {whatsapp}</p>
                : <p className={`text-xs mt-0.5 ${ts} italic`}>El botón &quot;Tengo dudas&quot; no aparecerá (sin WhatsApp)</p>
              }
            </div>
            {mostrarMarca && (
              <p className={`text-xs mt-2 text-center ${ts}`}>
                Hecho con <span className="text-[#00827C] font-medium">Calculadora de Reúso</span>
              </p>
            )}
          </div>
        </div>

        {/* Logo */}
        <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
          <p className={`text-sm font-semibold mb-3 ${tp}`}>Logo de tu empresa</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[10px] flex-shrink-0 overflow-hidden border border-[var(--border)] flex items-center justify-center bg-[var(--bg-input)]">
              {logoMostrado
                ? <img src={logoMostrado} alt="Logo" className="w-full h-full object-contain" />  // eslint-disable-line @next/next/no-img-element
                : <Camera size={22} className={ts} />
              }
            </div>
            <div className="flex-1">
              <button
                onClick={() => logoInputRef.current?.click()}
                className={`text-sm font-medium px-3 py-2 rounded-[8px] border transition-colors ${
                  isDark
                    ? 'border-white/15 text-white hover:bg-white/10'
                    : 'border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/05'
                }`}
              >
                {logoMostrado ? 'Cambia el logo' : 'Sube el logo de tu empresa'}
              </button>
              <p className={`text-xs mt-1.5 ${ts}`}>PNG, JPG o WebP. Máximo 2 MB.</p>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>

        {/* Nombre footer */}
        <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
          <label className={`text-sm font-semibold mb-2 block ${tp}`}>
            Nombre en el pie de la propuesta
          </label>
          <p className={`text-xs mb-3 ${ts}`}>Escribe el nombre que verán tus clientes al final de la propuesta.</p>
          <input
            type="text"
            className={inputCls}
            value={nombreFooter}
            onChange={e => setNombreFooter(e.target.value)}
            placeholder={nombreEmpresa || 'Ej: Restauraciones Lurdes S.A.S'}
            maxLength={120}
          />
        </div>

        {/* WhatsApp */}
        <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
          <label className={`text-sm font-semibold mb-2 block ${tp}`}>
            WhatsApp de atención al cliente
          </label>
          <p className={`text-xs mb-3 ${ts}`}>
            Escribe tu WhatsApp para que tus clientes te escriban. Con código de país, solo números.
          </p>
          <input
            type="tel"
            className={`${inputCls} ${errorWa ? (isDark ? 'border-[#FF5E4B]/60' : 'border-[#FF5E4B]/40') : ''}`}
            value={whatsapp}
            onChange={e => { setWhatsapp(e.target.value); setErrorWa(null) }}
            placeholder="57300 123 4567"
            maxLength={20}
          />
          {errorWa
            ? <p className="text-xs text-[#FF5E4B] mt-1.5 flex items-center gap-1"><WarningCircle size={13} />{errorWa}</p>
            : whatsapp && validarWhatsapp(whatsapp)
              ? <p className="text-xs text-[#38B98E] mt-1.5">Número válido. El botón &quot;Tengo dudas&quot; aparecerá en la propuesta.</p>
              : <p className={`text-xs mt-1.5 ${ts}`}>
                  {whatsapp
                    ? 'Ejemplo correcto: 573001234567'
                    : 'Si lo dejas vacío, el botón "Tengo dudas" no aparecerá en la propuesta.'}
                </p>
          }
        </div>

        {/* Crédito Reúso */}
        <div className={`rounded-[12px] border p-4 mb-6 ${cardBg}`}>
          <p className={`text-sm font-semibold mb-3 ${tp}`}>Crédito de Calculadora de Reúso</p>
          <label
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setMostrarMarca(p => !p)}
          >
            {mostrarMarca
              ? <CheckSquare size={20} weight="duotone" className="text-[#00827C] flex-shrink-0" />
              : <Square size={20} weight="regular" className={`flex-shrink-0 ${ts}`} />
            }
            <div>
              <span className={`text-sm font-medium ${tp}`}>Mostrar &quot;Hecho con Calculadora de Reúso&quot;</span>
              <p className={`text-xs mt-0.5 ${ts}`}>El crédito aparece al final de la propuesta. Ayuda a generar confianza con tus clientes.</p>
            </div>
          </label>
        </div>

        {error && (
          <p className="text-sm text-[#FF5E4B] flex items-center gap-1 mb-4">
            <WarningCircle size={16} />{error}
          </p>
        )}

        <button
          onClick={guardar}
          disabled={guardando}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${
            isDark
              ? 'bg-[#D6F391] text-[#474747] hover:bg-[#C8E87A]'
              : 'bg-[#00827C] text-white hover:bg-[#006B66]'
          }`}
        >
          {guardado
            ? <><CheckCircle size={16} weight="duotone" /> Marca guardada</>
            : guardando
              ? 'Guardando...'
              : <><FloppyDisk size={16} weight="bold" /> Guarda tu marca</>
          }
        </button>
      </div>
    </div>
  )
}
