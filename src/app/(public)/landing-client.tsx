'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Scales, TreeDeciduous as Tree, Calculator, Leaf, ArrowRight, Check, ChevronDown as CaretDown, FlaskConical as Flask, ShieldCheck, RefreshCw as ArrowsClockwise, Lightning, Trash, Drop, ChartBar, Cpu, Scissors } from '@/components/ui/icons'
import { PLANS, CURRENCIES, ANNUAL_DISCOUNT } from '@/lib/constants/pricing'
import { LandingHeader } from '@/components/landing-header'

// ─── Catálogo integral de cálculos ──────────────────────────────────────────
const TODOS_LOS_CALCULOS = [
  {
    icon: Leaf,
    titulo: 'Huella de carbono (CO₂e)',
    metrica: 'kg y ton CO₂ mitigadas',
    desc: 'Cuantifica las emisiones de gases de efecto invernadero evitadas al extender la vida útil y sustituir manufactura virgen.',
    tag: 'Clima',
    bgLight: 'bg-[#00827C]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#00827C]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#00827C]',
    textDark: 'text-[#00827C]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#00827C]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#00827C]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#00827C]/30 group-hover:text-[#00827C] group-hover:border-[#00827C]',
    tagHoverDark: 'group-hover:bg-[#00827C]/15 group-hover:text-[#00827C] group-hover:border-[#00827C]/30',
    haloLight: 'from-[#00827C]/30 via-[#00827C]/15 to-transparent',
    haloDark: 'from-[#00827C]/25 via-[#00827C]/10 to-transparent',
    borderHoverLight: 'hover:border-[#00827C]',
    borderHoverDark: 'hover:border-[#00827C]/50',
  },
  {
    icon: Drop,
    titulo: 'Huella hídrica (Agua dulce)',
    metrica: 'Litros de agua limpia preservados',
    desc: 'Estima el consumo de agua ahorrado en procesos agrícolas, extracción primaria, hilatura y teñido industrial.',
    tag: 'Agua',
    bgLight: 'bg-[#59A6E4]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#59A6E4]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#59A6E4]',
    textDark: 'text-[#59A6E4]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#59A6E4]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#59A6E4]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#59A6E4]/30 group-hover:text-[#59A6E4] group-hover:border-[#59A6E4]',
    tagHoverDark: 'group-hover:bg-[#59A6E4]/15 group-hover:text-[#59A6E4] group-hover:border-[#59A6E4]/30',
    haloLight: 'from-[#59A6E4]/30 via-[#59A6E4]/15 to-transparent',
    haloDark: 'from-[#59A6E4]/25 via-[#59A6E4]/10 to-transparent',
    borderHoverLight: 'hover:border-[#59A6E4]',
    borderHoverDark: 'hover:border-[#59A6E4]/50',
  },
  {
    icon: Trash,
    titulo: 'Desvío de vertedero',
    metrica: 'kg y toneladas reincorporadas',
    desc: 'Mide la masa física de residuos, dotaciones y descartes reincorporados a ciclos productivos útiles.',
    tag: 'Vertedero',
    bgLight: 'bg-[#FF5E4B]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#FF5E4B]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#FF5E4B]',
    textDark: 'text-[#FF5E4B]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#FF5E4B]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#FF5E4B]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#FF5E4B]/30 group-hover:text-[#FF5E4B] group-hover:border-[#FF5E4B]',
    tagHoverDark: 'group-hover:bg-[#FF5E4B]/15 group-hover:text-[#FF5E4B] group-hover:border-[#FF5E4B]/30',
    haloLight: 'from-[#FF5E4B]/30 via-[#FF5E4B]/15 to-transparent',
    haloDark: 'from-[#FF5E4B]/25 via-[#FF5E4B]/10 to-transparent',
    borderHoverLight: 'hover:border-[#FF5E4B]',
    borderHoverDark: 'hover:border-[#FF5E4B]/50',
  },
  {
    icon: Lightning,
    titulo: 'Eficiencia energética',
    metrica: 'kWh y megajulios (MJ) ahorrados',
    desc: 'Calcula la energía térmica y eléctrica ahorrada frente a la producción de materias primas vírgenes.',
    tag: 'Energía',
    bgLight: 'bg-[#F6BF3E]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#F6BF3E]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#F6BF3E]',
    textDark: 'text-[#F6BF3E]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#F6BF3E]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#F6BF3E]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#F6BF3E]/30 group-hover:text-[#F6BF3E] group-hover:border-[#F6BF3E]',
    tagHoverDark: 'group-hover:bg-[#F6BF3E]/15 group-hover:text-[#F6BF3E] group-hover:border-[#F6BF3E]/30',
    haloLight: 'from-[#F6BF3E]/30 via-[#F6BF3E]/15 to-transparent',
    haloDark: 'from-[#F6BF3E]/25 via-[#F6BF3E]/10 to-transparent',
    borderHoverLight: 'hover:border-[#F6BF3E]',
    borderHoverDark: 'hover:border-[#F6BF3E]/50',
  },
  {
    icon: Calculator,
    titulo: 'Retorno financiero y margen',
    metrica: '% de ahorro y valor comercial',
    desc: 'Compara el costo de rescate y transformación frente a insumo virgen, proyectando el margen comercial neto.',
    tag: 'Finanzas',
    bgLight: 'bg-[#38B98E]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#38B98E]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#38B98E]',
    textDark: 'text-[#38B98E]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#38B98E]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#38B98E]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#38B98E]/30 group-hover:text-[#38B98E] group-hover:border-[#38B98E]',
    tagHoverDark: 'group-hover:bg-[#38B98E]/15 group-hover:text-[#38B98E] group-hover:border-[#38B98E]/30',
    haloLight: 'from-[#38B98E]/30 via-[#38B98E]/15 to-transparent',
    haloDark: 'from-[#38B98E]/25 via-[#38B98E]/10 to-transparent',
    borderHoverLight: 'hover:border-[#38B98E]',
    borderHoverDark: 'hover:border-[#38B98E]/50',
  },
  {
    icon: ShieldCheck,
    titulo: 'Pasaporte digital (DDP)',
    metrica: 'Trazabilidad con código QR',
    desc: 'Genera la cédula digital con origen de material, cadena de custodia y balance de impacto auditable.',
    tag: 'Trazabilidad',
    bgLight: 'bg-[#985fa1]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#985fa1]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#985fa1]',
    textDark: 'text-[#985fa1]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#985fa1]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#985fa1]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#985fa1]/30 group-hover:text-[#985fa1] group-hover:border-[#985fa1]',
    tagHoverDark: 'group-hover:bg-[#985fa1]/15 group-hover:text-[#985fa1] group-hover:border-[#985fa1]/30',
    haloLight: 'from-[#985fa1]/30 via-[#985fa1]/15 to-transparent',
    haloDark: 'from-[#985fa1]/25 via-[#985fa1]/10 to-transparent',
    borderHoverLight: 'hover:border-[#985fa1]',
    borderHoverDark: 'hover:border-[#985fa1]/50',
  },
  {
    icon: Scales,
    titulo: 'Equivalencias pedagógicas',
    metrica: 'Días de agua, km en auto y árboles',
    desc: 'Traduce datos científicos en equivalencias cotidianas y tangibles para sustentación ante clientes y consumidores.',
    tag: 'Divulgación',
    bgLight: 'bg-[#F3BBD3]/30',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#F3BBD3]/30',
    borderDark: 'border-transparent',
    textLight: 'text-[#F3BBD3]',
    textDark: 'text-[#F3BBD3]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#F3BBD3]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#F3BBD3]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#F3BBD3]/30 group-hover:text-[#F3BBD3] group-hover:border-[#F3BBD3]',
    tagHoverDark: 'group-hover:bg-[#F3BBD3]/15 group-hover:text-[#F3BBD3] group-hover:border-[#F3BBD3]/30',
    haloLight: 'from-[#F3BBD3]/30 via-[#F3BBD3]/15 to-transparent',
    haloDark: 'from-[#F3BBD3]/25 via-[#F3BBD3]/10 to-transparent',
    borderHoverLight: 'hover:border-[#F3BBD3]',
    borderHoverDark: 'hover:border-[#F3BBD3]/50',
  },
  {
    icon: ChartBar,
    titulo: 'Índice de circularidad',
    metrica: '% de recirculación de inventario',
    desc: 'Evalúa el porcentaje de materiales aprovechados para licitaciones públicas, reportes ESG y memorias.',
    tag: 'Métricas ESG',
    bgLight: 'bg-[#AD7C43]/30',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#AD7C43]/30',
    borderDark: 'border-transparent',
    textLight: 'text-[#AD7C43]',
    textDark: 'text-[#AD7C43]',
    metricColorLight: 'text-[#474747]',
    metricColorDark: 'text-white',
    hoverIconBgLight: 'group-hover:bg-[#AD7C43]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#AD7C43]',
    hoverIconTextDark: 'group-hover:text-white',
    tagHoverLight: 'group-hover:bg-[#AD7C43]/30 group-hover:text-[#AD7C43] group-hover:border-[#AD7C43]',
    tagHoverDark: 'group-hover:bg-[#AD7C43]/15 group-hover:text-[#AD7C43] group-hover:border-[#AD7C43]/30',
    haloLight: 'from-[#AD7C43]/30 via-[#AD7C43]/15 to-transparent',
    haloDark: 'from-[#AD7C43]/25 via-[#AD7C43]/10 to-transparent',
    borderHoverLight: 'hover:border-[#AD7C43]',
    borderHoverDark: 'hover:border-[#AD7C43]/50',
  },
]

