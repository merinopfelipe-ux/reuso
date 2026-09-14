'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TriangleAlert as Warning, ShieldCheck } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { SelectorPais, type Pais } from '@/components/ui/selector-pais'
import { FirmaCanvas } from '@/components/legal/firma-canvas'
import { SwitchOpciones } from '@/components/ui/switch-opciones'

const inputSt = 'w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)] transition-colors focus:border-[var(--color-brand)]'

interface DatosInvitacion {
  nombre?: string
  numeroIdentidad?: string
  email?: string
}

// Solo se usan datos que el remitente guardó en la invitación. Si el nombre
// parece corresponder a una empresa o no se puede dividir con certeza, el
// firmante recibe campos vacíos y ejemplos discretos en los placeholders.
function obtenerDatosInvitacion(invitacion?: DatosInvitacion) {
  const nombreCompleto = invitacion?.nombre?.trim() ?? ''
  const pareceEmpresa = /[-–—]|\b(S\.?\s*A\.?\s*S\.?|S\.?\s*A\.?|LTDA\.?|E\.U\.?)\b/i.test(nombreCompleto)
  const partes = pareceEmpresa ? [] : nombreCompleto.split(/\s+/).filter(Boolean)
  const documento = invitacion?.numeroIdentidad?.trim().match(/^(CC|CE|NIT|Pasaporte)\s+(.+)$/i)

  return {
    nombre: partes.length > 1 ? partes.slice(0, -1).join(' ') : '',
    apellido: partes.length > 1 ? partes.at(-1) ?? '' : '',
    tipoDocumento: documento?.[1] === 'Pasaporte' ? 'Pasaporte' : documento?.[1]?.toUpperCase() ?? '',
    numeroIdentidad: documento?.[2] ?? '',
    email: invitacion?.email?.trim() ?? '',
  }
}

