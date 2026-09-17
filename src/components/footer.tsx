// 🔒 ARCHIVO PROTEGIDO - NO MODIFICAR CSS/DISEÑO SIN CLAVE SECRETA DEL USUARIO
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  LinkedinLogo,
  YoutubeLogo,
  InstagramLogo,
} from '@/components/ui/icons'
import { REDES_SOCIALES_DEFAULT, type RedSocialItem } from '@/lib/constants/redes-sociales'

const SOCIAL_ICONS_MAP: Record<RedSocialItem['id'], React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties; color?: string }>> = {
  linkedin: LinkedinLogo,
  youtube: YoutubeLogo,
  instagram: InstagramLogo,
}

interface FooterProps {
  ip?: string
  lastVisit?: string
  ipLabel?: string
  lastVisitLabel?: string
  lastVisitHref?: string
  hideLegalLinks?: boolean
  showSocialLinks?: boolean
  variant?: 'public' | 'system' | 'legal'
  hasMobileNav?: boolean
}

export function Footer({ 
  ip,
  lastVisit,
  ipLabel = 'Dirección IP',
  lastVisitLabel = 'Contacto',
  lastVisitHref,
  hideLegalLinks = false,
  variant = 'public',
  hasMobileNav = false,
}: FooterProps) {
  // Limpiar posibles dos puntos al final de cualquier etiqueta
  const cleanIpLabel = ipLabel ? ipLabel.replace(/:\s*$/, '').trim() : ''
  const cleanLastVisitLabel = lastVisitLabel ? lastVisitLabel.replace(/:\s*$/, '').trim() : 'Contacto'
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(false)
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
    const checkMobile = () => setIsMobile(window.innerWidth <= 860)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Detección de tema para background adaptativo
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

  const renderInfoBlocks = (isMobileView: boolean) => {
    if (isMobileView) {
      if (variant === 'legal' || variant === 'system') {
        const fechaDisplay = (variant === 'legal' && ip && !ip.includes('.'))
          ? ip.split(',')[0].trim()
          : (lastVisit && lastVisit.includes(' de '))
            ? lastVisit.replace(/^[a-záéíóú]+,\s*/i, '').replace(/,\s*\d+:\d+.*$/, '').trim()
            : '14 de septiembre de 2026'

        const contactEmail = (lastVisit && lastVisit.includes('@'))
          ? lastVisit
          : 'servicio@calculadoradereuso.com'

        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            width: '100%',
            textAlign: 'center',
          }}>
            {/* Última actualización: con dos puntos, sin negrita */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span className="footer-info-primary" style={{ cursor: 'default', fontWeight: 400, fontSize: 10 }}>
                Última actualización:
              </span>
              <span className="footer-info-secondary" style={{ cursor: 'default', fontSize: 10 }}>
                {fechaDisplay}
              </span>
            </div>

            {/* Contacto: con dos puntos, en negrita */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              <a
                href={lastVisitHref || `mailto:${contactEmail}`}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-interactive-block"
                style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 4, textDecoration: 'none' }}
              >
                <span className="footer-info-primary" style={{ fontWeight: 600, fontSize: 10 }}>
                  Contacto:
                </span>
                <span className="footer-info-secondary" style={{ fontSize: 10 }}>
                  {contactEmail}
                </span>
              </a>
            </div>
          </div>
        )
      }

      // Default 'public' móvil (Home / Sistema de diseño)
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          width: '100%',
          textAlign: 'center',
        }}>
          {/* Inicia ahora */}
          <Link
            href="/registro"
            className="footer-interactive-block"
            style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', flexWrap: 'wrap' }}
          >
            <span className="footer-info-primary" style={{ fontWeight: 600, fontSize: 10 }}>
              Inicia ahora:
            </span>
            <span className="footer-info-secondary" style={{ fontSize: 10 }}>
              En 3 minutos tienes tu primer reporte.
            </span>
          </Link>

          {/* Contacto */}
          <a
            href={lastVisitHref || (lastVisit ? `mailto:${lastVisit}` : 'mailto:servicio@calculadoradereuso.com')}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-interactive-block"
            style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', flexWrap: 'wrap' }}
          >
            <span className="footer-info-primary" style={{ fontWeight: 600, fontSize: 10 }}>
              {cleanLastVisitLabel || 'Contacto'}:
            </span>
            <span className="footer-info-secondary" style={{ fontSize: 10, wordBreak: 'break-word' }}>
              {lastVisit || 'servicio@calculadoradereuso.com'}
            </span>
          </a>
        </div>
      )
    }

    // ----------------------------------------------------
    // DISEÑO ESCRITORIO (DESK): Réplica idéntica en los 3
    // Límite superior: Bloque 1 | Límite inferior: Bloque 2
    // Todo a 10px siempre
    // ----------------------------------------------------
    if (variant === 'legal') {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          height: 70,
          fontSize: 10,
          textAlign: 'left',
        }}>
          {/* Límite superior: Última actualización (Sin enlace: sin negrita, sin animación, 10px siempre) */}
          <div className="footer-static-info" style={{ display: 'flex', flexDirection: 'column', gap: 0, cursor: 'default' }}>
            <div className="footer-info-primary" style={{ fontWeight: 400, fontSize: 10, lineHeight: 1.15 }}>
              {cleanIpLabel || 'Última actualización'}
            </div>
            <div className="footer-info-secondary" style={{ fontSize: 10, lineHeight: 1.15 }}>
              {ip ? ip.split(',')[0].trim() : '13 de septiembre de 2026'}
            </div>
          </div>

          {/* Límite inferior: Contacto (Con enlace: con negrita, animación de redes, 10px siempre) */}
          <a
            href={lastVisitHref || (lastVisit ? `mailto:${lastVisit}` : 'mailto:servicio@calculadoradereuso.com')}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-interactive-block"
            style={{ gap: 0 }}
          >
            <div className="footer-info-primary" style={{ fontWeight: 600, fontSize: 10, lineHeight: 1.15 }}>
              {cleanLastVisitLabel || 'Contacto'}
            </div>
            <div className="footer-info-secondary" style={{ fontSize: 10, lineHeight: 1.15, wordBreak: 'break-word' }}>
              {lastVisit || 'servicio@calculadoradereuso.com'}
            </div>
          </a>
        </div>
      )
    }

    if (variant === 'system') {
      const hasContactLink = Boolean(lastVisitHref || (lastVisit && lastVisit.includes('@')))
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          height: 70,
          fontSize: 10,
          textAlign: 'left',
        }}>
          {/* Límite superior: Dirección IP (Sin enlace: sin negrita, sin animación, 10px siempre) */}
          <div className="footer-static-info" style={{ display: 'flex', flexDirection: 'column', gap: 0, cursor: 'default' }}>
            <div className="footer-info-primary" style={{ fontWeight: 400, fontSize: 10, lineHeight: 1.15 }}>
              {cleanIpLabel || 'Dirección IP'}
            </div>
            <div className="footer-info-secondary" style={{ fontSize: 10, lineHeight: 1.15 }}>
              {ip || '—'}
            </div>
          </div>

          {/* Límite inferior: Contacto o Última visita (10px siempre) */}
          {hasContactLink ? (
            <a
              href={lastVisitHref || `mailto:${lastVisit}`}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-interactive-block"
              style={{ gap: 0 }}
            >
              <div className="footer-info-primary" style={{ fontWeight: 600, fontSize: 10, lineHeight: 1.15 }}>
                {cleanLastVisitLabel || 'Contacto'}
              </div>
              <div className="footer-info-secondary" style={{ fontSize: 10, lineHeight: 1.15, wordBreak: 'break-word' }}>
                {lastVisit}
              </div>
            </a>
          ) : (
            <div className="footer-static-info" style={{ display: 'flex', flexDirection: 'column', gap: 0, cursor: 'default' }}>
              <div className="footer-info-primary" style={{ fontWeight: 400, fontSize: 10, lineHeight: 1.15 }}>
                {cleanLastVisitLabel && cleanLastVisitLabel !== 'Contacto' ? cleanLastVisitLabel : 'Última visita'}
              </div>
              <div className="footer-info-secondary" style={{ fontSize: 10, lineHeight: 1.15 }}>
                {lastVisit || '—'}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Default 'public' en escritorio (Home / Sistema de diseño)
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        height: 70,
        fontSize: 10,
        textAlign: 'left',
      }}>
        {/* Límite superior: Inicia ahora (Con enlace: con negrita, animación de redes, 10px siempre) */}
        <Link
          href="/registro"
          className="footer-interactive-block"
          style={{ gap: 0 }}
        >
          <div className="footer-info-primary" style={{ fontWeight: 600, fontSize: 10, lineHeight: 1.15 }}>
            Inicia ahora
          </div>
          <div className="footer-info-secondary" style={{ fontSize: 10, lineHeight: 1.15 }}>
            En 3 minutos tienes tu primer reporte.
          </div>
        </Link>

        {/* Límite inferior: Contacto (Con enlace: con negrita, animación de redes, 10px siempre) */}
        <a
          href={lastVisitHref || (lastVisit ? `mailto:${lastVisit}` : 'mailto:servicio@calculadoradereuso.com')}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-interactive-block"
          style={{ gap: 0 }}
        >
          <div className="footer-info-primary" style={{ fontWeight: 600, fontSize: 10, lineHeight: 1.15 }}>
            {cleanLastVisitLabel || 'Contacto'}
          </div>
          <div className="footer-info-secondary" style={{ fontSize: 10, lineHeight: 1.15, wordBreak: 'break-word' }}>
            {lastVisit || 'servicio@calculadoradereuso.com'}
          </div>
        </a>
      </div>
    )
  }

  const navLinks = variant === 'legal'
    ? [
        { href: '/', label: 'Inicio', isExternal: false },
        { href: '/login', label: 'Iniciar sesión', isExternal: false },
        { href: '#', label: 'Preguntas frecuentes', isExternal: false },
      ]
    : [
        { href: '/legal/privacidad', label: 'Política de privacidad', isExternal: true },
        { href: '/legal/reglamento', label: 'Reglamento', isExternal: true },
        { href: '/legal/medicion', label: 'Sobre la medición', isExternal: true },
      ]

  // Espacio inferior para el menú móvil:
  // Se aplica en Home (/), Sistema de diseño (/sistema-diseno) y dentro de todo el sistema (variant === 'system')
  // Exclusión estricta: NO aplicar al footer de legales (variant === 'legal' o /legal)
  const isLegal = variant === 'legal' || pathname?.startsWith('/legal')
  const isHome = pathname === '/'
  const isDesignSystem = pathname?.startsWith('/sistema-diseno')
  const isSystem = variant === 'system'

  const needsMobileBottomSpace = !isLegal && (isHome || isDesignSystem || isSystem || hasMobileNav)
  const mobileBottomPadding = needsMobileBottomSpace ? 104 : 20

  return (
    <footer
      id="site-footer"
      style={{
        scrollMarginTop: '70px',
        padding: isMobile 
          ? `24px 16px ${mobileBottomPadding}px 16px`
          : '44px 60px 24px 60px',
        background: `linear-gradient(0deg, rgba(214, 243, 145, ${isDark ? '0.09' : '0.22'}) 0%, transparent 100%)`,
        color: 'var(--text-secondary)',
        width: '100%',
        ['--footer-hover-accent' as string]: isDark ? '#8AD0B2' : '#00827C',
      }}
    >
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
      }}>
        {/* Disposición universal: Móvil adaptado vs Escritorio 4 columnas */}
        {isMobile ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            width: '100%',
          }}>
            {/* 1. Título principal en móvil (Presente e idéntico en los 3 footers) */}
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '320px', marginBottom: 2 }}>
              <p className="footer-rainbow-title" style={{ textAlign: 'center', fontSize: 21, margin: '0 auto', lineHeight: 1.25 }}>
                Tecnología con propósito<br />para un futuro sostenible.
              </p>
            </div>

            {/* Bloque Superior: Enlaces de navegación con punto medio de separación (una sola línea) */}
            {!hideLegalLinks && (
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '380px',
                gap: 6,
                fontSize: 10,
                textAlign: 'center',
                flexWrap: 'nowrap',
              }}>
                {navLinks.map((link, idx) => (
                  <span key={link.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <a 
                      href={link.href} 
                      target={link.isExternal ? '_blank' : undefined} 
                      rel={link.isExternal ? 'noopener noreferrer' : undefined} 
                      className="footer-nav-link"
                      style={{ whiteSpace: 'nowrap', textAlign: 'center', fontSize: 10 }}
                    >
                      {link.label}
                    </a>
                    {idx < navLinks.length - 1 && (
                      <span style={{ opacity: 0.35, userSelect: 'none' }}>·</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Bloque Inferior: IP, Última Visita, etc */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              {renderInfoBlocks(true)}
            </div>

            {/* 3. Redes sociales */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              width: '100%',
              margin: '2px auto',
              textAlign: 'center',
            }}>
              {REDES_SOCIALES_DEFAULT.map((red) => {
                const IconComponent = SOCIAL_ICONS_MAP[red.id]
                return (
                  <a
                    key={red.id}
                    href={red.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={red.ariaLabel}
                    className="footer-mobile-social-btn"
                    title={red.nombre}
                    style={{ width: 36, height: 36 }}
                  >
                    <IconComponent 
                      size={22} 
                      color={isDark ? '#FFFFFF' : '#474747'} 
                    />
                  </a>
                )
              })}
            </div>
          </div>
        ) : (
          /* Escritorio: 4 columnas estándar */
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            textAlign: 'left',
            gap: 36,
          }}>
            {/* Columna 1: Tecnología con propósito para un futuro sostenible */}
            <div style={{ flex: '1 1 360px', maxWidth: 420 }}>
              <p className="footer-rainbow-title" style={{ textAlign: 'left' }}>
                Tecnología con propósito<br />para un futuro sostenible.
              </p>
            </div>

            {/* Columna 2: Enlaces de navegación */}
            {!hideLegalLinks && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 70,
                fontSize: 12,
              }}>
                {navLinks.map((link) => (
                  <a 
                    key={link.label}
                    href={link.href} 
                    target={link.isExternal ? '_blank' : undefined} 
                    rel={link.isExternal ? 'noopener noreferrer' : undefined} 
                    className="footer-nav-link"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {/* Columna 3: Redes sociales oficiales */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: 70,
              fontSize: 12,
            }}>
              {REDES_SOCIALES_DEFAULT.map((red) => {
                const IconComponent = SOCIAL_ICONS_MAP[red.id]
                return (
                  <a
                    key={red.id}
                    href={red.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={red.ariaLabel}
                    className="footer-social-row"
                  >
                    <span className="footer-social-glyph">
                      <IconComponent 
                        size={15} 
                        color={isDark ? '#FFFFFF' : '#474747'} 
                      />
                    </span>
                    <span 
                      className="footer-social-handle"
                      style={{
                        color: isDark ? 'var(--text-secondary)' : '#474747',
                      }}
                    >
                      {red.handle}
                    </span>
                  </a>
                )
              })}
            </div>

            {/* Columna 4: Inicia ahora y Contacto */}
            {renderInfoBlocks(false)}
          </div>
        )}

        {/* Fila inferior estándar (para todos los footers) */}
        <div style={{
          marginTop: isMobile ? 10 : 16,
          paddingTop: isMobile ? 0 : 24,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: isMobile ? 'center' : 'space-between',
          alignItems: 'center',
          textAlign: 'center',
          gap: isMobile ? 2 : 14,
          fontSize: 10,
          lineHeight: 1.25,
          color: 'var(--text-secondary)',
          borderTop: 'none',
        }}>
          {isMobile ? (
            <>
              {/* Mobile: Desarrollado con... de una línea + Theme Toggle tras Lurdes sin opacidad */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 6,
                fontSize: 10,
                textAlign: 'center',
              }}>
                <span style={{ fontWeight: 300, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(71,71,71,0.45)' }}>
                  Plataforma ClimaTech de economía circular y sostenibilidad <br /> Medellín y Bogotá, Colombia · Calculadora de Reúso by{' '}
                  <a href="https://lurdes.co/" target="_blank" rel="noopener noreferrer" className="footer-discreet-link">
                    Lurdes
                  </a>
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', opacity: 1, transform: 'scale(0.8)', transformOrigin: 'center' }}>
                  <ThemeToggle size="sm" />
                </div>
              </div>

              {/* Mobile: Cierra Copyright con muy poco espacio de la línea anterior */}
              <div style={{
                fontWeight: 300,
                color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(71,71,71,0.45)',
                fontSize: 10,
                textAlign: 'center',
                marginTop: 0,
              }}>
                © {currentYear}{' '}
                <a href="https://lurdes.co/" target="_blank" rel="noopener noreferrer" className="footer-discreet-link">
                  Grupo MLP S.A.S.
                </a>
                {' '}· Todos los derechos reservados.
              </div>
            </>
          ) : (
            <>
              {/* Escritorio: Copyright a la izquierda */}
              <div style={{ fontWeight: 300, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(71,71,71,0.45)', lineHeight: 1.2, textAlign: 'left' }}>
                © {currentYear}{' '}
                <a href="https://lurdes.co/" target="_blank" rel="noopener noreferrer" className="footer-discreet-link">
                  Grupo MLP S.A.S.
                </a>
                {' '}· Todos los derechos reservados.
              </div>

              {/* Escritorio: Desarrollado + Theme Toggle a la derecha sin opacidad */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontWeight: 300, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(71,71,71,0.45)', textAlign: 'right' }}>
                  Plataforma ClimaTech de economía circular y sostenibilidad · Medellín y Bogotá, Colombia · Calculadora de Reúso by{' '}
                  <a href="https://lurdes.co/" target="_blank" rel="noopener noreferrer" className="footer-discreet-link">
                    Lurdes
                  </a>
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', opacity: 1, transform: 'scale(0.82)', transformOrigin: 'center' }}>
                  <ThemeToggle size="sm" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Título con animación continua de TODOS los colores oficiales de la marca al hover */
        .footer-rainbow-title {
          font-size: ${isMobile ? '22px' : '26px'};
          font-weight: 800;
          line-height: 1.18;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin: 0;
          cursor: default;
          background: linear-gradient(
            90deg,
            #00827C 0%,
            #38B98E 14%,
            #8AD0B2 28%,
            #D6F391 42%,
            #AD7C43 56%,
            #F3BBD3 70%,
            #985FA1 84%,
            #59A6E4 92%,
            #00827C 100%
          );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: var(--text-primary);
          transition: -webkit-text-fill-color 0.3s ease;
        }
        .footer-rainbow-title:hover {
          -webkit-text-fill-color: transparent;
          animation: rainbowFlow 4s linear infinite;
        }
        @keyframes rainbowFlow {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 300% 50%;
          }
        }

        .footer-nav-link {
          display: inline-block;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .footer-nav-link:hover {
          color: var(--footer-hover-accent) !important;
          transform: ${isMobile ? 'scale(1.04)' : 'translateX(4px)'};
        }

        /* Redes sociales con animación suave y color adaptativo al pasar el cursor */
        .footer-social-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 18px;
          line-height: 18px;
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .footer-social-row:hover {
          transform: ${isMobile ? 'scale(1.04)' : 'translateX(4px)'};
        }
        .footer-social-glyph {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          transition: color 0.2s ease;
        }
        .footer-social-row:hover .footer-social-glyph svg {
          color: var(--footer-hover-accent) !important;
          fill: var(--footer-hover-accent) !important;
        }
        .footer-social-handle {
          font-family: inherit;
          letter-spacing: -0.01em;
          transition: color 0.2s ease;
        }
        .footer-social-row:hover .footer-social-handle {
          color: var(--footer-hover-accent) !important;
        }

        /* Botones de redes sociales específicos para móvil */
        .footer-mobile-social-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .footer-mobile-social-btn:hover,
        .footer-mobile-social-btn:active {
          transform: scale(1.12);
        }
        .footer-mobile-social-btn:hover svg,
        .footer-mobile-social-btn:active svg {
          color: var(--footer-hover-accent) !important;
          fill: var(--footer-hover-accent) !important;
        }

        /* Bloques de la columna 4: Información y Enlaces */
        .footer-interactive-block {
          display: inline-flex;
          flex-direction: column;
          gap: 0px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .footer-interactive-block:hover {
          transform: ${isMobile ? 'scale(1.04)' : 'translateX(4px)'};
        }
        .footer-interactive-block:hover .footer-info-primary,
        .footer-interactive-block:hover .footer-info-secondary {
          color: var(--footer-hover-accent) !important;
          opacity: 1 !important;
        }

        .footer-static-info {
          display: inline-flex;
          flex-direction: column;
          gap: 0px;
          cursor: default;
        }

        .footer-info-primary {
          font-size: 10px !important;
          line-height: 1.15;
          color: var(--text-primary);
          transition: color 0.2s ease;
        }
        .footer-info-secondary {
          font-size: 10px !important;
          line-height: 1.15;
          color: var(--text-secondary);
          opacity: 0.8;
          transition: color 0.2s ease, opacity 0.2s ease;
        }

        .footer-email-link {
          text-decoration: none;
          transition: text-decoration 0.2s ease;
        }
        .footer-email-link:hover {
          text-decoration: underline;
        }

        /* Enlaces discretos (Lurdes / Grupo MLP S.A.S.): en reposo heredan
           el tono translúcido del texto que los rodea, en hover siempre
           pasan al color sólido sin opacidad (uniformado 2026-09-15,
           mismo criterio que la propuesta pública). Negro Lurdes en día;
           en noche pasa a blanco (mismo patrón ya usado en este archivo
           para íconos, línea ~434) — #474747 sobre el fondo #474747 de
           noche quedaría invisible, nunca lo pidió el usuario a propósito.
        */
        .footer-discreet-link {
          color: inherit !important;
          text-decoration: none !important;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        [data-theme="light"] .footer-discreet-link:hover,
        [data-theme="light"] .footer-discreet-link:focus,
        [data-theme="light"] .footer-discreet-link:active {
          color: #474747 !important;
          text-decoration: none !important;
          outline: none;
        }
        [data-theme="dark"] .footer-discreet-link:hover,
        [data-theme="dark"] .footer-discreet-link:focus,
        [data-theme="dark"] .footer-discreet-link:active {
          color: #FFFFFF !important;
          text-decoration: none !important;
          outline: none;
        }
      ` }} />
    </footer>
  )
}
