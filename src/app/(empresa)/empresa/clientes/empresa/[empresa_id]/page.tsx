'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { SelectorCiudad, CIUDAD_DEFECTO } from '@/components/ui/selector-ciudad'
import { InputDireccion } from '@/components/ui/input-direccion'
import { InputTelefono } from '@/components/ui/input-telefono'
import { InputDocumento } from '@/components/ui/input-documento'
import { SelectorCiiu } from '@/components/ui/selector-ciiu'
import { DetallePagina, SeccionDetalle, PieDetalle, EncabezadoDetalle, DetalleGrid, DetalleColumna } from '@/components/ui/detalle-pagina'
import { CampoFormulario, CLASE_CAMPO, CLASE_ETIQUETA } from '@/components/ui/campo-formulario'
import { esNombreDeEmpresa } from '@/lib/es-nombre-empresa'

interface EmpresaDetalle {
  id: string
  nit: string
  razon_social: string
  nombres_comerciales: string[] | null
  direccion: string | null
  pais: string | null
  ciudad: string | null
  direccion_notas: string | null
  sedes: Array<{nombre: string; pais?: string; ciudad?: string; direccion?: string}> | null
  sector: string | null
}

interface ContactoEmpresa {
  id: string
  nombre: string
  apellido: string | null
  identificacion: string | null
  telefono: string | null
  telefono_indicativo: string | null
  email: string | null
  telefonos_extra: Array<{indicativo: string; numero: string}> | null
  correos_extra: string[] | null
}

interface AtributoEmpresa { id: string; clave: string; valor: string | null }

interface ContactoState {
  id: string
  nombre: string
  apellido: string
  identificacion: string
  telefono: string
  telefonoIndicativo: Pais
  email: string
  telefonosExtra: Array<{indicativo: string; numero: string}>
  correosExtra: string[]
  guardando: boolean
  errorGuardar: string | null
}

export default function EmpresaClientePage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-(--bg-primary)" />}>
      <EmpresaClienteContent />
    </Suspense>
  )
}