// ─── Datos de categorías ─────────────────────────────────────────────────────
const CATEGORIAS = {
  upcycling: {
    id: 'upcycling',
    label: 'Upcycling y residuos',
    icon: ArrowsClockwise,
    h3: 'Dotaciones, uniformes y descartes corporativos',
    ejemplo: '1.200 uniformes y textiles operativos transformados',
    desc: 'Evita que toneladas de dotaciones de trabajo, lonas y descartes de gran escala terminen en el relleno sanitario. Cuantifica el desvío de vertedero, el agua ahorrada y genera cotizaciones para proyectos de valorización con Pasaporte DDP.',
    planetaNum: 18400,
    planetaUnit: ' L',
    planeta: { valor: '18.400 L', detalle: 'agua ahorrada · 4.2 ton CO₂e mitigadas' },
    bolsilloNum: 52,
    bolsilloUnit: '%',
    bolsillo: { valor: '52%', detalle: 'menor costo frente a disposición y compra nueva' },
  },
  textil: {
    id: 'textil',
    label: 'Textil y fibras',
    icon: Scissors,
    h3: 'Fibras, retales y remanentes textiles',
    ejemplo: '500 kg de retal industrial recuperado',
    desc: 'Calcula el costo de rescate vs. compra de fibra virgen. Estima el ahorro hídrico y de huella de carbono para cotizar lotes circulares con Pasaporte Digital (DDP).',
    planetaNum: 8200,
    planetaUnit: ' L',
    planeta: { valor: '8.200 L', detalle: 'agua ahorrada · 18 kg CO₂ evitados por kg' },
    bolsilloNum: 45,
    bolsilloUnit: '%',
    bolsillo: { valor: '45%', detalle: 'ahorro vs. compra de materia prima virgen' },
  },
  indumentaria: {
    id: 'indumentaria',
    label: 'Indumentaria y calzado',
    icon: ShieldCheck,
    h3: 'Prendas, calzado y excedentes de inventario',
    ejemplo: '200 pares de calzado y prendas reacondicionadas',
    desc: 'Convierte productos de segunda mano, devoluciones y saldos en inventario comercial de alto valor. Genera cotizaciones B2B y etiquetas con código QR trazable para el consumidor final.',
    planetaNum: 7500,
    planetaUnit: ' L',
    planeta: { valor: '7.500 L', detalle: 'agua ahorrada · 12 kg CO₂ evitados por ítem' },
    bolsilloNum: 40,
    bolsilloUnit: '%',
    bolsillo: { valor: '40%', detalle: 'margen superior en venta con valor circular' },
  },
  mobiliario: {
    id: 'mobiliario',
    label: 'Mobiliario y diseño interior',
    icon: Flask,
    h3: 'Mobiliario, acabados y diseño interior',
    ejemplo: '50 escritorios y piezas restauradas',
    desc: 'Valoriza mobiliario corporativo, piezas reacondicionadas y materiales de diseño interior. Cotiza proyectos a medida demostrando el desvío de vertedero y mitigación de huella ante clientes corporativos y licitaciones.',
    planetaNum: 15,
    planetaUnit: ' árboles',
    planeta: { valor: '15 árboles', detalle: 'preservados · 85 kg CO₂ mitigados' },
    bolsilloNum: 32,
    bolsilloUnit: '%',
    bolsillo: { valor: '32%', detalle: 'reducción en costo de insumos y estructura' },
  },
} as const

type CatKey = keyof typeof CATEGORIAS

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: '¿Cómo funciona el cálculo para cotizar en la Calculadora de Reúso?',
    a: 'La plataforma calcula el costo real de recuperar, reacondicionar o transformar materiales y lo contrasta con el precio de adquirir materia prima virgen. Te entrega el margen financiero proyectado y adjunta automáticamente el impacto ambiental cuantificado (agua, CO₂, energía y residuos) para presentar cotizaciones comerciales con sustento técnico.',
  },
  {
    q: '¿Qué es el DDP (Pasaporte Digital de Producto) y cómo previene el greenwashing?',
    a: 'El DDP es una ficha técnica digital e inmutable por lote o producto con código QR. Documenta el origen de los materiales, los procesos aplicados y el impacto ambiental estimado mediante factores de emisión internacionales reconocidos (IPCC, ecoinvent, DEFRA). Permite a tus clientes consultar la trazabilidad y los datos de respaldo en cualquier momento.',
  },
  {
    q: '¿Cuál es la diferencia entre Reúso y un software tradicional de ACV o una hoja de cálculo?',
    a: 'Los softwares de Análisis de Ciclo de Vida (ACV) tradicionales son lentos, costosos y teóricos, mientras que las hojas de cálculo no ofrecen trazabilidad ni cálculo comercial ágil. Reúso integra en minutos el rigor de los factores de emisión científicos con la generación de cotizaciones comerciales y pasaportes digitales listos para presentar.',
  },
  {
    q: '¿Los reportes y DDP sirven para memorias ESG, propuestas comerciales y clientes B2B?',
    a: 'Sí. Todos los cálculos y reportes descargables siguen las directrices del GHG Protocol y marcos internacionales de ecodiseño. Son documentos estructurados con sello digital único, ideales para memorias de sostenibilidad corporativa, propuestas comerciales con criterios verdes y sustento ante clientes e inversores.',
  },
]

