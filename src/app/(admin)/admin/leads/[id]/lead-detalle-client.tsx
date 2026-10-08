'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save as FloppyDisk, CheckCircle, Mail as Envelope } from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { Button } from '@/components/ui/button'
import { Selector } from '@/components/ui/selector'
import { InputTelefono } from '@/components/ui/input-telefono'
import { useToast } from '@/components/toast-provider'
import { normalizarTelefono, separarTelefonoEIndicativo } from '@/lib/telefono'
import { parsearNotasLead, formatearFechaNota } from '@/lib/notas-lead'
import { DetallePagina, SeccionDetalle, PieDetalle } from '@/components/ui/detalle-pagina'

// WhatsApp abre un chat de dos maneras: por número (solo dígitos, con
// indicativo y sin signos) o por nombre de usuario. Las dos usan wa.me.
export function enlaceWhatsApp(telefono?: string | null, usuario?: string | null) {
  const u = (usuario ?? '').trim().replace(/^@/, '')
  if (u) return `https://wa.me/${encodeURIComponent(u)}`
  const d = normalizarTelefono(telefono ?? '').replace(/\D/g, '')
  return d.length >= 7 ? `https://wa.me/${d}` : null
}

const ESTADOS = ['nuevo', 'contactado', 'convertido', 'descartado'] as const
type EstadoLead = (typeof ESTADOS)[number]

interface Lead {
  id: string
  nombre: string | null
  email: string | null
  telefono: string | null
  empresa: string | null
  interes: string | null
  mensaje: string | null
  estado: string
  created_at: string
  evento_nombre?: string | null
  usuario_whatsapp?: string | null
  notas?: string | null
}

const ETIQUETA_ESTADO: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  convertido: 'Convertido',
  descartado: 'Descartado',
}

