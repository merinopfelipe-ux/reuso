'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  TreeDeciduous as Tree,
  Globe,
  Medal,
  Users,
  Calculator,
  Leaf,
  ArrowRight,
  Check,
  ChevronDown as CaretDown,
  FlaskConical as Flask,
  ShieldCheck,
  Target,
  RefreshCw as ArrowsClockwise,
} from 'lucide-react'
import { PLANS, CURRENCIES, ANNUAL_DISCOUNT } from '@/lib/constants/pricing'
import { LandingHeader } from '@/components/landing-header'

// ─── Datos de categorías ─────────────────────────────────────────────────────
const CATEGORIAS = {
  textil: {
    id: 'textil',
    label: 'Textil',
    icon: ArrowsClockwise,
    h3: 'Fibras y materiales textiles',
    ejemplo: '500 kg de tela recuperada',
    desc: 'Retales, rollos y remanentes industriales con alto valor ambiental. El diagnóstico revela el costo oculto de cada kilogramo de fibra que no reingresa al ciclo productivo.',
    planeta: { valor: '8.200 L', detalle: 'agua ahorrada · 18 kg CO₂ evitados por kg' },
    bolsillo: { valor: '45%', detalle: 'menos en costo de materia prima' },
  },
  indumentaria: {
    id: 'indumentaria',
    label: 'Indumentaria',
    icon: Target,
    h3: 'Prendas y confección',
    ejemplo: '200 prendas recuperadas',
    desc: 'Prendas de segunda mano, devoluciones y excedentes de colección. El diagnóstico circular expone cuánto valor se descarta en cada prenda que no regresa al flujo.',
    planeta: { valor: '7.500 L', detalle: 'agua ahorrada · 12 kg CO₂ evitados por prenda' },
    bolsillo: { valor: '40%', detalle: 'menos en costos de reposición' },
  },
  mobiliario: {
    id: 'mobiliario',
    label: 'Mobiliario',
    icon: Flask,
    h3: 'Mobiliario y equipamiento',
    ejemplo: '50 sillas restauradas',
    desc: 'Escritorios, sillas y accesorios de interior. El diagnóstico identifica activos desechados con ciclo de vida activo, traduciendo cada pieza a su costo ambiental y de reposición evitado.',
    planeta: { valor: '15', detalle: 'árboles no talados · 85 kg CO₂ evitados' },
    bolsillo: { valor: '32%', detalle: 'menos en presupuesto de equipamiento' },
  },
} as const

type CatKey = keyof typeof CATEGORIAS

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: '¿Qué es la economía circular y cómo reduce costos operativos?',
    a: 'La economía circular es un modelo donde los productos se reutilizan, reparan o reacondicionan en lugar de desecharse. El diagnóstico circular revela los costos ocultos de ese descarte: reposición, huella hídrica e impuestos por emisiones. Las organizaciones que lo implementan reducen costos de reposición hasta un 40%.',
  },
  {
    q: '¿Cómo se calcula el CO₂ evitado al reutilizar un producto?',
    a: 'Usamos factores de emisión del IPCC y bases de datos internacionales como ecoinvent y DEFRA para estimar el CO₂ que se habría emitido fabricando un producto nuevo, comparado con reutilizar el existente. Cada cálculo queda registrado con hash criptográfico para trazabilidad.',
  },
  {
    q: '¿El diagnóstico circular sirve para informes ESG?',
    a: 'Nuestros diagnósticos incluyen código QR verificable y metodología basada en estándares GHG Protocol. Son una fuente de datos válida para informes ESG, licitaciones públicas y comunicación a clientes e inversores - sin afirmar que el diagnóstico en sí es una certificación ambiental.',
  },
]