export function FirmaTokenClient({ token, documentoLabel, invitacion }: { token: string; documentoLabel: string; invitacion?: DatosInvitacion }) {
  const datosInvitacion = obtenerDatosInvitacion(invitacion)
  const [aceptado, setAceptado] = useState(false)
  const [nombreInput, setNombreInput] = useState(datosInvitacion.nombre)
  const [apellidoInput, setApellidoInput] = useState(datosInvitacion.apellido)
  const [emailInput, setEmailInput] = useState(datosInvitacion.email)
  // La mayoría de estas invitaciones son para representantes de empresa. Se
  // muestra esa opción activa incluso antes de aceptar el acuerdo, para que
  // el selector no parezca vacío ni deshabilitado por error.
  const [quienFirma, setQuienFirma] = useState<'persona' | 'empresa'>('empresa')
  const [razonSocial, setRazonSocial] = useState('')
  const [nit, setNit] = useState('')
  const [cargo, setCargo] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState(datosInvitacion.tipoDocumento)
  const [numeroIdentidad, setNumeroIdentidad] = useState(datosInvitacion.numeroIdentidad)
  const [indicativo, setIndicativo] = useState<Pais | null>(null)
  const [telefono, setTelefono] = useState('')
  const [firma, setFirma] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function firmar() {
    setError(null)
    if (!aceptado) { setError('Debes aceptar el documento antes de firmar.'); return }
    if (quienFirma === 'empresa' && !razonSocial.trim()) { setError('Ingresa la razón social de la empresa.'); return }
    if (quienFirma === 'empresa' && !nit.trim()) { setError('Ingresa el NIT de la empresa.'); return }
    if (quienFirma === 'empresa' && !cargo.trim()) { setError('Ingresa el cargo del representante.'); return }
    if (!nombreInput.trim()) { setError(`Ingresa el ${quienFirma === 'empresa' ? 'nombre del representante' : 'nombre'}.`); return }
    if (!apellidoInput.trim()) { setError(`Ingresa el ${quienFirma === 'empresa' ? 'apellido del representante' : 'apellido'}.`); return }
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setError('Ingresa un correo electrónico válido para recibir tu copia firmada.')
      return
    }
    if (!tipoDocumento) { setError('Selecciona el tipo de documento.'); return }
    if (!numeroIdentidad.trim()) { setError('Ingresa tu número de documento de identidad.'); return }
    if (!indicativo) { setError('Selecciona el indicativo de tu celular.'); return }
    if (!telefono.trim()) { setError('Ingresa tu número de celular.'); return }
    if (!firma) { setError('Dibuja tu firma antes de enviar.'); return }

    setEnviando(true)
    try {
      const res = await fetch(`/api/legal/firma/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          indicativo: indicativo.dial,
          telefono: telefono.trim(),
          firma,
          nombre: nombreInput.trim(),
          apellido: apellidoInput.trim(),
          tipoDocumento,
          numeroIdentidad: numeroIdentidad.trim(),
          esEmpresa: quienFirma === 'empresa',
          ...(quienFirma === 'empresa' ? { razonSocial: razonSocial.trim(), nit: nit.trim(), cargo: cargo.trim() } : {}),
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38B98E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Tu documento quedó firmado</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Enviamos una copia oficial en PDF a <strong>{emailInput}</strong>. Puedes cerrar esta pestaña con tranquilidad.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <section className="rounded-3xl border p-5 sm:p-7 mb-5 bg-[var(--bg-card)] border-[var(--border)]">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-brand)] mb-2">FIRMA ELECTRÓNICA · ENLACE PERSONAL</p>
        <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${tp}`}>{documentoLabel}</h1>
        <p className={`text-sm leading-relaxed max-w-xl ${ts}`}>Revisa el acuerdo, confirma tus datos y dibuja tu firma. Al finalizar recibirás una copia en PDF en tu correo.</p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            ['1', 'Revisa el acuerdo'],
            ['2', 'Completa tus datos'],
            ['3', 'Firma y recibe tu copia'],
          ].map(([paso, texto]) => (
            <div key={paso} className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg-input)]">
              <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--text-on-brand)] text-[10px] font-bold mb-2">{paso}</span>
              <p className={`text-xs leading-snug ${tp}`}>{texto}</p>
            </div>
          ))}
        </div>

        <Link
          href="/legal/confidencialidad"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-[var(--color-brand)] hover-pop"
        >
          Leer el acuerdo completo en otra pestaña →
        </Link>
      </section>

      {/* Banner de validez jurídica Ley 527 de 1999 */}
      <div className="rounded-2xl border p-4 mb-6 bg-[var(--bg-card)] border-[var(--border)] text-xs leading-relaxed">
        <p className={`font-semibold mb-1 flex items-center gap-1.5 text-[var(--color-brand)]`}>
          <ShieldCheck size={16} className="flex-shrink-0" />
          Tu firma queda asociada a este acuerdo
        </p>
        <p className={ts}>
          Conforme a la <strong>Ley 527 de 1999</strong> y el <strong>Decreto 2364 de 2012</strong>, registramos el consentimiento, la fecha, la IP y un código de verificación para respaldar esta firma electrónica.
        </p>
      </div>

      <label
        className="flex items-start gap-3 cursor-pointer select-none rounded-2xl border p-4 mb-6 transition-colors"
        style={{ borderColor: aceptado ? 'var(--color-brand)' : 'var(--border)', background: aceptado ? 'var(--color-brand-light)' : 'var(--bg-card)' }}
      >
        <input
          type="checkbox"
          checked={aceptado}
          onChange={e => setAceptado(e.target.checked)}
          className="mt-0.5 w-4 h-4 flex-shrink-0 cursor-pointer"
          style={{ accentColor: 'var(--color-brand)' }}
        />
        <span className={`text-sm leading-relaxed ${tp}`}>He leído, comprendo y acepto los términos de este documento. Al continuar, manifiesto mi voluntad de firmarlo electrónicamente.</span>
      </label>

      <div className={`rounded-2xl border p-5 mb-4 bg-[var(--bg-card)] border-[var(--border)] transition-opacity ${!aceptado ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className={`text-xs font-bold tracking-wider ${ts}`}>DATOS DEL FIRMANTE</p>
          <p className={`text-xs ${ts}`}><span className="text-[#FF5E4B]">*</span> Obligatorio</p>
        </div>

        <div className="mb-4">
          <p className={`text-xs font-semibold mb-2 ${ts}`}>¿A nombre de quién firmas?</p>
          <SwitchOpciones
            opciones={[
              { valor: 'empresa', label: 'Represento una empresa' },
              { valor: 'persona', label: 'Persona natural' },
            ]}
            valor={quienFirma}
            onChange={setQuienFirma}
          />
        </div>

        {quienFirma === 'empresa' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>
                Razón social <span className="text-[#FF5E4B]">*</span>
              </label>
              <input
                value={razonSocial}
                onChange={e => setRazonSocial(e.target.value)}
                disabled={!aceptado}
              placeholder="Ej. Empresa Circular S.A.S."
                className={inputSt}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>
                NIT <span className="text-[#FF5E4B]">*</span>
              </label>
              <input
                value={nit}
                onChange={e => setNit(e.target.value)}
                disabled={!aceptado}
                placeholder="Ej. 900123456-7"
                className={inputSt}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              {quienFirma === 'empresa' ? 'Nombre del representante' : 'Nombre'} <span className="text-[#FF5E4B]">*</span>
            </label>
            <input
              value={nombreInput}
              onChange={e => setNombreInput(e.target.value)}
              disabled={!aceptado}
              placeholder="Ej. Ana"
              className={inputSt}
            />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              {quienFirma === 'empresa' ? 'Apellido del representante' : 'Apellido'} <span className="text-[#FF5E4B]">*</span>
            </label>
            <input
              value={apellidoInput}
              onChange={e => setApellidoInput(e.target.value)}
              disabled={!aceptado}
              placeholder="Ej. Gómez"
              className={inputSt}
            />
          </div>
        </div>

        {quienFirma === 'empresa' && (
          <div className="mb-4">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              Cargo <span className="text-[#FF5E4B]">*</span>
            </label>
            <input
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              disabled={!aceptado}
              placeholder="Ej. Representante legal"
              className={inputSt}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="sm:col-span-1">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              Documento <span className="text-[#FF5E4B]">*</span>
            </label>
            <select
              value={tipoDocumento}
              onChange={e => setTipoDocumento(e.target.value)}
              disabled={!aceptado}
              className={`${inputSt} py-2.5 cursor-pointer`}
            >
              <option value="" disabled>Selecciona un documento</option>
              <option value="CC">Cédula (CC)</option>
              <option value="CE">Cédula de Extranjería (CE)</option>
              <option value="NIT">NIT</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>
              Número del documento <span className="text-[#FF5E4B]">*</span>
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

        <div className="mb-4">
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>
            Correo electrónico para recibir tu copia <span className="text-[#FF5E4B]">*</span>
          </label>
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            disabled={!aceptado}
            placeholder="tu@correo.com"
            className={inputSt}
          />
          <p className={`text-[11px] mt-1 ${ts}`}>Aquí enviaremos la copia oficial en PDF una vez firmado el acuerdo.</p>
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
          <p className={`text-xs mb-2 ${ts}`}>Dibuja dentro del recuadro con el mouse, el dedo o un lápiz táctil.</p>
          <FirmaCanvas onChange={setFirma} disabled={!aceptado} />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[#FF5E4B] flex items-center gap-1.5"><Warning size={15} /> {error}</p>
      )}

      <Button onClick={firmar} loading={enviando} disabled={!aceptado} className="w-full">
        Firmar y recibir mi copia
      </Button>
    </div>
  )
}
