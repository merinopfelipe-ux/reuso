'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cpu, ArrowDown } from '@phosphor-icons/react'
import { LegalSubmenu } from '@/components/legal-submenu'
import { LegalHeader } from '@/components/legal/legal-header'

interface LeeTabienItem {
  href: string
  label: string
  descripcion?: string
}

interface SeccionItem {
  id: string
  label: string
}

interface LegalPageLayoutProps {
  titulo: string
  breadcrumbLabel: string
  secciones: SeccionItem[]
  resumen: string
  leeTabien: LeeTabienItem[]
  children: React.ReactNode
  requiresAccept?: React.ReactNode
  transparenciaTexto?: React.ReactNode | null
  hideResumen?: boolean
  hideLeeTambien?: boolean
}

const ALL_LEGAL_PAGES = {
  ES: [
    { href: '/legal/terminos', label: 'Términos y Condiciones', descripcion: 'Reglas de uso de la plataforma, derechos y obligaciones.' },
    { href: '/legal/privacidad', label: 'Política de Privacidad', descripcion: 'Cómo protegemos y tratamos la información de los usuarios.' },
    { href: '/legal/datos', label: 'Tratamiento de Datos', descripcion: 'Política conforme a la Ley 1581 de 2012, RGPD y CCPA.' },
    { href: '/legal/cookies', label: 'Política de Cookies', descripcion: 'Qué cookies usamos, para qué y cómo gestionarlas.' },
    { href: '/legal/reglamento', label: 'Reglamento de Uso', descripcion: 'Condiciones técnicas de la calculadora, cálculos y certificados.' },
    { href: '/legal/confidencialidad', label: 'Acuerdo de Confidencialidad', descripcion: 'Compromiso de no replicar ni extraer información.' },
    { href: '/legal/ia', label: 'Uso de Inteligencia Artificial', descripcion: 'Cómo usamos IA para construir la plataforma y calcular CO₂.' },
    { href: '/legal/medicion', label: 'Metodología de Cálculo', descripcion: 'Cómo estimamos el CO₂e evitado de forma inmutable y verificable.' },
  ],
  ENG: [
    { href: '/legal/terminos', label: 'Terms and Conditions', descripcion: 'Platform usage rules, rights and obligations.' },
    { href: '/legal/privacidad', label: 'Privacy Policy', descripcion: 'How we protect and process user information.' },
    { href: '/legal/datos', label: 'Data Processing', descripcion: 'Policy under Law 1581 of 2012, GDPR and CCPA.' },
    { href: '/legal/cookies', label: 'Cookie Policy', descripcion: 'What cookies we use, why, and how to manage them.' },
    { href: '/legal/reglamento', label: 'Usage Regulations', descripcion: 'Technical conditions of the calculator and certificates.' },
    { href: '/legal/confidencialidad', label: 'Confidentiality Agreement', descripcion: 'Commitment not to replicate or extract information.' },
    { href: '/legal/ia', label: 'Artificial Intelligence Use', descripcion: 'How we use AI to build the platform and calculate CO₂.' },
    { href: '/legal/medicion', label: 'Calculation Methodology', descripcion: 'How we estimate avoided CO₂e immutably and verifiably.' },
  ]
}

