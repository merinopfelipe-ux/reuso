'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from '@/components/ui/icons'
import { configMovil } from '@/lib/navegacion'
import type { Rol } from '@/types'

interface MobileBottomNavProps {
  rol: Rol
  chatUrl?: string | null
}

export function MobileBottomNav({ rol, chatUrl }: MobileBottomNavProps) {
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

  const { rapidos: quickItems, cajon: drawerItems } = configMovil(rol, chatUrl)

  const brandColor = isDark ? '#D6F391' : '#00827C'
  const inactiveColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(71,71,71,0.5)'

  const isActive = (href: string) => {
    if (href.startsWith('http')) return false
    const isRoot = href === '/admin' || href === '/empresa' || href === '/dashboard'
    return isRoot ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
  }

  const glassPill: React.CSSProperties = {
    backdropFilter: 'blur(18px) saturate(190%)',
    WebkitBackdropFilter: 'blur(18px) saturate(190%)',
    background: isDark
      ? 'rgba(71,71,71,0.55)'
      : 'rgba(255,255,255,0.65)',
    border: isDark
      ? '1.5px solid rgba(255,255,255,0.14)'
      : '1.5px solid rgba(0,130,124,0.1)',
    boxShadow: isDark
      ? '0 6px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
      : '0 6px 32px rgba(0,130,124,0.09), inset 0 1px 0 rgba(255,255,255,0.85)',
  }

  const activePillBg = isDark
    ? 'rgba(214,243,145,0.16)'
    : 'rgba(0,130,124,0.12)'

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 'max(18px, env(safe-area-inset-bottom, 18px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 520,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none',
      }}>
        {/* PILL — accesos directos */}
        <nav key={pathname} style={{
          ...glassPill,
          flex: 1,
          height: 66,
          borderRadius: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          gap: 4,
          pointerEvents: 'auto',
        }}>
          {quickItems.map((item) => {
            const active = item.hrefs.some(isActive)

            const itemStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: active ? 6 : 0,
              padding: active ? '10px 14px' : '10px 8px',
              borderRadius: 9999,
              background: active ? activePillBg : 'transparent',
              color: active ? brandColor : inactiveColor,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flex: active ? '1 1 auto' : '0 0 auto',
              minWidth: 0,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
            }

            const content = (
              <>
                <item.icon size={23} strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <span style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.label}
                  </span>
                )}
              </>
            )

            return (
              <Link
                key={item.href + (active ? '-on' : '-off')}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                aria-label={item.label}
                title={item.label}
                style={itemStyle}
              >
                {content}
              </Link>
            )
          })}
        </nav>

        {/* BOTÓN circular — hamburguesa */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          style={{
            ...glassPill,
            width: 66,
            height: 66,
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
            ? <X size={28} strokeWidth={2.5} />
            : <Menu size={28} strokeWidth={2.2} />}
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
              bottom: 'calc(max(18px, env(safe-area-inset-bottom, 18px)) + 78px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)',
              maxWidth: 520,
              maxHeight: '70vh',
              overflowY: 'auto',
              zIndex: 9999,
              borderRadius: 26,
              padding: '14px 8px 18px',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              background: isDark
                ? 'rgba(71,71,71,0.78)'
                : 'rgba(255,255,255,0.88)',
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
              const active = !item.externa && isActive(item.href)
              const showGrupo = item.grupo && item.grupo !== drawerItems[idx - 1]?.grupo

              const linkStyle: React.CSSProperties = {
                display: 'flex',
                alignItems: 'center',
                padding: '14px 18px',
                margin: '2px 6px',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: active ? 700 : 500,
                color: active ? brandColor : (isDark ? '#FFFFFF' : '#474747'),
                textDecoration: 'none',
                background: active ? activePillBg : 'transparent',
                transition: 'background 0.2s ease',
              }

              return (
                <div key={item.href + idx}>
                  {showGrupo && (
                    <div style={{
                      padding: idx === 0 ? '8px 18px 6px' : '16px 18px 6px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(71,71,71,0.45)',
                      letterSpacing: '0.06em',
                    }}>
                      {item.grupo}
                    </div>
                  )}
                  {item.externa ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDrawerOpen(false)}
                      style={linkStyle}
                    >
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      style={linkStyle}
                    >
                      <span>{item.label}</span>
                      {active && (
                        <div style={{
                          marginLeft: 'auto',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: brandColor,
                        }} />
                      )}
                    </Link>
                  )}
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
