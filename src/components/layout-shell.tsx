'use client'

import { useState, useEffect } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { Footer } from './footer'
import { BannerAlerta } from './alertas/banner-alerta'
import { MobileBottomNav } from './mobile-bottom-nav'
import type { Rol } from '@/types'

interface LayoutShellProps {
  children: React.ReactNode
  nombre: string
  rol: Rol
  nombreEmpresa?: string
  empresaId?: string | null
  avatarColor?: string
  avatarText?: string
  ip?: string
  lastVisit?: string
}

export function LayoutShell({ children, nombre, rol, empresaId, avatarColor, avatarText, ip, lastVisit }: LayoutShellProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
    }} className="allow-select">
      {/* 1. Header Maestro (En frente absoluto, zIndex 2000 V13.16) */}
      <div style={{
        background: 'transparent',
        flexShrink: 0,
        zIndex: 2000,
        position: 'fixed',
        top: 0,
        width: '100%'
      }}>
        <Header
          nombre={nombre}
          rol={rol}
          avatarColor={avatarColor}
          avatarText={avatarText}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
        />
      </div>

      {/* 2. Cuerpo Inferior (Sidebar + Workspace con Margen Dinámico) */}
      <div style={{
        display: 'flex',
        flex: 1,
        marginTop: 70,
        position: 'relative'
      }}>
        {/* Sidebar Ultra-Glass (Oculto en móvil mediante CSS) */}
        <Sidebar
          rol={rol}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          isMobile={isMobile}
          empresaId={empresaId}
        />

        {/* Workspace Central V13.22 */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] transition-[margin-left] duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] ml-0 ${isExpanded ? 'md:ml-[220px]' : 'md:ml-[70px]'}`}
        >
          {/* Main Content */}
          <BannerAlerta />
          <main style={{ flex: 1 }}>
            <div style={{
              width: '100%',
              padding: isMobile ? '32px 24px 104px' : '40px 60px',
              boxSizing: 'border-box' as const,
              maxWidth: '1600px', // Limitar ancho para legibilidad
              margin: '0 auto'
            }}>
              {children}
            </div>
          </main>

          {/* Footer Institucional (Margen inferior en móvil para no solapar V13.52) */}
          <div style={{ flexShrink: 0, paddingBottom: isMobile ? 72 : 0 }}>
            <Footer ip={ip} lastVisit={lastVisit} />
          </div>
        </div>
      </div>
      {/* Menú Sticky Inferior en Móvil */}
      {isMobile && <MobileBottomNav rol={rol} />}
    </div>
  )
}
