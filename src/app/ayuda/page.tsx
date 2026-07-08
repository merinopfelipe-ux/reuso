'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare as ChatCircle, Mail as Envelope, CircleHelp as Question, TriangleAlert as Warning, CreditCard } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { PageSubmenu } from '@/components/page-submenu'

const AYUDA_ITEMS = [
  { href: '/ayuda#ticket', label: 'Enviar ticket' },
  { href: '/ayuda#contacto', label: 'Contacto' },
  { href: '/ayuda#faq', label: 'Preguntas frecuentes' },
]

const CATEGORIAS = [
  { value: 'Error técnico', icon: Warning },
  { value: 'Pregunta de uso', icon: Question },
  { value: 'Facturación', icon: CreditCard },
  { value: 'Otro', icon: ChatCircle },
]

export default function AyudaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState({ mensaje: '', categoria: 'Error técnico' })
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/ayuda/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Ticket enviado. Te responderemos pronto.')
      setForm({ mensaje: '', categoria: 'Error técnico' })
    } catch {
      toast.error('No se pudo enviar el ticket. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    fontFamily: "'Open Sans', sans-serif", boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 24, marginBottom: 24,
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Título con ← */}
      <h1
        onClick={() => router.back()}
        style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', marginBottom: 28,
        }}
        className="hover-slide-r"
      >
        <ArrowLeft size={22} />
        Centro de ayuda
      </h1>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {/* Submenu lateral */}
        <aside style={{ flexShrink: 0, width: 180, position: 'sticky', top: 32 }}>
          <PageSubmenu items={AYUDA_ITEMS} />
        </aside>

        {/* Contenido */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── Ticket ── */}
          <div id="ticket" style={sectionStyle}>
            <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Enviar ticket de ayuda
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Describe tu problema y te responderemos a la mayor brevedad posible.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Selector de categoría como botones */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Categoría
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {CATEGORIAS.map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, categoria: value }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: form.categoria === value
                          ? '2px solid var(--color-brand)'
                          : '1px solid var(--border)',
                        background: form.categoria === value
                          ? 'var(--color-brand-light)'
                          : 'var(--bg-integrated)',
                        color: form.categoria === value
                          ? 'var(--color-brand)'
                          : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: form.categoria === value ? 700 : 400,
                        transition: 'all 0.15s',
                        fontFamily: "'Open Sans', sans-serif",
                      }}
                      className="hover-pop hover-press"
                    >
                      <Icon size={15} />
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="ayuda-mensaje" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Descripción del problema
                </label>
                <textarea
                  id="ayuda-mensaje"
                  name="mensaje"
                  value={form.mensaje}
                  onChange={handleChange}
                  placeholder="Describe con detalle lo que necesitas..."
                  required
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 28px',
                    background: loading ? '#4D7C79' : 'var(--color-brand)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar ticket'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Contacto ── */}
          <div id="contacto" style={sectionStyle}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Canales de contacto
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a
                href="mailto:servicio@lurdes.co"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg-integrated)',
                  color: 'var(--text-primary)', textDecoration: 'none',
                  fontSize: 14, transition: 'border-color 0.2s',
                }}
                className="ayuda-link hover-pop"
              >
                <div style={{ padding: 8, borderRadius: 8, background: 'var(--color-brand-light)' }}>
                  <Envelope size={16} color="var(--color-brand)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>Correo electrónico</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-brand)' }}>servicio@lurdes.co</p>
                </div>
              </a>
            </div>
          </div>

          {/* ── FAQ ── */}
          <div id="faq" style={sectionStyle}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Preguntas frecuentes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  q: '¿Cómo agrego colaboradores a mi empresa?',
                  a: 'Ve a Panel de empresa → Equipo → Invitar colaborador. Ingresa el correo y envía la invitación. El colaborador recibirá un link de registro.',
                },
                {
                  q: '¿Cómo genero un certificado?',
                  a: 'Registra objetos en "Mis objetos" o "Historial de objetos", luego ve a Certificados y selecciona "Generar certificado".',
                },
                {
                  q: '¿Los datos de CO₂ son verificables?',
                  a: 'Sí. Cada certificado tiene un código único y un QR que lleva a una página de verificación pública en Calculadora de Reúso.',
                },
                {
                  q: '¿Cómo cambio mi plan?',
                  a: 'Los cambios de plan los gestiona nuestro equipo. Escríbenos a servicio@lurdes.co indicando el plan que necesitas.',
                },
                {
                  q: '¿Cómo funciona el modo oscuro?',
                  a: 'Ve a Configuración → Preferencias y elige entre Claro, Oscuro o Sistema (sigue automáticamente tu dispositivo).',
                },
              ].map(({ q, a }) => (
                <details
                  key={q}
                  style={{
                    border: '1px solid var(--border)', borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <summary
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                      listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    {q}
                    <span style={{ color: 'var(--color-brand)', fontSize: 18, lineHeight: 1 }}>+</span>
                  </summary>
                  <p style={{
                    margin: 0, padding: '0 16px 14px',
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                  }}>
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>

        </div>{/* fin contenido */}
      </div>{/* fin flex */}
      <style>{`
        .ayuda-link:hover { border-color: var(--color-brand) !important; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  )
}
