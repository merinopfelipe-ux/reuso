'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Leaf, Droplet as Drop, TreeDeciduous as Tree, Car, ShowerHead as Shower, Loader2 as CircleNotch, CheckCircle, RotateCcw as ArrowCounterClockwise, Medal, Image as ImageIcon, IdCard as IdentificationCard } from '@/components/ui/icons'
import { factorCo2PorKg } from '@/lib/calculos/co2'
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
  equivalencias: { arboles: number; coches: number; duchas: number; litros: number }
}

// ── Cálculo local en tiempo real ─────────────────────────────────────────────

function calcularTotalesKg(
  pesos: Record<string, number>,
  allItems: Item[]
): { co2: number; agua: number; equivalencias: { arboles: number; coches: number; duchas: number; litros: number } } {
  let co2 = 0
  for (const item of allItems) {
    const pesoInput = pesos[item.id] ?? 0
    if (pesoInput > 0) {
      co2 += pesoInput * factorCo2PorKg(item.co2_por_unidad, item.peso_kg)
    }
  }
  const duchas = co2 / 2.0
  const litros = duchas * 90
  return {
    co2,
    agua: litros,
    equivalencias: {
      arboles: Math.round(co2 / 8.0),
      coches: parseFloat((co2 / 4600).toFixed(3)),
      duchas: Math.round(duchas),
      litros: Math.round(litros),
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
  const arbolesAnim = useAnimatedNumber(totales.equivalencias.arboles)
  const cochesAnim = useAnimatedNumber(totales.equivalencias.coches)

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
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar.')
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
  }, [pesos, onGuardado])

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
                  fontSize: 10, fontWeight: 700, color: BRAND,
                  background: BG_LIGHT, borderRadius: 100,
                  padding: '2px 8px', display: 'inline-block',
                }}>
                  {factorKg.toFixed(3)} kg CO₂/kg
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
                  = {subtotalCo2.toFixed(3)} kg CO₂ evitados
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
            <span style={{ fontSize: 10, color: TEXT_MED }}>Puedes pegar imágenes</span>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 14,
          textAlign: 'center',
        }}>
          <TotalCol
            icono={<Leaf size={14} color={BRAND} />}
            valor={co2Anim.toFixed(2)}
            label="kg CO₂"
            activo={hayItems}
          />
          <TotalCol
            icono={<Drop size={14} color="#59A6E4" />}
            valor={aguaAnim.toFixed(0)}
            label="litros agua"
            activo={hayItems}
          />
          <TotalCol
            icono={<Tree size={14} color="#38B98E" />}
            valor={String(Math.round(arbolesAnim))}
            label="árboles"
            activo={hayItems}
          />
          <TotalCol
            icono={<Car size={14} color="#AD7C43" />}
            valor={cochesAnim.toFixed(3)}
            label="coches/año"
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
      <p style={{ fontSize: 10, color: TEXT_MED, margin: 0 }}>{label}</p>
    </div>
  )
}

