'use client'

import { useState, useEffect, useRef } from 'react'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { formatearTelefono } from '@/lib/formatters'
import { validarTelefono } from '@/lib/telefono'
import { contarDigitosAntes, posicionParaNDigitos } from '@/lib/formatted-input-cursor'
import { Warning } from '@/components/ui/icons'

interface InputTelefonoProps {
  indicativo: string
  onChangeIndicativo: (val: string) => void
  telefono: string
  onChangeTelefono: (val: string) => void
  className?: string
  style?: React.CSSProperties
  required?: boolean
  placeholder?: string
  permitirSinIndicativo?: boolean
  soloNumeros?: boolean
  disabled?: boolean
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
  required,
  placeholder,
  permitirSinIndicativo = false,
  soloNumeros = true,
  disabled,
}: InputTelefonoProps) {
  const [displayVal, setDisplayVal] = useState('')
  const [tocado, setTocado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Al reescribir el texto con formato, React manda el cursor al final: se devuelve
  // junto al dígito que se estaba editando (mismo patrón que InputConUnidad).
  function restaurarCursor(formateado: string, digitosAntes: number) {
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el || document.activeElement !== el) return
      const pos = posicionParaNDigitos(formateado, digitosAntes)
      el.setSelectionRange(pos, pos)
    })
  }

  useEffect(() => {
    if (!soloNumeros) {
      setDisplayVal(telefono)
    } else {
      setDisplayVal(formatearTelefono(telefono, indicativo))
    }
  }, [telefono, indicativo, soloNumeros])

  const vacio = telefono.trim() === ''
  const error = !tocado || !soloNumeros || !indicativo
    ? null
    : (vacio ? (required ? 'Este número es obligatorio.' : null) : validarTelefono(telefono, indicativo))

  return (
    <div className={`w-full ${className}`} style={style}>
      <div className="flex gap-2 w-full">
        {/* 110px en mobile (cabe bandera + código de hasta 4 dígitos + la
            flecha, ej. "🇭🇳 +504"), 140px desde sm: — con 140px fijo siempre,
            en 375px (el ancho mínimo obligatorio) el número quedaba con solo
            129px reales, demasiado angosto para "(300) 123 4567". */}
        <div className="shrink-0 w-[110px] sm:w-[140px]">
          <SelectorPais
            modo="indicativo"
            disabled={disabled}
            permitirSinIndicativo={permitirSinIndicativo}
            value={PAISES.find(p => p.dial === indicativo) || indicativo}
            onChange={(val: Pais | string) => {
              const nuevoInd = typeof val === 'string' ? val : val.dial
              onChangeIndicativo(nuevoInd)
              // Re-formatear teléfono si cambia de país
              if (soloNumeros) {
                const reFormatted = formatearTelefono(telefono, nuevoInd)
                setDisplayVal(reFormatted)
              }
            }}
          />
        </div>
        <input
          ref={inputRef}
          type={soloNumeros ? 'tel' : 'text'}
          inputMode={soloNumeros ? 'tel' : 'text'}
          value={displayVal}
          required={required}
          disabled={disabled}
          onChange={(e) => {
            if (!soloNumeros) {
              setDisplayVal(e.target.value)
              onChangeTelefono(e.target.value)
            } else {
              const cursor = e.target.selectionStart ?? e.target.value.length
              const digitosAntes = contarDigitosAntes(e.target.value, cursor)
              const raw = e.target.value.replace(/\D/g, '')
              const formatted = formatearTelefono(raw, indicativo)
              setDisplayVal(formatted)
              onChangeTelefono(raw) // Pasamos el valor sin formato al backend, solo digitos
              restaurarCursor(formatted, digitosAntes)
            }
          }}
          onBlur={() => setTocado(true)}
          placeholder={placeholder ?? (!indicativo ? 'Celular o WhatsApp' : (indicativo === '+57' ? '(300) 123 4567' : '123 456 7890'))}
          className="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-hidden focus:border-brand flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
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
