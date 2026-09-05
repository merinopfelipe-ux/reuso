'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare as ChatCircle, Mail as Envelope, CircleHelp as Question, TriangleAlert as Warning, CreditCard, PlusCircle } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { PageSubmenu } from '@/components/page-submenu'
import { Button } from '@/components/ui/button'
import { SelectorEmpresa, type EmpresaOpcion } from '@/components/ui/selector-empresa'
import { Modal } from '@/components/ui/modal'

const AYUDA_ITEMS = [
  { href: '/ayuda#ticket', label: 'Enviar ticket' },
  { href: '/ayuda#contacto', label: 'Contacto' },
  { href: '/ayuda#faq', label: 'Preguntas frecuentes' },
]

const AYUDA_ITEMS_ADMIN = [
  { href: '/ayuda#ticket', label: 'Tickets de la plataforma' },
  { href: '/ayuda#contacto', label: 'Contacto' },
]

const CATEGORIAS = [
  { value: 'Error técnico', icon: Warning },
  { value: 'Pregunta de uso', icon: Question },
  { value: 'Facturación', icon: CreditCard },
  { value: 'Otro', icon: ChatCircle },
]

interface TicketAdmin {
  id: string
  titulo: string
  tipo: string
  prioridad: string
  estado: string
  origen: 'usuario' | 'admin'
  empresa_id: string | null
  created_at: string
  updated_at: string
  empresas: { nombre: string } | { nombre: string }[] | null
}