function ResultadoPanel({ resultado, onReset }: {
  resultado: ResultadoGuardado
  rol: Rol
  onReset: () => void
}) {
  const [generandoCert, setGenerandoCert] = useState(false)
  const [certError, setCertError] = useState<string | null>(null)
  const [showModalDpp, setShowModalDpp] = useState(false)
  const [activosDpp, setActivosDpp] = useState<{ id: string; nombre: string; codigo_dpp: string }[]>([])
  const [loadingDpp, setLoadingDpp] = useState(false)
  const [activoSeleccionado, setActivoSeleccionado] = useState<string | null>(null)
  const [asociando, setAsociando] = useState(false)

  async function abrirModalDpp() {
    setLoadingDpp(true)
    try {
      const res = await fetch('/api/dpp/activos?limit=50')
      const data = await res.json() as { data?: { id: string; nombre: string; codigo_dpp: string }[] }
      setActivosDpp(res.ok ? (data.data ?? []) : [])
    } catch { setActivosDpp([]) }
    setLoadingDpp(false)
    setShowModalDpp(true)  // abre después de tener los datos
  }

  async function asociarADpp() {
    if (!activoSeleccionado) return
    setAsociando(true)
    try {
      await fetch(`/api/dpp/activos/${activoSeleccionado}/ciclo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operacion_realizada: 'Cálculo CO₂ registrado en Calculadora de Reúso',
          fecha_inicio: new Date().toISOString().slice(0, 10),
          distancia_transporte_km: 0,
        }),
      })
    } catch { /* silencioso */ }
    setAsociando(false)
    setShowModalDpp(false)
    setActivoSeleccionado(null)
  }

  const handleCertificado = async () => {
    setGenerandoCert(true)
    setCertError(null)
    try {
      const res = await fetch('/api/certificados/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'certificado' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar.')
      if (data.pdf_url) window.open(data.pdf_url, '_blank')
    } catch (e) {
      setCertError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setGenerandoCert(false)
    }
  }

  const eqs = resultado.equivalencias

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
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          CO₂ evitado
        </p>
        <p style={{ fontSize: 36, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
          {resultado.co2_total.toFixed(2)} kg
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          {resultado.agua_total.toFixed(0)} litros de agua ahorrados
        </p>
      </div>

      {/* Equivalencias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { icono: <Tree size={20} color={BRAND} />, valor: eqs.arboles, label: 'árboles plantados' },
          { icono: <Car size={20} color="#AD7C43" />, valor: eqs.coches, label: 'vehículos retirados' },
          { icono: <Shower size={20} color="#59A6E4" />, valor: eqs.duchas, label: 'duchas de 10 min' },
          { icono: <Drop size={20} color="#38B98E" />, valor: eqs.litros.toLocaleString('es-CO'), label: 'litros de agua' },
        ].map((eq, i) => (
          <div key={i} style={{ background: BG_LIGHT, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{eq.icono}</div>
            <p style={{ fontSize: 20, fontWeight: 700, color: TEXT_DARK, margin: '0 0 2px' }}>
              {typeof eq.valor === 'number' ? eq.valor.toLocaleString('es-CO') : eq.valor}
            </p>
            <p style={{ fontSize: 11, color: TEXT_MED, margin: 0 }}>{eq.label}</p>
          </div>
        ))}
      </div>

      {certError && (
        <p style={{ fontSize: 12, color: '#FF5E4B', textAlign: 'center', marginBottom: 12 }}>{certError}</p>
      )}

      {/* Acciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={handleCertificado}
          disabled={generandoCert}
          style={{
            padding: '12px 20px', borderRadius: 10, border: 'none',
            background: BRAND, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: generandoCert ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: generandoCert ? 0.7 : 1,
          }}
          className={generandoCert ? '' : 'hover-medal hover-press'}
        >
          {generandoCert
            ? <><CircleNotch size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</>
            : <><Medal size={16} /> Generar certificado</>}
        </button>

        <button
          onClick={abrirModalDpp}
          style={{
            padding: '10px 20px', borderRadius: 10,
            border: '1.5px solid rgba(0,130,124,0.40)',
            background: 'transparent', color: '#00827C',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: "'Open Sans', sans-serif",
          }}
          className="hover-pop hover-press"
        >
          <IdentificationCard size={16} />
          Asocia a un Pasaporte DPP
        </button>

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

      {showModalDpp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Open Sans', sans-serif" }}>
              Asocia este cálculo a un activo circular
            </h3>
            {loadingDpp ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Cargando activos...</p>
            ) : activosDpp.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Primero registra un activo en Pasaportes DPP</p>
                <a href="/empresa/dpp" style={{ color: '#00827C', fontWeight: 600, fontSize: 14 }}>Ir a Pasaportes DPP →</a>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {activosDpp.map(a => (
                    <button key={a.id} onClick={() => setActivoSeleccionado(a.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 10,
                        border: `2px solid ${activoSeleccionado === a.id ? '#00827C' : 'var(--border)'}`,
                        background: activoSeleccionado === a.id ? 'rgba(0,130,124,0.08)' : 'var(--bg-card)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        fontFamily: "'Open Sans', sans-serif",
                      }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{a.nombre}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{a.codigo_dpp}</p>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowModalDpp(false); setActivoSeleccionado(null) }}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif" }}>
                    Cancelar
                  </button>
                  <button onClick={asociarADpp} disabled={!activoSeleccionado || asociando}
                    style={{ background: '#00827C', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: !activoSeleccionado || asociando ? 0.6 : 1, fontFamily: "'Open Sans', sans-serif" }}>
                    {asociando ? 'Asociando...' : 'Asocia el cálculo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
