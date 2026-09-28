'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home as House,
  Package,
  Building2 as Buildings,
  LayoutGrid as SquaresFour,
  Menu,
  X,
  IdCard as IdentificationCard,
  ClipboardList,
  History as ClockCounterClockwise,
  Calculator,
  Users,
  TrendingUp as TrendUp,
} from '@/components/ui/icons'
import type { Rol } from '@/types'

interface DrawerItem {
  href: string
  label: string
  grupo?: string
}

interface QuickItem {
  href: string
  label: string
  icon: React.ElementType
}

interface MobileConfig {
  quickItems: QuickItem[]
  drawerItems: DrawerItem[]
}

function getConfig(rol: Rol): MobileConfig {
  switch (rol) {
    case 'super_admin':
      return {
        quickItems: [
          { href: '/admin', label: 'Resumen', icon: SquaresFour },
          { href: '/empresa/cotizador', label: 'Cotizador', icon: ClipboardList },
          { href: '/admin/empresas', label: 'Empresas', icon: Buildings },
          { href: '/admin/leads', label: 'Leads', icon: Users },
        ],
        drawerItems: [
          { href: '/admin', label: 'Resumen', grupo: 'Principal' },
          { href: '/admin/empresas', label: 'Empresas' },
          { href: '/admin/leads', label: 'Leads' },
          { href: '/admin/categorias', label: 'Categorías', grupo: 'Catálogo' },
          { href: '/admin/catalogo-pendientes', label: 'Pendientes' },
          { href: '/admin/catalogo-restringido', label: 'Restringido' },
          { href: '/admin/modulos', label: 'Módulos' },
          { href: '/empresa/cotizador', label: 'Cotizaciones', grupo: 'CRM' },
          { href: '/empresa/clientes', label: 'Clientes' },
          { href: '/admin/calculos', label: 'Cálculos', grupo: 'Plataforma' },
          { href: '/admin/reportes', label: 'Reportes' },
          { href: '/admin/usuarios', label: 'Usuarios', grupo: 'Monitoreo' },
          { href: '/admin/logs', label: 'Auditoría' },
          { href: '/admin/alertas', label: 'Alertas' },
          { href: '/admin/qa', label: 'QA' },
          { href: '/admin/status', label: 'Estado' },
          { href: '/admin/configuracion', label: 'Configuración', grupo: 'Contenido' },
          { href: '/admin/contenido', label: 'Contenido' },
          { href: '/admin/plantillas', label: 'Plantillas' },
          { href: '/admin/legal', label: 'Documentos' },
          { href: '/admin/firmas', label: 'Firmas' },
          { href: '/admin/planes', label: 'Planes' },
          { href: '/admin/tickets', label: 'Soporte', grupo: 'Soporte' },
          { href: '/ayuda', label: 'Ayuda' },
        ],
      }
    case 'empresa_admin':
      return {
        quickItems: [
          { href: '/empresa', label: 'Inicio', icon: House },
          { href: '/empresa/cotizador', label: 'Cotizador', icon: ClipboardList },
          { href: '/empresa/dpp', label: 'DPP', icon: IdentificationCard },
          { href: '/empresa/calculos', label: 'Cálculos', icon: Calculator },
        ],
        drawerItems: [
          { href: '/empresa', label: 'Perfil', grupo: 'Empresa' },
          { href: '/empresa/equipo', label: 'Equipo' },
          { href: '/empresa/calculos', label: 'Cálculos', grupo: 'Medir' },
          { href: '/empresa/metas', label: 'Metas' },
          { href: '/empresa/informes', label: 'Informes' },
          { href: '/empresa/reportes', label: 'Reportes' },
          { href: '/empresa/dpp', label: 'DPP', grupo: 'Productos' },
          { href: '/empresa/cotizador', label: 'Cotizaciones', grupo: 'CRM' },
          { href: '/empresa/clientes', label: 'Clientes' },
          { href: '/settings', label: 'Ajustes', grupo: 'Cuenta' },
          { href: '/empresa/soporte', label: 'Soporte' },
        ],
      }
    case 'empleado':
      return {
        quickItems: [
          { href: '/dashboard', label: 'Inicio', icon: House },
          { href: '/dashboard/objetos', label: 'Calcular', icon: Package },
          { href: '/empresa/cotizador', label: 'Cotizador', icon: ClipboardList },
          { href: '/dashboard/historial', label: 'Historial', icon: ClockCounterClockwise },
        ],
        drawerItems: [
          { href: '/dashboard', label: 'Inicio', grupo: 'Principal' },
          { href: '/dashboard/objetos', label: 'Calcular' },
          { href: '/dashboard/historial', label: 'Historial' },
          { href: '/empresa/cotizador', label: 'Cotizaciones', grupo: 'CRM' },
          { href: '/empresa/clientes', label: 'Clientes' },
          { href: '/settings', label: 'Ajustes', grupo: 'Cuenta' },
          { href: '/dashboard/soporte', label: 'Soporte' },
        ],
      }
    default:
      return {
        quickItems: [
          { href: '/dashboard', label: 'Inicio', icon: House },
          { href: '/dashboard/objetos', label: 'Calcular', icon: Package },
          { href: '/dashboard/historial', label: 'Historial', icon: ClockCounterClockwise },
          { href: '/empresa/nueva', label: 'Planes', icon: TrendUp },
        ],
        drawerItems: [
          { href: '/dashboard', label: 'Inicio', grupo: 'Principal' },
          { href: '/dashboard/objetos', label: 'Calcular' },
          { href: '/dashboard/historial', label: 'Historial' },
          { href: '/dashboard?modulo_bloqueado=cotizador', label: 'Cotizador', grupo: 'CRM' },
          { href: '/empresa/nueva', label: 'Planes', grupo: 'Cuenta' },
          { href: '/settings', label: 'Ajustes' },
          { href: '/dashboard/soporte', label: 'Soporte' },
        ],
      }
  }
}

