'use client'

import { useState, useEffect, useRef } from 'react'
import { contarDigitosAntes, posicionParaNDigitos } from '@/lib/formatted-input-cursor'

/**
 * Componente de entrada para Cédulas y NITs.
 * Formatea con puntos cada 3 cifras (ej. 1.123.456.789).
 * Para NITs admite el sufijo de dígito de verificación: 900.123.456-7.
 */
export function InputDocumento({
  value,
  onChange,
  placeholder = 'Ej. 900.123.456',
  className = '',
  style,
  required,
  disabled
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  required?: boolean
  disabled?: boolean
}) {
  const [displayVal, setDisplayVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function restaurarCursor(formateado: string, digitosAntes: number) {
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el || document.activeElement !== el) return
      const pos = posicionParaNDigitos(formateado, digitosAntes)
      el.setSelectionRange(pos, pos)
    })
  }

  // Formatea la parte numérica con puntos y preserva el sufijo -N (dígito de verificación).
  function formatear(raw: string): string {
    const dashIdx = raw.indexOf('-')
    const numPart = (dashIdx === -1 ? raw : raw.slice(0, dashIdx)).replace(/\D/g, '')
    const dv = dashIdx !== -1 ? raw.slice(dashIdx + 1).replace(/\D/g, '').slice(0, 1) : null
    const formatted = numPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return dv !== null ? `${formatted}-${dv}` : formatted
  }

  useEffect(() => {
    if (!value) { setDisplayVal(''); return }
    setDisplayVal(formatear(value))
  }, [value])

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="text"
      value={displayVal}
      required={required}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value
        const cursor = e.target.selectionStart ?? raw.length
        const digitosAntes = contarDigitosAntes(raw, cursor)
        const formatted = formatear(raw)
        setDisplayVal(formatted)
        onChange(formatted)
        restaurarCursor(formatted, digitosAntes)
      }}
      onBlur={(e) => {
        // Quita el guión colgado si no tiene dígito de verificación después
        const val = e.target.value
        if (val.endsWith('-')) {
          const limpio = val.slice(0, -1)
          setDisplayVal(limpio)
          onChange(limpio)
        }
      }}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-hidden focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      style={{
        background: 'var(--surface, var(--bg-input))',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
        ...style
      }}
    />
  )
}
