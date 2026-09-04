'use client'

import { useState, useTransition } from 'react'
import { Save as FloppyDisk, CircleHelp as Question, Tag } from '@/components/ui/icons'
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

  // FAQ state
  const faqInit = getVal('faq')
  const [faqItems, setFaqItems] = useState<FaqItem[]>((faqInit.items as FaqItem[]) ?? [])
  const [newFaq, setNewFaq] = useState<FaqItem>({ pregunta: '', respuesta: '' })

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

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.mid, display: 'block', marginBottom: 6 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.dark, outline: 'none', background: 'var(--bg-input)' }
  const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }
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

      {/* WhatsApp */}
      {tab === 'whatsapp' && (
        <div style={{ ...cardStyle, maxWidth: 480 }}>
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

      {/* FAQ */}
      {tab === 'faq' && (
        <div style={{ ...cardStyle, maxWidth: 700 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 20 }}>Preguntas frecuentes</h3>

          {faqItems.map((item, i) => (
            <div key={i} style={{ marginBottom: 16, padding: 16, background: C.light, borderRadius: 12, position: 'relative' }}>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Pregunta</label>
                <input value={item.pregunta}
                  onChange={e => setFaqItems(prev => prev.map((it, idx) => idx === i ? { ...it, pregunta: e.target.value } : it))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Respuesta</label>
                <textarea value={item.respuesta}
                  onChange={e => setFaqItems(prev => prev.map((it, idx) => idx === i ? { ...it, respuesta: e.target.value } : it))}
                  style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
              </div>
              <button onClick={() => setFaqItems(prev => prev.filter((_, idx) => idx !== i))}
                style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12, fontWeight: 700 }}>
                Eliminar
              </button>
            </div>
          ))}

          <div style={{ marginBottom: 20, padding: 16, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 12 }}>Nueva pregunta</p>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Pregunta</label>
              <input value={newFaq.pregunta} onChange={e => setNewFaq(prev => ({ ...prev, pregunta: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Respuesta</label>
              <textarea value={newFaq.respuesta} onChange={e => setNewFaq(prev => ({ ...prev, respuesta: e.target.value }))}
                style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
            </div>
            <button onClick={() => { if (!newFaq.pregunta || !newFaq.respuesta) return; setFaqItems(prev => [...prev, newFaq]); setNewFaq({ pregunta: '', respuesta: '' }) }}
              style={{ ...btnStyle, background: 'var(--bg-primary)', color: C.brand, border: `1.5px solid ${C.border}`, boxShadow: 'none' }}>
              Agregar pregunta
            </button>
          </div>

          <button onClick={() => startTransition(() => { guardar('faq', { items: faqItems }) })} className="hover-pop hover-press" style={btnStyle}>
            <FloppyDisk size={15} />
            Guardar FAQ
          </button>
        </div>
      )}
    </div>
  )
}
