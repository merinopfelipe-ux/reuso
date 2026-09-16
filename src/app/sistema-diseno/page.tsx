'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Users,
  Buildings,
  Calculator,
  Leaf,
  ArrowRight,
  Eye,
  EyeSlash,
  Crosshair,
  Plus,
  MagnifyingGlass,
  Tree,
  Globe,
  User,
  Stack,
  CaretDown,
  Copy,
  IaIcon,
  WhatsappLogo,
  LinkedinLogo,
  InstagramLogo,
  FacebookLogo,
  XLogo,
  YoutubeLogo,
  Bell,
  Gear,
  ChevronRight,
  Download,
  Upload,
  Trash,
  Send,
  Star,
  Heart,
  Lightning,
  Save,
  Check,
  ShieldCheck,
  Armchair,
  Package,
  Truck,
  Wrench,
} from '@/components/ui/icons'
import {
  Armchair as PhArmchair,
  Package as PhPackage,
  Buildings as PhBuildings,
  Plant as PhPlant,
  Truck as PhTruck,
  User as PhUser,
  Wrench as PhWrench,
  MagnifyingGlass as PhMagnifyingGlass,
} from '@phosphor-icons/react'
import { Icon } from 'lucide-react'
import { avocado, ufo, snowman, strawberry, penguin, chameleon } from '@lucide/lab'
import { PLANS, CURRENCIES } from '@/lib/constants/pricing'
import { DesignSystemHeader } from '@/components/design-system-header'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { SwitchOpciones } from '@/components/ui/switch-opciones'
import { Selector } from '@/components/ui/selector'
import { FooterPublic } from '@/components/footer-public'
import { InputTelefono } from '@/components/ui/input-telefono'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import { PAISES } from '@/components/ui/selector-pais'
import { TablaCotizadorDemo } from './components/tabla-cotizador-demo'
import { formatearPrecioColombiano } from '@/lib/constants/pricing'
import { InputPrecio } from '@/components/ui/formatted-number-input'

const PRICING_PLANS = PLANS;

const DESIGN_TOKENS = [
  {
    category: 'Color',
    tokens: [
      { name: 'brandVerde',    value: '#00827C', preview: 'color:#00827C',   desc: 'Verde principal de la marca' },
      { name: 'brandHover',   value: '#006B66', preview: 'color:#006B66',   desc: 'Verde al hacer hover' },
      { name: 'pistacho',     value: '#D6F391', preview: 'color:#D6F391',   desc: 'Acento luminoso en modo noche' },
      { name: 'menta',        value: '#8AD0B2', preview: 'color:#8AD0B2',   desc: 'Texto secundario en modo noche' },
      { name: 'nogal',        value: '#AD7C43', preview: 'color:#AD7C43',   desc: 'Acento cálido orgánico' },
      { name: 'rosa',         value: '#F3BBD3', preview: 'color:#F3BBD3',   desc: 'Acento rosa suave' },
      { name: 'violeta',      value: '#985fa1', preview: 'color:#985fa1',   desc: 'Violeta Trazabilidad y pasaporte digital' },
      { name: 'azulInfo',     value: '#59A6E4', preview: 'color:#59A6E4',   desc: 'Color de información' },
      { name: 'successVerde', value: '#38B98E', preview: 'color:#38B98E',   desc: 'Estado de éxito' },
      { name: 'errorRojo',    value: '#FF5E4B', preview: 'color:#FF5E4B',   desc: 'Estado de error' },
      { name: 'warningAmbar', value: '#F6BF3E', preview: 'color:#F6BF3E',   desc: 'Estado de alerta' },
    ]
  },
  {
    category: 'Liquid Glass',
    tokens: [
      { name: 'liquidGlassDay',   value: 'bg-white/35 blur-[60px] saturate-[180%]',    preview: 'glass-day',        desc: 'Cristal diurno completo' },
      { name: 'liquidGlassNight', value: 'bg-[#D6F391]/08 blur-[60px] saturate-[200%]',   preview: 'glass-night',      desc: 'Cristal nocturno completo' },
      { name: 'blobAzul',         value: 'bg-[#59A6E4]/40 blur-[100px] rounded-full',   preview: 'color:#59A6E4',   desc: 'Reflejo azul de los banners' },
      { name: 'blobMenta',        value: 'bg-[#8AD0B2]/35 blur-[90px] rounded-full',    preview: 'color:#8AD0B2',   desc: 'Reflejo menta central' },
      { name: 'blobRosa',         value: 'bg-[#F3BBD3]/40 blur-[100px] rounded-full',   preview: 'color:#F3BBD3',   desc: 'Reflejo rosa de los banners' },
      { name: 'blobVioleta',      value: 'bg-[#985fa1]/35 blur-[90px] rounded-full',    preview: 'color:#985fa1',   desc: 'Reflejo violeta trazabilidad' },
      { name: 'blobPistacho',     value: 'bg-[#D6F391]/30 blur-[80px] rounded-full',    preview: 'color:#D6F391',   desc: 'Reflejo pistacho del hero' },
    ]
  },
  {
    category: 'Animación',
    tokens: [
      { name: 'glassStatIn',   value: 'opacity 0→1 + translateY(18px)→0 + blur(8px)→0 · 0.7s', preview: 'anim-in',  desc: 'Entrada de estadísticas glass' },
      { name: 'glassGlow',     value: 'text-shadow pulsante menta/azul · 3s ease-in-out ∞',      preview: 'anim-glow',desc: 'Brillo pulsante en números' },
      { name: 'glassShimmer',  value: 'gradient sweep izquierda→derecha · 4s linear ∞',           preview: 'anim-shimmer', desc: 'Barrido de luz en texto' },
      { name: 'glassPulse',    value: 'opacity 0.6↔1 · 3s ease-in-out ∞',                        preview: 'anim-pulse',   desc: 'Pulso suave de opacidad' },
      { name: 'revealUp',      value: 'opacity 0→1 + translateY(30px)→0 + blur(8px)→0 · 0.8s',  preview: 'anim-in',  desc: 'Entrada al scroll de secciones' },
      { name: 'mobileMenuIn',  value: 'opacity 0→1 + translateY(-12px)→0 scale(0.97)→1 · 0.22s', preview: 'anim-in',  desc: 'Apertura del menú móvil' },
    ]
  },
  {
    category: 'Easing',
    tokens: [
      { name: 'easingBrand', value: 'cubic-bezier(0.22, 1, 0.36, 1)', preview: 'motion', desc: 'Curva de movimiento de la marca' },
      { name: 'durationFast', value: '0.2s',                           preview: 'motion', desc: 'Hover, blobs, respuestas táctiles' },
      { name: 'durationBase', value: '0.3s',                           preview: 'motion', desc: 'Sidebar, modales, tema' },
      { name: 'durationSlow', value: '0.8s',                           preview: 'motion', desc: 'Reveal al scroll' },
    ]
  },
  {
    category: 'Radio',
    tokens: [
      { name: 'radiusMicro',    value: '2px',       preview: 'radius:2',   desc: 'Micro validaciones' },
      { name: 'radiusDropdown', value: '8px',       preview: 'radius:8',   desc: 'Desplegables' },
      { name: 'radiusInner',    value: '16px',      preview: 'radius:16',  desc: 'Tablas e interior' },
      { name: 'radiusWidget',   value: '24px',      preview: 'radius:24',  desc: 'Widgets base' },
      { name: 'radiusCard',     value: '40px',      preview: 'radius:40',  desc: 'Tarjetas y paneles' },
      { name: 'radiusFull',     value: '999px',     preview: 'radius:999', desc: 'Botones y etiquetas' },
    ]
  },
  {
    category: 'Sombra',
    tokens: [
      { name: 'shadowCard',   value: '0 12px 24px rgba(0,130,124,0.06)',                     preview: 'shadow:6',  desc: 'Tarjetas flotantes' },
      { name: 'shadowHeader', value: '0 4px 20px rgba(0,130,124,0.06)',                      preview: 'shadow:4',  desc: 'Cabecero glass' },
      { name: 'shadowHero',   value: '0 32px 64px rgba(0,130,124,0.15) + inset 2px',         preview: 'shadow:15', desc: 'Paneles maestros de cristal' },
    ]
  },
]

const menuGroups = [
  {
    name: 'Fundamentos',
    items: [
      { name: 'Arquitectura de color', link: '#s01-color' },
      { name: 'Fuentes', link: '#s02-typography' },
      { name: 'Variantes de botón', link: '#s03-buttons' },
      { name: 'Tarjetas de Identidad y KPI', link: '#s04-cards' },
    ]
  },
  {
    name: 'Componentes',
    items: [
      { name: 'Elementos de formulario', link: '#s05-forms' },
      { name: 'Escala de radios', link: '#s06-radii' },
      { name: 'Elevación y profundidad', link: '#s07-elevation' },
      { name: 'Tono e interacción', link: '#s08-tono' },
      { name: 'Componentes reutilizables', link: '#s15-componentes' },
    ]
  },
  {
    name: 'Datos y Estructura',
    items: [
      { name: 'Estándar de tablas y datos', link: '#s09-tablas' },
      { name: 'Tokens del sistema', link: '#s10-tokens' },
      { name: 'Iconografía', link: '#s11-iconografia' },
      { name: 'Mosaicos embebidos de servicios', link: '#s12-mosaicos' },
    ]
  },
  {
    name: 'Negocio',
    items: [
      { name: 'Arquitectura de navegación', link: '#s13-navegacion' },
      { name: 'Precios', link: '#s14-precios' },
    ]
  }
];