function EmpresaClienteContent() {
  const { empresa_id } = useParams<{ empresa_id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const empresaIdParam = searchParams.get('empresa_id')
  const conEmpresa = useCallback((url: string) =>
    empresaIdParam ? `${url}${url.includes('?') ? '&' : '?'}empresa_id=${empresaIdParam}` : url,
    [empresaIdParam])

  const [empresa, setEmpresa] = useState<EmpresaDetalle | null>(null)
  const [primerContactoId, setPrimerContactoId] = useState<string | null>(null)
  const [contactos, setContactos] = useState<ContactoState[]>([])
  const [atributos, setAtributos] = useState<AtributoEmpresa[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Empresa editable state
  const [razonSocial, setRazonSocial] = useState('')
  const [sector, setSector] = useState('')
  const [nombresComerciales, setNombresComerciales] = useState<string[]>([])
  const [nuevoNombreComercial, setNuevoNombreComercial] = useState('')
  const [empPais, setEmpPais] = useState('Colombia')
  const [empCiudad, setEmpCiudad] = useState(CIUDAD_DEFECTO)
  const [empDireccion, setEmpDireccion] = useState('')
  const [empDireccionNotas, setEmpDireccionNotas] = useState('')
  const [sedes, setSedes] = useState<Array<{nombre: string; pais?: string; ciudad?: string; direccion?: string}>>([])
  const [nuevaSede, setNuevaSede] = useState({ nombre: '', direccion: '' })
  const [nuevaClaveAtributo, setNuevaClaveAtributo] = useState('')
  const [nuevoValorAtributo, setNuevoValorAtributo] = useState('')
  const [mostrandoFormAtributo, setMostrandoFormAtributo] = useState(false)

  // Modal agregar contacto
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false)
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', apellido: '', telefono: '', email: '' })
  const [nuevoIndicativo, setNuevoIndicativo] = useState<Pais>(PAISES[0])
  const [agregandoContacto, setAgregandoContacto] = useState(false)
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null)

  useEffect(() => {
    if (!empresa_id) return
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        const resContactos = await fetch(conEmpresa(`/api/cotizador/clientes?empresa_cliente_id=${empresa_id}`))
        const dContactos = await resContactos.json().catch(() => null)
        if (!resContactos.ok) {
          setError(dContactos?.error ?? 'No se pudo cargar la empresa.')
          return
        }
        const listaRaw: Array<ContactoEmpresa & { crm_empresas_clientes: EmpresaDetalle | EmpresaDetalle[] | null }> = dContactos?.clientes ?? []
        if (listaRaw.length === 0) {
          setError('Empresa no encontrada.')
          return
        }
        const primerRaw = listaRaw[0]
        const empRaw = Array.isArray(primerRaw.crm_empresas_clientes)
          ? primerRaw.crm_empresas_clientes[0]
          : primerRaw.crm_empresas_clientes
        if (!empRaw) {
          setError('Empresa no encontrada.')
          return
        }
        setEmpresa(empRaw)
        setRazonSocial(empRaw.razon_social ?? '')
        setSector(empRaw.sector ?? '')
        setNombresComerciales(empRaw.nombres_comerciales ?? [])
        setEmpPais(empRaw.pais ?? 'Colombia')
        setEmpCiudad(empRaw.ciudad ?? CIUDAD_DEFECTO)
        setEmpDireccion(empRaw.direccion ?? '')
        setEmpDireccionNotas(empRaw.direccion_notas ?? '')
        setSedes(empRaw.sedes ?? [])

        const reales = listaRaw.filter(c => {
          // Incluir contactos reales (es_contacto_real en la API puede no venir en este select reducido)
          // El primer cliente siempre existe; los que tienen nombre real se consideran contactos
          return true
        })
        setPrimerContactoId(reales[0]?.id ?? null)
        setContactos(reales.map(c => ({
          id: c.id,
          nombre: c.nombre ?? '',
          apellido: c.apellido ?? '',
          identificacion: c.identificacion ?? '',
          telefono: c.telefono ?? '',
          telefonoIndicativo: PAISES.find(p => p.dial === c.telefono_indicativo) ?? PAISES[0],
          email: c.email ?? '',
          telefonosExtra: c.telefonos_extra ?? [],
          correosExtra: c.correos_extra ?? [],
          guardando: false,
          errorGuardar: null,
        })))

        const resAtributos = await fetch(conEmpresa(`/api/crm/empresas-clientes/${empresa_id}/atributos`)).catch(() => null)
        if (resAtributos?.ok) {
          const dAtributos = await resAtributos.json().catch(() => null)
          if (Array.isArray(dAtributos?.data)) setAtributos(dAtributos.data)
        }
      } catch (err) {
        console.error('[empresa/clientes/empresa/[empresa_id]] Error al cargar:', err)
        setError('No se pudo cargar la empresa. Revisa tu conexión.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [empresa_id, conEmpresa])

  function actualizarContacto(id: string, campos: Partial<ContactoState>) {
    setContactos(prev => prev.map(c => c.id === id ? { ...c, ...campos } : c))
  }

  async function guardarContacto(contactoId: string) {
    const c = contactos.find(x => x.id === contactoId)
    if (!c) return
    if (c.nombre.trim() && esNombreDeEmpresa(c.nombre)) {
      actualizarContacto(contactoId, { errorGuardar: 'El nombre parece ser de una empresa. Los contactos deben ser personas naturales.' })
      return
    }
    actualizarContacto(contactoId, { guardando: true, errorGuardar: null })
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/clientes/${contactoId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: c.nombre || null,
          apellido: c.apellido || null,
          identificacion: c.identificacion || null,
          email: c.email || null,
          telefono: c.telefono || null,
          telefono_indicativo: c.telefonoIndicativo.dial,
          telefonos_extra: c.telefonosExtra,
          correos_extra: c.correosExtra,
        }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) {
        actualizarContacto(contactoId, { errorGuardar: d?.error ?? 'Error al guardar.' })
      } else {
        actualizarContacto(contactoId, { errorGuardar: null })
      }
    } catch {
      actualizarContacto(contactoId, { errorGuardar: 'Error de conexión.' })
    } finally {
      actualizarContacto(contactoId, { guardando: false })
    }
  }

  async function guardarEmpresa() {
    if (!primerContactoId) return
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/clientes/${primerContactoId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razon_social: razonSocial,
          sector: sector || null,
          nombres_comerciales: nombresComerciales,
          empresa_pais: empPais || null,
          empresa_ciudad: empCiudad || null,
          empresa_direccion: empDireccion || null,
          empresa_direccion_notas: empDireccionNotas || null,
          empresa_sedes: sedes,
        }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) {
        setError(d?.error ?? 'Error al guardar los datos de la empresa.')
      } else {
        const empActualizada = Array.isArray(d.cliente?.crm_empresas_clientes)
          ? d.cliente.crm_empresas_clientes[0]
          : d.cliente?.crm_empresas_clientes
        if (empActualizada) setEmpresa(empActualizada)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function agregarAtributo() {
    if (!nuevaClaveAtributo.trim()) return
    const res = await fetch(conEmpresa(`/api/crm/empresas-clientes/${empresa_id}/atributos`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: nuevaClaveAtributo.trim(), valor: nuevoValorAtributo.trim() || undefined }),
    })
    const d = await res.json()
    if (res.ok && d.data) {
      setAtributos(prev => {
        const sinDuplicado = prev.filter(a => a.clave !== d.data.clave)
        return [...sinDuplicado, d.data]
      })
      setNuevaClaveAtributo('')
      setNuevoValorAtributo('')
      setMostrandoFormAtributo(false)
    }
  }

  async function agregarContactoNuevo() {
    setErrorAgregar(null)
    if (!nuevoContacto.telefono.trim()) {
      setErrorAgregar('El celular es obligatorio.')
      return
    }
    if (nuevoContacto.nombre.trim() && esNombreDeEmpresa(nuevoContacto.nombre)) {
      setErrorAgregar('El nombre parece ser de una empresa. Los contactos deben ser personas naturales.')
      return
    }
    setAgregandoContacto(true)
    try {
      const res = await fetch(conEmpresa('/api/cotizador/clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'persona',
          empresa_cliente_id: empresa_id,
          nombre: nuevoContacto.nombre.trim() || undefined,
          apellido: nuevoContacto.apellido.trim() || undefined,
          telefono: nuevoContacto.telefono.trim(),
          telefono_indicativo: nuevoIndicativo.dial,
          email: nuevoContacto.email.trim() || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        setErrorAgregar(d.error ?? 'No se pudo agregar el contacto.')
        return
      }
      const nuevo: ContactoState = {
        id: d.cliente.id,
        nombre: d.cliente.nombre ?? '',
        apellido: d.cliente.apellido ?? '',
        identificacion: d.cliente.identificacion ?? '',
        telefono: d.cliente.telefono ?? '',
        telefonoIndicativo: PAISES.find(p => p.dial === d.cliente.telefono_indicativo) ?? PAISES[0],
        email: d.cliente.email ?? '',
        telefonosExtra: d.cliente.telefonos_extra ?? [],
        correosExtra: d.cliente.correos_extra ?? [],
        guardando: false,
        errorGuardar: null,
      }
      setContactos(prev => [...prev, nuevo])
      setNuevoContacto({ nombre: '', apellido: '', telefono: '', email: '' })
      setNuevoIndicativo(PAISES[0])
      setModalAgregarAbierto(false)
    } catch {
      setErrorAgregar('Error de conexión. Intenta de nuevo.')
    } finally {
      setAgregandoContacto(false)
    }
  }

  if (cargando || !empresa) {
    return (
      <DetallePagina
        cargando={cargando}
        errorFatal={!cargando ? (error ?? 'Empresa no encontrada.') : null}
      />
    )
  }

  return (
    <DetallePagina>
      <EncabezadoDetalle
        titulo={empresa.razon_social || 'Empresa'}
        subtitulo={`NIT ${empresa.nit}`}
        onVolver={() => router.push(conEmpresa('/empresa/clientes'))}
        textoVolver="Volver a clientes"
        meta="Empresa cliente"
      />

      <DetalleGrid>
        {/* Columna izquierda */}
        <DetalleColumna>
          <SeccionDetalle titulo="Datos de la empresa">
            {/* NIT solo visible, no editable */}
            <p className="text-xs text-(--text-secondary)">NIT {empresa.nit}</p>

            <CampoFormulario label="Razón social">
              <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className={CLASE_CAMPO} />
            </CampoFormulario>

            <CampoFormulario label="Nombres comerciales" compuesto>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {nombresComerciales.map((nc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand border border-brand/20">
                    {nc}
                    <button
                      type="button"
                      onClick={() => setNombresComerciales(prev => prev.filter((_, j) => j !== i))}
                      className="ml-0.5 hover:text-(--color-error)"
                      title="Quitar"
                    >×</button>
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
                  placeholder="Añadir nombre y presionar Enter"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = nuevoNombreComercial.trim()
                    if (v && !nombresComerciales.includes(v)) setNombresComerciales(prev => [...prev, v])
                    setNuevoNombreComercial('')
                  }}
                  className="hover-pop p-2.5 rounded-xl bg-brand-light shrink-0"
                >
                  <Plus size={16} className="text-brand" />
                </button>
              </div>
            </CampoFormulario>

            <div className="flex flex-col gap-1">
              <span className={CLASE_ETIQUETA}>Actividad económica (CIIU)</span>
              <SelectorCiiu value={sector} onChange={setSector} />
            </div>

            {/* Dirección principal */}
            <div className="border-t border-(--border) pt-3 mt-1">
              <p className="text-xs font-semibold text-(--text-secondary) mb-3">Dirección principal</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className={CLASE_ETIQUETA}>País</span>
                  <SelectorPais value={empPais} onChange={setEmpPais} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={CLASE_ETIQUETA}>Ciudad</span>
                  <SelectorCiudad value={empCiudad} onChange={setEmpCiudad} pais={empPais} conEmpresa={conEmpresa} />
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-3">
                <span className={CLASE_ETIQUETA}>Dirección</span>
                <InputDireccion
                  value={empDireccion}
                  onChange={setEmpDireccion}
                  paisCodigo={PAISES.find(p => p.nombre === empPais)?.codigo}
                  paisNombre={empPais}
                  ciudad={empCiudad}
                />
              </div>
              <div className="mt-3">
                <CampoFormulario label="Notas sobre la dirección">
                  <input value={empDireccionNotas} onChange={e => setEmpDireccionNotas(e.target.value)} className={CLASE_CAMPO} placeholder="Torre, apto, referencia" />
                </CampoFormulario>
              </div>
            </div>

            {/* Sedes */}
            {sedes.length > 0 && (
              <div className="border-t border-(--border) pt-3 mt-1">
                <p className="text-xs font-semibold text-(--text-secondary) mb-2">Sedes adicionales</p>
                <div className="flex flex-wrap gap-1.5">
                  {sedes.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-light text-brand border border-brand/20">
                      {s.nombre}
                      {s.direccion && <span className="text-(--text-secondary) font-normal ml-0.5">· {s.direccion}</span>}
                      <button
                        type="button"
                        onClick={() => setSedes(prev => prev.filter((_, j) => j !== i))}
                        className="ml-0.5 hover:text-(--color-error)"
                        title="Quitar"
                      >×</button>
                    </span>
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
                    setSedes(prev => [...prev, { nombre: nuevaSede.nombre.trim(), direccion: nuevaSede.direccion.trim() || undefined }])
                    setNuevaSede({ nombre: '', direccion: '' })
                  }}
                  className="hover-pop p-2.5 rounded-xl bg-brand-light shrink-0"
                >
                  <Plus size={16} className="text-brand" />
                </button>
              </div>
            </div>

            {/* Atributos personalizados */}
            <div className="border-t border-(--border) pt-3 mt-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-(--text-secondary)">Atributos personalizados</p>
                <button
                  type="button"
                  onClick={() => setMostrandoFormAtributo(v => !v)}
                  className="hover-pop p-1.5 rounded-lg bg-brand-light shrink-0"
                  title="Agregar atributo"
                >
                  <Plus size={14} className="text-brand" />
                </button>
              </div>
              {atributos.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {atributos.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-(--text-primary)">{a.clave}</span>
                      <span className="text-(--text-secondary)">{a.valor ?? ''}</span>
                    </div>
                  ))}
                </div>
              )}
              {mostrandoFormAtributo && (
                <div className="flex gap-2 mt-2">
                  <input value={nuevaClaveAtributo} onChange={e => setNuevaClaveAtributo(e.target.value)} placeholder="Clave" className={`${CLASE_CAMPO} flex-1`} />
                  <input value={nuevoValorAtributo} onChange={e => setNuevoValorAtributo(e.target.value)} placeholder="Valor" className={`${CLASE_CAMPO} flex-1`} />
                  <button onClick={agregarAtributo} className="hover-pop p-2.5 rounded-xl bg-brand-light shrink-0" title="Guardar">
                    <Plus size={16} className="text-brand" />
                  </button>
                </div>
              )}
            </div>
          </SeccionDetalle>
        </DetalleColumna>

        {/* Columna derecha: contactos */}
        <DetalleColumna>
          <SeccionDetalle
            titulo="Contactos"
            acciones={
              <button
                type="button"
                onClick={() => { setErrorAgregar(null); setModalAgregarAbierto(true) }}
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: 'var(--color-brand)' }}
              >
                <Plus size={14} sinAnimacion /> Agregar contacto
              </button>
            }
          >
            {contactos.length === 0 ? (
              <p className="text-xs italic text-(--text-secondary)">Agrega el primer contacto.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {contactos.map(c => (
                  <ContactoCard
                    key={c.id}
                    contacto={c}
                    onChange={campos => actualizarContacto(c.id, campos)}
                    onGuardar={() => guardarContacto(c.id)}
                  />
                ))}
              </div>
            )}
          </SeccionDetalle>
        </DetalleColumna>
      </DetalleGrid>

      <PieDetalle
        onGuardar={guardarEmpresa}
        guardando={guardando}
        onVolver={() => router.push(conEmpresa('/empresa/clientes'))}
        extra={error ? <p className="text-sm text-[#FF5E4B]">{error}</p> : null}
      />

      <Modal
        abierto={modalAgregarAbierto}
        onClose={() => !agregandoContacto && setModalAgregarAbierto(false)}
        titulo="Agregar contacto"
        descripcion={`Nuevo contacto de ${empresa.razon_social}.`}
        textoConfirmar={agregandoContacto ? 'Agregando...' : 'Agregar'}
        onConfirmar={() => { if (!agregandoContacto) agregarContactoNuevo() }}
      >
        <div className="flex flex-col gap-3">
          {errorAgregar && <p className="text-sm text-[#FF5E4B]">{errorAgregar}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input value={nuevoContacto.nombre} onChange={e => setNuevoContacto(p => ({ ...p, nombre: e.target.value }))} className={CLASE_CAMPO} placeholder="Nombre (opcional)" />
            <input value={nuevoContacto.apellido} onChange={e => setNuevoContacto(p => ({ ...p, apellido: e.target.value }))} className={CLASE_CAMPO} placeholder="Apellido (opcional)" />
          </div>
          <InputTelefono
            indicativo={nuevoIndicativo.dial}
            onChangeIndicativo={val => {
              const p = PAISES.find(item => item.dial === val)
              if (p) setNuevoIndicativo(p)
            }}
            telefono={nuevoContacto.telefono}
            onChangeTelefono={val => setNuevoContacto(p => ({ ...p, telefono: val }))}
            placeholder="Celular"
          />
          <input value={nuevoContacto.email} onChange={e => setNuevoContacto(p => ({ ...p, email: e.target.value }))} className={CLASE_CAMPO} placeholder="Correo (opcional)" type="email" />
        </div>
      </Modal>
    </DetallePagina>
  )
}

