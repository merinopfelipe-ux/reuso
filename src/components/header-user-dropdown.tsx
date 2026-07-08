'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Settings as Gear,
  LogOut as SignOut,
  UserCheck,
  Building2 as Buildings,
} from 'lucide-react'
import type { Rol } from '@/types'

const ROL_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  empresa_admin: 'Administrador',
  empleado: 'Colaborador',
  usuario_libre: 'Usuario',
}

interface HeaderUserDropdownProps {
  nombre: string
  rol?: Rol
  avatarColor?: string
  avatarText?: string
}

export function HeaderUserDropdown({ nombre, rol, avatarColor = '#D6F391', avatarText }: HeaderUserDropdownProps) {
  const [open, setOpen] = useState(false)
  const [modoEmpleado, setModoEmpleado] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setModoEmpleado(document.cookie.includes('modo_empleado=1'))
  }, [])

  function activarModoEmpleado() {
    document.cookie = 'modo_empleado=1; path=/; max-age=86400'
    setOpen(false)
    router.push('/dashboard')
    router.refresh()
  }

  function desactivarModoEmpleado() {
    document.cookie = 'modo_empleado=; path=/; max-age=0'
    setOpen(false)
    router.push('/empresa')
    router.refresh()
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  async function cerrarSesion() {
    setOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menú de usuario"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 24,
          background: 'transparent',
          border: 'none',
          transition: 'background 0.2s',
        }}
        className="profile-hover"
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {nombre}
          </p>
          {rol && (
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ROL_LABELS[rol] || rol}
            </p>
          )}
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: avatarColor, color: '#1A3A38',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800,
          boxShadow: `0 4px 10px ${avatarColor}40`,
          overflow: 'hidden',
        }}>
          {avatarText || nombre.charAt(0).toUpperCase()}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 48, right: 0, width: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow)', zIndex: 300,
          overflow: 'hidden',
          animation: 'slideDown 0.15s ease-out',
        }}>
          {rol === 'empresa_admin' && !modoEmpleado && (
            <button
              onClick={activarModoEmpleado}
              style={{ ...itemStyle, color: 'var(--color-brand)' }}
              className="dropdown-item hover-pop"
            >
              <UserCheck size={15} /> Ver como colaborador
            </button>
          )}
          {modoEmpleado && (
            <button
              onClick={desactivarModoEmpleado}
              style={{ ...itemStyle, color: 'var(--color-brand)' }}
              className="dropdown-item hover-pop"
            >
              <Buildings size={15} /> Volver a mi empresa
            </button>
          )}
          {(rol === 'empresa_admin' || modoEmpleado) && (
            <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
          )}
          <button
            onClick={() => { setOpen(false); router.push('/settings#datos') }}
            style={itemStyle}
            className="dropdown-item hover-pop"
          >
            <User size={15} /> Mis datos
          </button>
          <button
            onClick={() => { setOpen(false); router.push('/settings#preferencias') }}
            style={itemStyle}
            className="dropdown-item hover-gear"
          >
            <Gear size={15} /> Preferencias
          </button>
          <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
          <button
            onClick={cerrarSesion}
            style={{ ...itemStyle, color: 'var(--color-error)' }}
            className="dropdown-item hover-slide-r"
          >
            <SignOut size={15} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

const itemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '10px 14px',
  background: 'transparent', border: 'none',
  cursor: 'pointer', textAlign: 'left',
  fontSize: 14, color: 'var(--text-primary)',
  fontFamily: "'Open Sans', sans-serif",
  transition: 'background 0.15s',
}
