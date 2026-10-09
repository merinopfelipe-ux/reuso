'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search as MagnifyingGlass, User, ChevronRight as CaretRight, Building2 as Buildings, Plus } from '@/components/ui/icons'
import { formatTelefonoVista } from '@/lib/telefono'
import { ContextoEmpresa } from '@/components/ui/contexto-empresa'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { SkeletonLista } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { InputTelefono } from '@/components/ui/input-telefono'
import { PAISES, type Pais } from '@/components/ui/selector-pais'

interface EmpresaOpcion { id: string; nombre: string }

interface EmpresaClienteResumen { id?: string; nit: string; razon_social: string; nombre_comercial?: string | null; direccion?: string | null; created_at?: string | null }

interface ClienteResumen {
  id: string
  tipo: 'persona' | 'empresa'
  nombre: string
  apellido: string | null
  identificacion: string | null
  telefono: string | null
  telefono_indicativo: string | null
  email: string | null
  direccion?: string | null
  empresa_cliente_id?: string | null
  es_contacto_real: boolean
  crm_empresas_clientes: EmpresaClienteResumen | EmpresaClienteResumen[] | null
}

interface EmpresaAgrupada {
  id: string
  nit: string
  razon_social: string
  nombre_comercial: string | null
  direccion: string | null
  created_at: string | null
  contactos: ClienteResumen[]
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-(--bg-primary)" />}>
      <ClientesContent />
    </Suspense>
  )
}

function ClientesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const empresaId = searchParams.get('empresa_id')

  const [esSuperAdmin, setEsSuperAdmin] = useState(false)
  const [empresas, setEmpresas] = useState<EmpresaOpcion[]>([])
  const [cargandoContexto, setCargandoContexto] = useState(true)
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'personas' | 'empresas'>('todos')

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [modoCrear, setModoCrear] = useState<'empresa' | 'persona'>('empresa')
  const [crearNit, setCrearNit] = useState('')
  const [crearRazonSocial, setCrearRazonSocial] = useState('')
  const [crearNombre, setCrearNombre] = useState('')
  const [crearApellido, setCrearApellido] = useState('')
  const [crearTelefono, setCrearTelefono] = useState('')
  const [crearIndicativo, setCrearIndicativo] = useState<Pais>(PAISES[0])
  const [crearEmail, setCrearEmail] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/cotizador/empresas')
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        if (d?.empresas) {
          setEsSuperAdmin(true)
          setEmpresas(d.empresas)
        }
      })
      .finally(() => setCargandoContexto(false))
  }, [])

  function cambiarEmpresa(id: string) {
    const params = new URLSearchParams(searchParams)
    if (id) params.set('empresa_id', id); else params.delete('empresa_id')
    router.replace(`/empresa/clientes?${params}`)
  }

  // Cada llamada se marca con un número propio — si dos búsquedas quedan en
  // el aire a la vez (ej. el usuario escribe rápido, o corrige un typo), la
  // respuesta de una búsqueda ya vieja nunca pisa el resultado de la más
  // reciente, aunque llegue después. Bug real corregido 2026-09-16: sin
  // esto, cuál búsqueda "ganaba" dependía de cuál red respondiera primero,
  // no de cuál se pidió al final.
  const ultimaPeticionRef = useRef(0)

  const cargarClientes = useCallback(async () => {
    if (esSuperAdmin && !empresaId) { setClientes([]); setCargando(false); return }
    const idPeticion = ++ultimaPeticionRef.current
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (busqueda) params.set('q', busqueda)
      if (esSuperAdmin && empresaId) params.set('empresa_id', empresaId)
      const res = await fetch(`/api/cotizador/clientes?${params}`)
      const d = await res.json()
      if (idPeticion !== ultimaPeticionRef.current) return
      if (d.clientes) setClientes(d.clientes)
    } catch {
      // silencioso: la lista simplemente queda vacía, sin bloquear la página
    } finally {
      if (idPeticion === ultimaPeticionRef.current) setCargando(false)
    }
  }, [busqueda, esSuperAdmin, empresaId])

  useEffect(() => {
    if (cargandoContexto) return
    cargarClientes()
  }, [cargarClientes, cargandoContexto])

  const linkConEmpresa = useCallback((ruta: string) => {
    if (esSuperAdmin && empresaId) return `${ruta}?empresa_id=${empresaId}`
    return ruta
  }, [esSuperAdmin, empresaId])

  async function crearCliente() {
    setErrorCrear(null)
    if (modoCrear === 'empresa' && !crearNit.trim()) {
      setErrorCrear('El NIT es obligatorio.')
      return
    }
    if (modoCrear === 'persona' && !crearTelefono.trim()) {
      setErrorCrear('El celular es obligatorio.')
      return
    }
    setCreando(true)
    try {
      const body = modoCrear === 'empresa'
        ? { tipo: 'empresa', nit: crearNit.trim(), razon_social: crearRazonSocial.trim() || crearNit.trim() }
        : { tipo: 'persona', nombre: crearNombre.trim() || undefined, apellido: crearApellido.trim() || undefined, telefono: crearTelefono.trim(), telefono_indicativo: crearIndicativo.dial, email: crearEmail.trim() || undefined }
      const params = new URLSearchParams()
      if (esSuperAdmin && empresaId) params.set('empresa_id', empresaId)
      const res = await fetch(`/api/cotizador/clientes${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) { setErrorCrear(d.error ?? 'No se pudo crear el cliente.'); return }
      setModalCrearAbierto(false)
      setCrearNit(''); setCrearRazonSocial(''); setCrearNombre(''); setCrearApellido(''); setCrearTelefono(''); setCrearEmail('')
      // Navegar a la página de la empresa, no del contacto
      const empClienteId = d.cliente.empresa_cliente_id
      if (empClienteId) {
        router.push(linkConEmpresa(`/empresa/clientes/empresa/${empClienteId}`))
      } else {
        router.push(linkConEmpresa(`/empresa/clientes/${d.cliente.id}`))
      }
    } catch {
      setErrorCrear('Error de conexión. Intenta de nuevo.')
    } finally {
      setCreando(false)
    }
  }

  const tp = 'text-(--text-primary)'
  const ts = 'text-(--text-secondary)'
  const cardBg = 'bg-(--bg-card) border-(--border)'

  // Agrupación de empresas y personas.
  // Solo se mapea como empresa si tiene empresa_cliente_id (registro real en
  // crm_empresas_clientes). Los contactos con tipo='empresa' pero sin ese FK
  // son datos históricos — se tratan como individuales (van a /clientes/[id]).
  const empresasMap = new Map<string, EmpresaAgrupada>()

  clientes.forEach(c => {
    const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
    if (emp?.nit && emp?.id) {
      const key = emp.nit
      if (!empresasMap.has(key)) {
        empresasMap.set(key, {
          id: emp.id,
          nit: emp.nit,
          razon_social: emp.razon_social,
          nombre_comercial: emp.nombre_comercial || null,
          direccion: emp.direccion || null,
          created_at: emp.created_at || null,
          contactos: []
        })
      }
      if (c.es_contacto_real) empresasMap.get(key)!.contactos.push(c)
    } else if (c.empresa_cliente_id) {
      // Tiene empresa_cliente_id pero el join no devolvió datos (raro) —
      // usar el ID del FK para navegar correctamente.
      const key = c.empresa_cliente_id
      if (!empresasMap.has(key)) {
        empresasMap.set(key, {
          id: c.empresa_cliente_id,
          nit: c.identificacion || 'Sin NIT',
          razon_social: c.nombre,
          nombre_comercial: null,
          direccion: c.direccion || null,
          created_at: null,
          contactos: []
        })
      }
      if (c.es_contacto_real) empresasMap.get(key)!.contactos.push(c)
    }
    // Si tipo='empresa' pero empresa_cliente_id es null → dato histórico,
    // se muestra en la sección de individuales (personasSueltas) abajo.
  })

  const empresasLista = Array.from(empresasMap.values())
  // Personas individuales: personas B2C + contactos históricos tipo='empresa'
  // sin empresa_cliente_id (datos anteriores a crm_empresas_clientes).
  const personasTodas = clientes.filter(c =>
    c.tipo === 'persona' || (c.tipo === 'empresa' && !c.empresa_cliente_id && !(Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes)?.id)
  )

  return (
    <div className="pb-6 bg-(--bg-primary)">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminPageHeader
          titulo="Clientes"
          accion={(!esSuperAdmin || empresaId) ? (
            <button
              type="button"
              onClick={() => { setErrorCrear(null); setModalCrearAbierto(true) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--color-brand)] text-[var(--text-on-brand)] hover:opacity-90 transition-opacity"
            >
              <Plus size={16} sinAnimacion /> Nuevo cliente
            </button>
          ) : undefined}
        />

        {esSuperAdmin && (
          <ContextoEmpresa
            empresas={empresas}
            value={empresaId ?? ''}
            onChange={cambiarEmpresa}
            etiqueta="Viendo clientes de"
            mensajeVacio="Selecciona una empresa arriba para ver sus clientes."
            listo={!cargandoContexto}
          />
        )}

        {(!esSuperAdmin || empresaId) ? (
          <>
            {/* Buscador + Filtro tipo */}
            <div className="space-y-3 mb-5">
              <div className={`rounded-card border p-3 flex items-center gap-2 bg-(--bg-card) border-(--border)`}>
                <div className="flex items-center gap-2 flex-1 rounded-input border border-(--border) px-3 py-2 bg-(--bg-input)">
                  <MagnifyingGlass size={16} className={ts} />
                  <input
                    className={`flex-1 bg-transparent text-sm outline-hidden ${tp} placeholder:opacity-40`}
                    placeholder="Busca por nombre, celular o NIT"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                </div>
              </div>

              {/* Pills de Filtro */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setFiltroTipo('todos')}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold transition-all ${
                    filtroTipo === 'todos'
                      ? 'bg-[#00827C] text-white shadow-xs'
                      : 'bg-(--bg-card) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  Todos ({clientes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('personas')}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filtroTipo === 'personas'
                      ? 'bg-[#00827C] text-white shadow-xs'
                      : 'bg-(--bg-card) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  <User size={14} />
                  Personas ({personasTodas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('empresas')}
                  className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filtroTipo === 'empresas'
                      ? 'bg-[#00827C] text-white shadow-xs'
                      : 'bg-(--bg-card) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  <Buildings size={14} />
                  Empresas ({empresasLista.length})
                </button>
              </div>
            </div>

            {cargando ? (
              <SkeletonLista filas={3} />
            ) : clientes.length === 0 ? (
              <div className={`rounded-card border p-8 text-center ${cardBg}`}>
                <p className={`text-sm ${ts}`}>Aún no hay clientes registrados. Se crean desde una nueva cotización.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* VISTA: PERSONAS */}
                {(filtroTipo === 'personas' || (filtroTipo === 'todos' && personasTodas.length > 0)) && (
                  <div>
                    {filtroTipo === 'todos' && (
                      <h2 className="text-xs font-bold text-(--text-secondary) mb-3 flex items-center gap-1.5">
                        <User size={14} className="text-[#00827C]" />
                        Personas ({personasTodas.length})
                      </h2>
                    )}
                    <div className="space-y-2">
                      {personasTodas.map(c => {
                        const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
                        return (
                          <button
                            key={c.id}
                            onClick={() => router.push(linkConEmpresa(`/empresa/clientes/${c.id}`))}
                            className={`w-full rounded-card border p-3.5 text-left transition-all flex items-center gap-3 bg-(--bg-card) border-(--border) hover:bg-(--bg-hover)`}
                          >
                            <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                              <User size={16} className="text-brand" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${tp}`}>{c.nombre} {c.apellido ?? ''}</p>
                              <p className={`text-xs whitespace-nowrap overflow-visible ${ts}`}>
                                {formatTelefonoVista(c.telefono, c.telefono_indicativo)}
                                {emp ? ` · ${emp.razon_social} (NIT ${emp.nit.replace(/^NIT\s*/i, '')})` : ''}
                              </p>
                            </div>
                            <CaretRight size={16} className={ts} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* VISTA: EMPRESAS CON PERSONAS VINCULADAS */}
                {(filtroTipo === 'empresas' || (filtroTipo === 'todos' && empresasLista.length > 0)) && (
                  <div>
                    {filtroTipo === 'todos' && (
                      <h2 className="text-xs font-bold text-(--text-secondary) mb-3 flex items-center gap-1.5">
                        <Buildings size={14} className="text-[#00827C]" />
                        Empresas ({empresasLista.length})
                      </h2>
                    )}
                    <div className="space-y-3">
                      {empresasLista.map(emp => (
                        <div
                          key={emp.id}
                          className="rounded-card border p-4 bg-(--bg-card) border-(--border) space-y-3"
                        >
                          {/* Encabezado de la Empresa — clicable, navega a la página de la empresa */}
                          <button
                            type="button"
                            onClick={() => router.push(linkConEmpresa(`/empresa/clientes/empresa/${emp.id}`))}
                            className="w-full flex items-center justify-between gap-3 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#00827C]/10 flex items-center justify-center shrink-0">
                                <Buildings size={20} className="text-[#00827C]" />
                              </div>
                              <div className="min-w-0">
                                <h3 className={`text-sm font-bold truncate ${tp}`}>
                                  {emp.razon_social}
                                  {emp.nombre_comercial && <span className="font-normal text-xs text-(--text-secondary) ml-1.5">({emp.nombre_comercial})</span>}
                                </h3>
                                <p className={`text-xs ${ts}`}>
                                  NIT {emp.nit.replace(/^NIT\s*/i, '')} {emp.direccion ? `· ${emp.direccion}` : ''}
                                </p>
                              </div>
                            </div>
                            <CaretRight size={16} className={`${ts} shrink-0`} />
                          </button>

                          {/* Personas Vinculadas a esta Empresa */}
                          {emp.contactos.length > 0 && (
                            <div className="pt-2 border-t border-(--border) space-y-1.5">
                              <p className="text-[10px] font-bold text-(--text-secondary) mb-1">
                                Personas vinculadas
                              </p>
                              {emp.contactos.map(contacto => (
                                <button
                                  key={contacto.id}
                                  type="button"
                                  onClick={() => router.push(linkConEmpresa(`/empresa/clientes/empresa/${emp.id}`))}
                                  className="w-full text-left p-2.5 rounded-input bg-(--bg-input) border border-(--border) hover:bg-(--bg-hover) transition-colors flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-[#00827C]/10 flex items-center justify-center shrink-0">
                                      <User size={12} className="text-[#00827C]" />
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-semibold text-(--text-primary) truncate">
                                        {contacto.nombre} {contacto.apellido ?? ''}
                                      </span>
                                      {/* El teléfono nunca se parte ni se corta con "..." —
                                          directriz explícita, regla general de la plataforma. */}
                                      {contacto.telefono && (
                                        <span className="text-[11px] text-(--text-secondary) whitespace-nowrap shrink-0">
                                          {formatTelefonoVista(contacto.telefono, contacto.telefono_indicativo)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <CaretRight size={14} className="text-(--text-secondary) shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      <Modal
        abierto={modalCrearAbierto}
        onClose={() => !creando && setModalCrearAbierto(false)}
        titulo="Nuevo cliente"
        textoConfirmar={creando ? 'Creando...' : 'Crear'}
        onConfirmar={() => { if (!creando) crearCliente() }}
      >
        <div className="flex flex-col gap-4">
          {/* Selector de tipo */}
          <div className="flex gap-2 p-1 rounded-xl bg-(--bg-input) border border-(--border)">
            {(['empresa', 'persona'] as const).map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => { setModoCrear(tipo); setErrorCrear(null) }}
                className={`flex-1 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${
                  modoCrear === tipo
                    ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)] shadow-xs'
                    : 'text-(--text-secondary) hover:text-(--text-primary)'
                }`}
              >
                {tipo === 'empresa' ? 'Empresa' : 'Persona'}
              </button>
            ))}
          </div>

          {errorCrear && <p className="text-sm text-[#FF5E4B]">{errorCrear}</p>}

          {modoCrear === 'empresa' ? (
            <div className="flex flex-col gap-3">
              <input value={crearNit} onChange={e => setCrearNit(e.target.value)} className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand w-full" placeholder="NIT" />
              <input value={crearRazonSocial} onChange={e => setCrearRazonSocial(e.target.value)} className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand w-full" placeholder="Razón social" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={crearNombre} onChange={e => setCrearNombre(e.target.value)} className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand w-full" placeholder="Nombre" />
                <input value={crearApellido} onChange={e => setCrearApellido(e.target.value)} className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand w-full" placeholder="Apellido" />
              </div>
              <InputTelefono
                indicativo={crearIndicativo.dial}
                onChangeIndicativo={val => { const p = PAISES.find(x => x.dial === val); if (p) setCrearIndicativo(p) }}
                telefono={crearTelefono}
                onChangeTelefono={setCrearTelefono}
              />
              <input value={crearEmail} onChange={e => setCrearEmail(e.target.value)} type="email" className="rounded-xl border border-(--border) bg-(--bg-input) px-3 py-2 text-sm text-(--text-primary) outline-hidden focus:border-brand w-full" placeholder="Correo" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
