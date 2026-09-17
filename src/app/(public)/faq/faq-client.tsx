'use client'

import { useEffect, useState, useId } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronDown as CaretDown,
  ArrowLeft,
  Search,
  X,
  Copy,
  Check,
  Calculator,
} from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { CLUSTERS_FAQ, type PreguntaFAQ } from '@/lib/faq/preguntas-frecuentes'
import { WA_NUMBER } from '@/lib/constants/contacto'

interface ThemeTokens {
  primary: string
  primaryText: string
  pillBg: string
  pillBgHover: string
  pillText: string
  badgeBg: string
  badgeText: string
  cardOpenBorder: string
  cardOpenBg: string
  cardHoverBorder: string
  btnBg: string
  btnText: string
  dotBg: string
  glowShadow: string
}

interface ClusterTheme {
  name: string
  labelShort: string
  light: ThemeTokens
  dark: ThemeTokens
}

// Los 3 acentos vienen directo de la paleta real del sistema (skill
// design-system), a propósito ninguno verde/pistacho/menta/teal — nogal,
// azul info y ámbar warning son los únicos "colores de acento" del sistema
// que no leen como el verde de marca. Son constantes entre temas (no
// cambian de valor en modo noche, solo la opacidad de sus fondos tenues).
const CLUSTER_CONFIG: Record<string, ClusterTheme> = {
  'economia-circular': {
    name: 'Economía circular, huella ambiental y consultoría',
    labelShort: 'Economía circular',
    light: {
      primary: 'var(--color-nogal)',
      primaryText: 'var(--color-nogal)',
      pillBg: 'rgba(173, 124, 67, 0.08)',
      pillBgHover: 'rgba(173, 124, 67, 0.16)',
      pillText: 'var(--color-nogal)',
      badgeBg: 'rgba(173, 124, 67, 0.1)',
      badgeText: 'var(--color-nogal)',
      cardOpenBorder: 'rgba(173, 124, 67, 0.35)',
      cardOpenBg: 'var(--bg-card)',
      cardHoverBorder: 'rgba(173, 124, 67, 0.3)',
      btnBg: 'var(--color-nogal)',
      btnText: '#FFFFFF',
      dotBg: 'var(--color-nogal)',
      glowShadow: '0 8px 24px -6px rgba(173, 124, 67, 0.15)',
    },
    dark: {
      primary: 'var(--color-nogal)',
      primaryText: 'var(--color-nogal)',
      pillBg: 'rgba(173, 124, 67, 0.15)',
      pillBgHover: 'rgba(173, 124, 67, 0.25)',
      pillText: 'var(--color-nogal)',
      badgeBg: 'rgba(173, 124, 67, 0.18)',
      badgeText: 'var(--color-nogal)',
      cardOpenBorder: 'rgba(173, 124, 67, 0.45)',
      cardOpenBg: 'var(--bg-card)',
      cardHoverBorder: 'rgba(173, 124, 67, 0.35)',
      btnBg: 'var(--color-nogal)',
      btnText: '#FFFFFF',
      dotBg: 'var(--color-nogal)',
      glowShadow: '0 8px 24px -6px rgba(173, 124, 67, 0.25)',
    },
  },
  'huella-de-carbono': {
    name: 'Medición de huella de carbono y monitoreo digital',
    labelShort: 'Medición de huella de carbono',
    light: {
      primary: 'var(--color-info)',
      primaryText: 'var(--color-info-content)',
      pillBg: 'rgba(89, 166, 228, 0.08)',
      pillBgHover: 'rgba(89, 166, 228, 0.16)',
      pillText: 'var(--color-info-content)',
      badgeBg: 'rgba(89, 166, 228, 0.1)',
      badgeText: 'var(--color-info-content)',
      cardOpenBorder: 'rgba(89, 166, 228, 0.35)',
      cardOpenBg: 'var(--bg-card)',
      cardHoverBorder: 'rgba(89, 166, 228, 0.3)',
      btnBg: 'var(--color-info)',
      btnText: '#FFFFFF',
      dotBg: 'var(--color-info)',
      glowShadow: '0 8px 24px -6px rgba(89, 166, 228, 0.15)',
    },
    dark: {
      primary: 'var(--color-info)',
      primaryText: 'var(--color-info-content)',
      pillBg: 'rgba(89, 166, 228, 0.15)',
      pillBgHover: 'rgba(89, 166, 228, 0.25)',
      pillText: 'var(--color-info-content)',
      badgeBg: 'rgba(89, 166, 228, 0.18)',
      badgeText: 'var(--color-info-content)',
      cardOpenBorder: 'rgba(89, 166, 228, 0.45)',
      cardOpenBg: 'var(--bg-card)',
      cardHoverBorder: 'rgba(89, 166, 228, 0.35)',
      btnBg: 'var(--color-info)',
      btnText: '#FFFFFF',
      dotBg: 'var(--color-info)',
      glowShadow: '0 8px 24px -6px rgba(89, 166, 228, 0.25)',
    },
  },
  'certificaciones': {
    name: 'Certificaciones, finanzas y educación',
    labelShort: 'Certificaciones',
    light: {
      primary: 'var(--color-warning)',
      primaryText: 'var(--color-warning-content)',
      pillBg: 'rgba(246, 191, 62, 0.1)',
      pillBgHover: 'rgba(246, 191, 62, 0.18)',
      pillText: 'var(--color-warning-content)',
      badgeBg: 'rgba(246, 191, 62, 0.12)',
      badgeText: 'var(--color-warning-content)',
      cardOpenBorder: 'rgba(246, 191, 62, 0.4)',
      cardOpenBg: 'var(--bg-card)',
      cardHoverBorder: 'rgba(246, 191, 62, 0.35)',
      btnBg: 'var(--color-warning)',
      btnText: '#474747',
      dotBg: 'var(--color-warning)',
      glowShadow: '0 8px 24px -6px rgba(246, 191, 62, 0.2)',
    },
    dark: {
      primary: 'var(--color-warning)',
      primaryText: 'var(--color-warning-content)',
      pillBg: 'rgba(246, 191, 62, 0.15)',
      pillBgHover: 'rgba(246, 191, 62, 0.25)',
      pillText: 'var(--color-warning-content)',
      badgeBg: 'rgba(246, 191, 62, 0.18)',
      badgeText: 'var(--color-warning-content)',
      cardOpenBorder: 'rgba(246, 191, 62, 0.45)',
      cardOpenBg: 'var(--bg-card)',
      cardHoverBorder: 'rgba(246, 191, 62, 0.35)',
      btnBg: 'var(--color-warning)',
      btnText: '#474747',
      dotBg: 'var(--color-warning)',
      glowShadow: '0 8px 24px -6px rgba(246, 191, 62, 0.25)',
    },
  },
}

