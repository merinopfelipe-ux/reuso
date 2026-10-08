'use client'

import { useState, useEffect, useRef } from 'react'
import { contarDigitosAntes, posicionParaNDigitos } from '@/lib/formatted-input-cursor'

/**
 * Componente de entrada para Cédulas y NITs.
 * Formatea automáticamente en tiempo real usando EXCLUSIVAMENTE puntos cada 3 cifras (ej. 1.123.456.789).
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

  // Al reescribir el texto con puntos, React manda el cursor al final: se devuelve
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
    if (!value) {
      setDisplayVal('')
      return
    }
    const digits = value.replace(/\D/g, '')
    setDisplayVal(digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
  }, [value])

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayVal}
      required={required}
      disabled={disabled}
      onChange={(e) => {
        const cursor = e.target.selectionStart ?? e.target.value.length
        const digitosAntes = contarDigitosAntes(e.target.value, cursor)
        const raw = e.target.value.replace(/\D/g, '')
        const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        setDisplayVal(formatted)
        onChange(formatted)
        restaurarCursor(formatted, digitosAntes)
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
