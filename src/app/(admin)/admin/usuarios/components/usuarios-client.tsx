'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search as MagnifyingGlass, ChevronLeft as CaretLeft, ChevronRight as CaretRight, PlusCircle, KeyRound } from '@/components/ui/icons'
import { BotonDescargar } from '@/components/boton-descargar'
import { SortTh } from '@/components/sort-th'
import { useSortable } from '@/lib/use-sortable'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { Rol } from '@/types'

const PAGE_SIZES = [10, 20, 50, 100]

interface PerfilRow {
  id: string
  user_id: string
  nombre: string
  email: string
  rol: Rol
  created_at: string
  empresas: { nombre: string } | { nombre: string }[] | null
}

const ROLES: Rol[] = ['super_admin', 'empresa_admin', 'empleado', 'usuario_libre']
const ROL_LABEL: Record<Rol, string> = {
  super_admin: 'Superadmin', empresa_admin: 'Empresa Admin',
  empleado: 'Empleado', usuario_libre: 'Usuario Libre',
}

interface Props {
  usuarios: PerfilRow[]
  total: number
  page: number
  pageSize: number
  search: string
  rolFiltro: string
  currentUserId: string
  empresasDisponibles: { id: string; nombre: string }[]
}

const ROL_CREAR: Rol[] = ['empleado', 'empresa_admin', 'super_admin']
const ROLES_CON_EMPRESA: Rol[] = ['empleado', 'empresa_admin']

const EMPTY_FORM = { email: '', nombre: '', apellido: '', apodo: '', rol: 'empleado' as Rol, empresa_id: '' }

