'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'

type Estado = 'pendiente' | 'confirmando' | 'exito' | 'error'

const MOTIVOS = [
  'Recibo demasiados correos',
  'El contenido no es relevante para mí',
  'Ya no uso la plataforma',
  'Otro motivo',
] as const

const BTN =
  'inline-block px-7 py-3 rounded-full bg-[#00827C] hover:bg-[#006B66] ' +
  'dark:bg-[#D6F391] dark:text-[#474747] dark:hover:bg-[#c8e882] ' +
  'text-white text-[14px] font-bold no-underline transition-colors'

function UnsubscribeContent() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [estado, setEstado] = useState<Estado>('pendiente')
  const [motivo, setMotivo] = useState('')

  async function confirmarBaja() {
    if (!token) { setEstado('error'); return }
    setEstado('confirmando')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, motivo: motivo || undefined }),
      })
      const data = await res.json()
      setEstado(data.ok ? 'exito' : 'error')
    } catch {
      setEstado('error')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4 py-16">

      {/* Logo */}
      <div className="mb-10">
        <Image
          src="/logo-completo.svg"
          alt="Calculadora de Reúso"
          width={152}
          height={43}
          priority
          className="dark:brightness-0 dark:invert"
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] bg-[var(--bg-card)] border border-[rgba(0,130,124,0.12)] dark:border-[rgba(255,255,255,0.08)] rounded-2xl p-8 sm:p-10">

        {estado === 'exito' ? (
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <CheckCircle size={52} weight="fill" color="#38B98E" />
            </div>
            <h1 className="text-[20px] font-bold text-[#474747] dark:text-white mb-3 leading-snug">
              Baja confirmada
            </h1>
            <p className="text-[14px] text-[rgba(71,71,71,0.65)] dark:text-[rgba(255,255,255,0.6)] leading-relaxed mb-8">
              Ya no recibirás correos de marketing de la Calculadora de Reúso.
              Los correos del sistema seguirán llegando.
            </p>
            <Link href="/" className={BTN}>Volver al inicio</Link>
          </div>

        ) : estado === 'error' || !token ? (
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <WarningCircle size={52} weight="fill" color="#F6BF3E" />
            </div>
            <h1 className="text-[20px] font-bold text-[#474747] dark:text-white mb-3 leading-snug">
              Enlace no válido
            </h1>
            <p className="text-[14px] text-[rgba(71,71,71,0.65)] dark:text-[rgba(255,255,255,0.6)] leading-relaxed mb-8">
              Este enlace ya fue usado o no es válido. Usa el enlace del correo más reciente que recibiste.
            </p>
            <Link href="/" className={BTN}>Volver al inicio</Link>
          </div>

        ) : (
          <div>
            <h1 className="text-[20px] font-bold text-[#474747] dark:text-white mb-2 leading-snug">
              Cancelar suscripción
            </h1>
            <p className="text-[14px] text-[rgba(71,71,71,0.65)] dark:text-[rgba(255,255,255,0.6)] leading-relaxed mb-7">
              Deja de recibir correos de marketing. Los correos del sistema (confirmaciones, contraseña) seguirán llegando.
            </p>

            {/* Encuesta */}
            <p className="text-[13px] font-semibold text-[#474747] dark:text-[rgba(255,255,255,0.85)] mb-3">
              ¿Por qué cancelas?{' '}
              <span className="font-normal text-[rgba(71,71,71,0.45)] dark:text-[rgba(255,255,255,0.35)]">
                (opcional)
              </span>
            </p>
            <div className="flex flex-col gap-2 mb-7">
              {MOTIVOS.map((m) => (
                <label
                  key={m}
                  className={[
                    'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none',
                    motivo === m
                      ? 'border-[#00827C] bg-[rgba(0,130,124,0.06)] dark:border-[#D6F391] dark:bg-[rgba(214,243,145,0.08)]'
                      : 'border-[rgba(0,130,124,0.15)] dark:border-[rgba(255,255,255,0.1)] hover:border-[rgba(0,130,124,0.3)] dark:hover:border-[rgba(255,255,255,0.2)]',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m}
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                    className="accent-[#00827C] dark:accent-[#D6F391] shrink-0 w-4 h-4"
                  />
                  <span className="text-[14px] text-[#474747] dark:text-[rgba(255,255,255,0.85)]">
                    {m}
                  </span>
                </label>
              ))}
            </div>

            <button
              onClick={confirmarBaja}
              disabled={estado === 'confirmando'}
              className={[
                'w-full py-3 rounded-full text-[15px] font-bold transition-colors',
                'bg-[#00827C] hover:bg-[#006B66] text-white',
                'dark:bg-[#D6F391] dark:text-[#474747] dark:hover:bg-[#c8e882]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {estado === 'confirmando' ? 'Procesando...' : 'Confirmar baja'}
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-[12px] text-[rgba(71,71,71,0.4)] dark:text-[rgba(255,255,255,0.25)] text-center">
        © {new Date().getFullYear()} Grupo MLP S.A.S.
      </p>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <span className="text-[14px] text-[rgba(71,71,71,0.5)] dark:text-[rgba(255,255,255,0.4)]">
          Cargando...
        </span>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
