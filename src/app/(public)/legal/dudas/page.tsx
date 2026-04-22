import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { X } from '@/components/ui/icons'
import { DudasForm } from './dudas-form'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Tengo una duda legal',
  description: 'Envía tu consulta o comentario legal al equipo de Grupo MLP S.A.S.',
}

export default function DudasPage() {
  return (
    <>
      {/* Header sticky — igual al de las demás páginas legales */}
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

        {/* Espacio derecho (simétrico) */}
        <div style={{ width: 36 }} />
      </header>

      {/* Contenido */}
      <div
        style={{
          maxWidth: 680,
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
            marginBottom: 28,
          }}
        >
          <Link href="/" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>
            Inicio
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <Link href="/legal" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>
            Legales
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Duda legal</span>
        </nav>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}
        >
          Tengo una duda legal
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          Escríbenos con tu consulta o comentario. El equipo de Grupo MLP S.A.S. responde en
          un plazo máximo de 10 días hábiles.
        </p>

        <DudasForm />

        {/* Lee también */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 28,
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
              marginBottom: 14,
            }}
          >
            Lee también
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { href: '/legal/terminos', label: 'Términos y Condiciones' },
              { href: '/legal/reglamento', label: 'Reglamento de Uso' },
              { href: '/legal/confidencialidad', label: 'Confidencialidad' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: 100,
                  border: '1px solid rgba(0,130,124,0.20)',
                  color: 'var(--color-brand)',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  background: 'rgba(0,130,124,0.04)',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
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
        .legal-header-btn:hover .legal-tooltip { opacity: 1; }
      `}</style>
    </>
  )
}