function getClusterTheme(slug: string, isDark: boolean): { theme: ClusterTheme; tokens: ThemeTokens } {
  const fallback = CLUSTER_CONFIG['economia-circular']
  const cluster = CLUSTER_CONFIG[slug] || fallback
  return {
    theme: cluster,
    tokens: isDark ? cluster.dark : cluster.light,
  }
}

interface FAQItemProps {
  item: PreguntaFAQ
  id: string
  clusterSlug: string
  isDark: boolean
  defaultOpen?: boolean
}

function FAQItem({ item, id, clusterSlug, isDark, defaultOpen = false }: FAQItemProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [copiado, setCopiado] = useState(false)
  const contentId = useId()
  const { tokens } = getClusterTheme(clusterSlug, isDark)

  const copiarEnlace = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/faq#${id}`
    navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <article
      id={id}
      style={{
        borderColor: open ? tokens.cardOpenBorder : undefined,
        boxShadow: open ? tokens.glowShadow : undefined,
      }}
      className={`scroll-mt-24 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
        open
          ? isDark
            ? 'bg-[var(--bg-secondary)]/40'
            : 'bg-white'
          : isDark
            ? 'border-white/10 bg-[var(--bg-secondary)]/20 hover:border-white/20 hover:bg-[var(--bg-secondary)]/30'
            : 'border-[var(--border)] bg-[var(--bg-card)]/80 hover:bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className="group w-full flex items-start justify-between gap-4 text-left p-4 sm:p-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
      >
        <div className="flex-1 min-w-0">
          {/* Pregunta H3 para semántica SEO limpia */}
          <h3
            style={{
              color: open ? tokens.primaryText : undefined,
            }}
            className={`text-sm sm:text-base font-bold leading-snug transition-colors duration-200 ${
              open
                ? ''
                : isDark
                  ? 'text-white'
                  : 'text-[#474747]'
            }`}
          >
            {item.q}
          </h3>
        </div>

        {/* Indicador flecha animado con color temático */}
        <div
          style={{
            background: open ? tokens.btnBg : tokens.badgeBg,
            color: open ? tokens.btnText : tokens.badgeText,
          }}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 mt-0.5 shadow-sm ${
            open ? 'rotate-180' : ''
          }`}
        >
          <CaretDown size={16} strokeWidth={2.5} />
        </div>
      </button>

      {/* Contenedor colapsable de respuesta */}
      {open && (
        <div id={contentId} className="px-4 sm:px-5 pb-5 pt-1 border-t border-[var(--border)]/50">
          <p className={`text-sm sm:text-base leading-relaxed font-normal pt-3 ${isDark ? 'text-white/90' : 'text-[#474747]/95'}`}>
            {item.a}
          </p>
          {/* Copiar enlace: solo al desplegar, chico, oculto en mobile. El
              texto "Copiar enlace" es un tooltip propio (no el title nativo
              del navegador, poco confiable) que aparece al pasar el cursor. */}
          <div className="relative hidden sm:inline-flex group/copy mt-3">
            <button
              type="button"
              onClick={copiarEnlace}
              style={{ color: copiado ? tokens.primaryText : undefined }}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                copiado
                  ? ''
                  : isDark
                    ? 'text-white/40 hover:text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {copiado ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
            </button>
            {!copiado && (
              <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-semibold opacity-0 transition-opacity duration-150 group-hover/copy:opacity-100"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow)' }}
              >
                Copiar enlace
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export function FaqClient() {
  const [isDark, setIsDark] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [clusterActivo, setClusterActivo] = useState<string>('todos')
  const [targetHash, setTargetHash] = useState<string>('')

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      if (hash) setTargetHash(hash)
    }
  }, [])

  const tp = isDark ? 'text-white' : 'text-[#474747]'
  const ts = isDark ? 'text-white/75' : 'text-[#474747]/75'

  // Filtrado reactivo de preguntas
  const clustersFiltrados = CLUSTERS_FAQ.map(cluster => {
    if (clusterActivo !== 'todos' && cluster.slug !== clusterActivo) {
      return null
    }

    const qTerm = busqueda.trim().toLowerCase()
    const itemsCoincidentes = qTerm
      ? cluster.items.filter(
          it =>
            it.q.toLowerCase().includes(qTerm) ||
            it.a.toLowerCase().includes(qTerm)
        )
      : cluster.items

    if (itemsCoincidentes.length === 0) return null

    return {
      ...cluster,
      items: itemsCoincidentes,
    }
  }).filter((c): c is NonNullable<typeof c> => c !== null)

  const totalPreguntas = CLUSTERS_FAQ.reduce((acc, c) => acc + c.items.length, 0)
  const preguntasEncontradas = clustersFiltrados.reduce((acc, c) => acc + c.items.length, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ── HEADER STICKY CON LOGO OFICIAL ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(16px)',
          background: isDark ? 'rgba(71,71,71,0.75)' : 'rgba(255,255,255,0.75)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,130,124,0.1)'}`,
        }}
        className="px-4 sm:px-6 py-3"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold ${tp} hover-pop transition-opacity hover:opacity-80`}
          >
            <ArrowLeft size={16} />
            <span className="hidden xs:inline">Inicio</span>
          </Link>

          {/* Logo oficial con medidas estándar requeridas */}
          <Link href="/" className="flex items-center justify-center flex-shrink-0 hover-pop">
            <Image
              src="/logo-completo.svg"
              alt="Calculadora de Reúso"
              width={140}
              height={39}
              priority
              className="h-[35px] sm:h-[39px] w-auto transition-all"
              style={{
                objectFit: 'contain',
                filter: isDark ? 'brightness(0) invert(1)' : 'none',
              }}
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/#planes"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--color-brand)] text-white hover-pop shadow-sm transition-transform active:scale-95"
            >
              <Calculator size={14} />
              Calcular impacto
            </Link>
          </div>
        </div>
      </header>

      {/* ── CUERPO PRINCIPAL (MOBILE FIRST + MULTICOLUMNA DESKTOP) ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-20">
        {/* Miga de pan semántica */}
        <nav aria-label="Miga de pan" className="mb-6 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
          <Link href="/" className="hover:text-[var(--color-brand)] transition-colors">Inicio</Link>
          <span className="opacity-40">/</span>
          <span className={`${tp} font-bold`}>Preguntas frecuentes</span>
        </nav>

        {/* H1 SEO y GEO centrado a dos renglones */}
        <h1 className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-[1.2] text-center max-w-4xl mx-auto ${tp}`}>
          Preguntas frecuentes sobre sostenibilidad,
          <br className="hidden sm:inline" /> huella de carbono y economía circular
        </h1>

        {/* Subtítulo centrado */}
        <p className={`text-sm sm:text-base lg:text-lg leading-relaxed mb-10 max-w-3xl font-medium text-center mx-auto ${ts}`}>
          Respuestas técnicas para empresas, diseñadores y talleres en Colombia sobre medición de impacto ambiental, cálculo de huella de carbono (CO₂e), mitigación hídrica, responsabilidad social y pasaportes digitales (DPP) con la Calculadora de Reúso.
        </p>

        {/* ── BARRA DE BÚSQUEDA Y FILTROS POR CATEGORÍA CON COLORES VIVOS (SIN SCROLL HORIZONTAL) ── */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 md:items-center justify-between border-t border-[var(--border)]/60 pt-6">
          {/* Píldoras de cluster con colores temáticos y salto natural flex-wrap */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setClusterActivo('todos')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                clusterActivo === 'todos'
                  ? isDark
                    ? 'bg-white text-[#474747]'
                    : 'bg-[#474747] text-white'
                  : isDark
                    ? 'bg-white/5 text-white/70 hover:bg-white/10'
                    : 'bg-[#474747]/5 text-[#474747] hover:bg-[#474747]/10'
              }`}
            >
              Todas ({totalPreguntas})
            </button>

            {CLUSTERS_FAQ.map(c => {
              const { theme, tokens } = getClusterTheme(c.slug, isDark)
              const activo = clusterActivo === c.slug
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setClusterActivo(c.slug)}
                  style={{
                    background: activo ? tokens.btnBg : tokens.pillBg,
                    color: activo ? tokens.btnText : tokens.pillText,
                    borderColor: activo ? tokens.btnBg : tokens.badgeBg,
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm hover:opacity-90"
                >
                  <span
                    style={{ background: activo ? tokens.btnText : tokens.dotBg }}
                    className="w-2 h-2 rounded-full flex-shrink-0"
                  />
                  <span>{theme.labelShort} ({c.items.length})</span>
                </button>
              )
            })}
          </div>

          {/* Buscador reactivo */}
          <div className="relative min-w-[240px] md:w-80 flex-shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por término o pregunta..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 outline-none focus:border-[var(--color-brand)] transition-colors"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Indicador de resultados de búsqueda si aplica */}
        {busqueda && (
          <div className="mb-6 flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
            <span>
              Mostrando <strong>{preguntasEncontradas}</strong> de {totalPreguntas} preguntas para &ldquo;{busqueda}&rdquo;
            </span>
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="font-semibold text-[var(--color-brand)] hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {/* ── LISTADO DE CLUSTERS Y PREGUNTAS (GRID DE 2 COLUMNAS EN ESCRITORIO) ── */}
        {clustersFiltrados.length === 0 ? (
          <div className="p-10 text-center rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/40 my-8">
            <p className={`text-base font-bold mb-2 ${tp}`}>No encontramos preguntas con ese criterio</p>
            <p className={`text-sm mb-4 ${ts}`}>Prueba con palabras como huella, pasaporte, carbono o pyme.</p>
            <button
              type="button"
              onClick={() => { setBusqueda(''); setClusterActivo('todos') }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--color-brand)] text-white hover-pop"
            >
              Ver todas las preguntas
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {clustersFiltrados.map(cluster => {
              const { tokens } = getClusterTheme(cluster.slug, isDark)
              return (
                <section key={cluster.slug} id={cluster.slug} className="scroll-mt-24">
                  {/* Encabezado de sección con acento cromático */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{ background: tokens.btnBg }}
                        className="w-2.5 h-6 rounded-full flex-shrink-0"
                      />
                      <h2 className={`text-lg sm:text-2xl font-black tracking-tight ${tp}`}>
                        {cluster.cluster}
                      </h2>
                    </div>
                    <span
                      style={{
                        background: tokens.badgeBg,
                        color: tokens.badgeText,
                      }}
                      className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm"
                    >
                      <span
                        style={{ background: tokens.dotBg }}
                        className="w-1.5 h-1.5 rounded-full"
                      />
                      {cluster.items.length} {cluster.items.length === 1 ? 'pregunta' : 'preguntas'}
                    </span>
                  </div>

                  {/* Multicolumna en escritorio: 1 columna en móvil, 2 en pantallas grandes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {cluster.items.map((item, i) => {
                      const itemId = `${cluster.slug}-${i}`
                      const isTarget = targetHash === itemId
                      return (
                        <FAQItem
                          key={itemId}
                          id={itemId}
                          clusterSlug={cluster.slug}
                          item={item}
                          isDark={isDark}
                          defaultOpen={isTarget}
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {/* ── BANNER DE CONVERSIÓN FINAL Y CONTACTO ── */}
        <div
          className={`mt-16 sm:mt-20 p-6 sm:p-10 rounded-3xl border text-center relative overflow-hidden ${
            isDark
              ? 'border-[#D6F391]/20 bg-gradient-to-b from-[var(--bg-secondary)]/40 to-[var(--bg-secondary)]/10'
              : 'border-[#00827C]/20 bg-gradient-to-b from-[#00827C]/5 to-transparent'
          }`}
        >
          <h2 className={`text-xl sm:text-3xl font-black mb-2.5 ${tp}`}>
            ¿Tienes un proyecto en marcha y necesitas medir tu impacto?
          </h2>
          <p className={`text-sm sm:text-base max-w-2xl mx-auto mb-6 ${ts}`}>
            Genera tu primer cálculo técnico de huella de carbono y agua preservada en menos de 3 minutos, o conversa con nuestro equipo para asesoría en pasaportes digitales.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[var(--color-brand)] text-white hover-pop shadow-md"
            >
              <Calculator size={16} />
              Calcular impacto gratis
            </Link>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=Hola,%20tengo%20una%20consulta%20sobre%20la%20Calculadora%20de%20Reúso`}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold border border-[var(--border)] bg-[var(--bg-card)] hover-pop ${tp}`}
            >
              <WhatsappLogo size={18} />
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

