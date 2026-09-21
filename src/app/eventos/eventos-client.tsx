'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Building2 as Buildings, Mail as EnvelopeSimple, User, CheckCircle } from '@/components/ui/icons'
import { InputTelefono } from '@/components/ui/input-telefono'
import { Button } from '@/components/ui/button'
import { ProteccionPublica } from '@/components/proteccion-publica'
import { validarTelefono } from '@/lib/telefono'
import { waLink } from '@/lib/constants/contacto'

const inputBase = `
  w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all duration-200
  bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border)]
  placeholder-[var(--text-placeholder)]/50 focus:border-[var(--color-brand)]
`

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/


export function EventosClient({ evento }: { evento: string | null }) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [indicativo, setIndicativo] = useState('+57')
  const [telefono, setTelefono] = useState('')
  const [sitioWeb, setSitioWeb] = useState('') // señuelo para bots, debe quedar vacío
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState<null | { correo: boolean; nombre: string }>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (nombre.trim().length < 2) return setError('Escribe tu nombre.')
    if (!telefono.trim() && !email.trim()) return setError('Escribe tu celular o tu correo.')
    if (telefono.trim()) {
      const errTel = validarTelefono(telefono, indicativo)
      if (errTel) return setError(errTel)
    }
    if (email.trim() && !EMAIL_VALIDO.test(email.trim())) return setError('Escribe un correo válido.')

    const nombreCompleto = [nombre.trim(), apellido.trim()].filter(Boolean).join(' ')

    setEnviando(true)
    try {
      const res = await fetch('/api/eventos/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreCompleto,
          empresa: empresa.trim() || undefined,
          email: email.trim(),
          indicativo,
          telefono: telefono.trim(),
          sitio_web: sitioWeb,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No pudimos enviar tus datos. Intenta de nuevo.')
        return
      }
      setListo({ correo: !!email.trim(), nombre: nombre.trim() })
    } catch {
      setError('No pudimos enviar tus datos. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ProteccionPublica>
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-primary)] px-4 py-10">
        <Image src="/logo-completo.svg" alt="Calculadora de Reúso" width={190} height={53} priority />

        <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm sm:p-8">
          {listo ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center animate-in fade-in duration-300" role="status">
              <div className="w-14 h-14 rounded-full bg-[var(--color-brand)]/10 text-[var(--color-brand)] flex items-center justify-center">
                <CheckCircle size={38} className="text-[var(--color-brand)]" />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {listo.nombre ? `¡Muchas gracias, ${listo.nombre}!` : '¡Muchas gracias!'}
                </h1>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Recibimos tus datos correctamente.{' '}
                  {listo.correo
                    ? 'Te enviamos un correo de confirmación y te contactaremos muy pronto.'
                    : 'Nos pondremos en contacto contigo muy pronto.'}
                </p>
              </div>

              <div className="w-full pt-3 flex flex-col gap-2.5">
                <a
                  href={waLink('Hola, nos conocimos en el evento y quiero saber más de la Calculadora de Reúso.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[var(--text-on-brand)] transition-all hover-pop hover-press"
                >
                  Escríbenos por WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setListo(null)
                    setNombre('')
                    setApellido('')
                    setEmpresa('')
                    setEmail('')
                    setTelefono('')
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1.5"
                >
                  Registrar otro contacto
                </button>
              </div>
            </div>
          ) : (
            <>
              {evento ? (
                <div className="mb-6 text-center">
                  <span className="inline-block rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-brand)] mb-2">
                    {evento}
                  </span>
                  <p className="text-sm text-[var(--text-secondary)]">Déjanos tus datos y te contactamos.</p>
                </div>
              ) : (
                <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">Déjanos tus datos y te contactamos.</p>
              )}

              <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
                {/* Nombres y Apellidos en dos espacios separados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="nombre" className="text-xs font-semibold text-[var(--text-secondary)]/70">
                      Nombres
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                      <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder="Ej. Ana"
                        autoComplete="given-name"
                        maxLength={60}
                        className={`${inputBase} pl-10`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="apellido" className="text-xs font-semibold text-[var(--text-secondary)]/70">
                      Apellidos
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                      <input
                        id="apellido"
                        type="text"
                        value={apellido}
                        onChange={e => setApellido(e.target.value)}
                        placeholder="Ej. Gómez"
                        autoComplete="family-name"
                        maxLength={60}
                        className={`${inputBase} pl-10`}
                      />
                    </div>
                  </div>
                </div>

                {/* Nombre de la empresa: no obligatorio */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="empresa" className="text-xs font-semibold text-[var(--text-secondary)]/70">
                    Nombre de la empresa
                  </label>
                  <div className="relative">
                    <Buildings size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                    <input
                      id="empresa"
                      type="text"
                      value={empresa}
                      onChange={e => setEmpresa(e.target.value)}
                      placeholder="Tu empresa"
                      autoComplete="organization"
                      maxLength={100}
                      className={`${inputBase} pl-10`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]/70">Celular</label>
                  <InputTelefono
                    indicativo={indicativo}
                    onChangeIndicativo={setIndicativo}
                    telefono={telefono}
                    onChangeTelefono={setTelefono}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="correo" className="text-xs font-semibold text-[var(--text-secondary)]/70">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <EnvelopeSimple size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                    <input
                      id="correo"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      autoComplete="email"
                      className={`${inputBase} pl-10`}
                    />
                  </div>
                </div>

                {/* Señuelo anti bots: invisible para personas, el servidor lo descarta si viene lleno */}
                <input
                  type="text"
                  name="sitio_web"
                  value={sitioWeb}
                  onChange={e => setSitioWeb(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />

                {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}

                <Button type="submit" variant="primary" loading={enviando} className="w-full">
                  Enviar
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </ProteccionPublica>
  )
}
