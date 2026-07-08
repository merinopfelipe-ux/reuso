'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalHeader } from '@/components/legal/legal-header'
import { FileTextIcon as FileText, ShieldIcon as Shield, DatabaseIcon as Database, CookieIcon as Cookie, LockIcon as Lock, ScaleIcon as Scale, MessageSquare as ChatCircle } from '@animateicons/react/lucide'
import { IaIcon } from '@/components/ui/icons'

const T = {
  ES: {
    titulo: 'Documentos legales',
    subtitulo: 'Toda la documentación legal de la Calculadora de Reúso. Diseñada para cumplir con el RGPD (Europa), la CCPA (EE. UU.) y la Ley 1581 (Colombia).',
    inicio: 'Inicio',
    duda: 'Tengo una duda legal',
    dudaDesc: 'Escríbenos directamente. El equipo de Grupo MLP S.A.S. responde en un máximo de 10 días hábiles.',
    docs: [
      { href: '/legal/terminos', titulo: 'Términos y Condiciones', descripcion: 'Reglas de uso de la plataforma, derechos y obligaciones de ambas partes.' },
      { href: '/legal/privacidad', titulo: 'Política de Privacidad', descripcion: 'Cómo protegemos y tratamos la información de los usuarios.' },
      { href: '/legal/datos', titulo: 'Tratamiento de Datos', descripcion: 'Política de tratamiento de datos personales (Ley 1581 de 2012).' },
      { href: '/legal/cookies', titulo: 'Política de Cookies', descripcion: 'Qué cookies usamos, para qué y cómo puedes gestionarlas.' },
      { href: '/legal/reglamento', titulo: 'Reglamento de Uso', descripcion: 'Condiciones y políticas de uso de los certificados e informes.' },
      { href: '/legal/confidencialidad', titulo: 'Acuerdo de Confidencialidad', descripcion: 'Garantía de confidencialidad para usuarios y empresas registradas.' },
      { href: '/legal/ia', titulo: 'Uso de Inteligencia Artificial', descripcion: 'Cómo usamos inteligencia artificial para optimizar el reúso y procesar datos.' },
    ],
  },
  ENG: {
    titulo: 'Legal Documents',
    subtitulo: 'All legal documentation of the Calculadora de Reúso. Compliant with GDPR (Europe), CCPA (US), and Law 1581 (Colombia).',
    inicio: 'Home',
    duda: 'Legal inquiries',
    dudaDesc: 'Write to us directly. The Grupo MLP S.A.S. team will reply within 10 business days.',
    docs: [
      { href: '/legal/terminos', titulo: 'Terms and Conditions', descripcion: 'Platform usage rules, rights and obligations of both parties.' },
      { href: '/legal/privacidad', titulo: 'Privacy Policy', descripcion: 'How we protect and process user information.' },
      { href: '/legal/datos', titulo: 'Data Processing', descripcion: 'Personal data processing policy (Law 1581 of 2012).' },
      { href: '/legal/cookies', titulo: 'Cookie Policy', descripcion: 'What cookies we use, why, and how you can manage them.' },
      { href: '/legal/reglamento', titulo: 'Usage Regulations', descripcion: 'Terms and policies for certificates and reports usage.' },
      { href: '/legal/confidencialidad', titulo: 'Confidentiality Agreement', descripcion: 'Confidentiality guarantee for registered users and companies.' },
      { href: '/legal/ia', titulo: 'Artificial Intelligence Use', descripcion: 'How we use artificial intelligence to optimize reuse and process data.' },
    ],
  },
}

const ICONOS: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
  '/legal/terminos': FileText,
  '/legal/privacidad': Shield,
  '/legal/datos': Database,
  '/legal/cookies': Cookie,
  '/legal/reglamento': Scale,
  '/legal/confidencialidad': Lock,
  '/legal/ia': IaIcon,
}

export default function LegalIndexPage() {
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
      <LegalHeader />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px', color: 'var(--text-primary)' }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 500 }}>{t.inicio}</Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Legal</span>
        </nav>

        {/* Título */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {t.titulo}
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 580, margin: 0 }}>
            {t.subtitulo}
          </p>
        </div>

        {/* Grid de documentos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {t.docs.map((doc) => {
            const Icono = ICONOS[doc.href] ?? FileText
            const esIA = doc.href === '/legal/ia'
            return (
              <Link
                key={doc.href}
                href={doc.href}
                style={{
                  display: esIA ? 'flex' : 'block',
                  gridColumn: esIA ? '1 / -1' : undefined,
                  alignItems: esIA ? 'center' : undefined,
                  gap: esIA ? 20 : undefined,
                  padding: '24px 24px 20px',
                  borderRadius: 16,
                  border: esIA
                    ? '1px solid rgba(89,166,228,0.20)'
                    : '1px solid rgba(0,130,124,0.12)',
                  background: esIA
                    ? 'rgba(89,166,228,0.04)'
                    : 'var(--bg-card)',
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
                    flexShrink: 0,
                    background: esIA
                      ? 'rgba(89,166,228,0.12)'
                      : 'rgba(0,130,124,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: esIA ? 0 : 16,
                  }}
                >
                  <Icono size={20} color={esIA ? '#59A6E4' : 'var(--color-brand)'} />
                </div>
                <div style={{ flex: esIA ? 1 : undefined }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                    {doc.titulo}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {doc.descripcion}
                  </p>
                </div>
                {esIA && (
                  <span style={{ fontSize: 18, color: '#59A6E4', opacity: 0.5, flexShrink: 0 }}>→</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Módulo: Tengo una duda */}
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
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,130,124,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChatCircle size={22} color="var(--color-brand)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{t.duda}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.dudaDesc}</p>
          </div>
          <span style={{ fontSize: 20, color: 'var(--color-brand)', opacity: 0.5, flexShrink: 0 }}>→</span>
        </Link>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .legal-card:hover {
          box-shadow: 0 4px 20px rgba(0,130,124,0.12);
          transform: translateY(-2px);
        }
        .legal-duda-module:hover {
          background: rgba(0,130,124,0.05) !important;
          box-shadow: 0 4px 20px rgba(0,130,124,0.10);
        }
      `}} />
    </>
  )
}
