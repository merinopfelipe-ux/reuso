// 🔒 ARCHIVO PROTEGIDO - NO MODIFICAR CSS/DISEÑO SIN CLAVE SECRETA DEL USUARIO
'use client'

import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { FECHA_ACTUALIZACION_LEGAL } from '@/lib/constants/contacto'

interface FooterProps {
  ip?: string
  lastVisit?: string
  ipLabel?: string
  lastVisitLabel?: string
  lastVisitHref?: string
  hideLegalLinks?: boolean
}

export function Footer({ ip, lastVisit, ipLabel = 'Dirección IP:', lastVisitLabel = 'Última visita:', lastVisitHref, hideLegalLinks = false }: FooterProps) {
  const [isDark, setIsDark] = useState(false)
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Detección de tema para background adaptativo V13.3
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()

    // Observar cambios en data-theme
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      window.removeEventListener('resize', checkMobile)
      observer.disconnect()
    }
  }, [])

  return (
    <footer
      id="site-footer"
      style={{
        padding: isMobile ? '32px 24px 110px 24px' : '40px 60px',
        background: `linear-gradient(0deg, rgba(214, 243, 145, ${isDark ? '0.05' : '0.15'}) 0%, transparent 100%)`, 
        color: 'var(--text-secondary)',
        fontSize: isMobile ? 11 : 12,
        width: '100%',
      }}
    >
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: isMobile ? 24 : 32
      }}>
        {/* Lado Izquierdo: Logo + Copyright + Motto */}
        <div className="footer-left-container" style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center', 
          gap: isMobile ? 12 : 20,
          textAlign: isMobile ? 'center' : 'left',
          flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/diseno/logo_gurpomlp.svg" 
            alt="Grupo MLP" 
            style={{ 
              width: 180,
              height: 'auto',
              opacity: isDark ? 0.9 : 1, 
              filter: isDark ? 'brightness(0) invert(1)' : 'var(--logo-filter)',
              flexShrink: 0,
            }}
          />
          {!isMobile && <div className="footer-divider" style={{ width: 1, height: 20, background: 'var(--divider)', opacity: 0.3, flexShrink: 0 }} />}
          <div style={{ lineHeight: 1.5, flexShrink: 0 }}>
            <p style={{ margin: 0, opacity: 0.7, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
              © {currentYear} · Todos los derechos reservados.
            </p>
            <p style={{ margin: 0, opacity: 0.6, fontSize: isMobile ? 10 : 11, whiteSpace: 'nowrap' }}>
              Tecnología con propósito para un futuro sostenible.
            </p>
          </div>
        </div>

        {/* Lado Derecho: Links + Selector de tema + Info Técnica */}
        {hideLegalLinks ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobile ? 'center' : 'flex-end',
            gap: 6,
            fontSize: 11,
          }}>
            {/* Primera línea: Última actualización + ThemeToggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: isMobile ? 'center' : 'flex-end',
            }}>
              <span style={{ opacity: 0.7, fontWeight: 500 }}>
                {ipLabel} {ip || FECHA_ACTUALIZACION_LEGAL}
              </span>
              <ThemeToggle />
            </div>

            {/* Segunda línea: Correo de contacto */}
            {lastVisit && (
              <div style={{ opacity: 0.85 }}>
                <span style={{ opacity: 0.6 }}>{lastVisitLabel} </span>
                {lastVisitHref ? (
                  <a
                    href={lastVisitHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-email-link"
                    style={{ color: 'inherit', pointerEvents: 'auto' }}
                  >
                    {lastVisit}
                  </a>
                ) : (
                  <span>{lastVisit}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: isMobile ? 12 : 20,
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-end'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 12 : 16,
              fontWeight: 500,
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-end'
            }}>
              <a href="/legal/medicion" target="_blank" rel="noopener noreferrer" style={linkStyle} className="footer-link">Sobre la medición</a>
              <span style={{ color: 'var(--divider)', display: isMobile ? 'none' : 'inline' }}>•</span>
              <a href="/legal/reglamento" target="_blank" rel="noopener noreferrer" style={linkStyle} className="footer-link">Reglamento</a>
              <span style={{ color: 'var(--divider)', display: isMobile ? 'none' : 'inline' }}>•</span>
              <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer" style={linkStyle} className="footer-link">Política de privacidad</a>

              {/* Botón de cambio de tema Día / Noche al lado de Política de privacidad */}
              <ThemeToggle />
            </div>

            {(ip || lastVisit) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: 0.9,
                fontSize: 11,
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-end'
              }}>
                {ip && (
                  <>
                    <span title={ip} style={{ opacity: 0.6 }}>{ipLabel} {ip}</span>
                    {lastVisit && <span style={{ opacity: 0.3 }}>|</span>}
                  </>
                )}
                {lastVisit && (
                  lastVisitHref ? (
                    <span>
                      <span style={{ opacity: 0.6 }}>{lastVisitLabel} </span>
                      <a
                        href={lastVisitHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-email-link"
                        style={{ color: 'inherit', pointerEvents: 'auto' }}
                      >
                        {lastVisit}
                      </a>
                    </span>
                  ) : <span style={{ opacity: 0.6 }}>{lastVisitLabel} {lastVisit}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .footer-link {
          text-decoration: none;
        }
        .footer-link:hover {
          color: var(--color-brand);
          text-decoration: none;
        }
        .footer-email-link {
          text-decoration: none;
          transition: color 0.2s, text-decoration 0.2s;
        }
        .footer-email-link:hover {
          color: var(--color-brand);
          text-decoration: underline;
        }
        @media (max-width: 1150px) and (min-width: 769px) {
          .footer-left-container {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .footer-divider {
            display: none !important;
          }
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