function nombreEmpresaDe(t: TicketAdmin): string {
  const e = Array.isArray(t.empresas) ? t.empresas[0] : t.empresas
  return e?.nombre ?? 'Sin empresa'
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

export default function AyudaPage() {
  const router = useRouter()
  const [rol, setRol] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => setRol(d?.rol ?? null))
      .catch(() => setRol(null))
  }, [])

  const esSuperAdmin = rol === 'super_admin'

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
        {/* Contenido */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {esSuperAdmin ? <ContenidoSuperAdmin /> : <ContenidoUsuario />}
        </div>

        {/* Submenu lateral — a la derecha, mismo lugar que ya usan
            settings/legal (no era consistente, /ayuda lo tenía a la
            izquierda). */}
        <aside style={{ flexShrink: 0, width: 200, position: 'sticky', top: 32 }}>
          <PageSubmenu items={esSuperAdmin ? AYUDA_ITEMS_ADMIN : AYUDA_ITEMS} />
        </aside>
      </div>

      <style>{`
        .ayuda-link:hover { border-color: var(--color-brand) !important; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  )
}

// ── Vista normal (empresa_admin / empleado / usuario_libre) ────────────────

function ContenidoUsuario() {
  const { toast } = useToast()
  const [form, setForm] = useState({ mensaje: '', categoria: 'Error técnico' })
  const [loading, setLoading] = useState(false)

  // Solución liviana para "reportar un error" sin construir nada nuevo: la
  // categoría "Error técnico" ya existía y ya es la opción por defecto — lo
  // único que faltaba era capturar en qué pantalla pasó, que si no se pierde
  // apenas el usuario navega a /ayuda. Se precarga como punto de partida
  // editable, nunca se manda nada oculto que el usuario no vea.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.referrer) return
    try {
      const referrer = new URL(document.referrer)
      if (referrer.origin !== window.location.origin) return
      setForm((prev) => prev.mensaje ? prev : { ...prev, mensaje: `Página donde ocurrió: ${referrer.pathname}\n\nDescribe aquí qué pasó:\n` })
    } catch {
      // Referrer inválido o bloqueado por el navegador — se deja el mensaje vacío, sin romper nada.
    }
  }, [])

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

  return (
    <>
      {/* ── Ticket ── */}
      <div id="ticket" style={sectionStyle}>
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          Enviar ticket de ayuda
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
          Describe tu problema y te responderemos a la mayor brevedad posible.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    border: form.categoria === value ? '2px solid var(--color-brand)' : '1px solid var(--border)',
                    background: form.categoria === value ? 'var(--color-brand-light)' : 'var(--bg-integrated)',
                    color: form.categoria === value ? 'var(--color-brand)' : 'var(--text-secondary)',
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
            <Button type="submit" loading={loading}>
              Enviar ticket
            </Button>
          </div>
        </form>
      </div>

      <SeccionContacto />

      {/* ── FAQ ── */}
      <div id="faq" style={sectionStyle}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          Preguntas frecuentes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { q: '¿Cómo agrego colaboradores a mi empresa?', a: 'Ve a Panel de empresa → Equipo → Invitar colaborador. Ingresa el correo y envía la invitación. El colaborador recibirá un link de registro.' },
            { q: '¿Cómo genero un informe?', a: 'Registra objetos en "Mis objetos" o "Historial de objetos", luego ve a Informes y selecciona "Generar informe".' },
            { q: '¿Los datos de CO₂ son verificables?', a: 'Sí. Cada informe tiene un código único y un QR que lleva a una página de verificación pública en Calculadora de Reúso.' },
            { q: '¿Cómo cambio mi plan?', a: 'Los cambios de plan los gestiona nuestro equipo. Escríbenos a servicio@lurdes.co indicando el plan que necesitas.' },
            { q: '¿Cómo funciona el modo oscuro?', a: 'Ve a Configuración → Preferencias y elige entre Claro, Oscuro o Sistema (sigue automáticamente tu dispositivo).' },
          ].map(({ q, a }) => (
            <details key={q} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <summary style={{ padding: '12px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {q}
                <span style={{ color: 'var(--color-brand)', fontSize: 18, lineHeight: 1 }}>+</span>
              </summary>
              <p style={{ margin: 0, padding: '0 16px 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  )
}

function SeccionContacto() {
  return (
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
  )
}

// ── Vista super_admin: todos los tickets de la plataforma + PQR a nombre de
// una empresa que no puede o no sabe hacerlo ella misma. ────────────────────

function ContenidoSuperAdmin() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<TicketAdmin[]>([])
  const [cargando, setCargando] = useState(true)
  const [empresas, setEmpresas] = useState<EmpresaOpcion[]>([])
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [modalPqrAbierto, setModalPqrAbierto] = useState(false)
  const [empresaPqr, setEmpresaPqr] = useState('')
  const [form, setForm] = useState({ titulo: '', tipo: 'solicitud', mensaje_html: '' })
  const [enviando, setEnviando] = useState(false)

  function cargarTickets(empresaId: string) {
    setCargando(true)
    const url = empresaId ? `/api/tickets?empresa_id=${empresaId}` : '/api/tickets'
    fetch(url)
      .then(r => r.json())
      .then(d => setTickets(d.data ?? []))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargarTickets(filtroEmpresa)
    fetch('/api/cotizador/empresas')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.empresas) setEmpresas(d.empresas) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEmpresa])

  async function enviarPqr() {
    if (!empresaPqr) { toast.error('Elige a nombre de qué empresa es este PQR.'); return }
    setEnviando(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo,
          tipo: form.tipo,
          mensaje_html: form.mensaje_html,
          empresa_id_pqr: empresaPqr,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('PQR registrado a nombre de la empresa.')
      setModalPqrAbierto(false)
      setForm({ titulo: '', tipo: 'solicitud', mensaje_html: '' })
      setEmpresaPqr('')
      cargarTickets(filtroEmpresa)
    } catch {
      toast.error('No se pudo registrar el PQR. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div id="ticket" style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Tickets de la plataforma
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Todos los tickets de todas las empresas, no solo los que tú creaste.
            </p>
          </div>
          <Button size="sm" icon={<PlusCircle size={15} />} onClick={() => setModalPqrAbierto(true)}>
            Redactar PQR a nombre de una empresa
          </Button>
        </div>

        <div style={{ marginBottom: 16, maxWidth: 320 }}>
          <SelectorEmpresa empresas={empresas} value={filtroEmpresa} onChange={setFiltroEmpresa} placeholder="Todas las empresas" />
        </div>

        {cargando ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando tickets...</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No hay tickets{filtroEmpresa ? ' de esta empresa' : ''} todavía.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tickets.map(t => (
              <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.titulo}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-integrated)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {t.estado}
                  </span>
                  {t.origen === 'admin' && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--color-brand-light)', color: 'var(--color-brand)', fontWeight: 600 }}>
                      Redactado por el equipo
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {nombreEmpresaDe(t)} · {t.tipo} · {t.prioridad} · {new Date(t.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <SeccionContacto />

      <Modal
        abierto={modalPqrAbierto}
        onClose={() => setModalPqrAbierto(false)}
        titulo="Redactar PQR a nombre de una empresa"
        textoConfirmar={enviando ? 'Enviando...' : 'Enviar'}
        onConfirmar={enviarPqr}
        ancho="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>A nombre de qué empresa *</label>
            <SelectorEmpresa empresas={empresas} value={empresaPqr} onChange={setEmpresaPqr} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Título *</label>
            <input
              style={inputStyle}
              value={form.titulo}
              onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Resumen corto del PQR"
              maxLength={100}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Descripción *</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={5}
              value={form.mensaje_html}
              onChange={e => setForm(p => ({ ...p, mensaje_html: e.target.value }))}
              placeholder="Describe la petición, queja o reclamo tal como te la comunicó la empresa..."
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
