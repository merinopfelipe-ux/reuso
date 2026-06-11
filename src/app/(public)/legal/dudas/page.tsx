'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalHeader } from '@/components/legal/legal-header'
import { DudasForm } from './dudas-form'

const T = {
  ES: {
    inicio: 'Inicio',
    legal: 'Legal',
    breadcrumb: 'Duda legal',
    titulo: 'Tengo una duda legal',
    descripcion:
      'Escríbenos con tu consulta o comentario. El equipo de Grupo MLP S.A.S. responde en un plazo máximo de 10 días hábiles.',
    leeTabien: 'Lee también',
    links: [
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
      { href: '/legal/reglamento', label: 'Reglamento de Uso' },
      { href: '/legal/confidencialidad', label: 'Confidencialidad' },
    ],
  },
  ENG: {
    inicio: 'Home',
    legal: 'Legal',
    breadcrumb: 'Legal enquiry',
    titulo: 'I have a legal question',
    descripcion:
      'Send us your query or comment. The Grupo MLP S.A.S. team responds within a maximum of 10 business days.',
    leeTabien: 'See also',
    links: [
      { href: '/legal/terminos', label: 'Terms & Conditions' },
      { href: '/legal/reglamento', label: 'Terms of Use' },
      { href: '/legal/confidencialidad', label: 'Confidentiality' },
    ],
  },
}

export default function DudasPage() {
  const [lang, setLang] = useState<'ES' | 'ENG'>('ES')

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

  const t = T[lang]

  return (
    <>
      {/* Header sticky — igual al de las demás páginas legales */}
      <LegalHeader />

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
            {t.inicio}
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <Link href="/legal" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>
            {t.legal}
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.breadcrumb}</span>
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
          {t.titulo}
        </h1>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          {t.descripcion}
        </p>

        <DudasForm lang={lang} />

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
              
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
              marginBottom: 14,
            }}
          >
            {t.leeTabien}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {t.links.map((item) => (
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

    </>
  )
}
