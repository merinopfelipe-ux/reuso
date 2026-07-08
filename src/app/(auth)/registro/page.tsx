'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { ShieldCheck, Eye, EyeOff as EyeSlash, Square, SquareCheck as CheckSquare, Building2 as Buildings, Mail as EnvelopeSimple, Phone, User, ChevronDown as CaretDown, ArrowRight, ArrowLeft, X, Check, Headset, Circle, CheckCircle, Loader2 as CircleNotch, FileText, ChevronRight as CaretRight } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/theme-toggle'

function normalizeStr(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// ── Países para selector de indicativo ────────────────────────────────────────
const PAISES = [
  { code: 'co', name: 'Colombia',          dial: '+57'  },
  { code: 'mx', name: 'México',            dial: '+52'  },
  { code: 'ar', name: 'Argentina',         dial: '+54'  },
  { code: 'cl', name: 'Chile',             dial: '+56'  },
  { code: 'pe', name: 'Perú',             dial: '+51'  },
  { code: 'ec', name: 'Ecuador',           dial: '+593' },
  { code: 've', name: 'Venezuela',         dial: '+58'  },
  { code: 'bo', name: 'Bolivia',           dial: '+591' },
  { code: 'py', name: 'Paraguay',          dial: '+595' },
  { code: 'uy', name: 'Uruguay',           dial: '+598' },
  { code: 'br', name: 'Brasil',            dial: '+55'  },
  { code: 'gt', name: 'Guatemala',         dial: '+502' },
  { code: 'hn', name: 'Honduras',          dial: '+504' },
  { code: 'sv', name: 'El Salvador',       dial: '+503' },
  { code: 'ni', name: 'Nicaragua',         dial: '+505' },
  { code: 'cr', name: 'Costa Rica',        dial: '+506' },
  { code: 'pa', name: 'Panamá',           dial: '+507' },
  { code: 'cu', name: 'Cuba',              dial: '+53'  },
  { code: 'do', name: 'Rep. Dominicana',   dial: '+1'   },
  { code: 'es', name: 'España',            dial: '+34'  },
  { code: 'us', name: 'EE. UU.',           dial: '+1'   },
  { code: 'ca', name: 'Canadá',           dial: '+1'   },
  { code: 'fr', name: 'Francia',           dial: '+33'  },
  { code: 'de', name: 'Alemania',          dial: '+49'  },
  { code: 'it', name: 'Italia',            dial: '+39'  },
  { code: 'gb', name: 'Reino Unido',       dial: '+44'  },
  { code: 'pt', name: 'Portugal',          dial: '+351' },
  { code: 'nl', name: 'Países Bajos',     dial: '+31'  },
  { code: 'au', name: 'Australia',         dial: '+61'  },
  { code: 'jp', name: 'Japón',            dial: '+81'  },
]

// ── Opciones de perfil ────────────────────────────────────────────────────────
const FRECUENCIAS = ['Diario', 'Semanal', 'Mensual', 'Ocasional']
const MOTIVACIONES = ['Reducir costos', 'Impacto ambiental', 'Cumplimiento normativo', 'Curiosidad / Aprendizaje']

// ── Fortaleza de contraseña ────────────────────────────────────────────────────
type Fuerza = 0 | 1 | 2 | 3
function evaluarFuerza(pwd: string): Fuerza {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8)        score++
  if (/[A-Z]/.test(pwd))      score++
  if (/[0-9]/.test(pwd))      score++
  if (pwd.length >= 12)       score++
  return Math.min(score, 3) as Fuerza
}
const FUERZA_CFG: Record<Fuerza, { label: string; color: string; width: string }> = {
  0: { label: 'Muy débil', color: '#FF5E4B', width: '15%' },
  1: { label: 'Débil',     color: '#FF5E4B', width: '33%' },
  2: { label: 'Media',     color: '#F6BF3E', width: '66%' },
  3: { label: 'Fuerte',    color: '#38B98E', width: '100%' },
}

