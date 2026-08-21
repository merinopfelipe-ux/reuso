'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search as MagnifyingGlass, User, Building2 as Buildings, ChevronRight as CaretRight, Info } from '@/components/ui/icons'
import { formatTelefonoVista } from '@/lib/telefono'
import { SelectorEmpresa } from '@/components/ui/selector-empresa'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { SkeletonLista } from '@/components/ui/skeleton'

interface EmpresaOpcion { id: string; nombre: string }

interface EmpresaClienteResumen { id?: string; nit: string; razon_social: string; nombre_comercial?: string | null; direccion?: string | null }

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
  contactos: ClienteResumen[]
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[60vh] bg-[var(--bg-primary)]" />}>
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

  const cargarClientes = useCallback(async () => {
    if (esSuperAdmin && !empresaId) { setClientes([]); setCargando(false); return }
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (busqueda) params.set('q', busqueda)
      if (esSuperAdmin && empresaId) params.set('empresa_id', empresaId)
      const res = await fetch(`/api/cotizador/clientes?${params}`)
      const d = await res.json()
      if (d.clientes) setClientes(d.clientes)
    } catch {
      // silencioso: la lista simplemente queda vacía, sin bloquear la página
    } finally {
      setCargando(false)
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

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  // Agrupación de empresas y personas
  const empresasMap = new Map<string, EmpresaAgrupada>()

  clientes.forEach(c => {
    const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
    if (emp && emp.nit) {
      const key = emp.nit
      if (!empresasMap.has(key)) {
        empresasMap.set(key, {
          id: emp.id || key,
          nit: emp.nit,
          razon_social: emp.razon_social,
          nombre_comercial: emp.nombre_comercial || null,
          direccion: emp.direccion || null,
          contactos: []
        })
      }
      if (c.es_contacto_real) empresasMap.get(key)!.contactos.push(c)
    } else if (c.tipo === 'empresa' || c.empresa_cliente_id) {
      const key = c.empresa_cliente_id || `cliente-${c.id}`
      if (!empresasMap.has(key)) {
        empresasMap.set(key, {
          id: c.id,
          nit: c.identificacion || 'Sin NIT',
          razon_social: c.nombre,
          nombre_comercial: null,
          direccion: c.direccion || null,
          contactos: []
        })
      }
      if (c.es_contacto_real) empresasMap.get(key)!.contactos.push(c)
    }
  })

  const empresasLista = Array.from(empresasMap.values())
  const personasTodas = clientes.filter(c => c.tipo === 'persona')

  return (
    <div className="pb-6 bg-[var(--bg-primary)]">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminPageHeader titulo="Clientes" />

        {esSuperAdmin && (
          <div className="rounded-[12px] border p-4 mb-4 flex items-center gap-3 bg-[var(--bg-card)] border-[var(--border)]">
            <Buildings size={18} className="text-[#00827C] flex-shrink-0" />
            <div className="flex-1">
              <p className={`text-xs font-semibold ${ts} mb-1`}>Viendo clientes de</p>
              <SelectorEmpresa empresas={empresas} value={empresaId ?? ''} onChange={cambiarEmpresa} />
            </div>
          </div>
        )}

        {esSuperAdmin && !empresaId && !cargandoContexto ? (
          <div className="rounded-[12px] border border-[#59A6E4]/20 bg-[#59A6E4]/10 p-4 flex items-center gap-2.5">
            <Info size={18} className="text-[#59A6E4] flex-shrink-0" />
            <p className="text-sm text-[#59A6E4] font-medium">Selecciona una empresa arriba para ver sus clientes.</p>
          </div>
        ) : (
          <>
            {/* Buscador + Filtro tipo */}
            <div className="space-y-3 mb-5">
              <div className={`rounded-[12px] border p-3 flex items-center gap-2 bg-[var(--bg-card)] border-[var(--border)]`}>
                <div className="flex items-center gap-2 flex-1 rounded-[8px] border border-[var(--border)] px-3 py-2 bg-[var(--bg-input)]">
                  <MagnifyingGlass size={16} className={ts} />
                  <input
                    className={`flex-1 bg-transparent text-sm outline-none ${tp} placeholder:opacity-40`}
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
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                    filtroTipo === 'todos'
                      ? 'bg-[#00827C] text-white shadow-sm'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Todos ({clientes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('personas')}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filtroTipo === 'personas'
                      ? 'bg-[#00827C] text-white shadow-sm'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <User size={14} />
                  Personas ({personasTodas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('empresas')}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filtroTipo === 'empresas'
                      ? 'bg-[#00827C] text-white shadow-sm'
                      : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
              <div className={`rounded-[12px] border p-8 text-center ${cardBg}`}>
                <p className={`text-sm ${ts}`}>Aún no hay clientes registrados. Se crean desde una nueva cotización.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* VISTA: PERSONAS */}
                {(filtroTipo === 'personas' || (filtroTipo === 'todos' && personasTodas.length > 0)) && (
                  <div>
                    {filtroTipo === 'todos' && (
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
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
                            className={`w-full rounded-[12px] border p-3.5 text-left transition-all flex items-center gap-3 bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-hover)]`}
                          >
                            <div className="w-9 h-9 rounded-full bg-[#00827C]/10 flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-[#00827C]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${tp}`}>{c.nombre} {c.apellido ?? ''}</p>
                              <p className={`text-xs whitespace-nowrap overflow-visible ${ts}`}>
                                {formatTelefonoVista(c.telefono, c.telefono_indicativo)}
                                {emp ? ` · ${emp.razon_social} (NIT ${emp.nit})` : ''}
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
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                        <Buildings size={14} className="text-[#00827C]" />
                        Empresas ({empresasLista.length})
                      </h2>
                    )}
                    <div className="space-y-3">
                      {empresasLista.map(emp => (
                        <div
                          key={emp.id}
                          className="rounded-[12px] border p-4 bg-[var(--bg-card)] border-[var(--border)] space-y-3"
                        >
                          {/* Encabezado de la Empresa */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#00827C]/10 flex items-center justify-center flex-shrink-0">
                                <Buildings size={20} className="text-[#00827C]" />
                              </div>
                              <div className="min-w-0">
                                <h3 className={`text-sm font-bold truncate ${tp}`}>
                                  {emp.razon_social}
                                  {emp.nombre_comercial && <span className="font-normal text-xs text-[var(--text-secondary)] ml-1.5">({emp.nombre_comercial})</span>}
                                </h3>
                                <p className={`text-xs ${ts}`}>
                                  NIT {emp.nit} {emp.direccion ? `· ${emp.direccion}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#00827C]/10 text-[#00827C] flex-shrink-0">
                              {emp.contactos.length} {emp.contactos.length === 1 ? 'contacto' : 'contactos'}
                            </span>
                          </div>

                          {/* Personas Vinculadas a esta Empresa */}
                          {emp.contactos.length > 0 && (
                            <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                                Personas vinculadas
                              </p>
                              {emp.contactos.map(contacto => (
                                <button
                                  key={contacto.id}
                                  type="button"
                                  onClick={() => router.push(linkConEmpresa(`/empresa/clientes/${contacto.id}`))}
                                  className="w-full text-left p-2.5 rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-[#00827C]/10 flex items-center justify-center flex-shrink-0">
                                      <User size={12} className="text-[#00827C]" />
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                        {contacto.nombre} {contacto.apellido ?? ''}
                                      </span>
                                      {/* El teléfono nunca se parte ni se corta con "..." —
                                          directriz explícita, regla general de la plataforma. */}
                                      {contacto.telefono && (
                                        <span className="text-[11px] text-[var(--text-secondary)] whitespace-nowrap flex-shrink-0">
                                          {formatTelefonoVista(contacto.telefono, contacto.telefono_indicativo)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <CaretRight size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
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
        )}
      </div>
    </div>
  )
}
