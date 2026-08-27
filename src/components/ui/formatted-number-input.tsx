'use client'

import { useState, useEffect } from 'react'
import { formatEnteroMillones, formatNumero } from '@/lib/format'

/**
 * Componente de entrada para precios con formato numérico del proyecto:
 * - $ a la izquierda separado con espacio ($ 1.500)
 * - Números alineados a la derecha
 * - Agrupación de miles con punto (.) y millones con apóstrofo (')
 * - Coma (,) para decimales
 */
export function InputPrecio({
  value,
  onChange,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [tempVal, setTempVal] = useState(value)

  useEffect(() => {
    if (!focused) setTempVal(value)
  }, [value, focused])

  const displayVal = focused ? tempVal : (value ? formatEnteroMillones(Math.floor(parseFloat(value) || 0)) : '')

  return (
    <div className={`flex items-center gap-1 rounded-lg px-2 ${className}`} style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
      <span className="text-xs text-[var(--text-secondary)] flex-shrink-0 font-medium">$ </span>
      <input
        type="text"
        inputMode="decimal"
        value={displayVal}
        onFocus={() => { 
          setFocused(true)
          if (value) {
            setTempVal(formatEnteroMillones(Math.floor(parseFloat(value) || 0)))
          }
        }}
        onChange={e => {
          const digits = e.target.value.replace(/\D/g, '')
          if (!digits) {
            setTempVal('')
            onChange('')
            return
          }
          const formatted = formatEnteroMillones(parseInt(digits, 10))
          setTempVal(formatted)
          onChange(digits)
        }}
        onBlur={() => setFocused(false)}
        placeholder="0"
        style={{ textAlign: 'right', padding: '10px 2px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: 14, width: '100%', minWidth: 0, fontWeight: 600 }}
      />
    </div>
  )
}

/**
 * Componente de entrada para cantidades y dimensiones con unidad:
 * - Números alineados a la derecha
 * - Formato de miles (.), millones ('), decimales (,) con redondeo constante hacia arriba
 * - Unidad a la derecha separada con espacio (ej. 34 kg, 3,5 kg CO₂)
 */
export function InputConUnidad({
  value,
  onChange,
  unidad,

  className = '',
}: {
  value: string
  onChange: (v: string) => void
  unidad: string
  paso?: string

  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [tempVal, setTempVal] = useState(value)

  useEffect(() => {
    if (!focused) setTempVal(value)
  }, [value, focused])

  const displayVal = focused ? tempVal : (value ? formatNumero(parseFloat(value) || 0) : '')

  return (
    <div className={`flex items-center gap-1.5 rounded-lg pl-2 pr-2.5 ${className}`} style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
      <input
        type="text"
        inputMode="decimal"
        value={displayVal}
        onFocus={() => {
          setFocused(true)
          if (value) {
            setTempVal(formatNumero(parseFloat(value) || 0))
          }
        }}
        onChange={e => {
          // Permitir dígitos y UNA sola coma
          let raw = e.target.value.replace(/[^0-9,]/g, '')
          const parts = raw.split(',')
          if (parts.length > 2) {
            raw = parts[0] + ',' + parts.slice(1).join('')
          }
          
          if (!raw) {
            setTempVal('')
            onChange('')
            return
          }

          if (raw.endsWith(',')) {
            // Si el usuario acaba de escribir una coma, la dejamos en el UI pero no actualizamos el padre todavía
            const intPart = parseInt(raw.slice(0, -1) || '0', 10)
            setTempVal(formatNumero(intPart) + ',')
            return
          }

          // Convertir "1,5" a float
          const cleanNum = raw.replace(',', '.')
          const num = parseFloat(cleanNum)
          
          // Formatear en el UI pero respetando si el usuario está escribiendo el decimal
          const formatted = formatNumero(num)
          setTempVal(formatted)
          onChange(cleanNum)
        }}
        onBlur={() => setFocused(false)}
        placeholder="0"
        style={{ textAlign: 'right', padding: '10px 2px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: 14, width: '100%', minWidth: 0, flex: 1, fontWeight: 600 }}
      />
      <span className="text-xs text-[var(--text-secondary)] flex-shrink-0 font-medium">{unidad}</span>
    </div>
  )
}