export function LeadDetalleClient({ lead }: { lead: Lead }) {
  const { toast } = useToast()
  const telSeparado = separarTelefonoEIndicativo(lead.telefono)
  const [indicativo, setIndicativo] = useState(telSeparado.indicativo)
  const [telefono, setTelefono] = useState(telSeparado.numero)

  const partes = (lead.nombre || '').trim().split(' ')
  const apellidoInicial = partes.length > 1 ? partes.pop()! : ''
  const nombreInicial = partes.join(' ')

  const [form, setForm] = useState({
    nombre: nombreInicial,
    apellido: apellidoInicial,
    email: lead.email ?? '',
    usuario_whatsapp: lead.usuario_whatsapp ?? '',
    empresa: lead.empresa ?? '',
    interes: lead.interes ?? '',
    evento_nombre: lead.evento_nombre ?? '',
    mensaje: lead.mensaje ?? '',
    estado: (ESTADOS.includes(lead.estado as EstadoLead) ? lead.estado : 'nuevo') as EstadoLead,
  })
  const [notas, setNotas] = useState(() => parsearNotasLead(lead.notas))
  const [nuevaNota, setNuevaNota] = useState('')
  const [agregandoNota, setAgregandoNota] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const telFinal = telefono.trim() ? (indicativo ? normalizarTelefono(`${indicativo} ${telefono}`) : telefono.trim()) : null
  const wa = enlaceWhatsApp(telFinal, form.usuario_whatsapp)

  async function agregarNota() {
    if (!nuevaNota.trim()) return
    setAgregandoNota(true)
    try {
      const res = await fetch(`/api/admin/leads?id=${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota_nueva: nuevaNota }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar la nota.')
      setNotas(parsearNotasLead(data.notas))
      setNuevaNota('')
      toast.success('Nota guardada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la nota.')
    } finally {
      setAgregandoNota(false)
    }
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio.')
      return
    }
    setGuardando(true)
    setGuardado(false)
    try {
      const nombreCompleto = [form.nombre.trim(), form.apellido.trim()].filter(Boolean).join(' ')
      const res = await fetch(`/api/admin/leads?id=${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          nombre: nombreCompleto,
          telefono: telFinal,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar.')
      setGuardado(true)
      toast.success('Contacto guardado.')
      setTimeout(() => setGuardado(false), 2500)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand w-full'
  const etiqueta = 'text-xs font-semibold text-(--text-secondary)'

  return (
    <DetallePagina>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-brand">
          <ArrowLeft size={16} /> Volver a contactos
        </Link>
        <span className="text-xs text-(--text-placeholder)">
          Registrado el {new Date(lead.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-(--text-primary) m-0">
          {[form.nombre.trim(), form.apellido.trim()].filter(Boolean).join(' ') || 'Contacto'}
        </h1>
        {form.empresa && <p className="text-sm text-(--text-secondary) mt-1 mb-0">{form.empresa}</p>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-(--border) px-4 py-2 text-sm font-semibold text-(--text-primary) hover:border-brand"
          >
            <WhatsappLogo size={16} /> Escribir por WhatsApp
          </a>
        )}
        {form.email && (
          <a
            href={`mailto:${form.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-(--border) px-4 py-2 text-sm font-semibold text-(--text-primary) hover:border-brand"
          >
            <Envelope size={16} /> Enviar correo
          </a>
        )}
      </div>

      <SeccionDetalle titulo="Datos del contacto">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>Nombre</span>
            <input className={campo} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>Apellido</span>
            <input className={campo} value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>Empresa</span>
            <input className={campo} value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>Correo</span>
            <input className={campo} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </label>
          <div className="flex flex-col gap-1">
            <span className={etiqueta}>Celular / WhatsApp</span>
            <InputTelefono
              indicativo={indicativo}
              onChangeIndicativo={setIndicativo}
              telefono={telefono}
              onChangeTelefono={setTelefono}
              permitirSinIndicativo={true}
              soloNumeros={false}
            />
          </div>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={etiqueta}>Usuario de WhatsApp</span>
            <input className={campo} placeholder="nombredeusuario" value={form.usuario_whatsapp} onChange={e => setForm(p => ({ ...p, usuario_whatsapp: e.target.value }))} />
            <span className="text-[11px] text-(--text-placeholder)">
              Sin la arroba. Si lo llenas, el botón de WhatsApp usa el usuario en vez del número.
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>Interés</span>
            <input className={campo} value={form.interes} onChange={e => setForm(p => ({ ...p, interes: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={etiqueta}>Evento</span>
            <input className={campo} value={form.evento_nombre} onChange={e => setForm(p => ({ ...p, evento_nombre: e.target.value }))} />
          </label>
          <div className="flex flex-col gap-1">
            <span className={etiqueta}>Estado comercial</span>
            <Selector
              opciones={ESTADOS.map(e => ({ value: e, label: ETIQUETA_ESTADO[e] }))}
              value={form.estado}
              onChange={v => setForm(p => ({ ...p, estado: v as EstadoLead }))}
            />
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className={etiqueta}>Mensaje del prospecto</span>
          <textarea className={`${campo} min-h-[80px]`} value={form.mensaje} onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))} />
        </label>
      </SeccionDetalle>

      <SeccionDetalle titulo="Notas internas">
        <p className="text-xs text-(--text-secondary) m-0">Solo las ve el equipo. El prospecto nunca las recibe.</p>
        <textarea
          className={`${campo} min-h-[96px]`}
          placeholder="Qué se habló, próximos pasos, fecha del siguiente contacto..."
          value={nuevaNota}
          onChange={e => setNuevaNota(e.target.value)}
        />
        <div>
          <Button onClick={agregarNota} loading={agregandoNota} disabled={!nuevaNota.trim()}>
            Agregar nota
          </Button>
        </div>
        {notas.length > 0 ? (
          <div className="flex flex-col gap-2 mt-2">
            {notas.map(n => {
              const f = formatearFechaNota(n.fecha)
              return (
                <div key={n.id} className="rounded-xl border border-(--border) bg-(--bg-input)/50 p-3 flex flex-col gap-1">
                  <span className="text-sm text-(--text-primary) whitespace-pre-wrap break-words leading-relaxed">{n.texto}</span>
                  <span className="text-xs text-(--text-secondary)">
                    {f.dia} · {f.hora}{n.autor ? ` · ${n.autor}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-(--text-placeholder) m-0">Aún no hay notas. Agrega la primera.</p>
        )}
      </SeccionDetalle>

      <PieDetalle
        onGuardar={guardar}
        guardando={guardando}
        textoGuardar={guardado ? 'Guardado' : 'Guardar cambios'}
        hrefVolver="/admin/leads"
      />
    </DetallePagina>
  )
}
