'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import { TriangleAlert as Warning } from '@/components/ui/icons'
import { DOCUMENTOS_META } from '@/lib/firmas/documentos-meta'

const inputSt = 'w-full px-4 py-3 rounded-2xl border text-sm outline-none bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'

export default function NuevaSolicitudFirmaPage() {
  const router = useRouter()
  const documentos = Object.values(DOCUMENTOS_META)

  const [tipoDocumento, setTipoDocumento] = useState(documentos[0]?.tipo ?? '')
  const [nombre, setNombre] = useState('')
  const [numeroIdentidad, setNumeroIdentidad] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ts = 'text-[var(--text-secondary)]'

  async function enviar() {
    if (!nombre.trim() || !numeroIdentidad.trim() || !email.trim()) {
      setError('Completa todos los campos.')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const res = await fetch('/api/admin/firmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_documento: tipoDocumento,
          nombre: nombre.trim(),
          numero_identidad: numeroIdentidad.trim(),
          email: email.trim(),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al enviar la solicitud.'); return }
      router.push('/admin/firmas')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-lg">
      <AdminPageHeader titulo="Nueva solicitud de firma" showBack />

      <div className="rounded-2xl border p-5 bg-[var(--bg-card)] border-[var(--border)]">
        <div className="mb-4">
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Tipo de documento</label>
          <select
            value={tipoDocumento}
            onChange={e => setTipoDocumento(e.target.value)}
            className={inputSt}
          >
            {documentos.map(d => <option key={d.tipo} value={d.tipo}>{d.label}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre completo del destinatario</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputSt} placeholder="Nombre y apellidos" />
        </div>

        <div className="mb-4">
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Número de documento</label>
          <input value={numeroIdentidad} onChange={e => setNumeroIdentidad(e.target.value)} className={inputSt} placeholder="Ej. 1234567890" inputMode="numeric" />
        </div>

        <div className="mb-5">
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Correo electrónico</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputSt} placeholder="correo@ejemplo.com" />
        </div>

        {error && (
          <p className="mb-4 text-sm text-[#FF5E4B] flex items-center gap-1"><Warning size={14} /> {error}</p>
        )}

        <p className={`text-xs mb-4 ${ts}`}>Se enviará un enlace único de un solo uso a este correo. Expira en 7 días.</p>

        <Button onClick={enviar} loading={enviando} className="w-full">
          Enviar invitación
        </Button>
      </div>
    </div>
  )
}
