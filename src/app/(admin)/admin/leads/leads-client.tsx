'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Inbox as Tray,
  Mail as Envelope,
  Phone,
  Pencil,
  Trash2,
  Download,
  Upload,
  Plus,
  DotsThree,
  Check,
  ChevronDown,
  Search as MagnifyingGlass,
  Square,
  SquareCheck,
  Calendar,
  X,
  FileText,
} from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { WA_NUMBER } from '@/lib/constants/contacto'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'
import { Pagination } from '@/components/ui/pagination'
import { BotonDescargar } from '@/components/boton-descargar'
import { SortTh } from '@/components/sort-th'
import type { SortState } from '@/lib/use-sortable'

const ESTADOS = ['nuevo', 'contactado', 'convertido', 'descartado'] as const
type EstadoLead = typeof ESTADOS[number]

// Paleta estricta certificada del Sistema de Diseño Reúso (Regla WCAG AA 04-ui-y-estetica)
// - Nuevo: Azul Info (#59A6E4 / texto #1E5D8F / bg 12%)
// - Contactado: Ámbar Alerta (#F6BF3E / texto #AD7C43 nogal / bg 15%)
// - Convertido: Verde Éxito (#38B98E / texto #156649 / bg 12%)
// - Descartado: Rojo Error (#FF5E4B / texto #CC3C2A / bg 10%)
const ESTADO_CONFIG: Record<
  EstadoLead,
  { label: string; bg: string; color: string; border: string; dot: string }
> = {
  nuevo: {
    label: 'Nuevo',
    bg: 'rgba(89, 166, 228, 0.12)',
    color: '#1E5D8F',
    border: 'rgba(89, 166, 228, 0.30)',
    dot: '#59A6E4',
  },
  contactado: {
    label: 'Contactado',
    bg: 'rgba(246, 191, 62, 0.15)',
    color: '#AD7C43',
    border: 'rgba(246, 191, 62, 0.35)',
    dot: '#F6BF3E',
  },
  convertido: {
    label: 'Convertido',
    bg: 'rgba(56, 185, 142, 0.12)',
    color: '#156649',
    border: 'rgba(56, 185, 142, 0.30)',
    dot: '#38B98E',
  },
  descartado: {
    label: 'Descartado',
    bg: 'rgba(255, 94, 75, 0.10)',
    color: '#CC3C2A',
    border: 'rgba(255, 94, 75, 0.25)',
    dot: '#FF5E4B',
  },
}

interface Lead {
  id: string
  nombre: string | null
  email: string | null
  telefono: string | null
  empresa: string | null
  interes: string | null
  mensaje: string | null
  estado: EstadoLead
  created_at: string
  evento_nombre?: string | null
}

interface Evento {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string | null
}

interface ContactoParseado {
  nombre: string
  apellido: string
  email: string
  telefono: string
  empresa: string
  interes: string
  evento_nombre: string
  mensaje: string
  estado: EstadoLead
}

function formatearFechaLead(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { dia: '-', hora: '' }
  const dia = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { dia, hora }
}

/** Separa un nombre completo en Nombre(s) y Apellido(s) para los formularios */
function partirNombreCompleto(nombreCompleto: string | null | undefined): { nombre: string; apellido: string } {
  if (!nombreCompleto) return { nombre: '', apellido: '' }
  const partes = nombreCompleto.trim().split(/\s+/)
  if (partes.length <= 1) return { nombre: partes[0] || '', apellido: '' }
  if (partes.length === 2) return { nombre: partes[0], apellido: partes[1] }
  if (partes.length === 3) return { nombre: partes.slice(0, 2).join(' '), apellido: partes[2] }
  return { nombre: partes.slice(0, 2).join(' '), apellido: partes.slice(2).join(' ') }
}

/** Parser de CSV robusto para importación de contactos */
function parsearCSVContactos(texto: string): ContactoParseado[] {
  const limpio = texto.replace(/^\uFEFF/, '').trim()
  if (!limpio) return []

  const lineas = limpio.split(/\r?\n/)
  if (lineas.length < 2) return []

  const sep = lineas[0].includes(';') ? ';' : ','

  function parseLinea(linea: string): string[] {
    const valores: string[] = []
    let actual = ''
    let dentroComillas = false

    for (let i = 0; i < linea.length; i++) {
      const c = linea[i]
      if (c === '"') {
        if (dentroComillas && linea[i + 1] === '"') {
          actual += '"'
          i++
        } else {
          dentroComillas = !dentroComillas
        }
      } else if (c === sep && !dentroComillas) {
        valores.push(actual.trim())
        actual = ''
      } else {
        actual += c
      }
    }
    valores.push(actual.trim())
    return valores
  }

  const cabeceras = parseLinea(lineas[0]).map(c =>
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  )

  const colNombre = cabeceras.findIndex(c => c === 'nombre' || c.startsWith('nombre'))
  const colApellido = cabeceras.findIndex(c => c === 'apellido' || c.startsWith('apellido'))
  const colEmail = cabeceras.findIndex(c => c.includes('email') || c.includes('correo'))
  const colTelefono = cabeceras.findIndex(c => c.includes('tel') || c.includes('cel') || c.includes('whatsapp'))
  const colEmpresa = cabeceras.findIndex(c => c.includes('empresa') || c.includes('organizacion'))
  const colInteres = cabeceras.findIndex(c => c.includes('interes') || c.includes('asunto') || c.includes('plan'))
  const colEvento = cabeceras.findIndex(c => c.includes('evento'))
  const colMensaje = cabeceras.findIndex(c => c.includes('mensaje') || c.includes('nota'))
  const colEstado = cabeceras.findIndex(c => c.includes('estado'))

  const contactos: ContactoParseado[] = []

  for (let i = 1; i < lineas.length; i++) {
    const rawLinea = lineas[i].trim()
    if (!rawLinea) continue
    const vals = parseLinea(rawLinea)

    const rawNombre = colNombre >= 0 ? vals[colNombre] ?? '' : vals[0] ?? ''
    const rawApellido = colApellido >= 0 ? vals[colApellido] ?? '' : ''
    const rawEmail = colEmail >= 0 ? vals[colEmail] ?? '' : ''
    const rawTel = colTelefono >= 0 ? vals[colTelefono] ?? '' : ''
    const rawEmpresa = colEmpresa >= 0 ? vals[colEmpresa] ?? '' : ''
    const rawInteres = colInteres >= 0 ? vals[colInteres] ?? '' : ''
    const rawEvento = colEvento >= 0 ? vals[colEvento] ?? '' : ''
    const rawMensaje = colMensaje >= 0 ? vals[colMensaje] ?? '' : ''
    let rawEstado = (colEstado >= 0 ? vals[colEstado] ?? '' : '').toLowerCase().trim()
    if (!['nuevo', 'contactado', 'convertido', 'descartado'].includes(rawEstado)) {
      rawEstado = 'nuevo'
    }

    if (rawNombre.trim() || rawEmail.trim() || rawTel.trim()) {
      contactos.push({
        nombre: rawNombre.trim(),
        apellido: rawApellido.trim(),
        email: rawEmail.trim(),
        telefono: rawTel.trim(),
        empresa: rawEmpresa.trim(),
        interes: rawInteres.trim(),
        evento_nombre: rawEvento.trim(),
        mensaje: rawMensaje.trim(),
        estado: rawEstado as EstadoLead,
      })
    }
  }

  return contactos
}

