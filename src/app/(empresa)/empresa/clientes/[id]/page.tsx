'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { HiloNotas } from '@/components/crm/hilo-notas'
import { formatCOP, formatFecha } from '@/lib/format'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { SelectorCiudad, CIUDAD_DEFECTO } from '@/components/ui/selector-ciudad'
import { InputDireccion } from '@/components/ui/input-direccion'
import { InputTelefono } from '@/components/ui/input-telefono'
import { InputDocumento } from '@/components/ui/input-documento'
import { SelectorCiiu } from '@/components/ui/selector-ciiu'
import { Selector } from '@/components/ui/selector'
import { formatTelefonoVista } from '@/lib/telefono'
import type { TipoTicket, EstadoTicket } from '@/components/soporte/lista-tickets'
import { DetallePagina, SeccionDetalle, PieDetalle, EncabezadoDetalle, DetalleGrid, DetalleColumna } from '@/components/ui/detalle-pagina'
import { CampoFormulario, CLASE_CAMPO, CLASE_ETIQUETA } from '@/components/ui/campo-formulario'
import { esNombreDeEmpresa } from '@/lib/es-nombre-empresa'

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
  abierto: 'text-brand bg-brand-light',
  en_proceso: 'text-[#AD7C43] bg-[rgba(173,124,67,0.1)]',
  resuelto: 'text-(--color-success-content) bg-[rgba(56,185,142,0.1)]',
  cerrado: 'text-(--text-secondary) bg-(--bg-hover)',
}

interface EmpresaClienteDetalle {
  id: string
  nit: string
  razon_social: string
  nombre_comercial: string | null
  nombres_comerciales: string[] | null
  direccion: string | null
  pais: string | null
  ciudad: string | null
  direccion_notas: string | null
  sedes: Array<{nombre: string; pais?: string; ciudad?: string; direccion?: string}> | null
  sector: string | null
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
  telefonos_extra: Array<{ indicativo: string; numero: string }> | null
  correos_extra: string[] | null
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

interface AtributoEmpresa { id: string; clave: string; valor: string | null }

// Mismos 7 estados y colores que ya usa /empresa/cotizador — nunca se
// inventan colores nuevos para el mismo dato.
const ESTADOS_COTIZACION: Record<string, { label: string; color: string }> = {
  por_cotizar: { label: 'Por cotizar', color: 'text-[#474747]/60 ' },
  enviada: { label: 'Enviada', color: 'text-[#59A6E4] bg-[#59A6E4]/10' },
  en_negociacion: { label: 'En negociación', color: 'text-[#F6BF3E] bg-[#F6BF3E]/10' },
  esperando_anticipo: { label: 'Esperando anticipo', color: 'text-[#38B98E] bg-[#38B98E]/10' },
  cerrado_ganado: { label: 'Cerrado ganado', color: 'text-[#00827C] bg-[#00827C]/10' },
  cerrado_perdido: { label: 'Cerrado perdido', color: 'text-[#FF5E4B] bg-[#FF5E4B]/10' },
  cerrado_inviable: { label: 'Inviable', color: 'text-[#474747]/40 bg-[#474747]/05' },
}


export default function DetalleClientePage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-(--bg-primary)" />}>
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
  const [mostrandoNotasDireccion, setMostrandoNotasDireccion] = useState(false)
  const [razonSocial, setRazonSocial] = useState('')
  const [sector, setSector] = useState('')
  const [nombresComerciales, setNombresComerciales] = useState<string[]>([])
  const [nuevoNombreComercial, setNuevoNombreComercial] = useState('')
  const [telefonosExtra, setTelefonosExtra] = useState<Array<{ indicativo: string; numero: string }>>([])
  const [correosExtra, setCorreosExtra] = useState<string[]>([])
  const [atributosEmpresa, setAtributosEmpresa] = useState<AtributoEmpresa[]>([])
  const [nuevaClaveEmpresa, setNuevaClaveEmpresa] = useState('')
  const [nuevoValorEmpresa, setNuevoValorEmpresa] = useState('')
  const [empresaPais, setEmpresaPais] = useState('Colombia')
  const [empresaCiudad, setEmpresaCiudad] = useState(CIUDAD_DEFECTO)
  const [empresaDireccion, setEmpresaDireccion] = useState('')
  const [empresaDireccionNotas, setEmpresaDireccionNotas] = useState('')
  const [empresaSedes, setEmpresaSedes] = useState<Array<{nombre: string; pais?: string; ciudad?: string; direccion?: string}>>([])
  const [nuevaSede, setNuevaSede] = useState({ nombre: '', direccion: '' })

