/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CameraIcon as Camera, XCircleIcon as XCircle, SquareCheck as CheckSquare, SquareIcon as Square, LeafIcon as Leaf, Droplet as Drop, PlusIcon as Plus, ArrowRightIcon as ArrowRight, AlertCircle as WarningCircle } from '@animateicons/react/lucide'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { calcularCotizacion } from '@/lib/cotizador/motor-cotizacion'
import type { ConfigCostosMueble, Oficios, ResultadoCotizacion } from '@/lib/cotizador/motor-cotizacion'
import type { DiagnosticoIA } from '@/app/api/cotizador/diagnostico/route'

// ── Tipos locales ─────────────────────────────────────────────────────────────

interface MuebleAgregado {
  tipo_mueble: string
  categoria: string
  precio_mueble: number
  co2_evitado_kg: number
  agua_evitada_l: number
  imagen_preview: string | null
}

type EstadoUI = 'idle' | 'analizando' | 'inviable' | 'ajustando' | 'guardando'

// ── Helper compresión de imagen ───────────────────────────────────────────────

async function comprimirImagenBase64(file: File): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 800
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('blob null')); return }
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            const base64 = dataUrl.split(',')[1]
            resolve({ base64, preview: dataUrl })
          }
          reader.readAsDataURL(blob)
        },
        'image/webp',
        0.80
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('load error')) }
    img.src = objectUrl
  })
}

function formatCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function NuevaCotizacionPage() {
  const router = useRouter()
  const inputFotoRef = useRef<HTMLInputElement>(null)

  // Config de costos de la empresa (se carga al montar)
  const [configs, setConfigs] = useState<ConfigCostosMueble[]>([])

  // Estado del flujo
  const [estado, setEstado] = useState<EstadoUI>('idle')
  const [error, setError] = useState<string | null>(null)

  // Diagnóstico actual
  const [imagenBase64, setImagenBase64] = useState<string | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [diagnostico, setDiagnostico] = useState<DiagnosticoIA | null>(null)
  const [diagnosticoOriginal, setDiagnosticoOriginal] = useState<DiagnosticoIA | null>(null)

  // Toggles ajustables por el comercial
  const [oficios, setOficios] = useState<Oficios>({ tapiceria: false, pintura: false, carpinteria_superficial: false })
  const [danosOcultos, setDanosOcultos] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCotizacion | null>(null)

  // Cotización acumulada
  const [cotizacionId, setCotizacionId] = useState<string | null>(null)
  const [muebles, setMuebles] = useState<MuebleAgregado[]>([])

  // Tema
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Cargar configs de costos
  useEffect(() => {
    fetch('/api/cotizador/config')
      .then(r => r.json())
      .then(d => { if (d.configs) setConfigs(d.configs) })
      .catch(() => {})
  }, [])

  // Proteger trabajo no guardado: advertir al salir si hay muebles acumulados
  useEffect(() => {
    if (muebles.length === 0) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [muebles.length])

  // Recalcular en tiempo real cuando cambian toggles
  useEffect(() => {
    if (!diagnostico || estado !== 'ajustando') return
    const config = configs.find(c => c.tipo_mueble === diagnostico.tipo)
    if (!config) return
    const res = calcularCotizacion({ oficios, ajustes_humanos: { danos_ocultos: danosOcultos }, config })
    setResultado(res)
  }, [oficios, danosOcultos, diagnostico, configs, estado])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleFotoSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10 MB. Elige otra foto.')
      if (inputFotoRef.current) inputFotoRef.current.value = ''
      return
    }

    setError(null)
    setEstado('analizando')
    setDiagnostico(null)
    setResultado(null)

    try {
      const { base64, preview } = await comprimirImagenBase64(file)
      setImagenBase64(base64)
      setImagenPreview(preview)

      const res = await fetch('/api/cotizador/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_base64: base64, mime_type: 'image/webp' }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al analizar la imagen.')
        setImagenPreview(null)
        setEstado('idle')
        if (inputFotoRef.current) inputFotoRef.current.value = ''
        return
      }

      const diag: DiagnosticoIA = data.diagnostico
      setDiagnostico(diag)
      setDiagnosticoOriginal(diag)

      if (!diag.es_viable) {
        setEstado('inviable')
        return
      }

      // Inicializar toggles con la respuesta de la IA
      setOficios(diag.oficios)
      setDanosOcultos(false)
      setEstado('ajustando')
    } catch {
      setError('No se pudo analizar la imagen. Verifica tu conexión.')
      setEstado('idle')
    }
    // Limpiar input para permitir subir la misma imagen de nuevo
    if (inputFotoRef.current) inputFotoRef.current.value = ''
  }

  async function handleAgregarMueble() {
    if (!diagnostico || !imagenBase64 || !resultado) return
    setEstado('guardando')
    setError(null)

    try {
      // Crear cotización si aún no existe
      let id = cotizacionId
      if (!id) {
        const resCot = await fetch('/api/cotizador/cotizaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        const dataCot = await resCot.json()
        if (!resCot.ok) { setError(dataCot.error ?? 'Error al crear la cotización.'); setEstado('ajustando'); return }
        id = dataCot.id as string
        setCotizacionId(id)
      }

      // Detectar si el comercial corrigió algo
      const fueCorregido = JSON.stringify(oficios) !== JSON.stringify(diagnosticoOriginal?.oficios)

      const resMueble = await fetch(`/api/cotizador/cotizaciones/${id}/mueble`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen_base64: imagenBase64,
          mime_type: 'image/webp',
          diagnostico_ia_json: diagnosticoOriginal,
          es_viable: diagnostico.es_viable,
          categoria: diagnostico.categoria ?? '',
          tipo_mueble: diagnostico.tipo ?? '',
          oficios_json: oficios,
          ajustes_humanos_json: { danos_ocultos: danosOcultos },
          fue_corregido_por_humano: fueCorregido,
        }),
      })
      const dataMueble = await resMueble.json()
      if (!resMueble.ok) { setError(dataMueble.error ?? 'Error al guardar el mueble.'); setEstado('ajustando'); return }

      setMuebles(prev => [...prev, {
        tipo_mueble: diagnostico.tipo ?? 'Mueble',
        categoria: diagnostico.categoria ?? '',
        precio_mueble: resultado.precio_mueble,
        co2_evitado_kg: resultado.co2_evitado_kg,
        agua_evitada_l: resultado.agua_evitada_l,
        imagen_preview: imagenPreview,
      }])

      // Reiniciar para agregar otro
      setEstado('idle')
      setDiagnostico(null)
      setImagenBase64(null)
      setImagenPreview(null)
      setResultado(null)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setEstado('ajustando')
    }
  }

  function handleGenerarPropuesta() {
    if (!cotizacionId) return
    router.push(`/empresa/cotizador/${cotizacionId}/propuesta`)
  }

  // ── Colores tema ──────────────────────────────────────────────────────────────

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  // Totales acumulados
  const totalPrecio = muebles.reduce((s, m) => s + m.precio_mueble, 0)
  const totalCo2 = muebles.reduce((s, m) => s + m.co2_evitado_kg, 0)
  const totalAgua = muebles.reduce((s, m) => s + m.agua_evitada_l, 0)

  const configDisponible = diagnostico?.tipo ? configs.some(c => c.tipo_mueble === diagnostico.tipo) : false

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-32 bg-[var(--bg-primary)]">
      <div className="max-w-lg mx-auto px-4 py-6">
        <AdminPageHeader titulo="Nueva cotización" showBack />

        {/* Lista de muebles agregados */}
        {muebles.length > 0 && (
          <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${ts}`}>
              {muebles.length} {muebles.length === 1 ? 'mueble agregado' : 'muebles agregados'}
            </p>
            <div className="space-y-2">
              {muebles.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  {m.imagen_preview && (
                    <img src={m.imagen_preview} alt="" className="w-10 h-10 rounded-[8px] object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${tp}`}>{m.tipo_mueble}</p>
                    <p className={`text-xs ${ts}`}>{formatCOP(m.precio_mueble)}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Totales acumulados */}
            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${tp}`}>Total</span>
                <span className="text-sm font-bold text-[#00827C]">{formatCOP(totalPrecio)}</span>
              </div>
              <div className={`mt-1 text-xs ${ts}`}>
                Evitas {totalCo2.toFixed(1)} kg CO2 · Ahorras {totalAgua.toFixed(0)} L agua
              </div>
            </div>
          </div>
        )}

        {/* Zona de carga de foto */}
        {estado === 'idle' && (
          <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
            <div className="w-14 h-14 rounded-full bg-[#00827C]/10 flex items-center justify-center mx-auto mb-4">
              <Camera size={28} className="text-[#00827C]" />
            </div>
            <p className={`text-base font-semibold mb-1 ${tp}`}>
              {muebles.length === 0 ? 'Sube la foto del mueble' : 'Agrega otro mueble'}
            </p>
            <p className={`text-sm mb-4 ${ts}`}>La IA lo analiza y detecta qué oficios necesita</p>
            <button
              onClick={() => inputFotoRef.current?.click()}
              className="px-5 py-2.5 rounded-full bg-[#00827C] text-white text-sm font-semibold hover:bg-[#006B66] transition-colors hover-pop hover-press"
            >
              {muebles.length === 0 ? 'Sube la foto del mueble' : 'Agrega otro mueble'}
            </button>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFotoSeleccionada}
            />
            {error && (
              <p className="mt-3 text-sm text-[#FF5E4B] flex items-center justify-center gap-1">
                <WarningCircle size={16} /> {error}
              </p>
            )}
          </div>
        )}

        {/* Analizando */}
        {estado === 'analizando' && (
          <div className={`rounded-[12px] border p-6 ${cardBg}`}>
            {imagenPreview && (
              <img src={imagenPreview} alt="Vista previa" className="w-full h-48 object-cover rounded-[8px] mb-4" />
            )}
            <div className="space-y-3">
              <div className={`h-5 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
              <div className={`h-4 rounded-full w-3/4 animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
              <div className={`h-4 rounded-full w-1/2 animate-pulse ${isDark ? 'bg-white/10' : 'bg-[#00827C]/08'}`} />
            </div>
            <p className={`text-sm text-center mt-4 ${ts}`}>Analizando el mueble...</p>
          </div>
        )}

        {/* Inviable */}
        {estado === 'inviable' && diagnostico && (
          <div className={`rounded-[12px] border p-6 ${isDark ? 'bg-[#FF5E4B]/10 border-[#FF5E4B]/30' : 'bg-[#FF5E4B]/05 border-[#FF5E4B]/20'}`}>
            {imagenPreview && (
              <img src={imagenPreview} alt="" className="w-full h-40 object-cover rounded-[8px] mb-4 opacity-60" />
            )}
            <div className="flex items-start gap-3">
              <XCircle size={24} className="text-[#FF5E4B] flex-shrink-0 mt-0.5" />
              <div>
                <p className={`text-base font-semibold mb-1 ${tp}`}>Este mueble no es viable para restauración</p>
                <p className={`text-sm ${ts}`}>{diagnostico.motivo ?? 'Material o daño estructural no apto.'}</p>
              </div>
            </div>
            <button
              onClick={() => { setEstado('idle'); setDiagnostico(null); setImagenPreview(null) }}
              className={`mt-4 w-full py-2.5 rounded-full text-sm font-semibold border transition-colors hover-pop hover-press ${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-[#474747]/20 text-[#474747] hover:bg-[#474747]/05'}`}
            >
              Sube otra foto
            </button>
          </div>
        )}

        {/* Panel de ajuste */}
        {(estado === 'ajustando' || estado === 'guardando') && diagnostico && (
          <div className="space-y-4">
            {imagenPreview && (
              <img src={imagenPreview} alt="" className="w-full h-48 object-cover rounded-[12px]" />
            )}

            {/* Diagnóstico */}
            <div className={`rounded-[12px] border p-4 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-[#D6F391]/15 text-[#D6F391]' : 'bg-[#00827C]/08 text-[#00827C]'}`}>
                  {diagnostico.categoria}
                </span>
                <span className={`text-sm font-semibold ${tp}`}>{diagnostico.tipo}</span>
                {/* Badge confianza */}
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  (diagnostico.confianza ?? 0) >= 0.8
                    ? 'bg-[#38B98E]/15 text-[#38B98E]'
                    : (diagnostico.confianza ?? 0) >= 0.5
                    ? 'bg-[#F6BF3E]/15 text-[#F6BF3E]'
                    : 'bg-[#FF5E4B]/15 text-[#FF5E4B]'
                }`}>
                  {(diagnostico.confianza ?? 0) >= 0.8 ? 'Alta confianza' : (diagnostico.confianza ?? 0) >= 0.5 ? 'Confianza media' : 'Baja confianza'}
                </span>
              </div>
              {diagnostico.observaciones_visuales && (
                <p className={`text-xs italic ${ts}`}>&ldquo;{diagnostico.observaciones_visuales}&rdquo;</p>
              )}
            </div>

            {/* Oficios */}
            <div className={`rounded-[12px] border p-4 ${cardBg}`}>
              <p className={`text-sm font-semibold mb-3 ${tp}`}>Oficios detectados</p>
              <p className={`text-xs mb-4 ${ts}`}>Revisa y ajusta según lo que veas en el mueble</p>
              <div className="space-y-3">
                {([
                  { key: 'tapiceria', label: 'Tapicería' },
                  { key: 'pintura', label: 'Pintura' },
                  { key: 'carpinteria_superficial', label: 'Carpintería superficial' },
                ] as { key: keyof Oficios; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setOficios(prev => ({ ...prev, [key]: !prev[key] }))}>
                    {oficios[key]
                      ? <CheckSquare size={20} className="text-[#00827C] flex-shrink-0" />
                      : <Square size={20} className={`flex-shrink-0 ${ts}`} />
                    }
                    <span className={`text-sm font-medium ${oficios[key] ? tp : ts}`}>{label}</span>
                  </label>
                ))}
              </div>

              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
                <p className={`text-sm font-semibold mb-3 ${tp}`}>Ajustes del comercial</p>
                <label className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setDanosOcultos(p => !p)}>
                  {danosOcultos
                    ? <CheckSquare size={20} className="text-[#F6BF3E] flex-shrink-0" />
                    : <Square size={20} className={`flex-shrink-0 ${ts}`} />
                  }
                  <div>
                    <span className={`text-sm font-medium ${tp}`}>Daños ocultos</span>
                    <span className={`ml-2 text-xs ${ts}`}>(+20%)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Resultado en tiempo real */}
            {resultado && (
              <>
                <div className={`rounded-[12px] border p-4 ${cardBg}`}>
                  <p className={`text-xs uppercase tracking-wide font-semibold mb-1 ${ts}`}>Precio estimado</p>
                  <p className="text-3xl font-bold text-[#00827C]">{formatCOP(resultado.precio_mueble)}</p>
                  {resultado.desglose.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {resultado.desglose.map(d => (
                        <p key={d.oficio} className={`text-xs ${ts}`}>{d.oficio}: {formatCOP(d.precio)}</p>
                      ))}
                      {danosOcultos && <p className={`text-xs text-[#F6BF3E]`}>Daños ocultos: +20%</p>}
                    </div>
                  )}
                  {!configDisponible && (
                    <p className="mt-2 text-xs text-[#F6BF3E]">
                      Sin precios configurados para &ldquo;{diagnostico.tipo}&rdquo;. El precio es 0.
                    </p>
                  )}
                </div>

                {/* Contraprestación ambiental */}
                <div className={`rounded-[12px] p-4 ${isDark ? 'bg-[#D6F391]/15 border border-[#D6F391]/20' : 'bg-[#D6F391] border border-[#D6F391]'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#1A3A38]'}`}>
                    Contraprestación ambiental
                  </p>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Leaf size={20} className={isDark ? 'text-[#D6F391]' : 'text-[#1A3A38]'} />
                      <div>
                        <p className={`text-lg font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#1A3A38]'}`}>{resultado.co2_evitado_kg.toFixed(1)} kg</p>
                        <p className={`text-xs ${isDark ? 'text-[#D6F391]/70' : 'text-[#1A3A38]/70'}`}>CO2 evitado</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Drop size={20} className={isDark ? 'text-[#D6F391]' : 'text-[#1A3A38]'} />
                      <div>
                        <p className={`text-lg font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#1A3A38]'}`}>{resultado.agua_evitada_l.toFixed(0)} L</p>
                        <p className={`text-xs ${isDark ? 'text-[#D6F391]/70' : 'text-[#1A3A38]/70'}`}>agua ahorrada</p>
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? 'text-[#D6F391]/70' : 'text-[#1A3A38]/70'}`}>
                    Equivale a {resultado.equivalencias.arboles} {resultado.equivalencias.arboles === 1 ? 'árbol' : 'árboles'} al año
                  </p>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-[#FF5E4B] flex items-center gap-1">
                <WarningCircle size={16} /> {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botones sticky en móvil */}
      {(estado === 'ajustando' || estado === 'guardando') && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 border-t bg-[var(--bg-primary)] border-[var(--border)]">
          <div className="max-w-lg mx-auto flex gap-3">
            <button
              onClick={handleAgregarMueble}
              disabled={estado === 'guardando'}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[#00827C] text-white text-sm font-semibold hover:bg-[#006B66] transition-colors disabled:opacity-50 ${estado === 'guardando' ? '' : 'hover-pop hover-press'}`}
            >
              <Plus size={16} strokeWidth={2.5} />
              {estado === 'guardando' ? 'Guardando...' : 'Agrega otro mueble'}
            </button>
            {(cotizacionId || muebles.length > 0) && (
              <button
                onClick={handleGenerarPropuesta}
                disabled={estado === 'guardando'}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 ${estado === 'guardando' ? '' : 'hover-slide-r hover-press'} ${isDark ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)] hover:opacity-90' : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90'}`}
              >
                Genera la propuesta
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