export function LeadsClient({
  leads: inicial,
  eventos: eventosIniciales = [],
}: {
  leads: Lead[]
  eventos?: Evento[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [leads, setLeads] = useState(inicial)

  // ── Filtros y búsqueda ──
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoLead | ''>('')
  const [filtroEvento, setFiltroEvento] = useState('')

  // ── Paginación canónica del sistema de diseño ──
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)

  // ── Ordenamiento por columna canónico del sistema de diseño (patrón Cotizador CRM) ──
  const [sort, setSort] = useState<SortState>({ col: 'created_at', dir: 'desc' })

  function toggleSort(col: string) {
    setSort(prev => {
      if (prev.col !== col) {
        return { col, dir: col === 'created_at' ? 'desc' : 'asc' }
      }
      if (prev.dir === 'asc') return { col, dir: 'desc' }
      if (prev.dir === 'desc') return { col: 'created_at', dir: 'desc' }
      return { col, dir: 'asc' }
    })
    setPagina(1)
  }

  // ── Selección múltiple para borrado en grupo ──
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [modalEliminarGrupo, setModalEliminarGrupo] = useState(false)
  const [eliminandoGrupo, setEliminandoGrupo] = useState(false)
  const [errorEliminarGrupo, setErrorEliminarGrupo] = useState('')

  // ── Estado individual y cambio rápido ──
  const [cambiando, setCambiando] = useState<string | null>(null)

  // ── Eliminar individual modal ──
  const [leadAEliminar, setLeadAEliminar] = useState<Lead | null>(null)
  const [eliminandoIndividual, setEliminandoIndividual] = useState(false)
  const [errorEliminarIndividual, setErrorEliminarIndividual] = useState('')

  // ── Panel de gestión de eventos ──
  const [eventos, setEventos] = useState(eventosIniciales)
  const [mostrarGestorEventos, setMostrarGestorEventos] = useState(false)
  const [evNombre, setEvNombre] = useState('')
  const [evFechaInicio, setEvFechaInicio] = useState('')
  const [evFechaFin, setEvFechaFin] = useState('')
  const [evError, setEvError] = useState('')
  const [evGuardando, setEvGuardando] = useState(false)

  // ── Modal de nuevo contacto manual ──
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [formCrear, setFormCrear] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    empresa: '',
    interes: '',
    evento_nombre: '',
    mensaje: '',
    estado: 'nuevo' as EstadoLead,
  })
  const [guardandoCrear, setGuardandoCrear] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  // ── Modal de edición de contacto con Nombre y Apellido separados ──
  const [leadEditando, setLeadEditando] = useState<Lead | null>(null)
  const [formEdit, setFormEdit] = useState({
    id: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    empresa: '',
    interes: '',
    evento_nombre: '',
    mensaje: '',
    estado: 'nuevo' as EstadoLead,
  })
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')

  // ── Modal de Importación de Contactos (Popup con descargable y adjunto) ──
  const [modalImportar, setModalImportar] = useState(false)
  const [archivoNombre, setArchivoNombre] = useState('')
  const [contactosParseados, setContactosParseados] = useState<ContactoParseado[]>([])
  const [importando, setImportando] = useState(false)
  const [errorImportar, setErrorImportar] = useState('')
  const [exitoImportar, setExitoImportar] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar leads cuando cambien desde el servidor
  useEffect(() => {
    setLeads(inicial)
  }, [inicial])

  // Limpiar selección de IDs que ya no existen
  useEffect(() => {
    setSeleccionados(prev => {
      const idsActuales = new Set(leads.map(l => l.id))
      const nuevos = new Set(Array.from(prev).filter(id => idsActuales.has(id)))
      return nuevos.size === prev.size ? prev : nuevos
    })
  }, [leads])

  // Reset de página al cambiar cualquier filtro
  useEffect(() => {
    setPagina(1)
  }, [busqueda, filtroEstado, filtroEvento])

  // ── Filtrado interactivo ──
  const filtrados = leads.filter(lead => {
    if (filtroEstado && lead.estado !== filtroEstado) return false
    if (filtroEvento && (lead.evento_nombre ?? '') !== filtroEvento) return false
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase().trim()
    return (
      (lead.nombre ?? '').toLowerCase().includes(q) ||
      (lead.email ?? '').toLowerCase().includes(q) ||
      (lead.empresa ?? '').toLowerCase().includes(q) ||
      (lead.telefono ?? '').toLowerCase().includes(q) ||
      (lead.interes ?? '').toLowerCase().includes(q) ||
      (lead.evento_nombre ?? '').toLowerCase().includes(q) ||
      (lead.mensaje ?? '').toLowerCase().includes(q)
    )
  })

  // Conteo de estados
  const conteos: Record<EstadoLead, number> = {
    nuevo: leads.filter(l => l.estado === 'nuevo').length,
    contactado: leads.filter(l => l.estado === 'contactado').length,
    convertido: leads.filter(l => l.estado === 'convertido').length,
    descartado: leads.filter(l => l.estado === 'descartado').length,
  }

  // ── Ordenamiento interactivo por columna (patrón Cotizador CRM) ──
  const filtradosOrdenados = useMemo(() => {
    if (!sort.col || !sort.dir) return filtrados

    const col = sort.col
    const dir = sort.dir

    return [...filtrados].sort((a, b) => {
      if (col === 'created_at') {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return dir === 'asc' ? ta - tb : tb - ta
      }

      if (col === 'nombre') {
        const na = (a.nombre ?? '').trim().toLowerCase()
        const nb = (b.nombre ?? '').trim().toLowerCase()
        return dir === 'asc' ? na.localeCompare(nb, 'es') : nb.localeCompare(na, 'es')
      }

      if (col === 'empresa') {
        const ea = (a.empresa ?? '').trim().toLowerCase()
        const eb = (b.empresa ?? '').trim().toLowerCase()
        return dir === 'asc' ? ea.localeCompare(eb, 'es') : eb.localeCompare(ea, 'es')
      }

      if (col === 'contacto') {
        const ca = (a.email || a.telefono || '').trim().toLowerCase()
        const cb = (b.email || b.telefono || '').trim().toLowerCase()
        return dir === 'asc' ? ca.localeCompare(cb, 'es') : cb.localeCompare(ca, 'es')
      }

      if (col === 'interes') {
        const ia = (a.evento_nombre || a.interes || '').trim().toLowerCase()
        const ib = (b.evento_nombre || b.interes || '').trim().toLowerCase()
        return dir === 'asc' ? ia.localeCompare(ib, 'es') : ib.localeCompare(ia, 'es')
      }

      if (col === 'estado') {
        const ea = (a.estado ?? '').toLowerCase()
        const eb = (b.estado ?? '').toLowerCase()
        return dir === 'asc' ? ea.localeCompare(eb, 'es') : eb.localeCompare(ea, 'es')
      }

      return 0
    })
  }, [filtrados, sort])

  // ── Paginación y corte de filas ──
  const totalFiltrados = filtradosOrdenados.length
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / porPagina))
  const filtradosPaginados = filtradosOrdenados.slice((pagina - 1) * porPagina, pagina * porPagina)

  // ── Selección masiva en página actual ──
  const todosSeleccionados =
    filtradosPaginados.length > 0 && filtradosPaginados.every(l => seleccionados.has(l.id))

  function toggleSeleccionarTodos() {
    setSeleccionados(prev => {
      if (todosSeleccionados) {
        const siguiente = new Set(prev)
        filtradosPaginados.forEach(l => siguiente.delete(l.id))
        return siguiente
      } else {
        const siguiente = new Set(prev)
        filtradosPaginados.forEach(l => siguiente.add(l.id))
        return siguiente
      }
    })
  }

  function toggleSeleccionado(id: string) {
    setSeleccionados(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  // ── Cambiar estado rápido ──
  async function cambiarEstado(id: string, nuevoEstado: EstadoLead) {
    setCambiando(id)
    const prev = leads.find(l => l.id === id)?.estado
    setLeads(ls => ls.map(l => (l.id === id ? { ...l, estado: nuevoEstado } : l)))

    const res = await fetch(`/api/admin/leads?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })

    setCambiando(null)
    if (!res.ok) {
      if (prev) setLeads(ls => ls.map(l => (l.id === id ? { ...l, estado: prev } : l)))
    } else {
      startTransition(() => router.refresh())
    }
  }

  // ── Eliminar individual ──
  async function confirmarEliminarIndividual() {
    if (!leadAEliminar) return
    setEliminandoIndividual(true)
    setErrorEliminarIndividual('')

    const res = await fetch(`/api/admin/leads?id=${leadAEliminar.id}`, { method: 'DELETE' })
    setEliminandoIndividual(false)

    if (res.ok) {
      setLeads(ls => ls.filter(l => l.id !== leadAEliminar.id))
      setSeleccionados(prev => {
        const nuevo = new Set(prev)
        nuevo.delete(leadAEliminar.id)
        return nuevo
      })
      setLeadAEliminar(null)
      startTransition(() => router.refresh())
    } else {
      const d = await res.json().catch(() => ({}))
      setErrorEliminarIndividual(d.error ?? 'No se pudo eliminar el contacto.')
    }
  }

  // ── Eliminar en grupo (batch delete) ──
  async function confirmarEliminarGrupo() {
    if (seleccionados.size === 0) return
    setEliminandoGrupo(true)
    setErrorEliminarGrupo('')

    const idsArray = Array.from(seleccionados)
    const res = await fetch(`/api/admin/leads?ids=${idsArray.join(',')}`, { method: 'DELETE' })
    setEliminandoGrupo(false)

    if (res.ok) {
      setLeads(ls => ls.filter(l => !seleccionados.has(l.id)))
      setSeleccionados(new Set())
      setModalEliminarGrupo(false)
      startTransition(() => router.refresh())
    } else {
      const d = await res.json().catch(() => ({}))
      setErrorEliminarGrupo(d.error ?? 'Error al eliminar los prospectos seleccionados.')
    }
  }

  // ── WhatsApp ──
  function abrirWhatsApp(lead: Lead) {
    const rawTel = lead.telefono ? lead.telefono.replace(/[^\d+]/g, '') : ''
    const tel = rawTel.length >= 7 ? (rawTel.startsWith('+') ? rawTel.replace('+', '') : rawTel) : WA_NUMBER
    const texto = encodeURIComponent(
      `Hola ${lead.nombre || ''}, te escribo de Reúso en seguimiento a tu solicitud de información.`
    )
    window.open(`https://wa.me/${tel}?text=${texto}`, '_blank', 'noopener,noreferrer')
  }

  // ── Crear evento ──
  async function crearEvento() {
    setEvError('')
    setEvGuardando(true)
    const res = await fetch('/api/admin/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: evNombre, fecha_inicio: evFechaInicio, fecha_fin: evFechaFin || null }),
    })
    const data = await res.json().catch(() => ({}))
    setEvGuardando(false)
    if (!res.ok) return setEvError(data.error ?? 'No pudimos guardar el evento.')
    setEventos(prev => [data.evento, ...prev].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)))
    setEvNombre('')
    setEvFechaInicio('')
    setEvFechaFin('')
  }

  async function borrarEvento(id: string) {
    const res = await fetch(`/api/admin/eventos?id=${id}`, { method: 'DELETE' })
    if (res.ok) setEventos(prev => prev.filter(e => e.id !== id))
  }

  // ── Crear manual ──
  function abrirCrear() {
    setErrorCrear('')
    setFormCrear({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      empresa: '',
      interes: '',
      evento_nombre: filtroEvento || '',
      mensaje: '',
      estado: 'nuevo',
    })
    setModalCrearAbierto(true)
  }

  async function guardarCrear() {
    const nombreCompleto = [formCrear.nombre.trim(), formCrear.apellido.trim()].filter(Boolean).join(' ')
    if (!nombreCompleto) {
      setErrorCrear('Ingresa al menos el nombre del contacto.')
      return
    }

    setGuardandoCrear(true)
    setErrorCrear('')

    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombreCompleto,
        email: formCrear.email.trim() || null,
        telefono: formCrear.telefono.trim() || null,
        empresa: formCrear.empresa.trim() || null,
        interes: formCrear.interes.trim() || null,
        evento_nombre: formCrear.evento_nombre.trim() || null,
        mensaje: formCrear.mensaje.trim() || null,
        estado: formCrear.estado,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setGuardandoCrear(false)

    if (!res.ok) {
      setErrorCrear(data.error ?? 'Error al registrar el contacto.')
      return
    }

    setLeads(prev => [data, ...prev])
    setModalCrearAbierto(false)
    startTransition(() => router.refresh())
  }

  // ── Editar contacto ──
  function abrirEdicion(lead: Lead) {
    const { nombre, apellido } = partirNombreCompleto(lead.nombre)
    setErrorEdit('')
    setFormEdit({
      id: lead.id,
      nombre,
      apellido,
      email: lead.email ?? '',
      telefono: lead.telefono ?? '',
      empresa: lead.empresa ?? '',
      interes: lead.interes ?? '',
      evento_nombre: lead.evento_nombre ?? '',
      mensaje: lead.mensaje ?? '',
      estado: lead.estado,
    })
    setLeadEditando(lead)
  }

  async function guardarEdicion() {
    if (!leadEditando) return
    const nombreCompleto = [formEdit.nombre.trim(), formEdit.apellido.trim()].filter(Boolean).join(' ')
    if (!nombreCompleto) {
      setErrorEdit('Ingresa al menos el nombre del contacto.')
      return
    }

    setGuardandoEdit(true)
    setErrorEdit('')

    const res = await fetch(`/api/admin/leads?id=${leadEditando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombreCompleto,
        email: formEdit.email.trim() || null,
        telefono: formEdit.telefono.trim() || null,
        empresa: formEdit.empresa.trim() || null,
        interes: formEdit.interes.trim() || null,
        evento_nombre: formEdit.evento_nombre.trim() || null,
        mensaje: formEdit.mensaje.trim() || null,
        estado: formEdit.estado,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setGuardandoEdit(false)

    if (!res.ok) {
      setErrorEdit(data.error ?? 'Error al actualizar el contacto.')
      return
    }

    setLeads(ls => ls.map(l => (l.id === leadEditando.id ? { ...l, ...data } : l)))
    setLeadEditando(null)
    startTransition(() => router.refresh())
  }

  // ── Exportar a CSV (Descarga directa del navegador) ──
  function exportarCSV() {
    const encabezados = ['ID', 'Nombre', 'Email', 'Teléfono', 'Empresa', 'Interés', 'Evento', 'Estado', 'Fecha']
    const filas = filtrados.map(l => [
      `"${l.id}"`,
      `"${(l.nombre ?? '').replace(/"/g, '""')}"`,
      `"${(l.email ?? '').replace(/"/g, '""')}"`,
      `"${(l.telefono ?? '').replace(/"/g, '""')}"`,
      `"${(l.empresa ?? '').replace(/"/g, '""')}"`,
      `"${(l.interes ?? '').replace(/"/g, '""')}"`,
      `"${(l.evento_nombre ?? '').replace(/"/g, '""')}"`,
      `"${l.estado}"`,
      `"${l.created_at}"`,
    ])

    const csvContent = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `leads-reuso-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ── Descargar Plantilla Oficial de Contactos CSV ──
  function descargarPlantillaCSV() {
    const cabeceras = 'Nombre,Apellido,Email,Teléfono,Empresa,Interés,Evento,Mensaje,Estado\n'
    const ejemplo1 =
      '"María Angélica","Betancur","maria@ejemplo.com","+57 300 1234567","Clothe S.A.S.","Plan Pro","Climate Week Medellín","Interesada en medición ambiental","nuevo"\n'
    const ejemplo2 =
      '"Carlos","Gómez","carlos@empresa.com","+57 311 9876543","EcoLogix","Cotización","","Solicita demo de cotizador","nuevo"\n'

    const csvContent = '\uFEFF' + cabeceras + ejemplo1 + ejemplo2
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla-importacion-contactos.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ── Manejar Archivo CSV para Importación ──
  function onSeleccionarArchivoCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorImportar('')
    setExitoImportar('')
    setArchivoNombre(file.name)

    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const texto = String(evt.target?.result ?? '')
        const contactos = parsearCSVContactos(texto)
        if (contactos.length === 0) {
          setErrorImportar('El archivo CSV no contiene registros válidos o está vacío.')
          setContactosParseados([])
        } else {
          setContactosParseados(contactos)
        }
      } catch {
        setErrorImportar('Error al procesar el archivo CSV. Verifica el formato.')
        setContactosParseados([])
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  // ── Enviar Contactos Importados a la BD ──
  async function ejecutarImportacion() {
    if (contactosParseados.length === 0) {
      setErrorImportar('Por favor selecciona un archivo CSV con al menos un contacto.')
      return
    }

    setImportando(true)
    setErrorImportar('')
    setExitoImportar('')

    try {
      const res = await fetch('/api/admin/leads/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactos: contactosParseados }),
      })

      const data = await res.json().catch(() => ({}))
      setImportando(false)

      if (!res.ok) {
        setErrorImportar(data.error ?? 'Error al subir e importar los contactos.')
        return
      }

      setExitoImportar(`¡Éxito! Se importaron ${data.insertados ?? contactosParseados.length} contactos.`)
      if (Array.isArray(data.data)) {
        setLeads(prev => [...data.data, ...prev])
      }
      setTimeout(() => {
        setModalImportar(false)
        setArchivoNombre('')
        setContactosParseados([])
        setExitoImportar('')
        startTransition(() => router.refresh())
      }, 1500)
    } catch {
      setImportando(false)
      setErrorImportar('Error de conexión al importar contactos.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Tarjetas resumen interactivo (KPIs con tokens certificados) ── */}
      <div className="leads-grid grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ESTADOS.map(e => {
          const cfg = ESTADO_CONFIG[e]
          const activo = filtroEstado === e
          return (
            <button
              key={e}
              type="button"
              onClick={() => setFiltroEstado(activo ? '' : e)}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                activo
                  ? 'border-brand bg-(--bg-hover) shadow-xs'
                  : 'border-(--border) bg-(--bg-card) hover:bg-(--bg-table-hover)'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold m-0 leading-none" style={{ color: cfg.color }}>
                  {conteos[e]}
                </span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
              </div>
              <p className="text-xs font-semibold text-(--text-secondary) mt-1.5 m-0">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* ── Toolbar del Sistema de Diseño ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        {/* Lado izquierdo: Búsqueda y Filtros */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          {/* Campo de búsqueda canónico */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-placeholder) pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email, empresa..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-(--border) bg-(--bg-input) text-sm text-(--text-primary) placeholder:text-(--text-placeholder) outline-hidden focus:border-brand transition-colors"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtro de Estado con Selector */}
          <Selector
            opciones={[
              { value: '', label: 'Todos los estados' },
              { value: 'nuevo', label: 'Nuevo' },
              { value: 'contactado', label: 'Contactado' },
              { value: 'convertido', label: 'Convertido' },
              { value: 'descartado', label: 'Descartado' },
            ]}
            value={filtroEstado}
            onChange={v => setFiltroEstado(v as EstadoLead | '')}
            tamano="sm"
            placeholder="Estado"
            className="w-40"
          />

          {/* Filtro de Evento si existen eventos registrados */}
          {eventos.length > 0 && (
            <Selector
              opciones={[
                { value: '', label: 'Todos los eventos' },
                ...eventos.map(ev => ({ value: ev.nombre, label: ev.nombre })),
              ]}
              value={filtroEvento}
              onChange={v => setFiltroEvento(v)}
              tamano="sm"
              placeholder="Evento"
              className="w-44"
            />
          )}

          {/* Indicador de filtros activos para limpiar */}
          {(filtroEstado || filtroEvento || busqueda) && (
            <button
              type="button"
              onClick={() => {
                setFiltroEstado('')
                setFiltroEvento('')
                setBusqueda('')
              }}
              className="text-xs font-semibold text-brand hover:underline px-2 cursor-pointer whitespace-nowrap"
            >
              Restablecer
            </button>
          )}
        </div>

        {/* Lado derecho: Acciones primarias y herramientas (Importar, Exportar, Nuevo) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Botón de gestión de eventos desplegable */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMostrarGestorEventos(v => !v)}
            className="gap-1.5"
            title="Administrar eventos comerciales"
          >
            <Calendar size={13} />
            <span>Eventos ({eventos.length})</span>
          </Button>

          {/* Botón Importar contactos con popup */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setErrorImportar('')
              setExitoImportar('')
              setArchivoNombre('')
              setContactosParseados([])
              setModalImportar(true)
            }}
            className="gap-1.5"
            title="Importar contactos desde archivo CSV"
          >
            <Upload size={13} />
            <span>Importar</span>
          </Button>

          {/* Botón Exportar oficial (Excel, CSV, PDF) */}
          <BotonDescargar
            endpoint="/api/admin/leads/exportar"
            queryParams={new URLSearchParams({
              ...(filtroEstado ? { estado: filtroEstado } : {}),
              ...(filtroEvento ? { evento: filtroEvento } : {}),
              ...(busqueda.trim() ? { search: busqueda.trim() } : {}),
            }).toString()}
            label="Exportar"
          />

          {/* Botón Nuevo contacto manual */}
          <Button variant="primary" size="sm" onClick={abrirCrear} className="gap-1.5 shadow-2xs">
            <Plus size={14} />
            <span>Nuevo contacto</span>
          </Button>
        </div>
      </div>

      {/* ── Gestor de Eventos Colapsable ── */}
      {mostrarGestorEventos && (
        <div className="rounded-card border border-(--border) bg-(--bg-card) p-4 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-brand m-0">Eventos y ferias</p>
              <p className="text-xs text-(--text-secondary) m-0 mt-0.5">
                Los contactos captados durante el rango de fechas quedarán etiquetados automáticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarGestorEventos(false)}
              className="p-1 rounded-lg hover:bg-(--bg-table-hover) text-(--text-secondary) cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <input
              type="text"
              placeholder="Nombre del evento (ej: Climate Week)"
              value={evNombre}
              onChange={e => setEvNombre(e.target.value)}
              className="sm:col-span-2 rounded-xl border border-(--border) bg-(--bg-input) px-3 py-1.5 text-xs text-(--text-primary) outline-hidden focus:border-brand"
            />
            <input
              type="date"
              value={evFechaInicio}
              onChange={e => setEvFechaInicio(e.target.value)}
              className="rounded-xl border border-(--border) bg-(--bg-input) px-2.5 py-1.5 text-xs text-(--text-primary) outline-hidden focus:border-brand"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={evFechaFin}
                onChange={e => setEvFechaFin(e.target.value)}
                className="flex-1 rounded-xl border border-(--border) bg-(--bg-input) px-2.5 py-1.5 text-xs text-(--text-primary) outline-hidden focus:border-brand"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={crearEvento}
                disabled={evGuardando || !evNombre.trim() || !evFechaInicio}
                className="whitespace-nowrap px-3 text-xs"
              >
                {evGuardando ? '...' : 'Crear'}
              </Button>
            </div>
          </div>

          {evError && <p className="text-xs text-error font-medium m-0">{evError}</p>}

          {eventos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-(--border)">
              {eventos.map(ev => {
                const inicio = new Date(ev.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                })
                const fin = ev.fecha_fin
                  ? new Date(ev.fecha_fin + 'T00:00:00').toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : null
                return (
                  <span
                    key={ev.id}
                    className="inline-flex items-center gap-2 text-xs bg-(--bg-input) border border-(--border) px-2.5 py-1 rounded-lg text-(--text-primary)"
                  >
                    <span>
                      <strong>{ev.nombre}</strong> ({fin && fin !== inicio ? `${inicio} – ${fin}` : inicio})
                    </span>
                    <button
                      type="button"
                      onClick={() => borrarEvento(ev.id)}
                      className="text-error hover:opacity-70 cursor-pointer font-bold ml-0.5"
                      title="Eliminar evento"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Barra de Selección Masiva (Borrado en Grupo) ── */}
      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand-light px-4 py-2.5 shadow-2xs">
          <span className="text-xs font-semibold text-brand">
            {seleccionados.size} {seleccionados.size === 1 ? 'prospecto seleccionado' : 'prospectos seleccionados'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSeleccionados(new Set())}
              className="text-xs font-medium px-2.5 py-1 text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
            >
              Deseleccionar
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorEliminarGrupo('')
                setModalEliminarGrupo(true)
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-(--bg-card) border border-(--border) text-error hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
            >
              <Trash2 size={13} />
              <span>Eliminar seleccionados</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Tabla Canónica del Sistema de Diseño ── */}
      {filtrados.length === 0 ? (
        <div className="rounded-card border border-dashed border-(--border) bg-(--bg-card) p-12 text-center">
          <Tray size={38} className="text-(--text-placeholder) mx-auto mb-3" />
          <p className="text-sm font-semibold text-(--text-primary) m-0">
            Sin prospectos con los filtros aplicados
          </p>
          <p className="text-xs text-(--text-secondary) mt-1">
            {busqueda || filtroEstado || filtroEvento
              ? 'Prueba modificando la búsqueda o restableciendo los filtros de estado.'
              : 'Los registros del formulario de la landing o creados manualmente aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-(--border) bg-(--bg-card) overflow-x-auto shadow-xs">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-(--bg-table-header) text-brand border-b border-(--border)">
                {/* Checkbox para seleccionar todos en la página actual */}
                <th className="px-3 py-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSeleccionarTodos}
                    className="inline-flex items-center justify-center cursor-pointer"
                    title={todosSeleccionados ? 'Deseleccionar todos en esta página' : 'Seleccionar todos en esta página'}
                  >
                    {todosSeleccionados ? (
                      <SquareCheck size={18} className="text-brand" />
                    ) : (
                      <Square size={18} className="text-(--text-secondary) opacity-50 hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </th>
                <SortTh col="nombre" sort={sort} onToggle={toggleSort} style={{ fontSize: '12px' }}>
                  Nombre
                </SortTh>
                <SortTh col="empresa" sort={sort} onToggle={toggleSort} style={{ fontSize: '12px' }}>
                  Empresa
                </SortTh>
                <SortTh col="contacto" sort={sort} onToggle={toggleSort} style={{ fontSize: '12px' }}>
                  Contacto
                </SortTh>
                <SortTh col="interes" sort={sort} onToggle={toggleSort} style={{ fontSize: '12px' }}>
                  <div className="leading-tight">
                    <span>Interés</span>
                    <span className="block text-[11px] font-normal opacity-85">/ Evento</span>
                  </div>
                </SortTh>
                <SortTh col="created_at" sort={sort} onToggle={toggleSort} style={{ fontSize: '12px' }}>
                  Fecha y hora
                </SortTh>
                <SortTh col="estado" sort={sort} onToggle={toggleSort} style={{ fontSize: '12px' }}>
                  Estado
                </SortTh>
                <th className="px-3 py-2.5 w-12 text-center" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtradosPaginados.map((lead, idx) => {
                const { dia, hora } = formatearFechaLead(lead.created_at)
                const estaSeleccionado = seleccionados.has(lead.id)

                return (
                  <tr
                    key={lead.id}
                    className={`transition-colors duration-150 hover:bg-(--bg-table-hover) ${
                      idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                    }`}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                  >
                    {/* Checkbox de selección individual */}
                    <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleSeleccionado(lead.id)}
                        className="inline-flex items-center justify-center cursor-pointer"
                        title={estaSeleccionado ? 'Deseleccionar prospecto' : 'Seleccionar prospecto'}
                      >
                        {estaSeleccionado ? (
                          <SquareCheck size={18} className="text-brand" />
                        ) : (
                          <Square size={18} className="text-(--text-secondary) opacity-50 hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>

                    {/* Nombre completo */}
                    <td
                      className="px-4 py-3 text-(--text-primary) font-semibold whitespace-nowrap"
                      style={{ background: sort.col === 'nombre' ? 'var(--table-orden-activo)' : undefined }}
                    >
                      {lead.nombre || <span className="opacity-40 font-normal">(sin nombre)</span>}
                    </td>

                    {/* Empresa */}
                    <td
                      className="px-4 py-3 text-(--text-secondary) whitespace-nowrap"
                      style={{ background: sort.col === 'empresa' ? 'var(--table-orden-activo)' : undefined }}
                    >
                      {lead.empresa || <span className="opacity-40">-</span>}
                    </td>

                    {/* Contacto (Email + Teléfono) */}
                    <td
                      className="px-4 py-3 text-(--text-secondary)"
                      style={{ background: sort.col === 'contacto' ? 'var(--table-orden-activo)' : undefined }}
                    >
                      <div className="flex flex-col gap-1 text-xs">
                        {lead.email && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Envelope size={12} className="text-(--text-secondary) shrink-0" />
                            <a
                              href={`mailto:${lead.email}`}
                              className="text-(--text-primary) hover:text-brand hover:underline"
                            >
                              {lead.email}
                            </a>
                          </span>
                        )}
                        {lead.telefono && (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Phone size={12} className="text-(--text-secondary) shrink-0" />
                            <span>{lead.telefono}</span>
                          </span>
                        )}
                        {!lead.email && !lead.telefono && <span className="opacity-40">-</span>}
                      </div>
                    </td>

                    {/* Interés / Evento en dos líneas para ahorrar espacio horizontal */}
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ background: sort.col === 'interes' ? 'var(--table-orden-activo)' : undefined }}
                    >
                      <div className="flex flex-col leading-tight max-w-[200px]">
                        {lead.interes && lead.interes.toLowerCase() !== 'eventos' ? (
                          <span className="font-medium text-(--text-primary) truncate" title={lead.interes}>
                            {lead.interes}
                          </span>
                        ) : null}
                        {lead.evento_nombre ? (
                          <span
                            className={`text-(--text-secondary) text-[11px] truncate ${
                              lead.interes && lead.interes.toLowerCase() !== 'eventos' ? 'mt-0.5' : ''
                            }`}
                            title={`Evento: ${lead.evento_nombre}`}
                          >
                            Evento: {lead.evento_nombre}
                          </span>
                        ) : !lead.interes || lead.interes.toLowerCase() === 'eventos' ? (
                          <span className="opacity-40">-</span>
                        ) : null}
                      </div>
                    </td>

                    {/* Fecha y hora en dos líneas */}
                    <td
                      className="px-4 py-3 whitespace-nowrap text-xs"
                      style={{ background: sort.col === 'created_at' ? 'var(--table-orden-activo)' : undefined }}
                    >
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-(--text-primary)">{dia}</span>
                        <span className="text-(--text-secondary) text-[11px] mt-0.5">{hora}</span>
                      </div>
                    </td>

                    {/* Selector de Estado Portal-based (Sin solapamientos) */}
                    <td
                      className="px-4 py-3 whitespace-nowrap"
                      style={{ background: sort.col === 'estado' ? 'var(--table-orden-activo)' : undefined }}
                    >
                      <EstadoDropdownLead
                        estado={lead.estado}
                        cambiando={cambiando === lead.id}
                        onCambiar={nuevo => cambiarEstado(lead.id, nuevo)}
                      />
                    </td>

                    {/* Menú de 3 puntos VERTICALES del sistema de diseño (DotsThree) Portal-based */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <MenuTresPuntosLead
                        onEditar={() => abrirEdicion(lead)}
                        onWhatsApp={() => abrirWhatsApp(lead)}
                        onEliminar={() => {
                          setErrorEliminarIndividual('')
                          setLeadAEliminar(lead)
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* ── Paginación Canónica del Sistema de Diseño (Pie de Tabla) ── */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-(--border)">
            <span
              className="text-xs whitespace-nowrap overflow-hidden text-ellipsis min-w-0 text-(--text-secondary)"
              style={{ flexShrink: 1 }}
            >
              {totalFiltrados} {totalFiltrados === 1 ? 'prospecto' : 'prospectos'} · Página {pagina} de {totalPaginas}
            </span>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <Pagination
                page={pagina}
                totalPages={totalPaginas}
                onPageChange={setPagina}
                porPagina={porPagina}
                onPorPaginaChange={n => {
                  setPorPagina(n)
                  setPagina(1)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación: Eliminar en Grupo ── */}
      {modalEliminarGrupo && (
        <Modal
          abierto={modalEliminarGrupo}
          onClose={() => setModalEliminarGrupo(false)}
          titulo={
            seleccionados.size === 1
              ? '¿Eliminar 1 prospecto seleccionado?'
              : `¿Eliminar ${seleccionados.size} prospectos seleccionados?`
          }
          descripcion={`Vas a eliminar permanentemente ${seleccionados.size} registros de contactos comerciales. Esta acción no se puede deshacer.`}
          icono={<Trash2 size={20} className="text-error" />}
          textoConfirmar={eliminandoGrupo ? 'Eliminando...' : 'Sí, eliminar'}
          textoCancelar="Cancelar"
          varianteConfirmar="error"
          onConfirmar={confirmarEliminarGrupo}
          onCancelar={() => setModalEliminarGrupo(false)}
        >
          {errorEliminarGrupo && <p className="text-xs text-error font-medium">{errorEliminarGrupo}</p>}
        </Modal>
      )}

      {/* ── Modal de Confirmación: Eliminar Individual ── */}
      {leadAEliminar && (
        <Modal
          abierto={Boolean(leadAEliminar)}
          onClose={() => setLeadAEliminar(null)}
          titulo="¿Eliminar prospecto comercial?"
          descripcion={`Vas a eliminar a "${leadAEliminar.nombre || 'este prospecto'}" de forma permanente. Esta acción no se puede deshacer.`}
          icono={<Trash2 size={20} className="text-error" />}
          textoConfirmar={eliminandoIndividual ? 'Eliminando...' : 'Sí, eliminar'}
          textoCancelar="Cancelar"
          varianteConfirmar="error"
          onConfirmar={confirmarEliminarIndividual}
          onCancelar={() => setLeadAEliminar(null)}
        >
          {errorEliminarIndividual && <p className="text-xs text-error font-medium">{errorEliminarIndividual}</p>}
        </Modal>
      )}

      {/* ── Modal: IMPORTAR CONTACTOS (Descarga de plantilla + Carga y subida) ── */}
      {modalImportar && (
        <Modal
          abierto={modalImportar}
          onClose={() => setModalImportar(false)}
          titulo="Importar contactos"
          descripcion="Carga prospectos comerciales en lote mediante un archivo CSV estructurado."
          icono={<Upload size={20} />}
          ancho="lg"
          textoConfirmar={importando ? 'Importando...' : `Subir e importar (${contactosParseados.length})`}
          textoCancelar="Cerrar"
          onConfirmar={ejecutarImportacion}
          onCancelar={() => setModalImportar(false)}
        >
          <div className="flex flex-col gap-4 pt-1">
            {/* Paso 1: Descargar Plantilla */}
            <div className="rounded-xl border border-(--border) bg-(--bg-table-header) p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-brand m-0">Plantilla CSV oficial</p>
                <p className="text-xs text-(--text-secondary) m-0 mt-0.5">
                  Descarga el formato modelo con los encabezados exactos (Nombre, Apellido, Email, Teléfono, etc.).
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={descargarPlantillaCSV}
                className="gap-1.5 shrink-0"
              >
                <Download size={13} />
                <span>Descargar plantilla</span>
              </Button>
            </div>

            {/* Paso 2: Adjuntar Archivo CSV */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-(--text-secondary)">
                Selecciona tu archivo CSV completado
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-(--border) hover:border-brand/40 bg-(--bg-input) rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-(--text-primary) m-0">
                    {archivoNombre ? archivoNombre : 'Haz clic para seleccionar o arrastra tu archivo CSV'}
                  </p>
                  <p className="text-[11px] text-(--text-secondary) m-0">
                    Archivos .csv delimitados por comas o punto y coma
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onSeleccionarArchivoCSV}
                  className="hidden"
                />
              </div>
            </div>

            {/* Mensajes de error o éxito */}
            {errorImportar && <p role="alert" className="text-xs text-error font-medium m-0">{errorImportar}</p>}
            {exitoImportar && <p role="status" className="text-xs text-success font-semibold m-0">{exitoImportar}</p>}

            {/* Paso 3: Vista previa de registros detectados */}
            {contactosParseados.length > 0 && (
              <div className="flex flex-col gap-2 pt-1 border-t border-(--border)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand">
                    {contactosParseados.length} contactos detectados listos para subir
                  </span>
                  <span className="text-[11px] text-(--text-secondary)">
                    Mostrando primeros 3 registros
                  </span>
                </div>

                <div className="rounded-xl border border-(--border) overflow-hidden text-xs">
                  <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                    <thead className="bg-(--bg-table-header) text-brand">
                      <tr>
                        <th className="px-3 py-1.5 font-semibold">Nombre completo</th>
                        <th className="px-3 py-1.5 font-semibold">Empresa</th>
                        <th className="px-3 py-1.5 font-semibold">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactosParseados.slice(0, 3).map((c, i) => (
                        <tr key={i} className="border-t border-(--border) bg-(--bg-card)">
                          <td className="px-3 py-2 text-(--text-primary) font-medium">
                            {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                          </td>
                          <td className="px-3 py-2 text-(--text-secondary)">{c.empresa || '-'}</td>
                          <td className="px-3 py-2 text-(--text-secondary)">{c.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: Creación Manual con Nombre y Apellido Separados ── */}
      {modalCrearAbierto && (
        <Modal
          abierto={modalCrearAbierto}
          onClose={() => setModalCrearAbierto(false)}
          titulo="Nuevo contacto"
          descripcion="Registra manualmente un prospecto comercial o contacto de evento."
          icono={<Plus size={20} />}
          ancho="lg"
          textoConfirmar={guardandoCrear ? 'Guardando...' : 'Guardar contacto'}
          textoCancelar="Cancelar"
          onConfirmar={guardarCrear}
          onCancelar={() => setModalCrearAbierto(false)}
        >
          <div className="flex flex-col gap-3.5 pt-1">
            {errorCrear && <p role="alert" className="text-xs text-error font-medium">{errorCrear}</p>}

            {/* Nombre y Apellido separados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">
                  Nombre(s) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCrear.nombre}
                  onChange={e => setFormCrear(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. María Angélica"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Apellido(s)</label>
                <input
                  type="text"
                  value={formCrear.apellido}
                  onChange={e => setFormCrear(p => ({ ...p, apellido: e.target.value }))}
                  placeholder="Ej. Betancur Gómez"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Empresa / Organización</label>
                <input
                  type="text"
                  value={formCrear.empresa}
                  onChange={e => setFormCrear(p => ({ ...p, empresa: e.target.value }))}
                  placeholder="Ej. Clothe S.A.S."
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Estado inicial</label>
                <select
                  value={formCrear.estado}
                  onChange={e => setFormCrear(p => ({ ...p, estado: e.target.value as EstadoLead }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand h-[38px]"
                >
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>
                      {ESTADO_CONFIG[e].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Correo electrónico</label>
                <input
                  type="email"
                  value={formCrear.email}
                  onChange={e => setFormCrear(p => ({ ...p, email: e.target.value }))}
                  placeholder="contacto@empresa.com"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Celular / WhatsApp</label>
                <input
                  type="tel"
                  value={formCrear.telefono}
                  onChange={e => setFormCrear(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 300 1234567"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Interés / Asunto</label>
                <input
                  type="text"
                  value={formCrear.interes}
                  onChange={e => setFormCrear(p => ({ ...p, interes: e.target.value }))}
                  placeholder="Ej. Plan Pro, Evento, Cotización..."
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Evento comercial vinculado</label>
                <input
                  type="text"
                  value={formCrear.evento_nombre}
                  onChange={e => setFormCrear(p => ({ ...p, evento_nombre: e.target.value }))}
                  placeholder="Ej. Climate Week Medellín"
                  list="eventos-disponibles-crear"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
                <datalist id="eventos-disponibles-crear">
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.nombre} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Mensaje o notas del contacto</label>
              <textarea
                rows={3}
                value={formCrear.mensaje}
                onChange={e => setFormCrear(p => ({ ...p, mensaje: e.target.value }))}
                placeholder="Anotaciones de la reunión, requerimientos específicos o contexto..."
                className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edición de Contacto con Nombre y Apellido Separados ── */}
      {leadEditando && (
        <Modal
          abierto={Boolean(leadEditando)}
          onClose={() => setLeadEditando(null)}
          titulo="Editar información del contacto"
          descripcion="Actualiza los datos comerciales, estado o notas de seguimiento."
          icono={<Pencil size={20} />}
          ancho="lg"
          textoConfirmar={guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
          textoCancelar="Cancelar"
          onConfirmar={guardarEdicion}
          onCancelar={() => setLeadEditando(null)}
        >
          <div className="flex flex-col gap-3.5 pt-1">
            {errorEdit && <p role="alert" className="text-xs text-error font-medium">{errorEdit}</p>}

            {/* Nombre y Apellido separados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">
                  Nombre(s) <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formEdit.nombre}
                  onChange={e => setFormEdit(p => ({ ...p, nombre: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Apellido(s)</label>
                <input
                  type="text"
                  value={formEdit.apellido}
                  onChange={e => setFormEdit(p => ({ ...p, apellido: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Empresa / Organización</label>
                <input
                  type="text"
                  value={formEdit.empresa}
                  onChange={e => setFormEdit(p => ({ ...p, empresa: e.target.value }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Estado comercial</label>
                <select
                  value={formEdit.estado}
                  onChange={e => setFormEdit(p => ({ ...p, estado: e.target.value as EstadoLead }))}
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand h-[38px]"
                >
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>
                      {ESTADO_CONFIG[e].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Correo electrónico</label>
                <input
                  type="email"
                  value={formEdit.email}
                  onChange={e => setFormEdit(p => ({ ...p, email: e.target.value }))}
                  placeholder="ejemplo@empresa.com"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Celular / WhatsApp</label>
                <input
                  type="tel"
                  value={formEdit.telefono}
                  onChange={e => setFormEdit(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 300 1234567"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Interés / Asunto</label>
                <input
                  type="text"
                  value={formEdit.interes}
                  onChange={e => setFormEdit(p => ({ ...p, interes: e.target.value }))}
                  placeholder="Ej. Eventos, Plan Pro..."
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Evento vinculado</label>
                <input
                  type="text"
                  value={formEdit.evento_nombre}
                  onChange={e => setFormEdit(p => ({ ...p, evento_nombre: e.target.value }))}
                  placeholder="Nombre del evento"
                  list="eventos-disponibles-edit"
                  className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand"
                />
                <datalist id="eventos-disponibles-edit">
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.nombre} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-(--text-secondary)">Mensaje o notas del contacto</label>
              <textarea
                rows={3}
                value={formEdit.mensaje}
                onChange={e => setFormEdit(p => ({ ...p, mensaje: e.target.value }))}
                className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown de Estado con createPortal (Elimina cualquier bug de solapamiento)
// ─────────────────────────────────────────────────────────────────────────────
function EstadoDropdownLead({
  estado,
  cambiando,
  onCambiar,
}: {
  estado: EstadoLead
  cambiando: boolean
  onCambiar: (nuevo: EstadoLead) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const cfg = ESTADO_CONFIG[estado]

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!abierto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const abrirArriba = window.innerHeight - rect.bottom < 170
      setCoords({
        top: abrirArriba ? rect.top - 165 : rect.bottom + 4,
        left: Math.max(8, Math.min(window.innerWidth - 160, rect.left)),
      })
      setAbierto(true)
    } else {
      setAbierto(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={cambiando}
        onClick={toggle}
        style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-150 hover:opacity-85 ${
          cambiando ? 'opacity-50 cursor-wait' : ''
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
        <span>{cfg.label}</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={e => {
              e.stopPropagation()
              setAbierto(false)
            }}
          />
          <div
            className="fixed rounded-xl border border-(--border) bg-(--bg-card) shadow-2xl p-1 overflow-hidden flex flex-col"
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: '145px',
              zIndex: 9999,
            }}
            onClick={e => e.stopPropagation()}
          >
            {ESTADOS.map(e => {
              const itemCfg = ESTADO_CONFIG[e]
              const seleccionado = e === estado
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setAbierto(false)
                    if (!seleccionado) onCambiar(e)
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 text-left ${
                    seleccionado ? 'bg-(--bg-hover) font-bold' : 'hover:bg-(--bg-table-hover) text-(--text-primary)'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: itemCfg.dot }} />
                    <span>{itemCfg.label}</span>
                  </span>
                  {seleccionado && <Check size={13} className="text-brand shrink-0" />}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Menú de 3 Puntos VERTICALES Oficiales (DotsThree) con createPortal
// ─────────────────────────────────────────────────────────────────────────────
function MenuTresPuntosLead({
  onEditar,
  onWhatsApp,
  onEliminar,
}: {
  onEditar: () => void
  onWhatsApp: () => void
  onEliminar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!abierto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const abrirArriba = window.innerHeight - rect.bottom < 160
      setCoords({
        top: abrirArriba ? rect.top - 135 : rect.bottom + 4,
        left: Math.max(8, Math.min(window.innerWidth - 180, rect.right - 176)),
      })
      setAbierto(true)
    } else {
      setAbierto(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="Acciones"
        className="p-1.5 rounded-lg border border-transparent hover:border-(--border) hover:bg-(--bg-table-hover) inline-flex items-center justify-center text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
      >
        <DotsThree size={18} />
      </button>

      {abierto && coords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={e => {
              e.stopPropagation()
              setAbierto(false)
            }}
          />
          <div
            className="fixed rounded-xl border border-(--border) bg-(--bg-card) shadow-2xl p-1 overflow-hidden flex flex-col text-left"
            style={{
              top: coords.top,
              left: coords.left,
              width: '176px',
              zIndex: 9999,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Editar */}
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                onEditar()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-(--text-primary) hover:bg-(--bg-table-hover) cursor-pointer transition-colors"
            >
              <Pencil size={13} className="text-brand shrink-0" />
              <span>Editar información</span>
            </button>

            {/* Enviar WhatsApp */}
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                onWhatsApp()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-(--text-primary) hover:bg-(--bg-table-hover) cursor-pointer transition-colors"
            >
              <WhatsappLogo size={13} className="text-[#25D366] shrink-0" color="#25D366" />
              <span>Enviar WhatsApp</span>
            </button>

            <div className="h-px my-1 bg-(--border)" />

            {/* Eliminar */}
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                onEliminar()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-error hover:bg-(--bg-table-hover) cursor-pointer transition-colors"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>Eliminar prospecto</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
