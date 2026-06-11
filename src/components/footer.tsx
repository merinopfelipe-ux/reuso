// 🔒 ARCHIVO PROTEGIDO — NO MODIFICAR CSS/DISEÑO SIN CLAVE SECRETA DEL USUARIO
'use client'

import { useState, useEffect } from 'react'
import { CaretDown } from '@phosphor-icons/react'

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
  const [idioma, setIdioma] = useState<'ES' | 'ENG'>('ES')
  const [idiomaOpen, setIdiomaOpen] = useState(false)

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

  useEffect(() => {
    const guardado = localStorage.getItem('reuso_idioma') as 'ES' | 'ENG' | null
    if (guardado) {
      setIdioma(guardado)
    } else {
      const sys = navigator.language?.toLowerCase() ?? ''
      setIdioma(sys.startsWith('es') ? 'ES' : 'ENG')
    }
  }, [])

  useEffect(() => {
    const handleOutsideChange = () => {
      const guardado = localStorage.getItem('reuso_idioma') as 'ES' | 'ENG' | null
      if (guardado) setIdioma(guardado)
    }
    window.addEventListener('reuso_idioma_change', handleOutsideChange)
    return () => window.removeEventListener('reuso_idioma_change', handleOutsideChange)
  }, [])

  const handleIdiomaChange = (lang: 'ES' | 'ENG') => {
    setIdioma(lang)
    setIdiomaOpen(false)
    localStorage.setItem('reuso_idioma', lang)
    window.dispatchEvent(new Event('reuso_idioma_change'))
  }

  return (
    <footer
      style={{
        padding: isMobile ? '32px 24px' : '40px 60px',
        background: `linear-gradient(0deg, rgba(138, 208, 178, ${isDark ? '0.05' : '0.15'}) 0%, transparent 100%)`, 
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
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center', 
          gap: isMobile ? 12 : 20,
          textAlign: isMobile ? 'center' : 'left'
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/diseno/logo_gurpomlp.svg" 
            alt="Grupo MLP" 
            style={{ 
              width: 180,
              height: 'auto',
              opacity: isDark ? 0.9 : 1, 
              filter: isDark ? 'brightness(0) invert(1)' : 'var(--logo-filter)' 
            }}
          />
          {!isMobile && <div style={{ width: 1, height: 20, background: 'var(--divider)', opacity: 0.3 }} />}
          <div style={{ lineHeight: 1.5 }}>
            <p style={{ margin: 0, opacity: 0.7, fontSize: 11, fontWeight: 500 }}>
              © {currentYear} · Todos los derechos reservados.
            </p>
            <p style={{ margin: 0, opacity: 0.6, fontSize:isMobile ? 10 : 11 }}>
              Tecnología con propósito para un futuro sostenible.
            </p>
          </div>
        </div>

        {/* Lado Derecho: Links + Selector de idioma + Info Técnica */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-end',
          gap: 12
        }}>
          {!hideLegalLinks && (
            <div style={{
              display: 'flex',
              gap: isMobile ? 12 : 24,
              fontWeight: 500,
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-end'
            }}>
              <a href="/legal/medicion" target="_blank" rel="noopener noreferrer" style={linkStyle} className="footer-link">Sobre la medición</a>
              <span style={{ color: 'var(--divider)', display: isMobile ? 'none' : 'inline' }}>•</span>
              <a href="/legal/reglamento" target="_blank" rel="noopener noreferrer" style={linkStyle} className="footer-link">Reglamento</a>
              <span style={{ color: 'var(--divider)', display: isMobile ? 'none' : 'inline' }}>•</span>
              <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer" style={linkStyle} className="footer-link">Política de privacidad</a>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 16, 
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-end'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: 16, 
              opacity: 0.8, 
              fontSize: 10,
            }}>
              <span title={ip} style={{ opacity: 0.6 }}>{ipLabel} {ip || '—'}</span>
              <span style={{ opacity: 0.3 }}>|</span>
              {lastVisitHref ? (
                <a href={lastVisitHref} className="footer-link" style={{ color: 'inherit', textDecoration: 'underline', pointerEvents: 'auto' }}>{lastVisitLabel} {lastVisit || '—'}</a>
              ) : <span style={{ opacity: 0.6 }}>{lastVisitLabel} {lastVisit || '—'}</span>}
            </div>

            {/* Selector de idioma — dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIdiomaOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 600, padding: '5px 10px',
                  borderRadius: 6, border: '1px solid var(--border-light)',
                  cursor: 'pointer', background: 'transparent',
                  color: 'var(--text-secondary)', transition: 'all 0.2s',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${idioma === 'ES' ? 'es' : 'gb'}.svg`}
                  alt=""
                  style={{
                    width: 16,
                    height: 11,
                    borderRadius: '2px',
                    objectFit: 'cover',
                    border: '1px solid rgba(0,0,0,0.15)',
                  }}
                />
                {idioma}
                <CaretDown size={11} style={{ transform: idiomaOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {idiomaOpen && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                  background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                  borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  minWidth: 110, zIndex: 50,
                }}>
                  {(['ES', 'ENG'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleIdiomaChange(lang)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 12px', border: 'none',
                        background: idioma === lang ? 'var(--color-brand)' : 'transparent',
                        color: idioma === lang ? '#fff' : 'var(--text-primary)',
                        fontSize: 12, fontWeight: idioma === lang ? 600 : 400,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${lang === 'ES' ? 'es' : 'gb'}.svg`}
                        alt=""
                        style={{
                          width: 16,
                          height: 11,
                          borderRadius: '2px',
                          objectFit: 'cover',
                          border: `1px solid ${idioma === lang ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)'}`,
                        }}
                      />
                      <span>{lang === 'ES' ? 'Español' : 'English'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
