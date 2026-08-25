'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { KpiCard } from '@/components/admin/kpi-card'
import { EmptyState } from '@/components/empty-state'
import { Selector } from '@/components/ui/selector'
import {
  CreditCard, Leaf, TrendUp, Target, FileText, CaretDown,
  ArrowCounterClockwise, CheckCircle,
} from '@/components/ui/icons'
import type { ResultadosFinancieros } from '@/types'

const GraficaMetricas = dynamic(() => import('./grafica-metricas').then(m => ({ default: m.GraficaMetricas })), { ssr: false })

// ── Estilos ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 14, color: 'var(--text-primary)',
  fontFamily: "'Open Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--text-primary)', marginBottom: 6, marginTop: 12,
}
const fieldStyle: React.CSSProperties = { marginBottom: 4 }
const btnPrimaryStyle: React.CSSProperties = {
  background: '#00827C', color: '#fff', border: 'none',
  borderRadius: 10, padding: '11px 24px', fontSize: 14,
  fontWeight: 700, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif",
}
const btnSecondaryStyle: React.CSSProperties = {
  background: 'transparent', color: '#00827C',
  border: '1.5px solid rgba(0,130,124,0.40)',
  borderRadius: 10, padding: '10px 20px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif",
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
}
const btnGhostStyle: React.CSSProperties = {
  background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border)', borderRadius: 10,
  padding: '10px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: "'Open Sans', sans-serif",
}
const errorBannerStyle: React.CSSProperties = {
  background: 'rgba(255,94,75,0.08)', border: '1px solid rgba(255,94,75,0.25)',
  borderRadius: 10, padding: '10px 14px', color: '#FF5E4B',
  fontSize: 14, fontWeight: 600, marginTop: 12,
}

import { formatFecha, formatNumero, formatCOP } from '@/lib/format'

// Esta pantalla deja elegir la moneda del análisis financiero (COP/USD/EUR,
// ver el selector `moneda` más abajo), así que el segundo parámetro no es
// opcional a nivel de intención — sin él, un TCO en dólares se mostraba con
// el símbolo de pesos. `formatCOP` sigue siendo la única fuente del formato
// numérico (separadores, decimales); acá solo se cambia el símbolo.
const SIMBOLO_MONEDA: Record<string, string> = { COP: '$', USD: 'US$', EUR: '€' }

function formatMoneda(n: number | null | undefined, moneda: 'COP' | 'USD' | 'EUR' = 'COP') {
  if (n == null) return '-'
  const enPesos = formatCOP(n)
  if (moneda === 'COP') return enPesos
  return enPesos.replace('$', SIMBOLO_MONEDA[moneda])
}

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: '#38B98E' },
  en_reuso: { label: 'En reúso', color: '#00827C' },
  disposicion_final: { label: 'Disposición final', color: '#FF5E4B' },
  archivado: { label: 'Archivado', color: '#8AD0B2' },
}

const CONFIANZA_COLOR: Record<string, string> = {
  alta: '#38B98E', media: '#F6BF3E', baja: '#FF5E4B',
}

async function comprimirDocumentoImagen(file: File): Promise<File | Blob> {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return file
  }
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const MAX = 1200
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
          resolve(compressedFile)
        },
        'image/jpeg',
        0.82
      )
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

// ── GrupoFormulario ────────────────────────────────────────────────────────────

function GrupoFormulario({
  titulo, open, onToggle, children,
}: { titulo: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Open Sans', sans-serif" }}
      >
        {titulo}
        <CaretDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--color-brand)' }} />
      </button>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  )
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface CampoExtraido {
  campo_original: string
  valor_extraido: string
  valor_numerico: number | null
  unidad: string | null
  confianza: number
  campo_destino_dpp: string
  notas: string | null
}

const DOC_TIPO_LABEL: Record<string, string> = {
  factura_compra: 'Factura de compra', recibo_energia: 'Recibo de energía',
  declaracion_origen: 'Declaración de origen', foto_objeto: 'Foto del objeto', otro: 'Otro',
}

const DOC_ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#F6BF3E' },
  procesando: { label: 'Procesando IA...', color: '#59A6E4' },
  completado: { label: 'Completado', color: '#38B98E' },
  error: { label: 'Error', color: '#FF5E4B' },
}