// ── Tarjeta de contacto inline editable ─────────────────────────────

interface ContactoCardProps {
  contacto: ContactoState
  onChange: (campos: Partial<ContactoState>) => void
  onGuardar: () => void
}

function ContactoCard({ contacto: c, onChange, onGuardar }: ContactoCardProps) {
  const nombreError = c.nombre.trim() && esNombreDeEmpresa(c.nombre)
    ? 'El nombre parece ser de una empresa. Los contactos deben ser personas naturales.'
    : null

  return (
    <div className="rounded-xl border border-(--border) bg-(--bg-input) p-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoFormulario label="Nombre">
          <input value={c.nombre} onChange={e => onChange({ nombre: e.target.value })} className={CLASE_CAMPO} />
          {nombreError && <p className="text-[11px] text-[#FF5E4B] mt-0.5">{nombreError}</p>}
        </CampoFormulario>
        <CampoFormulario label="Apellido">
          <input value={c.apellido} onChange={e => onChange({ apellido: e.target.value })} className={CLASE_CAMPO} />
        </CampoFormulario>
        <CampoFormulario label="Cédula (opcional)" compuesto>
          <InputDocumento value={c.identificacion} onChange={val => onChange({ identificacion: val })} placeholder="Opcional" />
        </CampoFormulario>
        <CampoFormulario label="Correo">
          <input value={c.email} onChange={e => onChange({ email: e.target.value })} type="email" className={CLASE_CAMPO} />
        </CampoFormulario>
      </div>

      {/* Correos extra */}
      {c.correosExtra.map((correo, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={correo}
            onChange={e => onChange({ correosExtra: c.correosExtra.map((x, j) => j === i ? e.target.value : x) })}
            type="email"
            className={`${CLASE_CAMPO} flex-1`}
            placeholder="Correo adicional"
          />
          <button
            type="button"
            onClick={() => onChange({ correosExtra: c.correosExtra.filter((_, j) => j !== i) })}
            className="p-2 rounded-xl hover:bg-(--color-error)/10 text-(--color-error)"
            title="Quitar"
          >×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ correosExtra: [...c.correosExtra, ''] })} className="text-xs font-semibold text-brand hover:underline self-start">
        + Agregar otro correo
      </button>

      {/* Celular principal */}
      <div className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Celular</span>
        <InputTelefono
          indicativo={c.telefonoIndicativo.dial}
          onChangeIndicativo={val => {
            const p = PAISES.find(item => item.dial === val)
            if (p) onChange({ telefonoIndicativo: p })
          }}
          telefono={c.telefono}
          onChangeTelefono={val => onChange({ telefono: val })}
        />
      </div>

      {/* Celulares extra */}
      {c.telefonosExtra.map((t, i) => (
        <div key={i} className="flex gap-2 items-center">
          <div className="flex-1">
            <InputTelefono
              indicativo={t.indicativo}
              onChangeIndicativo={val => onChange({ telefonosExtra: c.telefonosExtra.map((x, j) => j === i ? { ...x, indicativo: val } : x) })}
              telefono={t.numero}
              onChangeTelefono={val => onChange({ telefonosExtra: c.telefonosExtra.map((x, j) => j === i ? { ...x, numero: val } : x) })}
              placeholder="Celular adicional"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange({ telefonosExtra: c.telefonosExtra.filter((_, j) => j !== i) })}
            className="p-2 rounded-xl hover:bg-(--color-error)/10 text-(--color-error)"
            title="Quitar"
          >×</button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ telefonosExtra: [...c.telefonosExtra, { indicativo: c.telefonoIndicativo.dial, numero: '' }] })}
        className="text-xs font-semibold text-brand hover:underline self-start"
      >
        + Agregar otro celular
      </button>

      {c.errorGuardar && <p className="text-sm text-[#FF5E4B]">{c.errorGuardar}</p>}
      <div className="pt-1">
        <button
          type="button"
          onClick={onGuardar}
          disabled={c.guardando || !!nombreError}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-[var(--color-brand)] text-[var(--text-on-brand)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {c.guardando ? 'Guardando...' : 'Guardar contacto'}
        </button>
      </div>
    </div>
  )
}
