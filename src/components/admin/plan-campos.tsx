'use client'

import { useEffect, useState } from 'react'
import { Square, SquareCheck, ChevronUp, ChevronDown } from '@/components/ui/icons'
import { Bandera } from '@/components/ui/bandera'
import { formatearPrecioColombiano } from '@/lib/constants/pricing'

// paisCodigo: código ISO para <Bandera> (flag-icons SVG), no emoji — a
// pedido del usuario 2026-09-04, mismo componente ya usado en DPP/login.
export const MONEDAS = [
  { codigo: 'cop' as const, paisCodigo: 'co', label: 'COP', nombre: 'Peso colombiano', simbolo: '$' },
  { codigo: 'usd' as const, paisCodigo: 'us', label: 'USD', nombre: 'Dólar estadounidense', simbolo: '$' },
  { codigo: 'eur' as const, paisCodigo: 'eu', label: 'EUR', nombre: 'Euros', simbolo: '€' },
]

export function equivalenteMensual(anual: number): number {
  return Math.round((anual / 12) * 100) / 100
}

// Input para precios con formato colombiano:
// - Millones con comilla simple (')
// - Miles con punto (.)
// - Decimales con coma (,) si aplican
// Se formatea en tiempo real en una sola línea limpia y centrada con el símbolo $.
export function CampoPrecioFormateado({
  value,
  min = 0,
  step = 1000,
  onChange,
  fontSize = 14,
  fontWeight = 400,
  inputStyle,
}: {
  value: number | null | undefined
  min?: number
  step?: number
  onChange: (v: number) => void
  fontSize?: number
  fontWeight?: number | string
  inputStyle?: React.CSSProperties
}) {
  const [activo, setActivo] = useState(false)
  const [pressedUp, setPressedUp] = useState(false)
  const [pressedDown, setPressedDown] = useState(false)
  const [textoLocal, setTextoLocal] = useState<string>(() => formatearPrecioColombiano(value ?? 0))

  useEffect(() => {
    if (!activo) {
      setTextoLocal(formatearPrecioColombiano(value ?? 0))
    }
  }, [value, activo])

  const parsear = (str: string): number => {
    if (!str) return 0
    const limpio = str.replace(/'/g, '').replace(/\./g, '').replace(',', '.')
    const n = parseFloat(limpio)
    return isNaN(n) ? 0 : n
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      setTextoLocal('')
      onChange(0)
      return
    }

    // Si el usuario escribe una coma o punto al final para empezar los decimales
    if (raw.endsWith(',') || raw.endsWith('.')) {
      const parteEntera = raw.slice(0, -1)
      const form = formatearPrecioColombiano(parteEntera, false)
      setTextoLocal(`${form},`)
      onChange(parsear(parteEntera))
      return
    }

    const form = formatearPrecioColombiano(raw, true)
    setTextoLocal(form)
    onChange(Math.max(min, parsear(raw)))
  }

  const handleSubir = () => {
    const act = (typeof value === 'number' && !isNaN(value)) ? value : parsear(textoLocal)
    const nuevo = Math.round((act + step) * 100) / 100
    setTextoLocal(formatearPrecioColombiano(nuevo))
    onChange(nuevo)
  }

  const handleBajar = () => {
    const act = (typeof value === 'number' && !isNaN(value)) ? value : parsear(textoLocal)
    const nuevo = Math.max(min, Math.round((act - step) * 100) / 100)
    setTextoLocal(formatearPrecioColombiano(nuevo))
    onChange(nuevo)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setPressedUp(true)
      handleSubir()
      setTimeout(() => setPressedUp(false), 200)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setPressedDown(true)
      handleBajar()
      setTimeout(() => setPressedDown(false), 200)
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <input
        type="text"
        inputMode="decimal"
        value={textoLocal}
        placeholder="0"
        onChange={handleInputChange}
        onFocus={(e) => {
          setActivo(true)
          e.target.select()
        }}
        onBlur={() => {
          setActivo(false)
          setTextoLocal(formatearPrecioColombiano(value ?? 0))
        }}
        onKeyDown={handleKeyDown}
        className="input-numero-sutil"
        style={{
          width: '100%',
          fontSize,
          fontWeight,
          color: 'var(--text-primary)',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          paddingRight: activo ? 20 : 4,
          transition: 'padding 0.15s ease',
          ...inputStyle,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: activo ? 1 : 0,
          pointerEvents: activo ? 'auto' : 'none',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          zIndex: 2,
        }}
      >
        <button
          type="button"
          tabIndex={-1}
          // onMouseDown con preventDefault, no onClick a secas: sin esto, el
          // clic en el botón le quita el foco al input ANTES de que el clic
          // llegue a dispararse, "activo" pasa a false en el mismo instante
          // y pointerEvents se vuelve 'none' — el botón se ve pero nunca
          // reacciona al clic (bug real reportado, "las flechas no funcionan").
          onMouseDown={(e) => { e.preventDefault(); handleSubir() }}
          style={{
            background: 'none',
            border: 'none',
            padding: '1px 2px',
            cursor: 'pointer',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pressedUp ? 'var(--color-brand)' : 'var(--text-secondary)',
            transform: pressedUp ? 'scale(1.25)' : 'scale(1)',
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          className="hover:text-[var(--color-brand)]"
          title="Aumentar"
        >
          <ChevronUp size={fontSize > 20 ? 14 : 11} sinAnimacion />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); handleBajar() }}
          style={{
            background: 'none',
            border: 'none',
            padding: '1px 2px',
            cursor: 'pointer',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pressedDown ? 'var(--color-brand)' : 'var(--text-secondary)',
            transform: pressedDown ? 'scale(1.25)' : 'scale(1)',
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          className="hover:text-[var(--color-brand)]"
          title="Disminuir"
        >
          <ChevronDown size={fontSize > 20 ? 14 : 11} sinAnimacion />
        </button>
      </div>
    </div>
  )
}

// Input numérico para límites (cantidades de personas, cálculos, etc.)
function CampoNumeroEstetico({
  value,
  placeholder = '0',
  min = 0,
  step = 1,
  onChange,
  style,
  inputStyle,
  fontSize = 14,
  fontWeight = 400,
}: {
  value: number | string
  placeholder?: string
  min?: number
  step?: number
  onChange: (v: number) => void
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
  fontSize?: number
  fontWeight?: number | string
}) {
  const [activo, setActivo] = useState(false)
  const [pressedUp, setPressedUp] = useState(false)
  const [pressedDown, setPressedDown] = useState(false)

  const handleSubir = () => {
    const act = Number(value) || 0
    onChange(Math.round((act + step) * 100) / 100)
  }

  const handleBajar = () => {
    const act = Number(value) || 0
    onChange(Math.max(min, Math.round((act - step) * 100) / 100))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      setPressedUp(true)
      setTimeout(() => setPressedUp(false), 200)
    } else if (e.key === 'ArrowDown') {
      setPressedDown(true)
      setTimeout(() => setPressedDown(false), 200)
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...style,
      }}
    >
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        onFocus={(e) => {
          setActivo(true)
          e.target.select()
        }}
        onBlur={() => setActivo(false)}
        onKeyDown={handleKeyDown}
        className="input-numero-sutil"
        style={{
          width: '100%',
          fontSize,
          fontWeight,
          color: 'var(--text-primary)',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          paddingRight: activo ? 20 : 4,
          transition: 'padding 0.15s ease',
          ...inputStyle,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: activo ? 1 : 0,
          pointerEvents: activo ? 'auto' : 'none',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          zIndex: 2,
        }}
      >
        <button
          type="button"
          tabIndex={-1}
          // onMouseDown con preventDefault, no onClick a secas: sin esto, el
          // clic en el botón le quita el foco al input ANTES de que el clic
          // llegue a dispararse, "activo" pasa a false en el mismo instante
          // y pointerEvents se vuelve 'none' — el botón se ve pero nunca
          // reacciona al clic (bug real reportado, "las flechas no funcionan").
          onMouseDown={(e) => { e.preventDefault(); handleSubir() }}
          style={{
            background: 'none',
            border: 'none',
            padding: '1px 2px',
            cursor: 'pointer',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pressedUp ? 'var(--color-brand)' : 'var(--text-secondary)',
            transform: pressedUp ? 'scale(1.25)' : 'scale(1)',
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          className="hover:text-[var(--color-brand)]"
          title="Aumentar"
        >
          <ChevronUp size={fontSize > 20 ? 14 : 11} sinAnimacion />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); handleBajar() }}
          style={{
            background: 'none',
            border: 'none',
            padding: '1px 2px',
            cursor: 'pointer',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pressedDown ? 'var(--color-brand)' : 'var(--text-secondary)',
            transform: pressedDown ? 'scale(1.25)' : 'scale(1)',
            lineHeight: 1,
            transition: 'all 0.15s ease',
          }}
          className="hover:text-[var(--color-brand)]"
          title="Disminuir"
        >
          <ChevronDown size={fontSize > 20 ? 14 : 11} sinAnimacion />
        </button>
      </div>
    </div>
  )
}

