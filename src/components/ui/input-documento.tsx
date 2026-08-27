'use client'

import { useState, useEffect } from 'react'

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
  required
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  required?: boolean
}) {
  const [displayVal, setDisplayVal] = useState('')

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
      type="text"
      inputMode="numeric"
      value={displayVal}
      required={required}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, '')
        const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        setDisplayVal(formatted)
        onChange(formatted)
      }}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:border-[var(--color-brand)] ${className}`}
      style={{
        background: 'var(--surface, var(--bg-input))',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
        ...style
      }}
    />
  )
}
