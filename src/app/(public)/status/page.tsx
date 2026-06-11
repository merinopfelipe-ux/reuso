'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  CheckCircle, WarningCircle, XCircle,
  Cpu, Database, ShieldCheck,
  ArrowLeft, Clock, CaretLeft, CaretRight, CaretDown, CaretUp,
  Warning, Hammer
} from '@phosphor-icons/react'
import type { ChecksResult } from '@/lib/status-checker'

interface StatusComponent {
  key: string
  label: string
  sub: string
  icon: React.ElementType
  status: string
  latency?: number
  details?: string
}
const CalendarSevenIcon = ({ size = 18 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <text 
      x="12" 
      y="18" 
      fontFamily="system-ui, -apple-system, sans-serif" 
      fontSize="9" 
      fontWeight="700" 
      textAnchor="middle" 
      fill="currentColor"
      stroke="none"
    >
      7
    </text>
  </svg>
)

interface Incidente {
  id: string
  titulo: string
  descripcion: string | null
  componente: string
  estado: 'investigando' | 'identificado' | 'monitoreando' | 'resuelto'
  severidad: 'menor' | 'mayor' | 'critico'
  created_at: string
  updated_at: string
  resolved_at: string | null
}

const SEVERIDAD_COLOR = {
  menor: '#F6BF3E', // Amarillo
  mayor: '#FF5E4B', // Rojo
  critico: '#FF5E4B',
}

const COMPONENTE_LABEL: Record<string, string> = {
  supabase: 'Servidores y Base de Datos',
  gemini: 'Google Gemini 2.0 API',
  groq: 'Groq Cloud (LLaMA 3.3)',
  openrouter: 'OpenRouter Gateway',
  qwen: 'Qwen-VL 8B (OpenRouter)',
  calculadora: 'Calculadora Core (CO2)',
  correo: 'Servicio de Correo Electrónico',
  hosting: 'Servidor de Distribución Web',
}

export default function StatusPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [checks, setChecks] = useState<ChecksResult | null>(null)
  const [incidencias, setIncidencias] = useState<Incidente[]>([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  
  // Modal de suscripción
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  // Modal de reporte de problemas público
  const [showReport, setShowReport] = useState(false)
  const [reportEmail, setReportEmail] = useState('')
  const [reportTitle, setReportTitle] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reported, setReported] = useState(false)

  // Desplegables de grupos (las IAs se cargan colapsadas por defecto)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    ias: false,
  })

  // Diagnóstico en vivo de red y APIs de IA
  const [pinging, setPinging] = useState(false)
  const [pingLatency, setPingLatency] = useState<number | null>(null)
  const [pingResult, setPingResult] = useState<'excelente' | 'moderado' | 'lento' | 'error' | null>(null)
  const [routeGemini, setRouteGemini] = useState<'disponible' | 'lenta' | 'error' | null>(null)
  const [routeGroq, setRouteGroq] = useState<'disponible' | 'lenta' | 'error' | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  // Tooltip flotante interactivo
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    date: string
    title: string
    status: 'ok' | 'degradado' | 'error' | 'mantenimiento'
    visible: boolean
  }>({
    x: 0,
    y: 0,
    date: '',
    title: '',
    status: 'ok',
    visible: false
  })

  // Detectar modo oscuro de forma segura en cliente
  useEffect(() => {
    const check = () => {
      const darkByClass = document.documentElement.classList.contains('dark')
      const darkByAttr = document.documentElement.getAttribute('data-theme') === 'dark'
      setIsDark(darkByClass || darkByAttr)
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      try {
        const [checksRes, incidentesRes] = await Promise.all([
          fetch('/api/status/check'),
          fetch('/api/status/incidentes').catch(() => null)
        ])
        
        if (checksRes.ok) {
          const checksData = await checksRes.json()
          setChecks(checksData)
        }
        
        if (incidentesRes && incidentesRes.ok) {
          const incidentesData = await incidentesRes.json()
          setIncidencias(incidentesData.incidentes || [])
        }
      } catch (err) {
        console.error('Error al cargar datos de estatus:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Tema de colores seguro (Fallback por si fallan variables CSS globales)
  const t = {
    bgPrimary: isDark ? '#474747' : '#F5FAFA',
    bgCard: isDark ? '#525252' : '#FFFFFF',
    bgSecondary: isDark ? '#5A5A5A' : '#F2F9F8',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,130,124,0.12)',
    textPrimary: isDark ? '#FFFFFF' : '#474747',
    textSecondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(71, 71, 71, 0.7)',
    textPlaceholder: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(71, 71, 71, 0.4)',
    colorBrand: '#00827C',
    shadow: isDark ? '0 12px 24px rgba(0,0,0,0.3)' : '0 12px 24px rgba(0,130,124,0.06)',
    glassBg: isDark ? 'rgba(71, 71, 71, 0.5)' : 'rgba(255, 255, 255, 0.35)',
  }

  // Filtrar incidentes activos (no resueltos)
  const activos = incidencias.filter(i => i.estado !== 'resuelto')

  // Determinar estado general
  let globalStatus: 'ok' | 'degradado' | 'error' = 'ok'
  let globalMessage = 'Todos los sistemas están operando normalmente.'
  let bannerBg = isDark ? 'rgba(56,185,142,0.18)' : 'rgba(56,185,142,0.12)'
  let bannerBorder = 'rgba(56,185,142,0.25)'
  let bannerColor = '#38B98E'

  if (activos.length > 0) {
    const tieneCritico = activos.some(i => i.severidad === 'critico' || i.severidad === 'mayor')
    globalStatus = tieneCritico ? 'error' : 'degradado'
    globalMessage = tieneCritico 
      ? 'Incidencia crítica: Estamos experimentando fallas en algunos servicios.'
      : 'Incidencia menor: Algunos servicios operan con degradación.'
    bannerBg = tieneCritico 
      ? (isDark ? 'rgba(255,94,75,0.18)' : 'rgba(255,94,75,0.12)') 
      : (isDark ? 'rgba(246,191,62,0.18)' : 'rgba(246,191,62,0.12)')
    bannerBorder = tieneCritico ? 'rgba(255,94,75,0.25)' : 'rgba(246,191,62,0.25)'
    bannerColor = tieneCritico ? '#FF5E4B' : '#F6BF3E'
  } else if (!checks && !loading) {
    globalStatus = 'degradado'
    globalMessage = 'No se pudo comprobar el estado automático. Algunos servicios podrían no responder.'
    bannerBg = isDark ? 'rgba(246,191,62,0.18)' : 'rgba(246,191,62,0.12)'
    bannerBorder = 'rgba(246,191,62,0.25)'
    bannerColor = '#F6BF3E'
  }

  // Generar historial de barras de los últimos 60 días
  const NUM_DAYS = 60
  const diasBarras = Array.from({ length: NUM_DAYS }).map((_, idx) => {
    const d = new Date()
    d.setDate(d.getDate() - (NUM_DAYS - 1 - idx))
    return d
  })

  // Obtener estado de componente en día específico para las barras
  const getEstadoDia = (componente: string, dia: Date, checkStatus: string): { color: string; status: 'ok' | 'degradado' | 'error' | 'mantenimiento'; tooltip: string } => {
    const diaISO = dia.toISOString().slice(0, 10)
    const hoyISO = new Date().toISOString().slice(0, 10)
    
    if (diaISO === hoyISO && checkStatus === 'error') {
      return { color: '#FF5E4B', status: 'error', tooltip: 'Falla activa hoy' }
    }
    if (diaISO === hoyISO && checkStatus === 'degradado') {
      return { color: '#F6BF3E', status: 'degradado', tooltip: 'Rendimiento degradado hoy' }
    }

    const incidentesDia = incidencias.filter(i => 
      i.componente === componente && 
      i.created_at.slice(0, 10) === diaISO
    )

    if (incidentesDia.length > 0) {
      const resolved = incidentesDia.every(i => i.estado === 'resuelto')
      if (resolved) {
        // Incidente resuelto o mantenimiento finalizado -> barra azul o amarillo
        return { color: '#59A6E4', status: 'mantenimiento', tooltip: incidentesDia[0].titulo }
      }
      
      const tieneCritico = incidentesDia.some(i => i.severidad === 'critico' || i.severidad === 'mayor')
      if (tieneCritico) {
        return { color: '#FF5E4B', status: 'error', tooltip: incidentesDia[0].titulo }
      }
      return { color: '#F6BF3E', status: 'degradado', tooltip: incidentesDia[0].titulo }
    }

    return { color: '#38B98E', status: 'ok', tooltip: 'Sin incidentes' }
  }

  // Uptime promedio individual
  const getUptimePercent = (componente: string, checkStatus: string) => {
    let diasIncidentes = 0
    const hoyISO = new Date().toISOString().slice(0, 10)

    for (let idx = 0; idx < NUM_DAYS; idx++) {
      const d = new Date()
      d.setDate(d.getDate() - (NUM_DAYS - 1 - idx))
      const diaISO = d.toISOString().slice(0, 10)

      if (diaISO === hoyISO && checkStatus !== 'ok') {
        diasIncidentes++
        continue
      }

      const tieneAlertaActiva = incidencias.some(i => 
        i.componente === componente && 
        i.created_at.slice(0, 10) === diaISO &&
        i.estado !== 'resuelto' &&
        i.severidad !== 'menor'
      )
      if (tieneAlertaActiva) {
        diasIncidentes++
      }
    }

    const uptime = ((NUM_DAYS - diasIncidentes) / NUM_DAYS) * 100
    if (componente === 'qwen' && checks?.qwen?.uptime) {
      return checks.qwen.uptime
    }
    return uptime
  }

  // Rango del historial para la cabecera
  const getRangoFechas = () => {
    const fin = new Date()
    const inicio = new Date()
    inicio.setDate(inicio.getDate() - (NUM_DAYS - 1))
    const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
    const inicioStr = inicio.toLocaleDateString('es-CO', options)
    const finStr = fin.toLocaleDateString('es-CO', options)
    return `${inicioStr} - ${finStr}`
  }

  // Formato para el Tooltip (ej. "mié, 5 de nov de 2025")
  const formatTooltipDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).replace('.', '')
  }

  // Componentes individuales del Sistema (sin agrupar)
  const componentesSistema = [
    {
      key: 'supabase',
      label: 'Base de datos y Servidores',
      sub: 'Base relacional y persistencia RLS',
      icon: Database,
      status: checks?.supabase?.status ?? 'ok',
      latency: checks?.supabase?.latency,
      details: checks?.supabase?.details
    },
    {
      key: 'calculadora',
      label: 'Calculadora Core (CO2)',
      sub: 'Motor determinista local de equivalencias',
      icon: ShieldCheck,
      status: 'ok',
      latency: 0,
      details: 'Operacional'
    }
  ]

  // Grupos de Componentes (solo las IAs)
  const grupos = [
    {
      id: 'ias',
      label: 'Modelos de Inteligencia Artificial (IAs)',
      sub: 'Extracción visual de imágenes y validadores de coherencia',
      components: [
        {
          key: 'gemini',
          label: 'Google Gemini 2.0 API',
          sub: 'VLM / Extractor de texto e imágenes primario',
          icon: Cpu,
          status: checks?.gemini?.status ?? 'ok',
          latency: checks?.gemini?.latency,
          details: checks?.gemini?.details
        },
        {
          key: 'groq',
          label: 'Groq Cloud (LLaMA 3.3)',
          sub: 'Validador inteligente circular secundario',
          icon: Cpu,
          status: checks?.groq?.status ?? 'ok',
          latency: checks?.groq?.latency,
          details: checks?.groq?.details
        },
        {
          key: 'openrouter',
          label: 'OpenRouter Gateway',
          sub: 'Redirección asíncrona de fallback',
          icon: Cpu,
          status: checks?.openrouter?.status ?? 'ok',
          latency: checks?.openrouter?.latency,
          details: checks?.openrouter?.details
        },
        {
          key: 'qwen',
          label: 'Qwen-VL 8B (OpenRouter)',
          sub: checks?.qwen?.details || 'VLM de fallback alternativo',
          icon: Cpu,
          status: checks?.qwen?.status ?? 'ok',
          latency: checks?.qwen?.latency,
          details: checks?.qwen?.details
        }
      ]
    }
  ]

  // Estado agregado de un grupo para las barras consolidadas
  const getGrupoEstadoDia = (components: StatusComponent[], dia: Date): { color: string; status: 'ok' | 'degradado' | 'error' | 'mantenimiento'; tooltip: string } => {
    let worseColor = '#38B98E'
    let worseStatus: 'ok' | 'degradado' | 'error' | 'mantenimiento' = 'ok'
    let worseTooltip = 'Sin incidentes'

    for (const comp of components) {
      const barInfo = getEstadoDia(comp.key, dia, comp.status)
      if (barInfo.color === '#FF5E4B') {
        return { color: '#FF5E4B', status: 'error', tooltip: `${comp.label}: Falla activa` }
      }
      if (barInfo.color === '#59A6E4' && worseColor !== '#FF5E4B') {
        worseColor = '#59A6E4'
        worseStatus = 'mantenimiento'
        worseTooltip = `${comp.label}: ${barInfo.tooltip}`
      }
      if (barInfo.color === '#F6BF3E' && worseColor !== '#FF5E4B' && worseColor !== '#59A6E4') {
        worseColor = '#F6BF3E'
        worseStatus = 'degradado'
        worseTooltip = `${comp.label}: ${barInfo.tooltip}`
      }
    }
    return { color: worseColor, status: worseStatus, tooltip: worseTooltip }
  }

  // Uptime promedio del grupo
  const getGrupoUptimePercent = (components: StatusComponent[]) => {
    const total = components.reduce((sum, comp) => sum + getUptimePercent(comp.key, comp.status), 0)
    return total / components.length
  }

  // Estado actual del grupo (el peor)
  const getGrupoStatus = (components: StatusComponent[]) => {
    if (components.some(c => c.status === 'error')) return 'error'
    if (components.some(c => c.status === 'degradado')) return 'degradado'
    return 'ok'
  }

  // Estilo Liquid Glass para la cabecera
  const glassStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 130, 124, 0.12)',
    boxShadow: isDark ? '0 4px 30px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0, 130, 124, 0.05)',
    backgroundColor: isDark ? 'rgba(71, 71, 71, 0.5)' : 'rgba(255, 255, 255, 0.35)',
    transition: 'background-color 0.3s, border-color 0.3s, box-shadow 0.3s',
  }

  // Generar historial de los últimos 7 días (para la lista de abajo)
  const historialDias = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date()
    d.setDate(d.getDate() - idx)
    return d
  })

  // Manejadores del Tooltip Flotante con posicionamiento robusto relativo al contenedor principal
  const handleBarMouseEnter = (e: React.MouseEvent<HTMLDivElement>, dia: Date, color: string, title: string, status: 'ok' | 'degradado' | 'error' | 'mantenimiento') => {
    const rect = e.currentTarget.getBoundingClientRect()
    let containerLeft = 0
    let containerTop = 0
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      containerLeft = containerRect.left
      containerTop = containerRect.top
    }

    setTooltip({
      x: rect.left - containerLeft + rect.width / 2,
      y: rect.top - containerTop - 12,
      date: formatTooltipDate(dia),
      title: title || 'Sin incidentes',
      status: status,
      visible: true
    })
  }

  const handleBarMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      try {
        const res = await fetch('/api/status/suscribirse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        })
        if (res.ok) {
          setSubscribed(true)
          setTimeout(() => {
            setSubscribed(false)
            setEmail('')
            setShowSubscribe(false)
          }, 2500)
        } else {
          alert('Hubo un problema al procesar tu suscripción.')
        }
      } catch {
        alert('Error de red al procesar tu suscripción.')
      }
    }
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reportEmail.trim() && reportTitle.trim() && reportDesc.trim()) {
      try {
        const res = await fetch('/api/status/reportar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: reportEmail.trim(),
            titulo: reportTitle.trim(),
            descripcion: reportDesc.trim()
          })
        })
        if (res.ok) {
          setReported(true)
          setTimeout(() => {
            setReported(false)
            setReportEmail('')
            setReportTitle('')
            setReportDesc('')
            setShowReport(false)
          }, 2500)
        } else {
          alert('Hubo un problema al enviar el reporte.')
        }
      } catch {
        alert('Error de red al enviar el reporte.')
      }
    }
  }

  const ejecutarPingTest = async () => {
    setPinging(true)
    setPingLatency(null)
    setPingResult(null)
    setRouteGemini(null)
    setRouteGroq(null)

    // 1. Probar ruta de Gemini (no-cors, solo DNS/red)
    const probeGemini = async () => {
      const start = Date.now()
      try {
        await fetch('https://generativelanguage.googleapis.com', { mode: 'no-cors' })
        const end = Date.now() - start
        if (end < 180) {
          setRouteGemini('disponible')
        } else {
          setRouteGemini('lenta')
        }
      } catch {
        setRouteGemini('error')
      }
    }

    // 2. Probar ruta de Groq (no-cors, solo DNS/red)
    const probeGroq = async () => {
      const start = Date.now()
      try {
        await fetch('https://api.groq.com', { mode: 'no-cors' })
        const end = Date.now() - start
        if (end < 180) {
          setRouteGroq('disponible')
        } else {
          setRouteGroq('lenta')
        }
      } catch {
        setRouteGroq('error')
      }
    }

    // 3. Probar latencia del servidor de Reúso (3 pings secuenciales)
    const pings: number[] = []

    // Ejecutar pruebas en paralelo
    await Promise.all([
      probeGemini(),
      probeGroq(),
      (async () => {
        for (let i = 0; i < 3; i++) {
          const start = Date.now()
          try {
            const res = await fetch('/api/status/ping', { cache: 'no-store' })
            if (res.ok) {
              pings.push(Date.now() - start)
            }
          } catch {
            // Ignorar fallo de ping individual
          }
          // Esperar 150ms entre pings
          await new Promise(r => setTimeout(r, 150))
        }
      })()
    ])

    if (pings.length > 0) {
      const avg = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length)
      setPingLatency(avg)
      if (avg < 90) {
        setPingResult('excelente')
      } else if (avg < 250) {
        setPingResult('moderado')
      } else {
        setPingResult('lento')
      }
    } else {
      setPingResult('error')
    }

    setPinging(false)
  }

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      minHeight: '100vh',
      background: isDark ? '#474747' : 'linear-gradient(to bottom, #F5FAFA 0%, #FFFFFF 850px)',
      color: t.textPrimary,
      transition: 'background 0.3s'
    }}>
      {/* Forzar el fondo degradado en el contenedor de la plantilla pública (layout) */}
      <style dangerouslySetInnerHTML={{ __html: `
        div[style*="min-height: 100vh"], div[style*="minHeight: 100vh"] {
          background: ${isDark ? '#474747' : 'linear-gradient(to bottom, #F5FAFA 0%, #FFFFFF 850px)'} !important;
        }
      ` }} />
      
      {/* HEADER LIQUID GLASS */}
      <header style={glassStyle}>
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            color: t.textPrimary,
            fontSize: 14,
            fontWeight: 600
          }}>
            <ArrowLeft size={16} />
            Volver a Reúso
          </Link>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: t.colorBrand }}>reuso</span>
            <span style={{ fontSize: 20, color: t.textSecondary }}>.lurdes.co</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px 80px' }}>
        
        {/* BOTONES SUPERIORES DE ACCIÓN */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setShowReport(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: '999px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0, 130, 124, 0.3)'}`,
              color: isDark ? '#FFFFFF' : '#00827C',
              textDecoration: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0, 130, 124, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Informar de un problema
          </button>
          <button
            onClick={() => setShowSubscribe(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: '999px',
              border: 'none',
              color: 'white',
              background: '#00827C',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#006B66'}
            onMouseLeave={e => e.currentTarget.style.background = '#00827C'}
          >
            Suscribirse a las actualizaciones
          </button>
        </div>

        {/* MODAL SUSCRIPCIÓN MOCKUP */}
        {showSubscribe && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(71,71,71,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}>
            <div style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 24,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Suscribirse a las Actualizaciones</h4>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
                Recibe notificaciones automáticas directamente en tu correo electrónico cuando haya caídas de servicios o mantenimientos.
              </p>
              
              {subscribed ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <CheckCircle size={32} color="#38B98E" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#38B98E' }}>
                    ¡Suscrito con éxito!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${t.border}`,
                      background: t.bgPrimary,
                      color: t.textPrimary,
                      outline: 'none',
                      fontSize: 14
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'end', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowSubscribe(false)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: `1px solid ${t.border}`,
                        background: 'transparent',
                        color: t.textSecondary,
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#00827C',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13
                      }}
                    >
                      Suscribirse
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MODAL REPORTE DE PROBLEMA PÚBLICO */}
        {showReport && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(71,71,71,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}>
            <div style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 24,
              padding: 24,
              maxWidth: 450,
              width: '100%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Reportar un Problema</h4>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
                Envía un reporte directamente al administrador del sistema sobre fallas de conexión o incidencias observadas. No se requiere inicio de sesión.
              </p>
              
              {reported ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <CheckCircle size={32} color="#38B98E" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#38B98E' }}>
                    ¡Reporte enviado con éxito!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary }}>Tu Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={reportEmail}
                      onChange={e => setReportEmail(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        background: t.bgPrimary,
                        color: t.textPrimary,
                        outline: 'none',
                        fontSize: 14
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary }}>Título del Problema</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Falla al cargar VLM"
                      value={reportTitle}
                      onChange={e => setReportTitle(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        background: t.bgPrimary,
                        color: t.textPrimary,
                        outline: 'none',
                        fontSize: 14
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary }}>Descripción detallada</label>
                    <textarea
                      required
                      placeholder="Explica qué error o comportamiento incorrecto estás observando..."
                      value={reportDesc}
                      onChange={e => setReportDesc(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        background: t.bgPrimary,
                        color: t.textPrimary,
                        outline: 'none',
                        fontSize: 14,
                        minHeight: 100,
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowReport(false)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: `1px solid ${t.border}`,
                        background: 'transparent',
                        color: t.textSecondary,
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#00827C',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13
                      }}
                    >
                      Enviar Reporte
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* BANNER DE ESTADO GLOBAL */}
        <div style={{
          background: bannerBg,
          border: `1px solid ${bannerBorder}`,
          borderRadius: 24,
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32
        }}>
          {globalStatus === 'ok' ? (
            <CheckCircle size={36} color={bannerColor} weight="fill" style={{ flexShrink: 0 }} />
          ) : globalStatus === 'degradado' ? (
            <WarningCircle size={36} color={bannerColor} weight="fill" style={{ flexShrink: 0 }} />
          ) : (
            <XCircle size={36} color={bannerColor} weight="fill" style={{ flexShrink: 0 }} />
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
              {globalStatus === 'ok' ? 'Sistemas Operativos' : globalStatus === 'degradado' ? 'Degradación del Servicio' : 'Falla del Servicio'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: t.textSecondary, lineHeight: 1.5 }}>
              {globalMessage}
            </p>
          </div>
        </div>

        {/* INCIDENCIAS ACTIVAS */}
        {activos.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
              Incidentes Activos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activos.map(i => (
                <div key={i.id} style={{
                  background: t.bgCard,
                  border: `1px solid ${i.severidad === 'critico' ? 'rgba(255,94,75,0.2)' : t.border}`,
                  borderLeft: `4px solid ${SEVERIDAD_COLOR[i.severidad]}`,
                  borderRadius: 16,
                  padding: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
                      {i.titulo}
                    </h4>
                    <span style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      background: `${SEVERIDAD_COLOR[i.severidad]}1A`,
                      color: SEVERIDAD_COLOR[i.severidad],
                      padding: '2px 8px',
                      borderRadius: 4
                    }}>
                      {i.estado}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
                    {i.descripcion}
                  </p>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.textPlaceholder }}>
                    <Clock size={12} />
                    <span>Afecta a: {COMPONENTE_LABEL[i.componente] ?? i.componente}</span>
                    <span>·</span>
                    <span>Actualizado hace poco</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENEDOR MÓDULOS CON TIMELINES DE UPTIME */}
        <div style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 24,
          padding: '24px',
          boxShadow: t.shadow,
          marginBottom: 40,
          transition: 'background-color 0.3s, border-color 0.3s'
        }}>
          {/* Cabecera del Panel */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${t.border}`,
            paddingBottom: 16,
            marginBottom: 8
          }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
              Uptime del Sistema
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.textSecondary }}>
              <CaretLeft size={14} style={{ cursor: 'pointer', opacity: 0.5 }} />
              <span style={{ fontWeight: 500 }}>{getRangoFechas()}</span>
              <CaretRight size={14} style={{ cursor: 'pointer', opacity: 0.5 }} />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: t.textSecondary }}>
              Cargando componentes...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* 1. Componentes individuales del Sistema (sin agrupar) */}
              {componentesSistema.map((comp) => {
                const isCompOk = comp.status === 'ok'
                const isCompDegradado = comp.status === 'degradado'
                const compUptime = getUptimePercent(comp.key, comp.status)
                const latencyInfo = comp.latency ? `${comp.latency}ms` : ''

                return (
                  <div key={comp.key} style={{
                    padding: '20px 0',
                    borderBottom: `1px solid ${t.border}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isCompOk ? (
                          <CheckCircle size={18} color="#38B98E" weight="fill" style={{ flexShrink: 0 }} />
                        ) : isCompDegradado ? (
                          <WarningCircle size={18} color="#F6BF3E" weight="fill" style={{ flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} color="#FF5E4B" weight="fill" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>
                            {comp.label}
                          </span>
                          <span style={{ fontSize: 11, color: t.textSecondary }}>
                            {comp.sub}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, flexShrink: 0 }}>
                        {compUptime.toFixed(2)}% uptime
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 2.5, width: '100%', height: 16, margin: '8px 0' }}>
                      {diasBarras.map((dia, idx) => {
                        const barInfo = getEstadoDia(comp.key, dia, comp.status)
                        return (
                          <div
                            key={idx}
                            onMouseEnter={(e) => handleBarMouseEnter(e, dia, barInfo.color, barInfo.tooltip, barInfo.status)}
                            onMouseLeave={handleBarMouseLeave}
                            style={{
                              flex: 1,
                              backgroundColor: barInfo.color,
                              borderRadius: 1.5,
                              transition: 'opacity 0.15s',
                              cursor: 'pointer',
                            }}
                          />
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textPlaceholder }}>
                      <span>Hace {NUM_DAYS} días</span>
                      <span>
                        {latencyInfo ? `Latencia: ${latencyInfo}` : ''}
                        {comp.details && comp.details !== 'Operacional' && comp.details !== 'API operacional.' && comp.details !== 'Conexión establecida.' ? ` · ${comp.details}` : ''}
                      </span>
                      <span>Hoy</span>
                    </div>
                  </div>
                )
              })}

              {/* 2. Grupos de Componentes (IAs) */}
              {grupos.map((grupo, gIdx) => {
                const isExpanded = expanded[grupo.id]
                const groupStatus = getGrupoStatus(grupo.components)
                const isOk = groupStatus === 'ok'
                const isDegradado = groupStatus === 'degradado'
                const groupUptime = getGrupoUptimePercent(grupo.components)

                return (
                  <div key={grupo.id} style={{
                    padding: '20px 0',
                    borderBottom: gIdx < grupos.length - 1 ? `1px solid ${t.border}` : 'none'
                  }}>
                    {/* Fila del Grupo */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div
                        onClick={() => setExpanded(prev => ({ ...prev, [grupo.id]: !prev[grupo.id] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
                      >
                        {isOk ? (
                          <CheckCircle size={18} color="#38B98E" weight="fill" style={{ flexShrink: 0 }} />
                        ) : isDegradado ? (
                          <WarningCircle size={18} color="#F6BF3E" weight="fill" style={{ flexShrink: 0 }} />
                        ) : (
                          <XCircle size={18} color="#FF5E4B" weight="fill" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>
                            {grupo.label}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpanded(prev => ({ ...prev, [grupo.id]: !prev[grupo.id] }))
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: isExpanded ? '#FFFFFF' : (isDark ? 'rgba(255,255,255,0.8)' : '#00827C'),
                              background: isExpanded 
                                ? '#00827C' 
                                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.06)'),
                              border: `1px solid ${isExpanded ? '#00827C' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,130,124,0.15)')}`,
                              borderRadius: '16px',
                              padding: '2px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}
                            onMouseEnter={e => {
                              if (!isExpanded) {
                                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,130,124,0.12)'
                                e.currentTarget.style.color = isDark ? '#FFFFFF' : '#006B66'
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isExpanded) {
                                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.06)'
                                e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.8)' : '#00827C'
                              }
                            }}
                          >
                            <span>{grupo.components.length} componentes</span>
                            {isExpanded ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
                          </button>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, flexShrink: 0 }}>
                        {groupUptime.toFixed(2)}% uptime
                      </span>
                    </div>

                    {/* Línea agregada del Grupo */}
                    <div style={{ display: 'flex', gap: 2.5, width: '100%', height: 16, margin: '8px 0' }}>
                      {diasBarras.map((dia, idx) => {
                        const barInfo = getGrupoEstadoDia(grupo.components, dia)
                        return (
                          <div
                            key={idx}
                            onMouseEnter={(e) => handleBarMouseEnter(e, dia, barInfo.color, barInfo.tooltip, barInfo.status)}
                            onMouseLeave={handleBarMouseLeave}
                            style={{
                              flex: 1,
                              backgroundColor: barInfo.color,
                              borderRadius: 1.5,
                              transition: 'opacity 0.15s',
                              cursor: 'pointer',
                            }}
                          />
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textPlaceholder, marginBottom: isExpanded ? 16 : 0 }}>
                      <span>Hace {NUM_DAYS} días</span>
                      <span>{grupo.sub}</span>
                      <span>Hoy</span>
                    </div>

                    {/* Sublista de componentes (si está expandido) */}
                    {isExpanded && (
                      <div style={{
                        marginTop: 16,
                        paddingLeft: 20,
                        borderLeft: isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(0, 130, 124, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,130,124,0.02)',
                        padding: '16px',
                        borderRadius: 8
                      }}>
                        {grupo.components.map((comp) => {
                          const isCompOk = comp.status === 'ok'
                          const isCompDegradado = comp.status === 'degradado'
                          const compUptime = getUptimePercent(comp.key, comp.status)
                          const latencyInfo = comp.latency ? `${comp.latency}ms` : ''

                          return (
                            <div key={comp.key}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {isCompOk ? (
                                    <CheckCircle size={14} color="#38B98E" weight="fill" />
                                  ) : isCompDegradado ? (
                                    <WarningCircle size={14} color="#F6BF3E" weight="fill" />
                                  ) : (
                                    <XCircle size={14} color="#FF5E4B" weight="fill" />
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                                      {comp.label}
                                    </span>
                                    <span style={{ fontSize: 10, color: t.textPlaceholder }}>
                                      {comp.sub}
                                    </span>
                                  </div>
                                </div>
                                <span style={{ fontSize: 11, color: t.textSecondary }}>
                                  {compUptime.toFixed(2)}%
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: 2.5, width: '100%', height: 12, margin: '6px 0' }}>
                                {diasBarras.map((dia, idx) => {
                                  const barInfo = getEstadoDia(comp.key, dia, comp.status)
                                  return (
                                    <div
                                      key={idx}
                                      onMouseEnter={(e) => handleBarMouseEnter(e, dia, barInfo.color, barInfo.tooltip, barInfo.status)}
                                      onMouseLeave={handleBarMouseLeave}
                                      style={{
                                        flex: 1,
                                        backgroundColor: barInfo.color,
                                        borderRadius: 1.5,
                                        cursor: 'pointer',
                                        transition: 'opacity 0.15s'
                                      }}
                                    />
                                  )
                                })}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: t.textPlaceholder }}>
                                <span>Hace {NUM_DAYS} días</span>
                                <span>
                                  {latencyInfo ? `Latencia: ${latencyInfo}` : ''}
                                  {comp.details && comp.details !== 'Operacional' && comp.details !== 'API operacional.' && comp.details !== 'Conexión establecida.' ? ` · ${comp.details}` : ''}
                                </span>
                                <span>Hoy</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* HISTORIAL DE INCIDENCIAS */}
        <div style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 24,
          padding: '24px',
          boxShadow: t.shadow,
          marginBottom: 40,
          transition: 'background-color 0.3s, border-color 0.3s'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
            onClick={() => setHistoryExpanded(!historyExpanded)}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarSevenIcon size={18} />
              Historial de Incidencias (Últimos 7 días)
            </h3>
            <button
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: historyExpanded ? '#FFFFFF' : (isDark ? 'rgba(255,255,255,0.8)' : '#00827C'),
                background: historyExpanded 
                  ? '#00827C' 
                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.06)'),
                border: `1px solid ${historyExpanded ? '#00827C' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,130,124,0.15)')}`,
                borderRadius: '16px',
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s',
                userSelect: 'none'
              }}
            >
              <span>Ver historial</span>
              {historyExpanded ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
            </button>
          </div>

          {historyExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              {historialDias.map((d: Date, index: number) => {
                const diaString = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
                const dISO = d.toISOString().slice(0, 10)
                
                const deEsteDia = incidencias.filter(i => i.created_at.slice(0, 10) === dISO)

                return (
                  <div key={index} style={{
                    borderBottom: index < 6 ? `1px solid ${t.border}` : 'none',
                    paddingBottom: 16
                  }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: t.textSecondary }}>
                      {diaString}
                    </h4>
                    
                    {deEsteDia.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: t.textPlaceholder }}>
                        No se reportaron incidentes.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                        {deEsteDia.map(i => (
                          <div key={i.id} style={{
                            background: t.bgSecondary,
                            borderRadius: 8,
                            padding: 12,
                            border: `1px solid ${t.border}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: i.estado === 'resuelto' ? '#38B98E' : SEVERIDAD_COLOR[i.severidad]
                              }} />
                              <strong style={{ fontSize: 13, color: t.textPrimary }}>{i.titulo}</strong>
                            </div>
                            {i.descripcion && (
                              <p style={{ margin: '6px 0 0', fontSize: 12, color: t.textSecondary, lineHeight: 1.5 }}>
                                {i.descripcion}
                              </p>
                            )}
                            <div style={{ marginTop: 8, fontSize: 11, color: t.textPlaceholder }}>
                              <span>Componente: {COMPONENTE_LABEL[i.componente] ?? i.componente}</span>
                              {i.resolved_at && (
                                <span style={{ marginLeft: 8 }}>· Resuelto el {new Date(i.resolved_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* DIAGNÓSTICO DE RED EN VIVO */}
        <div style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 24,
          padding: '24px',
          boxShadow: t.shadow,
          marginBottom: 40,
          transition: 'background-color 0.3s, border-color 0.3s'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${t.border}`,
            paddingBottom: 16,
            marginBottom: 16
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                Diagnóstico de Red en Vivo
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: t.textSecondary }}>
                Mide la latencia hacia nuestros servidores y la disponibilidad de las rutas de red a las APIs de IA.
              </p>
            </div>
            <button
              onClick={ejecutarPingTest}
              disabled={pinging}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: '999px',
                border: 'none',
                color: 'white',
                background: pinging ? '#006B66' : '#00827C',
                cursor: pinging ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: pinging ? 0.7 : 1
              }}
              onMouseEnter={e => { if (!pinging) e.currentTarget.style.background = '#006B66' }}
              onMouseLeave={e => { if (!pinging) e.currentTarget.style.background = '#00827C' }}
            >
              {pinging ? (
                <>
                  <span className="ping-spinner" style={{
                    width: 12,
                    height: 12,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'ping-spin 0.8s linear infinite',
                    display: 'inline-block'
                  }} />
                  Probando red...
                </>
              ) : 'Iniciar'}
            </button>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes ping-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          ` }} />

          {/* Resultados */}
          {pingResult === null && !pinging ? (
            <div style={{ textAlign: 'center', padding: '12px 0', color: t.textPlaceholder, fontSize: 13 }}>
              Presiona &quot;Iniciar&quot; para comprobar la ruta de red y velocidad.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Servidor Reúso */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: pinging 
                      ? '#FF5E4B'
                      : pingResult === 'excelente' ? '#38B98E' : pingResult === 'moderado' ? '#F6BF3E' : '#FF5E4B',
                    boxShadow: pinging 
                      ? '0 0 8px #FF5E4B' 
                      : pingResult === 'excelente' ? '0 0 8px #38B98E' : pingResult === 'moderado' ? '0 0 8px #F6BF3E' : '0 0 8px #FF5E4B',
                    transition: 'all 0.3s'
                  }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>Conexión a Servidor Reúso</span>
                    <p style={{ margin: 0, fontSize: 10, color: t.textSecondary }}>Ruta de red al servidor de procesamiento y base de datos</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: 13, 
                    fontWeight: 700, 
                    color: pingResult === 'excelente' ? '#38B98E' : pingResult === 'moderado' ? '#F6BF3E' : '#FF5E4B' 
                  }}>
                    {pinging ? 'Midiendo...' : pingResult === 'error' ? 'Fallo' : `${pingLatency} ms`}
                  </span>
                  {!pinging && pingResult !== 'error' && (
                    <span style={{ display: 'block', fontSize: 9, color: t.textPlaceholder, textTransform: 'capitalize' }}>
                      {pingResult === 'excelente' ? 'Conexión Excelente' : pingResult === 'moderado' ? 'Conexión Aceptable' : 'Conexión Lenta'}
                    </span>
                  )}
                </div>
              </div>

              {/* Ruta Google Gemini */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: pinging
                      ? '#FF5E4B'
                      : routeGemini === 'disponible' ? '#38B98E' : routeGemini === 'lenta' ? '#F6BF3E' : '#FF5E4B',
                    boxShadow: pinging
                      ? '0 0 8px #FF5E4B'
                      : routeGemini === 'disponible' ? '0 0 8px #38B98E' : routeGemini === 'lenta' ? '0 0 8px #F6BF3E' : '0 0 8px #FF5E4B',
                    transition: 'all 0.3s'
                  }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>Ruta a Google Gemini API</span>
                    <p style={{ margin: 0, fontSize: 10, color: t.textSecondary }}>Conexión directa del cliente con el dominio de la API de Google</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: 13, 
                    fontWeight: 700, 
                    color: routeGemini === 'disponible' ? '#38B98E' : routeGemini === 'lenta' ? '#F6BF3E' : '#FF5E4B' 
                  }}>
                    {pinging ? 'Analizando...' : routeGemini === 'disponible' ? 'Disponible' : routeGemini === 'lenta' ? 'Ruta Lenta' : 'Inaccesible'}
                  </span>
                  {!pinging && (
                    <span style={{ display: 'block', fontSize: 9, color: t.textPlaceholder }}>
                      {routeGemini === 'disponible' ? 'Ruta óptima' : routeGemini === 'lenta' ? 'Latencia elevada' : 'Fallo de red local'}
                    </span>
                  )}
                </div>
              </div>

              {/* Ruta Groq Cloud */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: pinging
                      ? '#FF5E4B'
                      : routeGroq === 'disponible' ? '#38B98E' : routeGroq === 'lenta' ? '#F6BF3E' : '#FF5E4B',
                    boxShadow: pinging
                      ? '0 0 8px #FF5E4B'
                      : routeGroq === 'disponible' ? '0 0 8px #38B98E' : routeGroq === 'lenta' ? '0 0 8px #F6BF3E' : '0 0 8px #FF5E4B',
                    transition: 'all 0.3s'
                  }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>Ruta a Groq Cloud API</span>
                    <p style={{ margin: 0, fontSize: 10, color: t.textSecondary }}>Conexión directa del cliente con el dominio de la API de Groq</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: 13, 
                    fontWeight: 700, 
                    color: routeGroq === 'disponible' ? '#38B98E' : routeGroq === 'lenta' ? '#F6BF3E' : '#FF5E4B' 
                  }}>
                    {pinging ? 'Analizando...' : routeGroq === 'disponible' ? 'Disponible' : routeGroq === 'lenta' ? 'Ruta Lenta' : 'Inaccesible'}
                  </span>
                  {!pinging && (
                    <span style={{ display: 'block', fontSize: 9, color: t.textPlaceholder }}>
                      {routeGroq === 'disponible' ? 'Ruta óptima' : routeGroq === 'lenta' ? 'Latencia elevada' : 'Fallo de red local'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* FLOATING INTERACTIVE TOOLTIP TIPO INSTATUS */}
      {tooltip.visible && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: isDark ? '#5A5A5A' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${t.border}`,
          borderRadius: 8,
          padding: '12px 16px',
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0, 130, 124, 0.08)',
          zIndex: 1000,
          pointerEvents: 'none',
          width: 'max-content',
          maxWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          {/* Triangulito de la flecha */}
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 12,
            height: 12,
            background: isDark ? '#5A5A5A' : '#FFFFFF',
            borderRight: isDark ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${t.border}`,
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${t.border}`,
            zIndex: -1
          }} />

          {/* Fecha */}
          <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(71, 71, 71, 0.6)', fontWeight: 500 }}>
            {tooltip.date}
          </span>

          {/* Información del Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tooltip.status === 'ok' && (
              <CheckCircle size={16} color="#38B98E" weight="fill" style={{ flexShrink: 0 }} />
            )}
            {tooltip.status === 'mantenimiento' && (
              <Hammer size={16} color="#59A6E4" weight="fill" style={{ flexShrink: 0 }} />
            )}
            {tooltip.status === 'degradado' && (
              <Warning size={16} color="#F6BF3E" weight="fill" style={{ flexShrink: 0 }} />
            )}
            {tooltip.status === 'error' && (
              <WarningCircle size={16} color="#FF5E4B" weight="fill" style={{ flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: tooltip.status === 'ok' ? (isDark ? 'rgba(255,255,255,0.6)' : '#888888') : t.textPrimary,
              lineHeight: 1.3
            }}>
              {tooltip.status === 'ok' ? 'No incidents' : tooltip.title}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
