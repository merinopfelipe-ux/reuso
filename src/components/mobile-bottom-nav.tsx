'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home as House,
  Package,
  History as ClockCounterClockwise,
  LifeBuoy as Lifebuoy,
  Building2 as Buildings,
  Target,
  Medal,
  LayoutGrid as SquaresFour,
  List,
  X,
  Settings as Gear,
  TrendingUp as TrendUp,
} from 'lucide-react'
import type { Rol } from '@/types'

interface MobileBottomNavProps {
  rol: Rol
}

interface MobileItem {
  href: string
  label: string
  icon: React.ElementType
}

export function MobileBottomNav({ rol }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
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

  // Definir los items por rol
  const getMobileConfig = (): { bottomItems: MobileItem[]; drawerItems: MobileItem[] } => {
    if (rol === 'super_admin') {
      return {
        bottomItems: [
          { href: '/admin', label: 'Resumen', icon: SquaresFour },
          { href: '/admin/empresas', label: 'Empresas', icon: Buildings },
          { href: '/admin/calculos', label: 'Cálculos', icon: TrendUp },
          { href: '/admin/usuarios', label: 'Usuarios', icon: Gear },
        ],
        drawerItems: [
          { href: '/admin/leads', label: 'Leads', icon: SquaresFour },
          { href: '/admin/categorias', label: 'Categorías', icon: SquaresFour },
          { href: '/admin/modulos', label: 'Módulos', icon: SquaresFour },
          { href: '/admin/reportes', label: 'Reportes', icon: TrendUp },
          { href: '/admin/certificados', label: 'Certificados', icon: Medal },
          { href: '/admin/logs', label: 'Auditoría', icon: Gear },
          { href: '/admin/alertas', label: 'Alertas', icon: Gear },
          { href: '/admin/configuracion', label: 'Configuración', icon: Gear },
          { href: '/admin/contenido', label: 'Contenido', icon: SquaresFour },
          { href: '/admin/plantillas', label: 'Plantillas', icon: SquaresFour },
          { href: '/admin/tickets', label: 'Soporte', icon: Lifebuoy },
          { href: '/ayuda', label: 'Ayuda', icon: Lifebuoy },
          { href: '/admin/legal', label: 'Legales', icon: SquaresFour },
        ]
      }
    }
    if (rol === 'empresa_admin') {
      return {
        bottomItems: [
          { href: '/empresa', label: 'Perfil', icon: Buildings },
          { href: '/empresa/calculos', label: 'Cálculos', icon: Target },
          { href: '/empresa/certificados', label: 'Certificados', icon: Medal },
          { href: '/empresa/soporte', label: 'Soporte', icon: Lifebuoy },
        ],
        drawerItems: [
          { href: '/empresa/equipo', label: 'Equipo', icon: Buildings },
          { href: '/empresa/metas', label: 'Metas', icon: Target },
          { href: '/settings', label: 'Ajustes', icon: Gear },
        ]
      }
    }
    // empleado y usuario_libre
    const baseBottom = [
      { href: '/dashboard', label: 'Inicio', icon: House },
      { href: '/dashboard/objetos', label: 'Calcular', icon: Package },
      { href: '/dashboard/historial', label: 'Historial', icon: ClockCounterClockwise },
      { href: '/dashboard/soporte', label: 'Soporte', icon: Lifebuoy },
    ]
    const drawer = [
      { href: '/settings', label: 'Ajustes', icon: Gear },
    ]
    if (rol === 'usuario_libre') {
      drawer.unshift({ href: '/empresa/nueva', label: 'Planes', icon: TrendUp })
    }
    return { bottomItems: baseBottom, drawerItems: drawer }
  }

  const { bottomItems, drawerItems } = getMobileConfig()

  const activeColor = isDark ? '#D6F391' : '#006B66'
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(71, 71, 71, 0.6)'
  const liquidGlassStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backdropFilter: isOpen ? 'none' : 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: isOpen ? 'none' : 'blur(8px) saturate(180%)',
    background: isOpen 
      ? (isDark ? 'var(--bg-card)' : '#FFFFFF') 
      : (isDark ? 'rgba(71, 71, 71, 0.5)' : 'rgba(255, 255, 255, 0.5)'),
    borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid rgba(0, 130, 124, 0.1)',
    boxShadow: isDark ? '0 -8px 32px rgba(0,0,0,0.3)' : '0 -8px 32px rgba(0,130,124,0.06)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10000, // Superior a todo
    padding: '0 10px',
    userSelect: 'none',
    boxSizing: 'border-box',
  }

  return (
    <>
      {/* BARRA INFERIOR STICKY */}
      <nav style={liquidGlassStyle}>
        {bottomItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
                width: 64,
                color: isActive ? activeColor : inactiveColor,
                transition: 'color 0.2s ease',
              }}
            >
              <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* BOTÓN MÁS */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            width: 64,
            color: isOpen ? activeColor : inactiveColor,
            transition: 'color 0.2s ease',
          }}
        >
          {isOpen ? <X size={26} strokeWidth={2.5} /> : <List size={26} />}
          <span style={{ fontSize: 10, fontWeight: isOpen ? 700 : 500 }}>Más</span>
        </button>
      </nav>

      {/* DRAWER DESPLEGABLE PARA "MÁS" */}
      {isOpen && (
        <>
          {/* Fondo oscuro de cierre */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(71, 71, 71, 0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 9998,
            }}
          />

          {/* Contenido del Drawer */}
          <div
            style={{
              position: 'fixed',
              bottom: 72,
              left: 0,
              right: 0,
              maxHeight: '60vh',
              overflowY: 'auto',
              background: isDark ? 'var(--bg-card)' : '#FFFFFF',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 130, 124, 0.15)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
              zIndex: 9999,
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 40px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
            className="no-scrollbar"
          >
            {drawerItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '16px 8px',
                    borderRadius: 16,
                    background: isActive ? 'rgba(0, 130, 124, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: isActive ? `1.5px solid ${activeColor}` : '1.5px solid transparent',
                    color: isActive ? activeColor : isDark ? '#fff' : '#474747',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <item.icon size={28} strokeWidth={isActive ? 2.5 : 2} />
                  <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, textAlign: 'center' }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