  interface ContactoHermano { id: string; nombre: string; apellido: string | null; telefono: string | null; telefono_indicativo: string | null; email: string | null }
  const [otrosContactos, setOtrosContactos] = useState<ContactoHermano[]>([])
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false)
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', apellido: '', telefono: '', email: '' })
  const [nuevoIndicativo, setNuevoIndicativo] = useState<Pais>(PAISES[0])
  const [agregandoContacto, setAgregandoContacto] = useState(false)
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null)

  // Modal convertir persona en empresa
  const [mostrandoConvertir, setMostrandoConvertir] = useState(false)
  const [convertirNit, setConvertirNit] = useState('')
  const [convertirRazonSocial, setConvertirRazonSocial] = useState('')
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [errorConvertir, setErrorConvertir] = useState<string | null>(null)

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
      setError(null)
      try {
        const [resCliente, resTickets] = await Promise.all([
          fetch(conEmpresa(`/api/cotizador/clientes/${id}`)),
          fetch(conEmpresa(`/api/tickets?cliente_id=${id}`)).catch(() => null),
        ])

        const dCliente = await resCliente.json().catch(() => null)

        if (!resCliente.ok || !dCliente?.cliente) {
          if (resCliente.status === 401) {
            setError(dCliente?.error ?? 'Tu sesión expiró o no ha iniciado. Inicia sesión para continuar.')
          } else if (resCliente.status === 403) {
            setError(dCliente?.error ?? 'No tienes permisos para ver este cliente.')
          } else if (resCliente.status === 404) {
            setError('Cliente no encontrado.')
          } else {
            setError(dCliente?.error ?? 'No se pudo cargar el cliente.')
          }
          return
        }

        const c: ClienteDetalle = dCliente.cliente

        // Si es un contacto de empresa, redirigir a la página propia de la empresa
        if (c.empresa_cliente_id) {
          router.replace(conEmpresa(`/empresa/clientes/empresa/${c.empresa_cliente_id}`))
          return
        }

        setCliente(c)
        setCotizaciones(dCliente.cotizaciones ?? [])
        setDppActivos(dCliente.dpp_activos ?? [])
        setNombre(c.nombre ?? '')
        setApellido(c.apellido ?? '')
        setEmail(c.email ?? '')
        setIdentificacion(c.identificacion ?? '')
        setTelefono(c.telefono ?? '')
        setTelefonoOriginal(c.telefono ?? '')
        setTelefonoIndicativo(PAISES.find(p => p.dial === c.telefono_indicativo) ?? PAISES[0])
        setPais(c.pais ?? 'Colombia')
        setCiudad(c.ciudad ?? CIUDAD_DEFECTO)
        setDireccion(c.direccion ?? '')
        setDireccionNotas(c.direccion_notas ?? '')
        if (c.direccion_notas) setMostrandoNotasDireccion(true)
        setTelefonosExtra(c.telefonos_extra ?? [])
        setCorreosExtra(c.correos_extra ?? [])

        const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
        if (emp) {
          setRazonSocial(emp.razon_social ?? '')
          setSector(emp.sector ?? '')
          setNombresComerciales(emp.nombres_comerciales ?? [])
          setEmpresaPais(emp.pais ?? 'Colombia')
          setEmpresaCiudad(emp.ciudad ?? CIUDAD_DEFECTO)
          setEmpresaDireccion(emp.direccion ?? '')
          setEmpresaDireccionNotas(emp.direccion_notas ?? '')
          setEmpresaSedes(emp.sedes ?? [])
          const resHermanos = await fetch(conEmpresa(`/api/cotizador/clientes?q=&empresa_cliente_id=${emp.id}`)).catch(() => null)
          if (resHermanos && resHermanos.ok) {
            const dHermanos = await resHermanos.json().catch(() => null)
            if (Array.isArray(dHermanos?.clientes)) {
              setOtrosContactos(
                dHermanos.clientes.filter((h: ClienteDetalle) => h.es_contacto_real && h.id !== c.id)
              )
            }
          }
          const resAtributosEmpresa = await fetch(conEmpresa(`/api/crm/empresas-clientes/${emp.id}/atributos`)).catch(() => null)
          if (resAtributosEmpresa?.ok) {
            const d = await resAtributosEmpresa.json().catch(() => null)
            if (Array.isArray(d?.data)) setAtributosEmpresa(d.data)
          }
        }

        // Carga enriquecida opcional: no bloquea ni rompe la visualización del cliente
        if (resTickets && resTickets.ok) {
          const dTickets = await resTickets.json().catch(() => null)
          if (Array.isArray(dTickets?.data)) setTickets(dTickets.data)
        }
      } catch (err) {
        console.error('[empresa/clientes/[id]] Error al cargar cliente:', err)
        setError('No se pudo cargar el cliente. Revisa tu conexión o intenta de nuevo.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id, conEmpresa])

  async function guardar() {
    if (!id) return
    const emp = cliente && (Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes)
    if (emp && nombre.trim() && esNombreDeEmpresa(nombre)) {
      setError('El nombre parece ser de una empresa. Los contactos vinculados deben ser personas naturales.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/clientes/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre, apellido: apellido || null, identificacion: identificacion || null, email: email || null,
          telefono: telefono || null, telefono_indicativo: telefonoIndicativo.dial,
          telefonos_extra: telefonosExtra,
          correos_extra: correosExtra,
          pais: pais || null, ciudad: ciudad || null, direccion: direccion || null,
          direccion_notas: direccionNotas || null,
          ...(emp ? {
            razon_social: razonSocial,
            sector: sector || null,
            nombres_comerciales: nombresComerciales,
            empresa_pais: empresaPais || null,
            empresa_ciudad: empresaCiudad || null,
            empresa_direccion: empresaDireccion || null,
            empresa_direccion_notas: empresaDireccionNotas || null,
            empresa_sedes: empresaSedes,
          } : {}),
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
    if (esNombreDeEmpresa(nuevoContacto.nombre)) {
      setErrorAgregar('El nombre parece ser de una empresa. Los contactos vinculados deben ser personas naturales.')
      return
    }
    setAgregandoContacto(true)
    setErrorAgregar(null)
    try {
      const res = await fetch(conEmpresa('/api/cotizador/clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'persona',
          empresa_cliente_id: emp.id,
          nombre: nuevoContacto.nombre.trim(),
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

  async function agregarAtributoEmpresa() {
    const emp = cliente && (Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes)
    if (!emp || !nuevaClaveEmpresa.trim()) return
    const res = await fetch(conEmpresa(`/api/crm/empresas-clientes/${emp.id}/atributos`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: nuevaClaveEmpresa.trim(), valor: nuevoValorEmpresa.trim() || undefined }),
    })
    const d = await res.json()
    if (res.ok && d.data) {
      setAtributosEmpresa(prev => {
        const sinDuplicado = prev.filter(a => a.clave !== d.data.clave)
        return [...sinDuplicado, d.data]
      })
      setNuevaClaveEmpresa(''); setNuevoValorEmpresa('')
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

  async function convertirEnEmpresa() {
    if (!id || !convertirNit.trim() || !convertirRazonSocial.trim()) {
      setErrorConvertir('NIT y razón social son obligatorios.')
      return
    }
    setConvirtiendo(true)
    setErrorConvertir(null)
    try {
      const res = await fetch(conEmpresa('/api/crm/empresas-clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nit: convertirNit.trim(),
          razon_social: convertirRazonSocial.trim(),
          cliente_id_vincular: id,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setErrorConvertir(d.error ?? 'Error al convertir.'); return }
      setMostrandoConvertir(false)
      router.push(conEmpresa(`/empresa/clientes/empresa/${d.empresa_cliente_id}`))
    } catch {
      setErrorConvertir('Error de conexión. Intenta de nuevo.')
    } finally {
      setConvirtiendo(false)
    }
  }

  if (cargando || !cliente) {
    return (
      <DetallePagina
        cargando={cargando}
        errorFatal={!cargando ? (error ?? 'Cliente no encontrado.') : null}
      />
    )
  }

  const emp = Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes
  return (
    <DetallePagina>
      <EncabezadoDetalle
        titulo={[nombre.trim(), apellido.trim()].filter(Boolean).join(' ') || 'Cliente'}
        subtitulo={emp?.razon_social ?? undefined}
        onVolver={() => router.push(conEmpresa('/empresa/clientes'))}
        textoVolver="Volver a clientes"
        meta={cliente.tipo === 'empresa' ? 'Cliente empresa' : 'Cliente persona'}
        extraMeta={cliente.tipo === 'persona' && !emp ? (
          <button
            type="button"
            onClick={() => {
              setConvertirNit(identificacion || '')
              setConvertirRazonSocial([nombre, apellido].filter(Boolean).join(' '))
              setErrorConvertir(null)
              setMostrandoConvertir(true)
            }}
            className="text-xs text-(--text-secondary) hover:text-brand"
            style={{ textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}
          >
            Convertir en empresa
          </button>
        ) : undefined}
      />

      <DetalleGrid>
        {/* Columna Izquierda: Información de Identidad, Contacto y Dirección */}
        <DetalleColumna>
          {/* Empresa cliente (B2B) */}
          {emp && (
            <SeccionDetalle titulo={`Empresa cliente · NIT ${emp.nit}`}>
              <CampoFormulario label="Razón social">
                <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className={CLASE_CAMPO} />
              </CampoFormulario>
              <CampoFormulario label="Nombres comerciales" compuesto>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {nombresComerciales.map((nc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand border border-brand/20">
                      {nc}
                      <button type="button" onClick={() => setNombresComerciales(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 hover:text-(--color-error)" title="Quitar">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={nuevoNombreComercial}
                    onChange={e => setNuevoNombreComercial(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = nuevoNombreComercial.trim()
                        if (v && !nombresComerciales.includes(v)) setNombresComerciales(prev => [...prev, v])
                        setNuevoNombreComercial('')
                      }
                    }}
                    className={`${CLASE_CAMPO} flex-1`}
                    placeholder="Añadir nombre comercial y presionar Enter"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = nuevoNombreComercial.trim()
                      if (v && !nombresComerciales.includes(v)) setNombresComerciales(prev => [...prev, v])
                      setNuevoNombreComercial('')
                    }}
                    className="hover-pop p-2.5 rounded-xl bg-brand-light shrink-0"
                  ><Plus size={16} className="text-brand" /></button>
                </div>
              </CampoFormulario>
              <div className="flex flex-col gap-1">
                <span className={CLASE_ETIQUETA}>Actividad económica (CIIU)</span>
                <SelectorCiiu value={sector} onChange={setSector} />
              </div>
              <div className="border-t border-(--border) pt-3 mt-1">
                <p className="text-xs font-semibold text-(--text-secondary) mb-2">Atributos personalizados</p>
                {atributosEmpresa.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3">
                    {atributosEmpresa.map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-(--text-primary)">{a.clave}</span>
                        <span className="text-(--text-secondary)">{a.valor ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={nuevaClaveEmpresa} onChange={e => setNuevaClaveEmpresa(e.target.value)} placeholder="Clave" className={`${CLASE_CAMPO} flex-1`} />
                  <input value={nuevoValorEmpresa} onChange={e => setNuevoValorEmpresa(e.target.value)} placeholder="Valor" className={`${CLASE_CAMPO} flex-1`} />
                  <button onClick={agregarAtributoEmpresa} className="hover-pop p-2.5 rounded-xl bg-brand-light shrink-0" title="Agregar"><Plus size={16} className="text-brand" /></button>
                </div>
              </div>

              <div className="border-t border-(--border) pt-3 mt-1">
                <p className="text-xs font-semibold text-(--text-secondary) mb-3">Dirección principal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className={CLASE_ETIQUETA}>País</span>
                    <SelectorPais value={empresaPais} onChange={setEmpresaPais} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={CLASE_ETIQUETA}>Ciudad</span>
                    <SelectorCiudad value={empresaCiudad} onChange={setEmpresaCiudad} pais={empresaPais} conEmpresa={conEmpresa} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-3">
                  <span className={CLASE_ETIQUETA}>Dirección</span>
                  <InputDireccion
                    value={empresaDireccion}
                    onChange={setEmpresaDireccion}
                    paisCodigo={PAISES.find(p => p.nombre === empresaPais)?.codigo}
                    paisNombre={empresaPais}
                    ciudad={empresaCiudad}
                  />
                </div>
                <div className="mt-3">
                  <CampoFormulario label="Notas sobre la dirección">
                    <input value={empresaDireccionNotas} onChange={e => setEmpresaDireccionNotas(e.target.value)} className={CLASE_CAMPO} placeholder="Torre, apto, referencia" />
                  </CampoFormulario>
                </div>
              </div>

              {empresaSedes.length > 0 && (
                <div className="border-t border-(--border) pt-3 mt-1">
                  <p className="text-xs font-semibold text-(--text-secondary) mb-2">Otras sedes</p>
                  <div className="flex flex-col gap-2">
                    {empresaSedes.map((s, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-(--bg-input) border border-(--border)">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-(--text-primary)">{s.nombre}</p>
                          {s.direccion && <p className="text-[11px] text-(--text-secondary) truncate">{s.direccion}</p>}
                        </div>
                        <button type="button" onClick={() => setEmpresaSedes(prev => prev.filter((_, j) => j !== i))} className="text-[11px] text-(--color-error) hover:underline shrink-0">Quitar</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-(--border) pt-3 mt-1">
                <p className="text-xs font-semibold text-(--text-secondary) mb-2">Agregar sede</p>
                <div className="flex gap-2">
                  <input value={nuevaSede.nombre} onChange={e => setNuevaSede(p => ({ ...p, nombre: e.target.value }))} className={`${CLASE_CAMPO} flex-1`} placeholder="Nombre de la sede" />
                  <input value={nuevaSede.direccion} onChange={e => setNuevaSede(p => ({ ...p, direccion: e.target.value }))} className={`${CLASE_CAMPO} flex-1`} placeholder="Dirección" />
                  <button
                    type="button"
                    onClick={() => {
                      if (!nuevaSede.nombre.trim()) return
                      setEmpresaSedes(prev => [...prev, { nombre: nuevaSede.nombre.trim(), direccion: nuevaSede.direccion.trim() || undefined }])
                      setNuevaSede({ nombre: '', direccion: '' })
                    }}
                    className="hover-pop p-2.5 rounded-xl bg-brand-light shrink-0"
                  ><Plus size={16} className="text-brand" /></button>
                </div>
              </div>
            </SeccionDetalle>
          )}

          {/* Otros contactos de esta empresa */}
          {emp && (
            <SeccionDetalle
              titulo="Otros contactos"
              acciones={
                <button type="button" onClick={() => setModalAgregarAbierto(true)} className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
                  + Agregar contacto
                </button>
              }
            >
              {otrosContactos.length === 0 ? (
                <p className="text-xs italic text-(--text-secondary)">Ningún otro contacto todavía.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {otrosContactos.map(h => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => router.push(conEmpresa(`/empresa/clientes/${h.id}`))}
                      className="w-full text-left p-2.5 rounded-xl bg-(--bg-input) border border-(--border) hover:bg-(--bg-hover) transition-colors"
                    >
                      <p className="text-xs font-semibold text-(--text-primary)">{h.nombre} {h.apellido ?? ''}</p>
                      {h.telefono && <p className="text-[11px] text-(--text-secondary)">{formatTelefonoVista(h.telefono, h.telefono_indicativo)}</p>}
                    </button>
                  ))}
                </div>
              )}
            </SeccionDetalle>
          )}

          {/* Datos del contacto */}
          <SeccionDetalle titulo={emp ? 'Este contacto (opcional)' : 'Datos del contacto'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CampoFormulario label="Nombre">
                <input value={nombre} onChange={e => setNombre(e.target.value)} className={CLASE_CAMPO} placeholder={emp ? 'Opcional' : undefined} />
              </CampoFormulario>
              <CampoFormulario label="Apellido">
                <input value={apellido} onChange={e => setApellido(e.target.value)} className={CLASE_CAMPO} />
              </CampoFormulario>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className={CLASE_ETIQUETA}>Celular</span>
                <InputTelefono
                  indicativo={telefonoIndicativo.dial}
                  onChangeIndicativo={val => {
                    const p = PAISES.find(item => item.dial === val)
                    if (p) setTelefonoIndicativo(p)
                  }}
                  telefono={telefono}
                  onChangeTelefono={setTelefono}
                />
              </div>
              {cliente.tipo === 'persona' && (
                <CampoFormulario label="Cédula">
                  <InputDocumento value={identificacion} onChange={setIdentificacion} placeholder="Opcional" />
                </CampoFormulario>
              )}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className={CLASE_ETIQUETA}>Correo</span>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={CLASE_CAMPO} />
              </div>
            </div>
          </SeccionDetalle>

          {/* Dirección — solo cuando no hay empresa vinculada */}
          {!emp && (
            <SeccionDetalle titulo="Dirección">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className={CLASE_ETIQUETA}>País</span>
                  <SelectorPais value={pais} onChange={setPais} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={CLASE_ETIQUETA}>Ciudad</span>
                  <SelectorCiudad value={ciudad} onChange={setCiudad} pais={pais} conEmpresa={conEmpresa} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className={CLASE_ETIQUETA}>Dirección</span>
                <InputDireccion value={direccion} onChange={setDireccion} paisCodigo={PAISES.find(p => p.nombre === pais)?.codigo} paisNombre={pais} ciudad={ciudad} />
              </div>
              {!mostrandoNotasDireccion ? (
                <button
                  type="button"
                  onClick={() => setMostrandoNotasDireccion(true)}
                  className="text-xs font-semibold text-left text-(--text-primary)"
                  style={{ textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}
                >
                  Notas sobre la dirección +
                </button>
              ) : (
                <CampoFormulario label="Notas sobre la dirección">
                  <input value={direccionNotas} onChange={e => setDireccionNotas(e.target.value)} className={CLASE_CAMPO} placeholder="Ej. torre, apto, punto de referencia" />
                </CampoFormulario>
              )}
            </SeccionDetalle>
          )}

        </DetalleColumna>

        {/* Columna Derecha: Historial, Tickets, Pasaportes y Notas (siempre al final) */}
        <DetalleColumna>
          {/* Historial de cotizaciones */}
          {cotizaciones.length > 0 && (
            <SeccionDetalle titulo="Historial de cotizaciones">
              <div className="flex flex-col gap-2">
                {cotizaciones.map(c => {
                  const est = ESTADOS_COTIZACION[c.estado] ?? ESTADOS_COTIZACION['por_cotizar']
                  return (
                    <button
                      key={c.id}
                      onClick={() => router.push(conEmpresa(`/empresa/cotizador/${c.id}`))}
                      className="w-full text-left p-3 rounded-xl border border-(--border) bg-(--bg-card) transition-colors hover:bg-(--bg-hover)"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-(--text-primary)">{formatCodigoCotizacion(c.codigo_cotizacion)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${est.color}`}>{est.label}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-(--text-secondary)">{formatFecha(c.created_at)}</span>
                        <span className="text-sm font-bold whitespace-nowrap text-(--text-primary)">{formatCOP(c.total)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </SeccionDetalle>
          )}

          {/* Tickets de soporte */}
          <SeccionDetalle
            titulo="Tickets de soporte"
            acciones={
              <button
                type="button"
                onClick={() => setMostrandoCrearTicket(true)}
                className="flex items-center gap-1 text-xs font-semibold rounded-[6px] px-2 py-1 hover:bg-(--bg-hover)"
                style={{ color: 'var(--color-brand)' }}
              >
                <Plus size={14} sinAnimacion /> Nuevo
              </button>
            }
          >
            {tickets.length > 0 && (
              <div className="flex flex-col gap-2">
                {tickets.map(t => (
                  <div key={t.id} className="p-3 rounded-xl border border-(--border) bg-(--bg-card)">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-(--text-primary)">{t.titulo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ESTADO_TICKET_COLOR[t.estado]}`}>
                        {t.estado.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-(--text-secondary)">{TIPO_TICKET_LABELS[t.tipo]}</span>
                      <span className="text-xs text-(--text-secondary)">{formatFecha(t.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SeccionDetalle>

          {/* Pasaportes DPP */}
          {dppActivos.length > 0 && (
            <SeccionDetalle titulo="Pasaportes DPP">
              <div className="flex flex-col gap-2">
                {dppActivos.map(a => (
                  <button
                    key={a.id}
                    onClick={() => router.push(conEmpresa(`/empresa/dpp/${a.id}`))}
                    className="w-full flex items-center justify-between gap-2 text-left hover-pop p-2 rounded-xl hover:bg-(--bg-hover)"
                  >
                    <span className="text-sm text-(--text-primary)">{a.nombre}</span>
                    <span className="text-xs text-(--text-secondary)">{a.codigo_dpp}</span>
                  </button>
                ))}
              </div>
            </SeccionDetalle>
          )}

          {/* Notas privadas — siempre al final */}
          <SeccionDetalle titulo="Notas privadas">
            <HiloNotas endpointBase={conEmpresa(`/api/crm/clientes/${id}/notas`)} placeholder="Escribe una nota sobre este cliente..." />
          </SeccionDetalle>
        </DetalleColumna>
      </DetalleGrid>

      {/* Pie */}
      <PieDetalle
        onGuardar={intentarGuardar}
        guardando={guardando}
        onVolver={() => router.push(conEmpresa('/empresa/clientes'))}
        extra={error ? <p className="text-sm text-[#FF5E4B]">{error}</p> : undefined}
      />
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
            <label className="text-xs font-semibold mb-1 block text-(--text-secondary)">Asunto</label>
            <input value={ticketTitulo} onChange={e => setTicketTitulo(e.target.value)} className={CLASE_CAMPO} placeholder="Describe brevemente el caso" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block text-(--text-secondary)">Tipo</label>
            <Selector
              value={ticketTipo}
              onChange={val => setTicketTipo(val as TipoTicket)}
              opciones={Object.entries(TIPO_TICKET_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block text-(--text-secondary)">Detalles</label>
            <textarea
              value={ticketMensaje}
              onChange={e => setTicketMensaje(e.target.value)}
              rows={4}
              className={`${CLASE_CAMPO} min-h-[80px]`}
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
        <p className="text-sm text-(--text-secondary)">
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
            <input value={nuevoContacto.nombre} onChange={e => setNuevoContacto(p => ({ ...p, nombre: e.target.value }))} className={CLASE_CAMPO} placeholder="Nombre" />
            <input value={nuevoContacto.apellido} onChange={e => setNuevoContacto(p => ({ ...p, apellido: e.target.value }))} className={CLASE_CAMPO} placeholder="Apellido" />
          </div>
          <InputTelefono
            indicativo={nuevoIndicativo.dial}
            onChangeIndicativo={val => {
              const p = PAISES.find(item => item.dial === val)
              if (p) setNuevoIndicativo(p)
            }}
            telefono={nuevoContacto.telefono}
            onChangeTelefono={val => setNuevoContacto(p => ({ ...p, telefono: val }))}
            placeholder="Celular (opcional)"
          />
          <input value={nuevoContacto.email} onChange={e => setNuevoContacto(p => ({ ...p, email: e.target.value }))} className={CLASE_CAMPO} placeholder="Correo (opcional)" type="email" />
        </div>
      </Modal>

      <Modal
        abierto={mostrandoConvertir}
        onClose={() => !convirtiendo && setMostrandoConvertir(false)}
        titulo="Convertir en empresa"
        textoConfirmar={convirtiendo ? 'Convirtiendo...' : 'Convertir'}
        onConfirmar={() => { if (!convirtiendo) convertirEnEmpresa() }}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-(--text-secondary)">
            Se creará una empresa cliente y este contacto quedará vinculado a ella.
          </p>
          {errorConvertir && <p className="text-sm text-[#FF5E4B]">{errorConvertir}</p>}
          <div>
            <label className="text-xs font-semibold mb-1 block text-(--text-secondary)">NIT</label>
            <input value={convertirNit} onChange={e => setConvertirNit(e.target.value)} className={CLASE_CAMPO} placeholder="Ej. 900123456" />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block text-(--text-secondary)">Razón social</label>
            <input value={convertirRazonSocial} onChange={e => setConvertirRazonSocial(e.target.value)} className={CLASE_CAMPO} placeholder="Nombre legal de la empresa" />
          </div>
        </div>
      </Modal>
    </DetallePagina>
  )
}
