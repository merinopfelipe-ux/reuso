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

  const [tipoDocumento, setTipoDocumento] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipoIdentidad, setTipoIdentidad] = useState('')
  const [numeroIdentidad, setNumeroIdentidad] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ts = 'text-[var(--text-secondary)]'

  async function enviar() {
    if (!tipoDocumento || !nombre.trim() || !tipoIdentidad || !numeroIdentidad.trim() || !email.trim()) {
      setError('Completa el documento, los datos de la persona y su correo.')
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
          numero_identidad: `${tipoIdentidad} ${numeroIdentidad.trim()}`,
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
    <div className="max-w-2xl">
      <AdminPageHeader
        titulo="Invitar a firmar"
        subtitulo="Crea un enlace personal, seguro y de un solo uso para el destinatario."
        showBack
      />

      <div className="rounded-3xl border p-5 sm:p-7 bg-[var(--bg-card)] border-[var(--border)]">
        <section>
          <div className="flex gap-3 mb-4">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00827C] text-xs font-bold text-white">1</span>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Elige el documento</h2>
              <p className={`text-xs mt-0.5 ${ts}`}>La persona podrá leerlo completo antes de firmar.</p>
            </div>
          </div>
          <select
            value={tipoDocumento}
            onChange={e => setTipoDocumento(e.target.value)}
            className={inputSt}
          >
            <option value="" disabled>Selecciona el documento que debe firmar</option>
            {documentos.map(d => <option key={d.tipo} value={d.tipo}>{d.label}</option>)}
          </select>
        </section>

        <section className="mt-7 pt-6 border-t border-[var(--border)]">
          <div className="flex gap-3 mb-4">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00827C] text-xs font-bold text-white">2</span>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Identifica al destinatario</h2>
              <p className={`text-xs mt-0.5 ${ts}`}>Estos datos se mostrarán como referencia en la invitación; la persona podrá confirmarlos antes de firmar.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre completo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputSt} placeholder="Ej. Ana Gómez" />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Documento</label>
              <select value={tipoIdentidad} onChange={e => setTipoIdentidad(e.target.value)} className={inputSt}>
                <option value="" disabled>Selecciona</option>
                <option value="CC">Cédula (CC)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="NIT">NIT</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Número del documento</label>
              <input value={numeroIdentidad} onChange={e => setNumeroIdentidad(e.target.value.replace(/[^\dA-Za-z-]/g, ''))} className={inputSt} placeholder="Ej. 1020304050" />
            </div>
            <div className="sm:col-span-2">
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Correo electrónico</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputSt} placeholder="Ej. ana@empresa.com" />
            </div>
          </div>
        </section>

        <section className="mt-7 pt-6 border-t border-[var(--border)]">
          <div className="rounded-2xl bg-[#00827C]/[0.06] border border-[#00827C]/20 p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">3. Envía la invitación</p>
            <p className={`text-xs leading-relaxed mt-1 ${ts}`}>El correo incluirá un enlace personal que expira en 7 días. No contiene archivos adjuntos ni solicita contraseñas o pagos.</p>
          </div>
        </section>

        {error && (
          <p className="mb-4 text-sm text-[#FF5E4B] flex items-center gap-1"><Warning size={14} /> {error}</p>
        )}

        <Button onClick={enviar} loading={enviando} className="w-full">
          Crear y enviar invitación segura
        </Button>
      </div>
    </div>
  )
}
