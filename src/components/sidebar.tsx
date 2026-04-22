'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  SquaresFour, Buildings, Tag, Stack, Users, Bell, Scroll, Package, Gear, House, Medal, SignOut, Question, Tray, ClockCounterClockwise, Lifebuoy, TrendUp, Target, Calculator, Scales } from '@phosphor-icons/react'
import type { Rol } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: Record<Rol, NavItem[]> = {
  super_admin: [
    { href: '/admin', label: 'Resumen', icon: SquaresFour },
    { href: '/admin/empresas', label: 'Gestión de Empresas', icon: Buildings },
    { href: '/admin/categorias', label: 'Categorías de Impacto', icon: Tag },
    { href: '/admin/modulos', label: 'Módulos', icon: Stack },
    { href: '/admin/usuarios', label: 'Usuarios y Perfiles', icon: Users },
    { href: '/admin/alertas', label: 'Centro de Alertas', icon: Bell },
    { href: '/admin/logs', label: 'Logs de Auditoría', icon: Scroll },
    { href: '/admin/configuracion', label: 'Config. sistema', icon: Gear },
    { href: '/admin/leads', label: 'Gestión de Leads', icon: Tray },
    { href: '/admin/calculos', label: 'Cálculos Globales', icon: Calculator },
    { href: '/admin/reportes', label: 'Reportes', icon: TrendUp },
    { href: '/admin/certificados', label: 'Certificados', icon: Medal },
    { href: '/admin/contenido', label: 'Contenido', icon: Scroll },
    { href: '/admin/plantillas', label: 'Plantillas', icon: Target },
    { href: '/admin/legal', label: 'Legales', icon: Scales },
    { href: '/admin/tickets', label: 'Soporte', icon: Lifebuoy },
    { href: '/ayuda', label: 'Ayuda', icon: Question },
    { href: '/settings', label: 'Configuración', icon: Gear },
  ],
  empresa_admin: [
    { href: '/empresa', label: 'Mi empresa', icon: Buildings },
    { href: '/empresa/equipo', label: 'Equipo', icon: Users },
    { href: '/empresa/calculos', label: 'Cálculos', icon: Calculator },
    { href: '/empresa/metas', label: 'Metas', icon: Target },
    { href: '/empresa/certificados', label: 'Certificados', icon: Medal },
    { href: '/empresa/soporte', label: 'Soporte', icon: Lifebuoy },
    { href: '/settings', label: 'Configuración', icon: Gear },
  ],
  empleado: [
    { href: '/dashboard', label: 'Inicio', icon: House },
    { href: '/dashboard/objetos', label: 'Calcular', icon: Package },
    { href: '/dashboard/historial', label: 'Mi historial', icon: ClockCounterClockwise },
    { href: '/dashboard/soporte', label: 'Soporte', icon: Lifebuoy },
    { href: '/settings', label: 'Mi perfil', icon: Gear },
  ],
  usuario_libre: [
    { href: '/dashboard', label: 'Inicio', icon: House },
    { href: '/dashboard/objetos', label: 'Calcular', icon: Package },
    { href: '/dashboard/historial', label: 'Mi historial', icon: ClockCounterClockwise },
    { href: '/empresa/nueva', label: 'Subir de plan', icon: TrendUp },
    { href: '/dashboard/soporte', label: 'Soporte', icon: Lifebuoy },
    { href: '/settings', label: 'Mi perfil', icon: Gear },
  ],
}

interface SidebarProps {
  rol: Rol
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  isMobile: boolean
  empresaId?: string | null
}

export function Sidebar({ rol, isExpanded, setIsExpanded, isMobile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems: NavItem[] = NAV_ITEMS[rol]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const sidebarWidth = isExpanded ? 280 : 80 // Ampliado V4.4

  return (
    <div
      onMouseEnter={() => { if (isMobile) return; setIsExpanded(true) }}
      onMouseLeave={() => { if (isMobile) return; setIsExpanded(false) }}
      style={{
        width: isMobile ? 280 : sidebarWidth,
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (isExpanded ? 0 : -280) : 0,
        background: 'var(--bg-sidebar)', // Sincronizado V6.0
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: isMobile ? 100 : 40, // Alta prioridad en móvil V8.0
        boxShadow: (isMobile && isExpanded) ? '0 0 40px rgba(0,0,0,0.2)' : 'none',
      }}
      className="sidebar-rail"
    >
      {/* 1. Espacio superior para alinear con Header */}
      <div style={{ height: 0 }} />

      {/* 2. Navegación en Cápsulas (Pestañas Asimétricas V4.7) */}
      <nav style={{ 
        flex: 1, 
        padding: '24px 0', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12 
      }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isRoot = href === '/admin' || href === '/empresa' || href === '/dashboard'
          const active = isRoot ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
          
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsExpanded(false)} // Cierre por navegación V5.0
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '8px 16px', // Constante para fluidez V4.9
                borderRadius: active ? '12px 0 0 12px' : 0,
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Sincronizado V4.9
                background: active ? 'var(--bg-primary)' : 'transparent',
                justifyContent: 'flex-start', // Siempre flex-start para estabilidad V4.9
                alignSelf: 'flex-end',
                marginLeft: 12,
                width: 'calc(100% - 12px)', 
                boxShadow: (active && isExpanded) 
                  ? '0 4px 12px rgba(0, 0, 0, 0.05)' 
                  : (active && !isExpanded) ? '0 0 8px rgba(0, 0, 0, 0.05)' : 'none',
                overflow: 'hidden'
              }}
              className={`sidebar-item ${active ? 'active' : ''}`}
            >
              <div style={{ 
                width: 44, 
                height: 44, 
                flexShrink: 0,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRadius: 12,
                color: active ? 'var(--color-brand)' : 'inherit'
              }}>
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              </div>

              {/* Contenedor de Texto Animado V4.10 (Ancho fijo para evitar saltos/wrapping) */}
              <div style={{ 
                width: isExpanded ? '200px' : '0px',
                opacity: isExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ 
                  display: 'block', // Integridad de bloque V4.10
                  whiteSpace: 'nowrap'
                }}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* 3. Logout (Anclado al fondo mediante margin-top: auto) */}
      <div style={{ padding: '24px 0', marginTop: 'auto' }}>
        <button
          onClick={() => {
            setIsExpanded(false) // Cerrar antes de logout V5.0
            handleLogout()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            width: isExpanded ? 'calc(100% - 24px)' : 'calc(100% - 12px)',
            height: 44,
            padding: '0 16px',
            background: 'transparent',
            border: isExpanded ? '1px solid var(--color-brand)' : 'none', // Botón con reborde V5.3
            borderRadius: isExpanded ? 12 : 0,
            color: 'var(--color-brand)',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            justifyContent: 'flex-start',
            alignSelf: 'flex-end',
            marginLeft: 12,
            marginRight: isExpanded ? 12 : 0,
            overflow: 'hidden'
          }}
          className="logout-button"
        >
          <div style={{ 
            width: 44, 
            height: 44, 
            flexShrink: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--color-brand)'
          }}>
            <SignOut size={24} strokeWidth={2.5} />
          </div>
          <div style={{ 
            width: isExpanded ? '200px' : '0px', // Ancho fijo para Logout V4.10
            opacity: isExpanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>Cerrar sesión</span>
          </div>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-item:hover:not(.active) {
          background: var(--bg-hover);
        }
        .logout-button:hover {
          background: var(--bg-hover);
        }
      `}} />
    </div>
  )
}
