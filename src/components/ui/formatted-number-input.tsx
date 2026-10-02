'use client'

import { useState, useEffect, useRef } from 'react'
import { formatEnteroMillones, formatNumero } from '@/lib/format'
import { contarDigitosAntes, posicionParaNDigitos } from '@/lib/formatted-input-cursor'

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) setTempVal(value)
  }, [value, focused])

  const displayVal = focused ? tempVal : (value ? formatEnteroMillones(Math.floor(parseFloat(value) || 0)) : '')

  return (
    <div className={`flex items-center gap-1 rounded-lg px-2 ${className}`} style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
      <span className="text-xs text-(--text-secondary) shrink-0 font-medium">$ </span>
      <input
        ref={inputRef}
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
          const cursorPos = e.target.selectionStart ?? e.target.value.length
          const digitosAntes = contarDigitosAntes(e.target.value, cursorPos)

          const digits = e.target.value.replace(/\D/g, '')
          if (!digits) {
            setTempVal('')
            onChange('')
            return
          }

          let formatted = ''
          if (digits.length <= 6) {
            formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
          } else {
            const millonesStr = digits.slice(0, digits.length - 6)
            const restoStr = digits.slice(digits.length - 6)
            const millonesFormateado = millonesStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
            const milesFormateado = restoStr.slice(0, 3) + '.' + restoStr.slice(3)
            formatted = `${millonesFormateado}'${milesFormateado}`
          }

          setTempVal(formatted)
          onChange(parseInt(digits, 10).toString())

          requestAnimationFrame(() => {
            const el = inputRef.current
            if (!el) return
            const pos = posicionParaNDigitos(formatted, digitosAntes)
            el.setSelectionRange(pos, pos)
          })
        }}
        onBlur={() => setFocused(false)}
        placeholder="0"
        style={{ textAlign: 'right', padding: '10px 2px', border: 'none', background: 'transparent', outline: 'none', color: (!value || (parseFloat(value) || 0) === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: (!value || (parseFloat(value) || 0) === 0) ? 0.45 : 1, fontSize: 14, width: '100%', minWidth: 0, fontWeight: 600 }}
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

  onBlur,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  unidad: string
  paso?: string
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [tempVal, setTempVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) setTempVal(value)
  }, [value, focused])

  const displayVal = focused ? tempVal : (value ? formatNumero(parseFloat(value) || 0) : '')

  return (
    <div className={`flex items-center gap-1.5 rounded-lg pl-2 pr-2.5 ${className}`} style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
      <input
        ref={inputRef}
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
          const cursorPos = e.target.selectionStart ?? e.target.value.length
          const digitosAntes = contarDigitosAntes(e.target.value, cursorPos)

          function restaurarCursor(formateado: string) {
            requestAnimationFrame(() => {
              const el = inputRef.current
              if (!el) return
              const pos = posicionParaNDigitos(formateado, digitosAntes)
              el.setSelectionRange(pos, pos)
            })
          }

          // Permitir dígitos y UNA sola coma o punto (lo convierte a coma)
          let raw = e.target.value.replace('.', ',').replace(/[^0-9,]/g, '')
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
            const formateado = formatNumero(intPart) + ','
            setTempVal(formateado)
            restaurarCursor(formateado)
            return
          }

          const partsClean = raw.split(',')
          const intPartStr = partsClean[0]
          const decPartStr = partsClean.length > 1 ? ',' + partsClean[1] : ''
          const formatted = intPartStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + decPartStr

          setTempVal(formatted)
          
          const cleanNum = raw.replace(',', '.')
          onChange(cleanNum)
          restaurarCursor(formatted)
        }}
        onBlur={() => {
          setFocused(false)
          onBlur?.()
        }}
        placeholder="0"
        style={{ textAlign: 'right', padding: '10px 2px', border: 'none', background: 'transparent', outline: 'none', color: (!value || (parseFloat(value.replace(',', '.')) || 0) === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: (!value || (parseFloat(value.replace(',', '.')) || 0) === 0) ? 0.45 : 1, fontSize: 14, width: '100%', minWidth: 0, flex: 1, fontWeight: 600 }}
      />
      <span className="text-xs text-(--text-secondary) shrink-0 font-medium whitespace-nowrap" style={{ opacity: (!value || (parseFloat(value.replace(',', '.')) || 0) === 0) ? 0.45 : 1 }}>{unidad}</span>
    </div>
  )
}