export default function ManualDisenoPage() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<'USD'|'EUR'|'COP'>('USD')
  const [isYearly, setIsYearly] = useState(false)
  const [activeCard, setActiveCard] = useState(0)
  const cardsScrollRef = useRef<HTMLDivElement>(null)
  const revealedIdsRef = useRef<Set<string>>(new Set())
  const [scrollY, setScrollY] = useState(0)
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [demoModalAbierto, setDemoModalAbierto] = useState(false)
  const [demoSwitch2, setDemoSwitch2] = useState<'persona' | 'empresa'>('persona')
  const [demoSwitch3, setDemoSwitch3] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [demoSelector, setDemoSelector] = useState('')
  const [demoIndicativo, setDemoIndicativo] = useState('+57')
  const [demoTelefono, setDemoTelefono] = useState('')
  const [demoPagina, setDemoPagina] = useState(1)
  const [demoPorPagina, setDemoPorPagina] = useState(25)
  const [demoBotonCargando, setDemoBotonCargando] = useState(false)
  const [demoPrecioCOP, setDemoPrecioCOP] = useState('1490000')

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouse = (e: MouseEvent) => {
      setMouseX(e.clientX - window.innerWidth / 2);
      setMouseY(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouse);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);



  useEffect(() => {
    setMounted(true)
    const checkTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme')
      setIsDark(currentTheme === 'dark')
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
    localStorage.setItem('reuso-theme', next ? 'dark' : 'light')
  }

  React.useLayoutEffect(() => {
    if (!mounted) return
    revealedIdsRef.current.forEach(id => {
      const el = document.getElementById(id)
      if (el) {
        el.classList.add('revealed')
      }
    })
  }, [isDark, mounted])

  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            if (entry.target.id) {
              revealedIdsRef.current.add(entry.target.id)
            }
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '-60px 0px', threshold: 0.05 }
    )
    document.querySelectorAll('section[id]').forEach(el => {
      if (!revealedIdsRef.current.has(el.id)) {
        observer.observe(el)
      }
    })
    return () => observer.disconnect()
  }, [mounted, isDark])

  if (!mounted) return null

  // Clases comunes de Liquid Glass - Transparencia 50% + Blur 40px
  const liquidGlassClass = isDark 
    ? 'bg-[#D6F391]/08 backdrop-blur-[60px] saturate-[200%] border border-white/10 shadow-2xl'
    : 'bg-white/35 backdrop-blur-[60px] saturate-[180%] border border-[#00827C]/10 shadow-[0_12px_40px_rgba(0,130,124,0.06),inset_0_2px_4px_rgba(255,255,255,0.4)]'

  const searchResults = [
    { title: 'Arquitectura de color', link: '#s01-color' },
    { title: 'Fuentes', link: '#s02-typography' },
    { title: 'Variantes de botón', link: '#s03-buttons' },
    { title: 'Tarjetas de Identidad y KPI', link: '#s04-cards' },
    { title: 'Elementos de formulario', link: '#s05-forms' },
    { title: 'Escala de radios', link: '#s06-radius' },
    { title: 'Elevación y profundidad', link: '#s07-elevation' },
    { title: 'Tono e interacción', link: '#s08-tono' },
    { title: 'Estándar de tablas y datos', link: '#s09-tablas' },
    { title: 'Tokens del sistema', link: '#s10-tokens' },
    { title: 'Iconografía', link: '#s11-iconografia' },
    { title: 'Mosaicos embebidos de servicios', link: '#s12-mosaicos' },
    { title: 'Arquitectura de navegación', link: '#s13-nav' },
    { title: 'Precios', link: '#s14-pricing' },
    { title: 'Componentes reutilizables', link: '#s15-componentes' },
  ]

  return (
    <div className={`min-h-screen font-sans transition-all duration-500 allow-select ${isDark ? 'bg-[#474747] text-white' : 'bg-primary text-[#474747]'}`} style={{ overflowX: 'clip' }}>
      
      {/* ESTILOS GLOBALES DE NAVEGACIÓN */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 110px;
        }
        @keyframes mobileMenuIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes glassStatIn {
          from { opacity: 0; transform: translateY(18px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        @keyframes glassGlow {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50%       { text-shadow: 0 0 24px rgba(138,208,178,0.5), 0 0 48px rgba(89,166,228,0.2); }
        }
        @keyframes glassShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glassPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        .glass-stat { animation: glassStatIn 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .glass-stat:nth-child(1) { animation-delay: 0.05s; }
        .glass-stat:nth-child(2) { animation-delay: 0.15s; }
        .glass-stat:nth-child(3) { animation-delay: 0.25s; }
        .glass-number { animation: glassGlow 3s ease-in-out infinite; }
        .glass-shimmer-text {
          background: linear-gradient(90deg, currentColor 20%, rgba(138,208,178,0.9) 50%, currentColor 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: glassShimmer 4s linear infinite;
        }
        .glass-subtitle { animation: glassPulse 3s ease-in-out infinite; }

        @keyframes revealUp {
          from { opacity: 0; transform: translateY(30px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        section[id] {
          opacity: 0;
          transform: translateY(30px);
          filter: blur(8px);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1),
                      transform 0.8s cubic-bezier(0.22,1,0.36,1),
                      filter 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        section[id].revealed {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
        @keyframes tokenCopied {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .token-copied { animation: tokenCopied 0.3s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <DesignSystemHeader menuGroups={menuGroups} searchResults={searchResults} isDark={isDark} onToggleDark={toggleDark} />

      {/* HERO SECTION - Círculos reactivos al Mouse */}
      <main className="pt-48 px-[60px] max-w-7xl mx-auto space-y-32 pb-24">
        
        <section className="max-w-4xl relative">
          {/* Círculos outline - scroll en móvil, scroll + mouse en desktop */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 520,
              height: 520,
              right: -120 + scrollY * 0.06 + mouseX * 0.03,
              top: -80 - scrollY * 0.04 + mouseY * 0.025,
              background: 'transparent',
              border: isDark ? '1.5px solid rgba(214, 243, 145, 0.15)' : '1.5px solid rgba(0, 130, 124, 0.12)',
              transition: 'right 0.7s cubic-bezier(0.22, 1, 0.36, 1), top 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 360,
              height: 360,
              right: -60 + scrollY * 0.1 - mouseX * 0.04,
              top: 120 - scrollY * 0.06 - mouseY * 0.035,
              background: 'transparent',
              border: isDark ? '1px solid rgba(214, 243, 145, 0.1)' : '1px solid rgba(0, 130, 124, 0.08)',
              transition: 'right 0.9s cubic-bezier(0.22, 1, 0.36, 1), top 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          {/* Reflejo pistacho sutil */}
          <div 
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 280,
              height: 280,
              right: 20,
              top: 40,
              background: isDark ? 'rgba(214, 243, 145, 0.08)' : 'rgba(214, 243, 145, 0.14)',
              filter: 'blur(50px)',
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#D6F391]' : 'bg-[#00827C]'}`} />
              <span className={`text-xs font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>
                Catálogo Maestro &middot; Guía Oficial
              </span>
            </div>
            <h1 className={`text-4xl sm:text-5xl md:text-[5rem] font-bold tracking-tighter leading-[1.05] mb-8 text-primary`}>
              Identidad de la<br/>Calculadora de Reúso
            </h1>
            <p className={`${isDark ? 'text-white/60' : 'text-[#474747]'} text-xl leading-relaxed max-w-2xl font-medium`}>
              Guía oficial de estilos y componentes. Descubre lo que puedes hacer en nuestro sistema de diseño.
            </p>
          </div>
        </section>

        {/* SECCION 01: COLOR */}
        <section id="s01-color" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Arquitectura de color</h2>
          </div>
          <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} text-[15px] font-medium mb-12 max-w-3xl`}>Las familias cromáticas organizadas lógicamente. El <strong>Negro Lurdes (#474747)</strong> es el fondo de página en modo noche. Nuestra identidad se basa en binomios dinámicos: en el modo <strong>Día</strong> predominan el <strong>Blanco Puro</strong> y el <strong>Verde Sostenible</strong>; mientras que en el modo <strong>Noche</strong> la armonía maestra se construye con <strong>Negro Lurdes</strong> y acentos en <strong>Sueños de Pistacho</strong>.</p>
          
          <div className="space-y-16">
            
            <div className="mb-12">
              <h3 className={`text-xs font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6`}>A. Identidad y Fondo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { name: 'Blanco Puro', hex: '#FFFFFF', border: true },
                  { name: 'Negro Lurdes', hex: '#474747' },
                  { name: 'Verde Sostenible', hex: '#00827C' },
                ].map(color => (
                  <div key={color.name} className="flex flex-col gap-4">
                    <div className={`h-28 w-full rounded-[2rem] shadow-lg transition-transform hover:scale-105 ${color.border ? 'border border-[#00827C]/10' : ''}`} style={{ backgroundColor: color.hex }} />
                    <div className="px-1 flex items-center justify-between group/hex">
                      <div>
                        <div className={`text-[13px] font-bold text-primary`}>{color.name}</div>
                        <div className={`text-[10px] font-bold mt-1 select-all flex items-center gap-1.5 ${isDark ? 'text-white/60' : 'text-[#00827C]/60'}`}>
                          {color.hex}
                          <button 
                            onClick={() => navigator.clipboard.writeText(color.hex)}
                            className="opacity-0 group-hover/hex:opacity-100 transition-opacity hover:scale-110 active:scale-95"
                            title="Copiar HEX"
                          >
                            <Copy size={12} strokeWidth={2.5} className={isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-12">
              <h3 className={`text-xs font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6`}>B. Familias Secundarias (Acentos)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
                {[
                  { name: 'Nogal Hogar', hex: '#AD7C43' },
                  { name: 'Celeste Horizonte', hex: '#59A6E4' },
                  { name: 'Aroma de Menta', hex: '#8AD0B2' },
                  { name: 'Rosa Ciclo', hex: '#F3BBD3' },
                  { name: 'Violeta Trazabilidad', hex: '#985fa1' },
                  { name: 'Sueños de Pistacho', hex: '#D6F391' },
                ].map(color => (
                  <div key={color.name} className="flex flex-col gap-4">
                    <div className="h-16 w-full rounded-2xl transition-transform hover:scale-105" style={{ backgroundColor: color.hex }} />
                    <div className="flex items-center justify-between group/hex">
                      <div>
                        <div className={`text-[13px] font-bold text-primary`}>{color.name}</div>
                        <div className={`text-[10px] font-bold mt-1 select-all flex items-center gap-1.5 ${isDark ? 'text-white/60' : 'text-[#00827C]/60'}`}>
                          {color.hex}
                          <button 
                            onClick={() => navigator.clipboard.writeText(color.hex)}
                            className="opacity-0 group-hover/hex:opacity-100 transition-opacity"
                          >
                            <Copy size={10} strokeWidth={2.5} className={isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-12">
              <h3 className={`text-xs font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6`}>C. Estados Semánticos Web</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                {[
                  { name: 'Éxito', hex: '#38B98E' },
                  { name: 'Advertencia', hex: '#F6BF3E' },
                  { name: 'Error Crítico', hex: '#FF5E4B' },
                ].map(color => (
                  <div key={color.name} className="flex flex-col gap-4">
                    <div className="h-10 w-full rounded-xl transition-transform hover:scale-105" style={{ backgroundColor: color.hex }} />
                    <div className="flex items-center justify-between group/hex">
                      <div>
                        <div className={`text-[13px] font-bold text-primary`}>{color.name}</div>
                        <div className={`text-[10px] font-bold mt-1 select-all flex items-center gap-1.5 ${isDark ? 'text-white/60' : 'text-[#00827C]/60'}`}>
                          {color.hex}
                          <button 
                            onClick={() => navigator.clipboard.writeText(color.hex)}
                            className="opacity-0 group-hover/hex:opacity-100 transition-opacity"
                          >
                            <Copy size={10} strokeWidth={2.5} className={isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* D. Liquid Glass - Especificación Técnica */}
            <div className="mb-8">
              <h3 className={`text-xs font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6`}>Liquid Glass - Especificación Técnica</h3>
              <div className={`p-8 rounded-[2.5rem] relative overflow-hidden group/glass ${liquidGlassClass}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  <div className="glass-stat flex flex-col gap-2">
                    <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Transparencia</span>
                    <span className={`glass-number text-4xl font-black text-primary`}>65%</span>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-[#00827C]/50'}`}>bg-white/35 (Día) · bg-[#D6F391]/08 (Noche)</span>
                    </div>
                    <div className="glass-stat flex flex-col gap-2">
                    <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Blur</span>
                    <span className={`glass-number text-4xl font-black text-primary`}>60px</span>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-[#00827C]/50'}`}>backdrop-blur-[60px] · saturate(200%)</span>
                    </div>
                    <div className="glass-stat flex flex-col gap-2">
                    <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Borde</span>
                    <span className={`glass-number text-4xl font-black text-primary`}>10%</span>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-[#00827C]/50'}`}>border-[#00827C]/10 (Día) · border-white/10 (Noche)</span>
                  </div>
                </div>
                {/* Reflejos - Tríada Bio (reactivos a mouse o scroll) */}
                <div
                  className="absolute -top-16 -right-16 w-32 sm:w-72 md:w-96 h-32 sm:h-72 md:h-96 bg-[#59A6E4]/45 blur-[30px] md:blur-[80px] rounded-full pointer-events-none"
                  style={{ transform: `translate(${mouseX * 0.08 + (scrollY * 0.05)}px, ${mouseY * 0.07}px)`, transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }}
                />
                <div
                  className="absolute top-1/2 left-1/2 w-40 sm:w-64 md:w-80 h-40 sm:h-64 md:h-80 bg-[#8AD0B2]/40 blur-[35px] md:blur-[70px] rounded-full pointer-events-none"
                  style={{ transform: `translate(calc(-50% + ${-mouseX * 0.06}px), calc(-50% + ${-mouseY * 0.06 + (scrollY * 0.03)}px))`, transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }}
                />
                <div
                  className="absolute -bottom-16 -left-16 w-32 sm:w-72 md:w-96 h-32 sm:h-72 md:h-96 bg-[#F3BBD3]/45 blur-[30px] md:blur-[80px] rounded-full pointer-events-none"
                  style={{ transform: `translate(${-mouseX * 0.08 - (scrollY * 0.05)}px, ${-mouseY * 0.07}px)`, transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECCION 02: TIPOGRAFÍA */}
        <section id="s02-typography" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Fuentes</h2>
          </div>
          <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} text-[15px] font-medium mb-4 max-w-3xl`}>
            Tres familias tipográficas conforman la identidad textual de Reúso: <strong>Seravek</strong> para títulos y encabezados de gran formato, <strong>Open Sans</strong> para la interfaz general, cuerpo de texto y comunicación, y la <strong>monoespaciada del sistema</strong> para tokens técnicos y código.
          </p>
          <div className={`p-6 mb-12 rounded-2xl ${isDark ? 'bg-[#D6F391]/10 text-white' : 'bg-[#00827C]/5 text-[#474747]'} max-w-3xl`}>
            <h4 className="font-bold mb-2">Normas de Jerarquía (SEO), Puntuación y Mayúsculas</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm font-medium">
              <li><strong>Estructura Headings:</strong> Mantén siempre un orden semántico estricto. <strong>H1</strong> es único por página (Hero), <strong>H2</strong> para secciones principales, <strong>H3</strong> y <strong>H4</strong> para tarjetas o sub-secciones. Usa las clases de CSS para ajustar tamaños visuales sin romper la jerarquía SEO.</li>
              <li><strong>Puntuación Obligatoria:</strong> Todo texto que no sea un título (descripciones, viñetas, características, métricas, etc.) <strong>debe llevar punto final</strong>.</li>
              <li><strong>Prohibición de Mayúsculas Sostenidas:</strong> Prohibido usar MAYÚSCULAS SOSTENIDAS en textos, títulos, antetítulos o botones. El texto debe ser en Capitalize o frase natural.</li>
            </ul>
          </div>
          <div className={`p-10 md:p-14 rounded-[2.5rem] space-y-12 ${liquidGlassClass} border-[#00827C]/10`}>
             <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-6 border-b border-[#00827C]/10 pb-8">
                <div className={`md:col-span-3 text-sm font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Gran formato (display)</div>
                <div className="md:col-span-9"><h1 className={`text-6xl md:text-7xl font-bold text-primary`}>El futuro es ahora</h1></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-6 border-b border-[#00827C]/10 pb-8">
                <div className={`md:col-span-3 text-sm font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Título principal (H1)</div>
                <div className="md:col-span-9"><h1 className={`text-4xl md:text-5xl font-bold text-primary`}>Tu impacto ambiental real</h1></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-6 border-b border-[#00827C]/10 pb-8">
                <div className={`md:col-span-3 text-sm font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Subtítulo (H2)</div>
                <div className="md:col-span-9"><h2 className={`text-3xl font-bold text-primary`}>Categorías de impacto mitigado</h2></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-6 border-b border-[#00827C]/10 pb-8">
                <div className={`md:col-span-3 text-sm font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Sección (H3)</div>
                <div className="md:col-span-9"><h3 className={`text-xl font-bold text-primary`}>Asignación criptográfica de tokens</h3></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-6 border-b border-[#00827C]/10 pb-8">
                <div className={`md:col-span-3 text-sm font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Etiqueta micro</div>
                <div className="md:col-span-9">
                  <div className="flex items-center gap-3">
                     <span className="w-2 h-2 rounded-full bg-[#00827C]" />
                     <span className={`text-[12px] font-semibold text-primary`}>Términos y condiciones</span>
                  </div>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-6 border-b border-[#00827C]/10 pb-8">
                <div className={`md:col-span-3 text-sm font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Monoespaciada</div>
                <div className="md:col-span-9">
                  <code className={`text-sm font-mono ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>var(--color-brand): #00827C</code>
                  <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-[#474747]/70'}`}>JetBrains Mono · Tokens técnicos y código</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-12 items-baseline gap-6">
                <div className={`md:col-span-3 text-sm font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Cuerpo (body)</div>
                <div className="md:col-span-9 space-y-4">
                  <p className={`text-lg leading-relaxed text-primary`}>Este es un texto normal donde aseguramos la lectura prolongada sin cansar la vista. Se utiliza principalmente en descripciones y noticias de la red.</p>
                  <p className={`text-lg leading-relaxed font-bold text-primary`}>Y esto es el cuerpo de texto en su variante negrita o Bold, utilizado para destacar datos críticos en informes.</p>
                </div>
             </div>
          </div>
        </section>

        {/* SECCION 03: BOTONES */}
        <section id="s03-buttons" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-10">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Variantes de botón</h2>
          </div>
          <div className={`p-12 rounded-[3.5rem] grid grid-cols-2 md:grid-cols-3 gap-12 border border-[#00827C]/10 ${isDark ? 'bg-[#D6F391]/05' : 'bg-primary'} shadow-[0_12px_40px_rgba(0,130,124,0.04)]`}>
              <div className="flex flex-col gap-4 items-start">
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>1. Primario Reúso</span>
                <button className={`px-8 py-4 rounded-full font-bold shadow-lg hover:-translate-y-1 transition-all ${isDark ? 'bg-[#D6F391] text-[#474747]' : 'bg-[#00827C] text-white shadow-[0_8px_20px_rgba(0,130,124,0.2)]'}`}>Acción Primaria</button>
              </div>
              <div className="flex flex-col gap-4 items-start">
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>2. Secundario Claro</span>
                <button className={`px-8 py-4 rounded-full font-bold transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#00827C]/5 text-[#474747] hover:bg-[#00827C]/10'}`}>Ver Reportes</button>
              </div>
              <div className="flex flex-col gap-4 items-start">
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>3. Contorno (Institucional)</span>
                <button className={`px-8 py-4 bg-transparent border-2 font-bold rounded-full transition-all ${isDark ? 'border-[#D6F391] text-[#D6F391] hover:bg-[#D6F391] hover:text-[#474747]' : 'border-[#00827C] text-[#00827C] hover:bg-[#00827C] hover:text-white'}`}>Pide tu seguro</button>
              </div>
              <div className="flex flex-col gap-4 items-start">
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>4. Enlace Icono (Fantasma)</span>
                <button className={`px-4 py-2 font-bold rounded-full transition-colors flex items-center gap-2 group ${isDark ? 'text-[#D6F391] hover:bg-white/10' : 'text-[#00827C] hover:bg-[#00827C]/10'}`}>Saber más <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform"/></button>
              </div>
              <div className="flex flex-col gap-4 items-start">
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>5. Alerta / Feedback</span>
                <button className={`px-8 py-4 rounded-full font-bold transition-all text-[12px] border ${isDark ? 'bg-[#F6BF3E]/20 border-[#F6BF3E]/40 text-[#F6BF3E]' : 'bg-[#F6BF3E]/10 border border-[#F6BF3E]/30 text-[#AD7C43] hover:bg-[#F6BF3E]/20'}`}>Validando emisión...</button>
              </div>
              <div className="flex flex-col gap-4 items-start">
                <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>6. Flotante Celeste Acción</span>
                <button className="w-16 h-16 bg-[#59A6E4] text-white rounded-full flex items-center justify-center font-bold shadow-[0_12px_24px_rgba(89,166,228,0.3)] hover:scale-110 active:scale-95 transition-transform"><Plus size={24} strokeWidth={2.5}/></button>
              </div>
              <div className="flex flex-col gap-4 items-start md:col-span-3">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>7. Línea Inferior (Tab) - Con y Sin Icono</span>
                </div>
                <div className="flex flex-col gap-8 w-full">
                  <div className="flex gap-8">
                    <button className={`pb-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${isDark ? 'border-[#D6F391] text-[#D6F391]' : 'border-[#00827C] text-[#00827C]'}`}><Tree size={16} strokeWidth={2.5}/> Activo</button>
                    <button className={`pb-2 border-b-2 border-transparent ${isDark ? 'text-white/40' : 'text-[#00827C]/40'} font-bold text-sm transition-all flex items-center gap-2 ${isDark ? 'hover:text-[#D6F391] hover:border-[#D6F391]/40' : 'hover:text-[#00827C] hover:border-[#00827C]/30'}`}><Leaf size={16} strokeWidth={2.5}/> Inactivo</button>
                    <button className={`pb-2 border-b-2 border-transparent ${isDark ? 'text-white/40' : 'text-[#00827C]/40'} font-bold text-sm transition-all flex items-center gap-2 ${isDark ? 'hover:text-[#D6F391] hover:border-[#D6F391]/40' : 'hover:text-[#00827C] hover:border-[#00827C]/30'}`}><Buildings size={16} strokeWidth={2.5}/> Otro Tab</button>
                  </div>
                  <div className="flex gap-8">
                    <button className={`pb-2 border-b-2 font-bold text-sm transition-all ${isDark ? 'border-[#D6F391] text-[#D6F391]' : 'border-[#00827C] text-[#00827C]'}`}>Solo Texto</button>
                    <button className={`pb-2 border-b-2 border-transparent ${isDark ? 'text-white/40' : 'text-[#00827C]/40'} font-bold text-sm transition-all ${isDark ? 'hover:text-[#D6F391] hover:border-[#D6F391]/40' : 'hover:text-[#00827C] hover:border-[#00827C]/30'}`}>Variante Simple</button>
                  </div>
                </div>
              </div>
          </div>
        </section>

        {/* SECCION 04: TARJETAS & KPI */}
        <section id="s04-cards" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-10">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Tarjetas de Identidad y KPI</h2>
          </div>
          
          {/* A. FORMAS DE TARJETA FIRMA */}
          <div className="mb-16">
            <h3 className={`text-sm font-bold mb-8 ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>A. Geometrías de Firma Reúso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 items-center">
               
               <div className="flex flex-col gap-6">
                 <div className="aspect-square w-full rounded-[40px] shadow-[0_24px_48px_rgba(71,71,71,0.4)] p-10 flex flex-col justify-end transition-transform hover:-translate-y-2 duration-500" style={{ backgroundColor: isDark ? '#FFFFFF' : '#474747' }}>
                    <h4 className={`text-2xl font-bold mb-2 ${isDark ? 'text-[#474747]' : 'text-white'}`}>Marco Hero Estadio</h4>
                    <p className={`text-xs leading-relaxed max-w-[200px] ${isDark ? 'text-[#D6F391]/60' : 'text-white/40'}`}>Radio 40px &bull; bg {isDark ? 'Blanco Puro' : 'Negro Lurdes'} &bull; sombra 0 24 48 / 0.08 &bull; contenedor multimedia</p>
                 </div>
                 <div className="text-center"><span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>&bull; Héroe Estadio</span></div>
               </div>

               {/* 2. Tarjeta Retrato Circular - Botón en el borde exterior */}
                <div className="flex flex-col gap-6 items-center group">
                  <div className="w-64 h-64 relative transition-all hover:scale-105 duration-500">
                    <div className="w-full h-full rounded-full shadow-2xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#D6F391' }}>
                      <User size={80} className="text-[#00827C] opacity-40 group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <button className="absolute bottom-[18%] -right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg text-[#474747] hover:rotate-45 transition-transform z-10 border border-black/5">
                      <ArrowRight size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-1`}>&bull; Retrato Circular</span>
                    <div className={`text-sm font-bold text-primary`}>Curva Orgánica Firma</div>
                  </div>
                </div>

               {/* 3. Fila Editorial Cápsula - Fuente corregida */}
               <div className="flex flex-col gap-6">
                 <div className={`w-full h-64 rounded-[120px] border border-[#00827C]/10 shadow-[0_24px_48px_rgba(0,130,124,0.06)] flex items-center justify-center p-12 text-center transition-transform hover:rotate-1 duration-500 ${isDark ? 'bg-white/10' : 'bg-[#FCFBFA]'}`}>
                    <div className="flex flex-col items-center">
                      <h4 className={`text-xl font-bold mb-2 text-primary`}>Fila Editorial Cápsula</h4>
                      <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-[#474747]/60'}`}>Radio 999px &bull; bg Blanco Roto &bull; sombra 0 24 48 / 0.08</p>
                    </div>
                 </div>
                 <div className="text-center"><span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>&bull; Cápsula editorial</span></div>
               </div>

            </div>
          </div>

          <div className="mb-8">
            <h3 className={`text-sm font-bold mb-8 ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>B. Indicadores KPI Administrativos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Usuarios registrados', val: '4', icon: Users, c: 'bg-[#00827C]' },
                { title: 'Empresas activas', val: '1', icon: Buildings, c: 'bg-[#59A6E4]' },
                { title: 'Cálculos realizados', val: '33', icon: Calculator, c: 'bg-[#F6BF3E]' },
                { title: 'Total evitado', val: '0.60 t CO₂ eq', icon: Leaf, c: 'bg-[#38B98E]', extra: undefined },
              ].map((k, i) => (
                <div key={i} className={`p-6 rounded-[1.5rem] flex items-start gap-4 transition-all hover:-translate-y-2 hover:shadow-xl ${liquidGlassClass}`}>
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0`}>
                     <k.icon size={24} className={isDark ? 'text-white' : ''} style={{ color: !isDark ? k.c.replace('bg-[', '').replace(']', '') : '' }} />
                   </div>
                   <div className="flex flex-col">
                     <span className={`text-xs mb-1 font-semibold ${isDark ? 'text-white/40' : 'text-[#00827C]/60'}`}>{k.title}</span>
                     <div className="flex items-baseline gap-2">
                       <span className={`text-3xl font-bold tracking-tighter ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>{k.val}</span>
                       <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#38B98E]'}`}>+4,5%</span>
                     </div>
                     <span className={`text-[10px] mt-1 font-bold tracking-widest ${isDark ? 'text-white/20' : 'text-[#00827C]/40'}`}>{k.extra || 'esta semana'}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECCION 05: FORMULARIOS */}
        <section id="s05-forms" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-10">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Elementos de formulario</h2>
          </div>
          <div className={`p-10 rounded-[3.5rem] border ${isDark ? 'border-white/10 bg-[#D6F391]/05 backdrop-blur-md' : 'border-[#00827C]/10 bg-primary'} shadow-[0_12px_40px_rgba(0,130,124,0.04)] max-w-4xl`}>
             <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="flex flex-col gap-2">
                 <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Nombre Completo</span>
                 <input type="text" placeholder="Ej. Juan Pérez" className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-[#D6F391]/30' : 'bg-primary border-[#00827C]/20 text-[#474747] focus:ring-2 focus:ring-[#00827C]/20'} outline-none`} />
               </div>
               <div className="flex flex-col gap-2">
                 <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Correo Institucional</span>
                 <input type="email" placeholder="usuario@calculadoradereuso.com" className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-[#D6F391]/30' : 'bg-primary border-[#00827C]/20 text-[#474747] focus:ring-2 focus:ring-[#00827C]/20'} outline-none`} />
               </div>
               <div className="flex flex-col gap-2 relative">
                 <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Contraseña Institucional</span>
                 <div className="relative">
                   <input type={showPwd ? "text" : "password"} placeholder="•••••••••" className={`w-full px-6 py-4 rounded-full border transition-all font-sans tracking-widest ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-[#D6F391]/30' : 'bg-primary border-[#00827C]/20 text-[#474747] focus:ring-2 focus:ring-[#00827C]/20'} outline-none`} />
                   <button type="button" onClick={() => setShowPwd(!showPwd)} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isDark ? 'text-[#D6F391]/60 hover:bg-white/10 hover:text-[#D6F391]' : 'text-[#00827C]/50 hover:bg-[#00827C]/10 hover:text-[#00827C]'}`}>
                     {showPwd ? <EyeSlash size={22} strokeWidth={1.5}/> : <Eye size={22} strokeWidth={1.5}/>}
                   </button>
                 </div>
               </div>
               <div className="flex items-end mb-1">
                 <div className={`w-full h-[54px] flex items-center px-6 rounded-full border font-bold text-sm ${isDark ? 'bg-[#38B98E]/10 border-[#38B98E]/20 text-[#38B98E]' : 'bg-[#38B98E]/10 border-[#38B98E]/30 text-[#00827C]'}`}>&#10003; Validación exitosa</div>
               </div>
               <div className="flex flex-col gap-2 md:col-span-2">
                 <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Mensaje de Impacto</span>
                 <textarea placeholder="Cuéntanos tu objetivo..." className={`p-4 rounded-2xl border transition-all h-32 resize-none ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-[#D6F391]/30' : 'bg-primary border-[#00827C]/20 text-[#474747] focus:ring-2 focus:ring-[#00827C]/20'} outline-none`} />
               </div>
             </form>
          </div>
        </section>

        {/* COLUMNA DOBLE: RADIOS Y ELEVACION */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-20 border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          
          <section id="s06-radius">
            <div className="flex items-center gap-4 mb-10">
              <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Escala de radios</h2>
            </div>
            <div className={`grid grid-cols-2 lg:grid-cols-3 gap-6 p-10 rounded-[2.5rem] border border-[#00827C]/10 ${isDark ? 'bg-white/5' : 'bg-[#00827C]/[0.02]'}`}>
              {[
                  { r: '2px', cls: 'rounded-sm', label: 'Micro validación' },
                  { r: '8px', cls: 'rounded-lg', label: 'Desplegables' },
                  { r: '16px', cls: 'rounded-2xl', label: 'Tablas e Interior' },
                  { r: '24px', cls: 'rounded-[1.5rem]', label: 'Widgets Base' },
                  { r: '40px', cls: 'rounded-[2.5rem]', label: 'Tarjetas y Paneles' },
                  { r: '999px', cls: 'rounded-full', label: 'Botones y Etiquetas' },
              ].map(rad => (
                <div key={rad.r} className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 transition-all ${isDark ? 'bg-white/10 border border-[#D6F391]/30' : 'bg-[#00827C]/10 border border-[#00827C]/30'} ${rad.cls}`} />
                  <div className="text-center">
                    <div className={`text-xs font-bold text-primary`}>{rad.r}</div>
                    <div className={`text-[9px] ${isDark ? 'text-white/40' : 'text-[#00827C]/50'}`}>{rad.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="s07-elevation">
            <div className="flex items-center gap-4 mb-10">
              <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Elevación y profundidad</h2>
            </div>
            <div className="space-y-6">
              {[
                { name: 'Plano (shadow-sm)', base: 'shadow-sm', text: 'Base de campos de texto' },
                { name: 'Tarjeta Flotante (shadow-lg)', base: 'shadow-[0_12px_24px_rgba(0,130,124,0.06)]', text: 'Tarjetas en lienzo puro' },
                { name: 'Cristal Profundo Liquid (shadow-2xl)', base: 'shadow-[0_32px_64px_rgba(0,130,124,0.15),inset_2px_2px_0_rgba(255,255,255,0.7)]', text: 'Paneles Maestros de Cristal' },
              ].map(el => (
                <div key={el.name} className={`h-24 w-full rounded-2xl flex flex-col justify-center px-6 transition-all relative overflow-hidden ${isDark ? 'bg-white/[0.03] border border-white/10 backdrop-blur-[20px] saturate-[180%]' : 'bg-primary border border-[#00827C]/10'} ${el.base}`}>
                  {isDark && <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/[0.05] to-transparent pointer-events-none" />}
                  <h4 className={`font-bold text-primary select-all relative z-10`}>{el.name}</h4>
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#474747]'} relative z-10`}>{el.text}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* SECCION 08: TONO E INTERACCION - Banner Liquid Glass restaurado */}
        <section id="s08-tono" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-16">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Tono e interacción</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-active`}><Globe size={32} className={isDark ? 'text-white' : 'text-[#00827C]'} /></div>
                 <div>
                   <h4 className={`text-xl font-bold mb-2 text-primary`}>Voz Positiva y Activa</h4>
                   <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} leading-relaxed font-medium`}>Construimos confianza ambiental con datos trazables y un lenguaje visual premium. <strong>Reglas de redacción:</strong> Escribe siempre en <strong>voz activa</strong> para empoderar al usuario. <strong>Evita por completo el uso de punto y coma (;)</strong> y utiliza oraciones cortas y asertivas. Recuerda que todo texto que no sea título debe finalizar con punto.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#38B98E]/10'}`}><Tree size={32} className={isDark ? 'text-white' : 'text-[#00827C]'} /></div>
                 <div>
                   <h4 className={`text-xl font-bold mb-2 text-primary`}>Filosofía de Cuidado Bio</h4>
                   <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} leading-relaxed font-medium`}>No solo medimos CO₂, celebramos la vida. La interfaz debe respirar, dejando aire entre elementos (espaciado generoso) y colores inspirados en la fotosíntesis.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#59A6E4]/10'}`}><Crosshair size={32} className={isDark ? 'text-white' : 'text-[#59A6E4]'} /></div>
                 <div>
                   <h4 className={`text-xl font-bold mb-2 text-primary`}>Rigor Legal y Cero Promesas</h4>
                   <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} leading-relaxed font-medium`}><strong>Principio de no prometer nada indemostrable:</strong> Prohibido usar superlativos o afirmaciones absolutas como &ldquo;software líder&rdquo;, &ldquo;el mejor&rdquo;, &ldquo;100% garantizado&rdquo; o prometer certificaciones oficiales. Habla siempre de &ldquo;estimaciones ambientales documentadas&rdquo;, &ldquo;respaldo técnico&rdquo; y &ldquo;trazabilidad&rdquo;, protegiendo a la marca frente a riesgos legales y acusaciones de greenwashing.</p>
                 </div>
              </div>
            </div>
            {/* Banner Liquid Glass con dos reflejos */}
            <div className={`p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] ${liquidGlassClass} aspect-video flex items-center justify-center relative overflow-hidden group border shadow-2xl`}>
                {/* Reflejos de Liquid Glass - Tríada Bio Expansiva (Mouse o Scroll) */}
                <div
                  className="absolute -top-20 -right-20 w-[70%] md:w-[55%] h-[70%] md:h-[55%] bg-[#59A6E4]/40 blur-[40px] md:blur-[100px] rounded-full pointer-events-none"
                  style={{ transform: `translate(${mouseX * 0.09 + (scrollY * 0.08)}px, ${mouseY * 0.08}px)`, transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }}
                />
                <div
                  className="absolute top-1/2 left-1/2 w-[65%] md:w-[50%] h-[65%] md:h-[50%] bg-[#8AD0B2]/35 blur-[35px] md:blur-[90px] rounded-full pointer-events-none"
                  style={{ transform: `translate(calc(-50% + ${-mouseX * 0.07}px), calc(-50% + ${-mouseY * 0.07 + (scrollY * 0.05)}px))`, transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }}
                />
                <div
                  className="absolute -bottom-20 -left-20 w-[70%] md:w-[55%] h-[70%] md:h-[55%] bg-[#F3BBD3]/40 blur-[40px] md:blur-[100px] rounded-full pointer-events-none"
                  style={{ transform: `translate(${-mouseX * 0.09 - (scrollY * 0.08)}px, ${-mouseY * 0.08}px)`, transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)', willChange: 'transform' }}
                />
               {/* Contenido central */}
               <div className="relative z-10 text-center">
                 <div className={`glass-shimmer-text text-5xl font-black mb-3 text-primary`}>
                   Reúso Glass
                 </div>
                 <p className={`glass-subtitle text-sm font-bold ${isDark ? 'text-[#D6F391]/60' : 'text-[#474747]/60'}`}>Transparencia &middot; Blur &middot; Saturación</p>
               </div>
            </div>
          </div>
        </section>


        {/* SECCION 09: ESTÁNDAR DE TABLAS Y DATOS */}
        <section id="s09-tablas" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Estándar de tablas y datos</h2>
          </div>
          <p className={`text-base ${isDark ? 'text-white/60' : 'text-[#474747]'} font-medium mb-8 max-w-3xl`}>
            La legibilidad en scroll y la interacción estructurada son mandatos institucionales. El modelo de tabla del <strong>Cotizador (/empresa/cotizador)</strong> define el estándar para todo el ecosistema Reúso: barra de control superior con pestañas de filtro, búsqueda en tiempo real, ordenamiento, celdas zebra, estados semánticos y paginación.
          </p>

          {/* Reglas de Diseño Explícitas */}
          <div className={`p-6 mb-10 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#00827C]/5 border-[#00827C]/15'} max-w-4xl`}>
            <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>
              <ShieldCheck size={18} /> Reglas Obligatorias del Sistema de Diseño
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] mt-1.5 flex-shrink-0" />
                <span><strong>Prohibición de mayúsculas sostenidas:</strong> Nunca uses texto en mayúsculas completas en títulos, botones o tablas, salvo siglas normativas (NIT, CO₂, UUID, PDF, QA, IA, ARCO, RGPD, CCPA).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] mt-1.5 flex-shrink-0" />
                <span><strong>ThemeToggle en footer:</strong> El interruptor de tema (Modo Día / Modo Noche) debe ubicarse siempre en la primera línea del pie de página a la derecha.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] mt-1.5 flex-shrink-0" />
                <span><strong>Colores inmutables vs adaptables:</strong> Los colores semánticos (#00827C, #38B98E, #D6F391, #F6BF3E, #FF5E4B) mantienen su identidad visual pero adaptan su contraste sobre fondo oscuro #474747.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] mt-1.5 flex-shrink-0" />
                <span><strong>Microanimaciones táctiles:</strong> Todos los elementos interactivos deben incluir clases de transición suave (<code>hover-pop</code>, <code>hover-press</code>, microescalas de 1.05x).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] mt-1.5 flex-shrink-0" />
                <span><strong>Formato de números en Colombia:</strong> En COP y números de plataforma, los millones se separan con apóstrofo (<code>&apos;</code>), ej. <code>$1&apos;490.000</code> o <code>$14&apos;900.000</code>. Los miles con punto (<code>.</code>), ej. <code>$49.000</code>. Los decimales/centavos con coma (<code>,</code>), ej. <code>,67</code>, ubicados <strong>en la misma línea horizontal</strong> pero visualmente más pequeños (como en <code>/admin/contenido</code>, tamaño aprox. <code>0.8em</code>, <strong>heredando siempre el mismo peso tipográfico del número, nunca en negrita</strong>). Prohibido usar comas anglosajonas para miles (<code>$1,490,000</code>) o puntos para millones (<code>$1.490.000</code>).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] mt-1.5 flex-shrink-0" />
                <span><strong>Regla de redondeo:</strong> El redondeo solo existe como sugerencia editable en <code>/admin/contenido</code>. De resto, en ninguna pantalla pública ni cotización hay redondeo: el precio real que es es el que se muestra.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00827C] mt-1.5 flex-shrink-0" />
                <span><strong>Alineación y edición monetaria:</strong> Todo número o precio va alineado a la derecha en tablas y reportes, con el símbolo de moneda <code>$</code> a la izquierda. Los inputs deben formatear en vivo sin alterar el cursor ni duplicar cajas de texto.</span>
              </li>
            </ul>
          </div>

          {/* MODELO COMPLETO DE TABLA: Patrón Cotizador (/empresa/cotizador) */}
          <TablaCotizadorDemo />
        </section>

        {/* SECCION 10: TOKENS DEL SISTEMA */}
        <section id="s10-tokens" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Tokens del sistema</h2>
          </div>
          <p className={`text-lg ${isDark ? 'text-white/50' : 'text-[#474747]'} font-medium mb-3 max-w-2xl`}>
            Cada elemento del manual tiene un nombre. Úsalos para dar instrucciones exactas.
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-12 ${isDark ? 'bg-[#D6F391]/10 text-[#D6F391]' : 'bg-[#00827C]/8 text-[#00827C]'}`}>
            <Copy size={13} strokeWidth={2.5} /> Toca el nombre de cualquier token para copiarlo
          </div>

          <div className="space-y-14">
            {DESIGN_TOKENS.map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-3 mb-6">
                  <h3 className={`text-xs font-black ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>{group.category}</h3>
                  <div className={`flex-1 h-px bg-active`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.tokens.map((token) => {
                    const isCopied = copiedToken === token.name
                    const previewType = token.preview.split(':')[0]
                    const previewValue = token.preview.split(':')[1]

                    return (
                      <button
                        key={token.name}
                        className={`text-left p-5 rounded-[1.75rem] border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,130,124,0.08)] group ${isCopied ? 'token-copied' : ''} ${isDark ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-primary border-[#00827C]/10 hover:border-[#00827C]/20'}`}
                        onClick={() => {
                          navigator.clipboard.writeText(token.name)
                          setCopiedToken(token.name)
                          setTimeout(() => setCopiedToken(null), 1800)
                        }}
                      >
                        {/* Preview visual */}
                        <div className="mb-4 h-10 flex items-center">
                          {previewType === 'color' && (
                            <div className="w-10 h-10 rounded-xl shadow-sm border border-black/5 flex-shrink-0" style={{ backgroundColor: previewValue }} />
                          )}
                          {previewType === 'glass-day' && (
                            <div className="w-10 h-10 rounded-xl bg-white/35 backdrop-blur-[20px] border border-[#00827C]/15 shadow-md" />
                          )}
                          {previewType === 'glass-night' && (
                             <div className="w-10 h-10 rounded-xl bg-[#D6F391]/08 backdrop-blur-[20px] border border-white/15 shadow-md" />
                          )}
                          {previewType === 'radius' && (
                            <div className={`w-10 h-10 flex-shrink-0 ${isDark ? 'bg-white/20 border border-white/30' : 'bg-[#00827C]/15 border border-[#00827C]/30'}`}
                              style={{ borderRadius: previewValue === '999' ? '999px' : `${previewValue}px` }} />
                          )}
                          {previewType === 'shadow' && (
                            <div className="w-10 h-10 rounded-xl bg-primary"
                              style={{ boxShadow: previewValue === '15' ? '0 32px 64px rgba(0,130,124,0.15)' : previewValue === '6' ? '0 12px 24px rgba(0,130,124,0.06)' : '0 4px 20px rgba(0,130,124,0.06)' }} />
                          )}
                          {previewType === 'motion' && (
                            <div className={`h-2 rounded-full overflow-hidden bg-active`} style={{ width: '2.5rem' }}>
                              <div className="h-full bg-[#00827C] rounded-full animate-pulse" />
                            </div>
                          )}
                          {(previewType === 'anim-in' || previewType === 'anim-glow' || previewType === 'anim-shimmer' || previewType === 'anim-pulse') && (
                            <div className={`text-xs font-black px-3 py-1.5 rounded-full ${isDark ? 'bg-[#D6F391]/15 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]'} ${previewType === 'anim-shimmer' ? 'glass-shimmer-text' : previewType === 'anim-pulse' ? 'glass-subtitle' : previewType === 'anim-glow' ? 'glass-number' : 'glass-stat'}`}>
                              Aa
                            </div>
                          )}
                        </div>

                        {/* Nombre del token */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <code className={`text-sm font-black tracking-tight ${isCopied ? 'text-[#38B98E]' : isDark ? 'text-white' : 'text-[#474747]'}`}>
                            {isCopied ? '¡Copiado!' : token.name}
                          </code>
                          <Copy size={12} strokeWidth={2.5} className={`flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-primary`} />
                        </div>

                        {/* Valor */}
                        <p className={`text-[10px] font-mono leading-relaxed mb-1.5 ${isDark ? 'text-white/30' : 'text-[#474747]/60'}`}>{token.value}</p>

                        {/* Descripción */}
                        <p className={`text-[11px] font-medium ${isDark ? 'text-white/50' : 'text-[#474747]/80'}`}>{token.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECCION 11: ICONOGRAFÍA Lucide */}
        <section id="s11-iconografia" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Iconografía</h2>
            </div>
            <a 
              href="https://lucide.dev/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#00827C]/5 text-[#00827C] hover:bg-[#00827C]/10'}`}
            >
              Explorar librería Lucide <ArrowRight size={16} strokeWidth={2.5} />
            </a>
          </div>
          <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} text-[15px] font-medium mb-8 max-w-3xl`}>
            Piedra angular de la comunicación visual. El sistema unifica <strong>Lucide React</strong> y <strong>Phosphor Icons</strong> bajo una estricta equivalencia geométrica: <strong>Lucide utiliza <code>strokeWidth=1.3</code></strong> (inyectado globalmente en todo el sistema) y <strong>Phosphor utiliza <code>weight=&quot;regular&quot;</code></strong>. Esta calibración elimina cualquier disparidad visual, logrando una estética coherente, ligera y armónica sin saturación óptica ni sensación de trazos pesados.
          </p>

          {/* Módulo Destacado: Comparación Visual de Unificación (Lucide 1.3 vs Phosphor Regular) */}
          <div className={`p-8 md:p-10 rounded-[2.5rem] border mb-12 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#00827C]/10'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <span className={`text-[10px] font-bold tracking-wider ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} block mb-1`}>
                  Estándar de Unificación Geométrica
                </span>
                <h3 className="text-xl font-bold text-primary">Comparativa Directa de Librerías (Trazo 1.3 = Regular)</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00827C]" /> Lucide (strokeWidth=1.3)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#985fa1]" /> Phosphor (weight=&quot;regular&quot;)
                </span>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'} mb-8 max-w-4xl`}>
              Ambas bibliotecas se renderizan lado a lado con sus íconos conceptualmente homólogos. Nótese cómo la densidad del trazo, la escala y la ligereza son exactamente idénticas, garantizando que el usuario perciba un único lenguaje visual integral.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {[
                { label: 'Mobiliario', LucideComp: Armchair, PhComp: PhArmchair },
                { label: 'Logística', LucideComp: Truck, PhComp: PhTruck },
                { label: 'Empresas', LucideComp: Buildings, PhComp: PhBuildings },
                { label: 'Inventario', LucideComp: Package, PhComp: PhPackage },
                { label: 'Sostenibilidad', LucideComp: Leaf, PhComp: PhPlant },
                { label: 'Usuario', LucideComp: User, PhComp: PhUser },
                { label: 'Herramientas', LucideComp: Wrench, PhComp: PhWrench },
                { label: 'Búsqueda', LucideComp: MagnifyingGlass, PhComp: PhMagnifyingGlass },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${isDark ? 'bg-black/20 border-white/5 hover:border-[#D6F391]/30' : 'bg-white border-[#474747]/10 hover:border-[#00827C]/30'}`}
                >
                  <span className={`text-[10px] font-bold mb-3 ${isDark ? 'text-white/70' : 'text-[#474747]'}`}>{item.label}</span>
                  <div className="flex items-center justify-center gap-3 my-2">
                    <div className="flex flex-col items-center gap-1" title="Lucide strokeWidth=1.3">
                      <item.LucideComp size={24} strokeWidth={1.3} className={isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} />
                      <span className="text-[8px] font-medium opacity-50 text-primary">Lucide</span>
                    </div>
                    <div className={`w-px h-6 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                    <div className="flex flex-col items-center gap-1" title="Phosphor weight=regular">
                      <item.PhComp size={24} weight="regular" className={isDark ? 'text-[#F3BBD3]' : 'text-[#985fa1]'} />
                      <span className="text-[8px] font-medium opacity-50 text-primary">Phosphor</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono mt-2 ${isDark ? 'text-white/30' : 'text-[#474747]/50'}`}>1.3 ≈ regular</span>
                </div>
              ))}
            </div>
          </div>

          {/* Escala de Grosores del Sistema */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className={`p-8 rounded-[2.5rem] text-center ${liquidGlassClass}`}>
              <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6 block`}>Fino Decorativo (strokeWidth=1.0)</span>
              <div className="flex justify-center gap-5 mb-4">
                {[Leaf, Eye, Calculator, Buildings, Users, Globe].map((IconComp, i) => (
                  <IconComp key={i} size={28} strokeWidth={1.0} className={isDark ? 'text-white/70' : 'text-[#474747]'} />
                ))}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-[#474747]/60'} mt-2`}>Marcas de agua &middot; Fondos sutiles &middot; Ilustraciones</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] text-center ${liquidGlassClass}`}>
              <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6 block`}>Estándar Global (strokeWidth=1.3)</span>
              <div className="flex justify-center gap-5 mb-4">
                {[Leaf, Eye, Calculator, Buildings, Users, Globe].map((IconComp, i) => (
                  <IconComp key={i} size={28} strokeWidth={1.3} className={isDark ? 'text-white/70' : 'text-[#474747]'} />
                ))}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-[#474747]/60'} mt-2`}>Interfaz general &middot; KPIs &middot; Menús &middot; Botones</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] text-center ${liquidGlassClass}`}>
              <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6 block`}>Énfasis / Fuerte (strokeWidth=1.8)</span>
              <div className="flex justify-center gap-5 mb-4">
                {[Leaf, Eye, Calculator, Buildings, Users, Globe].map((IconComp, i) => (
                  <IconComp key={i} size={28} strokeWidth={1.8} className={isDark ? 'text-white/70' : 'text-[#474747]'} />
                ))}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-[#474747]/60'} mt-2`}>Selección activa &middot; Badges destacados &middot; Alertas</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] text-center ${liquidGlassClass}`}>
              <span className={`text-[10px] font-bold ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-6 block`}>Duotone (duotone=true)</span>
              <div className="flex justify-center gap-5 mb-4">
                {[Leaf, Eye, Calculator, Buildings, Users, Globe].map((IconComp, i) => (
                  <IconComp key={i} size={28} duotone className={isDark ? 'text-white/70' : 'text-[#474747]'} />
                ))}
              </div>
              <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-[#474747]/60'} mt-2`}>Relleno 20% &middot; Navegación lateral activa &middot; Foco</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-6">
            {[
              { i: ArrowRight, n: 'Flecha derecha', c: 'hover-slide-r hover-press' },
              { i: Eye, n: 'Mostrar', c: 'hover-press' },
              { i: EyeSlash, n: 'Ocultar', c: 'hover-press' },
              { i: Plus, n: 'Añadir', c: 'hover-press' },
              { i: ShieldCheck, n: 'Verificado', c: 'hover-press' },
              { i: MagnifyingGlass, n: 'Búsqueda', c: 'hover-press' },
              { i: Leaf, n: 'Sostenibilidad', c: 'hover-leaf hover-press' },
              { i: Calculator, n: 'Calculadora', c: 'hover-calc hover-press' },
              { i: IaIcon, n: 'Inteligencia artificial', c: 'hover-press' },
            ].map((icon, idx) => (
              <div key={idx} className={`flex flex-col items-center justify-center p-6 border rounded-2xl hover:shadow-[0_12px_32px_rgba(0,130,124,0.06)] hover:-translate-y-1 transition-all group ${icon.c} ${isDark ? 'bg-white/5 border-white/10' : 'bg-primary border-[#474747]/10'}`}>
                <icon.i size={32} strokeWidth={1.3} className={`${isDark ? 'text-white/60 group-hover:text-[#D6F391]' : 'text-[#474747] group-hover:text-[#474747]'} transition-colors mb-4`} />
                <span className={`text-[10px] font-bold text-center ${isDark ? 'text-white/30' : 'text-[#474747]/60'}`}>{icon.n}</span>
              </div>
            ))}
          </div>

          {/* Reglas de Uso de Iconografía y Marcas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 mb-12">
            <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#474747]/10'}`}>
              <h4 className={`text-sm font-black mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Regla de Grosor Unificado (1.3 / Regular)</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'}`}>
                Para que toda la plataforma se perciba bajo un único sistema iconográfico armónico, <strong>todo ícono de Lucide se renderiza con <code>strokeWidth=1.3</code></strong> (inyectado automáticamente por el wrapper <code>wrapIcon</code> de <code>@/components/ui/icons</code>). Los íconos de <strong>Phosphor Icons</strong> deben utilizar su peso nativo <code>weight=&quot;regular&quot;</code>. Queda prohibido el uso de valores de trazo superiores a 1.5 en elementos de navegación o botones estándar para evitar saturación visual.
              </p>
            </div>

            <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#474747]/10'}`}>
              <h4 className={`text-sm font-black mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Regla de Logotipos de Marca y Phosphor Icons</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'} mb-4`}>
                Está estrictamente prohibido utilizar iconos vectoriales genéricos o de Lucide para representar redes sociales y logotipos comerciales (WhatsApp, Instagram, LinkedIn, Facebook, X, YouTube). Para estos casos, <strong>se debe utilizar siempre la librería Phosphor Icons sin animación</strong> con sus colores oficiales:
              </p>
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                <div className="font-bold mb-2">Equivalencias Oficiales del Sistema:</div>
                <div>• Lucide strokeWidth=1.3  ↔ Phosphor weight=&quot;regular&quot; (Estándar global)</div>
                <div>• Lucide strokeWidth=1.0  ↔ Phosphor weight=&quot;light&quot; (Fino decorativo)</div>
                <div>• Lucide strokeWidth=1.8  ↔ Phosphor weight=&quot;bold&quot; (Énfasis)</div>
                <div>• Lucide duotone=true     ↔ Phosphor weight=&quot;duotone&quot; (Relleno al 20%)</div>
              </div>
            </div>

            <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#474747]/10'}`}>
              <h4 className={`text-sm font-black mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Regla de Íconos Dinámicos y Selector de Categorías</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'}`}>
                Para campos dinámicos donde el usuario o administrador selecciona un ícono (ej. categorías de productos, líneas de negocio, módulos), se utiliza el componente <code>&lt;DynamicIcon /&gt;</code> junto con <code>&lt;IconPicker /&gt;</code>. Los nombres de Lucide se almacenan directamente (ej. <code>&quot;Armchair&quot;</code>) y los de Phosphor con prefijo (ej. <code>&quot;phosphor:Sofa&quot;</code>). <code>DynamicIcon</code> aplica de forma transparente <code>strokeWidth=1.3</code> o <code>weight=&quot;regular&quot;</code> con carga diferida vía <code>next/dynamic</code>.
              </p>
            </div>
            
            <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#474747]/10'}`}>
              <h4 className={`text-sm font-black mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Regla de Íconos Contenidos</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'} mb-4`}>
                Para íconos informativos que llevan fondo (squircle), aplica la <strong>Regla del Color Coincidente</strong>:
                <br /><br />
                <strong>1. Prohibido usar negro o grises puros</strong> para el ícono. Debe heredar el color semántico (ej. <code>text-brand</code>, <code>text-success</code>).
                <br />
                <strong>2. Fondo Translúcido:</strong> El contenedor debe usar el fondo translúcido correspondiente al color (ej. <code>bg-brand-light</code> para marca, <code>bg-success/10</code> para éxito). Nunca usar bg-gray-* o similares.
                <br />
                <strong>3. Forma y Espaciado:</strong> Debe ser un cuadrado redondeado (<code>rounded-xl</code> o <code>rounded-2xl</code>) con padding uniforme, por ejemplo: <code>flex items-center justify-center w-10 h-10 bg-brand-light rounded-xl text-brand</code>.
              </p>
            </div>

            <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#474747]/10'}`}>
              <h4 className={`text-sm font-black mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Regla de Íconos de Eliminación</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'}`}>
                <strong>Prohibido usar &quot;X&quot; o &quot;×&quot;:</strong> Para acciones de borrar o eliminar ítems, se debe usar siempre el bote de basura <code>&lt;Trash /&gt;</code> de Lucide. Este botón no debe tener bordes, y debe utilizar el color rojo de error <code>text-[var(--color-error)]</code>. Al hacer hover, se debe aplicar una reducción de opacidad al 50% (<code>hover:opacity-50</code>) sin cambiar el fondo. El texto &quot;Eliminar&quot; puede acompañar al ícono si el espacio lo permite.
              </p>
            </div>
            <div className={`p-8 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#474747]/10'}`}>
              <h4 className={`text-sm font-black mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Regla de Color Sostenible</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'}`}>
                <strong>Cálculo Ambiental y Énfasis:</strong> Todo lo referente a &quot;Cálculo ambiental&quot;, totales de CO₂, o elementos principales de la marca, debe usar ESTRICTAMENTE el verde sostenible mediante la variable global <code>var(--color-brand)</code>. Se prohíbe usar verdes &quot;raros&quot; o genéricos (como <code>text-green-500</code> o <code>color-success</code>) para el branding principal.
              </p>
            </div>
            <div className={`p-8 rounded-[2rem] border border-[#FF5E4B]/20 ${isDark ? 'bg-[#FF5E4B]/5' : 'bg-[#FF5E4B]/[0.02]'}`}>
              <h4 className="text-sm font-black mb-3 text-[#FF5E4B]">Ícono Prohibido: Target (Círculos Concéntricos)</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-[#474747]/85'} mb-3`}>
                <strong>Queda terminantemente prohibido el uso del ícono <code>Target</code> (diana o círculos concéntricos)</strong> en toda la plataforma, landings y flujos de DDP. Es un ícono ambiguo que genera confusión semántica y no comunica con claridad los conceptos de cálculo, algoritmos o sectores.
              </p>
              <div className={`p-3.5 rounded-xl text-[11px] leading-relaxed ${isDark ? 'bg-white/5 text-white/80' : 'bg-primary text-[#474747]'}`}>
                <div className="font-bold mb-1.5 text-[#FF5E4B]">Reemplazos oficiales obligatorios:</div>
                <div>• <strong>Algoritmos, cómputo y cálculo inteligente:</strong> <code>&lt;Cpu /&gt;</code>, <code>&lt;Sparkles /&gt;</code> o <code>&lt;Calculator /&gt;</code>.</div>
                <div>• <strong>Textil, retales y fibras:</strong> <code>&lt;Scissors /&gt;</code>, <code>&lt;Layers /&gt;</code> o <code>&lt;Package /&gt;</code>.</div>
                <div>• <strong>Trazabilidad y DDP:</strong> <code>&lt;ShieldCheck /&gt;</code> o <code>&lt;ArrowsClockwise /&gt;</code>.</div>
              </div>
            </div>
            <div className={`p-8 rounded-[2rem] border md:col-span-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#FCFBFA] border-[#474747]/10'}`}>
              <h4 className={`text-sm font-black mb-3 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'}`}>Regla de Diferenciación: Botones vs. Etiquetas (Lo que no es botón, no parece botón)</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-[#474747]/80'}`}>
                <strong>Claridad visual estricta:</strong> los subtítulos, encabezados de sección, kickers y etiquetas informativas nunca deben presentarse con forma de cápsula (<code>rounded-full</code>) con borde cerrado y fondo relleno que imite la anatomía de un botón. Para kickers y etiquetas estáticas se usa tipografía pequeña y con peso (<code>text-xs font-bold tracking-wide</code>) en Sentence case (nunca <code>uppercase</code>, regla dura del sistema) con un ícono plano sin fondo ni borde. Las cápsulas con borde y fondo se reservan para lo accionable (<code>&lt;button&gt;</code> y <code>&lt;Link&gt;</code>).
              </p>
            </div>
          </div>

          {/* Subsección: Logotipos de Marcas Oficiales (Brand Logos) */}
          <div className="mt-16">
            <h3 className={`text-lg font-bold mb-3 text-primary`}>Logotipos de Marca Oficiales (Brand Logos)</h3>
            <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} text-xs font-medium mb-8 max-w-3xl`}>
              Logotipos vectoriales oficiales de empresas, redes sociales y plataformas de terceros. Para garantizar la máxima fidelidad y reconocimiento oficial, <strong>se utiliza la librería Phosphor Icons (<code>@phosphor-icons/react</code>) de forma exclusiva para estos casos</strong>. Se muestran de forma estática (sin animaciones interactivas de hover) y con colores corporativos oficiales.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { i: WhatsappLogo, n: 'WhatsApp', c: 'text-[#25D366]' },
                { i: LinkedinLogo, n: 'LinkedIn', c: 'text-[#0A66C2]' },
                { i: InstagramLogo, n: 'Instagram', c: isDark ? 'text-white' : 'text-[#E4405F]' },
                { i: FacebookLogo, n: 'Facebook', c: 'text-[#1877F2]' },
                { i: XLogo, n: 'X (Twitter)', c: isDark ? 'text-white' : 'text-primary' },
                { i: YoutubeLogo, n: 'YouTube', c: 'text-[#FF0000]' },
              ].map((logo, idx) => (
                <div key={idx} className={`flex flex-col items-center justify-center p-6 border rounded-2xl group ${isDark ? 'bg-white/5 border-white/10' : 'bg-primary border-[#00827C]/10'}`}>
                  <logo.i size={36} className={`${logo.c} mb-4 transition-transform group-hover:scale-110 duration-200`} />
                  <span className={`text-[11px] font-bold ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>{logo.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subsección: Lucide Animated (Micro-interacciones de Interfaz) */}
          <div className="mt-16">
            <h3 className={`text-lg font-bold mb-3 text-primary`}>Lucide Animated (Micro-interacciones de Interfaz)</h3>
            <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} text-xs font-medium mb-8 max-w-3xl`}>
              Micro-interacciones basadas en el registro real de <code>lucide-animated.com</code>, integradas directo al hub de íconos del sistema (no la librería <code>@animateicons/react</code>, que resultó no funcionar en este proyecto). Se activan al pasar el cursor (hover) por encima de cada cajón. Basura y Estrella no tienen versión animada en ese registro, así que muestran el zoom estándar del sistema en vez de una animación propia.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
              {[
                { i: Bell, n: 'Notificaciones', d: 'Campana oscilante' },
                { i: Gear, n: 'Ajustes / Engranaje', d: 'Rotación con inercia' },
                { i: ChevronRight, n: 'Siguiente / Flecha', d: 'Desplazamiento lateral' },
                { i: Download, n: 'Descargar', d: 'Rebote hacia abajo' },
                { i: Upload, n: 'Subir Archivo', d: 'Rebote hacia arriba' },
                { i: Copy, n: 'Copiar Portapapeles', d: 'Comprimir / Escala' },
                { i: Trash, n: 'Eliminar / Basura', d: 'Zoom estándar (sin animación crafteada disponible)' },
                { i: Send, n: 'Enviar / Correo', d: 'Ángulo lanzamiento' },
                { i: Eye, n: 'Mostrar Contraseña', d: 'Movimiento de pupila' },
                { i: EyeSlash, n: 'Ocultar Contraseña', d: 'Línea diagonal' },
                { i: Plus, n: 'Añadir / FAB', d: 'Rotación de 90°' },
                { i: Star, n: 'Destacar / Estrella', d: 'Zoom estándar (sin animación crafteada disponible)' },
                { i: Heart, n: 'Favorito / Corazón', d: 'Latido de corazón' },
                { i: Lightning, n: 'Rápido / Energía', d: 'Destello de energía' },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col items-center justify-center p-6 border rounded-2xl transition-all cursor-pointer text-center outline-none group ${isDark ? 'bg-white/5 border-white/10 hover:border-[#D6F391]/30' : 'bg-primary border-[#00827C]/10 hover:border-[#00827C]/30'}`}
                >
                  <div className={`${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'} mb-4 transition-colors`}>
                    <item.i size={28} />
                  </div>
                  <span className={`text-[11px] font-bold block text-primary`}>{item.n}</span>
                  <span className={`text-[9px] font-medium mt-1 block opacity-50 ${isDark ? 'text-white/50' : 'text-[#00827C]/50'}`}>{item.d}</span>
                  <code className="text-[8px] font-mono mt-2 bg-[#474747]/10 px-1.5 py-0.5 rounded opacity-40">lucide-animated.com</code>
                </div>
              ))}
            </div>
          </div>

          {/* Subsección: Lucide Lab (Iconos Experimentales) */}
          <div className="mt-16">
            <h3 className={`text-lg font-bold mb-3 text-primary`}>Lucide Lab (Iconos Experimentales)</h3>
            <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} text-xs font-medium mb-8 max-w-3xl`}>
              Iconos experimentales oficiales importados directamente del repositorio oficial de <code>@lucide/lab</code>. Estos diseños están en fase experimental y no pertenecen a la librería Core, pero se integran perfectamente mediante el componente contenedor <code>Icon</code> de <code>lucide-react</code>.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { node: avocado, n: 'Aguacate (avocado)' },
                { node: ufo, n: 'OVNI (ufo)' },
                { node: snowman, n: 'Muñeco de Nieve (snowman)' },
                { node: strawberry, n: 'Fresa (strawberry)' },
                { node: penguin, n: 'Pingüino (penguin)' },
                { node: chameleon, n: 'Camaleón (chameleon)' },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col items-center justify-center p-6 border rounded-2xl transition-all cursor-pointer text-center outline-none group ${isDark ? 'bg-white/5 border-white/10 hover:border-[#D6F391]/30' : 'bg-primary border-[#00827C]/10 hover:border-[#00827C]/30'}`}
                >
                  <div className={`${isDark ? 'text-[#D6F391] group-hover:scale-110' : 'text-[#00827C] group-hover:scale-110'} mb-4 transition-transform duration-200`}>
                    <Icon iconNode={item.node} size={32} />
                  </div>
                  <span className={`text-[11px] font-bold block text-primary`}>{item.n}</span>
                  <code className="text-[8px] font-mono mt-2 bg-[#474747]/10 px-1.5 py-0.5 rounded opacity-40">@lucide/lab</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECCION 12: MOSAICOS EMBEBIDOS DE SERVICIOS */}
        <section id="s12-mosaicos" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-10">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Mosaicos embebidos de servicios</h2>
          </div>
          <p className={`${isDark ? 'text-white/50' : 'text-[#474747]'} text-[15px] font-medium mb-12 max-w-3xl`}>Tarjetas de servicio con imagen prominente y llamada a la acción clara.</p>
          
          {/* Cards - scroll horizontal en móvil, grid en desktop */}
          <div className="relative">
            <div
              ref={cardsScrollRef}
              className="flex overflow-x-auto snap-snap-mandatory gap-5 pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' as 'auto', touchAction: 'pan-x' }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const cardW = el.scrollWidth / 3;
                setActiveCard(Math.round(el.scrollLeft / cardW));
              }}
            >
              {[
                { title: 'Soporte Ambiental', desc: 'Asesoría técnica para procesos de medición nacional.', btn: 'Inscríbete', gradient: 'from-[#006B66] via-[#00827C] to-[#8AD0B2]' },
                { title: 'Logística Verde', desc: 'Gestión in situ de materiales para maximizar el ahorro de CO₂.', btn: 'Pide tu seguro', gradient: 'from-[#8AD0B2] via-[#59A6E4] to-[#59A6E4]' },
                { title: 'Trazabilidad Tokenizada', desc: 'Cada gramo cuenta. Registro inmutable en el historial Reúso.', btn: 'Empieza aquí', gradient: 'from-[#D6F391] via-[#8AD0B2] to-[#00827C]' },
              ].map((card, i) => (
                <div key={i} className={`group shrink-0 w-[calc(100vw-80px)] max-w-xs md:w-auto snap-center overflow-hidden rounded-[2rem] hover:-translate-y-2 transition-all duration-500 ${isDark ? 'bg-[#D6F391]/05 border border-white/10' : 'bg-primary shadow-[0_8px_32px_rgba(0,130,124,0.08)] border border-[#00827C]/8'}`}>
                  <div className={`w-full h-48 bg-gradient-to-br ${card.gradient} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-[#474747]/5 group-hover:bg-[#474747]/0 transition-all duration-500" />
                    <div className="absolute bottom-4 right-4 w-10 h-10 bg-white/20 rounded-full backdrop-blur-md flex items-center justify-center">
                      <Leaf size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className={`text-base font-bold mb-1.5 text-primary`}>{card.title}</h4>
                    <p className={`text-sm mb-5 leading-relaxed ${isDark ? 'text-white/50' : 'text-[#474747]/80'}`}>{card.desc}</p>
                    <button className={`px-5 py-2 rounded-full border text-sm font-semibold transition-all ${isDark ? 'border-white/20 text-white hover:bg-primary hover:text-[#474747]' : 'border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C] hover:text-white'}`}>
                      {card.btn}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Navegación móvil: puntos + flechas - ocultos en desktop */}
            <div className="flex items-center justify-center gap-6 mt-6 md:hidden">
              <button
                onPointerDown={() => {
                  const el = cardsScrollRef.current;
                  if (!el) return;
                  const cardW = el.scrollWidth / 3;
                  el.scrollTo({ left: Math.max(0, el.scrollLeft - cardW), behavior: 'smooth' });
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${activeCard === 0 ? 'opacity-30 pointer-events-none' : ''} ${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/5'}`}
              >
                <CaretDown size={16} strokeWidth={2.5} className="rotate-90" />
              </button>

              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    onPointerDown={() => {
                      const el = cardsScrollRef.current;
                      if (!el) return;
                      const cardW = el.scrollWidth / 3;
                      el.scrollTo({ left: cardW * i, behavior: 'smooth' });
                    }}
                    className={`rounded-full transition-all duration-300 ${i === activeCard ? 'w-6 h-2.5 bg-[#00827C]' : `w-2.5 h-2.5 ${isDark ? 'bg-white/20' : 'bg-[#00827C]/20'}`}`}
                  />
                ))}
              </div>

              <button
                onPointerDown={() => {
                  const el = cardsScrollRef.current;
                  if (!el) return;
                  const cardW = el.scrollWidth / 3;
                  el.scrollTo({ left: Math.min(el.scrollWidth, el.scrollLeft + cardW), behavior: 'smooth' });
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${activeCard === 2 ? 'opacity-30 pointer-events-none' : ''} ${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/5'}`}
              >
                <CaretDown size={16} strokeWidth={2.5} className="-rotate-90" />
              </button>
            </div>
          </div>
        </section>

        {/* SECCION 13: ARQUITECTURA DE NAVEGACIÓN 7/22/2 */}
        <section id="s13-nav" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-10">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Arquitectura de navegación</h2>
          </div>
          <p className={`text-lg ${isDark ? 'text-white/50' : 'text-[#474747]'} font-medium mb-10 max-w-xl`}>
            Optimización absoluta de espacio y carga cognitiva mediante la regla institucional <strong>7/22/2</strong>.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-[2.5rem] ${liquidGlassClass}`}>
               <div className={`text-5xl font-black mb-4 ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>7</div>
               <div className={`text-sm font-bold ${isDark ? 'text-white/30' : 'opacity-40'} mb-3`}>Máximo de Ítems</div>
               <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : ''}`}>No más de 7 puntos de acceso de primer nivel por perfil para evitar el scroll vertical en el sidebar.</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] ${liquidGlassClass}`}>
               <div className={`text-5xl font-black mb-4 ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>22</div>
               <div className={`text-sm font-bold ${isDark ? 'text-white/30' : 'opacity-40'} mb-3`}>Caracteres Máximos</div>
               <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : ''}`}>Etiquetas breves que garantizan que el nombre no se rompa ni genere ruido visual excesivo.</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] ${liquidGlassClass}`}>
               <div className={`text-5xl font-black mb-4 ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>2</div>
               <div className={`text-sm font-bold ${isDark ? 'text-white/30' : 'opacity-40'} mb-3`}>Palabras Máximas</div>
               <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : ''}`}>Nombres tan claros que permiten una identificación periférica sin necesidad de lectura analítica.</p>
            </div>
          </div>

          <div className={`mt-10 p-10 rounded-[2.5rem] border border-[#00827C]/20 bg-[#00827C]/5 relative overflow-hidden group`}>
            <div className="flex items-center gap-6 relative z-10">
               <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <Stack size={32} className="text-[#00827C]" />
               </div>
               <div>
                  <h4 className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>Liquid Glass Flyout</h4>
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'opacity-60'}`}>Submenús que &ldquo;expulsan&rdquo; islas de cristal a la derecha. Sin mover el contenido, sin interrumpir el flujo.</p>
               </div>
            </div>
            <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-[#00827C]/10 to-transparent pointer-events-none" />
          </div>
        </section>

        {/* SECCION 14: TABLAS DE PRECIO ESG */}
        <section id="s14-pricing" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-10">
            <h2 className={`text-3xl font-bold tracking-tight text-primary`}>Precios</h2>
          </div>
          
          <div className={`flex flex-col md:flex-row items-center justify-center gap-8 mb-8`}>
            <div className={`flex rounded-full p-1.5 backdrop-blur-[40px] saturate-[150%] border shadow-[0_4px_20px_rgba(0,130,124,0.06)] ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#00827C]/10'}`}>
              {(['USD', 'EUR', 'COP'] as const).map(cur => (
                <button key={cur} onClick={() => setSelectedCurrency(cur)} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${selectedCurrency === cur ? 'bg-[#00827C] text-white shadow-lg' : isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-[#00827C]/60 hover:text-[#474747] hover:bg-[#00827C]/5'}`}>{cur}</button>
              ))}
            </div>
            <div className={`flex items-center gap-4 px-6 py-3 rounded-full backdrop-blur-[40px] saturate-[150%] border shadow-[0_4px_20px_rgba(0,130,124,0.06)] ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#00827C]/10'}`}>
              <span className={`text-sm font-bold ${!isYearly ? (isDark ? 'text-white' : 'text-[#474747]') : (isDark ? 'text-white/40' : 'text-[#00827C]/40')}`}>Mensual</span>
              <button onClick={() => setIsYearly(!isYearly)} className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${isYearly ? 'bg-[#00827C]' : isDark ? 'bg-white/20' : 'bg-[#474747]/15'}`}><div className={`absolute top-1 w-6 h-6 bg-primary rounded-full shadow-md transition-transform duration-300 ${isYearly ? 'translate-x-7' : 'translate-x-1'}`} /></button>
              <span className={`text-sm font-bold ${isYearly ? (isDark ? 'text-white' : 'text-[#474747]') : (isDark ? 'text-white/40' : 'text-[#00827C]/40')}`}>Anual</span>
            </div>
          </div>
          <p className={`text-center text-sm mb-12 ${isDark ? 'text-[#D6F391]' : 'text-[#474747]'} font-medium`}>{isYearly ? 'Ahorra 2 meses al pagar anualmente' : 'Facturación mensual sin permanencia'}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {PRICING_PLANS.map((plan: typeof PLANS[0]) => {
              const currency = CURRENCIES[selectedCurrency as keyof typeof CURRENCIES];
              const priceCOP = plan.priceMonthlyCOP || 0;
              const baseMonthly = priceCOP * currency.rate;
              const finalMonthly = isYearly ? baseMonthly * 10 / 12 : baseMonthly;
              const displayPrice = isYearly ? finalMonthly * 12 : finalMonthly;
              
              const formattedPrice = plan.id === 'free' ? 'Gratis' : `${currency.symbol}${currency.format(displayPrice)}`;
              const finalMonthlyFormatted = plan.id === 'free' ? '0' : `${currency.symbol}${currency.format(finalMonthly)}`;

              return (
                <div key={plan.id} className={`relative p-8 rounded-[2.5rem] border transition-all duration-500 hover:-translate-y-2 flex flex-col h-full ${plan.popular ? (isDark ? 'bg-white/10 border-[#D6F391]/40 shadow-[0_20px_50px_rgba(214,243,145,0.1)]' : 'bg-primary border-[#00827C]/30 shadow-[0_20px_50px_rgba(0,130,124,0.1)]') : (isDark ? 'bg-[#D6F391]/05 border-white/10' : 'bg-white/80 border-[#00827C]/10 backdrop-blur-md')}`}>
                  {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#474747] text-[#D6F391] text-[9px] font-bold tracking-[0.3em] rounded-full shadow-lg whitespace-nowrap">LO MÁS BUSCADO</div>}
                  <div className="mb-8">
                    <span className={`text-[10px] font-black tracking-widest opacity-40 text-primary`}>{plan.tagline}</span>
                    <h3 className={`text-3xl font-black mt-2 text-primary flex items-baseline`}>
                      {plan.id === 'free' ? 'Gratis' : (
                        <>
                          {formattedPrice.split(',')[0]}
                          {formattedPrice.includes(',') && (
                            <span style={{ fontSize: '0.8em', fontWeight: 'inherit' }}>
                              ,{formattedPrice.split(',')[1]}
                            </span>
                          )}
                        </>
                      )}
                    </h3>
                    {plan.id !== 'free' && (
                      <div className={`text-[10px] mt-1 font-bold ${isDark ? 'text-white/40' : 'text-[#00827C]/60'}`}>
                        {isYearly ? (
                          <>
                            <span>al año</span>
                            <span className="block text-[11px] font-medium opacity-80 mt-0.5">equivale a {finalMonthlyFormatted}/mes</span>
                          </>
                        ) : 'mensual'}
                      </div>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed mb-8 font-medium ${isDark ? 'text-white/60' : 'text-[#474747]'}`}>{plan.id === 'free' ? 'Para individuos que inician su viaje circular.' : plan.tagline}</p>
                  <div className={`w-full h-px mb-8 bg-active`} />
                  <ul className="space-y-4 mb-10 flex-grow">{plan.features.map((feat: string, idx: number) => (<li key={idx} className="flex items-start gap-3"><div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-[#D6F391]/20 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]'}`}><span className="text-[10px] font-bold">&#10003;</span></div><span className={`text-sm text-primary`}>{feat}</span></li>))}</ul>
                  <button className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${plan.popular ? 'bg-[#00827C] text-white hover:bg-[#006B66] shadow-lg hover:shadow-[#00827C]/20' : (isDark ? 'border border-white/20 text-white hover:bg-white/5' : 'border border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/5')}`}>{plan.cta || 'Seleccionar Plan'}</button>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-[var(--bg-table-header)] text-[var(--color-brand)] border-b border-[var(--border)]">
                    <th className="px-6 py-5 text-left font-bold text-xs tracking-wide">Característica</th>
                  {PRICING_PLANS.map((p: typeof PLANS[0]) => (
                    <th key={p.id} className="px-4 py-5 text-center">
                      <div className="font-bold text-xs">{p.name}</div>
                      <div className={`text-[10px] font-normal mt-1 ${isDark ? 'text-white/50' : 'text-[var(--text-secondary)]'}`}>
                        {p.id === 'free' ? 'Gratis' : `${CURRENCIES[selectedCurrency as keyof typeof CURRENCIES].symbol}${CURRENCIES[selectedCurrency as keyof typeof CURRENCIES].format((p.priceMonthlyCOP * CURRENCIES[selectedCurrency as keyof typeof CURRENCIES].rate) * (isYearly ? 10 : 1))}/${isYearly ? 'año' : 'mes'}`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Cálculos por mes', vals: ['10', '200', '200', 'Ilimitados'] },
                  { feature: 'Informes por mes', vals: ['-', '5', '5', 'Ilimitados'] },
                  { feature: 'Usuarios / Empleados', vals: ['1', '5', '10', 'Ilimitados'] },
                  { feature: 'Cotizador Circular', vals: ['no', 'no', 'yes', 'yes'] },
                  { feature: 'Seguridad Inalterable', vals: ['no', 'yes', 'yes', 'yes'], desc: 'Cada cálculo tiene un código único que nadie puede borrar.' },
                  { feature: 'Blockchain Reúso', vals: ['no', 'no', 'yes', 'yes'], desc: 'Guardamos una copia del impacto en una red para confianza total.' },
                  { feature: 'Soporte Privado', vals: ['no', 'yes', 'yes', 'yes'], desc: 'Chat prioritario para resolver dudas ambientales.' },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={`transition-colors duration-150 cursor-pointer hover:bg-[var(--bg-table-hover)] ${
                      i % 2 === 1 ? 'bg-[var(--bg-zebra)]' : 'bg-[var(--bg-card)]'
                    }`}
                    style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className={`px-6 py-4 font-medium flex items-start gap-2`}>
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">
                          {row.feature}
                        </div>
                        {row.desc && <div className="text-[10px] font-normal mt-0.5 text-[var(--text-secondary)] opacity-80">{row.desc}</div>}
                      </div>
                    </td>
                    {row.vals.map((v, vi) => (
                      <td key={vi} className={`px-4 py-4 text-center font-semibold text-[var(--text-primary)]`}>
                        {v === 'yes' ? <span className="text-[var(--color-brand)]">&#10003;</span> : v === 'no' ? <span className="opacity-30">&mdash;</span> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECCION 15: COMPONENTES REUTILIZABLES */}
        <section id="s15-componentes" className={`border-t ${isDark ? 'border-[#D6F391]/20' : 'border-[#00827C]/10'} pt-20`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className={`text-3xl font-bold text-primary`}>Componentes reutilizables</h2>
          </div>
          <p className={`text-sm mb-6 max-w-3xl ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>
            A diferencia de las secciones anteriores (mockups ilustrativos), todo lo que ves aquí abajo es el componente real de <code className="text-[10px] font-mono opacity-70">src/components/ui/</code>, importado tal cual se usa en producción — funcional, interactivo, con el mismo estado que tendría en cualquier pantalla de la app. Antes de construir un control nuevo (botón, switch, selector, paginador), revisa primero si ya existe aquí.
          </p>

          <div className={`p-8 md:p-10 rounded-[2.5rem] border ${isDark ? 'border-white/10 bg-[#D6F391]/05' : 'border-[#00827C]/10 bg-primary'} shadow-[0_12px_40px_rgba(0,130,124,0.04)] flex flex-col gap-8 md:gap-10`}>

            {/* A. BUTTON */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>A. Button</h3>
                <code className="text-[9px] font-mono opacity-40">src/components/ui/button.tsx</code>
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <Button variant="primary">Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="danger">Peligro</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="primary" size="sm">Chico</Button>
                <Button variant="primary" icon={<Save size={16} />}>Con ícono</Button>
                <Button
                  variant="primary"
                  icon={<Check size={16} />}
                  loading={demoBotonCargando}
                  onClick={() => {
                    setDemoBotonCargando(true)
                    setTimeout(() => setDemoBotonCargando(false), 1600)
                  }}
                >
                  {demoBotonCargando ? 'Guardando...' : 'Probar loading'}
                </Button>
                <Button variant="primary" disabled>Deshabilitado</Button>
              </div>
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'<Button variant="primary" icon={<Save size={16} />} loading={guardando}>Guardar</Button>'}
              </div>
            </div>

            {/* B. SWITCH OPCIONES */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>B. SwitchOpciones</h3>
                <code className="text-[9px] font-mono opacity-40">src/components/ui/switch-opciones.tsx</code>
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>Fondo + píldora deslizante, único permitido para elegir entre 2-3 opciones excluyentes con apariencia de switch. Nunca crear uno ad-hoc por pantalla.</p>
              <div className="flex flex-wrap items-center gap-8 mb-3">
                <SwitchOpciones
                  className="max-w-[220px]"
                  valor={demoSwitch2}
                  onChange={setDemoSwitch2}
                  opciones={[
                    { valor: 'persona', label: 'Persona', icon: <User size={14} sinAnimacion /> },
                    { valor: 'empresa', label: 'Empresa', icon: <Buildings size={14} sinAnimacion /> },
                  ]}
                />
                <SwitchOpciones
                  className="max-w-[320px]"
                  valor={demoSwitch3}
                  onChange={setDemoSwitch3}
                  opciones={[
                    { valor: 'todos', label: 'Todos' },
                    { valor: 'activos', label: 'Activos' },
                    { valor: 'inactivos', label: 'Inactivos' },
                  ]}
                />
              </div>
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'<SwitchOpciones valor={tipo} onChange={setTipo} opciones={[{ valor: \'persona\', label: \'Persona\', icon: <User/> }, { valor: \'empresa\', label: \'Empresa\', icon: <Buildings/> }]} />'}
              </div>
            </div>

            {/* C. SELECTOR */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>C. Selector</h3>
                <code className="text-[9px] font-mono opacity-40">src/components/ui/selector.tsx</code>
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>Reemplazo genérico del <code className="text-[10px] font-mono opacity-70">{'<select>'}</code> nativo — prohibido en toda la plataforma, cada sistema operativo lo dibuja distinto.</p>
              <div className="max-w-xs mb-3">
                <Selector
                  opciones={[
                    { value: 'lab', label: 'Circular Lab' },
                    { value: 'impulso', label: 'Impulso Sostenible' },
                    { value: 'ilimitado', label: 'Impacto Ilimitado' },
                  ]}
                  value={demoSelector}
                  onChange={setDemoSelector}
                  placeholder="Elige un plan"
                />
              </div>
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'<Selector opciones={[{value,label}]} value={plan} onChange={setPlan} placeholder="Elige un plan" />'}
              </div>
            </div>

            {/* D. INPUT TELEFONO */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>D. InputTelefono</h3>
                <code className="text-[9px] font-mono opacity-40">src/components/ui/input-telefono.tsx</code>
              </div>
              <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>Indicativo de país (bandera + código, ancho fijo 140px) + número con formato automático — nunca un {'<SelectorPais>'} suelto junto a un input a mano, deja el número reducido a un cuadro diminuto.</p>
              <p className={`text-xs mb-3 rounded-lg px-3 py-2 border ${isDark ? 'bg-[#F6BF3E]/10 border-[#F6BF3E]/30 text-[#F6BF3E]' : 'bg-[#F6BF3E]/10 border-[#F6BF3E]/30 text-[#AD7C43]'}`}>
                <strong>Regla global de validación de celular</strong> (src/lib/telefono.ts, función validarTelefono): cada indicativo tiene su propio número exacto de dígitos y prefijo — hoy solo Colombia está verificada (+57, 10 dígitos, empieza en 3). InputTelefono ya la aplica solo, mostrando el error al salir del campo (no antes, para no regañar al usuario mientras todavía está escribiendo) — ninguna pantalla nueva necesita repetir esta validación a mano. Escribe menos de 10 dígitos abajo y sal del campo para verlo.
              </p>
              <div className="max-w-sm mb-3">
                <InputTelefono
                  indicativo={demoIndicativo}
                  onChangeIndicativo={setDemoIndicativo}
                  telefono={demoTelefono}
                  onChangeTelefono={setDemoTelefono}
                  required
                />
              </div>
              {demoTelefono && (
                <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>
                  Valor sin formato que llega al backend: <code className="text-[10px] font-mono opacity-70">{PAISES.find(p => p.dial === demoIndicativo)?.dial}{demoTelefono}</code>
                </p>
              )}
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'<InputTelefono indicativo={ind} onChangeIndicativo={setInd} telefono={tel} onChangeTelefono={setTel} required />'}
              </div>
            </div>

            {/* E. PAGINATION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>E. Pagination</h3>
                <code className="text-[9px] font-mono opacity-40">src/components/ui/pagination.tsx</code>
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>Paginado único de la plataforma — numeración con página actual recuadrada, Anterior/Siguiente y selector de &quot;N por página&quot;. Prohibido armar uno ad-hoc por tabla.</p>
              <div className="mb-3">
                <Pagination
                  page={demoPagina}
                  totalPages={12}
                  onPageChange={setDemoPagina}
                  porPagina={demoPorPagina}
                  onPorPaginaChange={setDemoPorPagina}
                />
              </div>
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'<Pagination page={page} totalPages={12} onPageChange={setPage} porPagina={porPagina} onPorPaginaChange={setPorPagina} />'}
              </div>
            </div>

            {/* F. SKELETON */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>F. Skeleton / SkeletonCard</h3>
                <code className="text-[9px] font-mono opacity-40">src/components/ui/skeleton.tsx</code>
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>Único estado de carga permitido — nunca texto plano &quot;Cargando...&quot; ni <code className="text-[10px] font-mono opacity-70">animate-pulse</code> con colores inventados.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 max-w-2xl">
                <SkeletonCard />
                <div className="flex flex-col gap-2 justify-center">
                  <Skeleton style={{ width: '100%' }} />
                  <Skeleton style={{ width: '70%' }} />
                  <Skeleton style={{ width: '85%' }} />
                </div>
              </div>
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'<SkeletonCard lineas={3} /> · <Skeleton style={{ width: \'70%\' }} />'}
              </div>
            </div>

            {/* G. MODAL */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>G. Modal</h3>
                <code className="text-[9px] font-mono opacity-40">src/components/ui/modal.tsx</code>
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>Único componente permitido para confirmaciones/formularios cortos — overlay Negro Lurdes, nunca <code className="text-[10px] font-mono opacity-70">bg-black</code>, pie siempre con dos acciones.</p>
              <Button variant="secondary" icon={<Trash size={16} />} onClick={() => setDemoModalAbierto(true)}>Abrir modal de ejemplo</Button>
              <Modal
                abierto={demoModalAbierto}
                onClose={() => setDemoModalAbierto(false)}
                titulo="Eliminar elemento"
                descripcion="Esta acción no se puede deshacer."
                varianteConfirmar="error"
                textoConfirmar="Eliminar"
                onConfirmar={() => setDemoModalAbierto(false)}
              >
                <p className={`text-sm ${isDark ? 'text-white/70' : 'text-[#474747]'}`}>Este es el mismo componente Modal usado en toda la plataforma — portal a document.body, overlay Negro Lurdes al 60%, panel rounded-3xl.</p>
              </Modal>
              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal mt-3 ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'<Modal abierto={open} onClose={...} titulo="..." varianteConfirmar="error" textoConfirmar="Eliminar" onConfirmar={...}>{children}</Modal>'}
              </div>
            </div>

            {/* H. FORMATO NUMÉRICO Y MONEDA EN COLOMBIA */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold font-sans ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>H. Formato Numérico y Moneda en Colombia</h3>
                <code className="text-[9px] font-mono opacity-40">src/lib/format.ts · src/lib/constants/pricing.ts</code>
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-white/50' : 'text-[#474747]/70'}`}>
                <strong>Estándar visual colombiano obligatorio en toda la plataforma:</strong> Millones con apóstrofo (<code>&apos;</code>), miles con punto (<code>.</code>), centavos con coma (<code>,</code>) en tamaño reducido, y símbolo monetario <code>$</code> a la izquierda. En inputs interactivos, el formato se aplica en vivo en una sola línea limpia sin alterar el cursor.
              </p>

              {/* Demo interactivo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,130,124,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,130,124,0.12)' }}>
                {/* Input interactivo */}
                <div className="space-y-3">
                  <label className="text-xs font-bold block text-[var(--text-primary)]">
                    Prueba el autoformato en tiempo real (escribe cualquier cifra):
                  </label>
                  <InputPrecio
                    value={demoPrecioCOP}
                    onChange={(v) => setDemoPrecioCOP(v)}
                    className="w-full"
                  />
                  <div className="flex gap-2 flex-wrap text-[11px] items-center pt-1">
                    <span className="text-[var(--text-secondary)] font-medium">Ejemplos rápidos:</span>
                    <button type="button" onClick={() => setDemoPrecioCOP('49000')} className="px-2 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--bg-table-hover)] transition-colors">$ 49.000</button>
                    <button type="button" onClick={() => setDemoPrecioCOP('349000')} className="px-2 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--bg-table-hover)] transition-colors">$ 349.000</button>
                    <button type="button" onClick={() => setDemoPrecioCOP('1490000')} className="px-2 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--bg-table-hover)] transition-colors">$ 1&apos;490.000</button>
                    <button type="button" onClick={() => setDemoPrecioCOP('14900000')} className="px-2 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--bg-table-hover)] transition-colors">$ 14&apos;900.000</button>
                  </div>
                </div>

                {/* Renderizado de Display con jerarquía */}
                <div className="flex flex-col justify-center rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] mb-1">
                    Visualización en tarjeta / encabezado de precio:
                  </span>
                  <div className="text-3xl font-black text-primary flex items-baseline">
                    ${formatearPrecioColombiano(demoPrecioCOP, false)}
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] mt-2">
                    Con centavos reducidos: ${formatearPrecioColombiano(Number(demoPrecioCOP || 0) / 12, true).split(',')[0]}
                    {formatearPrecioColombiano(Number(demoPrecioCOP || 0) / 12, true).includes(',') && (
                      <span style={{ fontSize: '0.8em', fontWeight: 'inherit' }}>
                        ,{formatearPrecioColombiano(Number(demoPrecioCOP || 0) / 12, true).split(',')[1]}
                      </span>
                    )}
                    <span className="text-[10px] opacity-60 ml-1">/mes (cálculo anual/12)</span>
                  </span>
                </div>
              </div>

              {/* Comparador de Reglas visuales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  <div className="text-[10px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">✓ CORRECTO (COLOMBIA)</div>
                  <div className="text-base font-bold text-[var(--text-primary)]">$ 1&apos;490.000</div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">Apóstrofo (&apos;) en millones, punto (.) en miles.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5">
                  <div className="text-[10px] font-black tracking-wider text-rose-600 dark:text-rose-400 mb-1">✗ PROHIBIDO (PUNTOS DOBLES)</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 line-through">$ 1.490.000</div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">No usar punto para millones; confunde millones con miles.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5">
                  <div className="text-[10px] font-black tracking-wider text-rose-600 dark:text-rose-400 mb-1">✗ PROHIBIDO (ANGLOSAJÓN)</div>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 line-through">$ 1,490,000</div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">No usar comas para miles o millones en moneda local.</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl text-[10px] font-mono leading-normal mt-3 ${isDark ? 'bg-[#474747]/30 text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C]'}`}>
                {'import { formatCOP, formatEnteroMillones } from \'@/lib/format\'\nimport { formatearPrecioColombiano } from \'@/lib/constants/pricing\'\n// Ejemplo: formatCOP(1490000) -> "$ 1\'490.000"'}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* FOOTER EXTERNO - Para páginas públicas (Sistema de Diseño, Landing, Legales, etc.) */}
      <FooterPublic showSocialLinks={true} hasMobileNav={true} />

      <style jsx global>{`
        .allow-select {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,130,124,0.1)'};
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
