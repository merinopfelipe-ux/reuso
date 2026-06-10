'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import {
  ShieldCheck, Eye, EyeSlash, Square, CheckSquare,
  Buildings, EnvelopeSimple, Phone, User, CaretDown,
  ArrowRight, ArrowLeft, X, Check, Headset,
} from '@phosphor-icons/react'

// ── Países para selector de indicativo ────────────────────────────────────────
const PAISES = [
  { code: 'co', name: 'Colombia',   dial: '+57'  },
  { code: 'mx', name: 'México',     dial: '+52'  },
  { code: 'ar', name: 'Argentina',  dial: '+54'  },
  { code: 'cl', name: 'Chile',      dial: '+56'  },
  { code: 'pe', name: 'Perú',       dial: '+51'  },
  { code: 'ec', name: 'Ecuador',    dial: '+593' },
  { code: 've', name: 'Venezuela',  dial: '+58'  },
  { code: 'es', name: 'España',     dial: '+34'  },
  { code: 'us', name: 'EE. UU.',    dial: '+1'   },
]

// ── Opciones de perfil ────────────────────────────────────────────────────────
const SECTORES = ['Mobiliario', 'Electrónicos', 'Ropa', 'Construcción', 'Otro']
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

// ── Componente ─────────────────────────────────────────────────────────────────
export default function RegistroPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<1 | 2 | 3>(1)

  // Paso 1
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [indicativo, setIndicativo] = useState(PAISES[0])
  const [telefono, setTelefono] = useState('')
  const [mostrarPaises, setMostrarPaises] = useState(false)
  const [codigoEmpresa, setCodigoEmpresa] = useState('')
  const [codigoStatus, setCodigoStatus] = useState<'idle' | 'validando' | 'ok' | 'error'>('idle')
  const [codigoNombreEmpresa, setCodigoNombreEmpresa] = useState('')
  const [mostrarTooltip, setMostrarTooltip] = useState(false)

  // Paso 2
  const [sector, setSector] = useState('')
  const [frecuencia, setFrecuencia] = useState('')
  const [motivacion, setMotivacion] = useState('')
  const [quiereAsesoria, setQuiereAsesoria] = useState(false)

  // Paso 3
  const [apodo, setApodo] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showPwdConf, setShowPwdConf] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaDatos, setAceptaDatos] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [modalTerminos, setModalTerminos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
  function avanzarPaso1() {
    if (!nombre.trim() || !email.trim()) {
      setError('Completa tu nombre y correo electrónico para continuar.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.')
      return
    }
    setError('')
    setPaso(2)
  }

  function avanzarPaso2() {
    if (!sector || !frecuencia || !motivacion) {
      setError('Selecciona una opción en cada pregunta para continuar.')
      return
    }
    setError('')
    setPaso(3)
  }

  // ── Envío final ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!aceptaTerminos || !aceptaDatos) {
      setError('Acepta los términos y el tratamiento de datos para continuar.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (fuerza < 2) {
      setError('La contraseña es muy débil. Usa mínimo 8 caracteres, una mayúscula y un número.')
      return
    }
    if (process.env.NEXT_PUBLIC_SKIP_TURNSTILE !== 'true' && !turnstileToken) {
      setError('Completa la verificación de seguridad.')
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
        motivacion,
        quiere_asesoria: quiereAsesoria,
        codigo_empresa: codigoStatus === 'ok' ? codigoEmpresa.trim().toUpperCase() : undefined,
        turnstile_token: turnstileToken || 'skip',
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Algo salió mal. Intenta de nuevo.')
      setLoading(false)
      return
    }
    router.push(`/confirmar-email?email=${encodeURIComponent(email)}`)
  }

  // ── Estilos compartidos ──────────────────────────────────────────────────────
  const inputBase = `
    w-full px-4 py-3.5 rounded-2xl border bg-white/70 text-[#474747] text-sm
    placeholder-[#474747]/30 outline-none transition-all duration-200
    focus:border-[#00827C] focus:bg-white focus:ring-1 focus:ring-[#00827C]/20
    border-[rgba(0,130,124,0.20)]
  `

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center font-sans"
      style={{ background: 'linear-gradient(145deg, #F8FBFA 0%, #EEF7F6 60%, #FFFFFF 100%)', padding: '32px 16px' }}
    >
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center">
        <Image src="/logo_gurpomlp.svg" alt="Reúso" width={120} height={40} priority />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.75)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: '2.5rem',
          boxShadow: '0 8px 40px rgba(0,130,124,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* ── Barra de progreso ─────────────────────────────────────────────── */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[#00827C] font-semibold">
              <ShieldCheck size={14} weight="duotone" />
              <span>Estás en un entorno seguro</span>
            </div>
            <span className="text-xs text-[#474747]/50 font-medium">Paso {paso} de 3</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{ background: n <= paso ? '#00827C' : 'rgba(0,130,124,0.12)' }}
              />
            ))}
          </div>
        </div>

        <div className="px-8 py-7">
          {/* ── Error global ─────────────────────────────────────────────────── */}
          {error && (
            <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-xl bg-[#FF5E4B]/8 border border-[#FF5E4B]/20 text-[#FF5E4B] text-sm">
              <X size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PASO 1 — Datos de contacto                                       */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {paso === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#474747] mb-1">Crea tu cuenta</h1>
                <p className="text-sm text-[#474747]/60">Empieza a medir tu impacto ambiental.</p>
              </div>

              {/* Nombre */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">Nombre</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00827C]/50" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {/* Apellido */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">
                  Apellido <span className="font-normal normal-case text-[#474747]/40">(opcional)</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00827C]/50" />
                  <input
                    type="text"
                    value={apellido}
                    onChange={e => setApellido(e.target.value)}
                    placeholder="Tu apellido"
                    autoComplete="family-name"
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">Correo electrónico</label>
                <div className="relative">
                  <EnvelopeSimple size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00827C]/50" />
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
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">
                  Teléfono <span className="font-normal normal-case text-[#474747]/40">(opcional)</span>
                </label>
                <div className="flex gap-2">
                  {/* Selector de país */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMostrarPaises(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-3.5 rounded-2xl border border-[rgba(0,130,124,0.20)] bg-white/70 hover:bg-white transition-all text-sm text-[#474747] min-w-[90px]"
                    >
                      <img
                        src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${indicativo.code}.svg`}
                        alt={indicativo.name}
                        width={20}
                        height={15}
                        style={{ borderRadius: 3, objectFit: 'cover' }}
                      />
                      <span className="text-xs font-semibold">{indicativo.dial}</span>
                      <CaretDown size={12} className="text-[#474747]/40" />
                    </button>
                    {mostrarPaises && (
                      <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[rgba(0,130,124,0.15)] rounded-2xl shadow-lg py-1 min-w-[160px]">
                        {PAISES.map(p => (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => { setIndicativo(p); setMostrarPaises(false) }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#474747] hover:bg-[#00827C]/8 transition-colors"
                          >
                            <img
                              src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${p.code}.svg`}
                              alt={p.name}
                              width={18}
                              height={13}
                              style={{ borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
                            />
                            <span className="text-xs font-medium">{p.name}</span>
                            <span className="ml-auto text-xs text-[#474747]/50">{p.dial}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00827C]/50" />
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
                  <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">
                    Código de empresa <span className="font-normal normal-case text-[#474747]/40">(opcional)</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setMostrarTooltip(true)}
                      onMouseLeave={() => setMostrarTooltip(false)}
                      className="w-4 h-4 rounded-full border border-[#00827C]/40 text-[#00827C]/60 flex items-center justify-center text-[10px] font-bold hover:border-[#00827C] transition-colors"
                    >
                      ?
                    </button>
                    {mostrarTooltip && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-[#474747] text-white text-xs rounded-xl px-3 py-2 w-56 shadow-lg">
                        Si tu empresa ya usa Reúso y te dio un código, ingrésalo aquí para vincularte automáticamente como empleado.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#474747]" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <Buildings size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00827C]/50" />
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
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#00827C] border-t-transparent rounded-full animate-spin" />
                  )}
                  {codigoStatus === 'ok' && (
                    <Check size={16} weight="bold" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#38B98E]" />
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
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#00827C] text-white font-bold text-sm hover:bg-[#006B66] active:scale-95 transition-all mt-2"
                style={{ boxShadow: '0 6px 20px rgba(0,130,124,0.25)' }}
              >
                Siguiente <ArrowRight size={16} weight="bold" />
              </button>

              <p className="text-center text-xs text-[#474747]/50 mt-1">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-[#00827C] font-semibold hover:underline">Ingresa</Link>
              </p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PASO 2 — Tu perfil                                               */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {paso === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#474747] mb-1">Cuéntanos sobre ti</h1>
                <p className="text-sm text-[#474747]/60">Personalizamos tu experiencia con estas respuestas.</p>
              </div>

              {/* Sector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">¿En qué sector trabajas?</label>
                <div className="flex flex-wrap gap-2">
                  {SECTORES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSector(s)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        sector === s
                          ? 'bg-[#00827C] text-white border-[#00827C]'
                          : 'bg-white text-[#474747]/70 border-[rgba(0,130,124,0.20)] hover:border-[#00827C] hover:text-[#00827C]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frecuencia */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">¿Con qué frecuencia reutilizas?</label>
                <div className="flex flex-wrap gap-2">
                  {FRECUENCIAS.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrecuencia(f)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        frecuencia === f
                          ? 'bg-[#00827C] text-white border-[#00827C]'
                          : 'bg-white text-[#474747]/70 border-[rgba(0,130,124,0.20)] hover:border-[#00827C] hover:text-[#00827C]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivación */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">¿Cuál es tu principal motivación?</label>
                <div className="flex flex-col gap-2">
                  {MOTIVACIONES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMotivacion(m)}
                      className={`w-full px-4 py-2.5 rounded-2xl text-sm font-semibold border text-left transition-all ${
                        motivacion === m
                          ? 'bg-[#00827C]/10 text-[#00827C] border-[#00827C]'
                          : 'bg-white text-[#474747]/70 border-[rgba(0,130,124,0.15)] hover:border-[#00827C]/50'
                      }`}
                    >
                      {motivacion === m && <Check size={14} weight="bold" className="inline mr-2" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asesoría personalizada */}
              <div
                className={`flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all ${
                  quiereAsesoria
                    ? 'bg-[#00827C]/8 border-[#00827C]'
                    : 'bg-white border-[rgba(0,130,124,0.15)] hover:border-[#00827C]/40'
                }`}
                onClick={() => setQuiereAsesoria(v => !v)}
              >
                <div className="flex items-center gap-3">
                  <Headset size={20} weight="duotone" className={quiereAsesoria ? 'text-[#00827C]' : 'text-[#474747]/40'} />
                  <div>
                    <p className="text-sm font-semibold text-[#474747]">Asesoría personalizada</p>
                    <p className="text-xs text-[#474747]/50">Un experto te guía en tu proceso de reúso</p>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${quiereAsesoria ? 'bg-[#00827C]' : 'bg-[#474747]/15'}`}
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
                  className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-[rgba(0,130,124,0.25)] text-[#00827C] font-semibold text-sm hover:bg-[#00827C]/8 transition-all"
                >
                  <ArrowLeft size={15} weight="bold" /> Atrás
                </button>
                <button
                  type="button"
                  onClick={avanzarPaso2}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#00827C] text-white font-bold text-sm hover:bg-[#006B66] active:scale-95 transition-all"
                  style={{ boxShadow: '0 6px 20px rgba(0,130,124,0.25)' }}
                >
                  Siguiente <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PASO 3 — Seguridad y confirmación                                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {paso === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#474747] mb-1">Crea tu contraseña</h1>
                <p className="text-sm text-[#474747]/60">Elige una contraseña segura para proteger tu cuenta.</p>
              </div>

              {/* Apodo (opcional) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">
                    Apodo <span className="font-normal normal-case text-[#474747]/40">(opcional)</span>
                  </label>
                  <span className="text-[10px] text-[#474747]/40">{apodo.length}/15</span>
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

              {/* Contraseña */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">Contraseña</label>
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474747]/40 hover:text-[#00827C] transition-colors"
                  >
                    {showPwd ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Indicador de fortaleza */}
                {password && (
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 bg-[rgba(0,130,124,0.10)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: fuerzaCfg.width, background: fuerzaCfg.color }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold" style={{ color: fuerzaCfg.color }}>{fuerzaCfg.label}</span>
                      <span className="text-[#474747]/40">Mín. 8 chars · una mayúscula · un número</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#474747]/70 uppercase tracking-wide">Confirmar contraseña</label>
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#474747]/40 hover:text-[#00827C] transition-colors"
                  >
                    {showPwdConf ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordConfirm && passwordConfirm !== password && (
                  <p className="text-xs text-[#FF5E4B] ml-1">Las contraseñas no coinciden.</p>
                )}
              </div>

              {/* Checkbox Términos */}
              <label
                className="flex items-start gap-2.5 cursor-pointer select-none group"
                onClick={() => {
                  if (!aceptaTerminos) setModalTerminos(true)
                  else setAceptaTerminos(false)
                }}
              >
                {aceptaTerminos
                  ? <CheckSquare size={20} weight="duotone" className="text-[#00827C] flex-shrink-0 mt-0.5" />
                  : <Square size={20} weight="regular" className="text-[#474747]/40 flex-shrink-0 mt-0.5 group-hover:text-[#00827C]/60 transition-colors" />
                }
                <span className="text-sm text-[#474747]/70 group-hover:text-[#474747] transition-colors leading-snug">
                  He leído y acepto los{' '}
                  <span
                    className="text-[#00827C] font-semibold hover:underline"
                    onClick={e => { e.stopPropagation(); window.open('/legal', '_blank') }}
                  >
                    términos, privacidad y condiciones legales
                  </span>
                </span>
              </label>

              {/* Checkbox Tratamiento de datos */}
              <label
                className="flex items-start gap-2.5 cursor-pointer select-none group"
                onClick={() => setAceptaDatos(v => !v)}
              >
                {aceptaDatos
                  ? <CheckSquare size={20} weight="duotone" className="text-[#00827C] flex-shrink-0 mt-0.5" />
                  : <Square size={20} weight="regular" className="text-[#474747]/40 flex-shrink-0 mt-0.5 group-hover:text-[#00827C]/60 transition-colors" />
                }
                <span className="text-sm text-[#474747]/70 group-hover:text-[#474747] transition-colors leading-snug">
                  Acepto el tratamiento de mis datos personales según la{' '}
                  <span
                    className="text-[#00827C] font-semibold hover:underline"
                    onClick={e => { e.stopPropagation(); window.open('/legal/datos', '_blank') }}
                  >
                    política de datos
                  </span>
                </span>
              </label>

              {/* Turnstile */}
              <div className="flex justify-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={token => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken('')}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setError(''); setPaso(2) }}
                  className="flex items-center gap-1.5 px-5 py-3.5 rounded-full border border-[rgba(0,130,124,0.25)] text-[#00827C] font-semibold text-sm hover:bg-[#00827C]/8 transition-all"
                >
                  <ArrowLeft size={15} weight="bold" /> Atrás
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: loading ? '#4D7C79' : '#00827C',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 6px 20px rgba(0,130,124,0.25)',
                  }}
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de términos y condiciones ───────────────────────────────────── */}
      {modalTerminos && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModalTerminos(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-5 text-center"
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            <div className="w-14 h-14 rounded-full bg-[#00827C]/10 flex items-center justify-center">
              <ShieldCheck size={28} weight="duotone" className="text-[#00827C]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#474747] mb-1">Términos y condiciones</h3>
              <p className="text-sm text-[#474747]/60 leading-relaxed">
                ¿Confirmas que has leído y aceptas los{' '}
                <Link href="/legal" target="_blank" className="text-[#00827C] font-semibold hover:underline">
                  términos de uso, privacidad y condiciones legales
                </Link>{' '}
                de la Calculadora de Reúso?
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => { setAceptaTerminos(true); setModalTerminos(false) }}
                className="w-full py-3 rounded-full bg-[#00827C] text-white font-bold text-sm hover:bg-[#006B66] transition-all"
                style={{ boxShadow: '0 4px 12px rgba(0,130,124,0.20)' }}
              >
                Acepto los términos
              </button>
              <button
                type="button"
                onClick={() => {
                  setAceptaTerminos(false)
                  setModalTerminos(false)
                  router.push('/')
                }}
                className="w-full py-3 rounded-full border border-[rgba(0,130,124,0.20)] text-[#474747]/60 font-semibold text-sm hover:bg-[#f5f5f5] transition-all"
              >
                No acepto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
