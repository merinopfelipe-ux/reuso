'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { m, LazyMotion, domAnimation, AnimatePresence, useInView, useReducedMotion } from 'motion/react'
import { Calculator, Leaf, ArrowRight, Check, ChevronDown as CaretDown, RefreshCw as ArrowsClockwise, Trash, Drop, Scissors, Sofa, Shirt, TrendingUp, FileText, X, Receipt, Coins, IaIcon, ShieldCheck, Headset, Flask, Plus, Users, Link as LinkIcon, MapPin, Hammer, UserPlus, QrCode } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { TooltipInfo } from '@/components/ui/tooltip-info'
import { PLANS, CURRENCIES, formatearPrecioColombiano, PALETA_COMPARATIVA } from '@/lib/constants/pricing'
import { LandingHeader, MenuGroup } from '@/components/landing-header'
import { LeadsForm } from '@/components/leads-form'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { waLink } from '@/lib/constants/contacto'

// ─── Catálogo de los 9 cálculos técnicos de impacto ──────────────────────────
const TODOS_LOS_CALCULOS = [
  // ── 1. Índice de Flujo Lineal (MCI) ──
  {
    icon: Flask,
    titulo: 'Índice de Flujo Lineal (MCI)',
    metrica: 'Circularidad avanzada (ISO 59020).',
    desc: 'Mide la circularidad integral según la norma ISO 59020 para pasaportes de producto avanzados.',
    tag: 'Ambiental',
    planes: 'Impacto Ilimitado',
    colorHex: '#00827C',
    bgLight: 'bg-[#00827C]/15',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#00827C]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#00827C]',
    textDark: 'text-[#8AD0B2]',
    hoverIconBgLight: 'group-hover:bg-[#00827C]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#00827C]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#00827C]/35 via-[#00827C]/15 to-transparent',
    haloDark: 'from-[#00827C]/30 via-[#00827C]/15 to-transparent',
  },
  // ── 2. Huella de carbono ──
  {
    icon: Leaf,
    titulo: 'Huella de carbono',
    metrica: 'Emisiones de gases evitadas.',
    desc: 'Cuantifica emisiones evitadas (kg CO₂e) al extender la vida útil frente a la extracción virgen.',
    tag: 'Ambiental',
    planes: 'Explora, Lab, Impulso e Ilimitado',
    colorHex: '#8AD0B2',
    bgLight: 'bg-[#8AD0B2]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#8AD0B2]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#8AD0B2]',
    textDark: 'text-[#8AD0B2]',
    hoverIconBgLight: 'group-hover:bg-[#8AD0B2]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#8AD0B2]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#8AD0B2]/35 via-[#8AD0B2]/15 to-transparent',
    haloDark: 'from-[#8AD0B2]/30 via-[#8AD0B2]/15 to-transparent',
  },
  // ── 3. Huella hídrica ──
  {
    icon: Drop,
    titulo: 'Huella hídrica',
    metrica: 'Litros de agua ahorrados.',
    desc: 'Estima el agua potable ahorrada al prolongar la vida útil de los recursos en tus procesos.',
    tag: 'Ambiental',
    planes: 'Explora, Lab, Impulso e Ilimitado',
    colorHex: '#59A6E4',
    bgLight: 'bg-[#59A6E4]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#59A6E4]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#59A6E4]',
    textDark: 'text-[#59A6E4]',
    hoverIconBgLight: 'group-hover:bg-[#59A6E4]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#59A6E4]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#59A6E4]/35 via-[#59A6E4]/15 to-transparent',
    haloDark: 'from-[#59A6E4]/30 via-[#59A6E4]/15 to-transparent',
  },
  // ── 4. Ahorro en compras ──
  {
    icon: Coins,
    titulo: 'Ahorro en compras',
    metrica: 'Ahorro neto en insumos.',
    desc: 'Calcula el capital ahorrado al reutilizar componentes frente a comprar insumos vírgenes nuevos.',
    tag: 'Económico',
    planes: 'Circular Lab, Impulso e Ilimitado',
    colorHex: '#38B98E',
    bgLight: 'bg-[#38B98E]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#38B98E]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#38B98E]',
    textDark: 'text-[#38B98E]',
    hoverIconBgLight: 'group-hover:bg-[#38B98E]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#38B98E]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#38B98E]/35 via-[#38B98E]/15 to-transparent',
    haloDark: 'from-[#38B98E]/30 via-[#38B98E]/15 to-transparent',
  },
  // ── 5. Retorno de inversión circular ──
  {
    icon: TrendingUp,
    titulo: 'Retorno de inversión circular',
    metrica: 'Rentabilidad de la recuperación.',
    desc: 'Compara la inversión en recuperar inventario frente a los costos evitados en compras nuevas.',
    tag: 'Económico',
    planes: 'Impulso Sostenible e Ilimitado',
    colorHex: '#F6BF3E',
    bgLight: 'bg-[#F6BF3E]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#F6BF3E]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#F6BF3E]',
    textDark: 'text-[#F6BF3E]',
    hoverIconBgLight: 'group-hover:bg-[#F6BF3E]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#F6BF3E]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#F6BF3E]/35 via-[#F6BF3E]/15 to-transparent',
    haloDark: 'from-[#F6BF3E]/30 via-[#F6BF3E]/15 to-transparent',
  },
  // ── 6. Horas de trabajo local (Social) ──
  {
    icon: Users,
    titulo: 'Horas de trabajo local',
    metrica: 'Horas de mano de obra y oficios.',
    desc: 'Cuantifica las horas de oficios técnicos y artesanos dedicadas a restaurar y valorizar cada activo.',
    tag: 'Social',
    planes: 'Impulso Sostenible e Ilimitado',
    colorHex: '#985fa1',
    bgLight: 'bg-[#985fa1]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#985fa1]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#985fa1]',
    textDark: 'text-[#985fa1]',
    hoverIconBgLight: 'group-hover:bg-[#985fa1]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#985fa1]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#985fa1]/35 via-[#985fa1]/15 to-transparent',
    haloDark: 'from-[#985fa1]/30 via-[#985fa1]/15 to-transparent',
  },
  // ── 7. Desvío de vertedero ──
  {
    icon: Trash,
    titulo: 'Desvío de vertedero',
    metrica: 'Kilogramos desviados de vertedero.',
    desc: 'Mide los kilogramos de material que evitan terminar en rellenos sanitarios o disposición final.',
    tag: 'Ambiental',
    planes: 'Circular Lab, Impulso e Ilimitado',
    colorHex: '#AD7C43',
    bgLight: 'bg-[#AD7C43]/20',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#AD7C43]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#AD7C43]',
    textDark: 'text-[#AD7C43]',
    hoverIconBgLight: 'group-hover:bg-[#AD7C43]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#AD7C43]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#AD7C43]/35 via-[#AD7C43]/15 to-transparent',
    haloDark: 'from-[#AD7C43]/30 via-[#AD7C43]/15 to-transparent',
  },
  // ── 8. Índice circular ──
  {
    icon: ArrowsClockwise,
    titulo: 'Índice circular',
    metrica: 'Porcentaje de material recuperado.',
    desc: 'Determina el porcentaje de insumos recuperados y renovables incorporados en cada producto.',
    tag: 'Ambiental',
    planes: 'Circular Lab, Impulso e Ilimitado',
    colorHex: '#D6F391',
    bgLight: 'bg-[#D6F391]/25',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#D6F391]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#D6F391]',
    textDark: 'text-[#D6F391]',
    hoverIconBgLight: 'group-hover:bg-[#D6F391]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#D6F391]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#D6F391]/40 via-[#D6F391]/20 to-transparent',
    haloDark: 'from-[#D6F391]/35 via-[#D6F391]/15 to-transparent',
  },
  // ── 9. Costo total de propiedad ──
  {
    icon: Receipt,
    titulo: 'Costo total de propiedad',
    metrica: 'Gasto real en el tiempo.',
    desc: 'Compara el gasto acumulado demostrando que extender la vida útil resulta mucho más económico.',
    tag: 'Económico',
    planes: 'Impulso Sostenible e Ilimitado',
    colorHex: '#F3BBD3',
    bgLight: 'bg-[#F3BBD3]/25',
    borderLight: 'border-transparent',
    bgDark: 'bg-[#F3BBD3]/20',
    borderDark: 'border-transparent',
    textLight: 'text-[#F3BBD3]',
    textDark: 'text-[#F3BBD3]',
    hoverIconBgLight: 'group-hover:bg-[#F3BBD3]',
    hoverIconTextLight: 'group-hover:text-white',
    hoverIconBgDark: 'group-hover:bg-[#F3BBD3]',
    hoverIconTextDark: 'group-hover:text-white',
    haloLight: 'from-[#F3BBD3]/35 via-[#F3BBD3]/15 to-transparent',
    haloDark: 'from-[#F3BBD3]/30 via-[#F3BBD3]/15 to-transparent',
  },
]

const COLOR_POR_CATEGORIA: Record<string, string> = {
  Ambiental: '#38B98E',
  Económico: '#F6BF3E',
  Social: '#F3BBD3',
}


// ─── Datos de categorías con paletas cromáticas temáticas ────────────────────
const CATEGORIAS = {
  mobiliario: {
    id: 'mobiliario',
    label: 'Mobiliario y diseño interior',
    icon: Sofa,
    h3: 'Mobiliario y diseño interior',
    ejemplo: '50 escritorios y piezas restauradas.',
    desc: 'Valoriza mobiliario corporativo, piezas reacondicionadas y materiales de diseño interior. Estructura proyectos a medida demostrando el desvío de vertedero y la mitigación de huella ante clientes corporativos y comités de sostenibilidad.',
    imgUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1200',
    planetaNum: 85,
    planetaUnit: ' kg CO₂e',
    planeta: { valor: '85 kg CO₂e', detalle: 'mitigados · 120 kg desvío de vertedero.' },
    bolsilloNum: 32,
    bolsilloUnit: '%',
    bolsillo: { valor: '32%', detalle: 'reducción en costo de insumos y estructura.' },
    // Paleta Mobiliario: Adentro los 2 verdes (#00827C y #8AD0B2). Activo siempre blanco.
    pillActiveLight: 'bg-[#00827C]',
    pillActiveDark: 'bg-[#00827C]',
    pillTextLight: 'text-white',
    pillTextDark: 'text-white',
    sidebarHoverLight: 'hover:border-[#00827C]/30  hover:text-[#00827C]',
    sidebarHoverDark: 'hover:border-[#00827C]/40 hover:bg-[#00827C]/15 hover:text-white',
    blobs: [
      { color: 'bg-[#00827C]/30', pos: '-top-8 -right-8 w-48 h-48 blur-[48px]' },
      { color: 'bg-[#8AD0B2]/35', pos: '-bottom-8 -left-8 w-44 h-44 blur-[42px]' },
      { color: 'bg-[#00827C]/20', pos: 'top-1/2 left-1/3 w-36 h-36 blur-[50px]' },
    ],
    // Card 1: Verde #00827C
    card1Light: 'bg-[#00827C]/8 border-[#00827C]/25',
    card1Dark: 'bg-[#00827C]/15 border-[#00827C]/35',
    card1HoverLight: 'bg-[#00827C]/15 border-[#00827C]/50 shadow-[0_12px_30px_rgba(0,130,124,0.18)]',
    card1HoverDark: 'bg-[#00827C]/25 border-[#00827C]/60 shadow-[0_12px_30px_rgba(0,130,124,0.30)]',
    card1IconLight: 'text-[#00827C]',
    card1IconDark: 'text-[#8AD0B2]',
    card1LabelLight: 'text-[#00605B]',
    card1LabelDark: 'text-[#8AD0B2]',
    card1NumberLight: 'text-[#00827C]',
    card1NumberDark: 'text-white',
    // Card 2: Verde #8AD0B2
    card2Light: 'bg-[#8AD0B2]/20 border-[#8AD0B2]/40',
    card2Dark: ' border-[#8AD0B2]/30',
    card2HoverLight: 'bg-[#8AD0B2]/30 border-[#8AD0B2]/60 shadow-[0_12px_30px_rgba(138,208,178,0.25)]',
    card2HoverDark: ' border-[#8AD0B2]/50 shadow-[0_12px_30px_rgba(138,208,178,0.25)]',
    card2IconLight: 'text-[#00827C]',
    card2IconDark: 'text-[#8AD0B2]',
    card2LabelLight: 'text-[#00605B]',
    card2LabelDark: 'text-[#8AD0B2]',
    card2NumberLight: 'text-[#00827C]',
    card2NumberDark: 'text-[#8AD0B2]',
  },
  indumentaria: {
    id: 'indumentaria',
    label: 'Indumentaria',
    icon: Shirt,
    h3: 'Prendas, indumentaria y excedentes',
    ejemplo: '200 pares de calzado y prendas reacondicionadas.',
    desc: 'Convierte productos de segunda mano, devoluciones y saldos en inventario comercial de alto valor. Genera reportes estructurados y etiquetas con código QR trazable para el consumidor final.',
    imgUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=1200',
    planetaNum: 7500,
    planetaUnit: ' L',
    planeta: { valor: '7.500 L', detalle: 'agua ahorrada · 12 kg CO₂ evitados por ítem.' },
    bolsilloNum: 40,
    bolsilloUnit: '%',
    bolsillo: { valor: '40%', detalle: 'margen superior en venta con valor circular.' },
    // Paleta Indumentaria: Rosa (#F3BBD3) y morada (#985fa1). Activo siempre blanco.
    pillActiveLight: 'bg-[#985fa1]',
    pillActiveDark: 'bg-[#985fa1]',
    pillTextLight: 'text-white',
    pillTextDark: 'text-white',
    sidebarHoverLight: 'hover:border-[#985fa1]/35 hover:bg-[#985fa1]/10 hover:text-[#985fa1]',
    sidebarHoverDark: 'hover:border-[#985fa1]/45 hover:bg-[#985fa1]/20 hover:text-white',
    blobs: [
      { color: 'bg-[#F3BBD3]/45', pos: '-top-8 -right-8 w-48 h-48 blur-[48px]' },
      { color: 'bg-[#985fa1]/35', pos: '-bottom-8 -left-8 w-44 h-44 blur-[42px]' },
      { color: 'bg-[#F3BBD3]/30', pos: 'top-1/2 left-1/3 w-36 h-36 blur-[50px]' },
    ],
    // Card 1: Rosa #F3BBD3
    card1Light: 'bg-[#F3BBD3]/30 border-[#F3BBD3]/60',
    card1Dark: 'bg-[#F3BBD3]/15 border-[#F3BBD3]/35',
    card1HoverLight: 'bg-[#F3BBD3]/45 border-[#F3BBD3]/80 shadow-[0_12px_30px_rgba(243,187,211,0.35)]',
    card1HoverDark: 'bg-[#F3BBD3]/25 border-[#F3BBD3]/60 shadow-[0_12px_30px_rgba(243,187,211,0.30)]',
    card1IconLight: 'text-[#763B7F]',
    card1IconDark: 'text-[#F3BBD3]',
    card1LabelLight: 'text-[#763B7F]',
    card1LabelDark: 'text-[#F3BBD3]',
    card1NumberLight: 'text-[#763B7F]',
    card1NumberDark: 'text-[#F3BBD3]',
    // Card 2: Morada #985fa1
    card2Light: ' border-[#985fa1]/35',
    card2Dark: 'bg-[#985fa1]/25 border-[#985fa1]/45',
    card2HoverLight: ' border-[#985fa1]/55 shadow-[0_12px_30px_rgba(152,95,161,0.25)]',
    card2HoverDark: 'bg-[#985fa1]/35 border-[#985fa1]/65 shadow-[0_12px_30px_rgba(152,95,161,0.35)]',
    card2IconLight: 'text-[#763B7F]',
    card2IconDark: 'text-[#F3BBD3]',
    card2LabelLight: 'text-[#763B7F]',
    card2LabelDark: 'text-[#F3BBD3]',
    card2NumberLight: 'text-[#763B7F]',
    card2NumberDark: 'text-[#F3BBD3]',
  },
  textil: {
    id: 'textil',
    label: 'Textil y fibras',
    icon: Scissors,
    h3: 'Fibras, retales y remanentes textiles',
    ejemplo: '500 kg de retal industrial recuperado.',
    desc: 'Calcula el costo de rescate vs. compra de fibra virgen. Estima el ahorro hídrico y de huella de carbono para respaldar lotes circulares con Pasaporte Digital (DPP).',
    imgUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=1200',
    planetaNum: 8200,
    planetaUnit: ' L',
    planeta: { valor: '8.200 L', detalle: 'agua ahorrada · 18 kg CO₂ evitados por kg.' },
    bolsilloNum: 45,
    bolsilloUnit: '%',
    bolsillo: { valor: '45%', detalle: 'ahorro vs. compra de materia prima virgen.' },
    // Paleta Textil y fibras (ahora Celeste #59A6E4 y Pistacho #D6F391). Activo siempre blanco.
    pillActiveLight: 'bg-[#59A6E4]',
    pillActiveDark: 'bg-[#59A6E4]',
    pillTextLight: 'text-white',
    pillTextDark: 'text-white',
    sidebarHoverLight: 'hover:border-[#59A6E4]/40  hover:text-[#59A6E4]',
    sidebarHoverDark: 'hover:border-[#D6F391]/45 hover:bg-[#D6F391]/15 hover:text-white',
    blobs: [
      { color: 'bg-[#59A6E4]/35', pos: '-top-8 -right-8 w-48 h-48 blur-[48px]' },
      { color: 'bg-[#D6F391]/30', pos: '-bottom-8 -left-8 w-44 h-44 blur-[44px]' },
      { color: 'bg-[#D6F391]/20', pos: 'top-1/3 left-1/4 w-36 h-36 blur-[48px]' },
    ],
    // Card 1: Celeste #59A6E4
    card1Light: 'bg-[#59A6E4]/20 border-[#59A6E4]/45',
    card1Dark: 'bg-[#59A6E4]/15 border-[#59A6E4]/40',
    card1HoverLight: 'bg-[#59A6E4]/30 border-[#59A6E4]/70 shadow-[0_12px_30px_rgba(89,166,228,0.30)]',
    card1HoverDark: 'bg-[#59A6E4]/25 border-[#59A6E4]/60 shadow-[0_12px_30px_rgba(89,166,228,0.30)]',
    card1IconLight: 'text-[#1E5D8F]',
    card1IconDark: 'text-[#59A6E4]',
    card1LabelLight: 'text-[#1E5D8F]',
    card1LabelDark: 'text-[#59A6E4]',
    card1NumberLight: 'text-[#1E5D8F]',
    card1NumberDark: 'text-[#59A6E4]',
    // Card 2: Pistacho (#D6F391)
    card2Light: 'bg-[#D6F391]/25 border-[#D6F391]/50',
    card2Dark: ' border-[#D6F391]/40',
    card2HoverLight: 'bg-[#D6F391]/40 border-[#D6F391]/80 shadow-[0_12px_30px_rgba(214,243,145,0.35)]',
    card2HoverDark: 'bg-[#D6F391]/30 border-[#D6F391]/65 shadow-[0_12px_30px_rgba(214,243,145,0.30)]',
    card2IconLight: 'text-[#156649]',
    card2IconDark: 'text-[#D6F391]',
    card2LabelLight: 'text-[#156649]',
    card2LabelDark: 'text-[#D6F391]',
    card2NumberLight: 'text-[#156649]',
    card2NumberDark: 'text-[#D6F391]',
  },
  upcycling: {
    id: 'upcycling',
    label: 'Upcycling y residuos',
    icon: ArrowsClockwise,
    h3: 'Residuos sólidos voluminosos',
    ejemplo: 'Manejo de escombros, colchones y descartes pesados.',
    desc: 'Enfocado en la predicción volumétrica y logística de gran escala. Evita que toneladas de escombros, colchones y residuos sólidos voluminosos saturen el relleno sanitario. Cuantifica el desvío real con Pasaporte DPP.',
    imgUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=1200',
    planetaNum: 18400,
    planetaUnit: ' kg',
    planeta: { valor: '18.400 kg', detalle: 'desviados de vertedero · 4.2 ton CO₂e mitigadas.' },
    bolsilloNum: 52,
    bolsilloUnit: '%',
    bolsillo: { valor: '52%', detalle: 'menor costo frente a disposición y compra nueva.' },
    // Paleta Upcycling y residuos (ahora Amarillo #F6BF3E y café #AD7C43). Botón resaltado en amarillo (#F6BF3E) no café. Activo siempre blanco.
    pillActiveLight: 'bg-[#F6BF3E]',
    pillActiveDark: 'bg-[#F6BF3E]',
    pillTextLight: 'text-white',
    pillTextDark: 'text-white',
    sidebarHoverLight: 'hover:border-[#F6BF3E]/45  hover:text-[#B8871B]',
    sidebarHoverDark: 'hover:border-[#F6BF3E]/45 hover:bg-[#F6BF3E]/20 hover:text-white',
    blobs: [
      { color: 'bg-[#F6BF3E]/40', pos: '-top-8 -right-8 w-48 h-48 blur-[48px]' },
      { color: 'bg-[#AD7C43]/30', pos: '-bottom-8 -left-8 w-44 h-44 blur-[42px]' },
      { color: 'bg-[#F6BF3E]/25', pos: 'top-1/2 left-1/3 w-36 h-36 blur-[50px]' },
    ],
    // Card 1: Amarillo #F6BF3E
    card1Light: 'bg-[#F6BF3E]/25 border-[#F6BF3E]/50',
    card1Dark: 'bg-[#F6BF3E]/15 border-[#F6BF3E]/35',
    card1HoverLight: 'bg-[#F6BF3E]/35 border-[#F6BF3E]/70 shadow-[0_12px_30px_rgba(246,191,62,0.30)]',
    card1HoverDark: 'bg-[#F6BF3E]/25 border-[#F6BF3E]/55 shadow-[0_12px_30px_rgba(246,191,62,0.25)]',
    card1IconLight: 'text-[#B8871B]',
    card1IconDark: 'text-[#F6BF3E]',
    card1LabelLight: 'text-[#B8871B]',
    card1LabelDark: 'text-[#F6BF3E]',
    card1NumberLight: 'text-[#B8871B]',
    card1NumberDark: 'text-[#F6BF3E]',
    // Card 2: Café / Nogal #AD7C43
    card2Light: 'bg-[#AD7C43]/20 border-[#AD7C43]/45',
    card2Dark: 'bg-[#AD7C43]/20 border-[#AD7C43]/45',
    card2HoverLight: 'bg-[#AD7C43]/30 border-[#AD7C43]/65 shadow-[0_12px_30px_rgba(173,124,67,0.25)]',
    card2HoverDark: 'bg-[#AD7C43]/30 border-[#AD7C43]/65 shadow-[0_12px_30px_rgba(173,124,67,0.30)]',
    card2IconLight: 'text-[#AD7C43]',
    card2IconDark: 'text-[#F6BF3E]',
    card2LabelLight: 'text-[#AD7C43]',
    card2LabelDark: 'text-[#F6BF3E]',
    card2NumberLight: 'text-[#AD7C43]',
    card2NumberDark: 'text-[#F6BF3E]',
  },
} as const

