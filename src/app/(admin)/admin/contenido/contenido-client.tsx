'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Save as FloppyDisk, CircleHelp as Question, Tag, Plus, Trash, Pencil, GripVertical } from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { WA_NUMBER } from '@/lib/constants/contacto'
import { PreciosTab } from './precios-tab'

const C = {
  brand: 'var(--color-brand)', dark: 'var(--text-primary)', mid: 'var(--text-secondary)',
  border: 'var(--border)', light: 'var(--bg-hover)',
}

type ContenidoRow = { clave: string; valor_json: Record<string, unknown>; updated_at: string }

type Props = { contenido: ContenidoRow[] }

const DEFAULTS: Record<string, Record<string, unknown>> = {
  whatsapp: { numero: WA_NUMBER },
}

// Hero y Estadísticas se quitaron de esta pantalla a pedido del usuario
// 2026-09-04 — la pestaña "Precios" (antes la página /admin/planes
// completa) ocupa su lugar, entre WhatsApp y FAQ.
const TABS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: WhatsappLogo },
  { id: 'precios', label: 'Precios', icon: Tag },
  { id: 'faq', label: 'FAQ', icon: Question },
]

type FaqItem = { pregunta: string; respuesta: string }

// Crece con el contenido, nunca activa scroll interno — a pedido del
// usuario 2026-09-04 ("no activemos el scroll"). Sin librería nueva: solo
// recalcula la altura al alto real del contenido en cada cambio.
function TextareaAutoAjustable({ value, onChange, style }: {
  value: string; onChange: (v: string) => void; style: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${ref.current.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...style, overflow: 'hidden', resize: 'none' }}
    />
  )
}