// ─── FAQItem ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, isDark }: { q: string; a: string; isDark: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-1.5 sm:py-2 transition-all duration-200">
      <button
        onClick={() => setOpen(!open)}
        className={`group w-full flex items-center justify-between gap-4 text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-300 ${
          open
            ? isDark ? 'bg-white/5 shadow-inner' : 'bg-[#00827C]/5 shadow-inner'
            : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#00827C]/[0.04]'
        }`}
      >
        <span className={`text-sm sm:text-base font-bold transition-colors duration-200 ${
          open
            ? isDark ? 'text-[#D6F391]' : 'text-[#00827C]'
            : isDark ? 'text-white group-hover:text-[#D6F391]' : 'text-[#474747] group-hover:text-[#00827C]'
        }`}>
          {q}
        </span>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          open
            ? isDark ? 'bg-[#D6F391] text-[#474747] rotate-180 shadow-sm' : 'bg-[#00827C] text-white rotate-180 shadow-sm'
            : isDark ? 'bg-white/5 text-white/60 group-hover:bg-[#D6F391]/20 group-hover:text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C] group-hover:bg-[#00827C]/15 group-hover:text-[#00827C]'
        }`}>
          <CaretDown size={16} strokeWidth={2.5} />
        </div>
      </button>
      <div className="overflow-hidden transition-all duration-300 px-3 sm:px-4" style={{ maxHeight: open ? 300 : 0, opacity: open ? 1 : 0 }}>
        <p className={`text-xs sm:text-sm leading-relaxed py-3 font-medium ${isDark ? 'text-white/75' : 'text-[#474747]/80'}`}>{a}</p>
      </div>
      <div className={`w-full h-px mt-1 bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/10'} to-transparent`} />
    </div>
  )
}

