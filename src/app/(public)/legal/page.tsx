import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { FileText, Shield, Database, Cookie, Lock, ChartBar, ChatCircle, X, Question } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'Documentos Legales',
  description: 'Repositorio de todos los documentos legales de la Calculadora de Reúso.',
  robots: { index: false, follow: false },
}

const DOCUMENTOS = [
  {
    href: '/legal/terminos',
    icono: FileText,
    titulo: 'Términos y Condiciones',
    descripcion: 'Reglas de uso de la plataforma, derechos y obligaciones de ambas partes.',
  },
  {
    href: '/legal/privacidad',
    icono: Shield,
    titulo: 'Política de Privacidad',
    descripcion: 'Cómo protegemos y tratamos la información de los usuarios.',
  },
  {
    href: '/legal/datos',
    icono: Database,
    titulo: 'Tratamiento de Datos',
    descripcion: 'Política de tratamiento de datos personales conforme a la Ley 1581 de 2012.',
  },
  {
    href: '/legal/cookies',
    icono: Cookie,
    titulo: 'Política de Cookies',
    descripcion: 'Qué cookies usamos, para qué y cómo puedes gestionarlas.',
  },
  {
    href: '/legal/reglamento',
    icono: ChartBar,
    titulo: 'Reglamento de Uso',
    descripcion: 'Condiciones técnicas de la calculadora, cálculos y certificados.',
  },
  {
    href: '/legal/confidencialidad',
    icono: Lock,
    titulo: 'Acuerdo de Confidencialidad',
    descripcion: 'Compromiso de no replicar ni extraer información de la plataforma.',
  },
]

export default function LegalIndexPage() {
  return (
    <>
      {/* Header sticky — igual al de las páginas legales */}
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

      {/* Contenido */}
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '40px 32px 80px',
          color: 'var(--text-primary)',
        }}
      >
        {/* Breadcrumb */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 32,
          }}
        >
          <Link
            href="/"
            style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}
          >
            Inicio
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Legales</span>
        </nav>

        {/* Título */}
        <div style={{ marginBottom: 48 }}>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 700,
              marginBottom: 12,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            Documentos legales
          </h1>
          <p
            style={{
              fontSize: 16,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: 580,
              margin: 0,
            }}
          >
            Aquí encuentras toda la documentación legal de la Calculadora de Reúso. El marco
            principal es el derecho colombiano. También consideramos la normativa internacional
            para usuarios de otros países.
          </p>
        </div>

        {/* Grid de documentos */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          {DOCUMENTOS.map((doc) => {
            const Icono = doc.icono
            const esDuda = doc.href === '/legal/dudas'
            return (
              <Link
                key={doc.href}
                href={doc.href}
                style={{
                  display: 'block',
                  padding: '24px 24px 20px',
                  borderRadius: 16,
                  border: esDuda
                    ? '1.5px dashed rgba(0,130,124,0.30)'
                    : '1px solid rgba(0,130,124,0.12)',
                  background: esDuda ? 'rgba(0,130,124,0.02)' : 'var(--bg-card)',
                  textDecoration: 'none',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                className="legal-card"
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(0,130,124,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icono size={20} color="var(--color-brand)" />
                </div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                    lineHeight: 1.3,
                  }}
                >
                  {doc.titulo}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {doc.descripcion}
                </p>
              </Link>
            )
          })}
        </div>

        {/* Módulo de cierre — siempre al fondo, sin importar cuántas cards haya */}
        <Link
          href="/legal/dudas"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginTop: 40,
            padding: '24px 28px',
            borderRadius: 16,
            border: '1.5px dashed rgba(0,130,124,0.30)',
            background: 'rgba(0,130,124,0.02)',
            textDecoration: 'none',
            transition: 'box-shadow 0.2s, background 0.2s',
          }}
          className="legal-duda-module"
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(0,130,124,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChatCircle size={22} color="var(--color-brand)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Tengo una duda legal
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Escríbenos directamente. El equipo de Grupo MLP S.A.S. responde en un plazo máximo
              de 10 días hábiles.
            </p>
          </div>
          <span style={{ fontSize: 20, color: 'var(--color-brand)', opacity: 0.5, flexShrink: 0 }}>→</span>
        </Link>
      </div>

      <style>{`
        .legal-header-btn:hover {
          background: var(--bg-hover) !important;
          color: var(--color-brand) !important;
        }
        .legal-tooltip {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: var(--text-primary);
          color: #fff;
          font-size: 11px;
          font-weight: 500;
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
        .legal-card:hover {
          box-shadow: 0 4px 20px rgba(0,130,124,0.12);
          transform: translateY(-2px);
        }
        .legal-duda-module:hover {
          background: rgba(0,130,124,0.05) !important;
          box-shadow: 0 4px 20px rgba(0,130,124,0.10);
        }
      `}</style>
    </>
  )
}
