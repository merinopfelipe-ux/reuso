'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, TriangleAlert as Warning, ShieldCheck } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { FirmaCanvas } from '@/components/legal/firma-canvas'

const inputSt = 'w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)] transition-colors focus:border-[#00827C]'

export function FirmaTokenClient({ token, documentoLabel, nombre }: { token: string; documentoLabel: string; nombre: string }) {
  const [aceptado, setAceptado] = useState(false)
  const [nombreInput, setNombreInput] = useState(() => {
    const parts = (nombre || '').trim().split(' ')
    return parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || ''
  })
  const [apellidoInput, setApellidoInput] = useState(() => {
    const parts = (nombre || '').trim().split(' ')
    return parts.length > 1 ? parts.slice(-1).join(' ') : ''
  })
  const [tipoDocumento, setTipoDocumento] = useState('CC')
  const [numeroIdentidad, setNumeroIdentidad] = useState('')
  const [indicativo, setIndicativo] = useState<Pais>(PAISES[0])
  const [telefono, setTelefono] = useState('')
  const [firma, setFirma] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function firmar() {
    setError(null)
    if (!aceptado) { setError('Debes aceptar el documento antes de firmar.'); return }
    if (!nombreInput.trim()) { setError('Ingresa tu nombre.'); return }
    if (!apellidoInput.trim()) { setError('Ingresa tu apellido.'); return }
    if (!numeroIdentidad.trim()) { setError('Ingresa tu número de documento de identidad.'); return }
    if (!telefono.trim()) { setError('Ingresa tu número de celular.'); return }
    if (!firma) { setError('Dibuja tu firma antes de enviar.'); return }

    setEnviando(true)
    try {
      const res = await fetch(`/api/legal/firma/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicativo: indicativo.dial,
          telefono: telefono.trim(),
          firma,
          nombre: nombreInput.trim(),
          apellido: apellidoInput.trim(),
          tipoDocumento,
          numeroIdentidad: numeroIdentidad.trim(),
        }),
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
          <p className={`text-lg font-bold mb-2 ${tp}`}>Documento firmado exitosamente</p>
          <p className={`text-sm ${ts}`}>Te enviamos una copia en PDF con el sello digital a tu correo. Ya puedes cerrar esta pestaña.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <p className={`text-xs font-semibold mb-1 ${ts}`}>Solicitud de firma</p>
      <h1 className={`text-xl font-bold mb-2 ${tp}`}>{documentoLabel}</h1>
      <p className={`text-sm mb-4 ${ts}`}>Revisa el documento completo y diligencia tus datos de identificación para estampar tu firma electrónica.</p>

      <Link
        href={`/legal/confidencialidad`}
        target="_blank"
        className="inline-flex items-center gap-1 mb-6 text-sm font-semibold text-[#00827C] hover-pop"
      >
        Leer el documento completo →
      </Link>

      {/* Banner de validez jurídica Ley 527 de 1999 */}
      <div className="rounded-2xl border p-4 mb-6 bg-[var(--bg-card)] border-[var(--border)] text-xs leading-relaxed">
        <p className={`font-semibold mb-1 flex items-center gap-1.5 text-[#00827C]`}>
          <ShieldCheck size={16} className="flex-shrink-0" />
          Validez jurídica y fuerza probatoria (Ley 527 de 1999)
        </p>
        <p className={ts}>
          Conforme a la <strong>Ley 527 de 1999</strong> y el <strong>Decreto 2364 de 2012</strong> de la República de Colombia, la presente firma electrónica cuenta con plena validez probatoria, autenticidad, integridad y no repudio. El proceso genera una traza de auditoría certificada con dirección IP, estampado cronológico y código hash de verificación.
        </p>
      </div>

      <label
        className="flex items-start gap-3 cursor-pointer select-none rounded-2xl border p-4 mb-6 transition-colors"
        style={{ borderColor: aceptado ? 'rgba(0,130,124,0.30)' : 'var(--border)', background: aceptado ? 'rgba(0,130,124,0.04)' : 'var(--bg-card)' }}
      >
        <input
          type="checkbox"
          checked={aceptado}
          onChange={e => setAceptado(e.target.checked)}
          className="mt-0.5 w-4 h-4 flex-shrink-0 cursor-pointer"
          style={{ accentColor: '#00827C' }}
        />
        <span className={`text-sm ${tp}`}>He leído, comprendo y acepto los términos y condiciones de este documento legal.</span>
      </label>

      <div className={`rounded-2xl border p-5 mb-4 bg-[var(--bg-card)] border-[var(--border)] transition-opacity ${!aceptado ? 'opacity-50 pointer-events-none' : ''}`}>
        <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${ts}`}>Datos del firmante</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              Nombre <span className="text-[#FF5E4B]">*</span>
            </label>
            <input
              value={nombreInput}
              onChange={e => setNombreInput(e.target.value)}
              disabled={!aceptado}
              placeholder="Tu nombre"
              className={inputSt}
            />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              Apellido <span className="text-[#FF5E4B]">*</span>
            </label>
            <input
              value={apellidoInput}
              onChange={e => setApellidoInput(e.target.value)}
              disabled={!aceptado}
              placeholder="Tu apellido"
              className={inputSt}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="sm:col-span-1">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              Tipo de doc. <span className="text-[#FF5E4B]">*</span>
            </label>
            <select
              value={tipoDocumento}
              onChange={e => setTipoDocumento(e.target.value)}
              disabled={!aceptado}
              className={`${inputSt} py-2.5 cursor-pointer`}
            >
              <option value="CC">Cédula (CC)</option>
              <option value="CE">Cédula de Extranjería (CE)</option>
              <option value="NIT">NIT</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              Número de identificación <span className="text-[#FF5E4B]">*</span>
            </label>
            <input
              value={numeroIdentidad}
              onChange={e => setNumeroIdentidad(e.target.value)}
              disabled={!aceptado}
              placeholder="Ej. 1020304050"
              className={inputSt}
            />
          </div>
        </div>

        <div className="mb-5">
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>
            Celular <span className="text-[#FF5E4B]">*</span>
          </label>
          <div className="flex gap-2 items-center">
            <div className="w-32 flex-shrink-0">
              <SelectorPais value={indicativo} onChange={setIndicativo} modo="indicativo" disabled={!aceptado} />
            </div>
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
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>
            Tu firma manuscrita digital <span className="text-[#FF5E4B]">*</span>
          </label>
          <p className={`text-xs mb-2 ${ts}`}>Dibuja tu firma con el mouse o en tu pantalla táctil</p>
          <FirmaCanvas onChange={setFirma} disabled={!aceptado} />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[#FF5E4B] flex items-center gap-1.5"><Warning size={15} /> {error}</p>
      )}

      <Button onClick={firmar} loading={enviando} disabled={!aceptado} className="w-full">
        Firmar documento electrónicamente
      </Button>
    </div>
  )
}
