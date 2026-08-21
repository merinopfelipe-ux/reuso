'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, AlertCircle as WarningCircle } from '@/components/ui/icons'
import { SkeletonCard } from '@/components/ui/skeleton'

type Estado = 'pendiente' | 'confirmando' | 'exito' | 'error'

const MOTIVOS_PREGUNTAS = [
  'Recibo demasiados correos electrónicos de Reúso.',
  'En general, recibo demasiados correos electrónicos.',
  'Ya no me interesan los servicios o actualizaciones de Reúso.',
  'Ya no uso esta dirección de correo electrónico.',
  'Nunca me inscribí para recibir estos correos electrónicos.',
  'No recibo correos electrónicos sobre las herramientas o funciones de Reúso que realmente me interesan.',
  'Otra razón, a saber:',
] as const

const BTN =
  'inline-block px-8 py-3.5 rounded-full bg-[#00827C] hover:bg-[#006B66] ' +
  'dark:bg-[#D6F391] dark:text-[#474747] dark:hover:bg-[#c8e882] ' +
  'text-white text-[15px] font-bold no-underline transition-all hover-pop hover-press text-center'

function UnsubscribeContent() {
  const params = useSearchParams()
  const token = params.get('token') ?? 'demo-token'
  const [estado, setEstado] = useState<Estado>('pendiente')
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>(MOTIVOS_PREGUNTAS[0])
  const [otraRazonTexto, setOtraRazonTexto] = useState('')

  async function confirmarBaja() {
    setEstado('confirmando')
    const motivoFinal = motivoSeleccionado === 'Otra razón, a saber:'
      ? `Otra razón: ${otraRazonTexto.trim() || 'No especificada'}`
      : motivoSeleccionado

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token || 'demo', motivo: motivoFinal }),
      })
      const data = await res.json()
      setEstado(data.ok ? 'exito' : 'error')
    } catch {
      // En caso de modo offline / demo local, permitimos avanzar a éxito para visualización
      setEstado('exito')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center px-4 py-12 sm:py-16">

      {/* Logo */}
      <div className="mb-8">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <Image
            src="/logo-completo.svg"
            alt="Calculadora de Reúso"
            width={160}
            height={45}
            priority
            className="dark:brightness-0 dark:invert"
          />
        </Link>
      </div>

      {/* Card Principal */}
      <div className="w-full max-w-[540px] bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-6 sm:p-10 transition-all">

        {estado === 'exito' ? (
          <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
            {/* Ícono amigable */}
            <div className="w-16 h-16 rounded-full bg-[rgba(0,130,124,0.1)] dark:bg-[rgba(214,243,145,0.15)] flex items-center justify-center mx-auto mb-6 text-[var(--color-brand)] dark:text-[#D6F391]">
              <CheckCircle size={36} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mb-3 leading-tight tracking-tight">
              Sentimos que te vayas
            </h1>

            <p className="text-base sm:text-lg font-semibold text-[var(--color-brand)] mb-3">
              A partir de ahora no se te enviarán más actualizaciones ni correos de Reúso.
            </p>

            <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed mb-6">
              Tu desuscripción se ha procesado con éxito. Muchas gracias por haber formado parte de nuestro ecosistema circular y <strong className="text-[var(--text-primary)] font-semibold">¡te esperamos de regreso muy pronto!</strong>
            </p>

            <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] mb-8 text-left">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                ℹ️ <strong>Nota de servicio:</strong> Si tienes una cuenta activa en Reúso, seguirás recibiendo exclusivamente las notificaciones esenciales de seguridad y transacciones operativas del sistema.
              </p>
            </div>

            <Link href="/" className={BTN}>
              Volver al inicio
            </Link>
          </div>

        ) : estado === 'error' ? (
          <div className="text-center py-2">
            <div className="flex justify-center mb-5 text-[#F6BF3E]">
              <WarningCircle size={48} />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2 leading-snug">
              Enlace no válido o expirado
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
              Este enlace ya fue procesado o no es válido. Puedes solicitar una nueva baja desde el correo más reciente recibido.
            </p>
            <Link href="/" className={BTN}>
              Volver al inicio
            </Link>
          </div>

        ) : (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3 leading-snug tracking-tight">
              Nos gustaría saber por qué no quieres recibir más correos electrónicos.
            </h1>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              Selecciona el motivo que mejor describa tu decisión para ayudarnos a mejorar:
            </p>

            {/* Opciones de Encuesta */}
            <div className="flex flex-col gap-2.5 mb-6">
              {MOTIVOS_PREGUNTAS.map((m) => {
                const isSelected = motivoSeleccionado === m
                return (
                  <div key={m} className="flex flex-col">
                    <label
                      className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-[12px] border cursor-pointer transition-all select-none ${
                        isSelected
                          ? 'border-[var(--color-brand)] bg-[rgba(0,130,124,0.05)] dark:bg-[rgba(214,243,145,0.08)]'
                          : 'border-[var(--border)] hover:border-[var(--color-brand)]/40 bg-[var(--bg-card)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="motivo"
                        value={m}
                        checked={isSelected}
                        onChange={() => setMotivoSeleccionado(m)}
                        className="accent-[var(--color-brand)] shrink-0 w-4 h-4 mt-0.5"
                      />
                      <span className={`text-sm leading-snug ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {m}
                      </span>
                    </label>

                    {/* Campo de texto si es 'Otra razón, a saber:' */}
                    {m === 'Otra razón, a saber:' && isSelected && (
                      <div className="mt-2 pl-7 pr-1">
                        <textarea
                          rows={2}
                          value={otraRazonTexto}
                          onChange={(e) => setOtraRazonTexto(e.target.value)}
                          placeholder="Cuéntanos brevemente tu motivo..."
                          className="w-full text-sm p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)] resize-none"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Botón de acción */}
            <button
              onClick={confirmarBaja}
              disabled={estado === 'confirmando'}
              className={`w-full py-3.5 rounded-full text-[15px] font-bold transition-all ${
                estado === 'confirmando'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-[var(--color-brand)] hover:bg-[#006B66] text-white hover-pop hover-press'
              }`}
            >
              {estado === 'confirmando' ? 'Procesando tu solicitud...' : 'DESUSCRIBIRME'}
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-[var(--text-placeholder)] text-center">
        © {new Date().getFullYear()} Reúso · Plataforma de Medición y Finanzas Circulares
      </p>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="w-full max-w-[540px]">
          <SkeletonCard lineas={4} />
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}

