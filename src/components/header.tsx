// 🔒 ARCHIVO PROTEGIDO — NO MODIFICAR CSS/DISEÑO SIN CLAVE SECRETA DEL USUARIO
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  List, MagnifyingGlass, User, Buildings, Calculator, UserCheck, Gear, SignOut
} from '@phosphor-icons/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'
import { CampanaDropdown } from './alertas/campana-dropdown'
import { HeaderUserDropdown } from './header-user-dropdown'
import { HeaderAyudaModal } from './header-ayuda-modal'
import type { Rol } from '@/types'

interface SearchResultado {
  id: string
  nombre?: string
  email?: string
  plan?: string
  fecha?: string
  total_co2?: number
  detalle_json?: unknown
}

interface SearchResultados {
  usuarios: SearchResultado[]
  empresas: SearchResultado[]
  calculos: SearchResultado[]
}

interface HeaderProps {
  nombre: string
  rol: Rol
  nombreEmpresa?: string
  avatarColor?: string
  avatarText?: string
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

const ROL_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  empresa_admin: 'Administrador',
  empleado: 'Colaborador',
  usuario_libre: 'Usuario',
}

export function Header({ nombre, rol, nombreEmpresa, avatarColor, avatarText, isExpanded, setIsExpanded }: HeaderProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [isSearchMobileOpen, setIsSearchMobileOpen] = useState(false)
  const [resultados, setResultados] = useState<SearchResultados | null>(null)
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const mobileDropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const [isDark, setIsDark] = useState(false)
  const [modoEmpleado, setModoEmpleado] = useState(false)

  useEffect(() => {
    setModoEmpleado(document.cookie.includes('modo_empleado=1'))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function activarModoEmpleado() {
    document.cookie = 'modo_empleado=1; path=/; max-age=86400'
    setDropdownOpen(false)
    router.push('/dashboard')
    router.refresh()
  }

  function desactivarModoEmpleado() {
    document.cookie = 'modo_empleado=; path=/; max-age=0'
    setDropdownOpen(false)
    router.push('/empresa')
    router.refresh()
  }

  async function cerrarSesion() {
    setDropdownOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Detección de tema para background adaptativo V13.3
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()

    // Observar cambios en data-theme
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      window.removeEventListener('resize', checkMobile)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('header-search')?.focus()
      }
      if (e.key === 'Escape') {
        setDropdownVisible(false)
        setSearchValue('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownVisible(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Búsqueda con debounce 300ms
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (searchValue.trim().length < 2) {
      setResultados(null)
      setDropdownVisible(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchValue)}`)
        if (!res.ok) return
        const data: SearchResultados = await res.json()
        setResultados(data)
        setDropdownVisible(true)
      } catch {
        // silencioso
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchValue])

  function navegarA(path: string) {
    setDropdownVisible(false)
    setSearchValue('')
    router.push(path)
  }

  const tieneResultados = resultados &&
    (resultados.usuarios.length > 0 || resultados.empresas.length > 0 || resultados.calculos.length > 0)

  function getDescripcionCalculo(c: SearchResultado): string {
    const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-CO') : ''
    const co2 = c.total_co2 != null ? `${c.total_co2.toFixed(2)} kg CO₂` : ''
    return [fecha, co2].filter(Boolean).join(' · ')
  }

  // Color adaptativo para legibilidad total V13.18
  const primaryColor = isDark ? '#FFFFFF' : '#006B66' // Contraste dinámico

  const circleButtonStyle = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer'
  }

  // LIQUID GLASS V13.30 — Cabecera BLANCA en día
  const headerBg = isDark
    ? 'color-mix(in srgb, var(--bg-primary) 50%, transparent)'
    : 'rgba(255, 255, 255, 0.5)'

  return (
    <header
      className="main-header-glass"
      style={{
        height: 70,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 40px',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        background: headerBg,
        backdropFilter: 'blur(8px) saturate(180%)',
        WebkitBackdropFilter: 'blur(8px) saturate(180%)',
        borderBottom: isDark
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1.5px solid rgba(0, 130, 124, 0.1)',
        borderTop: isDark
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,130,124,0.15), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,130,124,0.15)'
          : '0 4px 24px rgba(0,130,124,0.08), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,130,124,0.04)',
        userSelect: 'none'
      }}
    >
      {/* IZQUIERDA: Botón Menú + Logo y Rol */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 64 }}>
        {/* Disparador de Menú - Sostenible Core V11.2 */}
        {!isMobile && (
          <button
            id="main-menu-trigger"
            onMouseEnter={() => setIsExpanded(true)}
            onClick={() => setIsExpanded(!isExpanded)}
            className="group flex flex-col items-center justify-center gap-1 transition-all duration-300"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transform: isExpanded ? 'scale(0.94)' : 'scale(1)',
              color: primaryColor // Dinámico V13.6
            }}
          >
            <div className="transition-transform duration-300 group-hover:scale-110">
              <List size={22} weight="bold" color={primaryColor} />
            </div>
            <span className="menu-label-tech" style={{
              fontSize: '9px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              opacity: 0.9,
              color: primaryColor // Dinámico V13.6
            }}>
              Menú
            </span>
          </button>
        )}

        {/* Logo (simplificado en móvil V8.0) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 20 }}>
          <Image
            src="/logo-completo.svg"
            alt="Calculadora de Reúso"
            width={isMobile ? 100 : 120}
            height={28}
            className="logo-dark-invert"
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* CENTRO: Despejado */}
      <div style={{ flex: 1 }} />

      {/* DERECHA: Buscador, Utilidades y Perfil (Reordenado V9.0) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20 }}>

        {isMobile ? (
          /* DISEÑO MÓVIL V9.1: BÚSQUEDA, AYUDA, NOTIFICACIONES, USUARIO (Orden de derecha a izquierda) */
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 4. Búsqueda (Izquierda del grupo móvil) */}
            <button
              onClick={() => setIsSearchMobileOpen(!isSearchMobileOpen)}
              style={circleButtonStyle}
              aria-label="Buscar"
              className="icon-circle"
            >
              <MagnifyingGlass size={20} />
            </button>

            {/* 3. Ayuda */}
            <HeaderAyudaModal />

            {/* 2. Notificaciones */}
            <CampanaDropdown />

            {/* 1. Usuario (Derecha del grupo móvil) */}
            <div ref={mobileDropdownRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: avatarColor || '#D6F391',
                  color: '#1A3A38',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  boxShadow: `0 4px 10px ${(avatarColor || '#D6F391').slice(0, 7)}40`,
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
              >
                {avatarText || nombre.charAt(0).toUpperCase()}
              </div>

              {dropdownOpen && (
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
                      className="dropdown-item"
                    >
                      <UserCheck size={15} /> Ver como colaborador
                    </button>
                  )}
                  {modoEmpleado && (
                    <button
                      onClick={desactivarModoEmpleado}
                      style={{ ...itemStyle, color: 'var(--color-brand)' }}
                      className="dropdown-item"
                    >
                      <Buildings size={15} /> Volver a mi empresa
                    </button>
                  )}
                  {(rol === 'empresa_admin' || modoEmpleado) && (
                    <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                  )}
                  <button
                    onClick={() => { setDropdownOpen(false); router.push('/settings#datos') }}
                    style={itemStyle}
                    className="dropdown-item"
                  >
                    <User size={15} /> Mis datos
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); router.push('/settings#preferencias') }}
                    style={itemStyle}
                    className="dropdown-item"
                  >
                    <Gear size={15} /> Preferencias
                  </button>
                  <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                  <button
                    onClick={cerrarSesion}
                    style={{ ...itemStyle, color: 'var(--color-error)' }}
                    className="dropdown-item"
                  >
                    <SignOut size={15} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DISEÑO DESKTOP ORIGINAL */
          <>
            <div ref={searchContainerRef} style={{ position: 'relative', width: 240 }}>
              <MagnifyingGlass size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-placeholder)', zIndex: 1 }} />
              <input
                id="header-search"
                type="text"
                placeholder="Buscar..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                autoComplete="off"
                style={{ width: '100%', height: 40, padding: '0 44px 0 40px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-input)', fontSize: 14, color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,130,124,0.06)' }}
                className="search-input-pill"
              />
              <div style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--text-on-brand)',
                background: 'var(--color-brand)',
                padding: '1px 5px',
                borderRadius: 4,
                pointerEvents: 'none'
              }}>
                ⌘K
              </div>

              {/* Dropdown de resultados */}
              {dropdownVisible && resultados && (
                <div style={{ position: 'absolute', top: 46, left: 0, width: 320, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', zIndex: 200, maxHeight: 380, overflowY: 'auto' }}>
                  {!tieneResultados ? (
                    <p style={{ padding: '14px 16px', fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Sin resultados para &quot;{searchValue}&quot;</p>
                  ) : (
                    <>
                      {resultados.usuarios.length > 0 && (
                        <div>
                          <p style={{ padding: '12px 16px 4px', fontSize: 14, fontWeight: 800, color: '#00827C', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Usuarios</p>
                          {resultados.usuarios.map((u) => (
                            <button key={u.id} onClick={() => navegarA(`/admin/usuarios?search=${encodeURIComponent(u.nombre ?? '')}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <User size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{u.nombre}</span>
                              <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{u.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {resultados.empresas.length > 0 && (
                        <div>
                          <p style={{ padding: '12px 16px 4px', fontSize: 14, fontWeight: 800, color: '#00827C', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Empresas</p>
                          {resultados.empresas.map((e) => (
                            <button key={e.id} onClick={() => navegarA(`/admin/empresas/${e.id}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <Buildings size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{e.nombre}</span>
                              <span style={{ fontSize: 14, color: '#D6F391', background: 'rgba(0,130,124,0.1)', padding: '2px 8px', borderRadius: 6, marginLeft: 'auto', textTransform: 'capitalize' }}>{e.plan}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {resultados.calculos.length > 0 && (
                        <div>
                          <p style={{ padding: '12px 16px 4px', fontSize: 14, fontWeight: 800, color: '#00827C', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Cálculos</p>
                          {resultados.calculos.map((c) => (
                            <button key={c.id} onClick={() => navegarA(rol === 'super_admin' || rol === 'empresa_admin' ? `/empresa/objetos?search=${encodeURIComponent(searchValue)}` : `/dashboard?search=${encodeURIComponent(searchValue)}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <Calculator size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{getDescripcionCalculo(c)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ThemeToggle />
              <HeaderAyudaModal />
              <CampanaDropdown />
            </div>

            <div style={{ width: 1, height: 32, background: 'var(--divider)', margin: '0 4px' }} />

            <HeaderUserDropdown nombre={nombre} rol={rol} avatarColor={avatarColor} avatarText={avatarText} />
          </>
        )}
      </div>

      {/* OVERLAY DE BÚSQUEDA MÓVIL V9.1 (Despliegue debajo del Header) */}
      {isMobile && isSearchMobileOpen && (
        <div style={{
          position: 'absolute',
          top: 70, // Se despliega justo debajo del cabecero
          left: 0,
          right: 0,
          height: 64,
          background: 'var(--bg-primary)',
          zIndex: 45, // Por debajo del header pero sobre el contenido
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 8px 20px rgba(0,130,124,0.08)',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <MagnifyingGlass
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-placeholder)',
                zIndex: 1,
              }}
            />
            <input
              autoFocus
              type="text"
              placeholder="Buscar..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                padding: '0 44px 0 40px',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                fontSize: 14,
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 1px 4px rgba(0,130,124,0.06)',
              }}
              className="search-input-pill"
            />
          </div>
          <button
            onClick={() => setIsSearchMobileOpen(false)}
            style={{
              padding: '0 8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-brand)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .search-input-pill:focus {
          border-color: var(--color-brand);
          box-shadow: 0 4px 12px rgba(0, 130, 124, 0.1);
        }
        .icon-circle:hover, .profile-hover:hover {
          background: var(--bg-hover);
        }
        .icon-circle:active {
          transform: scale(0.95);
        }
        .menu-trigger-minimalist {
          outline: none !important;
          box-shadow: none !important;
          user-select: none;
          background: transparent !important;
        }
        .menu-trigger-minimalist:hover,
        .menu-trigger-minimalist:active {
          transform: scale(0.94);
          background: transparent !important;
        }
        .menu-trigger-minimalist:hover span,
        .menu-trigger-minimalist:hover svg {
          color: #00827C !important;
        }
      `}} />
    </header>
  )
}