type CatKey = keyof typeof CATEGORIAS

// ─── TEMAS DE COLOR PARA LOS PLANES (Basados en el color asignado a cada plan) ────────
// Explora (gratis): #985fa1 | Circular Lab: #00827C | Impulso Sostenible: #59A6E4 | Impacto Ilimitado: #F6BF3E
const PLAN_THEMES: Record<string, {
  cardLight: string
  cardDark: string
  cardHoverLight: string
  cardHoverDark: string
  taglineQuiet: string
  titleHoverLight: string
  titleHoverDark: string
  priceHoverLight: string
  priceHoverDark: string
  dividerLight: string
  dividerDark: string
  badgeBg: string
  badgeText: string
  checkQuietLight: string
  checkQuietDark: string
  checkHoverLight: string
  checkHoverDark: string
  btnPopularLight: string
  btnPopularDark: string
  btnOutlineLight: string
  btnOutlineDark: string
}> = {
  free: {
    cardLight: 'border-[#985fa1]/30 bg-white shadow-xs',
    cardDark: 'border-[#985fa1]/25 bg-white/4',
    cardHoverLight: 'hover:border-[#985fa1]/70 hover:shadow-[0_20px_45px_rgba(152,95,161,0.22)] hover:bg-[#985fa1]/[0.07]',
    cardHoverDark: 'hover:border-[#F3BBD3]/50 hover:shadow-[0_20px_45px_rgba(152,95,161,0.20)] hover:bg-[#985fa1]/8',
    taglineQuiet: 'text-[#474747]/90 dark:text-white/80',
    titleHoverLight: 'group-hover:text-[#763B7F]',
    titleHoverDark: 'group-hover:text-[#F3BBD3]',
    priceHoverLight: 'group-hover:text-[#763B7F]',
    priceHoverDark: 'group-hover:text-[#F3BBD3]',
    dividerLight: 'border-[#985fa1]/20',
    dividerDark: 'border-[#985fa1]/20',
    badgeBg: 'bg-[#985fa1]',
    badgeText: 'text-white',
    checkQuietLight: 'bg-[#985fa1]/15 border border-[#985fa1]/20 text-[#763B7F]',
    checkQuietDark: 'bg-[#985fa1]/20 border border-[#985fa1]/25 text-[#F3BBD3]',
    checkHoverLight: 'group-hover/item:bg-[#985fa1] group-hover/item:border-[#985fa1] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(152,95,161,0.45)]',
    checkHoverDark: 'group-hover/item:bg-[#985fa1] group-hover/item:border-[#985fa1] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(152,95,161,0.4)]',
    btnPopularLight: 'bg-[#985fa1] text-white hover:bg-[#763B7F] shadow-md shadow-[#985fa1]/25',
    btnPopularDark: 'bg-[#985fa1] text-white hover:bg-[#763B7F] shadow-md shadow-[#985fa1]/30',
    btnOutlineLight: 'border border-[#985fa1]/45 text-[#763B7F] bg-white hover:bg-[#985fa1] hover:text-white hover:border-[#985fa1] shadow-xs hover:shadow-[0_8px_20px_rgba(152,95,161,0.3)]',
    btnOutlineDark: 'border border-[#985fa1]/40 text-[#F3BBD3] bg-[#985fa1]/10 hover:bg-[#985fa1] hover:text-white hover:border-[#985fa1]',
  },
  lab: {
    cardLight: 'border-[#00827C]/25 bg-white shadow-xs',
    cardDark: 'border-[#00827C]/25 bg-white/4',
    cardHoverLight: 'hover:border-[#00827C]/65 hover:shadow-[0_20px_45px_rgba(0,130,124,0.18)] hover:bg-[#00827C]/[0.07]',
    cardHoverDark: 'hover:border-[#8AD0B2]/50 hover:shadow-[0_20px_45px_rgba(0,130,124,0.22)] hover:bg-[#00827C]/9',
    taglineQuiet: 'text-[#474747]/90 dark:text-white/80',
    titleHoverLight: 'group-hover:text-[#00827C]',
    titleHoverDark: 'group-hover:text-[#8AD0B2]',
    priceHoverLight: 'group-hover:text-[#00827C]',
    priceHoverDark: 'group-hover:text-[#8AD0B2]',
    dividerLight: 'border-[#00827C]/20',
    dividerDark: 'border-[#00827C]/20',
    badgeBg: 'bg-[#00827C]',
    badgeText: 'text-white',
    checkQuietLight: 'bg-[#00827C]/20 border border-[#00827C]/30 text-[#00827C]',
    checkQuietDark: 'bg-[#8AD0B2]/20 border border-[#8AD0B2]/30 text-[#8AD0B2]',
    checkHoverLight: 'group-hover/item:bg-[#00827C] group-hover/item:border-[#00827C] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(0,130,124,0.35)]',
    checkHoverDark: 'group-hover/item:bg-[#8AD0B2] group-hover/item:border-[#8AD0B2] group-hover/item:text-[#474747] group-hover/item:shadow-[0_0_12px_rgba(138,208,178,0.4)]',
    btnPopularLight: 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-md shadow-[#00827C]/25',
    btnPopularDark: 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-md shadow-[#00827C]/30',
    btnOutlineLight: 'border border-[#00827C]/40 text-[#00827C] bg-white hover:bg-[#00827C] hover:text-white hover:border-[#00827C] shadow-xs hover:shadow-[0_8px_20px_rgba(0,130,124,0.25)]',
    btnOutlineDark: 'border border-[#00827C]/50 text-[#8AD0B2] bg-[#00827C]/15 hover:bg-[#00827C] hover:text-white hover:border-[#00827C]',
  },
  impulso: {
    cardLight: 'border-[#59A6E4]/45 bg-[#59A6E4]/8 shadow-[0_16px_40px_rgba(89,166,228,0.14)]',
    cardDark: 'border-[#59A6E4]/45 bg-[#59A6E4]/10 shadow-[0_16px_40px_rgba(89,166,228,0.18)]',
    cardHoverLight: 'hover:border-[#59A6E4]/80 hover:shadow-[0_26px_55px_rgba(89,166,228,0.28)] hover:bg-[#59A6E4]/12',
    cardHoverDark: 'hover:border-[#59A6E4]/75 hover:shadow-[0_26px_55px_rgba(89,166,228,0.30)] hover:bg-[#59A6E4]/[0.14]',
    taglineQuiet: 'text-[#474747]/90 dark:text-white/80',
    titleHoverLight: 'group-hover:text-[#59A6E4]',
    titleHoverDark: 'group-hover:text-[#59A6E4]',
    priceHoverLight: 'group-hover:text-[#59A6E4]',
    priceHoverDark: 'group-hover:text-[#59A6E4]',
    dividerLight: 'border-[#59A6E4]/25',
    dividerDark: 'border-[#59A6E4]/25',
    badgeBg: 'bg-[#1864A5]',
    badgeText: 'text-white',
    checkQuietLight: 'bg-[#59A6E4]/15 border border-[#59A6E4]/25 text-[#1E5D8F]',
    checkQuietDark: 'bg-[#59A6E4]/25 border border-[#59A6E4]/30 text-[#59A6E4]',
    checkHoverLight: 'group-hover/item:bg-[#59A6E4] group-hover/item:border-[#59A6E4] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(89,166,228,0.4)]',
    checkHoverDark: 'group-hover/item:bg-[#59A6E4] group-hover/item:border-[#59A6E4] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(89,166,228,0.45)]',
    btnPopularLight: 'bg-[#1864A5] text-white hover:bg-[#124E82] shadow-md shadow-[#1864A5]/25 hover:shadow-[0_8px_20px_rgba(24,100,165,0.4)]',
    btnPopularDark: 'bg-[#1864A5] text-white hover:bg-[#124E82] shadow-md shadow-[#1864A5]/30 hover:shadow-[0_8px_20px_rgba(24,100,165,0.45)]',
    btnOutlineLight: 'border border-[#59A6E4]/45 text-[#1E5D8F] bg-white hover:bg-[#59A6E4] hover:text-white hover:border-[#59A6E4] shadow-xs hover:shadow-[0_8px_20px_rgba(89,166,228,0.25)]',
    btnOutlineDark: 'border border-[#59A6E4]/45 text-[#59A6E4] bg-[#59A6E4]/15 hover:bg-[#59A6E4] hover:text-white hover:border-[#59A6E4]',
  },
  ilimitado: {
    cardLight: 'border-[#F6BF3E]/35 bg-white shadow-xs',
    cardDark: 'border-[#F6BF3E]/25 bg-white/4',
    cardHoverLight: 'hover:border-[#F6BF3E]/75 hover:shadow-[0_20px_45px_rgba(246,191,62,0.22)] hover:bg-[#F6BF3E]/8',
    cardHoverDark: 'hover:border-[#F6BF3E]/60 hover:shadow-[0_20px_45px_rgba(246,191,62,0.20)] hover:bg-[#F6BF3E]/9',
    taglineQuiet: 'text-[#474747]/90 dark:text-white/80',
    titleHoverLight: 'group-hover:text-[#B8871B]',
    titleHoverDark: 'group-hover:text-[#F6BF3E]',
    priceHoverLight: 'group-hover:text-[#B8871B]',
    priceHoverDark: 'group-hover:text-[#F6BF3E]',
    dividerLight: 'border-[#F6BF3E]/20',
    dividerDark: 'border-[#F6BF3E]/20',
    badgeBg: 'bg-[#F6BF3E]',
    badgeText: 'text-[#3E2B04]',
    checkQuietLight: 'bg-[#F6BF3E]/20 border border-[#F6BF3E]/25 text-[#B8871B]',
    checkQuietDark: 'bg-[#F6BF3E]/25 border border-[#F6BF3E]/30 text-[#F6BF3E]',
    checkHoverLight: 'group-hover/item:bg-[#F6BF3E] group-hover/item:border-[#F6BF3E] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(246,191,62,0.4)]',
    checkHoverDark: 'group-hover/item:bg-[#F6BF3E] group-hover/item:border-[#F6BF3E] group-hover/item:text-white group-hover/item:shadow-[0_0_12px_rgba(246,191,62,0.45)]',
    btnPopularLight: 'bg-[#F6BF3E] text-white hover:bg-[#e0ac34] shadow-md shadow-[#F6BF3E]/25',
    btnPopularDark: 'bg-[#F6BF3E] text-white hover:bg-[#e0ac34] shadow-md shadow-[#F6BF3E]/30',
    btnOutlineLight: 'border border-[#F6BF3E]/60 text-[#825D0B] bg-white hover:bg-[#F6BF3E] hover:text-white hover:border-[#F6BF3E] shadow-xs hover:shadow-[0_8px_20px_rgba(246,191,62,0.3)]',
    btnOutlineDark: 'border border-[#F6BF3E]/45 text-[#F6BF3E] bg-[#F6BF3E]/15 hover:bg-[#F6BF3E] hover:text-white hover:border-[#F6BF3E]',
  },
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: '¿Quiénes lideran la sostenibilidad de productos en Colombia?',
    a: 'Hoy los clientes y comités de compras desconfían de las marcas que afirman ser ecológicas sin pruebas. Quedarse en promesas sin sustento técnico cierra puertas comerciales y debilita tu reputación. Las marcas y talleres que lideran el mercado utilizan la Calculadora de Reúso para emitir Pasaportes Digitales (DPP) con código QR en cada producto, demostrando con transparencia el origen de los insumos y la vida útil extendida de los materiales.',
  },
  {
    q: '¿Qué servicios miden la huella de carbono de un negocio?',
    a: 'Medir las emisiones de carbono tradicionalmente exige costosas consultorías externas que tardan meses en entregar un diagnóstico. Mientras esperas, pierdes licitaciones corporativas frente a competidores más ágiles. La Calculadora de Reúso simplifica este proceso en una sola plataforma: cruza el peso de tus materiales con los estándares internacionales GHG Protocol e IPCC, calculando en 3 minutos las emisiones de CO₂e evitadas y el agua potable preservada.',
  },
  {
    q: '¿Dónde implementar la economía circular en mi industria?',
    a: 'Para muchas empresas, la economía circular parece un concepto teórico difícil de aterrizar en la operación diaria. Seguir descartando mobiliario, saldos y retazos es perder dinero y generar sobrecostos de disposición. Puedes implementarla directamente en la plataforma en la nube de la Calculadora de Reúso, disponible en Bogotá, Medellín y toda Colombia. Ingresas tus descartes y el sistema los transforma en inventario comercial valorizado con trazabilidad digital inmediata.',
  },
  {
    q: '¿Cuándo debe una empresa evaluar su impacto ambiental?',
    a: 'La mayoría de las compañías miden su impacto tarde, en auditorías de fin de año que no ayudan a generar ventas. Cotizar de la manera tradicional te condena a competir únicamente bajando precios y reduciendo tu margen. Debes medirlo al momento de cotizar: con la Calculadora de Reúso, presentas a tu cliente cuánto dinero ahorra en su proyecto y cuánto impacto ambiental negativo evita al preferir materiales recuperados, cerrando ventas con una ventaja decisiva.',
  },
  {
    q: '¿Por qué respaldar la responsabilidad social con datos técnicos?',
    a: 'La responsabilidad social empresarial basada en buenas intenciones ya no es suficiente ante clientes exigentes y normativas antifraude verde como la Directiva EmpCo, que sancionan severamente las afirmaciones sin sustento. Respaldarla con datos técnicos blinda tu credibilidad y abre contratos corporativos. La Calculadora de Reúso genera informes técnicos en PDF con un sello criptográfico único (hash), certificando el impacto social y ambiental de tu empresa con validez auditable.',
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
            : isDark ? 'hover:bg-white/4' : 'hover:bg-[#00827C]/4'
        }`}
      >
        <span className={`text-sm sm:text-base font-bold transition-colors duration-200 ${
          open
            ? isDark ? 'text-[#D6F391]' : 'text-[#00827C]'
            : isDark ? 'text-white group-hover:text-[#D6F391]' : 'text-[#474747] group-hover:text-[#00827C]'
        }`}>
          {q}
        </span>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
          open
            ? isDark ? 'bg-[#D6F391] text-[#474747] rotate-180 shadow-xs' : 'bg-[#00827C] text-white rotate-180 shadow-xs'
            : isDark ? 'bg-white/5 text-white/60 group-hover:bg-[#D6F391]/20 group-hover:text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C] group-hover:bg-[#00827C]/15 group-hover:text-[#00827C]'
        }`}>
          <CaretDown size={16} strokeWidth={2.5} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden px-3 sm:px-4"
          >
            <p className={`text-sm sm:text-base leading-relaxed py-3 font-medium ${isDark ? 'text-white/75' : 'text-[#474747]/80'} sm:leading-[1.5rem]`}>{a}</p>
          </m.div>
        )}
      </AnimatePresence>
      <div className={`w-full h-px mt-1 bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/10'} to-transparent`} />
    </div>
  )
}

// ─── DppTrazabilidadVisual (diagrama animado, solo tablet y escritorio) ──────
// Coordenadas en un viewBox de 600x520: el contenedor usa la misma proporción,
// así las líneas SVG y los nodos HTML posicionados en % quedan alineados.
// Acentos en orden arcoíris (norma del skill design-system): amarillo → verde
// → menta → azul → rosa. En reposo el ícono va en su propio acento, nunca en
// #474747. Resaltado sólido, siempre ícono blanco.
const DPP_RESALTADO = '#FFFFFF'
const DPP_PASOS = [
  { icon: Trash, label: 'Residuo rescatado antes del desecho', color: '#F6BF3E' },
  { icon: MapPin, label: 'Origen y procedencia declarados', color: '#38B98E' },
  { icon: Hammer, label: 'Transformación documentada', color: '#8AD0B2' },
  { icon: UserPlus, label: 'Nuevo uso y cliente vinculado', color: '#59A6E4' },
  { icon: FileText, label: 'Evidencias anexadas', color: '#F3BBD3' },
]
const DPP_NODO_Y = [60, 160, 260, 360, 460]
const DPP_HASHES = ['9c41e07b', '3fa8d215', 'b72c094e', '51de8a3c', 'e08f6b97']