interface MobileBottomNavProps {
  rol: Rol
}

export function MobileBottomNav({ rol }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const { quickItems, drawerItems } = getConfig(rol)

  const brandColor = isDark ? '#D6F391' : '#00827C'
  const inactiveColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(71,71,71,0.45)'

  const isActive = (href: string) => {
    const isRoot = href === '/admin' || href === '/empresa' || href === '/dashboard'
    return isRoot ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
  }

  const glassPill: React.CSSProperties = {
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    background: isDark
      ? 'rgba(71,71,71,0.45)'
      : 'rgba(255,255,255,0.55)',
    border: isDark
      ? '1.5px solid rgba(255,255,255,0.12)'
      : '1.5px solid rgba(0,130,124,0.08)',
    boxShadow: isDark
      ? '0 4px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 4px 30px rgba(0,130,124,0.07), inset 0 1px 0 rgba(255,255,255,0.7)',
  }

  const activePillBg = isDark
    ? 'rgba(214,243,145,0.15)'
    : 'rgba(0,130,124,0.1)'

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {/* PILL — 4 accesos directos */}
        <nav key={pathname} style={{
          ...glassPill,
          flex: 1,
          height: 60,
          borderRadius: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          gap: 2,
          pointerEvents: 'auto',
        }}>
          {quickItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href + (active ? '-on' : '-off')}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: active ? 6 : 0,
                  padding: active ? '8px 12px' : '8px 10px',
                  borderRadius: 9999,
                  background: active ? activePillBg : 'transparent',
                  color: active ? brandColor : inactiveColor,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  flex: active ? '1 1 auto' : '0 0 auto',
                  minWidth: 0,
                }}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* BOTÓN circular — hamburguesa */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          style={{
            ...glassPill,
            width: 52,
            height: 52,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: drawerOpen ? brandColor : inactiveColor,
            pointerEvents: 'auto',
            transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
            padding: 0,
          }}
          aria-label={drawerOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {drawerOpen
            ? <X size={24} strokeWidth={2.5} />
            : <Menu size={24} strokeWidth={2} />}
        </button>
      </div>

      {/* DRAWER — menú completo */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: isDark ? 'rgba(71,71,71,0.5)' : 'rgba(71,71,71,0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 9998,
            }}
          />

          <div
            style={{
              position: 'fixed',
              bottom: 88,
              left: 16,
              right: 16,
              maxHeight: '70vh',
              overflowY: 'auto',
              zIndex: 9999,
              borderRadius: 24,
              padding: '12px 6px 16px',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              background: isDark
                ? 'rgba(71,71,71,0.75)'
                : 'rgba(255,255,255,0.8)',
              border: isDark
                ? '1.5px solid rgba(255,255,255,0.12)'
                : '1.5px solid rgba(0,130,124,0.08)',
              boxShadow: isDark
                ? '0 -8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 -8px 40px rgba(0,130,124,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            } as React.CSSProperties}
            className="mobile-nav-drawer-scroll"
          >
            {drawerItems.map((item, idx) => {
              const active = isActive(item.href)
              const showGrupo = item.grupo && item.grupo !== drawerItems[idx - 1]?.grupo

              return (
                <div key={item.href + idx}>
                  {showGrupo && (
                    <div style={{
                      padding: idx === 0 ? '6px 16px 4px' : '14px 16px 4px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(71,71,71,0.4)',
                      letterSpacing: '0.06em',
                    }}>
                      {item.grupo}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '13px 16px',
                      margin: '1px 6px',
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? brandColor : (isDark ? '#FFFFFF' : '#474747'),
                      textDecoration: 'none',
                      background: active ? activePillBg : 'transparent',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <div style={{
                        marginLeft: 'auto',
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: brandColor,
                      }} />
                    )}
                  </Link>
                </div>
              )
            })}
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .mobile-nav-drawer-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
        .mobile-nav-drawer-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </>
  )
}
