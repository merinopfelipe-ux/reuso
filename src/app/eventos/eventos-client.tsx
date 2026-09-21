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
const ASTERISCO = <span className="text-[var(--color-error)]"> *</span>

export function EventosClient({ evento }: { evento: string | null }) {
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [indicativo, setIndicativo] = useState('+57')
  const [telefono, setTelefono] = useState('')
  const [sitioWeb, setSitioWeb] = useState('') // señuelo para bots, debe quedar vacío
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState<null | { correo: boolean }>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (nombre.trim().split(/\s+/).filter(p => p.length >= 2).length < 2) return setError('Escribe tu nombre y apellido.')
    if (empresa.trim().length < 2) return setError('Escribe el nombre de tu empresa.')
    if (!telefono.trim() && !email.trim()) return setError('Escribe tu celular o tu correo. Con uno de los dos es suficiente.')
    if (telefono.trim()) {
      const errTel = validarTelefono(telefono, indicativo)
      if (errTel) return setError(errTel)
    }
    if (email.trim() && !EMAIL_VALIDO.test(email.trim())) return setError('Escribe un correo válido.')

    setEnviando(true)
    try {
      const res = await fetch('/api/eventos/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          empresa: empresa.trim(),
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
      setListo({ correo: !!email.trim() })
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
            <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
              <CheckCircle size={44} className="text-[var(--color-brand)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Recibimos tus datos</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {listo.correo ? 'Te enviamos un correo y te contactamos' : 'Te contactamos'} muy pronto para mostrarte cómo medir el impacto de tu empresa.
              </p>
              <a
                href={waLink('Hola, nos conocimos en el evento y quiero saber más de la Calculadora de Reúso.')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[var(--text-on-brand)] transition-all hover-pop hover-press"
              >
                Escríbenos por WhatsApp
              </a>
            </div>
          ) : (
            <>
              {evento && (
                <p className="mb-2 text-center text-xs font-semibold text-[var(--color-brand)]">{evento}</p>
              )}
              <h1 className="mb-1 text-center text-xl font-bold text-[var(--text-primary)]">Conoce la Calculadora de Reúso</h1>
              <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">Déjanos tus datos y te contactamos.</p>

              <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1">
                  <label htmlFor="nombre" className="text-xs font-semibold text-[var(--text-secondary)]/70">
                    Nombre y apellido{ASTERISCO}
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                    <input id="nombre" type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                      placeholder="Ej. Ana Gómez" autoComplete="name" maxLength={100} className={`${inputBase} pl-10`} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="empresa" className="text-xs font-semibold text-[var(--text-secondary)]/70">
                    Nombre de la empresa{ASTERISCO}
                  </label>
                  <div className="relative">
                    <Buildings size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                    <input id="empresa" type="text" value={empresa} onChange={e => setEmpresa(e.target.value)}
                      placeholder="Tu empresa" autoComplete="organization" maxLength={100} className={`${inputBase} pl-10`} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]/70">Celular{ASTERISCO}</label>
                  <InputTelefono indicativo={indicativo} onChangeIndicativo={setIndicativo} telefono={telefono} onChangeTelefono={setTelefono} />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="correo" className="text-xs font-semibold text-[var(--text-secondary)]/70">
                    Correo electrónico{ASTERISCO}
                  </label>
                  <div className="relative">
                    <EnvelopeSimple size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                    <input id="correo" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="tu@empresa.com" autoComplete="email" className={`${inputBase} pl-10`} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]/70">Con el celular o el correo es suficiente. No necesitas los dos.</p>
                </div>

                {/* Señuelo anti bots: invisible para personas, el servidor lo descarta si viene lleno */}
                <input type="text" name="sitio_web" value={sitioWeb} onChange={e => setSitioWeb(e.target.value)}
                  tabIndex={-1} autoComplete="off" aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

                {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}

                <Button type="submit" variant="primary" loading={enviando} className="w-full">
                  Quiero que me contacten
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </ProteccionPublica>
  )
}
