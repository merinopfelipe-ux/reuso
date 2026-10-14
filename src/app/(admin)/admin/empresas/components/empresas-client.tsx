'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink as ArrowSquareOut, Search as MagnifyingGlass, ChevronDown, UserPlus as UsersPlus, Power, Download } from '@/components/ui/icons'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import { CasillaCabecera, CasillaFila, BarraSeleccion } from '@/components/tabla/seleccion'
import { MenuFila } from '@/components/tabla/menu-fila'
import { PlanBadge } from '@/components/admin/plan-badge'
import { BotonDescargar } from '@/components/boton-descargar'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import { Pagination } from '@/components/ui/pagination'
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'
import { formatNumero } from '@/lib/format'
import type { Plan } from '@/types'

interface EmpresaStat {
  id: string; nombre: string; slug: string; plan: Plan; activa: boolean
  sector: string | null; notas_admin: string | null; created_at: string
  total_empleados: number; total_co2: number
}

const PLANES: Plan[] = ['free', 'lab', 'impulso', 'ilimitado']

interface Props {
  empresas: EmpresaStat[]
  total: number
  page: number
  pageSize: number
  search: string
  planFiltro: Plan | ''
}

export function EmpresasClient({ empresas, total, page, pageSize, search, planFiltro }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busquedaLocal, setBusquedaLocal] = useState(search)
  const [abiertoPlan, setAbiertoPlan] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const { sorted: empresasOrdenadas, sort, toggleSort } = useSortable(empresas as unknown as Record<string, unknown>[])

  // Selección en grupo: solo las filas de la página actual.
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [confirmarActiva, setConfirmarActiva] = useState<boolean | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [errorGrupo, setErrorGrupo] = useState('')

  const empresasPagina = empresasOrdenadas as unknown as EmpresaStat[]
  const idsPagina = empresasPagina.map(e => e.id)
  const todasPagina = idsPagina.length > 0 && idsPagina.every(id => seleccion.has(id))
  const algunasPagina = idsPagina.some(id => seleccion.has(id))
  // Solo cuentan las filas visibles: una selección de otra página no se aplica aquí.
  const seleccionados = idsPagina.filter(id => seleccion.has(id))

  function toggleTodas() {
    setSeleccion(prev => {
      const siguiente = new Set(prev)
      if (todasPagina) idsPagina.forEach(id => siguiente.delete(id))
      else idsPagina.forEach(id => siguiente.add(id))
      return siguiente
    })
  }

  function toggleFila(id: string) {
    setSeleccion(prev => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  // Cambia el estado activa de varias empresas con el PATCH que ya existe.
  async function cambiarActiva(ids: string[], activa: boolean) {
    setAplicando(true)
    setErrorGrupo('')
    const resultados = await Promise.all(
      ids.map(id =>
        fetch(`/api/admin/empresas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activa }),
        })
          .then(r => r.ok)
          .catch(() => false)
      )
    )
    const fallidas = resultados.filter(ok => !ok).length
    setAplicando(false)
    setConfirmarActiva(null)
    setSeleccion(new Set())
    if (fallidas > 0) setErrorGrupo(`No se pudieron cambiar ${fallidas} de ${ids.length} empresas.`)
    startTransition(() => router.refresh())
  }

  function filasSeleccionadas() {
    return empresasPagina
      .filter(e => seleccionados.includes(e.id))
      .map(e => ({
        Empresa: e.nombre,
        Plan: e.plan,
        Sector: e.sector ?? '',
        Empleados: e.total_empleados,
        'CO₂ (kg)': e.total_co2,
        Estado: e.activa ? 'Activa' : 'Inactiva',
      }))
  }

  const [modalInvitar, setModalInvitar] = useState(false)
  const [invitarForm, setInvitarForm] = useState({ email: '', plan: 'lab' as 'lab' | 'impulso' | 'ilimitado', nombre: '' })
  const [invitando, setInvitando] = useState(false)
  const [invitarError, setInvitarError] = useState('')
  const [invitarLink, setInvitarLink] = useState<string | null>(null)

  async function handleInvitarEmpresa() {
    setInvitando(true)
    setInvitarError('')
    const res = await fetch('/api/admin/empresas/invitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: invitarForm.email,
        plan: invitarForm.plan,
        nombre: invitarForm.nombre.trim() || undefined,
      }),
    })
    const data = await res.json()
    setInvitando(false)
    if (!res.ok) {
      setInvitarError(data.error ?? 'Error al enviar la invitación.')
      return
    }
    setInvitarLink(`${window.location.origin}/invitacion/${data.rawToken}`)
  }

  function cerrarModalInvitar() {
    setModalInvitar(false)
    setInvitarForm({ email: '', plan: 'lab', nombre: '' })
    setInvitarError('')
    setInvitarLink(null)
  }

  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    setBusquedaLocal(search)
  }, [search])

  function navegar(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.search) sp.set('search', params.search)
    if (params.plan) sp.set('plan', params.plan)
    if (params.page && params.page !== '1') sp.set('page', params.page)
    const ps = params.pageSize !== undefined ? params.pageSize : String(pageSize)
    if (ps && ps !== '25') sp.set('pageSize', ps)
    startTransition(() => router.push(`/admin/empresas?${sp.toString()}`))
  }

  function onBusquedaChange(val: string) {
    setBusquedaLocal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navegar({ search: val, plan: planFiltro, page: '1', pageSize: String(pageSize) })
    }, 300)
  }

  const queryParams = new URLSearchParams()
  if (search) queryParams.set('search', search)
  if (planFiltro) queryParams.set('plan', planFiltro)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-placeholder) pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={busquedaLocal}
            onChange={e => onBusquedaChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-(--border) bg-(--bg-input) text-(--text-primary) text-sm outline-hidden transition-colors focus:border-brand"
          />
        </div>

        {/* Filtros: En celular 2 columnas, en desktop en línea */}
        <div className="grid grid-cols-2 sm:flex gap-3">
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setAbiertoPlan(v => !v)}
              className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border border-(--border) bg-(--bg-input) text-xs font-semibold text-(--text-primary) cursor-pointer hover:bg-(--bg-hover) transition-colors"
            >
              <span className="truncate">{planFiltro ? `Plan: ${planFiltro.charAt(0).toUpperCase() + planFiltro.slice(1)}` : 'Todos los planes'}</span>
              <ChevronDown size={14} className="text-(--text-secondary) shrink-0" />
            </button>
            {abiertoPlan && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAbiertoPlan(false)} />
                <div className="absolute top-full left-0 mt-1.5 w-full sm:w-48 border border-(--border) rounded-xl shadow-lg z-50 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                  <div className="p-1 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => { navegar({ search: busquedaLocal, plan: '', page: '1', pageSize: String(pageSize) }); setAbiertoPlan(false) }}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-(--bg-hover) text-(--text-primary)"
                    >
                      Todos los planes
                    </button>
                    {PLANES.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { navegar({ search: busquedaLocal, plan: p, page: '1', pageSize: String(pageSize) }); setAbiertoPlan(false) }}
                        className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-(--bg-hover) text-(--text-primary)"
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Botones */}
        <div className="w-full sm:w-auto sm:ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setModalInvitar(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
            style={{ background: 'var(--color-brand)', color: 'var(--text-on-brand)' }}
          >
            <UsersPlus size={14} sinAnimacion />
            Invitar empresa nueva
          </button>
          <div className="w-full sm:w-auto">
            <BotonDescargar endpoint="/api/admin/empresas/exportar" queryParams={queryParams.toString()} label="Exportar" />
          </div>
        </div>
      </div>

      <BarraSeleccion cantidad={seleccionados.length} singular="empresa" plural="empresas">
        <BotonDescargarCliente
          data={filasSeleccionadas()}
          nombre="empresas_seleccionadas"
          tituloPdf="Empresas seleccionadas"
          label="Exportar"
          icon={<Download size={14} />}
        />
        <button type="button" onClick={() => setConfirmarActiva(true)} className="text-sm font-semibold px-3 py-1.5 bg-transparent text-brand transition-opacity duration-200 hover:opacity-50">
          Activar
        </button>
        <button type="button" onClick={() => setConfirmarActiva(false)} className="text-sm font-semibold px-3 py-1.5 bg-transparent text-error transition-opacity duration-200 hover:opacity-50">
          Desactivar
        </button>
      </BarraSeleccion>
      {errorGrupo && <p className="text-sm m-0 text-error">{errorGrupo}</p>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Tabla */}
        <div className="flex-1 min-w-0 rounded-card border border-(--border) bg-(--bg-card) overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-(--bg-table-header) text-brand">
                  <CasillaCabecera todas={todasPagina} algunas={algunasPagina} onToggle={toggleTodas} />
                  <SortTh col="nombre" sort={sort} onToggle={toggleSort}>Empresa</SortTh>
                  <SortTh col="plan" sort={sort} onToggle={toggleSort}>Plan</SortTh>
                  <SortTh col="sector" sort={sort} onToggle={toggleSort}>Sector</SortTh>
                  <SortTh col="total_empleados" sort={sort} onToggle={toggleSort} align="right">Empleados</SortTh>
                  <SortTh col="total_co2" sort={sort} onToggle={toggleSort} align="right">CO₂ (kg)</SortTh>
                  <SortTh col="activa" sort={sort} onToggle={toggleSort} align="center">Estado</SortTh>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {empresasOrdenadas.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-brand)' }}>No hay empresas registradas.</td></tr>
                )}
                {(empresasOrdenadas as unknown as EmpresaStat[]).map((emp, idx) => (
                  <tr key={emp.id}
                    onClick={() => router.push(`/admin/empresas/${emp.id}`)}
                    className={`transition-colors duration-150 hover:bg-(--bg-table-hover) ${
                      idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                    }`}
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <CasillaFila marcada={seleccion.has(emp.id)} onToggle={() => toggleFila(emp.id)} label={`Seleccionar ${emp.nombre}`} />
                    <td className="px-4 py-3 text-(--text-primary)">{emp.nombre}</td>
                    <td className="px-4 py-3"><PlanBadge plan={emp.plan} /></td>
                    <td className="px-4 py-3 text-(--text-secondary)">{emp.sector ?? '-'}</td>
                    <td className="px-4 py-3 text-(--text-secondary) text-right whitespace-nowrap">{formatNumero(emp.total_empleados)}</td>
                    <td className="px-4 py-3 text-(--text-secondary) text-right whitespace-nowrap">{formatNumero(emp.total_co2, { unidad: 'kg' })}</td>
                    <td className="px-4 py-3 text-center">
                      <span style={{ 
                        padding: '2px 10px', 
                        borderRadius: 100, 
                        fontSize: 10, 
                        fontWeight: 800, 
                        background: emp.activa ? 'rgba(56,185,142,0.1)' : 'rgba(255,94,75,0.08)', 
                        color: emp.activa ? 'var(--color-success-content)' : 'var(--color-error-content)',
                        border: '1px solid currentColor',
                        opacity: 0.9,
                      }}>
                        {emp.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <MenuFila
                        label={`Acciones de ${emp.nombre}`}
                        acciones={[
                          { label: 'Abrir en nueva página', icono: <ArrowSquareOut size={14} sinAnimacion />, href: `/admin/empresas/${emp.id}` },
                          { label: emp.activa ? 'Desactivar' : 'Activar', icono: <Power size={14} sinAnimacion />, onClick: () => cambiarActiva([emp.id], !emp.activa), peligro: emp.activa },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación — componente único de la plataforma. Siempre después
              de la última fila (nunca antes de la tabla). El texto de conteo
              se acorta primero (min-width:0 + ellipsis) para que el
              paginador — con el selector "N por página" — nunca se
              comprima ni quede oculto detrás de un scroll (bug real
              reportado: había que scrollear para verlo). */}
          <div className="flex items-center justify-between gap-2 px-4 py-4 mt-1 border-t border-(--border-light)">
            <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis min-w-0 text-(--text-secondary)" style={{ flexShrink: 1 }}>
              {total} empresas · Página {page} de {Math.max(1, totalPages)}
            </span>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => navegar({ search: busquedaLocal, plan: planFiltro, page: String(p), pageSize: String(pageSize) })}
                porPagina={pageSize}
                onPorPaginaChange={(n) => navegar({ search: busquedaLocal, plan: planFiltro, page: '1', pageSize: String(n) })}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        abierto={confirmarActiva !== null}
        onClose={() => !aplicando && setConfirmarActiva(null)}
        titulo={confirmarActiva ? 'Activar empresas' : 'Desactivar empresas'}
        descripcion={`${seleccionados.length} ${seleccionados.length === 1 ? 'empresa seleccionada' : 'empresas seleccionadas'}`}
        varianteConfirmar={confirmarActiva ? 'brand' : 'error'}
        textoConfirmar={aplicando ? 'Aplicando...' : confirmarActiva ? 'Activar' : 'Desactivar'}
        onConfirmar={() => confirmarActiva !== null && cambiarActiva(seleccionados, confirmarActiva)}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Puedes volver a cambiar el estado de estas empresas en cualquier momento.
        </p>
      </Modal>

      <Modal
        abierto={modalInvitar}
        onClose={cerrarModalInvitar}
        titulo="Invitar empresa nueva"
        descripcion="Para un cliente que ya compró un plan pago."
        varianteConfirmar="brand"
        textoConfirmar={invitando ? 'Enviando...' : 'Enviar invitación'}
        onConfirmar={handleInvitarEmpresa}
      >
        {invitarLink ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Invitación enviada. Si el correo no llega, comparte este enlace manualmente:
            </p>
            <p style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--color-brand)', margin: 0 }}>
              {invitarLink}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                Correo del dueño
              </label>
              <input
                type="email"
                value={invitarForm.email}
                onChange={e => setInvitarForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-(--border) bg-(--bg-input) text-sm text-(--text-primary)"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                Plan comprado
              </label>
              <Selector
                value={invitarForm.plan}
                onChange={val => setInvitarForm(p => ({ ...p, plan: val as 'lab' | 'impulso' | 'ilimitado' }))}
                opciones={[
                  { value: 'lab', label: 'Circular Lab' },
                  { value: 'impulso', label: 'Impulso Sostenible' },
                  { value: 'ilimitado', label: 'Impacto Ilimitado' },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                Nombre de la empresa (opcional)
              </label>
              <input
                type="text"
                value={invitarForm.nombre}
                onChange={e => setInvitarForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Déjalo vacío para que el dueño lo escriba al aceptar"
                className="w-full px-3 py-2.5 rounded-xl border border-(--border) bg-(--bg-input) text-sm text-(--text-primary)"
              />
            </div>
            {invitarError && (
              <p style={{ color: 'var(--color-error)', fontSize: 13, margin: 0 }}>{invitarError}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
