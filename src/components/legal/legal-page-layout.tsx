import Link from 'next/link'
import Image from 'next/image'
import { X, Question, Cpu } from '@/components/ui/icons'
import { LegalSubmenu } from '@/components/legal-submenu'

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
}

export function LegalPageLayout({
  titulo,
  breadcrumbLabel,
  secciones,
  resumen,
  leeTabien,
  children,
  requiresAccept,
}: LegalPageLayoutProps) {
  const todasSecciones: SeccionItem[] = [
    ...secciones,
    { id: 'ia-transparencia', label: 'Transparencia' },
    { id: 'en-resumen', label: 'En resumen' },
  ]

  return (
    <>
      {/* ── HEADER STICKY ─────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          padding: '0 32px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Izquierda: cerrar → home con tooltip */}
        <Link
          href="/"
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 10,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'background 0.2s, color 0.2s',
            flexShrink: 0,
          }}
          className="legal-header-btn legal-header-btn--left"
        >
          <X size={18} />
          <span className="legal-tooltip legal-tooltip--right">Volver al inicio</span>
        </Link>

        {/* Centro: logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image
            src="/logo-completo.svg"
            alt="Calculadora de Reúso"
            width={140}
            height={40}
            priority
            style={{ objectFit: 'contain' }}
          />
        </Link>

        {/* Derecha: ayuda → /legal/dudas con tooltip */}
        <Link
          href="/legal/dudas"
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 10,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'background 0.2s, color 0.2s',
            flexShrink: 0,
          }}
          className="legal-header-btn legal-header-btn--right"
        >
          <Question size={18} />
          <span className="legal-tooltip legal-tooltip--left">Tengo una duda</span>
        </Link>
      </header>

      {/* ── CONTENIDO + SIDEBAR ────────────────────────────────────── */}
      <div
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
              Legales
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
            <h1
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

          {/* ── SECCIÓN: Transparencia IA ──────────────────────────── */}
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
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                margin: 0,
              }}
            >
              Grupo MLP S.A.S. desarrolló la Calculadora de Reúso con asistencia de modelos de
              inteligencia artificial. El cálculo de CO₂ evitado y el desarrollo del código
              emplean herramientas de IA. Estos sistemas pueden producir errores o resultados
              imprecisos. Trabajamos de forma continua para identificarlos y reducirlos.
            </p>
          </div>

          {/* ── EN RESUMEN ─────────────────────────────────────────── */}
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

          {/* ── LEE TAMBIÉN ────────────────────────────────────────── */}
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
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
              }}
            >
              {leeTabien.map((item) => (
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

      <style>{`
        /* Tooltips custom en botones del header */
        .legal-tooltip {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: var(--bg-primary);
          color: var(--color-brand);
          border: 1px solid var(--border);
          box-shadow: 0 2px 8px rgba(0,130,124,0.10);
          font-size: 11px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease;
          z-index: 100;
        }
        .legal-tooltip--right { left: calc(100% + 10px); }
        .legal-tooltip--left  { right: calc(100% + 10px); }

        .legal-header-btn:hover .legal-tooltip { opacity: 1; }
        .legal-header-btn:hover {
          background: var(--bg-hover) !important;
          color: var(--color-brand) !important;
        }

        /* Anclas: offset para no quedar ocultas bajo header sticky + h1 sticky */
        [id] { scroll-margin-top: 168px; }

        /* Lee también */
        .lee-tambien-card:hover {
          box-shadow: 0 4px 20px rgba(0,130,124,0.12);
          transform: translateY(-2px);
          border-color: rgba(0,130,124,0.28) !important;
        }

        /* Sidebar responsivo */
        @media (max-width: 768px) {
          .legal-sidebar { display: none; }
        }
      `}</style>
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
