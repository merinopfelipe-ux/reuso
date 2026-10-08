'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Selector } from '@/components/ui/selector'
import { InputTelefono } from '@/components/ui/input-telefono'
import { useToast } from '@/components/toast-provider'
import { normalizarTelefono, separarTelefonoEIndicativo } from '@/lib/telefono'
import { parsearNotasLead, formatearFechaNota } from '@/lib/notas-lead'
import { DetallePagina, SeccionDetalle, PieDetalle, EncabezadoDetalle } from '@/components/ui/detalle-pagina'
import { AccionesContacto } from '@/components/ui/acciones-contacto'
import { CampoFormulario, CLASE_CAMPO } from '@/components/ui/campo-formulario'

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

  return (
    <DetallePagina>
      <EncabezadoDetalle
        titulo={[form.nombre.trim(), form.apellido.trim()].filter(Boolean).join(' ') || 'Contacto'}
        subtitulo={form.empresa || undefined}
        hrefVolver="/admin/leads"
        textoVolver="Volver a contactos"
        meta={`Registrado el ${new Date(lead.created_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      <AccionesContacto
        telefono={telFinal}
        whatsappUsuario={form.usuario_whatsapp}
        email={form.email}
      />

      <SeccionDetalle titulo="Datos del contacto">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampoFormulario label="Nombre">
            <input className={CLASE_CAMPO} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </CampoFormulario>
          <CampoFormulario label="Apellido">
            <input className={CLASE_CAMPO} value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
          </CampoFormulario>
          <CampoFormulario label="Empresa">
            <input className={CLASE_CAMPO} value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} />
          </CampoFormulario>
          <CampoFormulario label="Correo">
            <input className={CLASE_CAMPO} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </CampoFormulario>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-(--text-secondary)">Celular / WhatsApp</span>
            <InputTelefono
              indicativo={indicativo}
              onChangeIndicativo={setIndicativo}
              telefono={telefono}
              onChangeTelefono={setTelefono}
              permitirSinIndicativo={true}
              soloNumeros={false}
            />
          </div>
          <CampoFormulario
            label="Usuario de WhatsApp"
            hint="Sin la arroba. Si lo llenas, el botón de WhatsApp usa el usuario en vez del número."
            ancho="completo"
          >
            <input className={CLASE_CAMPO} placeholder="nombredeusuario" value={form.usuario_whatsapp} onChange={e => setForm(p => ({ ...p, usuario_whatsapp: e.target.value }))} />
          </CampoFormulario>
          <CampoFormulario label="Interés">
            <input className={CLASE_CAMPO} value={form.interes} onChange={e => setForm(p => ({ ...p, interes: e.target.value }))} />
          </CampoFormulario>
          <CampoFormulario label="Evento">
            <input className={CLASE_CAMPO} value={form.evento_nombre} onChange={e => setForm(p => ({ ...p, evento_nombre: e.target.value }))} />
          </CampoFormulario>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-(--text-secondary)">Estado comercial</span>
            <Selector
              opciones={ESTADOS.map(e => ({ value: e, label: ETIQUETA_ESTADO[e] }))}
              value={form.estado}
              onChange={v => setForm(p => ({ ...p, estado: v as EstadoLead }))}
            />
          </div>
        </div>

        <CampoFormulario label="Mensaje del prospecto" ancho="completo">
          <textarea className={`${CLASE_CAMPO} min-h-[80px]`} value={form.mensaje} onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))} />
        </CampoFormulario>
      </SeccionDetalle>

      <SeccionDetalle titulo="Notas internas">
        <p className="text-xs text-(--text-secondary) m-0">Solo las ve el equipo. El prospecto nunca las recibe.</p>
        <textarea
          className={`${CLASE_CAMPO} min-h-[96px]`}
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