export function LegalPageLayout({
  titulo,
  breadcrumbLabel,
  secciones,
  resumen,
  leeTabien,
  children,
  requiresAccept,
  transparenciaTexto,
  hideResumen = false,
  hideLeeTambien = false,
}: LegalPageLayoutProps) {
  const pathname = usePathname()
  const [lang, setLang] = useState<'ES' | 'ENG'>('ES')
  const [shuffledCards, setShuffledCards] = useState<LeeTabienItem[]>([])

  useEffect(() => {
    const checkIdioma = () => {
      const saved = localStorage.getItem('reuso_idioma')
      if (saved === 'ENG') setLang('ENG')
      else if (saved === 'ES') setLang('ES')
      else setLang(navigator.language.startsWith('es') ? 'ES' : 'ENG')
    }
    checkIdioma()
    window.addEventListener('reuso_idioma_change', checkIdioma)
    return () => window.removeEventListener('reuso_idioma_change', checkIdioma)
  }, [])

  useEffect(() => {
    const allPages = ALL_LEGAL_PAGES[lang] || ALL_LEGAL_PAGES.ES
    const currentPath = pathname.replace(/\/$/, '')
    const filtered = allPages.filter((page) => {
      const pagePath = page.href.replace(/\/$/, '')
      return pagePath !== currentPath && pagePath !== '/legal/confidencialidad-firma'
    })
    
    // Simple shuffle
    const shuffled = [...filtered].sort(() => Math.random() - 0.5)
    setShuffledCards(shuffled.slice(0, 3))
  }, [pathname, lang])

  const defaultFallback = (ALL_LEGAL_PAGES[lang] || ALL_LEGAL_PAGES.ES)
    .filter(p => p.href.replace(/\/$/, '') !== pathname.replace(/\/$/, '') && p.href.replace(/\/$/, '') !== '/legal/confidencialidad-firma')
    .slice(0, 3)

  const activeCards = shuffledCards.length > 0 ? shuffledCards : (leeTabien && leeTabien.length > 0 ? leeTabien.slice(0, 3) : defaultFallback)



  const todasSecciones: SeccionItem[] = [...secciones]
  if (transparenciaTexto !== null) {
    todasSecciones.push({ id: 'ia-transparencia', label: 'Transparencia' })
  }
  if (!hideResumen) {
    todasSecciones.push({ id: 'en-resumen', label: 'En resumen' })
  }

  return (
    <>
      {/* ── HEADER STICKY ─────────────────────────────────────────── */}
      <LegalHeader />

      {/* ── CONTENIDO + SIDEBAR ────────────────────────────────────── */}
      <div
        className="legal-outer"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 32px 80px',
          display: 'flex',
          gap: 56,
          alignItems: 'flex-start',
        }}
      >
        {/* ── COLUMNA PRINCIPAL ─────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Miga de pan — NO sticky */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 16,
              flexWrap: 'wrap',
              paddingTop: 32,
            }}
            aria-label="Ruta de navegación"
          >
            <Link href="/" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>
              Inicio
            </Link>
            <span style={{ opacity: 0.4 }}>/</span>
            <Link href="/legal" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>
              Legal
            </Link>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{breadcrumbLabel}</span>
          </nav>

          {/* Título STICKY — pegado debajo del header */}
          <div
            style={{
              position: 'sticky',
              top: 64,
              zIndex: 40,
              background: 'var(--bg-primary)',
              paddingTop: 12,
              paddingBottom: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: -24,
                left: 0,
                right: 0,
                height: 24,
                background: 'linear-gradient(to bottom, var(--bg-primary), transparent)',
                pointerEvents: 'none',
              }}
            />
            <h1
              className="legal-h1"
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {titulo}
            </h1>
          </div>

          {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────── */}
          <div
            style={{
              color: 'var(--text-primary)',
              lineHeight: 1.8,
            }}
          >
            {children}
          </div>

          {/* Aceptación opcional */}
          {requiresAccept && (
            <div style={{ marginTop: 40 }}>
              {requiresAccept}
            </div>
          )}

          {transparenciaTexto !== null && (
            <div
              id="ia-transparencia"
              style={{
                marginTop: 56,
                paddingTop: 32,
                borderTop: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(89,166,228,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Cpu size={16} color="#59A6E4" />
                </div>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#59A6E4',
                    margin: 0,
                  }}
                >
                  Transparencia
                </h2>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.75,
                  margin: 0,
                }}
              >
                {transparenciaTexto || (
                  <p style={{ margin: 0 }}>
                    Grupo MLP S.A.S. desarrolló la Calculadora de Reúso con asistencia de modelos de
                    inteligencia artificial. El cálculo de CO₂ evitado y el desarrollo del código
                    emplean herramientas de IA. Estos sistemas pueden producir errores o resultados
                    imprecisos. Trabajamos de forma continua para identificarlos y reducirlos.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── EN RESUMEN ─────────────────────────────────────────── */}
          {!hideResumen && resumen && (
            <div
              id="en-resumen"
              style={{
                marginTop: 32,
                padding: '20px 24px',
                borderRadius: 14,
                background: 'rgba(0,130,124,0.05)',
                border: '1px solid rgba(0,130,124,0.14)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-brand)',
                  marginBottom: 8,
                  margin: '0 0 8px',
                }}
              >
                En resumen
              </p>
              <p
                style={{
                  margin: 0,
                  lineHeight: 1.75,
                  fontSize: 14,
                  color: 'var(--text-primary)',
                }}
              >
                {resumen}
              </p>
            </div>
          )}

          {/* ── LEE TAMBIÉN ────────────────────────────────────────── */}
          {!hideLeeTambien && (
            <div
              style={{
                marginTop: 48,
                paddingTop: 32,
                borderTop: '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-secondary)',
                  marginBottom: 20,
                }}
              >
                Lee también
              </p>
              <div
                className="legal-lee-tambien-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 14,
                }}
              >
                {activeCards.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '16px 18px',
                      borderRadius: 14,
                      border: '1px solid rgba(0,130,124,0.14)',
                      background: 'var(--bg-card)',
                      textDecoration: 'none',
                      transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
                      gap: 4,
                    }}
                    className="lee-tambien-card"
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--color-brand)',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.descripcion && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.descripcion}
                      </span>
                    )}
                    <span
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: 'var(--color-brand)',
                        opacity: 0.6,
                        fontWeight: 600,
                      }}
                    >
                      Leer →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR DERECHO — menú de secciones ───────────────────── */}
        <div
          className="legal-sidebar"
          style={{
            position: 'sticky',
            top: 148,
            alignSelf: 'flex-start',
            marginTop: 148,
          }}
        >
          <LegalSubmenu secciones={todasSecciones} titulo="" />
        </div>
      </div>

      {/* ── BOTÓN SCROLL AL FINAL ─────────────────────────────────── */}
      <button
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
        title="Ir al final"
        style={{
          position: 'fixed',
          bottom: 28,
          left: 28,
          zIndex: 200,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,130,124,0.20)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--color-brand)',
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
        className="legal-scroll-bottom-btn"
      >
        <ArrowDown size={18} />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Anclas: offset para no quedar ocultas bajo header sticky + h1 sticky */
        [id] { scroll-margin-top: 168px; }

        /* Lee también */
        .lee-tambien-card:hover {
          box-shadow: 0 4px 20px rgba(0,130,124,0.12);
          transform: translateY(-2px);
          border-color: rgba(0,130,124,0.28) !important;
        }

        /* Botón scroll al final */
        .legal-scroll-bottom-btn:hover {
          box-shadow: 0 4px 16px rgba(0,130,124,0.20);
          transform: translateY(2px);
        }
        @media (max-width: 768px) {
          .legal-scroll-bottom-btn { display: none; }
        }

        /* ── RESPONSIVE ───────────────────────────────────────── */
        @media (max-width: 768px) {
          .legal-sidebar { display: none; }
          .legal-outer { padding: 0 16px 60px !important; }
          .legal-lee-tambien-grid { grid-template-columns: 1fr !important; }
          .legal-h1 { font-size: 22px !important; }
          .legal-trust-grid { grid-template-columns: 1fr !important; }
          .legal-cookie-table { font-size: 11px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .legal-outer { padding: 0 24px 80px !important; }
          .legal-lee-tambien-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}} />
    </>
  )
}

export const h2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginTop: 40,
  marginBottom: 12,
  color: 'var(--text-primary)',
}

export const p: React.CSSProperties = { marginBottom: 16, lineHeight: 1.85 }
