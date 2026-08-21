'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Save } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { HiloNotas } from '@/components/crm/hilo-notas'
import { formatCOP, formatFecha } from '@/lib/format'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { SelectorCiudad, CIUDAD_DEFECTO } from '@/components/ui/selector-ciudad'
import { InputDireccion } from '@/components/ui/input-direccion'
import { Selector } from '@/components/ui/selector'
import { formatTelefonoVista } from '@/lib/telefono'
import type { TipoTicket, EstadoTicket } from '@/components/soporte/lista-tickets'
import { SkeletonLista } from '@/components/ui/skeleton'

interface TicketResumen {
  id: string
  titulo: string
  tipo: TipoTicket
  estado: EstadoTicket
  created_at: string
}

const TIPO_TICKET_LABELS: Record<TipoTicket, string> = {
  duda: 'Duda general', bug: 'Problema técnico', solicitud: 'Solicitud', queja: 'Queja',
}

const ESTADO_TICKET_COLOR: Record<EstadoTicket, string> = {
  abierto: 'text-[var(--color-brand)] bg-[var(--color-brand-light)]',
  en_proceso: 'text-[#AD7C43] bg-[rgba(173,124,67,0.1)]',
  resuelto: 'text-[var(--color-success-content)] bg-[rgba(56,185,142,0.1)]',
  cerrado: 'text-[var(--text-secondary)] bg-[var(--bg-hover)]',
}

interface EmpresaClienteDetalle {
  id: string
  nit: string
  razon_social: string
  nombre_comercial: string | null
  direccion: string | null
}

interface ClienteDetalle {
  id: string
  tipo: 'persona' | 'empresa'
  nombre: string
  apellido: string | null
  identificacion: string | null
  telefono: string | null
  telefono_indicativo: string | null
  email: string | null
  pais: string | null
  ciudad: string | null
  direccion: string | null
  direccion_notas: string | null
  empresa_cliente_id: string | null
  es_contacto_real: boolean
  crm_empresas_clientes: EmpresaClienteDetalle | EmpresaClienteDetalle[] | null
}

interface CotizacionResumen {
  id: string
  codigo_cotizacion: string
  estado: string
  total: number
  created_at: string
}

interface DppActivoResumen {
  id: string
  codigo_dpp: string
  nombre: string
  estado: string
}

interface Atributo { id: string; clave: string; valor: string | null }

// Mismos 7 estados y colores que ya usa /empresa/cotizador — nunca se
// inventan colores nuevos para el mismo dato.
const ESTADOS_COTIZACION: Record<string, { label: string; color: string }> = {
  por_cotizar: { label: 'Por cotizar', color: 'text-[#474747]/60 bg-[#474747]/08' },
  enviada: { label: 'Enviada', color: 'text-[#59A6E4] bg-[#59A6E4]/10' },
  en_negociacion: { label: 'En negociación', color: 'text-[#F6BF3E] bg-[#F6BF3E]/10' },
  esperando_anticipo: { label: 'Esperando anticipo', color: 'text-[#38B98E] bg-[#38B98E]/10' },
  cerrado_ganado: { label: 'Cerrado ganado', color: 'text-[#00827C] bg-[#00827C]/10' },
  cerrado_perdido: { label: 'Cerrado perdido', color: 'text-[#FF5E4B] bg-[#FF5E4B]/10' },
  cerrado_inviable: { label: 'Inviable', color: 'text-[#474747]/40 bg-[#474747]/05' },
}


export default function DetalleClientePage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-[var(--bg-primary)]" />}>
      <DetalleClienteContent />
    </Suspense>
  )
}

function DetalleClienteContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const empresaIdParam = searchParams.get('empresa_id')
  const conEmpresa = useCallback((url: string) =>
    empresaIdParam ? `${url}${url.includes('?') ? '&' : '?'}empresa_id=${empresaIdParam}` : url,
    [empresaIdParam])

  const [cliente, setCliente] = useState<ClienteDetalle | null>(null)
  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([])
  const [dppActivos, setDppActivos] = useState<DppActivoResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [identificacion, setIdentificacion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [telefonoIndicativo, setTelefonoIndicativo] = useState<Pais>(PAISES[0])
  const [telefonoOriginal, setTelefonoOriginal] = useState('')
  const [confirmandoTelefono, setConfirmandoTelefono] = useState(false)
  const [email, setEmail] = useState('')
  const [pais, setPais] = useState('Colombia')
  const [ciudad, setCiudad] = useState(CIUDAD_DEFECTO)
  const [direccion, setDireccion] = useState('')
  const [direccionNotas, setDireccionNotas] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [nombreComercial, setNombreComercial] = useState('')

  interface ContactoHermano { id: string; nombre: string; apellido: string | null; telefono: string | null; telefono_indicativo: string | null; email: string | null }
  const [otrosContactos, setOtrosContactos] = useState<ContactoHermano[]>([])
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false)
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', apellido: '', telefono: '', email: '' })
  const [nuevoIndicativo, setNuevoIndicativo] = useState<Pais>(PAISES[0])
  const [agregandoContacto, setAgregandoContacto] = useState(false)
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null)

  const [atributos, setAtributos] = useState<Atributo[]>([])
  const [nuevaClave, setNuevaClave] = useState('')
  const [nuevoValor, setNuevoValor] = useState('')

  const [tickets, setTickets] = useState<TicketResumen[]>([])
  const [mostrandoCrearTicket, setMostrandoCrearTicket] = useState(false)
  const [ticketTitulo, setTicketTitulo] = useState('')
  const [ticketTipo, setTicketTipo] = useState<TipoTicket>('duda')
  const [ticketMensaje, setTicketMensaje] = useState('')
  const [creandoTicket, setCreandoTicket] = useState(false)
  const [errorTicket, setErrorTicket] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    async function cargar() {
      setCargando(true)
      try {
        const [resCliente, resAtributos, resTickets] = await Promise.all([
          fetch(conEmpresa(`/api/cotizador/clientes/${id}`)),
          fetch(conEmpresa(`/api/crm/clientes/${id}/atributos`)),
          fetch(conEmpresa(`/api/tickets?cliente_id=${id}`)),
        ])
        const dCliente = await resCliente.json()
        const dAtributos = await resAtributos.json()
        const dTickets = await resTickets.json()
        if (dTickets.data) setTickets(dTickets.data)
        if (dCliente.cliente) {
          const c: ClienteDetalle = dCliente.cliente
          setCliente(c)
          setCotizaciones(dCliente.cotizaciones ?? [])
          setDppActivos(dCliente.dpp_activos ?? [])
          setNombre(c.nombre); setApellido(c.apellido ?? ''); setEmail(c.email ?? '')
          setIdentificacion(c.identificacion ?? '')
          setTelefono(c.telefono ?? ''); setTelefonoOriginal(c.telefono ?? '')
          setTelefonoIndicativo(PAISES.find(p => p.dial === c.telefono_indicativo) ?? PAISES[0])
          setPais(c.pais ?? 'Colombia')
          setCiudad(c.ciudad ?? CIUDAD_DEFECTO); setDireccion(c.direccion ?? '')
          setDireccionNotas(c.direccion_notas ?? '')
          const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
          if (emp) {
            setRazonSocial(emp.razon_social); setNombreComercial(emp.nombre_comercial ?? '')
            const resHermanos = await fetch(conEmpresa(`/api/cotizador/clientes?q=&empresa_cliente_id=${emp.id}`))
            const dHermanos = await resHermanos.json().catch(() => null)
            if (dHermanos?.clientes) {
              setOtrosContactos(
                dHermanos.clientes.filter((h: ClienteDetalle) => h.es_contacto_real && h.id !== c.id)
              )
            }
          }
        } else {
          setError('Cliente no encontrado.')
        }
        if (dAtributos.data) setAtributos(dAtributos.data)
      } catch {
        setError('No se pudo cargar el cliente. Intenta de nuevo.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id, conEmpresa])

  async function guardar() {
    if (!id) return
    setGuardando(true)
    setError(null)
    try {
      const emp = cliente && (Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes)
      const res = await fetch(conEmpresa(`/api/cotizador/clientes/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, apellido: apellido || null, identificacion: identificacion || null, email: email || null,
          telefono: telefono || null, telefono_indicativo: telefonoIndicativo.dial,
          pais: pais || null, ciudad: ciudad || null, direccion: direccion || null,
          direccion_notas: direccionNotas || null,
          ...(emp ? { razon_social: razonSocial, nombre_comercial: nombreComercial || null } : {}),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al guardar.'); setGuardando(false); return }
      setCliente(d.cliente)
      setTelefonoOriginal(telefono)
      setConfirmandoTelefono(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // El celular es el dato principal de contacto de un cliente (WhatsApp,
  // seguimiento de cotización) — cambiarlo pide confirmación aparte, el
  // resto de campos se guarda directo. Directriz explícita del usuario.
  function intentarGuardar() {
    if (telefonoOriginal && telefono !== telefonoOriginal) { setConfirmandoTelefono(true); return }
    guardar()
  }

  async function agregarContactoNuevo() {
    const emp = cliente && (Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes)
    if (!emp) return
    if (!nuevoContacto.nombre.trim()) {
      setErrorAgregar('El nombre del contacto es obligatorio.')
      return
    }
    setAgregandoContacto(true)
    setErrorAgregar(null)
    try {
      const res = await fetch(conEmpresa('/api/cotizador/clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'empresa',
          nit: emp.nit,
          razon_social: emp.razon_social,
          nombre_comercial: emp.nombre_comercial || undefined,
          nombre: nuevoContacto.nombre.trim() || undefined,
          apellido: nuevoContacto.apellido.trim() || undefined,
          telefono: nuevoContacto.telefono.trim() || undefined,
          telefono_indicativo: nuevoIndicativo.dial,
          email: nuevoContacto.email.trim() || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setErrorAgregar(d.error ?? 'No se pudo agregar el contacto.'); return }
      setOtrosContactos(prev => [...prev, d.cliente])
      setNuevoContacto({ nombre: '', apellido: '', telefono: '', email: '' })
      setModalAgregarAbierto(false)
    } catch {
      setErrorAgregar('Error de conexión. Intenta de nuevo.')
    } finally {
      setAgregandoContacto(false)
    }
  }

  async function agregarAtributo() {
    if (!id || !nuevaClave.trim()) return
    const res = await fetch(conEmpresa(`/api/crm/clientes/${id}/atributos`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: nuevaClave.trim(), valor: nuevoValor.trim() || undefined }),
    })
    const d = await res.json()
    if (res.ok && d.data) {
      setAtributos(prev => {
        const sinDuplicado = prev.filter(a => a.clave !== d.data.clave)
        return [...sinDuplicado, d.data]
      })
      setNuevaClave(''); setNuevoValor('')
    }
  }

  async function crearTicket() {
    if (!id || ticketTitulo.trim().length < 5 || ticketMensaje.trim().length < 10) {
      setErrorTicket('El título y el mensaje son obligatorios (mínimo 5 y 10 caracteres).')
      return
    }
    setCreandoTicket(true)
    setErrorTicket(null)
    try {
      const res = await fetch(conEmpresa('/api/tickets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: ticketTitulo.trim(),
          tipo: ticketTipo,
          prioridad: 'media',
          mensaje_html: ticketMensaje.trim().replace(/\n/g, '<br>'),
          cliente_id: id,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setErrorTicket(d.error ?? 'Error al crear el ticket.'); return }
      setMostrandoCrearTicket(false)
      setTicketTitulo(''); setTicketMensaje(''); setTicketTipo('duda')
      const resTickets = await fetch(conEmpresa(`/api/tickets?cliente_id=${id}`))
      const dTickets = await resTickets.json()
      if (dTickets.data) setTickets(dTickets.data)
    } catch {
      setErrorTicket('Error de conexión. Intenta de nuevo.')
    } finally {
      setCreandoTicket(false)
    }
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'
  const inputSt = 'w-full px-3 py-2.5 rounded-xl border text-sm bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'

  if (cargando) {
    return (
      <div className="h-full min-h-[60vh] bg-[var(--bg-primary)]">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SkeletonLista filas={3} />
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center bg-[var(--bg-primary)]">
        <p className={ts}>{error ?? 'Cliente no encontrado.'}</p>
      </div>
    )
  }

  const emp = Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes

  return (
    <div className="pb-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(conEmpresa('/empresa/clientes'))} className="p-2 rounded-full hover-pop hover-press hover:bg-[#00827C]/08 transition-colors">
            <ArrowLeft size={20} className={tp} />
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs ${ts} truncate`}>{cliente.tipo === 'empresa' ? 'Cliente empresa' : 'Cliente persona'}</p>
            <p className={`text-base font-semibold truncate ${tp}`}>{cliente.nombre} {cliente.apellido ?? ''}</p>
          </div>
        </div>

        {/* Mobile: una columna. Desde `lg`: dos columnas por defecto —
            izquierda datos editables, derecha trazabilidad (cotizaciones,
            DPP, notas) — mismo patrón de grid-cols-1 lg:grid-cols-2 que el
            resto de pantallas nuevas de esta sesión. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
        {/* Datos de empresa (B2B) — primero, es el cliente real */}
        {emp && (
          <div className={`rounded-[12px] border p-4 ${cardBg}`}>
            <p className={`text-xs font-semibold mb-3 ${ts}`}>Empresa cliente · NIT {emp.nit}</p>
            <div className="mb-3">
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Razón social</label>
              <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className={inputSt} />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre comercial</label>
              <input value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} className={inputSt} placeholder="Opcional" />
            </div>
          </div>
        )}

        {/* Otros contactos de esta empresa + agregar uno nuevo */}
        {emp && (
          <div className={`rounded-[12px] border p-4 ${cardBg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-xs font-semibold ${ts}`}>Otros contactos de esta empresa</p>
              <button type="button" onClick={() => setModalAgregarAbierto(true)} className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
                + Agregar contacto
              </button>
            </div>
            {otrosContactos.length === 0 ? (
              <p className={`text-xs italic ${ts}`}>Ningún otro contacto todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {otrosContactos.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => router.push(conEmpresa(`/empresa/clientes/${h.id}`))}
                    className="w-full text-left p-2.5 rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <p className={`text-xs font-semibold ${tp}`}>{h.nombre} {h.apellido ?? ''}</p>
                    {h.telefono && <p className={`text-[11px] ${ts}`}>{formatTelefonoVista(h.telefono, h.telefono_indicativo)}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Datos del contacto actual — segundo, es opcional para B2B */}
        <div className={`rounded-[12px] border p-4 ${cardBg}`}>
          <p className={`text-xs font-semibold mb-3 ${ts}`}>{emp ? 'Este contacto (opcional)' : 'Datos del contacto'}</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputSt} placeholder={emp ? 'Opcional' : undefined} />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Apellido</label>
              <input value={apellido} onChange={e => setApellido(e.target.value)} className={inputSt} />
            </div>
          </div>
          {cliente.tipo === 'persona' && (
            <div className="mb-3">
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Cédula</label>
              <input value={identificacion} onChange={e => setIdentificacion(e.target.value)} className={inputSt} placeholder="Opcional" inputMode="numeric" />
            </div>
          )}
          <div className="mb-3">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Celular</label>
            <div className="flex gap-2">
              <SelectorPais value={telefonoIndicativo} onChange={setTelefonoIndicativo} />
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Número de celular"
                inputMode="tel"
                className={`${inputSt} flex-1`}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Correo</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputSt} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>País</label>
              <SelectorPais value={pais} onChange={setPais} />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Ciudad</label>
              <SelectorCiudad value={ciudad} onChange={setCiudad} pais={pais} conEmpresa={conEmpresa} />
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Dirección</label>
            <InputDireccion value={direccion} onChange={setDireccion} paisCodigo={PAISES.find(p => p.nombre === pais)?.codigo} paisNombre={pais} ciudad={ciudad} />
          </div>
          <div className="mt-3">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Notas sobre la dirección</label>
            <input value={direccionNotas} onChange={e => setDireccionNotas(e.target.value)} className={inputSt} placeholder="Ej. torre, apto, punto de referencia" />
          </div>
        </div>

        {error && <p className="text-sm text-[#FF5E4B]">{error}</p>}

        <div className="flex justify-start">
          <Button onClick={intentarGuardar} loading={guardando} size="sm" icon={<Save size={14} />}>
            Guardar
          </Button>
        </div>
        {/* Atributos personalizados */}
        <div className={`rounded-[12px] border p-4 ${cardBg}`}>
          <p className={`text-xs font-semibold mb-3 ${ts}`}>Atributos personalizados</p>
          {atributos.length === 0 && <p className={`text-xs italic mb-3 ${ts}`}>Sin atributos todavía.</p>}
          <div className="space-y-2 mb-3">
            {atributos.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className={`font-medium ${tp}`}>{a.clave}</span>
                <span className={ts}>{a.valor ?? '—'}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="Clave (ej. Horario preferido)" className={`${inputSt} flex-1`} />
            <input value={nuevoValor} onChange={e => setNuevoValor(e.target.value)} placeholder="Valor" className={`${inputSt} flex-1`} />
            <button onClick={agregarAtributo} className="hover-pop hover-press p-2.5 rounded-xl bg-[#00827C]/10 flex-shrink-0" title="Agregar">
              <Plus size={16} className="text-[#00827C]" />
            </button>
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-4">
        {/* Historial de cotizaciones — código, estado (mismo color que el
            kanban), fecha y total, para que se pueda leer el recorrido sin
            tener que abrir cada una. */}
        {cotizaciones.length > 0 && (
          <div className={`rounded-[12px] border p-4 ${cardBg}`}>
            <p className={`text-xs font-semibold mb-3 ${ts}`}>Historial de cotizaciones</p>
            <div className="space-y-2">
              {cotizaciones.map(c => {
                const est = ESTADOS_COTIZACION[c.estado] ?? ESTADOS_COTIZACION['por_cotizar']
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(conEmpresa(`/empresa/cotizador/${c.id}`))}
                    className={`w-full text-left p-3 rounded-[10px] border transition-colors hover-pop ${cardBg} hover:bg-[var(--bg-hover)]`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-sm font-semibold ${tp}`}>{formatCodigoCotizacion(c.codigo_cotizacion)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${est.color}`}>{est.label}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${ts}`}>{formatFecha(c.created_at)}</span>
                      <span className={`text-sm font-bold ${tp}`}>{formatCOP(c.total)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Tickets de soporte relacionados con este cliente — la empresa
            puede registrar un caso puntual sobre él y verlo aparecer aquí,
            sin que tenga que buscarlo entre todos los tickets de /ayuda. */}
        <div className={`rounded-[12px] border p-4 ${cardBg}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-xs font-semibold ${ts}`}>Tickets de soporte</p>
            <button
              type="button"
              onClick={() => setMostrandoCrearTicket(true)}
              className="flex items-center gap-1 text-xs font-semibold rounded-[6px] px-2 py-1 hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--color-brand)' }}
            >
              <Plus size={14} sinAnimacion /> Nuevo
            </button>
          </div>
          {tickets.length === 0 ? (
            <p className={`text-xs italic ${ts}`}>Sin tickets todavía.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map(t => (
                <div key={t.id} className={`p-3 rounded-[10px] border ${cardBg}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-sm font-semibold ${tp}`}>{t.titulo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ESTADO_TICKET_COLOR[t.estado]}`}>
                      {t.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs ${ts}`}>{TIPO_TICKET_LABELS[t.tipo]}</span>
                    <span className={`text-xs ${ts}`}>{formatFecha(t.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pasaportes DPP de los ítems de este cliente — siempre opcional, un
            cliente puede no tener ninguno todavía. */}
        {dppActivos.length > 0 && (
          <div className={`rounded-[12px] border p-4 ${cardBg}`}>
            <p className={`text-xs font-semibold mb-3 ${ts}`}>Pasaportes DPP</p>
            <div className="space-y-2">
              {dppActivos.map(a => (
                <button
                  key={a.id}
                  onClick={() => router.push(conEmpresa(`/empresa/dpp/${a.id}`))}
                  className="w-full flex items-center justify-between gap-2 text-left hover-pop"
                >
                  <span className={`text-sm ${tp}`}>{a.nombre}</span>
                  <span className={`text-xs ${ts}`}>{a.codigo_dpp}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notas privadas del cliente */}
        <div className={`rounded-[12px] border p-4 ${cardBg}`}>
          <p className={`text-xs font-semibold mb-3 ${ts}`}>Notas privadas</p>
          <HiloNotas endpointBase={conEmpresa(`/api/crm/clientes/${id}/notas`)} placeholder="Escribe una nota sobre este cliente..." />
        </div>
        </div>
        </div>
      </div>

      <Modal
        abierto={mostrandoCrearTicket}
        onClose={() => !creandoTicket && setMostrandoCrearTicket(false)}
        titulo="Nuevo ticket de soporte"
        descripcion={`Se vincula a ${nombre} ${apellido}.`}
        textoConfirmar={creandoTicket ? 'Creando...' : 'Crear ticket'}
        onConfirmar={crearTicket}
      >
        <div className="flex flex-col gap-3">
          {errorTicket && <p className="text-sm text-[#FF5E4B]">{errorTicket}</p>}
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Asunto</label>
            <input value={ticketTitulo} onChange={e => setTicketTitulo(e.target.value)} className={inputSt} placeholder="Describe brevemente el caso" />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Tipo</label>
            <Selector
              value={ticketTipo}
              onChange={val => setTicketTipo(val as TipoTicket)}
              opciones={Object.entries(TIPO_TICKET_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Detalles</label>
            <textarea
              value={ticketMensaje}
              onChange={e => setTicketMensaje(e.target.value)}
              rows={4}
              className={inputSt}
              placeholder="Cuenta qué pasó con este cliente..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        abierto={confirmandoTelefono}
        onClose={() => !guardando && setConfirmandoTelefono(false)}
        titulo="Cambiar el celular del cliente"
        descripcion="Es el dato principal de contacto."
        varianteConfirmar="error"
        textoConfirmar={guardando ? 'Guardando...' : 'Sí, cambiarlo'}
        onConfirmar={guardar}
      >
        <p className={`text-sm ${ts}`}>
          Vas a cambiar el celular de {nombre} {apellido}. Este número se usa para contactarlo por WhatsApp y hacerle seguimiento a sus cotizaciones.
        </p>
      </Modal>

      <Modal
        abierto={modalAgregarAbierto}
        onClose={() => !agregandoContacto && setModalAgregarAbierto(false)}
        titulo="Agregar contacto"
        descripcion={`Nuevo contacto de ${emp?.razon_social ?? 'esta empresa'}.`}
        textoConfirmar={agregandoContacto ? 'Agregando...' : 'Agregar'}
        onConfirmar={() => { if (!agregandoContacto) agregarContactoNuevo() }}
      >
        <div className="flex flex-col gap-3">
          {errorAgregar && <p className="text-sm text-[#FF5E4B]">{errorAgregar}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input value={nuevoContacto.nombre} onChange={e => setNuevoContacto(p => ({ ...p, nombre: e.target.value }))} className={inputSt} placeholder="Nombre" />
            <input value={nuevoContacto.apellido} onChange={e => setNuevoContacto(p => ({ ...p, apellido: e.target.value }))} className={inputSt} placeholder="Apellido" />
          </div>
          <div className="flex gap-2">
            <SelectorPais value={nuevoIndicativo} onChange={setNuevoIndicativo} />
            <input
              value={nuevoContacto.telefono}
              onChange={e => setNuevoContacto(p => ({ ...p, telefono: e.target.value.replace(/[^\d]/g, '') }))}
              placeholder="Celular (opcional)"
              inputMode="tel"
              className={`${inputSt} flex-1`}
            />
          </div>
          <input value={nuevoContacto.email} onChange={e => setNuevoContacto(p => ({ ...p, email: e.target.value }))} className={inputSt} placeholder="Correo (opcional)" type="email" />
        </div>
      </Modal>
    </div>
  )
}