// ─── FAQItem ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, isDark }: { q: string; a: string; isDark: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border-b py-5 ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 text-left">
        <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#474747]'}`}>{q}</span>
        <CaretDown
          size={18}
          className={`flex-shrink-0 transition-transform duration-300 ${isDark ? 'text-white/50' : 'text-[#474747]/50'}`}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? 300 : 0, opacity: open ? 1 : 0 }}>
        <p className={`text-sm leading-relaxed mt-4 font-medium ${isDark ? 'text-white/70' : 'text-[#474747]/70'}`}>{a}</p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Landing2Page() {
  const [mounted, setMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CatKey>('textil')
  const [currency, setCurrency] = useState<keyof typeof CURRENCIES>('COP')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [isDark, setIsDark] = useState(false)


  // Refs de movimiento (sin re-renders)
  const mouseXRef = useRef(0)
  const mouseYRef = useRef(0)
  const scrollYRef = useRef(0)

  useEffect(() => {
    setMounted(true)

    // Tema persistido
    const stored = localStorage.getItem('reuso-theme')
    if (stored) {
      setIsDark(stored === 'dark')
      if (stored === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
    }

    // Listeners pasivos
    const handleScroll = () => { scrollYRef.current = window.scrollY }
    const handleMouse = (e: MouseEvent) => {
      mouseXRef.current = e.clientX - window.innerWidth / 2
      mouseYRef.current = e.clientY - window.innerHeight / 2
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouse, { passive: true })

    // rAF + lerp para blobs (cero re-renders de React)
    let smoothX = 0, smoothY = 0
    let rafId: number
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const tick = () => {
      smoothX = lerp(smoothX, mouseXRef.current, 0.1)
      smoothY = lerp(smoothY, mouseYRef.current, 0.1)
      const sy = scrollYRef.current
      document.querySelectorAll<HTMLElement>('[data-blob]').forEach(el => {
        const mx = parseFloat(el.dataset.mx ?? '0')
        const my = parseFloat(el.dataset.my ?? '0')
        const ms = parseFloat(el.dataset.ms ?? '0')
        el.style.transform = `translate(${smoothX * mx}px, ${smoothY * my + sy * ms}px)`
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouse)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // IntersectionObserver para reveal al scroll
  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.setAttribute('data-revealed', ''); observer.unobserve(entry.target) }
      }),
      { rootMargin: '-60px 0px', threshold: 0.05 }
    )
    document.querySelectorAll('section[id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [mounted])

  const menuGroups = [
    {
      name: 'Producto',
      items: [
        { name: 'Por qué reutilizar', link: '#comparativa' },
        { name: 'Cómo funciona', link: '#proceso' },
        { name: 'Preguntas frecuentes', link: '#faq' },
      ]
    },
    {
      name: 'Industrias',
      items: [
        { name: 'Sistema Moda', link: '#categorias' },
        { name: 'Retail Textil', link: '#categorias' },
        { name: 'Marcas Circulares', link: '#categorias' },
      ]
    },
    {
      name: 'Planes',
      items: [
        { name: 'Suscripciones', link: '#planes' },
        { name: 'Cotización a medida', link: '#planes' },
      ]
    }
  ]

  const searchResults = [
    { title: 'Por qué reutilizar', link: '#comparativa' },
    { title: 'Industrias del Sistema Moda', link: '#categorias' },
    { title: 'Cómo funciona el diagnóstico', link: '#proceso' },
    { title: 'Planes', link: '#planes' },
    { title: 'Preguntas frecuentes', link: '#faq' },
  ]

  const liquidGlass = isDark
    ? 'bg-[#474747]/35 backdrop-blur-[60px] saturate-[200%] border border-white/10 shadow-2xl'
    : 'bg-white/35 backdrop-blur-[60px] saturate-[180%] border border-[#00827C]/10 shadow-[0_12px_40px_rgba(0,130,124,0.06),inset_0_2px_4px_rgba(255,255,255,0.4)]'

  const formatPrice = (plan: typeof PLANS[0]) => {
    if (plan.priceMonthlyCOP === 0) return 'Gratis'
    const c = CURRENCIES[currency]
    const amount = billing === 'monthly'
      ? plan.priceMonthlyCOP * c.rate
      : plan.priceMonthlyCOP * c.rate * ANNUAL_DISCOUNT
    return `${c.symbol}${c.format(amount)}`
  }

  const cat = CATEGORIAS[activeCategory]
  const tp = isDark ? 'text-white' : 'text-[#474747]'
  const ts = isDark ? 'text-white/70' : 'text-[#474747]/70'

  if (!mounted) return null

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'bg-[#474747] text-white' : 'bg-white text-[#474747]'}`}
      style={{ overflowX: 'clip' }}
    >
      {/* ESTILOS GLOBALES */}
      <style jsx global>{`
        html { scroll-behavior: smooth; scroll-padding-top: 96px; }
        section[id] {
          opacity: 0; transform: translateY(30px); filter: blur(8px);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1),
                      transform 0.8s cubic-bezier(0.22,1,0.36,1),
                      filter 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        section[id][data-revealed] { opacity: 1; transform: translateY(0); filter: blur(0); }
        @keyframes glassStatIn {
          from { opacity: 0; transform: translateY(18px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        @keyframes glassGlow {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50%      { text-shadow: 0 0 24px rgba(138,208,178,0.5), 0 0 48px rgba(89,166,228,0.2); }
        }
        @keyframes glassPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes revealCard {
          from { opacity: 0; transform: translateY(24px); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        .glass-stat  { animation: glassStatIn 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .glass-stat:nth-child(1) { animation-delay: 0.10s; }
        .glass-stat:nth-child(2) { animation-delay: 0.20s; }
        .glass-stat:nth-child(3) { animation-delay: 0.30s; }
        .glass-number   { animation: glassGlow 3s ease-in-out infinite; }
        .glass-subtitle { animation: glassPulse 3s ease-in-out infinite; }
        .reveal-card { animation: revealCard 0.6s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <LandingHeader
        menuGroups={menuGroups}
        searchResults={searchResults}
        extraActions={
          <>
            <Link href="/login" className={`hidden sm:inline-flex px-4 py-2 rounded-full border text-sm font-bold transition-all ${isDark ? 'border-[#D6F391]/20 text-white hover:bg-[#D6F391]/5' : 'border-[#00827C]/20 text-[#474747] hover:bg-[#00827C]/5'}`}>
              Entrar
            </Link>
            <Link href="/registro" className="px-4 sm:px-5 py-2 rounded-full bg-[#00827C] text-white text-sm font-bold hover:bg-[#006B66] transition-all shadow-[0_4px_16px_rgba(0,130,124,0.25)] whitespace-nowrap">
              Empezar gratis
            </Link>
          </>
        }
      />

      {/* ── SECCIÓN 1 - HERO ──────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Texto izquierdo */}
          <div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold text-[#00827C] mb-8 ${isDark ? 'bg-[#D6F391]/10 border-[#D6F391]/25' : 'bg-[#00827C]/8 border-[#00827C]/15'}`}>
              <Leaf size={13} /> Economía circular con datos reales
            </div>
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6 ${tp}`}>
              Calcula el ahorro exacto de extender la vida útil de tus productos.
            </h1>
            <p className={`text-lg font-medium leading-relaxed mb-10 max-w-lg ${ts}`}>
              Mide Verde. Cuantifica la reducción de CO₂, el ahorro de agua y el impacto económico de reutilizar en el Sistema Moda y más allá. Evita el lavado de imagen verde con datos reales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#planes" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#00827C] text-white font-bold text-base hover:bg-[#006B66] transition-all shadow-[0_8px_32px_rgba(0,130,124,0.3)] hover:shadow-[0_12px_40px_rgba(0,130,124,0.4)] hover:-translate-y-0.5">
                Iniciar mi primer diagnóstico <ArrowRight size={18} strokeWidth={2.5} />
              </a>
              <a href="#proceso" className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border font-bold text-base transition-all ${isDark ? 'border-[#D6F391]/20 text-[#D6F391] hover:bg-[#D6F391]/5' : 'border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/5'}`}>
                Ver cómo funciona
              </a>
            </div>
          </div>

          {/* Panel Liquid Glass */}
          <div className={`relative p-8 rounded-[2.5rem] overflow-hidden ${liquidGlass}`}>
            <div data-blob data-mx="0.08" data-my="0.07" data-ms="0.02"
              className="absolute -top-16 -right-16 w-64 h-64 bg-[#59A6E4]/35 blur-[80px] rounded-full pointer-events-none"
              style={{ willChange: 'transform' }} />
            <div data-blob data-mx="-0.06" data-my="-0.06" data-ms="-0.01"
              className="absolute -bottom-16 -left-16 w-56 h-56 bg-[#8AD0B2]/35 blur-[70px] rounded-full pointer-events-none"
              style={{ willChange: 'transform' }} />

            <div className="relative z-10 flex items-center justify-between mb-8">
              <div>
                <p className="text-[10px] font-black text-[#00827C] mb-0.5">Panel de Impacto</p>
                <p className={`text-xs font-medium ${ts}`}>Último lote registrado · Hoy</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#D6F391] flex items-center justify-center">
                <Leaf size={16} className="text-[#474747]" />
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-4">
              {[
                { label: 'CO₂ Evitado', value: '847', unit: 'kg evitados' },
                { label: 'Agua', value: '12.5K', unit: 'litros ahorrados' },
                { label: 'Ahorro', value: '+38%', unit: 'vs. compra nueva' },
              ].map((stat, i) => (
                <div key={i} className={`glass-stat flex flex-col gap-1.5 p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/8' : 'bg-white/30 border-[#00827C]/8'}`}>
                  <span className="text-[9px] font-black text-[#00827C]">{stat.label}</span>
                  <span className={`glass-number text-3xl font-black leading-none ${tp}`}>{stat.value}</span>
                  <span className={`text-[10px] font-medium ${ts}`}>{stat.unit}</span>
                </div>
              ))}
            </div>

            <div className={`relative z-10 mt-6 p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/8' : 'bg-white/20 border-[#00827C]/8'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] font-bold ${ts}`}>Progreso circular del mes</span>
                <span className="text-[10px] font-black text-[#00827C]">74%</span>
              </div>
              <div className="h-2 bg-[#00827C]/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00827C] to-[#D6F391] rounded-full" style={{ width: '74%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 2 - AUTORIDAD ─────────────────────────────────────────── */}
      <section id="autoridad" className={`py-6 px-6 border-y transition-colors duration-300 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#00827C]/5 border-[#00827C]/10'}`}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-3 text-[#00827C]">
            <Tree size={22} />
            <Medal size={22} />
            <Globe size={22} />
          </div>
          <h2 className={`text-sm font-bold max-w-2xl ${tp}`}>
            La métrica de confianza para la economía circular. Datos trazables a fuentes internacionales - IPCC, ecoinvent, DEFRA.
          </h2>
          <div className="flex items-center gap-3 text-[#00827C]">
            <ShieldCheck size={22} />
            <Flask size={22} />
            <Users size={22} />
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3 - COMPARATIVA ───────────────────────────────────────── */}
      <section id="comparativa" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight mb-4 ${tp}`}>
              Por qué prolongar es más rentable que reemplazar.
            </h2>
            <p className={`text-lg font-medium max-w-2xl ${ts}`}>
              La economía lineal cuesta más. Más dinero, más residuos, más emisiones. La economía circular ahorra en los dos frentes que importan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lineal */}
            <div className={`p-8 rounded-[2rem] border reveal-card ${isDark ? 'border-white/10 bg-[#525252]/30' : 'border-[#00827C]/10 bg-[#00827C]/[0.03]'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FF5E4B]/10 flex items-center justify-center">
                  <span className="text-[#FF5E4B] font-black text-lg">×</span>
                </div>
                <h3 className={`text-lg font-black ${tp}`}>Economía Lineal - Comprar y desechar</h3>
              </div>
              <ul className="space-y-4">
                {[
                  'Altos costos de reposición recurrentes',
                  'Máxima huella hídrica en producción',
                  'Impuestos y multas por emisiones crecientes',
                  'Cero diferenciación ante clientes e inversores',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-[#FF5E4B]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#FF5E4B] text-[10px] font-black">-</span>
                    </div>
                    <span className={`text-sm font-medium leading-relaxed ${ts}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Circular */}
            <div className={`relative p-8 rounded-[2rem] overflow-hidden reveal-card ${liquidGlass}`} style={{ animationDelay: '0.15s' }}>
              <div data-blob data-mx="0.05" data-my="0.05" data-ms="0.015"
                className="absolute -top-8 -right-8 w-32 h-32 bg-[#8AD0B2]/40 blur-[40px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div data-blob data-mx="-0.04" data-my="-0.04" data-ms="-0.01"
                className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#D6F391]/35 blur-[35px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div className="relative z-10 flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#00827C]/10 flex items-center justify-center">
                  <Check size={20} strokeWidth={2.5} className="text-[#00827C]" />
                </div>
                <h3 className={`text-lg font-black ${tp}`}>Economía Circular - Reutilizar y optimizar</h3>
              </div>
              <ul className="relative z-10 space-y-4">
                {[
                  'Reducción de costos operativos hasta un 40%',
                  'Mitigación real del impacto ambiental medida con datos verificables',
                  'Cumplimiento de normativas ESG e internacionales',
                  'Ventaja competitiva diferenciada ante clientes e inversores',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-[#00827C]/10 flex items-center justify-center flex-shrink-0">
                      <Check size={10} strokeWidth={2.5} className="text-[#00827C]" />
                    </div>
                    <span className={`text-sm font-medium leading-relaxed ${tp}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 4 - CATEGORÍAS ────────────────────────────────────────── */}
      <section id="categorias" className={`py-24 px-6 border-t transition-colors duration-300 ${isDark ? 'bg-[#525252]/40 border-white/8' : 'bg-[#00827C]/[0.02] border-[#00827C]/8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight mb-4 ${tp}`}>
              ¿Cuánto recupera tu empresa en el Sistema Moda?
            </h2>
            <p className={`text-lg font-medium max-w-2xl ${ts}`}>
              Selecciona tu eslabón y descubre el valor que el diagnóstico circular puede revelar.
            </p>
          </div>

          {/* Tabs móvil */}
          <div className="flex md:hidden gap-2 mb-8 overflow-x-auto pb-1">
            {Object.values(CATEGORIAS).map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id as CatKey)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeCategory === c.id ? 'bg-[#00827C] text-white shadow-[0_4px_16px_rgba(0,130,124,0.25)]' : `border ${ts} hover:bg-[#00827C]/5 ${isDark ? 'border-white/10' : 'border-[#00827C]/15'}`}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-start">
            {/* Sidebar desktop */}
            <div className="hidden md:flex flex-col gap-3 sticky top-28">
              {Object.values(CATEGORIAS).map(c => {
                const Icon = c.icon
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id as CatKey)}
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-left font-bold text-sm transition-all ${
                      activeCategory === c.id
                        ? 'bg-[#00827C] text-white shadow-[0_8px_24px_rgba(0,130,124,0.2)]'
                        : `border ${ts} hover:bg-[#00827C]/5 ${isDark ? 'border-white/10 hover:border-white/20' : 'border-[#00827C]/12 hover:border-[#00827C]/20'}`
                    }`}
                  >
                    <Icon size={18} strokeWidth={activeCategory === c.id ? 2.5 : 2} />
                    {c.label}
                  </button>
                )
              })}
            </div>

            {/* Panel dinámico */}
            <div className={`relative p-8 md:p-10 rounded-[2.5rem] overflow-hidden ${liquidGlass}`}>
              <div data-blob data-mx="0.07" data-my="0.06" data-ms="0.02"
                className="absolute -top-12 -right-12 w-48 h-48 bg-[#59A6E4]/30 blur-[60px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div data-blob data-mx="-0.05" data-my="-0.05" data-ms="-0.01"
                className="absolute -bottom-12 -left-12 w-44 h-44 bg-[#D6F391]/30 blur-[55px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />

              <div className="relative z-10">
                <p className="text-[10px] font-black text-[#00827C] mb-1">Diagnóstico de impacto</p>
                <h3 className={`text-2xl font-black mb-2 ${tp}`}>{cat.h3}</h3>
                <p className={`text-sm font-bold mb-8 pb-8 border-b ${ts} ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>{cat.ejemplo}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#00827C]/5 border-[#00827C]/10'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Tree size={18} className="text-[#00827C]" />
                      <span className="text-[10px] font-black text-[#00827C]">Ahorra al planeta</span>
                    </div>
                    <div className={`glass-number text-4xl font-black mb-1 ${tp}`}>{cat.planeta.valor}</div>
                    <p className={`text-xs font-medium ${ts}`}>{cat.planeta.detalle}</p>
                  </div>

                  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#D6F391]/10 border-[#D6F391]/20' : 'bg-[#D6F391]/20 border-[#D6F391]/40'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator size={18} className={isDark ? 'text-[#D6F391]' : 'text-[#474747]'} />
                      <span className={`text-[10px] font-black ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Ahorra al bolsillo</span>
                    </div>
                    <div className={`glass-number text-4xl font-black mb-1 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>{cat.bolsillo.valor}</div>
                    <p className={`text-xs font-medium ${ts}`}>{cat.bolsillo.detalle}</p>
                  </div>
                </div>

                <p className={`text-sm font-medium leading-relaxed ${ts}`}>{cat.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 5 - PROCESO ───────────────────────────────────────────── */}
      <section id="proceso" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight mb-4 ${tp}`}>
              De tu inventario al diagnóstico circular en tres pasos.
            </h2>
            <p className={`text-lg font-medium max-w-2xl ${ts}`}>
              Sin configuraciones complejas. Tu equipo midiendo impacto circular en menos de 24 horas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', Icon: Flask, titulo: 'Sube tus datos', desc: 'Ingresa los ítems recuperados o reacondicionados en nuestra plataforma. Textil, indumentaria, mobiliario - cada categoría tiene su propio flujo optimizado.' },
              { n: '02', Icon: Target, titulo: 'El algoritmo calcula', desc: 'Cruzamos tus datos con factores de emisión del IPCC y bases de datos internacionales (ecoinvent, DEFRA) para obtener métricas verificables de carbono y agua.' },
              { n: '03', Icon: ShieldCheck, titulo: 'Exporta y demuestra', desc: 'Genera diagnósticos circulares y reportes listos para revelar el valor oculto en tus operaciones. Cada documento incluye QR verificable y metodología trazable.' },
            ].map((paso, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-[2rem] overflow-hidden reveal-card ${liquidGlass}`}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div className="flex items-start justify-between mb-6">
                  <span className={`text-5xl font-black leading-none select-none ${isDark ? 'text-white/10' : 'text-[#00827C]/15'}`}>{paso.n}</span>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-[#00827C]/8'}`}>
                    <paso.Icon size={24} className="text-[#00827C]" />
                  </div>
                </div>
                <h3 className={`text-xl font-black mb-3 ${tp}`}>{paso.titulo}</h3>
                <p className={`text-sm font-medium leading-relaxed ${ts}`}>{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 6 - PLANES ────────────────────────────────────────────── */}
      <section id="planes" className={`py-24 px-6 border-t transition-colors duration-300 ${isDark ? 'bg-[#525252]/40 border-white/8' : 'bg-[#00827C]/[0.02] border-[#00827C]/8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight mb-4 ${tp}`}>
              Elige el plan de diagnóstico que escale con tu impacto.
            </h2>
            <p className={`text-lg font-medium ${ts}`}>Sin permanencia. Empieza gratis y escala cuando tu equipo crezca.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <div className={`flex rounded-full p-1.5 border shadow-[0_4px_20px_rgba(0,130,124,0.06)] ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/50 backdrop-blur-[40px] border-[#00827C]/10'}`}>
              {(['COP', 'USD', 'EUR'] as const).map(cur => (
                <button key={cur} onClick={() => setCurrency(cur)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${currency === cur ? 'bg-[#00827C] text-white shadow-lg' : `hover:bg-[#00827C]/5 ${ts}`}`}>{cur}</button>
              ))}
            </div>
            <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/50 backdrop-blur-[40px] border-[#00827C]/10'}`}>
              <span className={`text-sm font-bold ${billing === 'monthly' ? tp : `${ts} opacity-50`}`}>Mensual</span>
              <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${billing === 'annual' ? 'bg-[#00827C]' : isDark ? 'bg-white/15' : 'bg-[#474747]/15'}`}>
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${billing === 'annual' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-sm font-bold ${billing === 'annual' ? tp : `${ts} opacity-50`}`}>Anual</span>
              {billing === 'annual' && <span className="text-xs font-black text-[#00827C] bg-[#00827C]/8 px-2 py-0.5 rounded-full">2 meses gratis</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className={`relative p-7 rounded-[2rem] border flex flex-col transition-all hover:-translate-y-1 reveal-card ${
                  plan.popular
                    ? isDark ? 'border-white/15 bg-[#525252] shadow-[0_20px_50px_rgba(255,255,255,0.05)]' : 'border-[#00827C]/30 bg-white shadow-[0_20px_50px_rgba(0,130,124,0.10)]'
                    : isDark ? 'border-white/10 bg-[#525252]/50 backdrop-blur-md' : 'border-[#00827C]/10 bg-white/80 backdrop-blur-md'
                }`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#474747] text-[#D6F391] text-[9px] font-black tracking-widest rounded-full whitespace-nowrap">MÁS POPULAR</div>
                )}
                <div className="mb-6">
                  <p className={`text-[10px] font-black mb-1 opacity-60 ${ts}`}>{plan.tagline}</p>
                  <h3 className={`text-lg font-black mb-4 ${tp}`}>{plan.name}</h3>
                  <div className={`text-4xl font-black mb-0.5 ${tp}`}>{formatPrice(plan)}</div>
                  {plan.priceMonthlyCOP > 0 && <p className={`text-xs ${ts}`}>{CURRENCIES[currency].code}/mes</p>}
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`flex items-start gap-2.5 text-sm font-medium ${ts}`}>
                      <Check size={14} strokeWidth={2.5} className="text-[#00827C] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/registro" className={`w-full py-3.5 rounded-xl font-bold text-sm text-center transition-all block ${plan.popular ? 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-lg' : `border text-[#00827C] hover:bg-[#00827C]/5 ${isDark ? 'border-white/20' : 'border-[#00827C]/20'}`}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 7 - FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight mb-4 ${tp}`}>
              Preguntas frecuentes sobre economía circular y ahorro.
            </h2>
            <p className={`text-lg font-medium ${ts}`}>Todo lo que necesitas saber antes de empezar a diagnosticar.</p>
          </div>
          <div className={`rounded-[2rem] border p-8 shadow-[0_8px_32px_rgba(0,130,124,0.06)] ${isDark ? 'bg-[#525252]/40 border-white/10' : 'bg-white border-[#00827C]/10'}`}>
            {FAQS.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} isDark={isDark} />)}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 8 - CTA FINAL ─────────────────────────────────────────── */}
      <section id="cta-final" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className={`relative p-12 md:p-16 rounded-[3rem] overflow-hidden text-center ${liquidGlass}`}>
            <div data-blob data-mx="0.09" data-my="0.08" data-ms="0.025"
              className="absolute -top-20 -right-20 w-72 h-72 bg-[#59A6E4]/35 blur-[80px] rounded-full pointer-events-none"
              style={{ willChange: 'transform' }} />
            <div data-blob data-mx="-0.07" data-my="-0.07" data-ms="-0.02"
              className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#F3BBD3]/35 blur-[70px] rounded-full pointer-events-none"
              style={{ willChange: 'transform' }} />
            <div data-blob data-mx="-0.05" data-my="-0.05" data-ms="0"
              className="absolute w-56 h-56 bg-[#8AD0B2]/25 blur-[60px] rounded-full pointer-events-none"
              style={{ top: 'calc(50% - 7rem)', left: 'calc(50% - 7rem)', willChange: 'transform' }} />

            <div className="relative z-10">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold text-[#00827C] mb-8 ${isDark ? 'bg-[#D6F391]/10 border-[#D6F391]/25' : 'bg-[#00827C]/8 border-[#00827C]/15'}`}>
                <Leaf size={13} /> Para el planeta y el bolsillo
              </div>
              <h2 className={`text-4xl sm:text-5xl font-black tracking-tight mb-6 leading-tight ${tp}`}>
                El mundo ya no acepta excusas. Exige datos.
              </h2>
              <p className={`text-lg font-medium mb-10 max-w-2xl mx-auto glass-subtitle ${ts}`}>
                Empieza a diagnosticar hoy mismo y convierte tu compromiso ambiental en tu mayor ventaja competitiva. Para el planeta y para tu presupuesto.
              </p>
              <Link
                href="/registro"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-[#00827C] text-white font-black text-base hover:bg-[#006B66] transition-all shadow-[0_12px_40px_rgba(0,130,124,0.35)] hover:shadow-[0_16px_48px_rgba(0,130,124,0.45)] hover:-translate-y-1"
              >
                Crear mi cuenta y diagnosticar mis primeros productos <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
              <p className={`mt-6 text-sm font-medium ${ts}`}>Sin tarjeta de crédito. Plan Explora gratis para siempre.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
