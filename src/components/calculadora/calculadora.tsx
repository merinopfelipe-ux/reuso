'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Leaf, Droplet as Drop, Loader2 as CircleNotch, CheckCircle, RotateCcw as ArrowCounterClockwise, Image as ImageIcon } from '@/components/ui/icons'
import { factorCo2PorKg, factorAguaPorKg, PARAM_EQUIV } from '@/lib/calculos/co2'
import { useToast } from '@/components/toast-provider'
import type { Categoria, Item, Rol } from '@/types'

interface CategoriaConItems extends Categoria {
  items: Item[]
}

interface Props {
  categorias: CategoriaConItems[]
  rol: Rol
  onGuardado?: () => void
}

interface ResultadoGuardado {
  id: string
  co2_total: number
  agua_total: number
  equivalencias: { arboles: number; duchas: number; litros: number }
}

// ── Cálculo local en tiempo real ─────────────────────────────────────────────

function calcularTotalesKg(
  pesos: Record<string, number>,
  allItems: Item[]
): { co2: number; agua: number; equivalencias: { arboles: number; duchas: number; litros: number } } {
  let co2 = 0
  let agua = 0
  for (const item of allItems) {
    const pesoInput = pesos[item.id] ?? 0
    if (pesoInput > 0) {
      co2 += pesoInput * factorCo2PorKg(item.co2_por_unidad, item.peso_kg)
      agua += pesoInput * factorAguaPorKg(item.agua_por_unidad, item.peso_kg)
    }
  }
  return {
    co2,
    agua,
    equivalencias: {
      arboles: Math.round(co2 / (PARAM_EQUIV.CO2_arbol_anual_kg / 365)),
      duchas: Math.round(agua / PARAM_EQUIV.litros_ducha_5min),
      litros: Math.round(agua),
    },
  }
}

// ── Animación de número ──────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 400) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef({ from: target, start: 0 })

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const from = display
    startRef.current = { from, start: performance.now() }

    function step(now: number) {
      const elapsed = now - startRef.current.start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (target - from) * eased
      setDisplay(current)
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return display
}

const BRAND = '#00827C'
const BG_LIGHT = 'var(--bg-integrated)'
const TEXT_DARK = 'var(--text-primary)'
const TEXT_MED = 'var(--text-secondary)'
const BORDER = 'var(--border)'

// ── Componente principal ─────────────────────────────────────────────────────

