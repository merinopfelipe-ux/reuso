// 🔒 ARCHIVO PROTEGIDO - cualquier cambio pasa por PR + aprobación del dueño
// del repo (.github/CODEOWNERS + branch protection en main), nunca un push
// directo. Ver Regla de Oro #2 del CLAUDE.md.
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid as SquaresFour, Building2 as Buildings, Package, Settings as Gear, Home as House, LogOut as SignOut, Target, Calculator, ChevronRight as CaretRight, IdCard as IdentificationCard } from '@/components/ui/icons'
import type { Rol } from '@/types'

interface SubItem {
  href: string
  label: string
  // Encabezado visual dentro del flyout (ej. "CRM", "Sistema") que agrupa
  // varios subItems consecutivos bajo un mismo título, igual al patrón de
  // categorías de un mega-menú. Solo se pinta cuando cambia respecto al
  // subItem anterior, así que items seguidos del mismo grupo no lo repiten.
  grupo?: string
}

interface NavItem {
  href?: string
  label: string
  icon: React.ElementType
  subItems?: SubItem[]
}

// Máximo 4 ítems de primer nivel por rol (mobile-first: es lo que se ve
// estético en 375px), agrupando el resto adentro con subtítulos por grupo —
// decidido con el usuario 2026-09-01, opciones elegidas por rol abajo.
const NAV_ITEMS: Record<Rol, NavItem[]> = {
  // Opción B: Inicio · Gestión · CRM · Sistema y Recursos
  super_admin: [
    { href: '/admin', label: 'Resumen', icon: SquaresFour },
    {
      label: 'Gestión',
      icon: Buildings,
      subItems: [
        { href: '/admin/empresas', label: 'Empresas' },
        { href: '/admin/leads', label: 'Leads' },
        { href: '/admin/categorias', label: 'Categorías' },
        { href: '/admin/catalogo-pendientes', label: 'Catálogo pendientes' },
        { href: '/admin/catalogo-restringido', label: 'Catálogo restringido' },
        { href: '/admin/modulos', label: 'Módulos' },
      ]
    },
    {
      label: 'CRM',
      icon: Calculator,
      subItems: [
        { href: '/empresa/cotizador', label: 'Cotizaciones', grupo: 'Cotizador' },
        { href: '/empresa/clientes', label: 'Clientes' },
        { href: '/admin/calculos', label: 'Cálculos', grupo: 'Auditoría de plataforma' },
        { href: '/admin/reportes', label: 'Reportes' },
      ]
    },
    {
      label: 'Sistema y Recursos',
      icon: Gear,
      subItems: [
        { href: '/admin/usuarios', label: 'Usuarios', grupo: 'Sistema' },
        { href: '/admin/logs', label: 'Auditoría' },
        { href: '/admin/alertas', label: 'Alertas' },
        { href: '/admin/configuracion', label: 'Configuración' },
        { href: '/admin/qa', label: 'QA' },
        { href: '/admin/status', label: 'Estado' },
        { href: '/admin/correos', label: 'Correos', grupo: 'Recursos' },
        { href: '/admin/contenido', label: 'Contenido' },
        { href: '/admin/plantillas', label: 'Plantillas' },
        { href: '/admin/tickets', label: 'Soporte' },
        { href: '/ayuda', label: 'Ayuda' },
        { href: '/admin/legal', label: 'Documentos' },
        { href: '/admin/firmas', label: 'Firmas' },
      ]
    },
  ],
  // Opción C: Empresa · Medir · DPP · CRM
  empresa_admin: [
    {
      label: 'Empresa',
      icon: Buildings,
      subItems: [
        { href: '/empresa', label: 'Perfil' },
        { href: '/empresa/equipo', label: 'Equipo' },
        { href: '/settings', label: 'Ajustes', grupo: 'Cuenta' },
        { href: '/empresa/soporte', label: 'Soporte' },
      ]
    },
    {
      label: 'Medir',
      icon: Target,
      subItems: [
        { href: '/empresa/calculos', label: 'Cálculos' },
        { href: '/empresa/metas', label: 'Metas' },
        { href: '/empresa/informes', label: 'Informes' },
        { href: '/empresa/reportes', label: 'Reportes' },
      ]
    },
    { href: '/empresa/dpp', label: 'DPP', icon: IdentificationCard },
    {
      label: 'CRM',
      icon: Calculator,
      subItems: [
        { href: '/empresa/cotizador', label: 'Cotizaciones' },
        { href: '/empresa/clientes', label: 'Clientes' },
      ]
    },
  ],
  // Opción B: Calcular (con Inicio adentro) · CRM · Ajustes
  empleado: [
    {
      label: 'Calcular',
      icon: Package,
      subItems: [
        { href: '/dashboard', label: 'Inicio' },
        { href: '/dashboard/objetos', label: 'Calcular' },
        { href: '/dashboard/historial', label: 'Historial' },
      ]
    },
    {
      label: 'CRM',
      icon: Calculator,
      subItems: [
        { href: '/empresa/cotizador', label: 'Cotizaciones' },
        { href: '/empresa/clientes', label: 'Clientes' },
      ]
    },
    {
      label: 'Ajustes',
      icon: Gear,
      subItems: [
        { href: '/settings', label: 'Ajustes' },
        { href: '/dashboard/soporte', label: 'Soporte' },
      ]
    },
  ],
  // Opción B: Inicio · Calcular · CRM (upsell real, no link muerto) · Ajustes
  usuario_libre: [
    { href: '/dashboard', label: 'Inicio', icon: House },
    {
      label: 'Calcular',
      icon: Package,
      subItems: [
        { href: '/dashboard/objetos', label: 'Calcular' },
        { href: '/dashboard/historial', label: 'Historial' },
      ]
    },
    // No es un link muerto: usuario_libre no tiene el módulo, así que abre el
    // banner de "no está en tu plan" (ModuloBloqueadoBanner) en vez de un
    // href="#" que no llevaba a ningún lado.
    { href: '/dashboard?modulo_bloqueado=cotizador', label: 'CRM', icon: Calculator },
    {
      label: 'Ajustes',
      icon: Gear,
      subItems: [
        { href: '/settings', label: 'Ajustes' },
        { href: '/dashboard/soporte', label: 'Soporte' },
        { href: '/empresa/nueva', label: 'Planes' },
      ]
    },
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
    // El navegador puede fallar esta solicitud por razones ajenas al código
    // (extensión, cookie corrupta de una sesión anterior) — nunca debe
    // bloquear que el usuario salga de la pantalla actual.
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
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
                
                <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover-pop">
                  {/* Ícono delgado por defecto, grueso solo en activo V13.31 */}
                  <item.icon size={20} color="currentColor" strokeWidth={(isDirectActive || hasActiveSub) ? 2.5 : 2} />
                </div>
                
                {isExpanded && (
                  <span style={{ fontSize: '14px', fontWeight: (isDirectActive || hasActiveSub) ? 800 : 400, color: 'currentColor', opacity: 1, whiteSpace: 'nowrap', transition: 'opacity 0.3s ease, font-weight 0.3s ease' }}>
                    {item.label}
                  </span>
                )}

                {item.subItems && isExpanded && (
                  <CaretRight size={16} color="currentColor" style={{ marginLeft: 'auto', opacity: isInteracting ? 1 : 0.6, transform: isInteracting ? 'rotate(90deg)' : 'none', transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease' }} />
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
        [data-theme="light"] .liquid-base-context {
          background: rgba(71, 71, 71, 0.03) !important;
        }
        [data-theme="dark"] .liquid-base-context {
          background: rgba(214, 243, 145, 0.03) !important;
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
          background: rgba(214, 243, 145, 0.48) !important;
        }

        [data-theme="dark"] .clean-item-nav:not(.reuso-nav-active) {
          background: transparent !important;
        }

        [data-theme="dark"] .clean-item-nav:hover, [data-theme="dark"] .flyout-item-sustainable:hover {
          background: rgba(214, 243, 145, 0.18) !important;
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
          background: #474747 !important;
          color: #FFFFFF !important;
          box-shadow: 0 4px 20px rgba(71, 71, 71, 0.4) !important;
          border: none !important;
        }

        [data-theme="dark"] .reuso-nav-active span,
        [data-theme="dark"] .reuso-nav-active svg {
          color: #FFFFFF !important;
        }

        [data-theme="dark"] .reuso-nav-active .active-indicator-pill {
          background: #D6F391 !important;
          box-shadow: 0 0 10px rgba(214, 243, 145, 0.4);
        }

        [data-theme="dark"] .flyout-item-sustainable.reuso-nav-active {
          background: #474747 !important;
          box-shadow: 0 0 16px rgba(214, 243, 145, 0.25), 0 4px 12px rgba(71, 71, 71, 0.4) !important;
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
          className="hover-slide-r"
        >
          <SignOut size={22} strokeWidth={2.5} color="currentColor" style={{ flexShrink: 0 }} className="transition-transform duration-200" />
          <span style={{ 
            fontSize: '13px', 
            fontWeight: 700,
            opacity: isExpanded ? 1 : 0,
            maxWidth: isExpanded ? 200 : 0,
            transition: 'opacity 0.4s ease 0.1s, max-width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
          }}>Cerrar sesión</span>
        </button>
      </div>
    </aside>

      {/* FLYOUT - FUERA del aside para que backdrop-filter funcione V13.29.
          Modo grilla (2-3 columnas, "todo desplegado"): cuando el ítem activo
          tiene 2 o más grupos internos distintos, cada grupo se pinta como su
          propia columna lado a lado (referencia: mega-menú tipo banca, 2026-
          09-01) en vez de la lista angosta de una sola columna. Con 0 o 1
          grupo, se queda exactamente en la lista angosta de siempre — mismo
          Liquid Glass, mismo blur, mismos colores en los dos modos. */}
      {activeSubmenu && navItems.find(i => i.label === activeSubmenu)?.subItems && (() => {
        const subItems = navItems.find(i => i.label === activeSubmenu)!.subItems!
        // "Rellena hacia adelante": un subItem sin `grupo` propio hereda el
        // último grupo con nombre visto antes (mismo criterio ya usado para
        // decidir cuándo pintar el encabezado de grupo).
        let ultimoGrupo: string | undefined
        const columnas: { titulo?: string; items: SubItem[] }[] = []
        for (const sub of subItems) {
          const grupoEfectivo = sub.grupo ?? ultimoGrupo
          if (sub.grupo) ultimoGrupo = sub.grupo
          let columna = columnas.find(c => c.titulo === grupoEfectivo)
          if (!columna) { columna = { titulo: grupoEfectivo, items: [] }; columnas.push(columna) }
          columna.items.push(sub)
        }
        const modoGrilla = columnas.length >= 2
        const anchoColumna = 190
        const ancho = modoGrilla ? columnas.length * anchoColumna : 180

        const renderItem = (sub: SubItem, key: string) => {
          const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + '/')
          return (
            <Link key={key} href={sub.href} onClick={(e) => { e.stopPropagation(); setActiveSubmenu(null); setIsExpanded(false); }}
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
        }

        const tituloEstilo: React.CSSProperties = {
          padding: '10px 20px 4px', fontSize: '11px', fontWeight: 700,
          letterSpacing: '0.04em', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.65)',
        }

        return (
        <div
          className="master-flyout-ref"
          onMouseEnter={handleMouseEnterFlyout}
          onMouseLeave={handleMouseLeaveFlyout}
          style={{
            position: 'fixed',
            left: isExpanded ? 210 : 60, // Solapa 10px el sidebar V13.32
            top: 0,
            width: ancho,
            height: '100%',
            zIndex: 900,
            display: modoGrilla ? 'grid' : 'flex',
            gridTemplateColumns: modoGrilla ? `repeat(${columnas.length}, 1fr)` : undefined,
            flexDirection: modoGrilla ? undefined : 'column',
            gap: 4,
            padding: '120px 12px 40px 12px',
            animation: 'slideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            pointerEvents: 'auto',
            // LIQUID GLASS V13.30 - blur sutil, igual en los 2 modos
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            background: isDark ? 'rgba(71, 71, 71, 0.45)' : 'rgba(255, 255, 255, 0.45)',
            borderLeft: isDark
              ? '1px solid rgba(255, 255, 255, 0.15)'
              : '1px solid rgba(0, 130, 124, 0.1)',
            boxShadow: isDark
              ? '4px 0 20px rgba(0,0,0,0.3), inset 1px 0 0 rgba(255,255,255,0.08)'
              : '4px 0 20px rgba(0,130,124,0.06), inset 1px 0 0 rgba(255,255,255,0.6)'
          }}
        >
          {modoGrilla
            ? columnas.map((col, cidx) => (
                <div key={cidx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {col.titulo && <div style={tituloEstilo}>{col.titulo}</div>}
                  {col.items.map((sub, sidx) => renderItem(sub, `${cidx}-${sidx}`))}
                </div>
              ))
            : subItems.map((sub, sidx, arr) => {
                const grupoCambio = sub.grupo && sub.grupo !== arr[sidx - 1]?.grupo
                return (
                  <div key={sidx}>
                    {grupoCambio && <div style={tituloEstilo}>{sub.grupo}</div>}
                    {renderItem(sub, `item-${sidx}`)}
                  </div>
                )
              })}
        </div>
        )
      })()}
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