function DocEstadoBadge({ estado }: { estado: string }) {
  const conf = DOC_ESTADO_CONFIG[estado] ?? { label: estado, color: '#8AD0B2' }
  return (
    <span style={{ background: `${conf.color}1A`, color: conf.color, padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {conf.label}
    </span>
  )
}

function ModalResultadosIA({
  resultado, onClose, onAceptar,
}: {
  resultado: { campos_extraidos?: CampoExtraido[]; resumen?: string }
  onClose: () => void
  onAceptar: (campos: CampoExtraido[]) => void
}) {
  const campos = resultado.campos_extraidos ?? []
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(71,71,71,0.55)', backdropFilter: 'blur(8px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 640, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Open Sans', sans-serif" }}>
          Resultados de la extracción IA
        </h3>
        {resultado.resumen && (
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{resultado.resumen}</p>
        )}
        <div style={{ background: 'rgba(89,166,228,0.08)', border: '1px solid rgba(89,166,228,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--text-primary)' }}>
          Revisa los valores antes de aceptarlos. La IA extrae lo que ve - tú confirmas lo que es correcto.
        </div>
        {campos.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>La IA no encontró datos extraíbles. Ingresa los valores manualmente en el tab de Métricas.</p>
        ) : (
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Campo en doc</th>
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Valor extraído</th>
                    <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Confianza</th>
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Destino DPP</th>
                  </tr>
                </thead>
                <tbody>
                {campos.map((c, idx) => {
                  return (
                    <tr
                      key={idx}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                        idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                      }`}
                      style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                        <div className="flex items-center gap-2">
                          <span>{c.campo_original}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{c.valor_extraido}{c.unidad ? ` ${c.unidad}` : ''}</td>
                      <td className="px-4 py-3 text-center">
                        <span style={{ color: c.confianza >= 0.85 ? 'var(--color-brand)' : c.confianza >= 0.6 ? '#F6BF3E' : '#FF5E4B', fontWeight: 700 }}>
                          {Math.round(c.confianza * 100)} %
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{c.campo_destino_dpp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif" }}>
            Cerrar
          </button>
          {campos.length > 0 && (
            <button onClick={() => { onAceptar(campos); onClose() }} style={{ background: '#00827C', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif" }}>
              Acepta y pre-llena las métricas
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface Activo {
  id: string
  codigo_dpp: string
  nombre: string
  descripcion: string | null
  estado: string
  n_ciclos: number
  peso_total_kg: number | null
  composicion_json: unknown
  hash_integridad: string | null
  imagen_url: string | null
  qr_url: string | null
  created_at: string
  updated_at: string
  empresa_id: string
}

interface Ciclo {
  id: string
  numero_ciclo: number
  fecha_inicio: string | null
  fecha_fin: string | null
  operacion_realizada: string
  descripcion: string | null
  co2_ciclo_kg: number | null
  co2_evitado_kg: number | null
  distancia_transporte_km: number | null
}

interface Metrica {
  id: string
  tco: number | null
  costo_evitado: number | null
  e_roi: number | null
  ice_porcentaje: number | null
  inflow_circular_pct: number | null
  snapshot_json: unknown
  calculado_at: string
  version: string | null
}

interface Documento {
  id: string
  tipo: string
  nombre_archivo: string | null
  estado_ocr: string
  resultado_json: unknown
  created_at: string
}

interface Props {
  activo: Activo
  ciclos: Ciclo[]
  metricas: Metrica[]
  documentos: Documento[]
}

// ── Componente principal ───────────────────────────────────────────────────────

export function DppDetalleClient({ activo, ciclos, metricas, documentos }: Props) {
  const router = useRouter()
  const [tabActivo, setTabActivo] = useState<'pasaporte' | 'ciclos' | 'metricas' | 'documentos'>('pasaporte')

  // - Modal ciclo -
  const [showModalCiclo, setShowModalCiclo] = useState(false)
  const [cicloForm, setCicloForm] = useState({
    operacion_realizada: '', fecha_inicio: '', fecha_fin: '', descripcion: '', distancia_transporte_km: '0',
    tipo_vehiculo_transporte: '', peso_residuo_taller_kg: '0', peso_residuo_reciclado_kg: '0', destino_residuo: '',
  })
  const [loadingCiclo, setLoadingCiclo] = useState(false)
  const [errorCiclo, setErrorCiclo] = useState<string | null>(null)

  // - Métricas financieras -
  const [moneda, setMoneda] = useState<'COP' | 'USD' | 'EUR'>('COP')
  const [isOpenMoneda, setIsOpenMoneda] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenMoneda(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  type MetricaKey = 'p_virgin_usd_kg' | 'q_circular_kg' | 'c_adquisicion' | 'c_operacion' | 'c_mantenimiento' | 'c_disposicion' | 'v_reventa' | 'm_secundario_kg' | 'm_renovable_kg' | 'm_total_input_kg' | 'ahorro_operativo' | 'inversion_ce' | 'fp_ce' | 'fp_lineal' | 'c_impuesto_evitado'
  const [metricaInputs, setMetricaInputs] = useState<Record<MetricaKey, string>>({
    p_virgin_usd_kg: '', q_circular_kg: '',
    c_adquisicion: '', c_operacion: '', c_mantenimiento: '', c_disposicion: '', v_reventa: '',
    m_secundario_kg: '', m_renovable_kg: '',
    m_total_input_kg: activo.peso_total_kg != null ? String(activo.peso_total_kg) : '',
    ahorro_operativo: '', inversion_ce: '', fp_ce: '', fp_lineal: '', c_impuesto_evitado: '',
  })
  const [resultados, setResultados] = useState<ResultadosFinancieros | null>(null)
  const [loadingMetricas, setLoadingMetricas] = useState(false)
  const [errorMetricas, setErrorMetricas] = useState<string | null>(null)
  const [grupoA, setGrupoA] = useState(true)
  const [grupoB, setGrupoB] = useState(true)
  const [grupoC, setGrupoC] = useState(false)

  // - Documentos -
  const [documentosList, setDocumentosList] = useState<Documento[]>(documentos)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTipo, setUploadTipo] = useState('factura_compra')
  const [loadingUpload, setLoadingUpload] = useState(false)
  const [errorUpload, setErrorUpload] = useState<string | null>(null)
  const [docModalId, setDocModalId] = useState<string | null>(null)
  const [pollingIds, setPollingIds] = useState<Set<string>>(
    new Set(documentos.filter(d => d.estado_ocr === 'procesando' || d.estado_ocr === 'pendiente').map(d => d.id))
  )

  function Campo({ label, campo, tipo = 'number' }: { label: string; campo: MetricaKey; tipo?: string }) {
    return (
      <div style={fieldStyle}>
        <label style={labelStyle}>{label}</label>
        <input
          type={tipo} min="0" step="0.01"
          value={metricaInputs[campo]}
          onChange={(e) => setMetricaInputs((prev) => ({ ...prev, [campo]: e.target.value }))}
          style={inputStyle}
        />
      </div>
    )
  }

  async function handleRegistrarCiclo() {
    if (!cicloForm.operacion_realizada.trim()) { setErrorCiclo('Describe la operación realizada.'); return }
    if (!cicloForm.fecha_inicio) { setErrorCiclo('Completa la fecha de inicio.'); return }
    setErrorCiclo(null)
    setLoadingCiclo(true)
    const res = await fetch(`/api/dpp/activos/${activo.id}/ciclo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cicloForm,
        distancia_transporte_km: parseFloat(cicloForm.distancia_transporte_km) || 0,
        tipo_vehiculo_transporte: cicloForm.tipo_vehiculo_transporte || undefined,
        peso_residuo_taller_kg: parseFloat(cicloForm.peso_residuo_taller_kg) || 0,
        peso_residuo_reciclado_kg: parseFloat(cicloForm.peso_residuo_reciclado_kg) || 0,
        destino_residuo: cicloForm.destino_residuo || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setErrorCiclo(data.error ?? 'Error al registrar el ciclo.'); setLoadingCiclo(false); return }
    setShowModalCiclo(false)
    setCicloForm({
      operacion_realizada: '', fecha_inicio: '', fecha_fin: '', descripcion: '', distancia_transporte_km: '0',
      tipo_vehiculo_transporte: '', peso_residuo_taller_kg: '0', peso_residuo_reciclado_kg: '0', destino_residuo: '',
    })
    setLoadingCiclo(false)
    router.refresh()
  }

  async function handleCalcularMetricas() {
    setLoadingMetricas(true)
    setErrorMetricas(null)
    const payload: Record<string, number | undefined | string> = {
      n_ciclos: activo.n_ciclos,
      moneda,
    }
    for (const [k, v] of Object.entries(metricaInputs)) {
      payload[k] = v === '' ? undefined : parseFloat(v)
    }
    const res = await fetch(`/api/dpp/activos/${activo.id}/metricas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) { setErrorMetricas(data.error ?? 'Error al calcular.'); setLoadingMetricas(false); return }
    setResultados(data.data)
    setLoadingMetricas(false)
    router.refresh()
  }

  async function handleDescargarReporteCFO() {
    if (!resultados) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(0, 130, 124)
    doc.text('Reporte CFO - Pasaporte Digital de Producto', 20, 28)
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'normal')
    doc.text(`Activo: ${activo.nombre}`, 20, 44)
    doc.text(`Código DPP: ${activo.codigo_dpp}`, 20, 54)
    doc.text(`Ciclos registrados: ${activo.n_ciclos}`, 20, 64)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('Métricas financieras', 20, 80)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.text(`TCO (costo total de propiedad): ${formatMoneda(resultados.tco, moneda)}`, 20, 94)
    doc.text(`Costo evitado: ${formatMoneda(resultados.costo_evitado, moneda)}`, 20, 108)
    doc.text(`E-ROI: ${resultados.e_roi} %`, 20, 122)
    doc.text(`ICE (Índice Circularidad Económica): ${resultados.ice_porcentaje} %`, 20, 136)
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(12)
    doc.setTextColor(0, 130, 124)
    const lines = doc.splitTextToSize(resultados.narrativa, 170)
    doc.text(lines, 20, 156)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')} · reuso.lurdes.co · Grupo MLP S.A.S`, 20, 275)
    doc.save(`reporte-cfo-${activo.codigo_dpp}.pdf`)
  }

  // Polling de documentos en procesamiento
  useEffect(() => {
    if (pollingIds.size === 0) return
    const interval = setInterval(async () => {
      for (const id of Array.from(pollingIds)) {
        try {
          const res = await fetch(`/api/dpp/ingesta/${id}/estado`)
          if (!res.ok) continue
          const { data } = await res.json() as { data: { estado_ocr: string; resultado_json: unknown } }
          if (data.estado_ocr === 'completado' || data.estado_ocr === 'error') {
            setDocumentosList(prev => prev.map(d => d.id === id ? { ...d, estado_ocr: data.estado_ocr, resultado_json: data.resultado_json } : d))
            setPollingIds(prev => { const n = new Set(prev); n.delete(id); return n })
          }
        } catch { /* silencioso */ }
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [pollingIds])

  async function handleUpload() {
    if (!uploadFile) { setErrorUpload('Selecciona un archivo.'); return }
    setLoadingUpload(true); setErrorUpload(null)
    try {
      const archivoAProcesar = await comprimirDocumentoImagen(uploadFile)
      const form = new FormData()
      form.append('archivo', archivoAProcesar)
      form.append('activo_id', activo.id)
      form.append('tipo', uploadTipo)
      const res = await fetch('/api/dpp/ingesta/subir', { method: 'POST', body: form })
      const data = await res.json() as { data?: { id: string }; error?: string }
      if (!res.ok) { setErrorUpload(data.error ?? 'Error al subir.'); setLoadingUpload(false); return }
      const nuevoId = data.data!.id
      const nuevoDoc: Documento = { id: nuevoId, tipo: uploadTipo, nombre_archivo: uploadFile.name, estado_ocr: 'pendiente', resultado_json: null, created_at: new Date().toISOString() }
      setDocumentosList(prev => [nuevoDoc, ...prev])
      setUploadFile(null)
      setLoadingUpload(false)
      fetch('/api/dpp/ingesta/procesar-ia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento_id: nuevoId }),
      }).then(() => {
        setDocumentosList(prev => prev.map(d => d.id === nuevoId ? { ...d, estado_ocr: 'procesando' } : d))
        setPollingIds(prev => new Set([...Array.from(prev), nuevoId]))
      }).catch(() => {})
    } catch {
      setErrorUpload('Error al procesar el archivo. Intenta de nuevo.')
      setLoadingUpload(false)
    }
  }

  function handleAceptarDatosIA(campos: CampoExtraido[]) {
    const updates: Partial<Record<MetricaKey, string>> = {}
    for (const c of campos) {
      if (c.valor_numerico != null && c.campo_destino_dpp !== 'otro') {
        updates[c.campo_destino_dpp as MetricaKey] = String(c.valor_numerico)
      }
    }
    setMetricaInputs(prev => ({ ...prev, ...updates }))
    setTabActivo('metricas')
  }

  const estadoConf = ESTADO_CONFIG[activo.estado ?? 'activo'] ?? ESTADO_CONFIG['activo']
  const composicion = Array.isArray(activo.composicion_json)
    ? activo.composicion_json as { material: string; peso_kg: number; factor_co2_kg: number; origen_fuente?: string; nivel_confianza?: string }[]
    : []
  const co2Total = ciclos.reduce((s, c) => s + (c.co2_evitado_kg ?? 0), 0)

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif" }}>
      <AdminPageHeader
        titulo={activo.nombre}
        subtitulo={activo.codigo_dpp}
        showBack
        accion={
          <a href={`/pasaporte/${activo.codigo_dpp}`} target="_blank" rel="noreferrer" style={btnSecondaryStyle}>
            Ve la versión pública ↗
          </a>
        }
      />

      {/* ── TABS ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 28, gap: 0, overflowX: 'auto' }}>
        {[
          { id: 'pasaporte' as const, label: 'Pasaporte' },
          { id: 'ciclos' as const, label: `Ciclos (${activo.n_ciclos})` },
          { id: 'metricas' as const, label: 'Métricas financieras' },
          { id: 'documentos' as const, label: 'Documentos' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActivo(tab.id)}
            style={{
              padding: '10px 18px', border: 'none', background: 'transparent',
              fontSize: 14, fontWeight: tabActivo === tab.id ? 700 : 500,
              color: tabActivo === tab.id ? 'var(--color-brand)' : 'var(--text-secondary)',
              borderBottom: tabActivo === tab.id ? '2px solid var(--color-brand)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: "'Open Sans', sans-serif", whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: PASAPORTE ── */}
      {tabActivo === 'pasaporte' && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            {activo.imagen_url && (
              <div style={{ position: 'relative', width: '100%', height: 240, marginBottom: 16 }}>
                <Image src={activo.imagen_url} alt={activo.nombre} fill style={{ borderRadius: 10, objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ background: `${estadoConf.color}1A`, color: estadoConf.color, padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                {estadoConf.label}
              </span>
              {activo.peso_total_kg != null && (
                <span style={{ background: 'rgba(0,130,124,0.08)', color: 'var(--text-secondary)', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  {activo.peso_total_kg} kg
                </span>
              )}
            </div>
            {activo.descripcion && (
              <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{activo.descripcion}</p>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Creado el {formatFecha(activo.created_at)}</span>
              {activo.hash_integridad && (
                <span style={{ marginLeft: 16, fontFamily: 'monospace' }}>Hash: {activo.hash_integridad.slice(0, 10)}...</span>
              )}
            </div>
          </div>

          {composicion.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Composición de materiales
              </p>
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Material</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">Peso</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">CO₂ eq/kg</th>
                        <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Fuente</th>
                        <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Confianza</th>
                      </tr>
                    </thead>
                    <tbody>
                    {composicion.map((m, idx) => {
                      return (
                        <tr
                          key={idx}
                          className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                            idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                          }`}
                          style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                        >
                          <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                            <div className="flex items-center gap-2">
                              <span>{m.material}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)] text-right">{formatNumero(m.peso_kg, { unidad: 'kg' })}</td>
                          <td className="px-4 py-3 text-[var(--text-secondary)] text-right">{formatNumero(m.factor_co2_kg)}</td>
                          <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{m.origen_fuente ?? '-'}</td>
                          <td className="px-4 py-3 text-center">
                            {m.nivel_confianza ? (
                              <span style={{ background: `${CONFIANZA_COLOR[m.nivel_confianza] ?? '#8AD0B2'}1A`, color: CONFIANZA_COLOR[m.nivel_confianza] ?? '#8AD0B2', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                {m.nivel_confianza}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`/pasaporte/${activo.codigo_dpp}`} target="_blank" rel="noreferrer" style={btnSecondaryStyle}>
              Ve la versión pública ↗
            </a>
            {activo.qr_url ? (
              <a href={activo.qr_url} download style={btnSecondaryStyle}>Descarga el QR</a>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>El QR se genera al hacer el primer deploy público</span>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CICLOS ── */}
      {tabActivo === 'ciclos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
                {ciclos.length > 0 ? `${ciclos.length} ciclo${ciclos.length > 1 ? 's' : ''} registrado${ciclos.length > 1 ? 's' : ''} · ${co2Total.toFixed(2)} kg CO₂ eq evitados en total` : 'Sin ciclos registrados aún'}
              </p>
            </div>
            <button onClick={() => setShowModalCiclo(true)} style={btnPrimaryStyle}>
              Registra un ciclo
            </button>
          </div>

          {ciclos.length === 0 ? (
            <EmptyState
              icono={ArrowCounterClockwise}
              titulo="Registra el primer ciclo"
              descripcion="Cada vez que reutilizas este activo, un ciclo registra el impacto real: CO₂ eq evitado, operación realizada y fecha."
              cta={{ label: 'Registra el primer ciclo', onClick: () => setShowModalCiclo(true) }}
            />
          ) : (
            <div>
              {ciclos.map((c) => (
                <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,130,124,0.12)', color: '#00827C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {c.numero_ciclo}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {formatFecha(c.fecha_inicio)}{c.fecha_fin ? ` → ${formatFecha(c.fecha_fin)}` : ' → En curso'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.operacion_realizada}</p>
                  {c.descripcion && <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.descripcion}</p>}
                  {(c.co2_evitado_kg ?? 0) > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#38B98E' }}>
                      <CheckCircle size={14} />
                      Evitaste {c.co2_evitado_kg?.toFixed(2)} kg CO₂ eq
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showModalCiclo && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(71,71,71,0.55)', backdropFilter: 'blur(8px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 520, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Open Sans', sans-serif" }}>
                  Registra un ciclo de reúso
                </h3>
                <div style={fieldStyle}>
                  <label style={labelStyle}>¿Qué operación realizaste? *</label>
                  <input value={cicloForm.operacion_realizada} onChange={(e) => setCicloForm((p) => ({ ...p, operacion_realizada: e.target.value }))} placeholder="Tapizar, reparar, lijar, pintar..." style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Fecha inicio *</label>
                    <input type="date" value={cicloForm.fecha_inicio} onChange={(e) => setCicloForm((p) => ({ ...p, fecha_inicio: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Fecha fin</label>
                    <input type="date" value={cicloForm.fecha_fin} onChange={(e) => setCicloForm((p) => ({ ...p, fecha_fin: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Descripción</label>
                  <textarea value={cicloForm.descripcion} onChange={(e) => setCicloForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Describe los detalles del ciclo..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Distancia de transporte (km)</label>
                    <input type="number" min="0" step="0.1" value={cicloForm.distancia_transporte_km} onChange={(e) => setCicloForm((p) => ({ ...p, distancia_transporte_km: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Tipo de vehículo</label>
                    <Selector
                      value={cicloForm.tipo_vehiculo_transporte}
                      onChange={(val) => setCicloForm((p) => ({ ...p, tipo_vehiculo_transporte: val }))}
                      opciones={[
                        { value: '', label: 'Sin transporte registrado' },
                        { value: 'liviano_diesel', label: 'Furgoneta / van ligera diésel' },
                        { value: 'mediano_diesel', label: 'Camión mediano rígido diésel' },
                        { value: 'pesado_diesel', label: 'Camión pesado diésel' },
                      ]}
                    />
                  </div>
                </div>
                <p style={{ margin: '-6px 0 12px', fontSize: 11, color: 'var(--text-secondary)' }}>Factor DEFRA según el vehículo, aplicado al peso del activo para estimar la huella de transporte</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Residuo retirado en taller (kg)</label>
                    <input type="number" min="0" step="0.1" value={cicloForm.peso_residuo_taller_kg} onChange={(e) => setCicloForm((p) => ({ ...p, peso_residuo_taller_kg: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>De eso, cuánto reciclaste (kg)</label>
                    <input type="number" min="0" step="0.1" value={cicloForm.peso_residuo_reciclado_kg} onChange={(e) => setCicloForm((p) => ({ ...p, peso_residuo_reciclado_kg: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Destino del residuo no reciclado</label>
                  <input value={cicloForm.destino_residuo} onChange={(e) => setCicloForm((p) => ({ ...p, destino_residuo: e.target.value }))} placeholder="Relleno sanitario, incineración..." style={inputStyle} />
                </div>
                {errorCiclo && <div style={errorBannerStyle}>{errorCiclo}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button onClick={() => { setShowModalCiclo(false); setErrorCiclo(null) }} style={btnGhostStyle}>Cancelar</button>
                  <button onClick={handleRegistrarCiclo} disabled={loadingCiclo} style={{ ...btnPrimaryStyle, opacity: loadingCiclo ? 0.7 : 1 }}>
                    {loadingCiclo ? 'Registrando...' : 'Registra el ciclo'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MÉTRICAS FINANCIERAS ── */}
      {tabActivo === 'metricas' && (
        <div>
          <div style={{ background: 'rgba(0,130,124,0.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 }}>
              Ingresa los datos económicos y descubre cuánto ahorras reutilizando. Estos datos son privados - solo tu equipo los ve.
            </p>
          </div>

          <GrupoFormulario titulo="A. Costos y precios" open={grupoA} onToggle={() => setGrupoA((o) => !o)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <Campo label="Precio materia prima virgen (USD/kg)" campo="p_virgin_usd_kg" />
              <Campo label="Masa circular usada (kg)" campo="q_circular_kg" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 4 }}>
              <Campo label={`Costo adquisición (${moneda})`} campo="c_adquisicion" />
              <Campo label={`Gastos operativos (${moneda})`} campo="c_operacion" />
              <Campo label={`Mantenimiento (${moneda})`} campo="c_mantenimiento" />
              <Campo label={`Disposición evitada (${moneda})`} campo="c_disposicion" />
              <Campo label={`Valor reventa (${moneda})`} campo="v_reventa" />
              <div style={{ ...fieldStyle, position: 'relative' }} ref={dropdownRef}>
                <label style={labelStyle}>Moneda</label>
                <button
                  type="button"
                  onClick={() => setIsOpenMoneda(!isOpenMoneda)}
                  className="hover-pop"
                  style={{
                    ...inputStyle,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    minHeight: '40px',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${
                        moneda === 'COP' ? 'co' : moneda === 'USD' ? 'us' : 'eu'
                      }.svg`}
                      alt={moneda}
                      style={{ width: '20px', height: '15px', objectFit: 'cover', borderRadius: '2px' }}
                    />
                    {moneda === 'COP' ? 'COP - Peso colombiano' : moneda === 'USD' ? 'USD - Dólar' : 'EUR - Euro'}
                  </span>
                  <CaretDown size={16} style={{ color: 'var(--text-secondary)' }} />
                </button>
                {isOpenMoneda && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      zIndex: 50,
                      overflow: 'hidden',
                      padding: '4px 0',
                    }}
                  >
                    {[
                      { value: 'COP', name: 'COP - Peso colombiano', flag: 'co' },
                      { value: 'USD', name: 'USD - Dólar', flag: 'us' },
                      { value: 'EUR', name: 'EUR - Euro', flag: 'eu' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setMoneda(opt.value as 'COP' | 'USD' | 'EUR')
                          setIsOpenMoneda(false)
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: moneda === opt.value ? 'rgba(0, 130, 124, 0.1)' : 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontFamily: "'Open Sans', sans-serif",
                          fontSize: 14,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (moneda !== opt.value) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseLeave={(e) => {
                          if (moneda !== opt.value) e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${opt.flag}.svg`}
                          alt={opt.value}
                          style={{ width: '20px', height: '15px', objectFit: 'cover', borderRadius: '2px' }}
                        />
                        <span>{opt.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GrupoFormulario>

          <GrupoFormulario titulo="B. Composición de materiales" open={grupoB} onToggle={() => setGrupoB((o) => !o)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Campo label="Masa secundaria/reciclada (kg)" campo="m_secundario_kg" />
              <Campo label="Masa renovable (kg)" campo="m_renovable_kg" />
              <Campo label="Masa total de materiales (kg)" campo="m_total_input_kg" />
            </div>
          </GrupoFormulario>

          <GrupoFormulario titulo="C. Para calcular E-ROI (opcional)" open={grupoC} onToggle={() => setGrupoC((o) => !o)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <Campo label={`Ahorro operativo circular (${moneda})`} campo="ahorro_operativo" />
              <Campo label={`Inversión en circularidad (${moneda})`} campo="inversion_ce" />
              <Campo label="Footprint proceso circular" campo="fp_ce" />
              <Campo label="Footprint proceso lineal (referencia)" campo="fp_lineal" />
              <Campo label={`Impuesto ambiental evitado (${moneda})`} campo="c_impuesto_evitado" />
            </div>
          </GrupoFormulario>

          {errorMetricas && <div style={errorBannerStyle}>{errorMetricas}</div>}

          <button onClick={handleCalcularMetricas} disabled={loadingMetricas} style={{ ...btnPrimaryStyle, marginTop: 8, opacity: loadingMetricas ? 0.7 : 1 }}>
            {loadingMetricas ? 'Calculando...' : 'Calcula las métricas'}
          </button>

          {resultados && (
            <div style={{ marginTop: 32 }}>
              <div style={{ background: 'rgba(56,185,142,0.08)', border: '1px solid rgba(56,185,142,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.7, fontFamily: "'Open Sans', sans-serif" }}>
                  {resultados.narrativa}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 20 }}>
                <KpiCard titulo="Costo total (TCO)" valor={formatMoneda(resultados.tco, moneda)} icono={CreditCard} color="#00827C" />
                <KpiCard titulo="Costo evitado" valor={formatMoneda(resultados.costo_evitado, moneda)} icono={Leaf} color="#38B98E" />
                <KpiCard titulo="E-ROI" valor={`${resultados.e_roi} %`} icono={TrendUp} color="#59A6E4" subtitulo="Retorno sobre inversión circular" />
                <KpiCard titulo="ICE" valor={`${resultados.ice_porcentaje} %`} icono={Target} color="#F6BF3E" subtitulo="Índice Circularidad Económica" />
              </div>
              <GraficaMetricas resultados={resultados} moneda={moneda} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={handleDescargarReporteCFO} style={btnPrimaryStyle}>Descarga reporte CFO</button>
                <button onClick={() => router.refresh()} style={btnSecondaryStyle as React.CSSProperties}>Actualizar vista</button>
              </div>
            </div>
          )}

          {metricas.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                Historial de métricas
              </p>
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                        <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Fecha</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">TCO</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">Costo evitado</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">E-ROI</th>
                        <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">ICE</th>
                        <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Versión</th>
                      </tr>
                    </thead>
                    <tbody>
                    {metricas.map((m, idx) => {
                      return (
                        <tr
                          key={m.id}
                          className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                            idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                          }`}
                          style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                        >
                          <td className="px-4 py-3 text-[var(--text-secondary)] text-xs text-center">
                            {formatFecha(m.calculado_at)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[var(--text-primary)] text-right">{formatMoneda(m.tco, 'COP')}</td>
                          <td className="px-4 py-3 font-semibold text-[var(--color-brand)] text-right">{formatMoneda(m.costo_evitado, 'COP')}</td>
                          <td className="px-4 py-3 text-[var(--text-primary)] text-right">{m.e_roi != null ? `${formatNumero(m.e_roi)} %` : '-'}</td>
                          <td className="px-4 py-3 text-[var(--text-primary)] text-right">{m.ice_porcentaje != null ? `${formatNumero(m.ice_porcentaje)} %` : '-'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)] text-center">{m.version ?? '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: DOCUMENTOS ── */}
      {tabActivo === 'documentos' && (
        <div>
          <div style={{ background: 'rgba(0,130,124,0.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 }}>
              Sube tus facturas o fotos del objeto. Extraemos los datos por ti y tú los confirmas - la IA propone, tú decides.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Sube un documento</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Tipo de documento</label>
                <Selector
                  value={uploadTipo}
                  onChange={setUploadTipo}
                  opciones={[
                    { value: 'factura_compra', label: 'Factura de compra' },
                    { value: 'recibo_energia', label: 'Recibo de energía' },
                    { value: 'declaracion_origen', label: 'Declaración de origen' },
                    { value: 'foto_objeto', label: 'Foto del objeto' },
                    { value: 'otro', label: 'Otro' },
                  ]}
                />
              </div>
              <div>
                <label style={labelStyle}>Archivo (JPG, PNG · máx 10 MB)</label>
                <input type="file" accept=".jpg,.jpeg,.png"
                  onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setErrorUpload(null) }}
                  style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}
                />
              </div>
            </div>
            {errorUpload && <div style={errorBannerStyle}>{errorUpload}</div>}
            <button onClick={handleUpload} disabled={loadingUpload || !uploadFile}
              style={{ ...btnPrimaryStyle, opacity: loadingUpload || !uploadFile ? 0.6 : 1, marginTop: 8 }}>
              {loadingUpload ? 'Subiendo...' : 'Sube el documento'}
            </button>
          </div>
          {documentosList.length === 0 ? (
            <EmptyState icono={FileText} titulo="Sin documentos aún"
              descripcion="Sube tu primera factura o foto. La IA extraerá los datos en segundos." />
          ) : (
            documentosList.map(doc => (
              <div key={doc.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,130,124,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color="var(--color-brand)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre_archivo ?? 'Documento'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {DOC_TIPO_LABEL[doc.tipo] ?? doc.tipo} · {formatFecha(doc.created_at)}
                  </p>
                </div>
                <DocEstadoBadge estado={doc.estado_ocr} />
                {doc.estado_ocr === 'completado' && (
                  <button onClick={() => setDocModalId(doc.id)} style={btnSecondaryStyle}>Ver resultados</button>
                )}
              </div>
            ))
          )}
          {docModalId && (() => {
            const doc = documentosList.find(d => d.id === docModalId)
            const resultado = doc?.resultado_json as { campos_extraidos?: CampoExtraido[]; resumen?: string } | null
            if (!doc || !resultado) return null
            return (
              <ModalResultadosIA
                resultado={resultado}
                onClose={() => setDocModalId(null)}
                onAceptar={handleAceptarDatosIA}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}