export function Calculadora({ categorias, rol, onGuardado }: Props) {
  const { toast } = useToast()
  const [tabActivo, setTabActivo] = useState(categorias[0]?.id ?? '')
  const [pesos, setPesos] = useState<Record<string, number>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoGuardado | null>(null)
  const descripcionRef = useRef<HTMLDivElement>(null)

  const allItems = useMemo(() => categorias.flatMap((c) => c.items), [categorias])
  const categoriaActiva = categorias.find((c) => c.id === tabActivo)

  const totales = useMemo(() => calcularTotalesKg(pesos, allItems), [pesos, allItems])

  const co2Anim = useAnimatedNumber(totales.co2)
  const aguaAnim = useAnimatedNumber(totales.agua)

  const hayItems = useMemo(() => Object.values(pesos).some((v) => v > 0), [pesos])

  const setPeso = useCallback((itemId: string, valor: number) => {
    setPesos((prev) => {
      const next = { ...prev, [itemId]: Math.max(0, valor) }
      if (next[itemId] === 0) delete next[itemId]
      return next
    })
  }, [])

  // ── Paste de imágenes en el campo descripción ──────────────────────────────
  const handleDescripcionPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items ?? [])
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = (ev) => {
          const src = ev.target?.result as string
          document.execCommand('insertHTML', false,
            `<img src="${src}" style="max-width:100%;border-radius:8px;margin:4px 0;display:block;" />`
          )
        }
        reader.readAsDataURL(blob)
        return
      }
    }
  }, [])

  const isSubmittingRef = useRef(false)

  const handleGuardar = useCallback(async () => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setGuardando(true)
    setError(null)

    const items = Object.entries(pesos)
      .filter(([, peso]) => peso > 0)
      .map(([id, peso_kg]) => ({ id, peso_kg }))

    const descripcion_html = descripcionRef.current?.innerHTML?.trim() || undefined

    try {
      const res = await fetch('/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, descripcion_html }),
      })
      const data = await res.json()
      if (!res.ok) {
        // 429 = tope de plan real: además del mensaje inline, un toast con
        // el enlace de WhatsApp para ampliar el plan.
        if (res.status === 429) toast.limite(data.error ?? 'Llegaste al límite de tu plan.')
        throw new Error(data.error ?? 'Error al guardar.')
      }
      setResultado(data)
      onGuardado?.()
    } catch (e) {
      if (e instanceof TypeError) {
        setError('Sin conexión. Verifica tu internet e intenta de nuevo.')
      } else {
        setError(e instanceof Error ? e.message : 'Error inesperado.')
      }
    } finally {
      setGuardando(false)
      isSubmittingRef.current = false
    }
  }, [pesos, onGuardado, toast])

  const handleReset = useCallback(() => {
    setPesos({})
    setResultado(null)
    setError(null)
    if (descripcionRef.current) descripcionRef.current.innerHTML = ''
  }, [])

  // ── POST-GUARDADO ──────────────────────────────────────────────────────────
  if (resultado) {
    return <ResultadoPanel resultado={resultado} rol={rol} onReset={handleReset} />
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 24 }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 0', borderBottom: `1px solid ${BORDER}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT_DARK, margin: '0 0 4px' }}>
          Registra objetos reutilizados
        </h2>
        <p style={{ fontSize: 13, color: TEXT_MED, margin: '0 0 16px' }}>
          Ingresa el peso en kg de los materiales que reutilizaste y calcula tu impacto ambiental.
        </p>

        {/* Tabs de categorías */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 0, scrollbarWidth: 'none' }}>
          {categorias.map((cat) => {
            const activo = cat.id === tabActivo
            return (
              <button
                key={cat.id}
                onClick={() => setTabActivo(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: '7px 16px',
                  borderRadius: 100,
                  border: activo ? 'none' : `1px solid ${BORDER}`,
                  background: activo ? BRAND : BG_LIGHT,
                  color: activo ? '#fff' : TEXT_MED,
                  fontWeight: activo ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.nombre}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de items - input en kg */}
      <div style={{
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
      }}>
        {(categoriaActiva?.items ?? []).map((item) => {
          const pesoInput = pesos[item.id] ?? 0
          const seleccionado = pesoInput > 0
          const factorKg = factorCo2PorKg(item.co2_por_unidad, item.peso_kg)
          const subtotalCo2 = pesoInput * factorKg

          return (
            <div
              key={item.id}
              style={{
                border: seleccionado ? `2px solid ${BRAND}` : `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '14px 16px',
                background: seleccionado ? `rgba(0,130,124,0.04)` : 'var(--bg-card)',
                transition: 'all 0.2s',
              }}
            >
              {/* Nombre + factor CO₂/kg */}
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK, margin: '0 0 4px', lineHeight: 1.3 }}>
                  {item.nombre}
                </p>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: BRAND,
                  background: BG_LIGHT, borderRadius: 100,
                  padding: '2px 8px', display: 'inline-block',
                }}>
                  {factorKg.toFixed(3)} kg CO₂ eq/kg
                </span>
              </div>

              {/* Input kg */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={pesoInput === 0 ? '' : pesoInput}
                  placeholder="0.0"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setPeso(item.id, isNaN(v) ? 0 : v)
                  }}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    border: `1px solid ${seleccionado ? BRAND : BORDER}`,
                    borderRadius: 8,
                    padding: '7px 8px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: TEXT_DARK,
                    background: 'var(--bg-input)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MED, flexShrink: 0 }}>kg</span>
              </div>

              {/* Subtotal si tiene peso */}
              {seleccionado && (
                <p style={{ textAlign: 'center', fontSize: 11, color: BRAND, fontWeight: 600, margin: '8px 0 0' }}>
                  = {subtotalCo2.toFixed(3)} kg CO₂ eq evitados
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Campo descripción con rich text + paste de imágenes */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_MED }}>
            Descripción (opcional)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ImageIcon size={11} color={TEXT_MED} />
            <span style={{ fontSize: 12, color: TEXT_MED }}>Puedes pegar imágenes</span>
          </div>
        </div>
        <div
          ref={descripcionRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={handleDescripcionPaste}
          data-placeholder="Describe los objetos reutilizados. Puedes pegar fotos directamente aquí..."
          style={{
            minHeight: 80,
            maxHeight: 320,
            overflowY: 'auto',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            fontSize: 13,
            color: TEXT_DARK,
            lineHeight: 1.6,
            outline: 'none',
            background: 'var(--bg-input)',
            transition: 'border-color 0.2s',
            userSelect: 'text',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = BRAND }}
          onBlur={(e) => { e.currentTarget.style.borderColor = BORDER }}
        />
      </div>

      {/* Barra de totales sticky */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 10,
        background: 'var(--bg-card)',
        borderTop: `1px solid ${BORDER}`,
        padding: '14px 20px',
        boxShadow: '0 -4px 16px rgba(0,130,124,0.08)',
      }}>
        {error && (
          <p style={{ fontSize: 12, color: '#FF5E4B', marginBottom: 8, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Totales en tiempo real */}
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{
          gap: 8,
          marginBottom: 14,
          textAlign: 'center',
        }}>
          <TotalCol
            icono={<Leaf size={14} color={BRAND} />}
            valor={co2Anim.toFixed(2)}
            label="kg CO₂ eq"
            activo={hayItems}
          />
          <TotalCol
            icono={<Drop size={14} color="#59A6E4" />}
            valor={aguaAnim.toFixed(0)}
            label="litros agua"
            activo={hayItems}
          />
        </div>

        <button
          onClick={handleGuardar}
          disabled={!hayItems || guardando}
          style={{
            width: '100%', padding: '12px 20px',
            borderRadius: 10, border: 'none',
            background: hayItems && !guardando ? BRAND : BG_LIGHT,
            color: hayItems && !guardando ? '#fff' : TEXT_MED,
            fontSize: 15, fontWeight: 700,
            cursor: hayItems && !guardando ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {guardando ? (
            <><CircleNotch size={18} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
          ) : (
            'Guardar cálculo'
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #7FA8A5;
          pointer-events: none;
        }
      `}} />
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function TotalCol({ icono, valor, label, activo }: {
  icono: React.ReactNode
  valor: string
  label: string
  activo: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>{icono}</div>
      <p style={{
        fontSize: 16, fontWeight: 700,
        color: activo ? TEXT_DARK : TEXT_MED,
        margin: 0, lineHeight: 1.2,
        transition: 'color 0.3s',
      }}>
        {valor}
      </p>
      <p style={{ fontSize: 12, color: TEXT_MED, margin: 0 }}>{label}</p>
    </div>
  )
}

function ResultadoPanel({ resultado, onReset }: {
  resultado: ResultadoGuardado
  rol: Rol
  onReset: () => void
}) {
  return (
    <div style={{ padding: 24 }}>
      {/* Celebración */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `rgba(0,130,124,0.1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <CheckCircle size={32} color={BRAND} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT_DARK, margin: '0 0 6px' }}>
          ¡Cálculo guardado!
        </h2>
        <p style={{ fontSize: 13, color: TEXT_MED, margin: 0 }}>
          Tu impacto ambiental ha sido registrado correctamente.
        </p>
      </div>

      {/* CO₂ principal */}
      <div style={{
        background: BRAND, borderRadius: 16, padding: '20px 24px',
        textAlign: 'center', marginBottom: 16,
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 4px' }}>
          CO₂ eq evitado
        </p>
        <p style={{ fontSize: 36, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
          {resultado.co2_total.toFixed(2)} kg
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          {resultado.agua_total.toFixed(0)} litros de agua ahorrados
        </p>
      </div>


      {/* Acciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onReset}
          style={{
            padding: '12px 20px', borderRadius: 10,
            border: `1px solid ${BORDER}`,
            background: 'transparent', color: TEXT_DARK,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          className="hover-spin hover-press"
        >
          <ArrowCounterClockwise size={16} /> Calcular más objetos
        </button>

        <button
          onClick={() => document.getElementById('historial-calculos')?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            padding: '10px 20px', borderRadius: 10,
            border: 'none', background: 'transparent',
            color: TEXT_MED, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Ver mi historial ↓
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
    </div>
  )
}
