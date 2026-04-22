'use client'

import { useState, useEffect, useRef } from 'react'
import {
  List, MagnifyingGlass, User, Buildings, Calculator } from '@phosphor-icons/react'
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
  super_admin: 'Administrador',
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
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
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

  return (
    <header
      style={{
        height: 70, 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 24px', // Optimización móvil V8.0
        background: 'var(--bg-integrated)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', 
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* IZQUIERDA: Botón Menú + Logo y Rol */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Disparador de Menú (Movido desde Sidebar) */}
        <div 
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2, 
            cursor: 'pointer',
            color: 'var(--color-brand)',
            padding: '4px 8px',
            borderRadius: 8,
            transition: 'background 0.2s',
            pointerEvents: 'auto', // Asegura interactividad total
          }}
          className="menu-trigger-clean"
        >
          <List size={22} strokeWidth={2.5} />
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menú</span>
        </div>

        {/* Logo y Rol (simplificado en móvil V8.0) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 20 }}>
          <Image
            src="/logo-completo.svg"
            alt="Calculadora de Reúso"
            width={isMobile ? 100 : 120}
            height={28}
            className="logo-dark-invert"
            style={{ objectFit: 'contain' }}
          />

          {!isMobile && (
            <>
              {/* Divisora vertical V6.2 */}
              <div style={{ width: 1, height: 32, background: 'var(--divider)', margin: '0 4px' }} />

              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '-0.02em'
              }}>
                {rol === 'super_admin'
                ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 100,
                    background: 'rgba(0,130,124,0.12)',
                    color: 'var(--color-brand)',
                    fontSize: 12, fontWeight: 800, letterSpacing: '0.03em',
                  }}>
                    Panel de Control
                  </span>
                )
                : (nombreEmpresa || ROL_LABELS[rol] || rol)
              }
              </span>
            </>
          )}
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
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--color-brand)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 800,
                boxShadow: '0 4px 10px rgba(0, 130, 124, 0.2)',
                cursor: 'pointer'
              }}
            >
              {nombre.charAt(0).toUpperCase()}
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
                style={{ width: '100%', height: 40, padding: '0 44px 0 40px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-input)', fontSize: 14, color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}
                className="search-input-pill"
              />
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: '#FFFFFF', background: 'var(--color-brand)', padding: '2px 5px', borderRadius: 4, pointerEvents: 'none' }}>
                ⌘K
              </div>

              {/* Dropdown de resultados */}
              {dropdownVisible && resultados && (
                <div style={{ position: 'absolute', top: 46, left: 0, width: 320, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', zIndex: 200, maxHeight: 380, overflowY: 'auto' }}>
                  {!tieneResultados ? (
                    <p style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Sin resultados para &quot;{searchValue}&quot;</p>
                  ) : (
                    <>
                      {resultados.usuarios.length > 0 && (
                        <div>
                          <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Usuarios</p>
                          {resultados.usuarios.map((u) => (
                            <button key={u.id} onClick={() => navegarA(`/admin/usuarios?search=${encodeURIComponent(u.nombre ?? '')}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <User size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{u.nombre}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>{u.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {resultados.empresas.length > 0 && (
                        <div>
                          <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Empresas</p>
                          {resultados.empresas.map((e) => (
                            <button key={e.id} onClick={() => navegarA(`/admin/empresas/${e.id}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <Buildings size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{e.nombre}</span>
                              <span style={{ fontSize: 11, color: 'var(--color-brand)', marginLeft: 'auto', textTransform: 'capitalize' }}>{e.plan}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {resultados.calculos.length > 0 && (
                        <div>
                          <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Cálculos</p>
                          {resultados.calculos.map((c) => (
                            <button key={c.id} onClick={() => navegarA(rol === 'super_admin' || rol === 'empresa_admin' ? `/empresa/objetos?search=${encodeURIComponent(searchValue)}` : `/dashboard?search=${encodeURIComponent(searchValue)}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <Calculator size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{getDescripcionCalculo(c)}</span>
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
          boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
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
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
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

      <style dangerouslySetInnerHTML={{ __html: `
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
        .menu-trigger-clean {
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          border: none !important;
          user-select: none;
        }
        .menu-trigger-clean:hover,
        .menu-trigger-clean:active,
        .menu-trigger-clean:focus {
          background: transparent !important;
          box-shadow: none !important;
          outline: none !important;
        }
      `}} />
    </header>
  )
}

const circleButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: 'none',
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
  transition: 'all 0.2s'
}
