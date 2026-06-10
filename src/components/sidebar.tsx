// 🔒 ARCHIVO PROTEGIDO — NO MODIFICAR CSS/DISEÑO SIN CLAVE SECRETA DEL USUARIO
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  SquaresFour, Buildings, Stack, Package, Gear, House, Medal, SignOut, ClockCounterClockwise, Lifebuoy, TrendUp, Target, Calculator, Scales, CaretRight, IdentificationCard
} from '@phosphor-icons/react'
import type { Rol } from '@/types'

interface SubItem {
  href: string
  label: string
}

interface NavItem {
  href?: string
  label: string
  icon: React.ElementType
  subItems?: SubItem[]
}

const NAV_ITEMS: Record<Rol, NavItem[]> = {
  super_admin: [
    { href: '/admin', label: 'Resumen', icon: SquaresFour },
    { 
      label: 'Gestión', 
      icon: Buildings,
      subItems: [
        { href: '/admin/empresas', label: 'Empresas' },
        { href: '/admin/leads', label: 'Leads' },
        { href: '/admin/categorias', label: 'Categorías' },
        { href: '/admin/modulos', label: 'Módulos' },
      ]
    },
    { 
      label: 'Impacto', 
      icon: TrendUp,
      subItems: [
        { href: '/admin/calculos', label: 'Cálculos' },
        { href: '/admin/reportes', label: 'Reportes' },
        { href: '/admin/certificados', label: 'Certificados' },
      ]
    },
    { 
      label: 'Sistema', 
      icon: Gear,
      subItems: [
        { href: '/admin/usuarios', label: 'Usuarios' },
        { href: '/admin/logs', label: 'Auditoría' },
        { href: '/admin/alertas', label: 'Alertas' },
        { href: '/admin/configuracion', label: 'Configuración' },
      ]
    },
    { 
      label: 'Recursos', 
      icon: Stack,
      subItems: [
        { href: '/admin/contenido', label: 'Contenido' },
        { href: '/admin/plantillas', label: 'Plantillas' },
        { href: '/admin/tickets', label: 'Soporte' },
        { href: '/ayuda', label: 'Ayuda' },
      ]
    },
    { href: '/admin/legal', label: 'Legales', icon: Scales },
    { href: '#', label: 'Cotizador', icon: Calculator },
  ],
  empresa_admin: [
    { 
      label: 'Empresa', 
      icon: Buildings,
      subItems: [
        { href: '/empresa', label: 'Perfil' },
        { href: '/empresa/equipo', label: 'Equipo' },
      ]
    },
    { 
      label: 'Operaciones', 
      icon: Target,
      subItems: [
        { href: '/empresa/calculos', label: 'Cálculos' },
        { href: '/empresa/metas', label: 'Metas' },
      ]
    },
    { href: '/empresa/certificados', label: 'Certificados', icon: Medal },
    { href: '/empresa/dpp', label: 'Pasaportes DPP', icon: IdentificationCard },
    { href: '/empresa/cotizador', label: 'Cotizador', icon: Calculator },
    { href: '/empresa/soporte', label: 'Soporte', icon: Lifebuoy },
    { href: '/settings', label: 'Ajustes', icon: Gear },
  ],
  empleado: [
    { href: '/dashboard', label: 'Inicio', icon: House },
    { href: '/dashboard/objetos', label: 'Calcular', icon: Package },
    { href: '/dashboard/historial', label: 'Historial', icon: ClockCounterClockwise },
    { href: '/empresa/cotizador', label: 'Cotizador', icon: Calculator },
    { href: '/dashboard/soporte', label: 'Soporte', icon: Lifebuoy },
    { href: '/settings', label: 'Ajustes', icon: Gear },
  ],
  usuario_libre: [
    { href: '/dashboard', label: 'Inicio', icon: House },
    { href: '/dashboard/objetos', label: 'Calcular', icon: Package },
    { href: '/dashboard/historial', label: 'Historial', icon: ClockCounterClockwise },
    { href: '/empresa/nueva', label: 'Planes', icon: TrendUp },
    { href: '#', label: 'Cotizador', icon: Calculator },
    { href: '/dashboard/soporte', label: 'Soporte', icon: Lifebuoy },
    { href: '/settings', label: 'Ajustes', icon: Gear },
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
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const navItems: NavItem[] = NAV_ITEMS[rol] || []

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const sidebarWidth = isExpanded ? 220 : 70

  const handleMouseEnterRail = () => {
    if (isMobile) return
    if (leaveTimeout) {
      clearTimeout(leaveTimeout)
      setLeaveTimeout(null)
    }
    setIsExpanded(true)
  }

  const handleMouseLeaveRail = () => {
    if (isMobile) return
    // Si hay submenú abierto, NO cerrar el sidebar V13.33
    if (activeSubmenu) return
    const timeout = setTimeout(() => {
      setIsExpanded(false)
    }, 400)
    setLeaveTimeout(timeout)
  }

  const handleMouseEnterFlyout = () => {
    if (isMobile) return
    if (leaveTimeout) {
      clearTimeout(leaveTimeout)
      setLeaveTimeout(null)
    }
    setIsExpanded(true)
  }

  // Cierra todo al salir del flyout V13.33
  const handleMouseLeaveFlyout = () => {
    if (isMobile) return
    const timeout = setTimeout(() => {
      setActiveSubmenu(null)
      setIsExpanded(false)
    }, 400)
    setLeaveTimeout(timeout)
  }

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setActiveSubmenu(null)
    
    // Detección de tema para background dinámico V13.9
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    
    return () => observer.disconnect()
  }, [pathname])

  return (
    <>
    <aside 
      onClick={() => {
        if (isMobile && !isExpanded) {
          setIsExpanded(true)
        }
      }}
      onMouseEnter={handleMouseEnterRail}
      onMouseLeave={handleMouseLeaveRail}
      className={`hidden md:flex fixed left-0 top-0 h-screen flex-col ${isExpanded ? 'w-[220px]' : (sidebarWidth + 'px')}`}
      style={{
        zIndex: 1000, // Z-index intermedio para mobile/desktop
        backgroundColor: 'transparent',
        transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'width',
        overflow: 'visible'
      }}
    >
      {/* 🌿 CAPA BASE SOSTENIBLE V12.6 */}
      <div 
        className="liquid-base-context"
        style={{
          position: 'absolute', inset: 0, zIndex: -1,
          backdropFilter: 'blur(100px) saturate(200%)',
          WebkitBackdropFilter: 'blur(100px) saturate(200%)',
          background: '#006B66', // Default Day (CSS Overrides this for Night)
          boxShadow: '0 0 10px rgba(0,0,0,0.01)',
          transition: 'background 0.6s cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 0.6s ease',
          borderRadius: '0',
        }} 
      />

      <nav style={{ flex: 1, padding: '100px 0 24px 0', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', overflowX: 'visible', position: 'relative' }} className="no-scrollbar">
        {navItems.map((item, idx) => {
          const isRootPath = item.href === '/admin' || item.href === '/empresa' || item.href === '/dashboard' || item.href === '/'
          const isDirectActive = item.href && item.href !== '#' && (
            isRootPath ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + '/'))
          )
          const hasActiveSub = item.subItems?.some(s => pathname === s.href || pathname.startsWith(s.href + '/'))
          const isInteracting = activeSubmenu === item.label
          // Blanco Inmaculado V12.5
          const fixedColor = '#FFFFFF' 

          return (
            <div key={idx} style={{ position: 'relative', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
              <div 
                onClick={(e) => {
                  if (isMobile && !isExpanded) {
                    e.stopPropagation()
                    setIsExpanded(true)
                    return
                  }
                  if (item.subItems) {
                    setActiveSubmenu(isInteracting ? null : item.label)
                  } else if (item.href && item.href !== '#') {
                    router.push(item.href)
                    if (isMobile) {
                      setIsExpanded(false)
                    }
                  }
                }}
                className={`clean-item-nav ${(isDirectActive || hasActiveSub) ? 'reuso-nav-active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  width: 'calc(100% - 12px)', height: 50, padding: '0 18px', cursor: 'pointer',
                  position: 'relative', transition: 'background 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, color 0.25s ease',
                  alignSelf: 'flex-end', marginLeft: 12, borderLeft: 'none',
                  borderRadius: '16px 0 0 16px', 
                  background: (isDirectActive || hasActiveSub) ? 'var(--color-active-nav)' : 'transparent',
                  boxShadow: (isDirectActive || hasActiveSub) ? '0 4px 20px rgba(0, 0, 0, 0.12)' : 'none',
                  color: (isDirectActive || hasActiveSub) ? 'var(--color-text-nav-active)' : fixedColor,
                }}
              >
                  {/* Pill SOLO en activo, NO al abrir submenú V13.31 */}
                  {(isDirectActive || hasActiveSub) && (
                    <div className="active-indicator-pill" style={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: '25%', 
                      bottom: '25%', 
                      width: 4, 
                      background: isDark ? '#D6F391' : '#006B66',
                      borderRadius: '0 4px 4px 0',
                      transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
                    }} />
                  )}
                
                <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Ícono delgado por defecto, grueso solo en activo V13.31 */}
                  <item.icon size={20} color="currentColor" weight={(isDirectActive || hasActiveSub) ? 'bold' : 'regular'} />
                </div>
                
                {isExpanded && (
                  <span style={{ fontSize: '14px', fontWeight: (isDirectActive || hasActiveSub) ? 800 : 400, color: 'currentColor', opacity: 1, whiteSpace: 'nowrap', transition: 'opacity 0.3s ease, font-weight 0.3s ease' }}>
                    {item.label}
                  </span>
                )}

                {item.subItems && isExpanded && (
                  <CaretRight size={16} weight="regular" color="currentColor" style={{ marginLeft: 'auto', opacity: isInteracting ? 1 : 0.6, transform: isInteracting ? 'rotate(90deg)' : 'none', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease' }} />
                )}
              </div>
            </div>
          )
        })}
      </nav>



      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --color-active-nav: #FFFFFF;
          --color-text-nav-active: #00827C;
        }

        .liquid-base-context {
          background: var(--bg-primary) !important;
        }

        @keyframes slideIn { 
          from { opacity: 0; transform: translateX(-8px) scale(0.98); }
          to { opacity: 1; transform: translateX(0) scale(1); } 
        }

        @keyframes flyoutItemIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .master-flyout-ref {
          transition: left 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease !important;
          will-change: left, opacity;
        }

        .flyout-item-sustainable {
          animation: flyoutItemIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .flyout-item-sustainable:nth-child(1) { animation-delay: 0.03s; }
        .flyout-item-sustainable:nth-child(2) { animation-delay: 0.06s; }
        .flyout-item-sustainable:nth-child(3) { animation-delay: 0.09s; }
        .flyout-item-sustainable:nth-child(4) { animation-delay: 0.12s; }
        .flyout-item-sustainable:nth-child(5) { animation-delay: 0.15s; }
        .flyout-item-sustainable:nth-child(6) { animation-delay: 0.18s; }

        .clean-item-nav:hover, .flyout-item-sustainable:hover {
          background: rgba(214, 243, 145, 0.2) !important; /* Pistacho muy traslúcido Día V13.7 */
        }

        [data-theme="dark"] .clean-item-nav:hover, [data-theme="dark"] .flyout-item-sustainable:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }

        /* Visibilidad Dinámica V13.6 */
        .clean-item-nav span, .clean-item-nav svg,
        .menu-header-tech span, .menu-header-tech svg,
        .flyout-item-sustainable span, .flyout-item-sustainable div {
          color: #006B66 !important; /* Verde Sostenible en Día para contraste */
        }

        [data-theme="dark"] .clean-item-nav span, [data-theme="dark"] .clean-item-nav svg,
        [data-theme="dark"] .menu-header-tech span, [data-theme="dark"] .menu-header-tech svg,
        [data-theme="dark"] .flyout-item-sustainable span, [data-theme="dark"] .flyout-item-sustainable div {
          color: #FFFFFF !important; /* Blanco Inmaculado en Noche */
        }

        [data-theme="dark"] .reuso-nav-active {
          background: var(--bg-primary) !important;
          color: var(--text-primary) !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(255,255,255,0.1);
          border-right: none !important; /* Unión con contenido V13.4 */
        }

        [data-theme="dark"] .reuso-nav-active .active-indicator-pill {
          background: #D6F391 !important; /* Pistacho en Noche V13.9 */
          box-shadow: 0 0 10px rgba(214, 243, 145, 0.4);
        }

        .master-flyout-ref {
          transition: left 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
        }
      `}} />

      {/* 📤 BOTÓN CIERRE DE SESIÓN V13.14 */}
      <div style={{ 
        padding: isExpanded ? '20px 16px' : '20px 0', 
        marginTop: 'auto', 
        display: 'flex', 
        justifyContent: 'center',
        transition: 'padding 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
      }}>
        <button
          onClick={() => {
            if (confirm('¿Cerrar sesión?')) {
              handleLogout()
            }
          }}
          style={{
            width: isExpanded ? '100%' : 44,
            height: 48,
            borderRadius: isExpanded ? 14 : 22,
            background: 'transparent',
            border: isExpanded ? `1.5px solid ${isDark ? '#D6F391' : '#006B66'}` : '1.5px solid transparent', // Estilo Outline V13.14
            color: isDark ? '#D6F391' : '#006B66',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: isExpanded ? '0 12px' : 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s ease, padding 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'width, border-radius',
          }}
        >
          <SignOut size={22} weight="bold" color="currentColor" style={{ flexShrink: 0 }} />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: 900, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            opacity: isExpanded ? 1 : 0,
            maxWidth: isExpanded ? 200 : 0,
            transition: 'opacity 0.4s ease 0.1s, max-width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
          }}>Cerrar sesión</span>
        </button>
      </div>
    </aside>

      {/* FLYOUT — FUERA del aside para que backdrop-filter funcione V13.29 */}
      {activeSubmenu && navItems.find(i => i.label === activeSubmenu)?.subItems && (
        <div 
          className="master-flyout-ref"
          onMouseEnter={handleMouseEnterFlyout}
          onMouseLeave={handleMouseLeaveFlyout}
          style={{ 
            position: 'fixed',
            left: isExpanded ? 210 : 60, // Solapa 10px el sidebar V13.32
            top: 0,
            width: 180, 
            height: '100%',
            zIndex: 900,
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: '100px 12px 40px 12px',
            animation: 'slideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            pointerEvents: 'auto',
            // LIQUID GLASS V13.30 — blur sutil
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            background: isDark ? 'var(--bg-primary)' : 'rgba(255, 255, 255, 0.5)',
            borderLeft: isDark 
              ? '1px solid rgba(255, 255, 255, 0.15)' 
              : '1px solid rgba(0, 130, 124, 0.1)',
            boxShadow: isDark
              ? '4px 0 20px rgba(0,0,0,0.3), inset 1px 0 0 rgba(255,255,255,0.08)'
              : '4px 0 20px rgba(0,130,124,0.06), inset 1px 0 0 rgba(255,255,255,0.6)'
          }}
        >
          <div style={{ 
            padding: '0 24px', 
            fontSize: '12px', 
            fontWeight: 900, 
            textTransform: 'uppercase', 
            letterSpacing: '0.25em', 
            color: isDark ? '#D6F391' : '#006B66',
            marginBottom: '32px',
            background: 'transparent',
            display: 'block'
          }}>
            {activeSubmenu}
          </div>
          {navItems.find(i => i.label === activeSubmenu)?.subItems?.map((sub, sidx) => {
            const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + '/')
            return (
              <Link key={sidx} href={sub.href} onClick={(e) => { e.stopPropagation(); setActiveSubmenu(null); setIsExpanded(false); }}
                className={`flyout-item-sustainable ${isSubActive ? 'reuso-nav-active' : ''}`}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', borderRadius: '12px', fontSize: '14px', color: '#FFFFFF', textDecoration: 'none', transition: 'background 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, transform 0.2s ease', 
                  background: isSubActive ? 'var(--color-active-nav)' : 'transparent', 
                  boxShadow: isSubActive ? '0 4px 15px rgba(0, 0, 0, 0.1)' : 'none',
                  fontWeight: isSubActive ? 800 : 600,
                  margin: '0 8px'
                }}
              >
                <span style={{ color: isSubActive ? 'var(--color-text-nav-active)' : '#FFFFFF' }}>{sub.label}</span>
                {isSubActive && <div style={{ width: 6, height: 6, background: 'var(--color-text-nav-active)', borderRadius: '50%' }} />}
              </Link>
            )
          })}
        </div>
      )}
      {/* Overlay para cerrar submenú en móvil/tablet */}
      {isMobile && activeSubmenu && (
        <div 
          onClick={() => {
            setActiveSubmenu(null)
            setIsExpanded(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 850,
            background: 'rgba(0,0,0,0.1)',
          }}
        />
      )}
    </>
  )
}
