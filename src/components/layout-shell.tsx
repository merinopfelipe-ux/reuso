'use client'

import { useState, useEffect } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { Footer } from './footer'
import { BannerAlerta } from './alertas/banner-alerta'
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
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      userSelect: 'none',
    }}>
      {/* 1. Header Superior (Fijo, Ancho 100%, con Disparador de Sidebar) */}
      <div style={{ 
        background: 'var(--bg-integrated)', 
        flexShrink: 0, 
        zIndex: 50, 
        position: 'sticky', 
        top: 0 
      }}>
        <Header
          nombre={nombre}
          rol={rol}
          avatarColor={avatarColor}
          avatarText={avatarText}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
        />
        <BannerAlerta />
      </div>

      {/* 2. Cuerpo Inferior (Sidebar + Workspace) */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative' 
      }}>
        {/* Sidebar (Sincronizada con el estado global e isMobile V8.0) */}
        <Sidebar
          rol={rol}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          isMobile={isMobile}
          empresaId={empresaId}
        />

        {/* Workspace Central (Scrollable) */}
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            minWidth: 0,
            background: 'var(--bg-primary)',
            overflowY: 'auto'
          }}
        >
          {/* Main Content (Blanco Puro) */}
          <main style={{ flex: 1, background: 'var(--bg-primary)' }}>
            <div style={{
              width: '100%',
              padding: isMobile ? '16px' : '28px 32px',
              boxSizing: 'border-box' as const,
            }}>
              {children}
            </div>
          </main>

          {/* Footer Institucional */}
          <div style={{ background: 'var(--bg-primary)', flexShrink: 0 }}>
            <Footer ip={ip} lastVisit={lastVisit} />
          </div>
        </div>
      </div>
    </div>
  )
}