export function UsuariosClient({ usuarios, total, page, pageSize, search, rolFiltro, currentUserId, empresasDisponibles }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [cambiando, setCambiando] = useState<string | null>(null)
  const [busquedaLocal, setBusquedaLocal] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const [modalOpen, setModalOpen] = useState(false)
  const [formNuevo, setFormNuevo] = useState(EMPTY_FORM)
  const [creando, setCreando] = useState(false)
  const [errorModal, setErrorModal] = useState('')
  const [restableciendo, setRestableciendo] = useState<string | null>(null)
  const [restablecido, setRestablecido] = useState<string | null>(null)
  const { sorted: usuariosOrdenados, sort, toggleSort } = useSortable(usuarios as unknown as Record<string, unknown>[])

  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    setBusquedaLocal(search)
  }, [search])

  function navegar(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (params.search) sp.set('search', params.search)
    if (params.rol) sp.set('rol', params.rol)
    if (params.page && params.page !== '1') sp.set('page', params.page)
    if (params.pageSize && params.pageSize !== '20') sp.set('pageSize', params.pageSize)
    startTransition(() => router.push(`/admin/usuarios?${sp.toString()}`))
  }

  function onBusquedaChange(val: string) {
    setBusquedaLocal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navegar({ search: val, rol: rolFiltro, page: '1' })
    }, 300)
  }

  async function cambiarRol(userId: string, rol: Rol) {
    setCambiando(userId)
    await fetch(`/api/admin/usuarios/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol }),
    })
    setCambiando(null)
    startTransition(() => router.refresh())
  }

  async function restablecerPassword(userId: string) {
    setRestableciendo(userId)
    const res = await fetch(`/api/admin/usuarios/${userId}/restablecer-password`, { method: 'POST' })
    setRestableciendo(null)
    if (res.ok) {
      setRestablecido(userId)
      setTimeout(() => setRestablecido(null), 3000)
    }
  }

  async function crearUsuario(e?: React.FormEvent) {
    e?.preventDefault()
    setCreando(true)
    setErrorModal('')
    const res = await fetch('/api/admin/usuarios/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formNuevo.email,
        nombre: formNuevo.nombre,
        apellido: formNuevo.apellido || null,
        apodo: formNuevo.apodo || null,
        rol: formNuevo.rol,
        empresa_id: formNuevo.empresa_id || null,
      }),
    })
    const data = await res.json()
    setCreando(false)
    if (!res.ok) { setErrorModal(data.error ?? 'Error al crear usuario'); return }
    setModalOpen(false)
    setFormNuevo(EMPTY_FORM)
    startTransition(() => router.refresh())
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function getNombreEmpresa(empresas: PerfilRow['empresas']): string {
    if (!empresas) return '-'
    if (Array.isArray(empresas)) return empresas[0]?.nombre ?? '-'
    return empresas.nombre ?? '-'
  }

  const queryParams = new URLSearchParams()
  if (search) queryParams.set('search', search)
  if (rolFiltro) queryParams.set('rol', rolFiltro)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Búsqueda */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
          <MagnifyingGlass size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-placeholder)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busquedaLocal}
            onChange={e => onBusquedaChange(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-input)',
              color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filtro rol */}
        <select
          value={rolFiltro}
          onChange={e => navegar({ search: busquedaLocal, rol: e.target.value, page: '1' })}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
        >
          <option value="">Todos los roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
        </select>

        {/* Registros por página */}
        <select
          value={pageSize}
          onChange={e => navegar({ search: busquedaLocal, rol: rolFiltro, page: '1', pageSize: e.target.value })}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          aria-label="Registros por página"
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} por página</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <BotonDescargar endpoint="/api/admin/usuarios/exportar" queryParams={queryParams.toString()} label="Exportar" />
          <Button
            onClick={() => { setModalOpen(true); setErrorModal('') }}
            icon={<PlusCircle size={15} />}
            size="md"
          >
            Nuevo usuario
          </Button>
        </div>
      </div>

      {/* Modal nuevo usuario */}
      <Modal
        abierto={modalOpen}
        onClose={() => setModalOpen(false)}
        titulo="Nuevo usuario"
        textoCancelar="Cancelar"
        textoConfirmar={creando ? 'Creando...' : 'Crear usuario'}
        onCancelar={() => setModalOpen(false)}
        onConfirmar={() => { if (!creando) crearUsuario() }}
      >
        <>
            {errorModal && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,94,75,0.08)', border: '1px solid var(--color-error)', color: 'var(--color-error-content)', fontSize: 13, marginBottom: 16 }}>
                {errorModal}
              </div>
            )}

            <form onSubmit={crearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                { label: 'Correo electrónico *', key: 'email', type: 'email', required: true, placeholder: 'usuario@ejemplo.com' },
                { label: 'Nombre *', key: 'nombre', type: 'text', required: true, placeholder: 'Nombre del usuario' },
                { label: 'Apellido', key: 'apellido', type: 'text', required: false, placeholder: 'Apellido (opcional)' },
                { label: '¿Cómo quieres que te llamemos?', key: 'apodo', type: 'text', required: false, placeholder: 'Apodo (opcional)' },
              ] as { label: string; key: keyof typeof formNuevo; type: string; required: boolean; placeholder?: string }[]).map(({ label, key, type, required, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
                  <input
                    type={type}
                    value={formNuevo[key] as string}
                    placeholder={placeholder}
                    onChange={e => {
                      let val = e.target.value
                      if (key === 'apodo') val = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ.]/g, '').slice(0, 15)
                      setFormNuevo(prev => ({ ...prev, [key]: val }))
                    }}
                    required={required}
                    maxLength={key === 'apodo' ? 15 : undefined}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Rol *</label>
                <select
                  value={formNuevo.rol}
                  onChange={e => setFormNuevo(prev => ({ ...prev, rol: e.target.value as Rol }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                >
                  {ROL_CREAR.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                </select>
              </div>

              {ROLES_CON_EMPRESA.includes(formNuevo.rol) && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Empresa *</label>
                  <select
                    value={formNuevo.empresa_id}
                    onChange={e => setFormNuevo(prev => ({ ...prev, empresa_id: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                  >
                    <option value="">Selecciona una empresa...</option>
                    {empresasDisponibles.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              )}

              <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
            </form>
        </>
      </Modal>

      {/* Tabla */}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border)' }}>
                <SortTh col="nombre" sort={sort} onToggle={toggleSort}>Nombre</SortTh>
                <SortTh col="email" sort={sort} onToggle={toggleSort}>Email</SortTh>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--color-brand)', fontSize: 11, whiteSpace: 'nowrap' }}>Empresa</th>
                <SortTh col="rol" sort={sort} onToggle={toggleSort}>Rol</SortTh>
                <SortTh col="created_at" sort={sort} onToggle={toggleSort}>Registro</SortTh>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--color-brand)', fontSize: 11, whiteSpace: 'nowrap' }}>Acceso</th>
              </tr>
            </thead>
            <tbody>
              {usuariosOrdenados.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {search ? 'Sin resultados para esa búsqueda.' : 'No hay usuarios registrados.'}
                </td></tr>
              )}
              {(usuariosOrdenados as unknown as PerfilRow[]).map((u, idx) => {
                return (
                  <tr
                    key={u.id}
                    className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--bg-table-hover)] ${
                      idx % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                    }`}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{u.nombre || '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>{u.email}</td>
                    <td style={{ padding: '10px 16px' }}>{getNombreEmpresa(u.empresas)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <select
                        value={u.rol}
                        disabled={cambiando === u.user_id || u.user_id === currentUserId}
                        onChange={e => cambiarRol(u.user_id, e.target.value as Rol)}
                        style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 12,
                          border: '1px solid var(--border)', background: 'var(--bg-input)',
                          color: 'var(--text-primary)', cursor: u.user_id === currentUserId ? 'not-allowed' : 'pointer',
                          opacity: cambiando === u.user_id ? 0.5 : 1,
                        }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{formatFecha(u.created_at)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); restablecerPassword(u.user_id) }}
                        disabled={restableciendo === u.user_id}
                        title="Enviar correo para restablecer contraseña"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6,
                          fontSize: 11, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-input)',
                          color: restablecido === u.user_id ? 'var(--color-brand)' : 'var(--text-secondary)',
                          cursor: restableciendo === u.user_id ? 'not-allowed' : 'pointer',
                          opacity: restableciendo === u.user_id ? 0.5 : 1,
                        }}
                      >
                        <KeyRound size={12} />
                        {restablecido === u.user_id ? 'Correo enviado' : 'Restablecer'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {total} usuarios · Página {page} de {Math.max(1, totalPages)}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={page <= 1}
                onClick={() => navegar({ search: busquedaLocal, rol: rolFiltro, page: String(page - 1) })}
                className="hover-pop hover-press"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: page <= 1 ? 'var(--text-placeholder)' : 'var(--text-primary)', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                <CaretLeft size={14} /> Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => navegar({ search: busquedaLocal, rol: rolFiltro, page: String(page + 1) })}
                className="hover-slide-r hover-press"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: page >= totalPages ? 'var(--text-placeholder)' : 'var(--text-primary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                Siguiente <CaretRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