// Número grande para límites, con controles pulidos emergentes en hover/focus
export function CampoLimiteGrande({ icono: Icono, label, valor, onChange }: {
  icono: React.ElementType; label: string; valor: number | null; onChange: (v: number | null) => void
}) {
  const ilimitado = valor === null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icono size={15} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      {ilimitado ? (
        <div style={{ fontSize: 30, fontWeight: 300, color: 'var(--text-secondary)', lineHeight: '38px' }}>∞</div>
      ) : (
        <CampoNumeroEstetico
          value={valor === 0 ? '' : valor}
          placeholder="0"
          min={0}
          step={1}
          fontSize={30}
          fontWeight={300}
          onChange={(v) => onChange(v)}
          inputStyle={{
            borderBottom: '1px solid var(--border)',
            padding: '2px 0',
          }}
        />
      )}
      <button
        type="button"
        onClick={() => onChange(ilimitado ? 0 : null)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {ilimitado ? <SquareCheck size={13} sinAnimacion /> : <Square size={13} sinAnimacion />} Ilimitado
      </button>
    </div>
  )
}

// Una tarjeta por moneda: bandera + código + nombre, luego Mensual, Anual
// y Equivalente Mensual apilados con controles numéricos limpios y estéticos.
export function BloqueMoneda({
  moneda,
  mensual,
  anual,
  equivalenteMensual,
  onMensualChange,
  onAnualChange,
  onEquivalenteMensualChange,
}: {
  moneda: typeof MONEDAS[number]
  mensual: number
  anual: number
  equivalenteMensual?: number | null
  onMensualChange: (v: number) => void
  onAnualChange: (v: number) => void
  onEquivalenteMensualChange?: (v: number | null) => void
}) {
  const step = moneda.codigo === 'cop' ? 1000 : 1
  const anualCalc = anual || (mensual * 10)
  const bruto = anualCalc / 12
  const automatico = moneda.codigo === 'cop' ? Math.floor(bruto / 10000) * 10000 : Math.floor(bruto)
  const valorEquivalente = equivalenteMensual ?? automatico
  
  // Cálculo exacto formateado: millones con ', miles con ., centavos con coma
  const calculoFormateado = formatearPrecioColombiano(bruto, true)
  const idxComa = calculoFormateado.indexOf(',')
  const calculoEntero = idxComa !== -1 ? calculoFormateado.slice(0, idxComa) : calculoFormateado
  const calculoDecimal = idxComa !== -1 ? calculoFormateado.slice(idxComa) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Bandera codigo={moneda.paisCodigo} alt={moneda.label} style={{ width: 28, height: 19 }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{moneda.label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{moneda.nombre}</span>
      </div>

      {/* 1. Mensual */}
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Mensual</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{moneda.simbolo}</span>
          <CampoPrecioFormateado
            value={mensual}
            min={0}
            step={step}
            fontSize={14}
            onChange={onMensualChange}
            inputStyle={{ padding: '9px 0' }}
          />
        </div>
      </div>

      {/* 2. Anual */}
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Anual</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{moneda.simbolo}</span>
          <CampoPrecioFormateado
            value={anual}
            min={0}
            step={step}
            fontSize={14}
            onChange={onAnualChange}
            inputStyle={{ padding: '9px 0' }}
          />
        </div>
      </div>

      {/* 3. Equivalente Mensual: Título -> Cálculo (anual/12) -> Input editable (redondeado) */}
      {onEquivalenteMensualChange ? (
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
            Equivalente Mensual
          </span>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Cálculo (anual/12): {moneda.simbolo}{calculoEntero}
            {calculoDecimal && (
              <span style={{ fontSize: '0.8em', fontWeight: 'inherit' }}>{calculoDecimal}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{moneda.simbolo}</span>
            <CampoPrecioFormateado
              value={valorEquivalente}
              min={0}
              step={step}
              fontSize={14}
              onChange={(v) => onEquivalenteMensualChange(v)}
              inputStyle={{ padding: '9px 0' }}
            />
          </div>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
          ≈ {moneda.simbolo}{formatearPrecioColombiano(automatico, false)} {moneda.label}/mes
        </span>
      )}
    </div>
  )
}
