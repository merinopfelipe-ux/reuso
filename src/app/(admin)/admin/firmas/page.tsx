'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { Plus, Send as PaperPlaneTilt, Download } from '@/components/ui/icons'
import { SkeletonLista } from '@/components/ui/skeleton'
import { EstadoFirmaBadge, estadoFirmaEfectivo } from '@/components/firmas/estado-firma-badge'
import { documentoLabel } from '@/lib/firmas/documentos-meta'
import { formatFecha as formatFechaBase } from '@/lib/format'

interface Solicitud {
  id: string
  tipo_documento: string
  nombre: string
  numero_identidad: string
  email: string
  estado: string
  expira_at: string
  firmado_at: string | null
  pdf_path: string | null
  created_at: string
}

function formatFecha(iso: string): string {
  return formatFechaBase(iso, { conHora: true })
}

export default function FirmasPage() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [cargando, setCargando] = useState(true)
  const [reenviando, setReenviando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  function cargar() {
    setCargando(true)
    fetch('/api/admin/firmas')
      .then(r => r.json())
      .then(d => setSolicitudes(d.solicitudes ?? []))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  async function reenviar(id: string) {
    setReenviando(id)
    setMensaje(null)
    try {
      const res = await fetch(`/api/admin/firmas/${id}/reenviar`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setMensaje(d.error ?? 'Error al reenviar.'); return }
      setMensaje(d.warning ?? 'Enlace reenviado correctamente.')
      cargar()
    } catch {
      setMensaje('Error de conexión al reenviar.')
    } finally {
      setReenviando(null)
    }
  }

  async function descargarPdf(id: string) {
    const res = await fetch(`/api/admin/firmas/${id}/pdf`)
    const d = await res.json()
    if (res.ok && d.url) window.open(d.url, '_blank')
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <AdminPageHeader titulo="Firmas de documentos" />
        <Button onClick={() => router.push('/admin/firmas/nueva')} icon={<Plus size={16} strokeWidth={2.5} />}>
          Nueva solicitud
        </Button>
      </div>

      {mensaje && (
        <div className="mb-4 px-4 py-3 rounded-[10px] bg-[#00827C]/08 border border-[#00827C]/15 text-sm text-[var(--text-primary)]">
          {mensaje}
        </div>
      )}

      {cargando ? (
        <SkeletonLista filas={3} />
      ) : solicitudes.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
          <p className={`text-sm ${ts}`}>Aún no has enviado ninguna solicitud de firma.</p>
        </div>
      ) : (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)]">
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Destinatario</th>
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Documento</th>
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Enviado</th>
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s, index) => {
                  const efectivo = estadoFirmaEfectivo(s.estado, s.expira_at)
                  return (
                    <tr 
                      key={s.id} 
                      className={`transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                        index % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                      }`}
                      style={{ borderTop: index > 0 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-4 py-3">
                        <p className={`font-semibold ${tp}`}>{s.nombre}</p>
                        <p className={`text-xs ${ts}`}>{s.email} · {s.numero_identidad}</p>
                      </td>
                      <td className={`px-4 py-3 ${tp}`}>{documentoLabel(s.tipo_documento)}</td>
                      <td className="px-4 py-3"><EstadoFirmaBadge estado={s.estado} expiraAt={s.expira_at} /></td>
                      <td className={`px-4 py-3 text-xs text-center ${ts}`}>{formatFecha(s.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {efectivo !== 'firmado' && (
                            <Button size="sm" variant="secondary" loading={reenviando === s.id} icon={<PaperPlaneTilt size={13} />} onClick={() => reenviar(s.id)}>
                              Reenviar
                            </Button>
                          )}
                          {s.pdf_path && (
                            <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={() => descargarPdf(s.id)}>
                              PDF
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
