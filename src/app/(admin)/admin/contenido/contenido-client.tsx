'use client'

import { useState, useTransition } from 'react'
import { Save as FloppyDisk, BarChart2 as ChartBar, CircleHelp as Question, Layers as Stack } from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { WA_NUMBER } from '@/lib/constants/contacto'

const C = {
  brand: 'var(--color-brand)', dark: 'var(--text-primary)', mid: 'var(--text-secondary)',
  border: 'var(--border)', light: 'var(--bg-hover)',
}

type ContenidoRow = { clave: string; valor_json: Record<string, unknown>; updated_at: string }

type Props = { contenido: ContenidoRow[] }

const DEFAULTS: Record<string, Record<string, unknown>> = {
  whatsapp: { numero: WA_NUMBER },
  hero: {
    linea1: 'Certifica el impacto',
    linea2: 'de lo que tu empresa',
    linea3: 'no tira.',
    subtitulo: 'La primera plataforma que certifica el CO₂ evitado al reutilizar.',
  },
  stats: {
    stat1_valor: '2.400', stat1_unidad: 'kg', stat1_label: 'CO₂ evitados en total',
    stat2_valor: '180', stat2_unidad: 'ton', stat2_label: 'reutilizadas y certificadas',
    stat3_valor: '+100', stat3_unidad: '', stat3_label: 'organizaciones activas',
  },
}

const TABS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: WhatsappLogo },
  { id: 'hero', label: 'Hero', icon: Stack },
  { id: 'stats', label: 'Estadísticas', icon: ChartBar },
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

  // Hero state
  const heroInit = getVal('hero') as Record<string, string>
  const [hero, setHero] = useState({ linea1: heroInit.linea1 ?? '', linea2: heroInit.linea2 ?? '', linea3: heroInit.linea3 ?? '', subtitulo: heroInit.subtitulo ?? '' })

  // Stats state
  const statsInit = getVal('stats') as Record<string, string>
  const [stats, setStats] = useState({
    stat1_valor: statsInit.stat1_valor ?? '', stat1_unidad: statsInit.stat1_unidad ?? '', stat1_label: statsInit.stat1_label ?? '',
    stat2_valor: statsInit.stat2_valor ?? '', stat2_unidad: statsInit.stat2_unidad ?? '', stat2_label: statsInit.stat2_label ?? '',
    stat3_valor: statsInit.stat3_valor ?? '', stat3_unidad: statsInit.stat3_unidad ?? '', stat3_label: statsInit.stat3_label ?? '',
  })

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

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.mid, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }
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

      {/* Hero */}
      {tab === 'hero' && (
        <div style={{ ...cardStyle, maxWidth: 640 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 20 }}>Texto del Hero</h3>
          {(['linea1', 'linea2', 'linea3'] as const).map((k, i) => (
            <div key={k} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Línea {i + 1}</label>
              <input value={hero[k]} onChange={e => setHero(prev => ({ ...prev, [k]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Subtítulo</label>
            <textarea value={hero.subtitulo} onChange={e => setHero(prev => ({ ...prev, subtitulo: e.target.value }))}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
          </div>
          <button onClick={() => startTransition(() => { guardar('hero', hero) })} className="hover-pop hover-press" style={btnStyle}>
            <FloppyDisk size={15} />
            Guardar hero
          </button>
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div style={{ ...cardStyle, maxWidth: 700 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 20 }}>Estadísticas de impacto</h3>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: n < 3 ? `1px solid ${C.border}` : 'none' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Estadística {n}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
                {(['valor', 'unidad', 'label'] as const).map(campo => (
                  <div key={campo}>
                    <label style={labelStyle}>{campo === 'valor' ? 'Número' : campo === 'unidad' ? 'Unidad' : 'Descripción'}</label>
                    <input
                      value={(stats as Record<string, string>)[`stat${n}_${campo}`]}
                      onChange={e => setStats(prev => ({ ...prev, [`stat${n}_${campo}`]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => startTransition(() => { guardar('stats', stats) })} className="hover-pop hover-press" style={btnStyle}>
            <FloppyDisk size={15} />
            Guardar estadísticas
          </button>
        </div>
      )}

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