/**
 * Componente especializado para cantidad de insumos (ej. 0 metros, 1,5 metros, 0,3 metros):
 * - Permite escribir 0 o cualquier número sin forzar 1 ni borrarlo.
 * - Permite escribir decimales con coma (,) o punto (.), mostrándolos en formato estándar con coma.
 * - Permite dejar el campo vacío mientras se escribe sin auto-reemplazar a 0 en medio de la edición.
 * - Enfoque y salida suaves que normalizan a número válido (0 si quedó vacío).
 * - Muestra el 0 en gris inactivo atenuado (opacity-50 / text-secondary) y los números mayores a 0 en texto activo (text-primary font-semibold).
 * - Acepta value numérico o string y notifica onChange(number).
 */
export function InputCantidadInsumo({
  value,
  onChange,
  unidad,
  className = '',
}: {
  value: number | string
  onChange: (v: number) => void
  unidad?: string
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  const [texto, setTexto] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const numToStr = (n: number | string | undefined | null) => {
    if (n === null || n === undefined || n === '') return '0'
    const num = typeof n === 'string' ? parseFloat(n.replace(',', '.')) : n
    if (isNaN(num)) return '0'
    return String(num).replace('.', ',')
  }

  const numVal = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value
  const esCero = !numVal || isNaN(numVal) || numVal === 0

  useEffect(() => {
    if (!focused) {
      setTexto(numToStr(value))
    }
  }, [value, focused])

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all focus-within:border-[#00827C] focus-within:opacity-100 ${
        esCero
          ? 'border-(--border)  opacity-60'
          : 'border-(--border) bg-transparent opacity-100'
      } ${className}`}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={focused ? texto : numToStr(value)}
        onFocus={() => {
          setFocused(true)
          setTexto(numToStr(value))
        }}
        onChange={e => {
          // Aceptar dígitos y una sola coma o punto (convertido a coma)
          let raw = e.target.value.replace('.', ',').replace(/[^0-9,]/g, '')
          const parts = raw.split(',')
          if (parts.length > 2) {
            raw = parts[0] + ',' + parts.slice(1).join('')
          }

          setTexto(raw)

          if (raw === '' || raw === ',') {
            onChange(0)
            return
          }

          const parsed = parseFloat(raw.replace(',', '.'))
          if (!isNaN(parsed)) {
            onChange(parsed)
          }
        }}
        onBlur={() => {
          setFocused(false)
          if (texto === '' || texto === ',') {
            setTexto('0')
            onChange(0)
          } else {
            const parsed = parseFloat(texto.replace(',', '.'))
            const finalNum = isNaN(parsed) ? 0 : parsed
            setTexto(numToStr(finalNum))
            onChange(finalNum)
          }
        }}
        placeholder="0"
        className={`flex-1 min-w-[20px] text-right text-sm outline-hidden border-none p-0 bg-transparent transition-opacity ${
          esCero ? 'text-(--text-secondary) opacity-50 font-normal' : 'text-(--text-primary) font-semibold opacity-100'
        }`}
      />
      {unidad && (
        <span
          className={`text-xs shrink-0 font-medium whitespace-nowrap transition-opacity ${
            esCero ? 'text-(--text-secondary) opacity-50' : 'text-(--text-secondary) opacity-100'
          }`}
        >
          {unidad}
        </span>
      )}
    </div>
  )
}
