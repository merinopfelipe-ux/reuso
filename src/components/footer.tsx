'use client'

import { useState, useEffect } from 'react'

interface FooterProps {
  ip?: string
  lastVisit?: string
  ipLabel?: string
  lastVisitLabel?: string
  lastVisitHref?: string
  hideLegalLinks?: boolean
}

export function Footer({ ip, lastVisit, ipLabel = 'Dirección IP:', lastVisitLabel = 'Última visita:', lastVisitHref, hideLegalLinks = false }: FooterProps) {
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const mobileSeparator = <div style={{ height: 1, background: 'var(--divider)', width: '100%', opacity: 0.3 }} />

  return (
    <footer
      style={{
        padding: isMobile ? '24px' : '32px 40px',
        background: 'var(--bg-primary)', 
        color: 'var(--text-secondary)',
        fontSize: isMobile ? 11 : 12,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 20,
        width: '100%',
        textAlign: isMobile ? 'center' : 'left'
      }}
    >
      {/* 1. Menú Institucional — oculto dentro de páginas legales para evitar redundancia */}
      {!hideLegalLinks && (
        <div style={{
          display: 'flex',
          justifyContent: isMobile ? 'center' : 'flex-end',
          gap: isMobile ? 12 : 24,
          fontWeight: 500,
          flexWrap: 'wrap'
        }}>
          <a href="/legal/medicion" style={linkStyle} className="footer-link">Sobre la medición</a>
          <span style={{ color: 'var(--divider)', display: isMobile ? 'none' : 'inline' }}>•</span>
          <a href="/legal/reglamento" style={linkStyle} className="footer-link">Reglamento</a>
          <span style={{ color: 'var(--divider)', display: isMobile ? 'none' : 'inline' }}>•</span>
          <a href="/legal/privacidad" style={linkStyle} className="footer-link">Política de privacidad</a>
        </div>
      )}

      {!isMobile && !hideLegalLinks && (
        <div style={{ height: 1, background: 'var(--divider)', width: '100%', opacity: 0.5 }} />
      )}

      {isMobile ? (
        <>
          {mobileSeparator}
          {/* 2. Información Técnica Móvil V8.1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.8 }}>
            <p style={{ margin: 0 }}>
              <span style={{ fontWeight: 600 }}>{ipLabel}</span> {ip || '—'}
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ fontWeight: 600 }}>{lastVisitLabel}</span>{' '}
                {lastVisitHref ? (
                  <a href={lastVisitHref} style={{ color: 'inherit', textDecoration: 'underline' }}>{lastVisit || '—'}</a>
                ) : (lastVisit || '—')}
            </p>
          </div>
          {mobileSeparator}
          {/* 3. Atribución Móvil V8.1 */}
          <div style={{ lineHeight: 1.6 }}>
            <p style={{ margin: 0, opacity: 0.8 }}>Un producto de:</p>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
              © GRUPO MLP S.A.S. {currentYear}
            </p>
          </div>
        </>
      ) : (
        /* Nivel Inferior Desktop */
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ lineHeight: 1.6 }}>
            <p style={{ margin: 0, opacity: 0.8 }}>Un producto de:</p>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
              © GRUPO MLP S.A.S. {currentYear}
            </p>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.8 }}>
            <p style={{ margin: 0 }}>
              <span style={{ fontWeight: 600 }}>{ipLabel}</span> {ip || '—'}
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ fontWeight: 600 }}>{lastVisitLabel}</span>{' '}
                {lastVisitHref ? (
                  <a href={lastVisitHref} style={{ color: 'inherit', textDecoration: 'underline' }}>{lastVisit || '—'}</a>
                ) : (lastVisit || '—')}
            </p>
          </div>
        </div>
      )}

      <style>{`
        .footer-link:hover {
          color: var(--color-brand);
        }
      `}</style>
    </footer>
  )
}

const linkStyle: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  transition: 'color 0.2s',
}
