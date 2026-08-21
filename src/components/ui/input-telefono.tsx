'use client'

import { useState, useEffect } from 'react'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { formatearTelefono } from '@/lib/formatters'
import { validarTelefono } from '@/lib/telefono'
import { Warning } from '@/components/ui/icons'

interface InputTelefonoProps {
  indicativo: string
  onChangeIndicativo: (val: string) => void
  telefono: string
  onChangeTelefono: (val: string) => void
  className?: string
  style?: React.CSSProperties
  required?: boolean
}

/**
 * Único input de celular permitido en la plataforma: indicativo (bandera +
 * código, ancho fijo 140px) + número con formato automático. Valida en vivo
 * al salir del campo contra las reglas de src/lib/telefono.ts (hoy solo
 * Colombia: 10 dígitos, empieza en 3) — así ninguna pantalla nueva puede
 * "olvidar" mostrar el error, queda resuelto una sola vez aquí. La
 * validación real (bloqueante) sigue viviendo en el API route server-side,
 * esto es solo feedback temprano para el usuario.
 */
export function InputTelefono({
  indicativo,
  onChangeIndicativo,
  telefono,
  onChangeTelefono,
  className = '',
  style,
  required
}: InputTelefonoProps) {
  const [displayVal, setDisplayVal] = useState('')
  const [tocado, setTocado] = useState(false)

  useEffect(() => {
    setDisplayVal(formatearTelefono(telefono, indicativo))
  }, [telefono, indicativo])

  const vacio = telefono.trim() === ''
  const error = !tocado
    ? null
    : (vacio ? (required ? 'Este número es obligatorio.' : null) : validarTelefono(telefono, indicativo))

  return (
    <div className={`w-full ${className}`} style={style}>
      <div className="flex gap-2 w-full">
        <div style={{ width: 140 }} className="flex-shrink-0">
          <SelectorPais
            modo="indicativo"
            value={PAISES.find(p => p.dial === indicativo) || indicativo}
            onChange={(val: Pais | string) => {
              const nuevoInd = typeof val === 'string' ? val : val.dial
              onChangeIndicativo(nuevoInd)
              // Re-formatear teléfono si cambia de país
              const reFormatted = formatearTelefono(telefono, nuevoInd)
              setDisplayVal(reFormatted)
            }}
          />
        </div>
        <input
          type="tel"
          inputMode="tel"
          value={displayVal}
          required={required}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '')
            const formatted = formatearTelefono(raw, indicativo)
            setDisplayVal(formatted)
            onChangeTelefono(raw) // Pasamos el valor sin formato al backend, solo digitos
          }}
          onBlur={() => setTocado(true)}
          placeholder={indicativo === '+57' ? '(300) 123 4567' : '123 456 7890'}
          className="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:border-[var(--color-brand)] flex-1"
          style={{
            background: 'var(--surface, var(--bg-input))',
            borderColor: error ? 'var(--color-error)' : 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-error)' }}>
          <Warning size={12} sinAnimacion /> {error}
        </p>
      )}
    </div>
  )
}
