'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, TriangleAlert as Warning } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { FirmaCanvas } from '@/components/legal/firma-canvas'

const inputSt = 'w-full px-4 py-3 rounded-2xl border text-sm outline-none bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'

export function FirmaTokenClient({ token, documentoLabel, nombre }: { token: string; documentoLabel: string; nombre: string }) {
  const [aceptado, setAceptado] = useState(false)
  const [indicativo, setIndicativo] = useState<Pais>(PAISES[0])
  const [telefono, setTelefono] = useState('')
  const [firma, setFirma] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function firmar() {
    setError(null)
    if (!aceptado) { setError('Debes aceptar el documento antes de firmar.'); return }
    if (!telefono.trim()) { setError('Ingresa tu número de celular.'); return }
    if (!firma) { setError('Dibuja tu firma antes de enviar.'); return }

    setEnviando(true)
    try {
      const res = await fetch(`/api/legal/firma/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicativo: indicativo.dial, telefono: telefono.trim(), firma }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al firmar. Intenta de nuevo.'); return }
      setEnviado(true)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'

  if (enviado) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <CheckCircle size={40} className="text-[#38B98E] mx-auto mb-3" />
          <p className={`text-lg font-bold mb-2 ${tp}`}>Documento firmado</p>
          <p className={`text-sm ${ts}`}>Te enviamos una copia en PDF a tu correo. Ya puedes cerrar esta pestaña.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <p className={`text-xs font-semibold mb-1 ${ts}`}>Solicitud de firma</p>
      <h1 className={`text-xl font-bold mb-4 ${tp}`}>{documentoLabel}</h1>
      <p className={`text-sm mb-6 ${ts}`}>Hola {nombre}, revisa el documento completo antes de firmar.</p>

      <Link
        href={`/legal/confidencialidad`}
        target="_blank"
        className="inline-block mb-6 text-sm font-semibold text-[#00827C] hover-pop"
      >
        Leer el documento completo →
      </Link>

      <label
        className="flex items-start gap-3 cursor-pointer select-none rounded-2xl border p-4 mb-6"
        style={{ borderColor: aceptado ? 'rgba(0,130,124,0.30)' : 'var(--border)', background: aceptado ? 'rgba(0,130,124,0.04)' : 'var(--bg-card)' }}
        onClick={() => setAceptado(v => !v)}
      >
        <input type="checkbox" checked={aceptado} onChange={() => {}} className="mt-1 w-4 h-4 flex-shrink-0" style={{ accentColor: '#00827C' }} />
        <span className={`text-sm ${tp}`}>He leído y acepto los términos de este documento.</span>
      </label>

      <div className={`rounded-2xl border p-5 mb-4 bg-[var(--bg-card)] border-[var(--border)] ${!aceptado ? 'opacity-50' : ''}`}>
        <div className="mb-4">
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Celular</label>
          <div className="flex gap-2">
            <SelectorPais value={indicativo} onChange={setIndicativo} />
            <input
              value={telefono}
              onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, ''))}
              disabled={!aceptado}
              placeholder="Número de celular"
              inputMode="tel"
              className={`${inputSt} flex-1`}
            />
          </div>
        </div>

        <div>
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>Tu firma digital</label>
          <p className={`text-xs mb-2 ${ts}`}>Dibuja tu firma con el mouse o el dedo</p>
          <FirmaCanvas onChange={setFirma} disabled={!aceptado} />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[#FF5E4B] flex items-center gap-1"><Warning size={14} /> {error}</p>
      )}

      <Button onClick={firmar} loading={enviando} disabled={!aceptado} className="w-full">
        Firmar documento
      </Button>
    </div>
  )
}