function DppTrazabilidadVisual({ isDark }: { isDark: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const enVista = useInView(ref, { amount: 0.3 })
  const reducido = useReducedMotion()
  const [activo, setActivo] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (reducido) { setActivo(DPP_PASOS.length - 1); return }
    if (!enVista || pausado) return
    const id = setInterval(() => setActivo(a => (a + 1) % DPP_PASOS.length), 2200)
    return () => clearInterval(id)
  }, [enVista, reducido, pausado])

  const enfocar = (i: number) => { setPausado(true); setActivo(i) }

  const linea = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(71,71,71,0.22)'
  const pasoActivo = DPP_PASOS[activo]
  const yActivo = DPP_NODO_Y[activo]

  return (
    <div ref={ref} className="relative w-full aspect-600/520 select-none" aria-hidden="true" onMouseLeave={() => setPausado(false)}>
      {/* Brillos de color internos del componente (nunca fondo de página) */}
      <div className="absolute left-[2%] top-[10%] w-[34%] aspect-square rounded-full blur-3xl pointer-events-none" style={{ background: `#F6BF3E${isDark ? '1A' : '2E'}` }} />
      <div className="absolute left-[24%] top-[46%] w-[36%] aspect-square rounded-full blur-3xl pointer-events-none" style={{ background: `#38B98E${isDark ? '1F' : '2E'}` }} />
      <div className="absolute right-[2%] top-[20%] w-[34%] aspect-square rounded-full blur-3xl pointer-events-none" style={{ background: `#59A6E4${isDark ? '1A' : '2E'}` }} />
      <div
        className="absolute left-[45%] top-[30%] w-[34%] aspect-square rounded-full blur-3xl pointer-events-none transition-colors duration-700"
        style={{ background: `${pasoActivo.color}${isDark ? '24' : '33'}` }}
      />

      <svg viewBox="0 0 600 520" className="absolute inset-0 w-full h-full overflow-visible">
        <g fill="none" stroke={linea} strokeWidth="1.5" className="dpp-dash-flow">
          <path d={`M 140 60 V ${DPP_NODO_Y[4]} M 220 60 V ${DPP_NODO_Y[4]}`} />
          <path d="M 92 260 H 140" />
        </g>
        {DPP_PASOS.map((paso, i) => (
          <path
            key={paso.label}
            d={`M 140 ${DPP_NODO_Y[i]} H 220`}
            fill="none"
            stroke={paso.color}
            strokeOpacity={i === activo ? 1 : 0.55}
            strokeWidth={i === activo ? 2 : 1.5}
            className="dpp-dash-flow transition-all duration-300"
          />
        ))}
        <path d="M 220 260 H 300" fill="none" stroke={pasoActivo.color} strokeWidth="2" className="dpp-dash-flow transition-all duration-500" />
        {!reducido && (
          <m.circle
            key={activo}
            r="5"
            fill={pasoActivo.color}
            initial={{ cx: 205, cy: yActivo, opacity: 0 }}
            animate={{ cx: [205, 220, 220, 300], cy: [yActivo, yActivo, 260, 260], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.4, ease: 'easeInOut', times: [0, 0.2, 0.7, 1] }}
          />
        )}
      </svg>

      {/* Nodo central: el vínculo que une todas las acciones */}
      <div className="absolute aspect-square w-[9.5%] -translate-x-1/2 -translate-y-1/2" style={{ left: '8.67%', top: '50%' }}>
        <div className="absolute inset-[-20%] rounded-full transition-colors duration-700" style={{ background: `${pasoActivo.color}${isDark ? '33' : '2E'}` }} />
        <m.div
          animate={reducido ? undefined : { scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-full h-full rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #38B98E, #00827C 55%, #59A6E4)',
            color: DPP_RESALTADO,
          }}
        >
          <LinkIcon className="w-[42%] h-[42%]" strokeWidth={2.2} sinAnimacion />
        </m.div>
      </div>

      {/* Columna de acciones trazables */}
      {DPP_PASOS.map((paso, i) => {
        const Icono = paso.icon
        const esActivo = i === activo
        return (
          <div
            key={paso.label}
            className="absolute aspect-square w-[8.7%] -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: '30%', top: `${(DPP_NODO_Y[i] / 520) * 100}%` }}
            onMouseEnter={() => enfocar(i)}
          >
            {/* Base opaca: tapa las líneas punteadas para que terminen limpias en el borde del halo */}
            <div className="absolute inset-[-22%] rounded-full" style={{ background: 'var(--bg-primary)' }} />
            <div
              className="absolute inset-[-22%] rounded-full transition-colors duration-300"
              style={{ background: `${paso.color}${esActivo ? '4D' : (isDark ? '1F' : '24')}` }}
            />
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                background: esActivo ? paso.color : `color-mix(in srgb, ${paso.color} ${isDark ? 18 : 8}%, var(--bg-card))`,
                border: `1.5px solid ${paso.color}${esActivo ? '' : '80'}`,
                color: esActivo ? DPP_RESALTADO : paso.color,
                transform: esActivo ? 'scale(1.14)' : 'scale(1)',
                boxShadow: esActivo ? `0 8px 22px ${paso.color}66` : `0 4px 12px ${paso.color}${isDark ? '1F' : '26'}`,
              }}
            >
              <Icono className="w-[42%] h-[42%]" strokeWidth={esActivo ? 2.4 : 2.2} sinAnimacion />
            </div>
          </div>
        )
      })}

      {/* Tarjeta del pasaporte que se completa paso a paso */}
      <div
        className="absolute flex flex-col rounded-2xl lg:rounded-3xl p-[3.5%] border transition-shadow duration-700"
        style={{
          left: '50%', top: '4.6%', width: '48.7%', height: '90.8%',
          background: 'var(--bg-card)',
          borderColor: `${pasoActivo.color}66`,
          boxShadow: isDark ? `0 20px 50px rgba(71,71,71,0.55), 0 0 0 1px ${pasoActivo.color}26` : `0 20px 50px ${pasoActivo.color}33, inset 0 1px 0 rgba(255,255,255,0.9)`,
        }}
      >
        <p className="text-[10px] lg:text-[11px] font-semibold opacity-80 text-(--text-primary)">Pasaporte Digital de Producto</p>
        <p className="text-sm lg:text-base xl:text-lg font-black leading-tight text-(--text-primary) mt-0.5 lg:leading-[1.5rem] xl:leading-[1.75rem]">Activo circular</p>
        <p className="text-[10px] lg:text-[11px] font-mono opacity-80 text-(--text-primary) mt-0.5">DPP-7F3A-2026</p>
        <div className="h-px my-[4%]" style={{ background: 'var(--border)' }} />

        <div className="flex-1 flex flex-col justify-between gap-1.5">
          {DPP_PASOS.map((paso, i) => {
            const hecho = i <= activo
            const esActivo = i === activo
            return (
              <div
                key={paso.label}
                className="flex items-center gap-2 rounded-xl px-2 py-[3.2%] border transition-all duration-300 cursor-pointer"
                onMouseEnter={() => enfocar(i)}
                style={{
                  transform: esActivo ? 'translateX(4px)' : 'translateX(0)',
                  borderColor: esActivo ? paso.color : `${paso.color}${hecho ? '40' : '1F'}`,
                  background: esActivo ? `${paso.color}${isDark ? '24' : '1F'}` : (hecho ? `${paso.color}0D` : 'transparent'),
                }}
              >
                <div
                  className="shrink-0 w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center transition-all duration-500"
                  style={{
                    background: hecho ? paso.color : 'transparent',
                    border: hecho ? 'none' : `1.5px dashed ${paso.color}99`,
                    color: DPP_RESALTADO,
                    transform: hecho ? 'scale(1)' : 'scale(0.85)',
                  }}
                >
                  {hecho && <Check size={12} strokeWidth={3} sinAnimacion />}
                </div>
                <span className={`text-[11px] lg:text-xs xl:text-[13px] font-semibold leading-tight text-(--text-primary) transition-opacity duration-500 ${hecho ? 'opacity-100' : 'opacity-80'} lg:leading-[1rem]`}>
                  {paso.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-[4%] rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 transition-colors duration-500" style={{ background: `${pasoActivo.color}${isDark ? '1F' : '1A'}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold opacity-80 text-(--text-primary)">Huella SHA-256 encadenada</p>
            <p className="text-[11px] lg:text-xs font-mono font-bold truncate text-(--text-primary)">{DPP_HASHES[activo]}…</p>
          </div>
          <QrCode size={22} strokeWidth={1.8} className="shrink-0 text-(--text-primary) opacity-70" sinAnimacion />
        </div>
      </div>

      <style>{`
        .dpp-dash-flow { stroke-dasharray: 3 6; stroke-linecap: round; animation: dppDashFlow 1.4s linear infinite; }
        @keyframes dppDashFlow { to { stroke-dashoffset: -18; } }
        @media (prefers-reduced-motion: reduce) { .dpp-dash-flow { animation: none; } }
      `}</style>
    </div>
  )
}

// ─── HeroImpactPanel (Contadores interactivos en vivo) ────────────────────────
function HeroImpactPanel({ isDark, tp, ts, liquidGlass }: { isDark: boolean; tp: string; ts: string; liquidGlass: string }) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [co2, setCo2] = useState(847)
  const [water, setWater] = useState(12.5)
  const [margin, setMargin] = useState(38)
  const [circRate, setCircRate] = useState(74)

  // Valores objetivo (Estándar vs. Cursor encima / aceleración dinámica)
  const targetCo2 = isHovered ? (hoveredIndex === 0 ? 1080 : 960) : 847
  const targetWater = isHovered ? (hoveredIndex === 1 ? 16.8 : 14.5) : 12.5
  const targetMargin = isHovered ? (hoveredIndex === 2 ? 48 : 42) : 38
  const targetCirc = isHovered ? (hoveredIndex !== null ? 92 : 86) : 74

  useEffect(() => {
    if (!isHovered) {
      setCo2(847)
      setWater(12.5)
      setMargin(38)
      setCircRate(74)
      return
    }

    let animId: number
    const duration = 650
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, hoveredIndex])

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setHoveredIndex(null)
      }}
      style={{
        isolation: 'isolate',
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
      }}
      className={`relative p-4 sm:p-5 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl lg:rounded-4xl overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-[0_24px_60px_rgba(0,130,124,0.18)] ${liquidGlass} ${
        isHovered ? (isDark ? 'border-[#D6F391]/40' : 'border-[#00827C]/30 scale-[1.015]') : ''
      }`}
    >
      {/* Blobs reactivos con desplazamiento dinámico contenido */}
      <div data-blob data-mx="0.05" data-my="0.05" data-ms="0"
        className={`absolute -top-10 -right-10 w-56 h-56 bg-[#59A6E4]/30 blur-[60px] rounded-full pointer-events-none transition-all duration-700 ${isHovered ? 'scale-110 opacity-90' : 'opacity-70'}`}
        style={{ willChange: 'transform' }} />
      <div data-blob data-mx="-0.04" data-my="-0.04" data-ms="0"
        className={`absolute -bottom-10 -left-10 w-48 h-48 bg-[#8AD0B2]/30 blur-[50px] rounded-full pointer-events-none transition-all duration-700 ${isHovered ? 'scale-110 opacity-90' : 'opacity-70'}`}
        style={{ willChange: 'transform' }} />

      <div className="relative z-10 flex items-center justify-between mb-4 md:mb-6 lg:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-semibold ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
              Panel de impacto circular.
            </p>
            {isHovered && (
              <span className={`inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse ${
                isDark ? 'bg-[#D6F391]/20 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Impacto en vivo.
              </span>
            )}
          </div>
          <p className={`text-[11px] sm:text-xs md:text-[11px] lg:text-xs font-medium ${ts}`}>
            Cálculo registrado · Pasaporte DPP activo.
          </p>
        </div>
        <div className={`w-7 h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-[#D6F391] flex items-center justify-center shrink-0 transition-all duration-500 cursor-pointer ${
          isHovered ? 'rotate-45 scale-110 shadow-[0_0_20px_rgba(214,243,145,0.8)]' : ''
        }`}>
          <Leaf size={14} className="text-[#474747]" />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 md:gap-2.5 lg:gap-4">
        {[
          { label: 'CO₂ mitigado', value: `${co2}`, unit: 'kg CO₂e evitados.' },
          { label: 'Agua ahorrada', value: `${water}K`, unit: 'Litros preservados.' },
          { label: 'Margen circular', value: `+${margin}%`, unit: 'vs. insumo virgen.' },
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
                ? 'bg-white/5  hover:bg-white/10'
                : 'bg-white/30  hover:bg-white/50'
            }`}
          >
            <span className={`text-[8px] sm:text-[9px] md:text-[8px] lg:text-[10px] font-bold leading-tight transition-colors duration-200 ${
              isDark ? 'text-[#D6F391]' : 'text-[#006B66]'
            }`}>
              {stat.label}
            </span>
            <span className={`glass-number text-xl sm:text-2xl md:text-xl lg:text-3xl font-black leading-none transition-transform duration-200 ${
              hoveredIndex === i ? 'scale-105' : ''
            } ${tp} sm:leading-[2rem] md:leading-[1.75rem] lg:leading-[2.25rem]`}>
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
          : isDark ? 'bg-white/5 ' : 'bg-white/20 '
      }`}>
        <div className="flex justify-between items-center mb-1.5 md:mb-2">
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-bold ${ts}`}>
            Tasa de circularidad.
          </span>
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-black transition-all duration-300 ${
            isHovered ? 'scale-110' : ''
          } ${isDark ? 'text-[#D6F391]' : 'text-[#006B66]'}`}>
            {circRate}%
          </span>
        </div>
        <div className={`relative h-1.5 md:h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#D6F391]/10' : 'bg-[#00827C]/10'}`}>
          <div
            className={`h-full bg-linear-to-r/srgb rounded-full transition-all duration-500 ${
              isDark ? 'from-[#D6F391] to-[#8AD0B2]' : 'from-[#00827C] to-[#D6F391]'
            }`}
            style={{ width: `${circRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── CategoryMetricsDisplay (Contadores dinámicos e interpolación suave) ─────
function CategoryMetricsDisplay({
  cat,
  isDark,
  ts
}: {
  cat: (typeof CATEGORIAS)[CatKey]
  isDark: boolean
  tp: string
  ts: string
}) {
  const [hoveredCard, setHoveredCard] = useState<'planeta' | 'bolsillo' | null>(null)
  const [planetaVal, setPlanetaVal] = useState<number>(cat.planetaNum)
  const [bolsilloVal, setBolsilloVal] = useState<number>(cat.bolsilloNum)
  const currentPlanetaRef = useRef<number>(cat.planetaNum)
  const currentBolsilloRef = useRef<number>(cat.bolsilloNum)

  const targetPlaneta = hoveredCard === 'planeta' ? Math.round(cat.planetaNum * 1.15) : cat.planetaNum
  const targetBolsillo = hoveredCard === 'bolsillo' ? Math.min(cat.bolsilloNum + 10, 95) : cat.bolsilloNum

  useEffect(() => {
    let animId: number
    const duration = 550
    const start = performance.now()
    const startPlaneta = currentPlanetaRef.current
    const startBolsillo = currentBolsilloRef.current

    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)

      const curP = Math.round(startPlaneta + (targetPlaneta - startPlaneta) * eased)
      const curB = Math.round(startBolsillo + (targetBolsillo - startBolsillo) * eased)

      currentPlanetaRef.current = curP
      currentBolsilloRef.current = curB
      setPlanetaVal(curP)
      setBolsilloVal(curB)

      if (progress < 1) {
        animId = requestAnimationFrame(step)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [cat.id, targetPlaneta, targetBolsillo])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:gap-4 lg:gap-6 mb-4 sm:mb-6 md:mb-6 lg:mb-8">
      {/* Planeta Card */}
      <div
        onMouseEnter={() => setHoveredCard('planeta')}
        onMouseLeave={() => setHoveredCard(null)}
        className={`p-3.5 sm:p-5 md:p-4 lg:p-6 rounded-xl md:rounded-2xl border cursor-pointer transition-all duration-300 ${
          hoveredCard === 'planeta'
            ? isDark
              ? `${cat.card1HoverDark} scale-105`
              : `${cat.card1HoverLight} scale-105`
            : isDark
            ? cat.card1Dark
            : cat.card1Light
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 md:mb-2 lg:mb-3">
          <Leaf size={16} className={`transition-transform duration-300 ${hoveredCard === 'planeta' ? 'scale-125 rotate-6' : ''} ${isDark ? cat.card1IconDark : cat.card1IconLight}`} />
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-bold ${isDark ? cat.card1LabelDark : cat.card1LabelLight}`}>
            Impacto ambiental evitado.
          </span>
        </div>
        <div className={`text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-black mb-0.5 md:mb-1 transition-colors duration-200 ${isDark ? cat.card1NumberDark : cat.card1NumberLight}`}>
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
              ? `${cat.card2HoverDark} scale-105`
              : `${cat.card2HoverLight} scale-105`
            : isDark
            ? cat.card2Dark
            : cat.card2Light
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 md:mb-2 lg:mb-3">
          <TrendingUp size={16} className={`transition-transform duration-300 ${hoveredCard === 'bolsillo' ? 'scale-125 rotate-6' : ''} ${isDark ? cat.card2IconDark : cat.card2IconLight}`} />
          <span className={`text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] font-bold ${isDark ? cat.card2LabelDark : cat.card2LabelLight}`}>
            Retorno y margen comercial estimado.
          </span>
        </div>
        <div className={`text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-black mb-0.5 md:mb-1 transition-colors duration-200 ${isDark ? cat.card2NumberDark : cat.card2NumberLight}`}>
          +{bolsilloVal}%
        </div>
        <p className={`text-[11px] sm:text-xs md:text-[11px] lg:text-xs font-medium ${ts}`}>{cat.bolsillo.detalle}</p>
      </div>
    </div>
  )
}

// Precios reales, publicados desde /admin/planes (config_planes) — llegan
// como prop desde page.tsx (Server Component), que los lee directo de la
// base antes de renderizar. Si por algún motivo no llegan (falla de red al
// cargar la página, por ejemplo), cada plan cae de vuelta a los números
// fijos de PLANS/ANNUAL_DISCOUNT como antes, para nunca romper la pantalla.
export interface PlanPrecioReal {
  id: 'free' | 'lab' | 'impulso' | 'ilimitado'
  precio_cop: number
  precio_usd: number
  precio_eur: number
  precio_anual_cop: number | null
  precio_anual_usd: number | null
  precio_anual_eur: number | null
  // Límites reales de config_planes. NULL = ilimitado, 0 = no incluye.
  limite_empleados: number | null
  limite_calculos_mes: number | null
  limite_informes_mes: number | null
  limite_cotizaciones_mes: number | null
  limite_dpp_mes: number | null
  incluye_ia: boolean
  // Personalización de capacidades (sql/131), editable desde /admin/contenido
  // -> Precios: MCI/ISO 59020 y exportación de Informes en Excel/CSV.
  incluye_mci: boolean
  incluye_excel_csv: boolean
  // Equivalente mensual del plan anual, editable a mano desde /admin/contenido
  // -> Precios. null = usar el cálculo automático (anual/12, redondeado hacia
  // abajo). El precio anual real (precio_anual_*) nunca se toca por esto.
  equivalente_mensual_anual_cop: number | null
  equivalente_mensual_anual_usd: number | null
  equivalente_mensual_anual_eur: number | null
  // Beneficios editables desde /admin/contenido -> Precios. null/[] = usa
  // el respaldo fijo de PLANS.
  features_json: string[] | null
}

export interface FilaComparativa {
  label: string
  tipo: 'check' | 'texto'
  valores: Record<string, string | boolean>
  // Texto opcional del tooltip "?" junto al nombre de la fila — para
  // explicar algo sin ocupar espacio permanente en la tabla.
  descripcion?: string
}
export interface CategoriaComparativa {
  nombre: string
  color: string
  filas: FilaComparativa[]
}
export const COMPARATIVA_DEFAULT: CategoriaComparativa[] = [
  {
    nombre: 'Capacidad y equipo',
    color: '#38B98E',
    filas: [
      { label: 'Personas en el equipo', tipo: 'texto', valores: { free: '1 persona', lab: '5 personas', impulso: '10 personas', ilimitado: 'Ilimitado' }, descripcion: 'Usuarios con acceso simultáneo a la plataforma' },
      { label: 'Puesta en marcha guiada', tipo: 'check', valores: { free: true, lab: true, impulso: true, ilimitado: true }, descripcion: 'Acompañamiento inicial para configurar tu cuenta' },
      { label: 'Canal de soporte', tipo: 'texto', valores: { free: false, lab: 'Formulario', impulso: 'Formulario', ilimitado: 'Prioritario 24/7' } },
    ]
  },
  {
    nombre: 'Módulos y funciones operativas',
    color: '#59A6E4',
    filas: [
      { label: 'Calculadora rápida de impacto', tipo: 'texto', valores: { free: '5 al mes', lab: 'En DPP', impulso: 'En DPP', ilimitado: 'En DPP' }, descripcion: 'Estimación inmediata de huella de carbono y agua' },
      { label: 'Pasaporte Digital de Producto (DPP)', tipo: 'texto', valores: { free: false, lab: '5 al mes', impulso: '200 al mes', ilimitado: 'Ilimitado' }, descripcion: 'Ficha pública interactiva con código QR verificable' },
      { label: 'Informes de impacto con sello QR', tipo: 'texto', valores: { free: false, lab: '5 al mes', impulso: '5 al mes', ilimitado: 'Ilimitado' }, descripcion: 'Informes ejecutivos con hash criptográfico de trazabilidad' },
      { label: 'Cotizador con CRM y embudo', tipo: 'texto', valores: { free: false, lab: false, impulso: '200 al mes', ilimitado: 'Ilimitado' }, descripcion: 'Gestión comercial de propuestas y clientes circulares' },
      { label: 'Asistente de Inteligencia Artificial', tipo: 'check', valores: { free: false, lab: false, impulso: true, ilimitado: true }, descripcion: 'Extracción automática de datos desde fotos y documentos' },
      { label: 'Catálogo y materiales propios', tipo: 'check', valores: { free: false, lab: true, impulso: true, ilimitado: true }, descripcion: 'Crea tus propias categorías y factores personalizados' },
      { label: 'Logo corporativo en documentos', tipo: 'check', valores: { free: false, lab: true, impulso: true, ilimitado: true } },
      { label: 'Exportación de informes en Excel y CSV', tipo: 'check', valores: { free: false, lab: false, impulso: false, ilimitado: true } },
      { label: 'Exportación de datos', tipo: 'texto', valores: { free: false, lab: 'PDF con QR', impulso: 'PDF corporativo', ilimitado: 'Excel, CSV y PDF' } },
    ]
  },
  {
    nombre: 'Los 9 cálculos técnicos de impacto',
    color: '#00827C',
    filas: [
      { label: '1. Huella de carbono (CO₂ eq)', tipo: 'check', valores: { free: true, lab: true, impulso: true, ilimitado: true }, descripcion: 'Emisiones de gases de efecto invernadero evitadas' },
      { label: '2. Huella hídrica (Agua preservada)', tipo: 'check', valores: { free: true, lab: true, impulso: true, ilimitado: true }, descripcion: 'Litros de agua potable preservados' },
      { label: '3. Desvío de vertedero', tipo: 'check', valores: { free: false, lab: true, impulso: true, ilimitado: true }, descripcion: 'Kilogramos y toneladas no enviadas a relleno' },
      { label: '4. Índice circular (% circularidad)', tipo: 'check', valores: { free: false, lab: true, impulso: true, ilimitado: true }, descripcion: 'Porcentaje de material recuperado y renovable' },
      { label: '5. Ahorro en compras', tipo: 'check', valores: { free: false, lab: true, impulso: true, ilimitado: true }, descripcion: 'Capital preservado frente a insumos vírgenes' },
      { label: '6. Retorno de inversión circular (ROI)', tipo: 'check', valores: { free: false, lab: false, impulso: true, ilimitado: true }, descripcion: 'Beneficio neto frente al costo de reacondicionamiento' },
      { label: '7. Costo total de propiedad (TCO)', tipo: 'check', valores: { free: false, lab: false, impulso: true, ilimitado: true }, descripcion: 'Gasto real a lo largo de la vida útil' },
      { label: '8. Mitigación acumulada por ciclos', tipo: 'check', valores: { free: false, lab: false, impulso: true, ilimitado: true }, descripcion: 'Impacto acumulado en sucesivos reúsos' },
      { label: '9. Índice de Flujo Lineal (MCI - ISO 59020)', tipo: 'check', valores: { free: false, lab: false, impulso: false, ilimitado: true }, descripcion: 'Medición de circularidad estandarizada internacional' },
    ]
  },
]

interface LandingClientProps {
  planesPrecios?: PlanPrecioReal[]
  whatsappNumero?: string
  faqItems?: { pregunta: string; respuesta: string }[]
  comparativaCategorias?: CategoriaComparativa[]
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function LandingClient({ planesPrecios, whatsappNumero, faqItems, comparativaCategorias }: LandingClientProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CatKey>('mobiliario')
  const [currency, setCurrency] = useState<keyof typeof CURRENCIES>('COP')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [isDark, setIsDark] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [catalogoCalculosAbierto, setCatalogoCalculosAbierto] = useState(false)
  const [comparativaAbierta, setComparativaAbierta] = useState(false)

  // Misma acción que el botón de cada tarjeta de precios (Empezar
  // gratis/Hablar con un asesor), pero disparada desde el nombre del plan
  // en el popup "Compara" — cierra ese popup primero para que no quede
  // debajo del modal de contacto o de la navegación a /registro.
  function irAPlan(plan: typeof PLANS[0]) {
    setComparativaAbierta(false)
    if (plan.priceMonthlyCOP === 0) {
      router.push('/registro')
    } else {
      setSelectedPlan(plan.name)
      setContactModalOpen(true)
    }
  }

  // Cerrar modal con Escape y bloquear scroll cuando está abierto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContactModalOpen(false)
    }
    if (contactModalOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [contactModalOpen])

  // Refs para navegación y sticky scroll de Industrias
  const sectionCategoriasRef = useRef<HTMLElement>(null)
  const activeCategoryRef = useRef<CatKey>('mobiliario')
  const mobileTabsScrollRef = useRef<HTMLDivElement>(null)

  // Refs de movimiento (sin re-renders)
  const mouseXRef = useRef(0)
  const mouseYRef = useRef(0)
  const scrollYRef = useRef(0)

  // Función para navegar a una categoría específica
  const scrollToCategory = (key: CatKey) => {
    setActiveCategory(key)
    activeCategoryRef.current = key
    const section = sectionCategoriasRef.current
    if (section) {
      // Offset de navbar
      const rect = section.getBoundingClientRect()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const targetY = rect.top + scrollTop - 80 // dejar margen superior
      window.scrollTo({ top: targetY, behavior: 'smooth' })
    }
  }

  // Auto-centrado del tab activo en la barra móvil (scroll horizontal, no
  // vertical). Bug real encontrado el 2026-09-02: este efecto también
  // disparaba en el primer montaje de la página — como el botón vive dentro
  // de la sección de Industrias, muy abajo, todavía no era visible, y
  // scrollIntoView({block:'nearest'}) terminaba desplazando TODA la página
  // (no solo el carrillo horizontal) para hacerlo visible, saltándose el
  // Hero por completo al cargar. Se salta la primera vez a propósito, solo
  // se auto-centra en cambios reales de categoría (clic o scroll dentro de
  // la sección), nunca en la carga inicial.
  const primerCentradoRef = useRef(true)
  useEffect(() => {
    if (!mounted) return
    if (primerCentradoRef.current) {
      primerCentradoRef.current = false
      return
    }
    const activeBtn = document.getElementById(`mobile-tab-${activeCategory}`)
    if (activeBtn && mobileTabsScrollRef.current) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeCategory, mounted])

  useEffect(() => {
    setMounted(true)

    // Sincronización reactiva del tema con data-theme y localStorage
    const checkTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme')
      setIsDark(currentTheme === 'dark')
    }

    const stored = localStorage.getItem('theme') || localStorage.getItem('reuso-theme')
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored)
    }
    checkTheme()

    const themeObserver = new MutationObserver(checkTheme)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // Escuchador pasivo para animaciones y navbar (scroll normal)
    const handleScroll = () => { 
      scrollYRef.current = window.scrollY
    }

    const handleMouse = (e: MouseEvent) => {
      mouseXRef.current = e.clientX - window.innerWidth / 2
      mouseYRef.current = e.clientY - window.innerHeight / 2
    }
    // El parallax de los blobs solo reacciona al mouse (todo data-blob de
    // esta página usa data-ms="0", el scroll nunca los mueve en la
    // práctica) — en un celular sin mouse no hay nada que animar, así que
    // ni se registran los listeners ni se arranca el loop de abajo. Antes
    // corría siempre, para siempre, sin aportar nada visual en táctil y
    // compitiendo por el hilo principal contra las animaciones de entrada
    // (whileInView), que en celulares se veían "en flash" por los frames
    // perdidos.
    const tieneMouseReal = window.matchMedia('(pointer: fine)').matches
    let rafId: number | undefined

    if (tieneMouseReal) {
      window.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('mousemove', handleMouse, { passive: true })

      // rAF + lerp para blobs (cero re-renders de React). Los elementos
      // [data-blob] son fijos en el árbol (nunca se montan/desmontan), así
      // que se consultan UNA sola vez aquí — antes se hacía un
      // querySelectorAll sobre toda la página en cada uno de los 60 frames
      // por segundo, para siempre.
      const blobs = Array.from(document.querySelectorAll<HTMLElement>('[data-blob]')).map(el => ({
        el,
        mx: parseFloat(el.dataset.mx ?? '0'),
        my: parseFloat(el.dataset.my ?? '0'),
        ms: parseFloat(el.dataset.ms ?? '0'),
      }))
      let smoothX = 0, smoothY = 0
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t
      const tick = () => {
        smoothX = lerp(smoothX, mouseXRef.current, 0.1)
        smoothY = lerp(smoothY, mouseYRef.current, 0.1)
        const sy = scrollYRef.current
        for (const { el, mx, my, ms } of blobs) {
          el.style.transform = `translate(${smoothX * mx}px, ${smoothY * my + sy * ms}px)`
        }
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }

    return () => {
      themeObserver.disconnect()
      if (tieneMouseReal) {
        window.removeEventListener('scroll', handleScroll)
        window.removeEventListener('mousemove', handleMouse)
        if (rafId !== undefined) cancelAnimationFrame(rafId)
      }
    }
  }, [])

  // Sincronización con hash de URL (#mobiliario, #textil, etc.)
  useEffect(() => {
    if (!mounted) return
    const handleHash = () => {
      const h = window.location.hash.replace('#', '').toLowerCase()
      if (h in CATEGORIAS) {
        scrollToCategory(h as CatKey)
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [mounted])

  // Detección dinámica del footer para botones flotantes (WhatsApp y Te llamamos)
  const [footerOverlap, setFooterOverlap] = useState(0)

  const [isMobileScreen, setIsMobileScreen] = useState(false)

  useEffect(() => {
    if (!mounted) return
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth < 768)
    }
    checkScreen()
    window.addEventListener('resize', checkScreen, { passive: true })
    return () => window.removeEventListener('resize', checkScreen)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const checkFooter = () => {
      const footer = document.getElementById('site-footer') || document.querySelector('footer')
      if (!footer) return
      const rect = footer.getBoundingClientRect()
      const windowH = window.innerHeight
      if (rect.top < windowH) {
        setFooterOverlap(windowH - rect.top)
      } else {
        setFooterOverlap(0)
      }
    }
    checkFooter()
    window.addEventListener('scroll', checkFooter, { passive: true })
    window.addEventListener('resize', checkFooter, { passive: true })
    return () => {
      window.removeEventListener('scroll', checkFooter)
      window.removeEventListener('resize', checkFooter)
    }
  }, [mounted])

  const menuGroups: MenuGroup[] = [
    {
      name: 'Cálculos',
      link: '#calculos',
      items: [
        { name: 'Comparativa de Impacto', link: '#comparativa' },
        { name: 'Pasaporte Digital de Producto (DPP)', link: '#dpp' },
        { name: '9 Cálculos de impacto', link: '#calculos' },
      ]
    },
    {
      name: 'Industrias',
      link: '#categorias',
      items: [
        { name: 'Mobiliario y diseño interior', link: '#categorias', onClick: () => scrollToCategory('mobiliario') },
        { name: 'Indumentaria y moda', link: '#categorias', onClick: () => scrollToCategory('indumentaria') },
        { name: 'Textil y fibras', link: '#categorias', onClick: () => scrollToCategory('textil') },
        { name: 'Upcycling y residuos', link: '#categorias', onClick: () => scrollToCategory('upcycling') },
      ]
    },
    {
      name: 'Metodología',
      link: '#proceso',
      items: [
        { name: 'Soluciones que te ayudan a mostrar tu sostenibilidad', link: '#proceso' },
        { name: 'Diagnóstico visual con IA', link: '#ia' },
        { name: 'Impacto al Objetivo 12 de la ONU', link: '#ods-12' },
        { name: 'Preguntas frecuentes', link: '#faq' },
      ]
    },
    {
      name: 'Planes',
      link: '#planes',
    }
  ]

  const searchResults = [
    { title: 'Comparativa de impacto: intenciones a resultados reales', link: '#comparativa' },
    { title: '9 Cálculos ambientales, económicos y sociales', link: '#calculos' },
    { title: 'Pasaporte Digital de Producto (DPP) y trazabilidad', link: '#dpp' },
    { title: '¿Cuánto valor recupera tu empresa con economía circular?', link: '#categorias' },
    { title: 'Mobiliario y diseño interior', link: '#categorias', onClick: () => scrollToCategory('mobiliario') },
    { title: 'Indumentaria y calzado', link: '#categorias', onClick: () => scrollToCategory('indumentaria') },
    { title: 'Textil y fibras', link: '#categorias', onClick: () => scrollToCategory('textil') },
    { title: 'Upcycling y residuos voluminosos', link: '#categorias', onClick: () => scrollToCategory('upcycling') },
    { title: 'Soluciones que te ayudan a mostrar tu sostenibilidad', link: '#proceso' },
    { title: 'Planes de medición y pasaportes digitales', link: '#planes' },
    { title: 'Diagnóstico visual con Inteligencia Artificial', link: '#ia' },
    { title: 'Impacto al Objetivo 12 de la ONU', link: '#ods-12' },
    { title: 'Preguntas frecuentes (FAQ)', link: '#faq' },
  ]

  const liquidGlass = isDark
    ? 'bg-[#474747]/35 backdrop-blur-[60px] backdrop-saturate-200 border border-white/10 shadow-2xl'
    : 'bg-white/35 backdrop-blur-[60px] backdrop-saturate-180 border border-[#00827C]/10 shadow-[0_12px_40px_rgba(0,130,124,0.06),inset_0_2px_4px_rgba(255,255,255,0.4)]'

  // Busca el precio real publicado (config_planes) para este plan y moneda.
  // Si no llegó ningún dato del servidor, o falta ese plan puntual, cae de
  // vuelta al cálculo fijo de antes (priceMonthlyCOP + tasa de conversión)
  // — la pantalla nunca se rompe por falta de datos.
  const precioReal = (plan: typeof PLANS[0]) => planesPrecios?.find(p => p.id === plan.id)

  // Beneficios de valor nuevos (sin repetir las cuotas de arriba: equipo, DPP, informes, cotizaciones)
  const bulletsPlan = (plan: typeof PLANS[0]): string[] => {
    const real = precioReal(plan)
    const raw = (real?.features_json?.length ? real.features_json : plan.features)

    // Filtra textos repetitivos que dupliquen las cajas superiores o incluyan cuotas de volumen
    let lista = raw.filter(b => {
      const texto = b.trim().toLowerCase()
      if (/^\d+\s*(pasaportes?|informes?|cálculos?|personas?|cotizaciones?)/i.test(texto)) return false
      if (/al mes|por mes|en cada dpp/i.test(texto)) return false
      return true
    })
    if (lista.length < 2) lista = [...plan.features]

    // Capacidades de IA:
    const tieneIA = real ? Boolean(real.incluye_ia) : (plan.id === 'impulso' || plan.id === 'ilimitado')
    if (!tieneIA) {
      lista = lista.filter(b => !/asistente.*ia|inteligencia artificial/i.test(b))
    } else if (!lista.some(b => /asistente.*ia|inteligencia artificial/i.test(b))) {
      lista.push('Asistente de Inteligencia Artificial para documentos')
    }

    // Indicador de Circularidad de Materiales (MCI, ISO 59020):
    const tieneMCI = real ? Boolean(real.incluye_mci) : (plan.id === 'ilimitado')
    if (!tieneMCI) {
      lista = lista.filter(b => !/mci|iso 59020|circularidad de materiales/i.test(b))
    } else if (!lista.some(b => /mci|iso 59020|circularidad de materiales/i.test(b))) {
      lista.push('Indicador de Circularidad de Materiales (MCI e ISO 59020)')
    }

    // Informes en Excel y CSV:
    const tieneExcel = real ? Boolean(real.incluye_excel_csv) : (plan.id === 'ilimitado')
    if (!tieneExcel) {
      lista = lista.filter(b => !/excel y csv|csv y excel|informes en excel/i.test(b))
    } else if (!lista.some(b => /excel y csv|csv y excel|informes en excel/i.test(b))) {
      lista.push('Exportación de informes en Excel y CSV')
    }

    // Tope máximo de 5 checks por plan, siendo el primero el que tenga menos
    const maxChecks = plan.id === 'free' ? 2 : 5
    return lista.slice(0, maxChecks)
  }

  // Regla general de diseño: los decimales van en la misma línea, pero más pequeños
  // (como en /admin/contenido), sin desfasar la altura de línea.
  //
  // El separador de decimales depende de la moneda: COP y EUR usan coma
  // (,), USD usa punto (.) — y en USD la coma es el separador de MILES
  // ("1,199.00"), no de decimales. Buscar "," a ciegas cortaba el número
  // en el lugar equivocado (o nunca encontraba nada en "399.00"), bug real
  // reportado: los decimales nunca se veían chicos en dólares. Se busca la
  // ÚLTIMA aparición del separador real de esa moneda, nunca la primera —
  // así conviven con separadores de miles sin confundirse.
  const conDecimalesChicos = (formateado: string, moneda: keyof typeof CURRENCIES) => {
    const separador = moneda === 'USD' ? '.' : ','
    const idx = formateado.lastIndexOf(separador)
    if (idx === -1) return <span>{formateado}</span>
    const entero = formateado.slice(0, idx)
    const decimales = formateado.slice(idx)
    return (
      <span>
        {entero}
        <span style={{ fontSize: '0.8em', fontWeight: 'inherit' }}>{decimales}</span>
      </span>
    )
  }

  // En la landing o cotizaciones NUNCA hay redondeo: "El redondeo solo es para /admin/contenido;
  // de resto nunca hay redondeo. El precio que es es el que se muestra" — Regla de negocio 2026-09-11.
  const formatPrice = (plan: typeof PLANS[0]) => {
    if (plan.priceMonthlyCOP === 0) return 'Gratis'
    const real = precioReal(plan)
    const c = CURRENCIES[currency]

    if (real) {
      const mensual = currency === 'COP' ? real.precio_cop : currency === 'USD' ? real.precio_usd : real.precio_eur
      const anual = currency === 'COP' ? real.precio_anual_cop : currency === 'USD' ? real.precio_anual_usd : real.precio_anual_eur
      const equivalenteGuardado = currency === 'COP' ? real.equivalente_mensual_anual_cop : currency === 'USD' ? real.equivalente_mensual_anual_usd : real.equivalente_mensual_anual_eur

      if (billing === 'annual') {
        // Si el equivalente mensual está editado a mano desde /admin/contenido
        // -> Precios, se respeta tal cual. Si no, se calcula igual que el
        // valor por defecto que ya ve el admin en esa pantalla (piso, sin
        // decimales sueltos) — antes esto SIEMPRE recalculaba anual/12 en
        // crudo e ignoraba el campo editable por completo, mostrando
        // decimales que nunca coincidían con lo publicado. Bug real
        // encontrado 2026-09-13.
        const bruto = (anual ?? mensual * 10) / 12
        const finalAmount = equivalenteGuardado ?? (
          currency === 'COP' ? Math.floor(bruto / 10000) * 10000 : Math.floor(bruto)
        )
        const str = currency === 'COP' ? formatearPrecioColombiano(finalAmount, true) : c.format(finalAmount)
        return <>{c.symbol}{conDecimalesChicos(str, currency)}</>
      }

      const str = currency === 'COP' ? formatearPrecioColombiano(mensual, true) : c.format(mensual)
      return <>{c.symbol}{conDecimalesChicos(str, currency)}</>
    }

    if (billing === 'annual') {
      const finalAmount = (plan.priceMonthlyCOP * c.rate * 10) / 12
      const str = currency === 'COP' ? formatearPrecioColombiano(finalAmount, true) : c.format(finalAmount)
      return <>{c.symbol}{conDecimalesChicos(str, currency)}</>
    }

    const mensual = plan.priceMonthlyCOP * c.rate
    const str = currency === 'COP' ? formatearPrecioColombiano(mensual, true) : c.format(mensual)
    return <>{c.symbol}{conDecimalesChicos(str, currency)}</>
  }

  // El pago anual (a diferencia del precio mensual y el equivalente
  // mensual) NUNCA lleva decimales, en ninguna moneda — es un total, no un
  // precio unitario. Se redondea al entero y se formatea sin fracción.
  const getAnnualTotal = (plan: typeof PLANS[0]) => {
    const c = CURRENCIES[currency]
    const formatearSinDecimales = (n: number) =>
      `${c.symbol}${currency === 'COP' ? formatearPrecioColombiano(Math.round(n), false) : Math.round(n).toLocaleString(currency === 'EUR' ? 'de-DE' : 'en-US')}`
    const real = precioReal(plan)
    if (real) {
      const mensual = currency === 'COP' ? real.precio_cop : currency === 'USD' ? real.precio_usd : real.precio_eur
      const anual = currency === 'COP' ? real.precio_anual_cop : currency === 'USD' ? real.precio_anual_usd : real.precio_anual_eur
      return formatearSinDecimales(anual ?? mensual * 10)
    }
    const amount = plan.priceMonthlyCOP * c.rate * 10
    return formatearSinDecimales(amount)
  }

  // Las 4 cuotas del plan (equipo, cálculos/dpp, informes/mes,
  // cotizaciones/mes), tomadas de config_planes (reemplazables desde
  // /admin/contenido). Explora muestra 'Cálculos' (5 por mes) y los demás
  // muestran 'Pasaporte DPP' (5, 200 o Ilimitado por mes) que absorbe los cálculos.
  const cuotasPlan = (plan: typeof PLANS[0]): { etiqueta: string; valor: string }[] => {
    const real = precioReal(plan)
    const porMes = (v: number | null | undefined, cero: string): string => {
      if (v === null || v === undefined) return 'Ilimitado'
      if (v === 0) return cero
      return `${v.toLocaleString('es-CO')} por mes`
    }

    if (plan.id === 'free') {
      const empleadosValor = real?.limite_empleados == null ? '1 persona' : `${real.limite_empleados} ${real.limite_empleados === 1 ? 'persona' : 'personas'}`
      const calculosValor = real?.limite_calculos_mes != null ? porMes(real.limite_calculos_mes, '5 por mes') : '5 por mes'
      const dppValor = real?.limite_dpp_mes != null ? porMes(real.limite_dpp_mes, 'No incluye') : 'No incluye'
      return [
        { etiqueta: 'Equipo', valor: empleadosValor },
        { etiqueta: 'Cálculos', valor: calculosValor },
        { etiqueta: 'Pasaporte DPP', valor: dppValor },
        { etiqueta: 'Informes', valor: 'No incluye' },
      ]
    }

    const empleadosValor = real ? (real.limite_empleados == null ? 'Ilimitado' : `${real.limite_empleados} ${real.limite_empleados === 1 ? 'persona' : 'personas'}`) : plan.limits.empleados
    const dppValor = real ? porMes(real.limite_dpp_mes, 'No incluye') : (plan.id === 'ilimitado' ? 'Ilimitado' : (plan.id === 'impulso' ? '200 por mes' : '5 por mes'))
    const informesValor = real ? porMes(real.limite_informes_mes, 'No incluye') : plan.limits.informes
    const cotizacionesValor = real ? porMes(real.limite_cotizaciones_mes, 'No incluye') : plan.limits.cotizaciones

    return [
      { etiqueta: 'Equipo', valor: empleadosValor },
      { etiqueta: 'Pasaporte DPP', valor: dppValor },
      { etiqueta: 'Informes', valor: informesValor },
      { etiqueta: 'Cotizaciones', valor: cotizacionesValor },
    ]
  }

  const cat = CATEGORIAS[activeCategory]
  const tp = isDark ? 'text-white' : 'text-[#474747]'
  const ts = isDark ? 'text-white/70' : 'text-[#474747]/80'

  // Offset dinámico para botones flotantes:
  // En móvil: mínimo 98px para estar sobre la barra de navegación móvil (88px altura + 10px margen),
  // y cuando el footer entra al viewport sube para detenerse justo antes de que comience el footer.
  // En desktop: base 24px, y sube con el footer.
  const floatingBottomOffset = isMobileScreen
    ? Math.max(98, footerOverlap + 20)
    : Math.max(24, footerOverlap + 24)

  // Bug real corregido (auditoría 2026-09-03): antes había un
  // `if (!mounted) return null` aquí, que dejaba TODA la página vacía en el
  // servidor (sin H1, sin texto, sin nada) hasta que el navegador terminara
  // de ejecutar el JavaScript — confirmado en vivo, el HTML crudo no traía
  // ni un solo encabezado. `isDark`/`isMobileScreen`/`footerOverlap` ya
  // tienen valores iniciales seguros para el servidor (false/0), así que el
  // primer render ya no depende de `mounted` para nada — el diseño visual
  // no cambió en absoluto, solo el momento en que el contenido aparece.

  return (
    <LazyMotion features={domAnimation}>
      <div
        className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'bg-[#474747] text-white' : 'bg-primary text-[#474747]'}`}
        style={{ overflowX: 'clip' }}
      >
      {/* ESTILOS GLOBALES Y ANIMACIONES MODERNAS */}
      <style jsx global>{`
        html { scroll-behavior: smooth; scroll-padding-top: 96px; }
        @keyframes glassStatIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) scale(1);       filter: blur(0); }
        }
        @keyframes glassGlow {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50%      { text-shadow: 0 0 24px rgba(138,208,178,0.5), 0 0 48px rgba(89,166,228,0.22); }
        }
        @keyframes glassPulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes shimmerGlow {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        .animate-shimmer {
          position: relative;
          overflow: hidden;
        }
        .animate-shimmer::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.22),
            transparent
          );
          transform: rotate(30deg);
          animation: shimmerGlow 4s infinite ease-in-out;
          pointer-events-none;
        }
        @keyframes floatGentle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-7px) rotate(0.4deg); }
        }
        @keyframes floatGentleReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(7px) rotate(-0.4deg); }
        }
        .animate-float-hero { animation: floatGentle 5.5s ease-in-out infinite; }
        .animate-float-hero-delayed { animation: floatGentleReverse 6.5s ease-in-out infinite 0.8s; }
        .glass-stat  { animation: glassStatIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .glass-stat:nth-child(1) { animation-delay: 0.08s; }
        .glass-stat:nth-child(2) { animation-delay: 0.16s; }
        .glass-stat:nth-child(3) { animation-delay: 0.24s; }
        .glass-number   { animation: glassGlow 3s ease-in-out infinite; }
        .glass-subtitle { animation: glassPulse 3s ease-in-out infinite; }
        .hover-card-interactive {
          transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
                      box-shadow 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
                      border-color 0.35s ease;
        }
        .hover-card-interactive:hover {
          transform: translateY(-5px) scale(1.012);
        }
        .hover-icon-interactive {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .hover-icon-interactive {
          transform: scale(1.2) rotate(-5deg);
        }
      `}</style>

      <LandingHeader
        menuGroups={menuGroups}
        searchResults={searchResults}
        isDark={isDark}
        onContactClick={() => {
          setSelectedPlan(null)
          setContactModalOpen(true)
        }}
        extraActions={
          <>
            <Link href="/registro" className={`px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-base font-bold transition-all whitespace-nowrap hover:scale-105 active:scale-95 ${isDark ? 'bg-[#D6F391] text-[#474747] hover:opacity-90 shadow-[0_4px_16px_rgba(214,243,145,0.2)]' : 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-[0_4px_16px_rgba(0,130,124,0.25)]'}`}>
              Empezar gratis
            </Link>
            <Link href="/login" className={`inline-flex px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border text-xs sm:text-base font-bold transition-all hover:scale-105 active:scale-95 ${isDark ? 'border-[#D6F391]/20 text-white hover:bg-[#D6F391]/5' : 'border-[#00827C]/20 text-[#474747] hover:bg-[#00827C]/5'}`}>
              Entrar
            </Link>
          </>
        }
      />

      {/* ── SECCIÓN 1 - HERO ───────────────────────────────────────────────── */}
      <section id="hero" className="scroll-mt-28 pt-[124px] sm:pt-[136px] md:pt-[154px] lg:pt-[168px] pb-8 sm:pb-10 md:pb-12 px-4 sm:px-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
          {/* Texto izquierdo animado (Mayor ancho para H1 prominente en 3 líneas) */}
          <div className="animate-float-hero lg:col-span-7 xl:col-span-7">
            <p className={`text-sm sm:text-base font-semibold mb-3 md:mb-4 ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
              Software de sostenibilidad para tu empresa.
            </p>
            
            <h1 className={`text-3xl sm:text-4xl md:text-[2.2rem] lg:text-[2.4rem] xl:text-[2.8rem] font-black tracking-tight leading-[1.14] mb-4 md:mb-5 ${tp} sm:leading-[2.5rem]`}>
              <span className="block">Mide, gestiona y comparte</span>
              <span className="block whitespace-normal sm:whitespace-nowrap">tu impacto social y ambiental</span>
              <span className="block">con trazabilidad en cada acción</span>
            </h1>

            <p className={`text-sm sm:text-base md:text-sm lg:text-base font-medium leading-relaxed mb-6 md:mb-8 max-w-xl ${ts} sm:leading-[1.5rem] md:leading-[1.25rem] lg:leading-[1.5rem]`}>
              Emite Pasaportes Digitales (DPP) con QR y genera informes de datos para tus reportes de RSE y ESG que respaldan tus compromisos ante clientes y aliados.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
              <a 
                href="#planes" 
                className={`animate-shimmer inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all duration-300 hover:-translate-y-1 hover:scale-105 active:scale-95 ${
                  isDark 
                    ? 'bg-[#D6F391] text-[#474747] hover:opacity-90 shadow-[0_8px_32px_rgba(214,243,145,0.3)]' 
                    : 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-[0_8px_32px_rgba(0,130,124,0.35)]'
                }`}
              >
                Conoce tu impacto <ArrowRight size={15} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a 
                href="#calculos" 
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-5 sm:py-3 rounded-full border font-bold text-sm sm:text-base backdrop-blur-xs transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                  isDark 
                    ? 'border-[#D6F391]/25 text-[#D6F391] hover:bg-[#D6F391]/10' 
                    : 'border-[#00827C]/25 text-[#00827C] '
                }`}
              >
                Explora los cálculos
              </a>
            </div>
          </div>

          {/* Tarjeta interactiva derecha (Espacio optimizado y compacto) */}
          <div className="animate-float-hero-delayed lg:col-span-5 xl:col-span-5 w-full max-w-lg mx-auto lg:max-w-none">
            <HeroImpactPanel isDark={isDark} tp={tp} ts={ts} liquidGlass={liquidGlass} />
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 2 - COMPARATIVA ───────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="comparativa" className="scroll-mt-28 py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10 text-center max-w-3xl mx-auto">
            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
              El valor de medir tu sostenibilidad: <br className="hidden sm:block" />
              de buenas intenciones a resultados
            </h2>
            <p className={`text-sm sm:text-base md:text-base lg:text-base font-medium max-w-2xl mx-auto ${ts}`}>
              Potencia tus esfuerzos circulares con datos tangibles. Entrega a tus clientes corporativos y comités de compras métricas técnicas auditables que respaldan cada propuesta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
            {/* Lineal */}
            <div className={`group p-5 sm:p-6 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl lg:rounded-4xl border reveal-card hover-card-interactive ${isDark ? 'border-white/10 bg-[#525252]/30 hover:border-white/20' : 'border-[#474747]/10 bg-[#474747]/3 hover:border-[#474747]/20'}`}>
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-xl bg-[#FF5E4B]/10 flex items-center justify-center hover-icon-interactive">
                  <X size={18} strokeWidth={2.5} className="text-[#FF5E4B]" />
                </div>
                <h3 className={`text-base md:text-base lg:text-lg font-black ${tp}`}>
                  La manera de siempre <br />
                  Hacer las cosas sin estimar tu impacto
                </h3>
              </div>
              <ul className="space-y-2.5 sm:space-y-3 md:space-y-3.5 lg:space-y-4">
                {[
                  'Depender de estimaciones informales y ceder terreno comercial ante competidores con métricas estructuradas.',
                  'Gestionar activos a ciegas sin cuantificar el ahorro económico real de la recuperación.',
                  'Exponer la reputación de marca al comunicar sostenibilidad sin respaldo técnico auditable.',
                  'Amortizar inventario a pérdida por falta de trazabilidad en el ciclo de vida del producto.',
                ].map((item, i) => (
                  <li key={i} className="group/item flex gap-2.5 md:gap-3 items-start transition-all duration-200 hover:translate-x-1">
                    <div className={`mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover/item:scale-125 group-hover/item:rotate-6 group-hover:scale-110 ${
                      isDark
                        ? 'bg-[#FF5E4B]/20 text-[#FF5E4B] group-hover/item:bg-[#FF5E4B] group-hover/item:text-white'
                        : 'bg-[#FF5E4B]/15 text-[#FF5E4B] group-hover/item:bg-[#FF5E4B] group-hover/item:text-white'
                    }`}>
                      <X size={10} strokeWidth={3} className="transition-transform duration-300" />
                    </div>
                    <span className={`text-sm sm:text-base md:text-sm lg:text-sm font-medium leading-relaxed ${ts} sm:leading-[1.5rem] md:leading-[1.25rem] lg:leading-[1.25rem]`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Circular */}
            <div
              style={{
                isolation: 'isolate',
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                animationDelay: '0.15s',
              }}
              className={`relative group p-5 sm:p-6 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl lg:rounded-4xl overflow-hidden reveal-card hover-card-interactive ${liquidGlass}`}
            >
              <div data-blob data-mx="0.04" data-my="0.04" data-ms="0"
                className="absolute -top-6 -right-6 w-32 h-32 bg-[#8AD0B2]/35 blur-[35px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div data-blob data-mx="-0.03" data-my="-0.03" data-ms="0"
                className="absolute -bottom-6 -left-6 w-28 h-28 bg-[#D6F391]/30 blur-[30px] rounded-full pointer-events-none"
                style={{ willChange: 'transform' }} />
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className={`w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center hover-icon-interactive ${isDark ? 'bg-[#D6F391]/10' : 'bg-[#00827C]/10'}`}>
                  <Check size={18} strokeWidth={2.5} className={isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} />
                </div>
                <h3 className={`text-base md:text-base lg:text-lg font-black ${tp}`}>
                  Calculadora de Reúso <br />
                  Mide tu sostenibilidad y aprovecha la gestión circular
                </h3>
              </div>
              <ul className="relative z-10 space-y-2.5 sm:space-y-3 md:space-y-3.5 lg:space-y-4 mt-4 md:mt-6">
                {[
                  'Cálculos de huella de carbono e hídrica respaldados en factores de emisión oficiales (IPCC y GHG Protocol).',
                  'Pasaportes Digitales de Producto (DPP) con código QR y trazabilidad criptográfica para tus clientes.',
                  'Cotizaciones comerciales que estiman el ahorro económico y ambiental en minutos.',
                  'Informes de sostenibilidad y responsabilidad social listos para descargar en PDF y presentar ante clientes, juntas y auditorías.',
                ].map((item, i) => (
                  <li key={i} className="group/item flex gap-2.5 md:gap-3 items-start transition-all duration-200 hover:translate-x-1">
                    <div className={`mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover/item:scale-125 group-hover/item:rotate-6 group-hover:scale-110 ${
                      isDark
                        ? 'bg-[#D6F391]/20 text-[#D6F391] group-hover/item:bg-[#D6F391] group-hover/item:text-[#474747]'
                        : 'bg-[#00827C]/15 text-[#00827C] group-hover/item:bg-[#00827C] group-hover/item:text-white'
                    }`}>
                      <Check size={10} strokeWidth={3} className="transition-transform duration-300" />
                    </div>
                    <span className={`text-sm sm:text-base md:text-sm lg:text-sm font-bold leading-relaxed ${ts} sm:leading-[1.5rem] md:leading-[1.25rem] lg:leading-[1.25rem]`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN DPP - TRAZABILIDAD ────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="dpp" className="scroll-mt-28 py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center justify-center">
            {/* Diagrama animado: solo tablet y escritorio */}
            <div className="hidden md:flex lg:col-span-7 w-full max-w-2xl mx-auto lg:max-w-none items-center justify-center">
              <DppTrazabilidadVisual isDark={isDark} />
            </div>

            <div className="w-full max-w-2xl mx-auto lg:max-w-none lg:col-span-5 flex flex-col justify-center">
              <p className={`text-sm sm:text-base font-semibold mb-2 ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
                Pasaporte Digital de Producto (DPP)
              </p>
              <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-[2rem] font-extrabold tracking-tight mb-4 sm:mb-5 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem]`}>
                Une cada punto,{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: isDark ? 'linear-gradient(90deg, #F6BF3E, #D6F391 30%, #8AD0B2 65%, #59A6E4)' : 'linear-gradient(90deg, #38B98E, #00827C 55%, #59A6E4)' }}>
                  desde el residuo hasta su nuevo uso
                </span>
              </h2>

              <p className={`text-sm sm:text-base font-medium leading-relaxed mb-3 ${ts} sm:leading-[1.5rem]`}>
                Tu trazabilidad empieza donde otras terminan. Los pasaportes tradicionales nacen en la fábrica, con el producto nuevo. El tuyo nace cuando alguien quiso desecharlo. Registras de dónde tomaste el residuo, en qué lo transformaste y a dónde llegó, y demuestras con datos que tu operación es sostenible.
              </p>
              <p className={`text-sm sm:text-base font-medium leading-relaxed mb-6 sm:mb-7 ${ts} sm:leading-[1.5rem]`}>
                Llega antes que la norma. Europa ya lo incorpora. En LATAM todavía es opcional, y quien registra hoy llega listo cuando sus clientes lo pidan.
              </p>

              <p className={`text-sm sm:text-base font-black mb-3 ${tp}`}>Lo que demuestras con cada pasaporte</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { icon: MapPin, texto: 'De dónde tomaste el residuo antes de que terminara desechado', color: '#F6BF3E' },
                  { icon: Hammer, texto: 'En qué lo transformaste, con qué materiales y quién intervino', color: '#38B98E' },
                  { icon: QrCode, texto: 'Cada pieza con su QR público, consultable sin crear cuenta', color: '#59A6E4' },
                  { icon: ShieldCheck, texto: 'Un registro encadenado SHA-256 que ayuda a detectar cambios', color: '#F3BBD3' },
                ].map(({ icon: Icono, texto, color }) => (
                  <div
                    key={texto}
                    style={{ '--c': color, '--sobre': '#FFFFFF', '--ic': color } as React.CSSProperties}
                    className="group flex gap-2.5 items-center sm:items-start rounded-2xl p-3 border transition-all duration-300 hover:-translate-y-1 border-[color-mix(in_srgb,var(--c)_35%,transparent)] bg-[color-mix(in_srgb,var(--c)_8%,transparent)] hover:border-(--c) hover:bg-[color-mix(in_srgb,var(--c)_16%,transparent)] hover:shadow-[0_10px_26px_color-mix(in_srgb,var(--c)_28%,transparent)]"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 bg-[color-mix(in_srgb,var(--c)_22%,transparent)] text-(--ic) group-hover:bg-(--c) group-hover:text-(--sobre)">
                      <Icono size={16} strokeWidth={2} sinAnimacion />
                    </div>
                    <span className={`text-xs sm:text-[13px] font-semibold leading-snug ${ts}`}>{texto}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 3 - CATÁLOGO DE CÁLCULOS ───────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="calculos" className={`scroll-mt-28 py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300 ${isDark ? 'bg-[#525252]/40' : 'bg-[#00827C]/2'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10 text-center">
            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
              Descubre los 9 cálculos de sostenibilidad: <br className="hidden sm:block" />
              ambientales, económicos y sociales
            </h2>
            <p className={`text-sm sm:text-base md:text-base lg:text-base font-medium max-w-2xl mx-auto ${ts}`}>
              Desde que un material o residuo se descarta hasta que se convierte en un nuevo recurso con valor ambiental y económico.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
            {TODOS_LOS_CALCULOS.slice(0, 6).map((calc, i) => {
              const IconComponent = calc.icon
              return (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '100px' }}
                  transition={{ duration: 0.45, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -6, scale: 1.015 }}
                  className={`group relative p-4 sm:p-5 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl border transition-all duration-300 backdrop-blur-xl ${
                    isDark
                      ? 'bg-white/4 border-white/10 hover:bg-white/[0.07] hover:border-transparent hover:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                      : 'bg-primary border-[#00827C]/10 hover:border-transparent shadow-[0_4px_20px_rgba(0,130,124,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(0,130,124,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {/* Halo difuminado ambiental con el color del cálculo */}
                  <div 
                    className="absolute -inset-1 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
                    style={{
                      background: isDark
                        ? `radial-gradient(circle at 50% 50%, ${calc.colorHex}45 0%, ${calc.colorHex}15 55%, transparent 80%)`
                        : `radial-gradient(circle at 50% 50%, ${calc.colorHex}30 0%, ${calc.colorHex}10 50%, transparent 75%)`
                    }}
                  />

                  {/* Reborde Liquid Glass Disímil */}
                  <div 
                    className="absolute inset-0 rounded-2xl md:rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                    style={{
                      padding: '1.5px',
                      background: isDark
                        ? `linear-gradient(135deg, rgba(255,255,255,0.65) 0%, ${calc.colorHex} 36%, rgba(255,255,255,0.06) 66%, ${calc.colorHex}ee 100%)`
                        : `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, ${calc.colorHex} 38%, rgba(255,255,255,0.25) 70%, ${calc.colorHex}cc 100%)`,
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />

                  <div className="relative z-20">
                    <div className="flex items-center justify-between mb-3.5 md:mb-4">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        isDark
                          ? `${calc.bgDark} ${calc.textDark} ${calc.hoverIconBgDark} ${calc.hoverIconTextDark}`
                          : `${calc.bgLight} ${calc.textLight} ${calc.hoverIconBgLight} ${calc.hoverIconTextLight}`
                      }`}>
                        <IconComponent size={20} strokeWidth={2.2} />
                      </div>
                      
                      <span className={`text-[11px] font-medium select-none ${
                        isDark ? 'text-white/40' : 'text-[#474747]/60'
                      }`}>
                        {calc.tag}
                      </span>
                    </div>
                    <h3 className={`text-sm sm:text-base font-extrabold mb-1 transition-colors duration-300 ${tp}`}>
                      {calc.titulo}
                    </h3>
                    <p className={`text-xs font-medium leading-relaxed ${ts}`}>
                      {calc.desc}
                    </p>
                  </div>
                </m.div>
              )
            })}
          </div>

          <div className="mt-6 sm:mt-8 flex justify-center">
            <button
              onClick={() => setCatalogoCalculosAbierto(true)}
              className={`group inline-flex items-center gap-1.5 text-sm sm:text-base font-bold transition-colors duration-200 ${isDark ? 'text-[#D6F391] hover:underline' : 'text-[#00827C] hover:underline'}`}
            >
              <span>Ver detalle</span>
              <Plus size={16} strokeWidth={2.5} className="shrink-0" />
            </button>
          </div>
        </div>

        {/* Catálogo detallado de los 9 cálculos */}
        <Modal
          abierto={catalogoCalculosAbierto}
          onClose={() => setCatalogoCalculosAbierto(false)}
          titulo=""
          sinEncabezado
          ancho="xl"
          sinPie
        >
          <div className="flex flex-col gap-6 sm:gap-7 py-0.5">
            {(['Ambiental', 'Económico', 'Social'] as const).map(grupo => {
              const items = TODOS_LOS_CALCULOS.filter(c => c.tag === grupo)
              if (!items.length) return null
              const color = COLOR_POR_CATEGORIA[grupo]
              return (
                <div key={grupo}>
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <h4 className={`text-sm font-extrabold ${tp}`}>{grupo}</h4>
                    <span className={`h-px flex-1 bg-active`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {items.map((calc, idx) => {
                      const Ic = calc.icon
                      return (
                        <div
                          key={idx}
                          className={`group/item relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 active:scale-[0.98] ${
                            isDark
                              ? 'bg-white/4 border-white/10 hover:bg-white/[0.07] hover:border-transparent'
                              : 'bg-primary border-[#00827C]/10 hover:border-transparent shadow-[0_2px_10px_rgba(0,130,124,0.04)]'
                          }`}
                          onMouseEnter={e => {
                            const box = e.currentTarget.querySelector<HTMLElement>('.calc-icon-box')
                            if (box) { box.style.backgroundColor = color; box.style.color = '#fff' }
                          }}
                          onMouseLeave={e => {
                            const box = e.currentTarget.querySelector<HTMLElement>('.calc-icon-box')
                            if (box) { box.style.backgroundColor = `${color}20`; box.style.color = color }
                          }}
                        >
                          {/* Halo difuminado, mismo lenguaje que las 8 tarjetas destacadas */}
                          <div
                            className="absolute -inset-1 rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
                            style={{
                              background: isDark
                                ? `radial-gradient(circle at 50% 50%, ${color}40 0%, ${color}12 55%, transparent 80%)`
                                : `radial-gradient(circle at 50% 50%, ${color}28 0%, ${color}0c 50%, transparent 75%)`,
                            }}
                          />
                          {/* Reborde Liquid Glass, mismo lenguaje que las 8 tarjetas destacadas */}
                          <div
                            className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 z-10"
                            style={{
                              padding: '1.5px',
                              background: isDark
                                ? `linear-gradient(135deg, rgba(255,255,255,0.6) 0%, ${color} 40%, rgba(255,255,255,0.05) 70%, ${color}dd 100%)`
                                : `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, ${color} 42%, rgba(255,255,255,0.2) 72%, ${color}cc 100%)`,
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                          />

                          <div className="relative z-20 flex gap-3">
                            <div
                              className="calc-icon-box w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-6"
                              style={{ backgroundColor: `${color}20`, color }}
                            >
                              <Ic size={16} strokeWidth={2.3} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className={`text-xs sm:text-[13px] font-extrabold mb-0.5 ${tp}`}>{calc.titulo}</h5>
                              <p className={`text-[11px] sm:text-[11.5px] leading-relaxed ${ts}`}>{calc.desc}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Aviso legal de carácter estimativo */}
            <div className={`mt-2 p-3.5 sm:p-4 rounded-xl border text-[11px] sm:text-xs leading-relaxed ${
              isDark ? 'bg-white/3 border-white/10 text-white/70' : 'bg-[#00827C]/3 border-[#00827C]/15 text-[#474747]/80'
            } sm:leading-[1rem]`}>
              <p className="m-0">
                Presentamos todos los cálculos como una <strong>estimación</strong> técnica orientativa del impacto positivo del reúso. Entregamos estas métricas con carácter <strong>estimativo</strong> referencial para respaldar la toma de decisiones sostenibles sin reemplazar auditorías ambientales obligatorias.
              </p>
            </div>
          </div>
        </Modal>
      </section>


      {/* ── SECCIÓN 4 - CATEGORÍAS / INDUSTRIAS (SIN STICKY SCROLL) ─── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section
        id="categorias"
        ref={sectionCategoriasRef}
        className={`scroll-mt-28 relative transition-colors duration-300 ${isDark ? 'bg-[#474747]' : 'bg-primary'} py-8 sm:py-10 md:py-12 lg:py-14`}
      >
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2 sm:mb-2.5 md:mb-3 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
              ¿Cuánto valor recupera tu empresa con economía circular?
            </h2>
            <p className={`text-sm sm:text-base md:text-base lg:text-base font-medium max-w-2xl ${ts}`}>
              Descubre cómo medir tu impacto transforma descartes en oportunidades de oro, adaptándose a lo que necesite tu industria.
            </p>
          </div>

          {/* Tabs móvil con difuminado suave a lado y lado */}
          <div className="relative md:hidden mb-4 sm:mb-5">
            {/* Máscara izquierda de difuminado */}
            <div 
              className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-linear-to-r/srgb ${
                isDark ? 'from-[#474747] via-[#474747]/80 to-transparent' : 'from-white via-white/80 to-transparent'
              }`} 
            />
            {/* Máscara derecha de difuminado */}
            <div 
              className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-linear-to-l/srgb ${
                isDark ? 'from-[#474747] via-[#474747]/80 to-transparent' : 'from-white via-white/80 to-transparent'
              }`} 
            />
            <div 
              ref={mobileTabsScrollRef}
              className="flex gap-2 overflow-x-auto px-6 py-1 scrollbar-none scroll-smooth"
            >
              {Object.values(CATEGORIAS).map(c => {
                const isSelected = activeCategory === c.id
                return (
                  <button
                    key={c.id}
                    id={`mobile-tab-${c.id}`}
                    onClick={() => scrollToCategory(c.id as CatKey)}
                    className={`relative shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 active:scale-95 select-none ${
                      isSelected 
                        ? (isDark ? c.pillTextDark : c.pillTextLight)
                        : isDark
                          ? 'bg-white/4 border border-white/10 text-white/70 active:bg-white/10'
                          : 'bg-[#00827C]/4 border  text-[#474747]/80 active:bg-[#00827C]/10'
                    }`}
                  >
                    {isSelected && (
                      <m.div
                        layoutId="activeTabMobilePill"
                        className={`absolute inset-0 rounded-full pointer-events-none ${
                          isDark 
                            ? c.pillActiveDark 
                            : c.pillActiveLight
                        }`}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{c.label}</span>
                  </button>
                )
              })}
              {/* Elemento debajo / al final de los tabs, estilo botón sin ser botón */}
              <div
                className={`shrink-0 flex items-center px-3.5 py-1.5 rounded-full border border-dashed text-xs font-semibold select-none ${
                  isDark
                    ? 'border-white/15 text-white/70 bg-white/2'
                    : 'border-[#00827C]/20 text-[#474747]/80 bg-[#00827C]/2'
                }`}
              >
                <span>El desarrollo que tú necesites</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] lg:grid-cols-[230px_1fr] gap-5 md:gap-5 lg:gap-8 items-start">
            {/* Sidebar tablet/desktop con indicador deslizante continuo */}
            <div className="hidden md:flex flex-col gap-2 md:gap-2 lg:gap-2.5">
              {Object.values(CATEGORIAS).map(c => {
                const Icon = c.icon
                const isSelected = activeCategory === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => scrollToCategory(c.id as CatKey)}
                    className={`relative w-full flex items-center gap-2.5 lg:gap-3 px-3.5 py-3 lg:px-4 lg:py-3.5 rounded-xl md:rounded-2xl text-left font-bold text-sm md:text-sm lg:text-sm transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? (isDark ? c.pillTextDark : c.pillTextLight)
                        : `border ${ts} ${isDark ? `border-white/10 ${c.sidebarHoverDark}` : ` ${c.sidebarHoverLight}`}`
                    }`}
                  >
                    {isSelected && (
                      <m.div
                        layoutId="activeTabDesktopPill"
                        className={`absolute inset-0 rounded-xl md:rounded-2xl pointer-events-none ${
                          isDark 
                            ? c.pillActiveDark 
                            : c.pillActiveLight
                        }`}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5 lg:gap-3">
                      <Icon size={16} strokeWidth={isSelected ? 2.5 : 2} className="transition-transform duration-200 group-hover:rotate-6 shrink-0" />
                      <span>{c.id === 'mobiliario' ? <>Mobiliario <br />y diseño interior</> : c.label}</span>
                    </span>
                  </button>
                )
              })}

              {/* Debajo de "Upcycling y residuos", texto de botón sin ser botón */}
              <div
                className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 lg:px-4 lg:py-3 rounded-xl md:rounded-2xl text-center text-xs md:text-xs font-semibold border border-dashed select-none transition-colors ${
                  isDark
                    ? 'border-white/15 text-white/70 bg-white/2'
                    : 'border-[#00827C]/20 text-[#474747]/80 bg-[#00827C]/2'
                }`}
              >
                <span className="leading-snug">El desarrollo que tú necesites</span>
              </div>
            </div>

            {/* Panel dinámico con transición de contenido afable y reflejos temáticos */}
            <div
              style={{
                isolation: 'isolate',
                WebkitMaskImage: '-webkit-radial-gradient(white, black)',
              }}
              className={`relative p-5 sm:p-7 md:p-6 lg:p-10 rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden hover-card-interactive ${liquidGlass}`}
            >
              {/* Blobs de color dinámicos según la categoría activa */}
              {cat.blobs.map((b, idx) => (
                <div
                  key={idx}
                  data-blob
                  data-mx={idx % 2 === 0 ? "0.04" : "-0.04"}
                  data-my={idx % 2 === 0 ? "0.04" : "-0.04"}
                  data-ms="0"
                  className={`absolute ${b.pos} ${b.color} rounded-full pointer-events-none transition-all duration-700`}
                  style={{ willChange: 'transform' }}
                />
              ))}

              <div className="relative z-10 min-h-[290px]">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >

                    <h3 className={`text-base sm:text-lg md:text-lg lg:text-xl font-black mb-1 md:mb-1.5 ${tp}`}>
                      {cat.h3}
                    </h3>
                    <p className={`text-sm sm:text-base md:text-sm lg:text-sm font-bold mb-4 sm:mb-5 md:mb-5 lg:mb-6 ${ts}`}>
                      {cat.ejemplo}
                    </p>

                      {/* Métricas con animación Count-up dinámica */}
                      <CategoryMetricsDisplay cat={cat} isDark={isDark} tp={tp} ts={ts} />

                      <p className={`text-sm sm:text-base md:text-sm lg:text-sm font-medium leading-relaxed ${ts} sm:leading-[1.5rem] md:leading-[1.25rem] lg:leading-[1.25rem]`}>
                        {cat.desc}
                      </p>
                    </m.div>
                  </AnimatePresence>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 5 - PROCESO ───────────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="proceso" className="scroll-mt-28 py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10 text-center max-w-3xl mx-auto">
            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
              Soluciones para medir, gestionar
              <br />
              y respaldar tu impacto ambiental
            </h2>
            <p className={`text-sm sm:text-base md:text-base lg:text-base font-medium max-w-2xl mx-auto ${ts}`}>
              Herramientas para cuantificar tus recursos, emitir pasaportes digitales y generar reportes con datos claros.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                herramienta: 'Empezar cálculo',
                Icon: Calculator,
                titulo: 'Mide tu impacto ambiental',
                desc: 'Calcula tus iniciativas de sostenibilidad a través del aprovechamiento de recursos. Estima cuánto CO₂ y cuántos residuos evitas con bases técnicas.',
                image: 'https://images.unsplash.com/photo-1679110667877-408593fab0f6?auto=format&fit=crop&q=80&w=800',
              },
              {
                herramienta: 'Generar DPP',
                Icon: FileText,
                titulo: 'Pasaporte digital ClimaTech',
                desc: 'Genera pasaportes digitales con código QR y registro de seguridad para dar trazabilidad a cada producto.',
                image: 'https://images.unsplash.com/photo-1626682561113-d1db402cc866?auto=format&fit=crop&q=80&w=800',
              },
              {
                herramienta: 'Gestionar impacto',
                Icon: Receipt,
                titulo: 'Reportes claros de tu impacto',
                desc: 'Documenta el ahorro frente a comprar insumos nuevos y genera reportes técnicos con datos que sustentan tu gestión.',
                image: 'https://images.unsplash.com/photo-1499914485622-a88fac536970?auto=format&fit=crop&q=80&w=800',
              },
            ].map((paso, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '100px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -5, scale: 1.015 }}
                className={`group flex flex-col rounded-4xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-primary border border-[#00827C]/10'}`}
              >
                {/* Mitad superior: Imagen fotográfica nativa sin velo verde */}
                <div className="relative w-full h-40 sm:h-48 md:h-44 lg:h-52 overflow-hidden bg-hover dark:bg-gray-800">
                  <Image
                    src={paso.image}
                    alt={paso.titulo}
                    fill
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Removido el velo verde que ocultaba la foto */}
                  <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 transition-transform duration-300 group-hover:scale-110 shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-10">
                    <paso.Icon size={18} strokeWidth={2} />
                  </div>
                </div>

                {/* Mitad inferior: Contenido descriptivo (Sin botón) */}
                <div className="flex flex-col flex-1 p-6 lg:p-8">
                  <h3 className={`text-sm sm:text-base md:text-base lg:text-lg font-bold mb-3 ${tp}`}>
                    {paso.titulo}
                  </h3>
                  <p className={`text-sm sm:text-base font-medium leading-relaxed flex-1 ${ts} sm:leading-[1.5rem]`}>
                    {paso.desc}
                  </p>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 6 - PLANES ────────────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="planes" className={`scroll-mt-28 py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300 ${isDark ? 'bg-[#525252]/40' : 'bg-[#00827C]/2'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8 md:mb-10 text-center">
            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2.5 sm:mb-3 md:mb-4 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
              Planes de sostenibilidad a tu ritmo
            </h2>
            <p className={`text-sm sm:text-base md:text-base lg:text-base font-medium max-w-2xl sm:max-w-3xl mx-auto leading-relaxed ${ts} sm:leading-[1.5rem] md:leading-[1.5rem] lg:leading-[1.5rem]`}>
              Comienza de inmediato con nuestras categorías base. <br className="hidden md:inline" />
              La tarifa de implementación es opcional y solo aplica si deseas habilitar nuevas categorías a la medida o integrar datos específicos de tu empresa.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 md:mb-8 lg:mb-10">
            <div className={`flex rounded-full p-1 border ${isDark ? 'bg-white/5 border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.1)]' : 'bg-white/50 backdrop-blur-2xl border-[#00827C]/10 shadow-[0_4px_20px_rgba(0,130,124,0.06)]'}`}>
              {(['COP', 'USD', 'EUR'] as const).map(cur => (
                <button key={cur} onClick={() => setCurrency(cur)} className={`px-3.5 sm:px-4 py-1.5 md:px-3.5 md:py-1.5 lg:px-5 lg:py-2 rounded-full text-xs sm:text-sm md:text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${currency === cur ? (isDark ? 'bg-[#D6F391] text-[#474747] shadow-lg' : 'bg-[#00827C] text-white shadow-lg') : `hover:bg-[#00827C]/5 ${ts}`}`}>{cur}</button>
              ))}
            </div>
            <div className={`flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-1.5 md:px-3.5 md:py-1.5 lg:px-5 lg:py-2.5 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/50 backdrop-blur-2xl border-[#00827C]/10'}`}>
              <span className={`text-sm md:text-sm lg:text-sm font-bold ${billing === 'monthly' ? tp : `${ts}`}`}>Mensual</span>
              <button aria-label="Cambiar entre cobro mensual y anual" onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')} className={`relative w-10 h-6 md:w-11 md:h-6 lg:w-12 lg:h-7 rounded-full transition-colors duration-300 hover:scale-105 active:scale-95 ${billing === 'annual' ? (isDark ? 'bg-[#D6F391]' : 'bg-[#00827C]') : isDark ? 'bg-white/15' : 'bg-[#474747]/15'}`}>
                <div className={`absolute top-0.5 w-5 h-5 lg:w-6 lg:h-6 bg-primary rounded-full shadow-md transition-transform duration-300 ${billing === 'annual' ? 'translate-x-4 lg:translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className={`text-sm md:text-sm lg:text-sm font-bold ${billing === 'annual' ? tp : `${ts}`}`}>Anual</span>
              {billing === 'annual' && <span className={`text-[10px] md:text-[10px] lg:text-xs font-black px-2 py-0.5 rounded-full ${isDark ? 'text-[#D6F391] bg-[#D6F391]/15' : 'text-[#00827C] '}`}>2 meses gratis.</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-4 lg:gap-5">
            {PLANS.map((plan, i) => {
              const theme = PLAN_THEMES[plan.id] ?? PLAN_THEMES.lab
              const isSelectedPopular = Boolean(plan.popular)
              return (
                <div
                  key={plan.id}
                  className={`group relative p-5 sm:p-6 md:p-5 lg:p-7 rounded-2xl md:rounded-3xl lg:rounded-4xl border flex flex-col hover-card-interactive reveal-card transition-all duration-300 hover:scale-[1.03] hover:-translate-y-2 backdrop-blur-md ${
                    isDark ? `${theme.cardDark} ${theme.cardHoverDark}` : `${theme.cardLight} ${theme.cardHoverLight}`
                  }`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Sutil halo superior con el color propio del plan */}
                  <div
                    className={`absolute top-0 left-6 right-6 h-[2px] rounded-full transition-opacity duration-300 ${
                      isSelectedPopular ? 'opacity-80' : 'opacity-40 group-hover:opacity-100'
                    }`}
                    style={{ background: `linear-gradient(90deg, transparent, ${plan.color}, transparent)` }}
                  />

                  {isSelectedPopular && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 md:px-3 md:py-0.5 lg:px-4 lg:py-1 ${theme.badgeBg} ${theme.badgeText} text-[9px] md:text-[9px] lg:text-[10px] font-bold rounded-full whitespace-nowrap shadow-md`}>
                      Más popular
                    </div>
                  )}

                  <div className="mb-4 md:mb-5 lg:mb-6">
                    <p className={`text-[9px] md:text-[9px] lg:text-[10px] font-bold mb-1 transition-colors duration-200 ${theme.taglineQuiet} ${isDark ? theme.titleHoverDark : theme.titleHoverLight}`}>{plan.tagline}</p>
                    <h3 className={`text-base md:text-base lg:text-lg font-black mb-2 md:mb-2.5 lg:mb-3 transition-colors duration-200 ${isDark ? theme.titleHoverDark : theme.titleHoverLight} ${tp}`}>{plan.name}</h3>
                    <div className={`text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-black mb-0.5 transition-colors duration-200 ${isDark ? theme.priceHoverDark : theme.priceHoverLight} ${tp}`}>{formatPrice(plan)}</div>
                    {plan.priceMonthlyCOP > 0 && (
                      <div className="flex flex-col gap-0.5">
                        <p className={`text-[11px] md:text-[11px] lg:text-xs ${ts}`}>{CURRENCIES[currency].code}/mes</p>
                        {billing === 'annual' && (
                          <p className={`text-[9px] md:text-[9px] lg:text-[10px] mt-1 whitespace-nowrap ${tp}`}>Único pago anual de{' '}<span className={`text-[14px] md:text-[14px] lg:text-[16px] font-bold transition-colors duration-200 ${isDark ? theme.priceHoverDark : theme.priceHoverLight}`}>{getAnnualTotal(plan)}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                  <dl className={`grid grid-cols-2 gap-x-3 gap-y-2 mb-4 md:mb-5 pb-4 md:pb-5 border-b ${isDark ? theme.dividerDark : theme.dividerLight}`}>
                    {cuotasPlan(plan).map((c, k) => (
                      <div key={k}>
                        <dt className={`text-[9px] md:text-[9px] lg:text-[10px] font-bold tracking-wide ${ts}`}>{c.etiqueta}</dt>
                        <dd className={`text-[11px] md:text-[11px] lg:text-xs font-bold ${tp} flex items-center min-h-[16px]`}>
                          {(c.valor && !['x', 'no incluye', '—', '-'].includes(String(c.valor).trim().toLowerCase())) ? (
                            c.valor
                          ) : (
                            <X size={12} strokeWidth={3} className={isDark ? 'text-white/20' : 'text-[#474747]/20'} />
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="space-y-2 md:space-y-2 lg:space-y-3 mb-5 md:mb-6 lg:mb-8 grow">
                    {bulletsPlan(plan).map((f, j) => (
                      <li key={j} className={`group/item flex items-start gap-2.5 md:gap-2.5 lg:gap-3 text-sm md:text-sm lg:text-sm font-medium transition-all duration-200 hover:translate-x-1 ${ts}`}>
                        <div className={`mt-0.5 w-4 h-4 md:w-4.5 md:h-4.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover/item:scale-125 group-hover/item:rotate-6 group-hover:scale-110 ${
                          isDark
                            ? `${theme.checkQuietDark} ${theme.checkHoverDark}`
                            : `${theme.checkQuietLight} ${theme.checkHoverLight}`
                        }`}>
                          <Check size={10} strokeWidth={3} className="transition-transform duration-300" />
                        </div>
                        <span className="transition-colors duration-200 group-hover/item:text-current">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.priceMonthlyCOP === 0 ? (
                    <Link
                      href="/registro"
                      className={`w-full py-2.5 md:py-3 lg:py-3.5 rounded-xl font-bold text-sm md:text-sm lg:text-sm text-center transition-all block hover:scale-105 active:scale-95 cursor-pointer ${
                        isSelectedPopular
                          ? (isDark ? theme.btnPopularDark : theme.btnPopularLight)
                          : (isDark ? theme.btnOutlineDark : theme.btnOutlineLight)
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(plan.name)
                        setContactModalOpen(true)
                      }}
                      className={`w-full py-2.5 md:py-3 lg:py-3.5 rounded-xl font-bold text-sm md:text-sm lg:text-sm text-center transition-all block hover:scale-105 active:scale-95 cursor-pointer ${
                        isSelectedPopular
                          ? (isDark ? theme.btnPopularDark : theme.btnPopularLight)
                          : (isDark ? theme.btnOutlineDark : theme.btnOutlineLight)
                      }`}
                    >
                      {plan.cta}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Puerta de entrada al cuadro comparativo completo */}
          <div className="mt-5 sm:mt-6 flex justify-center">
            <button
              onClick={() => setComparativaAbierta(true)}
              className={`group inline-flex items-center gap-1.5 text-sm sm:text-base font-bold transition-colors duration-200 ${isDark ? 'text-[#D6F391] hover:underline' : 'text-[#00827C] hover:underline'}`}
            >
              <span>Comparar todos los planes y cálculos</span>
              <Plus size={16} strokeWidth={2.5} className="shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* Popup del cuadro comparativo completo */}
      {(() => {
        const listaBase = (comparativaCategorias && comparativaCategorias.length > 0)
          ? comparativaCategorias
          : COMPARATIVA_DEFAULT
        // Congruencia real: las filas de MCI, IA y Excel/CSV (sea del cuadro
        // por defecto o del personalizado en /admin/contenido) siempre reflejan
        // los toggles reales de "Personalización de capacidades" por plan, en
        // vez de un checkmark manual que puede desincronizarse.
        const listaComparativa = listaBase.map(categoria => ({
          ...categoria,
          filas: categoria.filas.map(fila => {
            if (/Índice de Flujo Lineal|MCI/i.test(fila.label)) {
              const valoresReales = Object.fromEntries(
                (planesPrecios ?? []).map(p => [p.id, Boolean(p.incluye_mci)])
              )
              return { ...fila, valores: { ...fila.valores, ...valoresReales } }
            }
            if (/Inteligencia Artificial|Asistente.*IA/i.test(fila.label) && fila.tipo === 'check') {
              const valoresReales = Object.fromEntries(
                (planesPrecios ?? []).map(p => [p.id, Boolean(p.incluye_ia)])
              )
              return { ...fila, valores: { ...fila.valores, ...valoresReales } }
            }
            if (/Excel.*CSV|CSV.*Excel|Exportación.*Excel/i.test(fila.label) && fila.tipo === 'check') {
              const valoresReales = Object.fromEntries(
                (planesPrecios ?? []).map(p => [p.id, Boolean(p.incluye_excel_csv)])
              )
              return { ...fila, valores: { ...fila.valores, ...valoresReales } }
            }
            if (/soporte/i.test(fila.label)) {
              const nuevosValores = { ...fila.valores }
              if (nuevosValores.free === 'Comunidad' || nuevosValores.free === 'No incluye') {
                nuevosValores.free = ''
              }
              if (nuevosValores.lab === 'Email') nuevosValores.lab = 'Formulario'
              if (nuevosValores.impulso === 'Email') nuevosValores.impulso = 'Formulario'
              return { ...fila, valores: nuevosValores }
            }
            return fila
          }),
        }))
        return (
          <Modal
            abierto={comparativaAbierta}
            onClose={() => setComparativaAbierta(false)}
            titulo=""
            sinEncabezado
            ancho="xl"
            sinPie
          >
            <div className="flex flex-col gap-7 py-0.5">
              {listaComparativa.map((categoria, ci) => {
                const colorCategoria = categoria.color ?? PALETA_COMPARATIVA[ci % PALETA_COMPARATIVA.length]
                return (
                  <div key={ci}>
                    {categoria.nombre && (
                      <h4 className={`text-sm sm:text-base font-black mb-3 ${tp}`}>{categoria.nombre}</h4>
                    )}
                    <div className="rounded-card border-2 overflow-hidden" style={{ borderColor: `${colorCategoria}40`, isolation: 'isolate' }}>
                      <div className="overflow-x-auto rounded-btn">
                        <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: 150 + PLANS.length * 108 }}>
                          <colgroup>
                            <col style={{ width: 150 }} />
                            {PLANS.map(plan => <col key={plan.id} style={{ width: 108 }} />)}
                          </colgroup>
                          <thead>
                            <tr style={{ background: `${colorCategoria}14` }}>
                              <th
                                className={`text-left px-3 py-2.5 text-xs font-bold rounded-tl-btn ${ts}`}
                                style={{ position: 'sticky', left: 0, zIndex: 2, background: isDark ? '#525252' : '#FFFFFF' }}
                              >
                                &nbsp;
                              </th>
                              {PLANS.map((plan, planIdx) => (
                                <th
                                  key={plan.id}
                                  className={`text-center px-2 py-2 ${planIdx === PLANS.length - 1 ? 'rounded-tr-btn' : ''}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => irAPlan(plan)}
                                    className="group w-full flex flex-col items-center gap-0.5 cursor-pointer"
                                    style={{ '--color-categoria': colorCategoria } as React.CSSProperties}
                                  >
                                    <span className={`text-xs sm:text-[13px] font-black whitespace-nowrap transition-colors group-hover:text-(--color-categoria) ${tp}`}>
                                      {plan.name}
                                    </span>
                                    <span className={`text-[9px] font-bold opacity-70 group-hover:opacity-100 group-hover:underline group-hover:text-(--color-categoria) ${ts}`}>
                                      Elegir →
                                    </span>
                                  </button>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {categoria.filas.map((fila, fi) => {
                              const isUltimaFila = fi === categoria.filas.length - 1
                              return (
                                <tr key={fi} className={fi % 2 === 1 ? (isDark ? 'bg-white/2' : 'bg-[#00827C]/1.5') : ''}>
                                  <td
                                    className={`text-left px-3 py-2.5 text-xs sm:text-sm leading-snug ${isUltimaFila ? 'rounded-bl-btn' : ''} ${tp} sm:leading-[1.25rem]`}
                                    style={{ position: 'sticky', left: 0, zIndex: 1, background: fi % 2 === 1 ? (isDark ? '#5A5A5A' : '#FCFCFC') : (isDark ? '#525252' : '#FFFFFF') }}
                                  >
                                    <span className="inline-flex items-center gap-1.5 min-w-0">
                                      <span className="wrap-break-word min-w-0">{fila.label}</span>
                                      {fila.descripcion && <TooltipInfo texto={fila.descripcion} posicion={fi === 0 ? 'abajo' : 'arriba'} centrado />}
                                    </span>
                                  </td>
                                  {PLANS.map((plan, planIdx) => {
                                    const val = fila.valores[plan.id]
                                    const isUltimaCelda = isUltimaFila && planIdx === PLANS.length - 1
                                    return (
                                      <td key={plan.id} className={`text-center px-2 py-2.5 ${isUltimaCelda ? 'rounded-br-btn' : ''}`}>
                                        {fila.tipo === 'check' ? (
                                          val ? (
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ background: `${colorCategoria}22` }}>
                                              <Check size={14} strokeWidth={3} style={{ color: colorCategoria }} />
                                            </span>
                                          ) : (
                                            <X size={13} strokeWidth={3} className={`inline-block ${isDark ? 'text-white/20' : 'text-[#474747]/20'}`} />
                                          )
                                        ) : (val && !['x', 'no incluye', '—', '-'].includes(String(val).trim().toLowerCase())) ? (
                                          <span className={`block leading-snug text-xs sm:text-sm font-semibold ${tp} sm:leading-[1.25rem]`}>{val as string}</span>
                                        ) : (
                                          <X size={13} strokeWidth={3} className={`inline-block ${isDark ? 'text-white/20' : 'text-[#474747]/20'}`} />
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Modal>
        )
      })()}

      {/* ── SECCIÓN 7 - INTELIGENCIA ARTIFICIAL & ÉTICA ─────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="ia" className={`scroll-mt-28 py-8 sm:py-10 md:py-12 lg:py-14 px-4 sm:px-6 transition-colors duration-300 ${isDark ? 'bg-[#525252]/25' : 'bg-[#00827C]/2'}`}>
        <div className="max-w-6xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              isolation: 'isolate',
              WebkitMaskImage: '-webkit-radial-gradient(white, black)',
            }}
            className={`relative p-6 sm:p-8 md:p-8 lg:p-12 rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden hover-card-interactive ${liquidGlass}`}
          >
            {/* Blobs de ambientación */}
            <div data-blob data-mx="0.04" data-my="0.04" data-ms="0"
              className="absolute -top-10 -right-10 w-52 h-52 bg-[#59A6E4]/25 blur-[50px] rounded-full pointer-events-none transition-transform duration-700"
              style={{ willChange: 'transform' }} />
            <div data-blob data-mx="-0.04" data-my="-0.03" data-ms="0"
              className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#D6F391]/20 blur-[45px] rounded-full pointer-events-none transition-transform duration-700"
              style={{ willChange: 'transform' }} />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
              {/* Lado izquierdo: narrativa e información */}
              <div className="lg:col-span-7">
                <p className={`text-sm sm:text-base font-bold mb-2 ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
                  Inteligencia artificial amigable y responsable.
                </p>
                <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-2.5 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
                  Diagnóstico visual con IA, <br className="hidden sm:block" />
                  con ciencia detrás de cada cálculo
                </h2>
                <p className={`text-sm sm:text-base md:text-base lg:text-base font-medium leading-relaxed mb-5 ${ts} sm:leading-[1.5rem] md:leading-[1.5rem] lg:leading-[1.5rem]`}>
                  Usamos visión por computadora para reconocer materiales con solo una foto, combinándolo con bases de datos estandarizadas globalmente. La IA te da una mano extra para que todo quede ordenado, claro y fácil de demostrar, estimando tu impacto de forma rigurosa.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-[#38B98E]/20 text-[#38B98E]' : 'bg-[#38B98E]/15 text-[#00827C]'}`}>
                      <IaIcon size={14} />
                    </div>
                    <div>
                      <h3 className={`text-sm sm:text-base font-bold ${tp}`}>Reconocimiento visual automático</h3>
                      <p className={`text-xs sm:text-sm font-medium ${ts}`}>Descubre de qué material están hechas las cosas con solo analizar una imagen.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-[#59A6E4]/20 text-[#59A6E4]' : 'bg-[#59A6E4]/15 text-[#59A6E4]'}`}>
                      <ShieldCheck size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className={`text-sm sm:text-base font-bold ${tp}`}>Estimaciones con fundamentos técnicos</h3>
                      <p className={`text-xs sm:text-sm font-medium ${ts}`}>Usamos bases de datos internacionales reconocidas para que tus estimaciones tengan respaldo técnico sólido.</p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/legal/ia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex items-center gap-2 text-sm sm:text-base font-bold transition-all duration-200 hover:gap-3 ${isDark ? 'text-[#D6F391] hover:text-white' : 'text-[#00827C] hover:text-[#005B56]'}`}
                >
                  <span className="group-hover:underline">Conoce nuestro marco ético y gobernanza en la Política de IA</span>
                  <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" />
                </Link>
              </div>

              {/* Lado derecho: Tarjeta de demostración de diagnóstico */}
              <div className="lg:col-span-5">
                <div className={`p-4 sm:p-5 rounded-xl md:rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#474747]/25 border-white/10 shadow-inner'
                    : 'bg-white/70 border-[#00827C]/15 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-inherit">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className={`text-xs sm:text-sm font-bold ${tp}`}>Muestra de diagnóstico.</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${isDark ? 'bg-white/10 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]'}`}>
                      Diagnóstico circular y ambiental.
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className={`p-2.5 rounded-lg bg-hover`}>
                      <p className={`text-[10px] font-semibold tracking-wider mb-0.5 opacity-60 ${ts}`}>Detección de material.</p>
                      <p className={`font-bold ${tp}`}>Escritorio modular en madera maciza y base metálica.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-2.5 rounded-lg bg-hover`}>
                        <p className={`text-[10px] font-semibold tracking-wider mb-0.5 opacity-60 ${ts}`}>CO₂ evitado.</p>
                        <p className="font-extrabold text-[#38B98E]">85 kg CO₂e</p>
                      </div>
                      <div className={`p-2.5 rounded-lg bg-hover`}>
                        <p className={`text-[10px] font-semibold tracking-wider mb-0.5 opacity-60 ${ts}`}>Agua ahorrada.</p>
                        <p className="font-extrabold text-[#59A6E4]">3.200 L</p>
                      </div>
                    </div>

                    <div className={`p-2 rounded-lg flex items-center justify-between text-[11px] ${isDark ? 'bg-white/3 text-white/70' : 'bg-[#00827C]/3 text-[#00827C]'}`}>
                      <span>Pasaporte digital con QR verificable.</span>
                      <span className="font-bold text-emerald-500 flex items-center gap-1">
                        <Check size={12} strokeWidth={3} /> Listo para compartir.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </section>

      {/* ── SECCIÓN 8 - OBJETIVO 12 (ODS 12) ─────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="ods-12" className="scroll-mt-28 relative pt-6 sm:pt-8 md:pt-10 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="mb-8 md:mb-12 text-center max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-4 sm:mb-6">
              <div className={`hidden md:block w-12 h-px ${isDark ? 'bg-white/20' : 'bg-[#474747]/20'}`} />
              <div className={`text-xs sm:text-sm font-bold tracking-normal ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
                Compromiso agenda 2030 de la ONU
              </div>
              <div className={`hidden md:block w-12 h-px ${isDark ? 'bg-white/20' : 'bg-[#474747]/20'}`} />
            </div>

            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 sm:mb-4 md:mb-6 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
              Impactamos el <span className={`text-transparent bg-clip-text bg-linear-to-r/srgb ${isDark ? 'from-white via-[#BF8D2C] to-[#BF8D2C]' : 'from-[#474747] via-[#BF8D2C] to-[#BF8D2C]'}`}>Objetivo 12:</span> <br className="hidden md:block" />
              <span className={`text-transparent bg-clip-text bg-linear-to-r/srgb ${isDark ? 'from-white via-[#BF8D2C] to-[#BF8D2C]' : 'from-[#474747] via-[#BF8D2C] to-[#BF8D2C]'}`}>
                Producción y consumo responsables
              </span>
            </h2>
            <p className={`text-sm sm:text-base md:text-base lg:text-lg font-medium leading-relaxed max-w-2xl mx-auto ${ts} sm:leading-[1.5rem] md:leading-[1.5rem] lg:leading-[1.75rem]`}>
              Somos el aliado ClimaTech estratégico para respaldar con datos verificables cada meta de sostenibilidad y economía circular. Transformamos iniciativas en métricas trazables que sustentan el cumplimiento del compromiso global ante comités, clientes y auditorías.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
            {[
              {
                tag: 'El Propósito',
                titulo: 'Compromiso genuino con modelos regenerativos',
                desc: 'Demuestra coherencia entre lo que prometes y lo que ejecutas. Facilitamos la transición a modelos regenerativos donde cada material recuperado cuenta una historia de impacto sustentado.',
                puntos: ['Eficiencia estructurada de insumos.', 'Desvío de vertedero documentado.'],
                Icon: Leaf,
                textColor: 'text-[#38B98E]',
                bgGradientLight: 'from-white via-white/95 to-[#38B98E]/15',
                bgGradientDark: 'from-[#474747] via-[#474747]/95 to-[#38B98E]/20',
                glowColor: 'bg-[#38B98E]',
                borderColorLight: 'border-[#38B98E]/30',
                borderColorDark: 'border-[#38B98E]/40',
                image: 'https://images.unsplash.com/photo-1503149779833-1de50ebe5f8a?auto=format&fit=crop&q=80&w=800',
              },
              {
                tag: 'La Herramienta',
                titulo: 'Tecnología ágil para cálculo ambiental y DPP',
                desc: 'Obtén estimaciones confiables y emite Pasaportes Digitales de Producto en minutos. Nuestra plataforma automatiza la medición y genera códigos QR listos para compartir con clientes y evaluadores.',
                puntos: ['Estimación con bases técnicas.', 'Emisión de DPP con código QR.'],
                Icon: IaIcon,
                textColor: 'text-[#985fa1]',
                bgGradientLight: 'from-white via-white/95 to-[#985fa1]/15',
                bgGradientDark: 'from-[#474747] via-[#474747]/95 to-[#985fa1]/20',
                glowColor: 'bg-[#985fa1]',
                borderColorLight: 'border-[#985fa1]/30',
                borderColorDark: 'border-[#985fa1]/40',
                image: 'https://images.unsplash.com/photo-1591181520189-abcb0735c65d?auto=format&fit=crop&q=80&w=800',
              },
              {
                tag: 'El Impacto',
                titulo: 'Resultados comprobables en cada reporte de sostenibilidad',
                desc: 'Presenta balances claros que fortalecen propuestas comerciales, sustentan memorias de sostenibilidad y respaldan la reputación de tu marca con evidencia documentada frente a señalamientos de greenwashing.',
                puntos: ['Reportes de sostenibilidad.', 'Transparencia de datos sustentada.'],
                Icon: TrendingUp,
                textColor: 'text-[#59A6E4]',
                bgGradientLight: 'from-white via-white/95 to-[#59A6E4]/15',
                bgGradientDark: 'from-[#474747] via-[#474747]/95 to-[#59A6E4]/20',
                glowColor: 'bg-[#59A6E4]',
                borderColorLight: 'border-[#59A6E4]/30',
                borderColorDark: 'border-[#59A6E4]/40',
                image: 'https://images.unsplash.com/photo-1704080118559-4aa32c2f4e1f?auto=format&fit=crop&q=80&w=800',
              },
            ].map((col, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '100px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -5, scale: 1.015 }}
                  className={`group relative p-6 sm:p-8 rounded-4xl overflow-hidden flex flex-col justify-between hover-card-interactive shadow-lg hover:shadow-2xl transition-all duration-300 border ${isDark ? col.borderColorDark : col.borderColorLight}`}
                >
                  <div className="absolute inset-0 z-0">
                    <Image src={col.image} alt={col.titulo} fill loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, 33vw" className="object-cover opacity-10 group-hover:opacity-20 transition-opacity duration-500 mix-blend-luminosity" />
                    <div className={`absolute inset-0 bg-linear-to-br/srgb ${isDark ? col.bgGradientDark : col.bgGradientLight} opacity-95`} />
                  </div>

                  <div 
                    className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-30 transition-opacity duration-500 group-hover:opacity-60 ${col.glowColor}`}
                  />

                  <div className="relative z-10">
                    <div className="flex-1 pt-1 mb-5 sm:mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <m.div
                          animate={{ scale: [1, 1.18, 1], rotate: [0, 6, -6, 0] }}
                          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                          className="inline-flex items-center justify-center shrink-0"
                        >
                          <col.Icon size={18} className={`${col.textColor} transition-transform duration-300 group-hover:scale-125`} />
                        </m.div>
                        <span className={`text-xs sm:text-sm font-bold tracking-normal ${col.textColor}`}>
                          {col.tag}
                        </span>
                      </div>
                      <h3 className={`text-base sm:text-lg md:text-lg lg:text-xl font-black leading-tight ${tp} sm:leading-[1.75rem] md:leading-[1.75rem] lg:leading-[1.75rem]`}>
                        {col.titulo}
                      </h3>
                    </div>

                    <p className={`text-sm md:text-sm lg:text-base font-medium leading-relaxed mb-6 ${ts} md:leading-[1.25rem] lg:leading-[1.5rem]`}>
                      {col.desc}
                    </p>
                  </div>

                  <div className={`pt-4 border-t flex flex-col gap-2 relative z-10 border-light`}>
                    {col.puntos.map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-3 text-sm sm:text-base font-semibold">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.glowColor}`} />
                        <span className={isDark ? 'text-white/80' : 'text-[#474747]'}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

      {/* ── SECCIÓN 9 - FAQ (AL FINAL) ─────────────────────────────────────── */}
      <div className={`w-full max-w-6xl mx-auto h-px bg-linear-to-r/srgb from-transparent ${isDark ? 'via-white/10' : ''} to-transparent`} />
      <section id="faq" className="scroll-mt-28 pt-8 sm:pt-10 md:pt-12 lg:pt-14 pb-6 sm:pb-8 px-4 sm:px-6">
        <div className="max-w-2xl md:max-w-2xl lg:max-w-3xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center">
            <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-2 md:mb-3 lg:mb-4 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
              Preguntas frecuentes
            </h2>
            <p className={`text-sm sm:text-base md:text-base lg:text-base font-medium ${ts}`}>Todo lo que necesitas saber para sustentar el impacto de tus productos sin greenwashing.</p>
          </div>
          <div>
            {(faqItems && faqItems.length > 0 ? faqItems.map(f => ({ q: f.pregunta, a: f.respuesta })) : FAQS)
              .map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} isDark={isDark} />)}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 10 - CTA FINAL ─────────────────────────────────────────── */}
      <section id="cta-final" className="scroll-mt-28 pt-6 sm:pt-8 pb-8 sm:pb-10 md:pb-12 px-4 sm:px-6">
        <div className="max-w-2xl md:max-w-2xl lg:max-w-3xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, scale: 1.008 }}
            style={{
              isolation: 'isolate',
              WebkitMaskImage: '-webkit-radial-gradient(white, black)',
            }}
            className={`relative p-6 sm:p-8 md:p-8 lg:p-12 rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden text-center hover-card-interactive ${liquidGlass}`}
          >
            {/* Blobs de ambientación contenidos estrictamente dentro de la tarjeta */}
            <div
              data-blob
              data-mx="0.04"
              data-my="0.04"
              data-ms="0"
              className="absolute -top-6 -right-6 w-56 h-56 bg-[#59A6E4]/25 blur-[50px] rounded-full pointer-events-none transition-transform duration-700"
              style={{ willChange: 'transform' }}
            />
            <div
              data-blob
              data-mx="-0.04"
              data-my="-0.04"
              data-ms="0"
              className="absolute -bottom-6 -left-6 w-52 h-52 bg-[#D6F391]/25 blur-[45px] rounded-full pointer-events-none transition-transform duration-700"
              style={{ willChange: 'transform' }}
            />
            <div
              data-blob
              data-mx="-0.02"
              data-my="-0.02"
              data-ms="0"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#8AD0B2]/20 blur-2xl rounded-full pointer-events-none transition-transform duration-700"
              style={{ willChange: 'transform' }}
            />

            <div className="relative z-10 max-w-xl mx-auto">
              <p className={`text-sm sm:text-base font-semibold mb-3 md:mb-4 text-center ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
                Software ClimaTech de trazabilidad corporativa.
              </p>
              <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 md:mb-4 lg:mb-6 leading-snug ${tp} sm:leading-[2rem] md:leading-[2.25rem] lg:leading-[2.5rem]`}>
                Estructura tus reportes de sostenibilidad e impacto ambiental <br className="hidden sm:block" />
                con datos claros
              </h2>
              <p className={`text-xs sm:text-base md:text-sm lg:text-base font-medium mb-6 md:mb-8 lg:mb-10 max-w-lg mx-auto glass-subtitle ${ts}`}>
                Calcula tus estimaciones ambientales, genera Pasaportes Digitales con código QR y respalda tus iniciativas de sostenibilidad con fundamentos técnicos.
              </p>
              <Link
                href="/registro"
                className={`animate-shimmer group inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all duration-300 hover:-translate-y-1 hover:scale-105 active:scale-95 ${
                  isDark 
                    ? 'bg-[#D6F391] text-[#474747] hover:opacity-90 shadow-[0_8px_32px_rgba(214,243,145,0.3)]' 
                    : 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-[0_8px_32px_rgba(0,130,124,0.35)]'
                }`}
              >
                Crear cuenta y comenzar gratis <ArrowRight size={15} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <p className={`mt-4 sm:mt-5 md:mt-5 lg:mt-6 text-[11px] sm:text-xs md:text-[11px] lg:text-sm font-medium ${ts}`}>Empieza hoy con el plan Explora, 5 cálculos al mes sin costo · Sin tarjeta de crédito.</p>
            </div>
          </m.div>
        </div>
      </section>



      {/* ── BOTONES FLOTANTES INFERIOR DERECHA (WhatsApp latente + Te llamamos) ── */}
      <div 
        style={{ bottom: `${floatingBottomOffset}px` }}
        className="fixed right-4 sm:right-6 z-40 flex flex-col items-end gap-3 pointer-events-none transition-[bottom] duration-150 ease-out"
      >
        {/* Botón WhatsApp (Latente sutil con tooltip) */}
        <div className="group relative flex items-center justify-end pointer-events-auto">
          <span className="pointer-events-none absolute right-[calc(100%+12px)] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1.5 group-hover:translate-x-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-lg backdrop-blur-md border bg-white/95 dark:bg-[#252525]/95 border-emerald-500/20 text-[#25D366] dark:text-emerald-400">
            Hablemos por WhatsApp
          </span>
          <a
            href={waLink('Hola, quiero hablar con un asesor sobre la Calculadora de Reúso.', whatsappNumero)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center justify-center w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-full bg-[#25D366] text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] hover:shadow-[0_12px_28px_rgba(37,211,102,0.5)] transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label="Hablemos por WhatsApp"
            title="Hablemos por WhatsApp"
          >
            {/* Ondas lentas y sutiles (respiración suave de 3.5s) */}
            <span
              className="absolute -inset-1 rounded-full bg-[#25D366]/30 animate-pulse pointer-events-none"
              style={{ animationDuration: '3.5s' }}
            />
            <WhatsappLogo size={28} className="relative z-10 transition-transform duration-300 group-hover:scale-110" />
          </a>
        </div>

        {/* Botón Te llamamos (Círculo sutil debajo de WhatsApp con tooltip) */}
        <div className="group relative flex items-center justify-end pointer-events-auto">
          <span className="pointer-events-none absolute right-[calc(100%+12px)] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1.5 group-hover:translate-x-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-lg backdrop-blur-md border bg-white/95 dark:bg-[#252525]/95 border-[#00827C]/20 dark:border-white/15 text-[#00827C] dark:text-[#D6F391]">
            Te llamamos
          </span>
          <button
            onClick={() => {
              setSelectedPlan(null)
              setContactModalOpen(true)
            }}
            className={`relative flex items-center justify-center w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-full shadow-lg backdrop-blur-md border transition-all duration-300 hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-[#2E2E2E]/90 hover:bg-[#383838] border-[#D6F391]/35 text-[#D6F391] shadow-black/40'
                : 'bg-white/95 hover:bg-primary border-[#00827C]/30 text-[#00827C] shadow-[0_8px_20px_rgba(0,130,124,0.12)]'
            }`}
            aria-label="Te llamamos"
            title="Te llamamos"
          >
            <Headset size={26} strokeWidth={2.2} className="transition-transform duration-300 group-hover:rotate-12" />
          </button>
        </div>
      </div>

      {/* ── MODAL POPUP: FORMULARIO DE CONTACTO (TE LLAMAMOS) ── */}
      <AnimatePresence>
        {contactModalOpen && (
          <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop con desenfoque: claro de día, oscuro de noche */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setContactModalOpen(false)}
              className={`fixed inset-0 backdrop-blur-md transition-colors duration-300 ${
                isDark ? 'bg-[#121212]/70' : 'bg-white/70'
              }`}
            />

            {/* Tarjeta modal */}
            <m.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full max-w-lg p-6 sm:p-8 rounded-4xl shadow-2xl z-10 my-auto overflow-hidden border backdrop-blur-xl transition-colors duration-300 ${
                isDark
                  ? 'bg-[#1E1E1E] border-white/10 text-white shadow-black/80'
                  : 'bg-primary border-[#00827C]/15 text-[#474747] shadow-[0_24px_60px_rgba(0,130,124,0.15)]'
              }`}
            >
              {/* Botón cerrar X */}
              <button
                onClick={() => setContactModalOpen(false)}
                className={`absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-hover hover:bg-input text-[#474747]'
                }`}
                aria-label="Cerrar modal"
              >
                <X size={16} strokeWidth={2.5} />
              </button>

              {/* Encabezado del modal orientado a conversión */}
              <div className="mb-5 text-center pr-6">
                {selectedPlan && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                    isDark ? 'bg-[#D6F391]/15 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]'
                  }`}>
                    <Headset size={14} /> Plan {selectedPlan}
                  </div>
                )}
                <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
                  {selectedPlan ? `Comienza con tu plan ${selectedPlan}` : 'Empieza a medir tu impacto hoy'}
                </h3>
                <p className={`text-sm sm:text-base font-medium ${ts}`}>
                  {selectedPlan
                    ? `Déjanos tus datos para activar tu plan ${selectedPlan} y acompañarte en tus primeros cálculos.`
                    : 'Déjanos tus datos y un especialista te contactará para orientarte con la solución ideal.'}
                </p>
              </div>

              {/* Formulario */}
              <LeadsForm key={selectedPlan ?? 'default'} initialPlan={selectedPlan ?? undefined} />
            </m.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </LazyMotion>
  )
}