// ── Puntos clave de documentos legales ───────────────────────────────────────
const PUNTOS_TERMINOS = [
  'El servicio es para uso profesional dentro de tu organización.',
  'Tus datos de reúso son privados y solo visibles para tu empresa.',
  'Puedes solicitar la eliminación de tu cuenta en cualquier momento.',
  'El uso indebido de la plataforma puede resultar en la suspensión de la cuenta.',
]
const PUNTOS_PRIVACIDAD = [
  'Recopilamos nombre, correo y los datos de reúso que registras.',
  'Tus datos se procesan en servidores seguros con cifrado SSL/TLS.',
  'Usamos tus datos para generar informes de impacto ambiental.',
  'No vendemos ni compartimos tu información con terceros.',
]

// ── Componente ─────────────────────────────────────────────────────────────────
export default function RegistroPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1)

  // Paso 1
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [indicativo, setIndicativo] = useState(PAISES[0])
  const [telefono, setTelefono] = useState('')
  const [mostrarPaises, setMostrarPaises] = useState(false)
  const [busquedaPais, setBusquedaPais] = useState('')
  const [codigoEmpresa, setCodigoEmpresa] = useState('')
  const [codigoStatus, setCodigoStatus] = useState<'idle' | 'validando' | 'ok' | 'error'>('idle')
  const [codigoNombreEmpresa, setCodigoNombreEmpresa] = useState('')
  const [mostrarTooltip, setMostrarTooltip] = useState(false)

  // Paso 2
  const [sector, setSector] = useState('')
  const [frecuencia, setFrecuencia] = useState('')
  const [motivaciones, setMotivaciones] = useState<string[]>([])
  const [quiereAsesoria, setQuiereAsesoria] = useState(false)

  // Paso 3
  const [apodo, setApodo] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showPwdConf, setShowPwdConf] = useState(false)
  const [aceptoTerminos, setAceptoTerminos] = useState(false)
  const [aceptoPrivacidad, setAceptoPrivacidad] = useState(false)
  const [modalDoc, setModalDoc] = useState<'terminos' | 'privacidad' | null>(null)
  const [suscritoNewsletter, setSuscritoNewsletter] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificandoEmail, setVerificandoEmail] = useState(false)
  const [exitoAsesoria, setExitoAsesoria] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const fuerza = evaluarFuerza(password)
  const fuerzaCfg = FUERZA_CFG[fuerza]

  // ── Validar código de empresa ────────────────────────────────────────────────
  const validarCodigo = useCallback(async (cod: string) => {
    if (!cod.trim()) { setCodigoStatus('idle'); setCodigoNombreEmpresa(''); return }
    setCodigoStatus('validando')
    try {
      const res = await fetch('/api/auth/validar-codigo-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: cod.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setCodigoStatus('ok')
        setCodigoNombreEmpresa(data.nombre)
      } else {
        setCodigoStatus('error')
        setCodigoNombreEmpresa('')
      }
    } catch {
      setCodigoStatus('error')
    }
  }, [])

  // ── Navegación entre pasos ───────────────────────────────────────────────────
  async function avanzarPaso1() {
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !telefono.trim()) {
      setError('Completa nombre, apellido, correo y teléfono para continuar.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.')
      return
    }
    setVerificandoEmail(true)
    try {
      const res = await fetch('/api/auth/verificar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (data.existe) {
        setError('Este correo ya tiene una cuenta. ¿Quieres ingresar?')
        return
      }
    } catch {
      // Continuar si la verificación falla (fail open)
    } finally {
      setVerificandoEmail(false)
    }
    setError('')
    setPaso(2)
  }

  function toggleMotivacion(m: string) {
    setMotivaciones(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
  }

  function avanzarPaso2() {
    if (!sector.trim()) { setError('Escribe el sector o industria en el que trabajas.'); return }
    if (!frecuencia) { setError('Selecciona con qué frecuencia registras reúsos.'); return }
    if (motivaciones.length === 0) { setError('Elige al menos una motivación para usar la Calculadora de Reúso.'); return }
    setError('')
    setPaso(3)
  }

  function avanzarPaso3() {
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (!/[A-Z]/.test(password)) { setError('La contraseña debe incluir al menos una letra mayúscula.'); return }
    if (!/[0-9]/.test(password)) { setError('La contraseña debe incluir al menos un número.'); return }
    if (password !== passwordConfirm) { setError('Las contraseñas no coinciden.'); return }
    setError('')
    setPaso(4)
  }

  // ── Envío final ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!aceptoTerminos || !aceptoPrivacidad) {
      setError('Acepta los términos y la política de privacidad para continuar.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('La contraseña debe incluir al menos una letra mayúscula.')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('La contraseña debe incluir al menos un número.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        apellido,
        apodo: apodo || undefined,
        email,
        telefono: telefono ? `${indicativo.dial} ${telefono}` : undefined,
        password,
        password_confirm: passwordConfirm,
        acepta_terminos: true,
        sector,
        frecuencia_reuso: frecuencia,
        motivacion: motivaciones.join(', '),
        quiere_asesoria: quiereAsesoria,
        codigo_empresa: codigoStatus === 'ok' ? codigoEmpresa.trim().toUpperCase() : undefined,
        turnstile_token: turnstileToken || 'skip',
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Algo salió mal. Intenta de nuevo.')
      setLoading(false)
      setTurnstileToken('')
      turnstileRef.current?.reset()
      return
    }
    router.push(`/confirmar-email?email=${encodeURIComponent(email)}`)
  }

  async function handleSolicitarAsesoria() {
    if (!sector.trim()) { setError('Escribe el sector o industria en el que trabajas.'); return }
    if (!frecuencia) { setError('Selecciona con qué frecuencia registras reúsos.'); return }
    if (motivaciones.length === 0) { setError('Elige al menos una motivación para usar la Calculadora de Reúso.'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `${nombre} ${apellido}`.trim(),
          email: email.trim().toLowerCase(),
          empresa: codigoNombreEmpresa || undefined,
          interes: 'Asesoría Personalizada - Registro',
          mensaje: `Registro con solicitud de asesoría personalizada. Teléfono: ${indicativo.dial} ${telefono}. Sector: ${sector}. Frecuencia: ${frecuencia}. Motivaciones: ${motivaciones.join(', ')}. Código de Empresa: ${codigoEmpresa || 'Ninguno'}.`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Error al enviar la solicitud.')
      }
      setExitoAsesoria(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar la solicitud. Intenta de nuevo.'
      setError(msg)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (exitoAsesoria) {
      const timer = setTimeout(() => {
        router.push('/login')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [exitoAsesoria, router])

  // ── Estilos compartidos ──────────────────────────────────────────────────────
  const inputBase = `
    w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all duration-200
    bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border)]
    placeholder-[var(--text-placeholder)]/50
    focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/20
  `

  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center font-sans"
      style={{ background: isDark ? '#474747' : '#FFFFFF', padding: '32px 16px', position: 'relative' }}
    >
      {/* ThemeToggle fijo esquina superior derecha */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="mb-6 flex items-center justify-center">
        <Image
          src="/logo-completo.svg"
          alt="Reúso"
          width={140}
          height={44}
          priority
          style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
        />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md backdrop-blur-xl animate-fade-in"
        style={{
          background: isDark ? '#474747' : '#FFFFFF',
          border: isDark ? '1px solid var(--border)' : '1px solid rgba(0, 130, 124, 0.12)',
          borderRadius: '2.5rem',
          boxShadow: '0 8px 40px rgba(0,130,124,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* ── Barra de progreso ─────────────────────────────────────────────── */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-brand)] font-semibold">
              <ShieldCheck size={14} />
              <span>Estás en un entorno seguro</span>
            </div>
            <span className="text-xs text-[var(--text-secondary)]/50 font-medium">Paso {paso} de 4</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{ background: n <= paso ? 'var(--color-brand)' : 'var(--border)' }}
              />
            ))}
          </div>
        </div>

        <div className="px-8 py-7">
          {exitoAsesoria ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 0', gap: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--color-brand-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-brand)'
              }}>
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>¡Solicitud recibida!</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Tus datos han sido registrados correctamente como contacto. Un asesor de la <strong>Calculadora de Reúso</strong> te contactará muy pronto para guiarte de forma personalizada.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-placeholder)', marginTop: 8, margin: 0 }}>
                Redirigiendo al inicio de sesión...
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <CircleNotch size={20} className="animate-spin" color="var(--color-brand)" />
              </div>
            </div>
          ) : (
            <>
              {/* ── Error global ─────────────────────────────────────────────────── */}
              {error && error !== 'verificando' && (
                error === 'Este correo ya tiene una cuenta. ¿Quieres ingresar?' ? (
                  <div style={{
                    background: 'rgba(255, 94, 75, 0.08)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-error-content)', fontWeight: 600 }}>
                      Este correo ya tiene una cuenta registrada en el sistema.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Link href="/login" style={{
                        flex: 1,
                        textAlign: 'center',
                        background: 'var(--color-brand)',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}>
                        Iniciar sesión
                      </Link>
                      <Link href="/recuperar" style={{
                        flex: 1,
                        textAlign: 'center',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        background: 'var(--bg-input)'
                      }}>
                        Recuperar clave
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-xl bg-[var(--color-error)]/8 border border-[var(--color-error)]/25 text-[var(--color-error-content)] text-sm">
                    <X size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )
              )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PASO 1 - Datos de contacto                                       */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {paso === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Crea tu cuenta</h1>
                <p className="text-sm text-[var(--text-secondary)]/80">Empieza a medir tu impacto ambiental.</p>
              </div>

              {/* Nombre */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">Nombres <span className="text-[#FF5E4B]">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="María Estefanía"
                    autoComplete="given-name"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {/* Apellido */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">
                  Apellido <span className="text-[#FF5E4B]">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                  <input
                    type="text"
                    value={apellido}
                    onChange={e => setApellido(e.target.value)}
                    placeholder="Pérez"
                    autoComplete="family-name"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {/* Apodo */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]/70">
                    Apodo
                  </label>
                  <span className="text-[10px] text-[var(--text-secondary)]/40">{apodo.length}/15</span>
                </div>
                <input
                  type="text"
                  value={apodo}
                  onChange={e => setApodo(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ.]/g, '').slice(0, 15))}
                  placeholder="¿Cómo te llamamos?"
                  autoComplete="nickname"
                  className={inputBase}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">Correo electrónico <span className="text-[#FF5E4B]">*</span></label>
                <div className="relative">
                  <EnvelopeSimple size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">
                  Teléfono <span className="text-[#FF5E4B]">*</span>
                </label>
                <div className="flex gap-2">
                  {/* Selector de país */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setMostrarPaises(v => !v); setBusquedaPais('') }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '14px 12px',
                        borderRadius: 16,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        minWidth: 90,
                      }}
                      className="transition-all"
                    >
                      <img
                        src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${indicativo.code}.svg`}
                        alt={indicativo.name}
                        width={20}
                        height={15}
                        style={{ borderRadius: 3, objectFit: 'cover' }}
                      />
                      <span className="text-xs font-semibold">{indicativo.dial}</span>
                      <CaretDown size={12} style={{ color: 'var(--text-placeholder)' }} />
                    </button>
                    {mostrarPaises && (
                      <div
                        style={{
                          maxHeight: 260,
                          display: 'flex',
                          flexDirection: 'column',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 16,
                          boxShadow: 'var(--shadow)',
                        }}
                        className="absolute top-full left-0 mt-1 z-50 min-w-[200px]"
                      >
                        <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid var(--border)' }}>
                          <input
                            autoFocus
                            type="text"
                            value={busquedaPais}
                            onChange={e => setBusquedaPais(e.target.value)}
                            placeholder="Buscar país..."
                            style={{
                              width: '100%',
                              padding: '6px 12px',
                              borderRadius: 12,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: 12,
                              outline: 'none',
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                          {PAISES.filter(p => normalizeStr(p.name).includes(normalizeStr(busquedaPais))).map(p => (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => { setIndicativo(p); setMostrarPaises(false); setBusquedaPais('') }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                              }}
                              className="hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <img
                                src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${p.code}.svg`}
                                alt={p.name}
                                width={18}
                                height={13}
                                style={{ borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
                              />
                              <span className="text-xs font-medium">{p.name}</span>
                              <span className="ml-auto text-xs text-[var(--text-secondary)]/50">{p.dial}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                    <input
                      type="tel"
                      value={telefono}
                      onChange={e => setTelefono(e.target.value.replace(/[^\d\s]/g, ''))}
                      placeholder="300 000 0000"
                      autoComplete="tel-national"
                      className={`${inputBase} pl-10`}
                    />
                  </div>
                </div>
              </div>

              {/* Código de empresa */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]/70">
                    Código de empresa
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setMostrarTooltip(true)}
                      onMouseLeave={() => setMostrarTooltip(false)}
                      className="w-4 h-4 rounded-full border border-[var(--color-brand)]/40 text-[var(--color-brand)]/60 flex items-center justify-center text-[10px] font-bold hover:border-[var(--color-brand)] transition-colors"
                    >
                      ?
                    </button>
                    {mostrarTooltip && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] text-xs rounded-xl px-3 py-2 w-56 shadow-lg">
                        Si tu empresa ya usa Calculadora de Reúso y te dio un código, ingrésalo aquí para vincularte automáticamente como empleado.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--bg-card)]" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <Buildings size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-brand)]/50" />
                  <input
                    type="text"
                    value={codigoEmpresa}
                    onChange={e => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                      setCodigoEmpresa(v)
                      setCodigoStatus('idle')
                      setCodigoNombreEmpresa('')
                    }}
                    onBlur={() => validarCodigo(codigoEmpresa)}
                    placeholder="ej. VERDE01"
                    className={`${inputBase} pl-10 pr-10 ${
                      codigoStatus === 'ok' ? 'border-[#38B98E] focus:border-[#38B98E]' :
                      codigoStatus === 'error' ? 'border-[#FF5E4B] focus:border-[#FF5E4B]' : ''
                    }`}
                  />
                  {codigoStatus === 'validando' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                  )}
                  {codigoStatus === 'ok' && (
                    <Check size={16} strokeWidth={2.5} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#38B98E]" />
                  )}
                  {codigoStatus === 'error' && (
                    <X size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FF5E4B]" />
                  )}
                </div>
                {codigoStatus === 'ok' && codigoNombreEmpresa && (
                  <p className="text-xs text-[#38B98E] font-semibold ml-1">Empresa encontrada: {codigoNombreEmpresa}</p>
                )}
                {codigoStatus === 'error' && (
                  <p className="text-xs text-[#FF5E4B] ml-1">Código no encontrado. Revisa con tu empresa.</p>
                )}
              </div>

              <button
                type="button"
                onClick={avanzarPaso1}
                disabled={verificandoEmail || !nombre.trim() || !apellido.trim() || !email.trim() || !telefono.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[var(--color-brand)] text-[var(--text-on-brand)] font-bold text-sm hover:opacity-90 active:scale-95 transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed hover-slide-r"
                style={{ boxShadow: '0 6px 20px var(--color-brand-light)' }}
              >
                {verificandoEmail
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...</>
                  : <>Siguiente <ArrowRight size={16} strokeWidth={2.5} /></>}
              </button>

              <p className="text-center text-xs text-[var(--text-secondary)]/50 mt-1">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-[var(--color-brand)] font-semibold hover:underline">Ingresa</Link>
              </p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PASO 2 - Tu perfil                                               */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {paso === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Cuéntanos sobre ti</h1>
                <p className="text-sm text-[var(--text-secondary)]/80">Personalizamos tu experiencia con estas respuestas.</p>
              </div>

              {/* Sector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">¿En qué sector trabajas? <span className="text-[#FF5E4B]">*</span></label>
                <input
                  type="text"
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  placeholder="Ej. Mobiliario de oficina"
                  className={inputBase}
                />
              </div>

              {/* Frecuencia */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">¿Con qué frecuencia reutilizas? <span className="text-[#FF5E4B]">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {FRECUENCIAS.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrecuencia(f)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        frecuencia === f
                          ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)] border-[var(--color-brand)]'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivación - selección múltiple */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">¿Cuáles son tus motivaciones? <span className="text-[#FF5E4B]">*</span> <span className="font-normal text-[var(--text-secondary)]/50">(elige todas las que apliquen)</span></label>
                <div className="flex flex-col gap-2">
                  {MOTIVACIONES.map(m => {
                    const activo = motivaciones.includes(m)
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMotivacion(m)}
                        className={`w-full px-4 py-2.5 rounded-2xl text-sm font-semibold border text-left transition-all ${
                          activo
                            ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] border-[var(--color-brand)]'
                            : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--color-brand)]/50'
                        }`}
                      >
                        {activo && <Check size={14} strokeWidth={2.5} className="inline mr-2" />}
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Asesoría personalizada */}
              <div
                className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all ${
                  quiereAsesoria
                    ? 'bg-[var(--color-brand-light)] border-[var(--color-brand)]'
                    : 'bg-[var(--bg-input)] border-[var(--border)] hover:border-[var(--color-brand)]/40'
                }`}
                onClick={() => setQuiereAsesoria(v => !v)}
              >
                <div className="flex items-center gap-3">
                  <Headset size={20} className={quiereAsesoria ? 'text-[var(--color-brand)]' : 'text-[var(--text-placeholder)]'} />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Asesoría personalizada</p>
                    <p className="text-xs text-[var(--text-secondary)]/60">Un experto te contactará directamente para guiarte de forma personalizada.</p>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${quiereAsesoria ? 'bg-[var(--color-brand)]' : 'bg-[var(--border)]'}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${quiereAsesoria ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => { setError(''); setPaso(1) }}
                  className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-[var(--border)] text-[var(--color-brand)] font-semibold text-sm hover:bg-[var(--bg-hover)] transition-all hover-pop hover-press"
                >
                  <ArrowLeft size={15} strokeWidth={2.5} /> Atrás
                </button>
                {quiereAsesoria ? (
                  <button
                    type="button"
                    onClick={handleSolicitarAsesoria}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[var(--color-brand)] text-[var(--text-on-brand)] font-bold text-sm hover:opacity-90 active:scale-95 transition-all mt-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ boxShadow: '0 6px 20px var(--color-brand-light)' }}
                  >
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</> : 'Solicitar asesoría'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={avanzarPaso2}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[var(--color-brand)] text-[var(--text-on-brand)] font-bold text-sm hover:opacity-90 active:scale-95 transition-all mt-0 disabled:opacity-60 disabled:cursor-not-allowed hover-slide-r"
                    style={{ boxShadow: '0 6px 20px var(--color-brand-light)' }}
                  >
                    Siguiente <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PASO 3 - Seguridad y confirmación                                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {paso === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Crea tu contraseña</h1>
                <p className="text-sm text-[var(--text-secondary)]/80">Elige una contraseña segura para proteger tu cuenta.</p>
              </div>

              {/* Contraseña */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                    autoComplete="new-password"
                    className={`${inputBase} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] hover:text-[var(--color-brand)] transition-colors hover-pop hover-press"
                  >
                    {showPwd ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Indicador de fortaleza + reglas */}
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: password ? fuerzaCfg.width : '0%', background: fuerzaCfg.color }}
                    />
                  </div>
                  {password && (
                    <span className="text-xs font-semibold" style={{ color: fuerzaCfg.color }}>{fuerzaCfg.label}</span>
                  )}
                  {/* Normas de contraseña destacadas */}
                  <div
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,130,124,0.03)',
                      border: '1px dashed var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 8,
                    }}
                    className="flex flex-col gap-2"
                  >
                    {[
                      { ok: password.length >= 8,   texto: 'Mínimo 8 caracteres' },
                      { ok: /[A-Z]/.test(password),  texto: 'Una letra mayúscula' },
                      { ok: /[0-9]/.test(password),  texto: 'Un número' },
                    ].map(({ ok, texto }) => (
                      <div key={texto} className="flex items-center gap-2">
                        {ok
                          ? <CheckCircle size={14} className="text-[#38B98E] flex-shrink-0" />
                          : <Circle size={14} className="text-secondary opacity-40 flex-shrink-0" />
                        }
                        <span className={`text-xs font-medium ${ok ? 'text-[#38B98E]' : 'text-secondary opacity-70'}`}>{texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]/70">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showPwdConf ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    className={`${inputBase} pr-11 ${
                      passwordConfirm && passwordConfirm !== password ? 'border-[#FF5E4B]' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwdConf(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)] hover:text-[var(--color-brand)] transition-colors hover-pop hover-press"
                  >
                    {showPwdConf ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordConfirm && (
                  <p className="text-xs ml-1" style={{ color: password === passwordConfirm ? '#38B98E' : '#FF5E4B' }}>
                    {password === passwordConfirm ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setError(''); setPaso(2) }}
                  className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-[var(--border)] text-[var(--color-brand)] font-semibold text-sm hover:bg-[var(--bg-hover)] transition-all hover-pop hover-press"
                >
                  <ArrowLeft size={15} strokeWidth={2.5} /> Atrás
                </button>
                <button
                  type="button"
                  onClick={avanzarPaso3}
                  disabled={!password || !passwordConfirm || password !== passwordConfirm || password.length < 8}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[var(--color-brand)] text-[var(--text-on-brand)] font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover-slide-r"
                  style={{ boxShadow: '0 6px 20px var(--color-brand-light)' }}
                >
                  Siguiente <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PASO 4 - Documentos legales                                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {paso === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Ya casi terminas</h1>
                <p className="text-sm text-[var(--text-secondary)]/80">Solo confirma que leíste los documentos y listo.</p>
              </div>

              {/* Documentos legales - patrón Bancolombia */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)]/70">
                  Revisa y acepta los documentos
                </p>

                <button
                  type="button"
                  onClick={() => setModalDoc('terminos')}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left w-full"
                  style={{
                    background: aceptoTerminos ? (isDark ? 'rgba(214,243,145,0.08)' : 'rgba(0,130,124,0.04)') : 'var(--bg-hover)',
                    borderColor: aceptoTerminos ? 'var(--color-brand)' : 'var(--border)',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} className="text-[var(--color-brand)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Términos y condiciones</p>
                    <p className="text-xs text-[var(--text-secondary)]/60 mt-0.5">Toca para ver qué aceptas</p>
                  </div>
                  {aceptoTerminos
                    ? <CheckCircle size={22} className="text-[var(--color-brand)] flex-shrink-0" />
                    : <CaretRight size={16} className="text-[var(--text-secondary)]/40 flex-shrink-0" />
                  }
                </button>

                <button
                  type="button"
                  onClick={() => setModalDoc('privacidad')}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left w-full"
                  style={{
                    background: aceptoPrivacidad ? (isDark ? 'rgba(214,243,145,0.08)' : 'rgba(0,130,124,0.04)') : 'var(--bg-hover)',
                    borderColor: aceptoPrivacidad ? 'var(--color-brand)' : 'var(--border)',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={18} className="text-[var(--color-brand)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Política de privacidad y datos</p>
                    <p className="text-xs text-[var(--text-secondary)]/60 mt-0.5">Toca para ver qué aceptas</p>
                  </div>
                  {aceptoPrivacidad
                    ? <CheckCircle size={22} className="text-[var(--color-brand)] flex-shrink-0" />
                    : <CaretRight size={16} className="text-[var(--text-secondary)]/40 flex-shrink-0" />
                  }
                </button>
              </div>

              {/* Checkbox newsletter */}
              <label
                className="flex items-start gap-2.5 cursor-pointer select-none group"
                onClick={() => setSuscritoNewsletter(v => !v)}
              >
                {suscritoNewsletter
                  ? <CheckSquare size={20} className="text-[var(--color-brand)] flex-shrink-0 mt-0.5" />
                  : <Square size={20} className="text-[var(--text-secondary)]/40 flex-shrink-0 mt-0.5 group-hover:text-[var(--color-brand)]/60 transition-colors" />
                }
                <span className="text-sm text-[var(--text-secondary)]/70 group-hover:text-[var(--text-primary)] transition-colors leading-snug">
                  Quiero recibir novedades sobre economía circular
                </span>
              </label>

              {/* Turnstile */}
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <div className="flex justify-center">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                    onSuccess={token => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken('')}
                    onError={() => setTurnstileToken('')}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setError(''); setPaso(3) }}
                  className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-[var(--border)] text-[var(--color-brand)] font-semibold text-sm hover:bg-[var(--bg-hover)] transition-all hover-pop hover-press"
                >
                  <ArrowLeft size={15} strokeWidth={2.5} /> Atrás
                </button>
                {(() => {
                  const formValido = !loading && aceptoTerminos && aceptoPrivacidad
                  return (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!formValido}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: formValido ? 'var(--color-brand)' : 'var(--border)',
                        color: 'var(--text-on-brand, #ffffff)',
                        cursor: formValido ? 'pointer' : 'not-allowed',
                        boxShadow: formValido ? '0 6px 20px var(--color-brand-light)' : 'none',
                      }}
                    >
                      {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                    </button>
                  )
                })()}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6, textAlign: 'center' }}>
        Grupo MLP ©{new Date().getFullYear()}. Todos los derechos reservados.
      </p>

      {/* Modal de documento - patrón Bancolombia */}
      {modalDoc && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(71,71,71,0.55)', backdropFilter: 'blur(8px)', zIndex: 2500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 24px' }}
          onClick={() => setModalDoc(null)}
        >
          <div
            style={{ background: isDark ? '#525252' : '#FFFFFF', borderRadius: '24px 24px 16px 16px', width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 -8px 40px rgba(0,0,0,0.20)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />

            {/* Título */}
            <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {modalDoc === 'terminos' ? 'Términos y condiciones' : 'Política de privacidad y datos'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6 }}>
                Al crear tu cuenta aceptas lo siguiente:
              </p>
            </div>

            {/* Puntos clave */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(modalDoc === 'terminos' ? PUNTOS_TERMINOS : PUNTOS_PRIVACIDAD).map((punto, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: isDark ? 'rgba(214,243,145,0.15)' : 'rgba(0,130,124,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Check size={11} strokeWidth={2.5} className="text-[var(--color-brand)]" />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{punto}</p>
                </div>
              ))}

              <a
                href={modalDoc === 'terminos' ? '/legal' : '/legal/datos'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                Leer documento completo
                <ArrowRight size={13} strokeWidth={2.5} />
              </a>
            </div>

            {/* Acciones */}
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setModalDoc(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 100, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modalDoc === 'terminos') setAceptoTerminos(true)
                  else setAceptoPrivacidad(true)
                  setModalDoc(null)
                }}
                style={{ flex: 2, padding: '12px', borderRadius: 100, background: 'var(--color-brand)', border: 'none', color: '#FFFFFF', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Entendido, acepto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