export function ContenidoClient({ contenido }: Props) {
  const [tab, setTab] = useState('whatsapp')
  const [, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  function getVal(clave: string): Record<string, unknown> {
    const row = contenido.find(r => r.clave === clave)
    return (row?.valor_json as Record<string, unknown>) ?? DEFAULTS[clave] ?? {}
  }

  // WhatsApp state
  const [waNumero, setWaNumero] = useState((getVal('whatsapp').numero as string) ?? WA_NUMBER)

  // FAQ state — colapsada por defecto (solo pregunta + lápiz/caneca), se
  // expande a los campos editables al tocar el lápiz. Arrastrar con
  // GripVertical reordena, mismo patrón ya usado para las etapas del
  // embudo en sales-dashboard.tsx (sin librería de drag and drop nueva).
  const faqInit = getVal('faq')
  const [faqItems, setFaqItems] = useState<FaqItem[]>((faqInit.items as FaqItem[]) ?? [])
  const [newFaq, setNewFaq] = useState<FaqItem>({ pregunta: '', respuesta: '' })
  const [faqExpandidos, setFaqExpandidos] = useState<Set<number>>(new Set())
  const [faqDragIndex, setFaqDragIndex] = useState<number | null>(null)
  const [mostrarNuevaFaq, setMostrarNuevaFaq] = useState(false)

  function toggleFaqExpandido(i: number) {
    setFaqExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  function moverFaq(de: number, a: number) {
    setFaqItems(prev => {
      const lista = [...prev]
      const [movida] = lista.splice(de, 1)
      lista.splice(a, 0, movida)
      return lista
    })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function guardar(clave: string, valor_json: Record<string, unknown>) {
    const res = await fetch('/api/admin/contenido', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave, valor_json }),
    })
    if (!res.ok) { showToast('Error al guardar. Intenta de nuevo.'); return }
    showToast('Guardado correctamente.')
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.mid, display: 'block', marginBottom: 8 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.dark, outline: 'none', background: 'var(--bg-input)' }
  const btnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, background: C.brand, color: 'var(--text-on-brand)', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            color: tab === t.id ? C.brand : C.mid,
            borderBottom: tab === t.id ? `2px solid ${C.brand}` : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* WhatsApp — sin caja alrededor, a pedido del usuario 2026-09-04
          ("no es necesario encerrar todo tanto"). */}
      {tab === 'whatsapp' && (
        <div style={{ maxWidth: 480 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 20 }}>Número de WhatsApp</h3>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Número (formato internacional, sin +)</label>
            <input value={waNumero} onChange={e => setWaNumero(e.target.value)} style={inputStyle} placeholder="573001234567" />
            <p style={{ fontSize: 11, color: C.mid, marginTop: 6 }}>Ejemplo: 573001234567 (Colombia +57, número 300 1234567)</p>
          </div>
          <button onClick={() => startTransition(() => { guardar('whatsapp', { numero: waNumero }) })} className="hover-pop hover-press" style={btnStyle}>
            <FloppyDisk size={15} />
            Guardar número
          </button>
        </div>
      )}

      {/* Precios — antes la página completa /admin/planes, absorbida aquí
          2026-09-04 (ver precios-tab.tsx). Sin cardStyle/maxWidth: las 4
          tarjetas de plan necesitan todo el ancho disponible. */}
      {tab === 'precios' && <PreciosTab />}

      {/* FAQ — sin la caja exterior, a pedido del usuario 2026-09-04
          ("está doblemente encerrado, solo con el de adentro es
          suficiente"): se queda solo el recuadro punteado de "Nueva
          pregunta" y el fondo tenue de cada pregunta existente. */}
      {tab === 'faq' && (
        <div style={{ maxWidth: 700 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 28 }}>Preguntas frecuentes</h3>

          {faqItems.map((item, i) => {
            const expandida = faqExpandidos.has(i)
            return (
              <div
                key={i}
                draggable
                onDragStart={() => setFaqDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (faqDragIndex !== null && faqDragIndex !== i) moverFaq(faqDragIndex, i); setFaqDragIndex(null) }}
                onDragEnd={() => setFaqDragIndex(null)}
                style={{ padding: '22px 0', borderBottom: '1px solid var(--divider)', opacity: faqDragIndex === i ? 0.4 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <GripVertical size={14} style={{ color: C.mid, cursor: 'grab', flexShrink: 0 }} sinAnimacion />
                  <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.dark, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.pregunta || 'Pregunta sin título'}
                  </p>
                  <button onClick={() => toggleFaqExpandido(i)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: expandida ? C.brand : C.mid, display: 'flex', flexShrink: 0 }}>
                    <Pencil size={15} sinAnimacion />
                  </button>
                  <button onClick={() => setFaqItems(prev => prev.filter((_, idx) => idx !== i))} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', flexShrink: 0 }}>
                    <Trash size={15} sinAnimacion />
                  </button>
                </div>

                {expandida && (
                  <div style={{ marginTop: 22, paddingLeft: 30, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={labelStyle}>Pregunta</label>
                      <input value={item.pregunta}
                        onChange={e => setFaqItems(prev => prev.map((it, idx) => idx === i ? { ...it, pregunta: e.target.value } : it))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Respuesta</label>
                      <TextareaAutoAjustable
                        value={item.respuesta}
                        onChange={(v) => setFaqItems(prev => prev.map((it, idx) => idx === i ? { ...it, respuesta: v } : it))}
                        style={{ ...inputStyle, minHeight: 70 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Colapsado por defecto detrás del botón "Nueva pregunta" de abajo
              — a pedido del usuario 2026-09-04, mismo criterio que las
              preguntas existentes (no todo abierto de una). */}
          {mostrarNuevaFaq && (
            <div style={{ margin: '24px 0', padding: 24, border: `1px dashed ${C.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.mid, margin: 0 }}>Nueva pregunta</p>
              <div>
                <label style={labelStyle}>Pregunta</label>
                <input value={newFaq.pregunta} onChange={e => setNewFaq(prev => ({ ...prev, pregunta: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Respuesta</label>
                <TextareaAutoAjustable
                  value={newFaq.respuesta}
                  onChange={(v) => setNewFaq(prev => ({ ...prev, respuesta: v }))}
                  style={{ ...inputStyle, minHeight: 70 }}
                />
              </div>
              <button onClick={() => { if (!newFaq.pregunta || !newFaq.respuesta) return; setFaqItems(prev => [...prev, newFaq]); setNewFaq({ pregunta: '', respuesta: '' }); setMostrarNuevaFaq(false) }}
                style={{ ...btnStyle, background: 'var(--bg-primary)', color: C.brand, border: `1.5px solid ${C.border}`, boxShadow: 'none', alignSelf: 'flex-start' }}>
                <Plus size={15} />
                Agregar pregunta
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={() => setMostrarNuevaFaq(v => !v)} className="hover-pop hover-press"
              style={{ ...btnStyle, background: 'var(--bg-primary)', color: C.brand, border: `1.5px solid ${C.border}`, boxShadow: 'none' }}>
              <Plus size={15} />
              Nueva pregunta
            </button>
            <button onClick={() => startTransition(() => { guardar('faq', { items: faqItems }) })} className="hover-pop hover-press" style={btnStyle}>
              <FloppyDisk size={15} />
              Guardar FAQ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