// ─── HeroImpactPanel (Contadores interactivos en vivo) ────────────────────────
function HeroImpactPanel({ isDark, tp, ts, liquidGlass }: { isDark: boolean; tp: string; ts: string; liquidGlass: string }) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [co2, setCo2] = useState(0)
  const [water, setWater] = useState(0)
  const [margin, setMargin] = useState(0)
  const [circRate, setCircRate] = useState(0)

  // Valores objetivo (Estándar vs. Cursor encima / aceleración dinámica)
  const targetCo2 = isHovered ? (hoveredIndex === 0 ? 1080 : 960) : 847
  const targetWater = isHovered ? (hoveredIndex === 1 ? 16.8 : 14.5) : 12.5
  const targetMargin = isHovered ? (hoveredIndex === 2 ? 48 : 42) : 38
  const targetCirc = isHovered ? (hoveredIndex !== null ? 92 : 86) : 74

  useEffect(() => {
    let animId: number
    const duration = isHovered ? 650 : 1200
    const start = performance.now()
    const startCo2 = co2
    const startWater = water
    const startMargin = margin
    const startCirc = circRate

    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)

      setCo2(Math.round(startCo2 + (targetCo2 - startCo2) * eased))
      setWater(Number((startWater + (targetWater - startWater) * eased).toFixed(1)))
      setMargin(Math.round(startMargin + (targetMargin - startMargin) * eased))
      setCircRate(Math.round(startCirc + (targetCirc - startCirc) * eased))

      if (progress < 1) {
        animId = requestAnimationFrame(step)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [isHovered, hoveredIndex])

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setHoveredIndex(null)
      }}
      className={`relative p-4 sm:p-6 md:p-5 lg:p-8 rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_24px_60px_rgba(0,130,124,0.18)] ${liquidGlass} ${
        isHovered ? (isDark ? 'border-[#D6F391]/40' : 'border-[#00827C]/30 scale-[1.015]') : ''
      }`}
    >
      {/* Blobs reactivos con desplazamiento dinámico */}
      <div data-blob data-mx="0.08" data-my="0.07" data-ms="0.02"
        className={`absolute -top-16 -right-16 w-64 h-64 bg-[#59A6E4]/35 blur-[80px] rounded-full pointer-events-none transition-all duration-700 ${isHovered ? 'scale-125 opacity-90' : 'opacity-70'}`}
        style={{ willChange: 'transform' }} />
      <div data-blob data-mx="-0.06" data-my="-0.06" data-ms="-0.01"
        className={`absolute -bottom-16 -left-16 w-56 h-56 bg-[#8AD0B2]/35 blur-[70px] rounded-full pointer-events-none transition-all duration-700 ${isHovered ? 'scale-125 opacity-90' : 'opacity-70'}`}
        style={{ willChange: 'transform' }} />

      <div className="relative z-10 flex items-center justify-between mb-4 md:mb-6 lg:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-semibold ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
              Panel de impacto circular
            </p>
            {isHovered && (
              <span className={`inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse ${
                isDark ? 'bg-[#D6F391]/20 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Impacto en vivo
              </span>
            )}
          </div>
          <p className={`text-[11px] sm:text-xs md:text-[11px] lg:text-xs font-medium ${ts}`}>
            Cálculo registrado · Pasaporte DDP activo
          </p>
        </div>
        <div className={`w-7 h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-[#D6F391] flex items-center justify-center flex-shrink-0 transition-all duration-500 cursor-pointer ${
          isHovered ? 'rotate-45 scale-110 shadow-[0_0_20px_rgba(214,243,145,0.8)]' : ''
        }`}>
          <Leaf size={14} className="text-[#474747]" />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 md:gap-2.5 lg:gap-4">
        {[
          { label: 'CO₂ mitigado', value: `${co2}`, unit: 'kg CO₂e evitados' },
          { label: 'Agua ahorrada', value: `${water}K`, unit: 'L preservados' },
          { label: 'Margen circular', value: `+${margin}%`, unit: 'vs. insumo virgen' },
        ].map((stat, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`glass-stat flex flex-col gap-0.5 sm:gap-1 md:gap-1 lg:gap-1.5 p-2.5 sm:p-3.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl border cursor-pointer transition-all duration-300 ${
              hoveredIndex === i
                ? isDark
                  ? 'bg-white/15 border-[#D6F391]/40 scale-105 shadow-lg'
                  : 'bg-white/70 border-[#00827C]/30 scale-105 shadow-lg'
                : isDark
                ? 'bg-white/5 border-white/8 hover:bg-white/10'
                : 'bg-white/30 border-[#00827C]/8 hover:bg-white/50'
            }`}
          >
            <span className={`text-[8px] sm:text-[9px] md:text-[8px] lg:text-[10px] font-bold leading-tight transition-colors duration-200 ${
              isDark ? 'text-[#D6F391]' : 'text-[#00827C]'
            }`}>
              {stat.label}
            </span>
            <span className={`glass-number text-xl sm:text-2xl md:text-xl lg:text-3xl font-black leading-none transition-transform duration-200 ${
              hoveredIndex === i ? 'scale-105' : ''
            } ${tp}`}>
              {stat.value}
            </span>
            <span className={`text-[8px] sm:text-[9px] md:text-[8px] lg:text-[10px] font-medium leading-tight ${ts}`}>
              {stat.unit}
            </span>
          </div>
        ))}
      </div>

      <div className={`relative z-10 mt-4 sm:mt-5 md:mt-4 lg:mt-6 p-3 sm:p-3.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 ${
        isHovered
          ? isDark ? 'bg-white/10 border-white/15' : 'bg-white/40 border-[#00827C]/15'
          : isDark ? 'bg-white/5 border-white/8' : 'bg-white/20 border-[#00827C]/8'
      }`}>
        <div className="flex justify-between items-center mb-1.5 md:mb-2">
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-bold ${ts}`}>
            Tasa de circularidad del lote
          </span>
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-black transition-all duration-300 ${
            isHovered ? 'scale-110' : ''
          } ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>
            {circRate}%
          </span>
        </div>
        <div className={`relative h-1.5 md:h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#D6F391]/10' : 'bg-[#00827C]/10'}`}>
          <div
            className={`h-full bg-gradient-to-r rounded-full transition-all duration-500 ${
              isDark ? 'from-[#D6F391] to-[#8AD0B2]' : 'from-[#00827C] to-[#D6F391]'
            }`}
            style={{ width: `${circRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── CategoryMetricsDisplay (Contadores dinámicos para categorías) ───────────
function CategoryMetricsDisplay({
  cat,
  isDark,
  tp,
  ts
}: {
  cat: (typeof CATEGORIAS)[CatKey]
  isDark: boolean
  tp: string
  ts: string
}) {
  const [hoveredCard, setHoveredCard] = useState<'planeta' | 'bolsillo' | null>(null)
  const [planetaVal, setPlanetaVal] = useState(0)
  const [bolsilloVal, setBolsilloVal] = useState(0)

  const targetPlaneta = hoveredCard === 'planeta' ? Math.round(cat.planetaNum * 1.15) : cat.planetaNum
  const targetBolsillo = hoveredCard === 'bolsillo' ? Math.min(cat.bolsilloNum + 10, 95) : cat.bolsilloNum

  useEffect(() => {
    let animId: number
    const duration = 750
    const start = performance.now()
    const startPlaneta = planetaVal
    const startBolsillo = bolsilloVal

    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)

      setPlanetaVal(Math.round(startPlaneta + (targetPlaneta - startPlaneta) * eased))
      setBolsilloVal(Math.round(startBolsillo + (targetBolsillo - startBolsillo) * eased))

      if (progress < 1) {
        animId = requestAnimationFrame(step)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [cat.id, hoveredCard])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:gap-4 lg:gap-6 mb-4 sm:mb-6 md:mb-6 lg:mb-8">
      {/* Planeta Card */}
      <div
        onMouseEnter={() => setHoveredCard('planeta')}
        onMouseLeave={() => setHoveredCard(null)}
        className={`p-3.5 sm:p-5 md:p-4 lg:p-6 rounded-xl md:rounded-2xl border cursor-pointer transition-all duration-300 ${
          hoveredCard === 'planeta'
            ? isDark
              ? 'bg-white/15 border-[#D6F391]/40 scale-105 shadow-lg'
              : 'bg-[#00827C]/10 border-[#00827C]/30 scale-105 shadow-lg'
            : isDark
            ? 'bg-white/5 border-white/10 hover:bg-white/10'
            : 'bg-[#00827C]/5 border-[#00827C]/10 hover:bg-[#00827C]/10'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 md:mb-2 lg:mb-3">
          <Tree size={16} className={`transition-transform duration-300 ${hoveredCard === 'planeta' ? 'scale-125 rotate-6' : ''} ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`} />
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>
            Impacto ambiental evitado
          </span>
        </div>
        <div className={`glass-number text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-black mb-0.5 md:mb-1 ${tp}`}>
          {planetaVal.toLocaleString('es-CO')}{cat.planetaUnit}
        </div>
        <p className={`text-[11px] sm:text-xs md:text-[11px] lg:text-xs font-medium ${ts}`}>{cat.planeta.detalle}</p>
      </div>

      {/* Bolsillo Card */}
      <div
        onMouseEnter={() => setHoveredCard('bolsillo')}
        onMouseLeave={() => setHoveredCard(null)}
        className={`p-3.5 sm:p-5 md:p-4 lg:p-6 rounded-xl md:rounded-2xl border cursor-pointer transition-all duration-300 ${
          hoveredCard === 'bolsillo'
            ? isDark
              ? 'bg-[#D6F391]/20 border-[#D6F391]/50 scale-105 shadow-lg'
              : 'bg-[#D6F391]/35 border-[#D6F391]/60 scale-105 shadow-lg'
            : isDark
            ? 'bg-[#D6F391]/10 border-[#D6F391]/20 hover:bg-[#D6F391]/20'
            : 'bg-[#D6F391]/20 border-[#D6F391]/40 hover:bg-[#D6F391]/30'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 md:mb-2 lg:mb-3">
          <Calculator size={16} className={`transition-transform duration-300 ${hoveredCard === 'bolsillo' ? 'scale-125 rotate-6' : ''} ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`} />
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>
            Retorno y margen comercial
          </span>
        </div>
        <div className={`glass-number text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-black mb-0.5 md:mb-1 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>
          +{bolsilloVal}%
        </div>
        <p className={`text-[11px] sm:text-xs md:text-[11px] lg:text-xs font-medium ${ts}`}>{cat.bolsillo.detalle}</p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Landing2Page() {
  const [mounted, setMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CatKey>('upcycling')
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
        { name: 'Cálculo para cotizar', link: '#comparativa' },
        { name: 'Pasaporte Digital (DDP)', link: '#proceso' },
        { name: 'Sectores e industrias', link: '#categorias' },
        { name: 'Preguntas frecuentes', link: '#faq' },
      ]
    },
    {
      name: 'Industrias',
      items: [
        { name: 'Upcycling y residuos', link: '#categorias' },
        { name: 'Textil y fibras', link: '#categorias' },
        { name: 'Indumentaria y calzado', link: '#categorias' },
        { name: 'Mobiliario y diseño interior', link: '#categorias' },
      ]
    },
    {
      name: 'Planes',
      items: [
        { name: 'Calculadora & Cotizador', link: '#planes' },
        { name: 'Soluciones a medida', link: '#planes' },
      ]
    }
  ]

  const searchResults = [
    { title: 'Cálculo para cotizar y retorno financiero', link: '#comparativa' },
    { title: 'Pasaporte Digital de Producto (DDP)', link: '#proceso' },
    { title: 'Sectores de Upcycling, Textil y Manufactura', link: '#categorias' },
    { title: 'Planes de suscripción y cotizador B2B', link: '#planes' },
    { title: 'Metodología anti-greenwashing y FAQ', link: '#faq' },
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
          opacity: 0; transform: translateY(24px); filter: blur(4px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      filter 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        section[id][data-revealed] { opacity: 1; transform: translateY(0); filter: blur(0); }
        @keyframes glassStatIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) scale(1);       filter: blur(0); }
        }
        @keyframes glassGlow {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50%      { text-shadow: 0 0 20px rgba(138,208,178,0.45), 0 0 40px rgba(89,166,228,0.18); }
        }
        @keyframes glassPulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
        @keyframes revealCard {
          from { opacity: 0; transform: translateY(20px) scale(0.98); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) scale(1);       filter: blur(0); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }
        @keyframes floatReverseSlow {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(5px); }
        }
        .animate-float         { animation: floatSlow 5s ease-in-out infinite; }
        .animate-float-delayed { animation: floatReverseSlow 6s ease-in-out infinite 1s; }
        .glass-stat  { animation: glassStatIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .glass-stat:nth-child(1) { animation-delay: 0.08s; }
        .glass-stat:nth-child(2) { animation-delay: 0.16s; }
        .glass-stat:nth-child(3) { animation-delay: 0.24s; }
        .glass-number   { animation: glassGlow 3s ease-in-out infinite; }
        .glass-subtitle { animation: glassPulse 3s ease-in-out infinite; }
        .reveal-card { animation: revealCard 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .hover-card-interactive {
          transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
                      box-shadow 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
                      border-color 0.3s ease;
        }
        .hover-card-interactive:hover {
          transform: translateY(-4px) scale(1.008);
        }
        .hover-icon-interactive {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .hover-icon-interactive {
          transform: scale(1.18) rotate(-4deg);
        }
      `}</style>

      <LandingHeader
        menuGroups={menuGroups}
        searchResults={searchResults}
        isDark={isDark}
        onToggleDark={() => {
          const next = !isDark
          setIsDark(next)
          document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
          localStorage.setItem('theme', next ? 'dark' : 'light')
          localStorage.setItem('reuso-theme', next ? 'dark' : 'light')
        }}
        extraActions={
          <>
            <Link href="/registro" className={`px-3 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap hover:scale-105 active:scale-95 ${isDark ? 'bg-[#D6F391] text-[#474747] hover:bg-[#c4e47a] shadow-[0_4px_16px_rgba(214,243,145,0.2)]' : 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-[0_4px_16px_rgba(0,130,124,0.25)]'}`}>
              Empezar gratis
            </Link>
            <Link href="/login" className={`inline-flex px-3 sm:px-4 py-2 rounded-full border text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95 ${isDark ? 'border-[#D6F391]/20 text-white hover:bg-[#D6F391]/5' : 'border-[#00827C]/20 text-[#474747] hover:bg-[#00827C]/5'}`}>
              Entrar
            </Link>
          </>
        }
      />

      {/* ── SECCIÓN 1 - HERO ──────────────────────────────────────────────── */}
      <section className="pt-[145px] sm:pt-[160px] md:pt-[165px] lg:pt-[180px] pb-8 sm:pb-10 md:pb-12 lg:pb-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8 lg:gap-16 items-center">

          {/* Texto izquierdo */}
          <div className="animate-float">
            <p className={`text-xs sm:text-sm font-semibold mb-3 md:mb-4 ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
              Plataforma de economía circular, cotización y DDP
            </p>
            <h1 className={`text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-extrabold tracking-tight leading-snug mb-3.5 md:mb-5 ${tp}`}>
              Calcula, cotiza y documenta el impacto ambiental de extender la vida útil de tus productos.
            </h1>
            <p className={`text-sm sm:text-base md:text-sm lg:text-base font-medium leading-relaxed mb-6 md:mb-8 max-w-lg ${ts}`}>
              Convierte la sostenibilidad en una ventaja comercial inmediata. Cuantifica CO₂ evitado, ahorro de agua y retorno financiero con datos reales. Genera cotizaciones B2B de valor circular y emite Pasaportes Digitales de Producto (DDP) blindados contra el greenwashing.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 md:gap-2.5 lg:gap-3">
              <a href="#planes" className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto px-4 py-2 sm:px-4.5 sm:py-2.5 md:px-4.5 md:py-2.5 lg:px-5 lg:py-2.5 rounded-full font-bold text-xs sm:text-xs md:text-xs lg:text-sm transition-all hover:-translate-y-1 hover:scale-105 active:scale-95 ${isDark ? 'bg-[#D6F391] text-[#474747] hover:bg-[#c4e47a] shadow-[0_8px_32px_rgba(214,243,145,0.25)]' : 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-[0_8px_32px_rgba(0,130,124,0.35)]'}`}>
                Iniciar cálculo para cotizar <ArrowRight size={14} strokeWidth={2.5} />
              </a>
              <a href="#calculos" className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto px-4 py-2 sm:px-4.5 sm:py-2.5 md:px-4.5 md:py-2.5 lg:px-5 lg:py-2.5 rounded-full border font-bold text-xs sm:text-xs md:text-xs lg:text-sm transition-all hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${isDark ? 'border-[#D6F391]/20 text-[#D6F391] hover:bg-[#D6F391]/5' : 'border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/5'}`}>
                Ver todos los cálculos
              </a>
            </div>
          </div>

          {/* Panel Liquid Glass con números interactivos animados */}
          <HeroImpactPanel isDark={isDark} tp={tp} ts={ts} liquidGlass={liquidGlass} />
        </div>
      </section>

      {/* ── SECCIÓN 2 - COMPARATIVA ───────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/12'} to-transparent`} />
      <section id="comparativa" className="py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h2 className={`text-xl sm:text-2xl md:text-2xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 ${tp}`}>
              Por qué cotizar con valor circular multiplica tus ventas y reduce costos.
            </h2>
            <p className={`text-xs sm:text-sm md:text-sm lg:text-base font-medium max-w-2xl ${ts}`}>
              El descarte lineal destruye rentabilidad y oculta riesgos de greenwashing. La economía circular con Reúso monetiza cada insumo y sustenta el impacto positivo con datos reales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
            {/* Lineal */}
            <div className={`group p-5 sm:p-6 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl lg:rounded-[2rem] border reveal-card hover-card-interactive ${isDark ? 'border-white/10 bg-[#525252]/30 hover:border-white/20' : 'border-[#00827C]/10 bg-[#00827C]/[0.03] hover:border-[#00827C]/20'}`}>
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-xl bg-[#FF5E4B]/10 flex items-center justify-center hover-icon-interactive">
                  <span className="text-[#FF5E4B] font-black text-base md:text-lg">×</span>
                </div>
                <h3 className={`text-base md:text-base lg:text-lg font-black ${tp}`}>Modelo lineal - Cotizar a ciegas y desechar</h3>
              </div>
              <ul className="space-y-2.5 sm:space-y-3 md:space-y-3.5 lg:space-y-4">
                {[
                  'Altos costos recurrentes en insumos y materias primas vírgenes',
                  'Pérdida directa de valor en mermas, saldos y retales descartados',
                  'Riesgo legal y reputacional por afirmaciones verdes sin respaldo de datos',
                  'Propuestas comerciales genéricas que compiten únicamente por precio bajo',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 md:gap-3 transition-transform duration-200 group-hover:translate-x-1">
                    <div className="mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#FF5E4B]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#FF5E4B] text-[9px] md:text-[10px] font-black">-</span>
                    </div>
                    <span className={`text-xs sm:text-sm md:text-xs lg:text-sm font-medium leading-relaxed ${ts}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Circular */}
            <div className={`relative group p-5 sm:p-6 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl lg:rounded-[2rem] overflow-hidden reveal-card hover-card-interactive ${liquidGlass}`} style={{ animationDelay: '0.15s' }}>
              <div data-blob data-mx="0.05" data-my="0.05" data-ms="0.015"
                className="absolute -top-8 -right-8 w-32 h-32 bg-[#8AD0B2]/40 blur-[40px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div data-blob data-mx="-0.04" data-my="-0.04" data-ms="-0.01"
                className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#D6F391]/35 blur-[35px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className={`w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center hover-icon-interactive ${isDark ? 'bg-[#D6F391]/10' : 'bg-[#00827C]/10'}`}>
                  <Check size={18} strokeWidth={2.5} className={isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} />
                </div>
                <h3 className={`text-base md:text-base lg:text-lg font-black ${tp}`}>Modelo Reúso - Cotización rentable + Pasaporte DDP</h3>
              </div>
              <ul className="relative z-10 space-y-2.5 sm:space-y-3 md:space-y-3.5 lg:space-y-4 mt-4 md:mt-6">
                {[
                  'Ahorro de hasta 52% en costos al sustituir materias primas por recuperadas',
                  'Propuestas comerciales con precio monetario y valor ambiental integrado',
                  'Emisión instantánea de Pasaportes Digitales de Producto (DDP) con QR',
                  'Métricas estructuradas para propuestas comerciales y memorias de sostenibilidad ESG',
                ].map((item, i) => (
                  <li key={i} className="group/item flex gap-2.5 md:gap-3 items-start transition-all duration-200 hover:translate-x-1">
                    <div className={`mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/item:scale-125 group-hover/item:rotate-6 group-hover:scale-110 ${
                      isDark
                        ? 'bg-[#D6F391]/15 text-[#D6F391] group-hover/item:bg-[#D6F391] group-hover/item:text-[#474747] group-hover/item:shadow-[0_0_12px_rgba(214,243,145,0.4)]'
                        : 'bg-[#00827C]/10 text-[#00827C] group-hover/item:bg-[#00827C] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(0,130,124,0.3)]'
                    }`}>
                      <Check size={10} strokeWidth={3} className="transition-transform duration-300" />
                    </div>
                    <span className={`text-xs sm:text-sm md:text-xs lg:text-sm font-medium leading-relaxed transition-colors duration-200 ${tp}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3 - MOTOR DE CÁLCULOS MULTICRITERIO ───────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/12'} to-transparent`} />
      <section id="calculos" className={`py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300 ${isDark ? 'bg-[#525252]/40' : 'bg-[#00827C]/[0.02]'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10">
            <p className={`text-xs sm:text-sm font-semibold mb-2.5 md:mb-3 ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
              Motor de cálculo multicriterio
            </p>
            <h2 className={`text-xl sm:text-2xl md:text-2xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 ${tp}`}>
              Mucho más que agua y CO₂: todas las variables que cuantifica Reúso.
            </h2>
            <p className={`text-xs sm:text-sm md:text-sm lg:text-base font-medium max-w-2xl ${ts}`}>
              Evaluamos cada material con factores científicos internacionales y modelos financieros para que tus cotizaciones tengan sustento técnico y rentabilidad inmediata.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-4 lg:gap-5">
            {TODOS_LOS_CALCULOS.map((calc, i) => {
              const IconComponent = calc.icon
              return (
                <div
                  key={i}
                  className={`group relative p-4 sm:p-5 md:p-4 lg:p-6 rounded-2xl md:rounded-3xl border flex flex-col justify-between reveal-card cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] ${liquidGlass} ${
                    isDark ? `${calc.borderHoverDark} hover:bg-[#525252]/70` : `${calc.borderHoverLight} hover:bg-white/95`
                  }`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Halo reactivo con el color exclusivo de cada cálculo */}
                  <div className={`absolute -inset-0.5 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none bg-gradient-to-br ${
                    isDark ? calc.haloDark : calc.haloLight
                  }`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3.5 md:mb-4">
                      {/* Contenedor del icono: sin activar con fondo al 70% de opacidad sin borde e icono traslúcido (50%); al pasar cursor, cara de color sólido e icono blanco al 100% */}
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        isDark
                          ? `${calc.bgDark} ${calc.textDark} ${calc.hoverIconBgDark} ${calc.hoverIconTextDark} group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]`
                          : `${calc.bgLight} ${calc.textLight} ${calc.hoverIconBgLight} ${calc.hoverIconTextLight} group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]`
                      }`}>
                        <IconComponent size={20} strokeWidth={2.2} className="opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      
                      {/* Badge de tag unificado */}
                      <span className={`text-[9px] sm:text-[10px] md:text-[9px] font-bold px-2.5 py-0.5 md:px-2 md:py-0.5 lg:px-2.5 lg:py-1 rounded-full border transition-all duration-300 ${
                        isDark
                          ? `bg-white/5 text-white/60 border-white/10 ${calc.tagHoverDark}`
                          : `bg-[#00827C]/5 text-[#474747]/75 border-[#00827C]/10 ${calc.tagHoverLight}`
                      }`}>
                        {calc.tag}
                      </span>
                    </div>
                    <h3 className={`text-sm sm:text-base md:text-sm lg:text-base font-extrabold mb-1.5 transition-colors duration-300 ${tp}`}>
                      {calc.titulo}
                    </h3>
                    <p className={`text-[11px] sm:text-xs md:text-[11px] lg:text-xs font-bold mb-2 transition-all duration-300 group-hover:translate-x-0.5 ${
                      isDark ? calc.metricColorDark : calc.metricColorLight
                    }`}>
                      {calc.metrica}
                    </p>
                    <p className={`text-[11px] sm:text-xs md:text-[11px] lg:text-xs font-medium leading-relaxed ${ts}`}>
                      {calc.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 4 - CATEGORÍAS / INDUSTRIAS ────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/12'} to-transparent`} />
      <section id="categorias" className={`py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300 ${isDark ? 'bg-[#474747]' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h2 className={`text-xl sm:text-2xl md:text-2xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 ${tp}`}>
              ¿Cuánto valor recupera tu empresa con economía circular?
            </h2>
            <p className={`text-xs sm:text-sm md:text-sm lg:text-base font-medium max-w-2xl ${ts}`}>
              Selecciona tu sector productivo y descubre cómo el cálculo ambiental y comercial transforma mermas y descartes en cotizaciones de alto valor.
            </p>
          </div>

          {/* Tabs móvil */}
          <div className="flex md:hidden gap-2 mb-5 overflow-x-auto pb-2 scrollbar-none">
            {Object.values(CATEGORIAS).map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id as CatKey)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95 ${activeCategory === c.id ? (isDark ? 'bg-[#D6F391] text-[#474747] shadow-[0_4px_16px_rgba(214,243,145,0.25)]' : 'bg-[#00827C] text-white shadow-[0_4px_16px_rgba(0,130,124,0.25)]') : `border ${ts} hover:bg-[#00827C]/5 ${isDark ? 'border-white/10 hover:text-white' : 'border-[#00827C]/15 hover:text-[#00827C]'}`}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr] gap-5 md:gap-5 lg:gap-8 items-start">
            {/* Sidebar tablet/desktop */}
            <div className="hidden md:flex flex-col gap-2 md:gap-2 lg:gap-2.5 sticky top-28">
              {Object.values(CATEGORIAS).map(c => {
                const Icon = c.icon
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id as CatKey)}
                    className={`w-full flex items-center gap-2.5 lg:gap-3 px-3.5 py-3 lg:px-4 lg:py-3.5 rounded-xl md:rounded-2xl text-left font-bold text-xs md:text-xs lg:text-sm transition-all hover:scale-[1.03] active:scale-95 ${
                      activeCategory === c.id
                        ? (isDark ? 'bg-[#D6F391] text-[#474747] shadow-[0_8px_24px_rgba(214,243,145,0.2)]' : 'bg-[#00827C] text-white shadow-[0_8px_24px_rgba(0,130,124,0.2)]')
                        : `border ${ts} hover:bg-[#00827C]/5 ${isDark ? 'border-white/10 hover:border-white/20 hover:text-white' : 'border-[#00827C]/12 hover:border-[#00827C]/20 hover:text-[#00827C]'}`
                    }`}
                  >
                    <Icon size={16} strokeWidth={activeCategory === c.id ? 2.5 : 2} className={`transition-all duration-200 group-hover:rotate-6 ${activeCategory === c.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                    <span>{c.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Panel dinámico */}
            <div className={`relative p-5 sm:p-7 md:p-6 lg:p-10 rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden hover-card-interactive ${liquidGlass}`}>
              <div data-blob data-mx="0.07" data-my="0.06" data-ms="0.02"
                className="absolute -top-12 -right-12 w-48 h-48 bg-[#59A6E4]/30 blur-[60px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div data-blob data-mx="-0.05" data-my="-0.05" data-ms="-0.01"
                className="absolute -bottom-12 -left-12 w-44 h-44 bg-[#D6F391]/30 blur-[55px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />

              <div className="relative z-10">
                <p className={`text-xs sm:text-sm font-semibold mb-1 ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>Diagnóstico de impacto y cotización</p>
                <h3 className={`text-lg sm:text-xl md:text-xl lg:text-2xl font-black mb-1.5 md:mb-2 ${tp}`}>{cat.h3}</h3>
                <p className={`text-xs sm:text-sm md:text-xs lg:text-sm font-bold mb-4 sm:mb-6 md:mb-6 lg:mb-8 pb-4 sm:pb-6 md:pb-6 lg:pb-8 border-b ${ts} ${isDark ? 'border-white/10' : 'border-[#00827C]/10'}`}>{cat.ejemplo}</p>

                {/* Métricas con animación Count-up dinámica */}
                <CategoryMetricsDisplay cat={cat} isDark={isDark} tp={tp} ts={ts} />

                <p className={`text-xs sm:text-sm md:text-xs lg:text-sm font-medium leading-relaxed ${ts}`}>{cat.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 5 - PROCESO ───────────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/12'} to-transparent`} />
      <section id="proceso" className="py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h2 className={`text-xl sm:text-2xl md:text-2xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 ${tp}`}>
              De tus materiales al Pasaporte DDP y la cotización en 3 pasos.
            </h2>
            <p className={`text-xs sm:text-sm md:text-sm lg:text-base font-medium max-w-2xl ${ts}`}>
              Sin complicaciones ni consultorías eternas. Tu equipo cotizando con impacto circular documentado en minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4 lg:gap-6">
            {[
              { n: '01', Icon: Flask, titulo: 'Carga tus materiales o productos', desc: 'Ingresa los lotes de residuos, dotaciones, retales o mermas recuperadas en los flujos optimizados de la plataforma. El sistema identifica factores de conversión y línea base de partida.' },
              { n: '02', Icon: Cpu, titulo: 'El algoritmo calcula y cotiza', desc: 'Cruzamos tus datos con factores de emisión internacionales (IPCC, ecoinvent, DEFRA) para proyectar el ahorro de agua, CO₂, energía y el margen financiero frente a insumos vírgenes.' },
              { n: '03', Icon: ShieldCheck, titulo: 'Emite tu Cotización y Pasaporte DDP', desc: 'Genera propuestas comerciales de alto impacto y Pasaportes Digitales de Producto con código QR trazable, listos para clientes, etiquetas y memorias de sostenibilidad ESG.' },
            ].map((paso, i) => (
              <div
                key={i}
                className={`group relative p-5 sm:p-6 md:p-5 lg:p-8 rounded-2xl md:rounded-3xl lg:rounded-[2rem] overflow-hidden reveal-card hover-card-interactive ${liquidGlass}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-start justify-between mb-4 md:mb-4 lg:mb-6">
                  <span className={`text-3xl sm:text-4xl md:text-3xl lg:text-5xl font-black leading-none select-none transition-transform duration-300 group-hover:scale-110 ${isDark ? 'text-white/10 group-hover:text-[#D6F391]/25' : 'text-[#00827C]/15 group-hover:text-[#00827C]/30'}`}>{paso.n}</span>
                  <div className={`w-9 h-9 md:w-9 md:h-9 lg:w-12 lg:h-12 rounded-xl md:rounded-2xl flex items-center justify-center hover-icon-interactive transition-all duration-300 ${isDark ? 'bg-[#D6F391]/15 group-hover:bg-[#D6F391]/25' : 'bg-[#00827C]/12 group-hover:bg-[#00827C]/20'}`}>
                    <paso.Icon size={18} className={`transition-all duration-300 ${isDark ? 'text-[#D6F391] opacity-75 group-hover:opacity-100' : 'text-[#00827C] opacity-75 group-hover:opacity-100'}`} />
                  </div>
                </div>
                <h3 className={`text-base sm:text-lg md:text-base lg:text-xl font-black mb-2 md:mb-2 lg:mb-3 ${tp}`}>{paso.titulo}</h3>
                <p className={`text-xs sm:text-sm md:text-xs lg:text-sm font-medium leading-relaxed ${ts}`}>{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 6 - PLANES ────────────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/12'} to-transparent`} />
      <section id="planes" className={`py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300 ${isDark ? 'bg-[#525252]/40' : 'bg-[#00827C]/[0.02]'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10 text-center">
            <h2 className={`text-xl sm:text-2xl md:text-2xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 ${tp}`}>
              Planes de cálculo, cotización y DDP que escalan con tu negocio.
            </h2>
            <p className={`text-xs sm:text-sm md:text-sm lg:text-base font-medium ${ts}`}>Sin permanencia. Empieza gratis con diagnósticos básicos y activa el cotizador comercial cuando lo necesites.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 md:mb-8 lg:mb-10">
            <div className={`flex rounded-full p-1 border ${isDark ? 'bg-white/5 border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.1)]' : 'bg-white/50 backdrop-blur-[40px] border-[#00827C]/10 shadow-[0_4px_20px_rgba(0,130,124,0.06)]'}`}>
              {(['COP', 'USD', 'EUR'] as const).map(cur => (
                <button key={cur} onClick={() => setCurrency(cur)} className={`px-3.5 sm:px-4 py-1.5 md:px-3.5 md:py-1.5 lg:px-5 lg:py-2 rounded-full text-xs sm:text-sm md:text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${currency === cur ? (isDark ? 'bg-[#D6F391] text-[#474747] shadow-lg' : 'bg-[#00827C] text-white shadow-lg') : `hover:bg-[#00827C]/5 ${ts}`}`}>{cur}</button>
              ))}
            </div>
            <div className={`flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-1.5 md:px-3.5 md:py-1.5 lg:px-5 lg:py-2.5 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/50 backdrop-blur-[40px] border-[#00827C]/10'}`}>
              <span className={`text-xs md:text-xs lg:text-sm font-bold ${billing === 'monthly' ? tp : `${ts} opacity-50`}`}>Mensual</span>
              <button onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} className={`relative w-10 h-6 md:w-11 md:h-6 lg:w-12 lg:h-7 rounded-full transition-colors duration-300 hover:scale-105 active:scale-95 ${billing === 'annual' ? (isDark ? 'bg-[#D6F391]' : 'bg-[#00827C]') : isDark ? 'bg-white/15' : 'bg-[#474747]/15'}`}>
                <div className={`absolute top-0.5 w-5 h-5 lg:w-6 lg:h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${billing === 'annual' ? 'translate-x-4 lg:translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-xs md:text-xs lg:text-sm font-bold ${billing === 'annual' ? tp : `${ts} opacity-50`}`}>Anual</span>
              {billing === 'annual' && <span className={`text-[10px] md:text-[10px] lg:text-xs font-black px-2 py-0.5 rounded-full ${isDark ? 'text-[#D6F391] bg-[#D6F391]/15' : 'text-[#00827C] bg-[#00827C]/8'}`}>2 meses gratis</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-4 lg:gap-5">
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className={`group relative p-5 sm:p-6 md:p-5 lg:p-7 rounded-2xl md:rounded-3xl lg:rounded-[2rem] border flex flex-col hover-card-interactive reveal-card transition-all duration-300 hover:scale-[1.03] hover:-translate-y-2 ${
                  plan.popular
                    ? isDark ? 'border-white/20 bg-white/10 shadow-[0_20px_50px_rgba(255,255,255,0.08)] hover:border-[#D6F391]/40 hover:bg-white/10' : 'border-[#00827C]/30 bg-white shadow-[0_20px_50px_rgba(0,130,124,0.10)] hover:border-[#00827C]/50 hover:bg-white'
                    : isDark ? 'border-white/10 bg-[#525252]/50 backdrop-blur-md hover:border-white/20 hover:bg-white/10' : 'border-[#00827C]/10 bg-white/80 backdrop-blur-md hover:border-[#00827C]/25 hover:bg-white'
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 md:px-3 md:py-0.5 lg:px-4 lg:py-1 bg-[#474747] text-[#D6F391] text-[9px] md:text-[9px] lg:text-[10px] font-bold rounded-full whitespace-nowrap shadow-md">Más popular</div>
                )}
                <div className="mb-4 md:mb-5 lg:mb-6">
                  <p className={`text-[9px] md:text-[9px] lg:text-[10px] font-bold mb-1 opacity-60 ${ts}`}>{plan.tagline}</p>
                  <h3 className={`text-base md:text-base lg:text-lg font-black mb-2 md:mb-2.5 lg:mb-3 transition-colors duration-200 group-hover:${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} ${tp}`}>{plan.name}</h3>
                  <div className={`text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-black mb-0.5 ${tp}`}>{formatPrice(plan)}</div>
                  {plan.priceMonthlyCOP > 0 && <p className={`text-[11px] md:text-[11px] lg:text-xs ${ts}`}>{CURRENCIES[currency].code}/mes</p>}
                </div>
                <ul className="space-y-2 md:space-y-2 lg:space-y-3 mb-5 md:mb-6 lg:mb-8 flex-grow">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`group/item flex items-start gap-2.5 md:gap-2.5 lg:gap-3 text-xs md:text-xs lg:text-sm font-medium transition-all duration-200 hover:translate-x-1 ${ts}`}>
                      <div className={`mt-0.5 w-4 h-4 md:w-4.5 md:h-4.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/item:scale-125 group-hover/item:rotate-6 group-hover:scale-110 ${
                        isDark
                          ? 'bg-[#D6F391]/15 text-[#D6F391] group-hover/item:bg-[#D6F391] group-hover/item:text-[#474747] group-hover/item:shadow-[0_0_12px_rgba(214,243,145,0.4)]'
                          : 'bg-[#00827C]/10 text-[#00827C] group-hover/item:bg-[#00827C] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(0,130,124,0.3)]'
                      }`}>
                        <Check size={10} strokeWidth={3} className="transition-transform duration-300" />
                      </div>
                      <span className="transition-colors duration-200 group-hover/item:text-current">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/registro" className={`w-full py-2.5 md:py-3 lg:py-3.5 rounded-xl font-bold text-xs md:text-xs lg:text-sm text-center transition-all block hover:scale-105 active:scale-95 ${plan.popular ? (isDark ? 'bg-[#D6F391] text-[#474747] hover:bg-[#c4e47a] shadow-lg' : 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-lg') : `border hover:bg-[#00827C]/5 ${isDark ? 'border-white/20 text-white' : 'border-[#00827C]/20 text-[#00827C]'}`}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 7 - FAQ ───────────────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/12'} to-transparent`} />
      <section id="faq" className="pt-8 sm:pt-10 md:pt-12 lg:pt-14 pb-6 sm:pb-8 px-4 sm:px-6">
        <div className="max-w-2xl md:max-w-2xl lg:max-w-3xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center">
            <h2 className={`text-xl sm:text-2xl md:text-2xl lg:text-4xl font-extrabold tracking-tight mb-2 md:mb-3 lg:mb-4 ${tp}`}>
              Preguntas frecuentes sobre cálculo circular, cotización y DDP.
            </h2>
            <p className={`text-xs sm:text-sm md:text-sm lg:text-base font-medium ${ts}`}>Todo lo que necesitas saber para sustentar el impacto de tus productos sin greenwashing.</p>
          </div>
          <div>
            {FAQS.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} isDark={isDark} />)}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 8 - CTA FINAL ─────────────────────────────────────────── */}
      <section id="cta-final" className="pt-6 sm:pt-8 pb-8 sm:pb-10 md:pb-12 px-4 sm:px-6">
        <div className="max-w-3xl md:max-w-3xl lg:max-w-4xl mx-auto">
          <div className={`relative p-6 sm:p-10 md:p-8 lg:p-16 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden text-center hover-card-interactive ${liquidGlass}`}>
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
              <p className={`text-xs sm:text-sm font-semibold mb-3 md:mb-4 text-center ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
                Rentabilidad económica + impacto ambiental sustentado con datos
              </p>
              <h2 className={`text-xl sm:text-3xl md:text-2xl lg:text-4xl font-extrabold tracking-tight mb-3 md:mb-4 lg:mb-6 leading-tight ${tp}`}>
                El mercado ya no premia las promesas verdes. Exige datos reales.
              </h2>
              <p className={`text-xs sm:text-base md:text-sm lg:text-base font-medium mb-6 md:mb-8 lg:mb-10 max-w-2xl mx-auto glass-subtitle ${ts}`}>
                Calcula el impacto ambiental de tus materiales, genera cotizaciones comerciales de alto valor y emite tus primeros Pasaportes Digitales de Producto (DDP) hoy mismo.
              </p>
              <Link
                href="/registro"
                className={`inline-flex items-center justify-center gap-2.5 md:gap-3 w-full sm:w-auto px-6 py-3.5 md:px-7 md:py-4 lg:px-10 lg:py-5 rounded-full font-black text-xs sm:text-sm md:text-sm lg:text-base transition-all hover:-translate-y-1 hover:scale-105 active:scale-95 ${isDark ? 'bg-[#D6F391] text-[#474747] hover:bg-[#c4e47a] shadow-[0_12px_40px_rgba(214,243,145,0.25)]' : 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-[0_12px_40px_rgba(0,130,124,0.35)]'}`}
              >
                Crear mi cuenta y calcular mi primer diagnóstico <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
              <p className={`mt-4 sm:mt-5 md:mt-5 lg:mt-6 text-[11px] sm:text-xs md:text-[11px] lg:text-sm font-medium ${ts}`}>Sin tarjeta de crédito. Plan Explora con 10 cálculos gratis al mes.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
