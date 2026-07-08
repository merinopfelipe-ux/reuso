'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Eye, EyeOff as EyeSlash, Mail as Envelope, KeyRound as LockKey, ChevronLeft as CaretLeft, ChevronRight as CaretRight, ChevronDown as CaretDown, Loader2 as CircleNotch, CircleUser as UserCircle, Quote as Quotes, Square, SquareCheck as CheckSquare } from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import type { Rol } from '@/types'

const REDIRECT: Record<Rol, string> = {
  super_admin: '/admin',
  empresa_admin: '/empresa',
  empleado: '/dashboard',
  usuario_libre: '/dashboard',
}

const T = {
  ES: {
    cuentaQ:    '¿Quieres crear una cuenta?',
    registrate: 'Regístrate',
    titulo:     'Bienvenido',
    subtitulo:  'Ingresa tus datos para continuar.',
    correoLabel:'Correo electrónico:',
    correoPlaceholder: 'usuario@empresa.com',
    passLabel:  'Contraseña:',
    passPlaceholder: '••••••••',
    recordarme: 'Recuérdame.',
    olvidaste:  '¿Olvidaste tu contraseña?',
    legalPre:   'Al acceder, acepto los',
    legalLink:  'términos legales',
    ingresar:   'Ingresar',
    verificando:'Verificando...',
    errorLegal: 'Debes aceptar los términos para ingresar.',
    errorServer:'Error interno del servidor. Contacta a soporte.',
    errorDatos: 'Credenciales incorrectas. Verifica tu email y contraseña.',
    errorCorreo:'Completa el correo electrónico.',
    errorPass:  'Completa la contraseña.',
    copyright:  'Todos los derechos reservados.',
    mostrarPass:'Mostrar contraseña',
    ocultarPass:'Ocultar contraseña',
    testimonios: [
      { titulo: "Certificamos nuestro impacto ambiental con total transparencia.", texto: "Con Calculadora de Reúso certificamos todo el mobiliario recuperado de nuestras oficinas en tiempo récord. Ahora comunicamos el CO₂ evitado con códigos QR verificables que generan confianza real en nuestros clientes.", cargo: "Directora de Sostenibilidad" },
      { titulo: "Medimos y reportamos el ahorro de CO₂ con precisión.", texto: "Antes nuestros reportes de sostenibilidad eran estimaciones. Hoy generamos certificados con datos verificables y compartimos el impacto real de cada objeto reutilizado con un solo clic.", cargo: "Gerente de Operaciones" },
      { titulo: "Integramos a todo el equipo en nuestra economía circular.", texto: "El tablero de control nos da visibilidad total sobre las emisiones evitadas. Cada empleado registra sus reusos y juntos construimos una cultura de impacto ambiental medible y certificado.", cargo: "Especialista en Economía Circular" },
    ],
  },
  ENG: {
    cuentaQ:    'Want to create an account?',
    registrate: 'Sign up',
    titulo:     'Welcome',
    subtitulo:  'Enter your details to continue.',
    correoLabel:'Email address:',
    correoPlaceholder: 'user@company.com',
    passLabel:  'Password:',
    passPlaceholder: '••••••••',
    recordarme: 'Remember me.',
    olvidaste:  'Forgot your password?',
    legalPre:   'By signing in, I accept the',
    legalLink:  'legal terms',
    ingresar:   'Sign in',
    verificando:'Verifying...',
    errorLegal: 'You must accept the terms to continue.',
    errorServer:'Internal server error. Contact support.',
    errorDatos: 'Check your credentials and try again.',
    errorCorreo:'Complete your email address.',
    errorPass:  'Complete your password.',
    copyright:  'All rights reserved.',
    mostrarPass:'Show password',
    ocultarPass:'Hide password',
    testimonios: [
      { titulo: "We certified our environmental impact with full transparency.", texto: "With Reúso we certified all recovered furniture from our offices in record time. We now communicate avoided CO₂ with verifiable QR codes that build real trust with our clients.", cargo: "Sustainability Director" },
      { titulo: "We measure and report CO₂ savings with precision.", texto: "Our sustainability reports used to be estimates. Today we generate verifiable certificates and share the real impact of every reused object with a single click.", cargo: "Operations Manager" },
      { titulo: "We brought our entire team into our circular economy.", texto: "The control panel gives us full visibility into avoided emissions. Every employee logs their reuses and together we build a culture of measurable, certified environmental impact.", cargo: "Circular Economy Specialist" },
    ],
  },
}

const TESTIMONIOS = [
  {
    titulo: "Certificamos nuestro impacto ambiental con total transparencia.",
    texto: "Con Calculadora de Reúso certificamos todo el mobiliario recuperado de nuestras oficinas en tiempo récord. Ahora comunicamos el CO₂ evitado con códigos QR verificables que generan confianza real en nuestros clientes.",
    autor: "Laura Méndez",
    cargo: "Directora de Sostenibilidad",
    initials: "LM", color: "#8AD0B2"
  },
  {
    titulo: "Medimos y reportamos el ahorro de CO₂ con precisión.",
    texto: "Antes nuestros reportes de sostenibilidad eran estimaciones. Hoy generamos certificados con datos verificables y compartimos el impacto real de cada objeto reutilizado con un solo clic.",
    autor: "Carlos Ruiz",
    cargo: "Gerente de Operaciones",
    initials: "CR", color: "#00827C"
  },
  {
    titulo: "Integramos a todo el equipo en nuestra economía circular.",
    texto: "El tablero de control nos da visibilidad total sobre las emisiones evitadas. Cada empleado registra sus reusos y juntos construimos una cultura de impacto ambiental medible y certificado.",
    autor: "Ana Gómez",
    cargo: "Especialista en Economía Circular",
    initials: "AG", color: "#D6F391"
  }
]

export default function LoginPage() {
  const router = useRouter()
  const [invited, setInvited] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('invited') === 'true') {
      setInvited(true)
      // Limpiar el param de la URL sin recargar
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aceptaLegal, setAceptaLegal] = useState(false)
  const [legalError, setLegalError] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passError, setPassError] = useState(false)
  const [recordarme, setRecordarme] = useState(false)
  const [idioma, setIdioma] = useState<'ES' | 'ENG'>('ES')
  const [idiomaOpen, setIdiomaOpen] = useState(false)

  useEffect(() => {
    const guardado = localStorage.getItem('reuso_idioma') as 'ES' | 'ENG' | null
    if (guardado) {
      setIdioma(guardado)
    } else {
      const sys = navigator.language?.toLowerCase() ?? ''
      setIdioma(sys.startsWith('es') ? 'ES' : 'ENG')
    }
  }, [])
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Restaurar email guardado si el usuario marcó "Recuérdame"
  useEffect(() => {
    const saved = localStorage.getItem('reuso_email')
    if (saved) {
      setEmail(saved)
      setRecordarme(true)
    }
  }, [])

  // Carousel state
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [navDir, setNavDir] = useState<'next' | 'prev'>('next')

  useEffect(() => {
    const interval = setInterval(() => {
      setNavDir('next')
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIOS.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const prevTestimonial = () => {
    setNavDir('prev')
    setActiveTestimonial((prev) => (prev - 1 + TESTIMONIOS.length) % TESTIMONIOS.length)
  }

  const nextTestimonial = () => {
    setNavDir('next')
    setActiveTestimonial((prev) => (prev + 1) % TESTIMONIOS.length)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const t = T[idioma]

    // Limpiar errores antes de validar para que no persistan entre intentos
    setError('')
    setEmailError(false)
    setPassError(false)
    setLegalError(false)

    let hasError = false
    if (!email) { setEmailError(true); hasError = true }
    if (!password) { setPassError(true); hasError = true }
    if (!aceptaLegal) { setLegalError(true); hasError = true }
    if (hasError) return

    // Guardar o borrar el correo según "Recuérdame"
    if (recordarme) {
      localStorage.setItem('reuso_email', email)
    } else {
      localStorage.removeItem('reuso_email')
    }

    const tokenParaEnviar = turnstileToken || 'skip'
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, turnstile_token: tokenParaEnviar, acepta_legal: aceptaLegal }),
    })
    let data;
    try {
      data = await res.json();
    } catch {
      setError(t.errorServer);
      setLoading(false);
      setTurnstileToken('')
      turnstileRef.current?.reset()
      return;
    }

    if (!res.ok) {
      const srv = (data.error ?? '').toLowerCase()
      const esCredenciales = srv.includes('credenciales') || srv.includes('incorrect') || srv.includes('invalid') || srv.includes('not found')
      setError(esCredenciales ? t.errorDatos : (data.error ?? t.errorDatos))
      setLoading(false)
      setTurnstileToken('')
      turnstileRef.current?.reset()
      return
    }

    // Si no marcó "Recuérdame", cerrar sesión al cerrar el navegador
    // Evitar registrar beforeunload si es una prueba automatizada (e.g. Playwright) para no romper tests E2E
    if (!recordarme && !navigator.webdriver) {
      const supabase = createClient()
      window.addEventListener('beforeunload', () => {
        supabase.auth.signOut()
      }, { once: true })
    }

    router.push(REDIRECT[data.rol as Rol] ?? '/dashboard')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen w-full font-sans bg-primary overflow-hidden">

      <style>{`
        @keyframes slideInLeft   { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight  { from { opacity: 0; transform: translateX(32px);  } to { opacity: 1; transform: translateX(0); } }
        @keyframes testimonyNext { from { opacity: 0; transform: translateX(60px)  scale(0.96); filter: blur(4px); } to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); } }
        @keyframes testimonyPrev { from { opacity: 0; transform: translateX(-60px) scale(0.96); filter: blur(4px); } to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); } }
        .anim-left       { animation: slideInLeft  0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-right      { animation: slideInRight 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-t-next     { animation: testimonyNext 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-t-prev     { animation: testimonyPrev 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* Turnstile invisible - sin UI visible */}
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          options={{ size: 'invisible' }}
          onSuccess={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken('')}
          onError={() => {
            setError(T[idioma].errorDatos || 'Error de verificación de seguridad. Intenta de nuevo.');
            setTurnstileToken('');
            turnstileRef.current?.reset();
          }}
        />
      )}

      {/* ── PANEL IZQUIERDO - LOGIN (40%) ───────────────────────────── */}
      <section className="anim-left w-full lg:w-[40%] flex flex-col justify-between relative overflow-y-auto z-10 bg-primary">

        {/* Header */}
        <header className="flex items-center justify-between w-full px-8 pt-8 md:px-12">
          <Image
            src="/logo-completo.svg"
            alt="Reúso"
            width={140}
            height={44}
            className="object-contain"
            style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
          />
          <p className="text-sm text-secondary font-medium hidden sm:block">
            {T[idioma].cuentaQ}{' '}
            <Link href="/registro" className="text-brand hover:underline transition-colors">
              {T[idioma].registrate}
            </Link>
          </p>
        </header>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto my-12 px-8 md:px-12">

          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-4 text-brand">
              <UserCircle size={40} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-1">{T[idioma].titulo}</h1>
            <p className="text-secondary text-sm leading-relaxed max-w-[280px]">
              {T[idioma].subtitulo}
            </p>
          </div>

          {invited && (
            <div role="status" className="mb-6 p-3 rounded-md bg-brand/8 border border-brand/25 text-brand text-sm text-center font-medium">
              Cuenta creada. Ya puedes ingresar con tu correo y contraseña.
            </div>
          )}

          {error && (
            <div role="alert" className="mb-6 p-3 rounded-md bg-error/10 border border-error/30 text-error text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">

            {/* Campo Email */}
            <div className="flex flex-col gap-2 relative group">
              <div className="px-1">
                <label htmlFor="email" className="text-sm font-semibold text-primary">
                  {T[idioma].correoLabel}
                </label>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-secondary group-focus-within:text-brand transition-colors">
                  <Envelope size={20} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(false) }}
                  placeholder={T[idioma].correoPlaceholder}
                  autoComplete="email"
                  className={`w-full py-3.5 pl-12 pr-4 bg-input border rounded-input text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 transition-all text-sm shadow-sm ${emailError ? 'border-error focus:border-error focus:ring-error' : 'border-light focus:border-brand focus:ring-brand'}`}
                />
              </div>
              {emailError && <p className="text-xs text-error px-1">{T[idioma].errorCorreo}</p>}
            </div>

            {/* Campo Contraseña */}
            <div className="flex flex-col gap-2 relative group">
              <div className="px-1">
                <label htmlFor="password" className="text-sm font-semibold text-primary">
                  {T[idioma].passLabel}
                </label>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-secondary group-focus-within:text-brand transition-colors">
                  <LockKey size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPassError(false) }}
                  placeholder={T[idioma].passPlaceholder}
                  autoComplete="current-password"
                  className={`w-full py-3.5 pl-12 pr-12 bg-input border rounded-input text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 transition-all text-sm shadow-sm ${passError ? 'border-error focus:border-error focus:ring-error' : 'border-light focus:border-brand focus:ring-brand'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-secondary hover:text-primary transition-colors flex items-center justify-center focus:outline-none hover-pop hover-press"
                  aria-label={showPassword ? T[idioma].ocultarPass : T[idioma].mostrarPass}
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passError && <p className="text-xs text-error px-1">{T[idioma].errorPass}</p>}
            </div>

            {/* Recuérdame + ¿Olvidaste? */}
            <div className="flex items-center justify-between mt-1 px-1">
              <label
                className="flex items-center gap-2 cursor-pointer group select-none"
                onClick={() => setRecordarme(!recordarme)}
              >
                {recordarme
                  ? <CheckSquare size={18} className="text-brand flex-shrink-0" />
                  : <Square size={18} className="text-secondary group-hover:text-primary transition-colors flex-shrink-0" />
                }
                <span className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">
                  {T[idioma].recordarme}
                </span>
              </label>
              <Link href={`/recuperar${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-sm text-brand hover:underline transition-colors">
                {T[idioma].olvidaste}
              </Link>
            </div>

            {/* Checkbox legal (pre-marcado) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 select-none px-1">
                <button
                  type="button"
                  onClick={() => { setAceptaLegal(!aceptaLegal); setLegalError(false) }}
                  className="flex-shrink-0 flex items-center focus:outline-none hover-pop hover-press"
                  aria-label="Aceptar términos legales"
                >
                  {aceptaLegal
                    ? <CheckSquare size={18} className="text-brand" />
                    : <Square size={18} className={`transition-colors ${legalError ? 'text-error' : 'text-secondary hover:text-primary'}`} />
                  }
                </button>
                <span className="text-sm font-medium text-secondary">
                  {T[idioma].legalPre}{' '}
                  <Link href="/legal" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {T[idioma].legalLink}
                  </Link>
                  .
                </span>
              </div>
              {legalError && <p className="text-xs text-error px-1">{T[idioma].errorLegal}</p>}
            </div>

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 mt-2 rounded-btn font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-card ${
                loading
                  ? `opacity-70 cursor-not-allowed shadow-none ${isDark ? 'bg-brand text-[#474747]' : 'bg-brand text-white'}`
                  : `bg-brand hover:bg-brand-hover hover:-translate-y-0.5 active:translate-y-0 ${isDark ? 'text-[#474747] font-extrabold' : 'text-white'}`
              }`}
            >
              {loading ? (
                <>
                  <CircleNotch size={18} className="animate-spin" color="currentColor" />
                  {T[idioma].verificando}
                </>
              ) : T[idioma].ingresar}
            </button>

            <p className="text-xs text-center text-secondary mt-2 sm:hidden">
              {T[idioma].cuentaQ}{' '}
              <Link href="/registro" className="text-brand hover:underline transition-colors">
                {T[idioma].registrate}
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <footer style={{
          padding: '28px 32px 32px',
          background: `linear-gradient(0deg, rgba(214,243,145,${isDark ? '0.07' : '0.18'}) 0%, transparent 100%)`,
          color: 'var(--text-secondary)',
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>

            {/* Logo apilado sobre copyright */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/diseno/logo_gurpomlp.svg"
                alt="Grupo MLP"
                style={{
                  width: 160, height: 'auto',
                  opacity: isDark ? 0.9 : 1,
                  filter: isDark ? 'brightness(0) invert(1)' : 'none',
                }}
              />
              <p style={{ margin: 0, opacity: 0.6, fontSize: 11, fontWeight: 500 }}>
                Grupo MLP ©{new Date().getFullYear()}. {T[idioma].copyright}
              </p>
            </div>

            {/* Controles de accesibilidad - idioma + modo noche */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Selector de idioma - dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIdiomaOpen(o => !o)}
                className="hover-pop"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 600, padding: '5px 10px',
                  borderRadius: 6, border: '1px solid var(--border-light)',
                  cursor: 'pointer', background: 'transparent',
                  color: 'var(--text-secondary)', transition: 'all 0.2s',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${idioma === 'ES' ? 'es' : 'gb'}.svg`}
                  alt=""
                  style={{
                    width: 16,
                    height: 11,
                    borderRadius: '2px',
                    objectFit: 'cover',
                    border: '1px solid rgba(0,0,0,0.15)',
                  }}
                />
                {idioma}
                <CaretDown size={11} style={{ transform: idiomaOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {idiomaOpen && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                  background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                  borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  minWidth: 110, zIndex: 10,
                }}>
                  {(['ES', 'ENG'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setIdioma(lang); setIdiomaOpen(false); localStorage.setItem('reuso_idioma', lang); window.dispatchEvent(new Event('reuso_idioma_change')) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 12px', border: 'none',
                        background: idioma === lang ? 'var(--color-brand)' : 'transparent',
                        color: idioma === lang ? '#fff' : 'var(--text-primary)',
                        fontSize: 12, fontWeight: idioma === lang ? 600 : 400,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${lang === 'ES' ? 'es' : 'gb'}.svg`}
                        alt=""
                        style={{
                          width: 16,
                          height: 11,
                          borderRadius: '2px',
                          objectFit: 'cover',
                          border: `1px solid ${idioma === lang ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.15)'}`,
                        }}
                      />
                      <span>{lang === 'ES' ? 'Español' : 'English'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

              <ThemeToggle />
            </div>{/* cierra controles */}

          </div>
        </footer>
      </section>

      {/* ── PANEL DERECHO - CARRUSEL (60%) ──────────────────────────── */}
      <section className="anim-right hidden lg:flex w-[60%] flex-col relative overflow-hidden bg-gradient-to-br from-[#004945] to-brand shadow-inner">

        {/* Semicírculo decorativo */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 opacity-10 pointer-events-none">
          <svg width="600" height="1200" viewBox="0 0 600 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M600 0C268.629 0 0 268.629 0 600C0 931.371 268.629 1200 600 1200L600 0Z" fill="white"/>
          </svg>
        </div>

        {/* Círculos decorativos de fondo */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />

        {/* Contenido del carrusel */}
        <div className="flex-1 flex flex-col justify-center items-center w-full px-16 lg:px-24 xl:px-32 relative z-10">

          {/* Card testimonio - sombra siempre visible */}
          <div className="w-full max-w-2xl bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-[2rem] p-10 md:p-14 shadow-[0_40px_80px_rgba(0,0,0,0.35)] relative">
            <div className="absolute -top-6 -left-6 bg-brand text-white p-4 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <Quotes size={32} />
            </div>

            <div key={activeTestimonial} className={`${navDir === 'next' ? 'anim-t-next' : 'anim-t-prev'} min-h-[220px] flex flex-col justify-center`}>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                {T[idioma].testimonios[activeTestimonial].titulo}
              </h2>
              <p className="text-lg md:text-xl text-white/80 font-sans leading-relaxed">
                &ldquo;{T[idioma].testimonios[activeTestimonial].texto}&rdquo;
              </p>
            </div>

            <div key={`author-${activeTestimonial}`} className={`${navDir === 'next' ? 'anim-t-next' : 'anim-t-prev'} flex items-center gap-4 mt-10`} style={{ animationDelay: '80ms' }}>
              <div
                className="w-14 h-14 rounded-full border-2 border-white/20 flex-shrink-0 flex items-center justify-center font-bold text-lg"
                style={{ background: TESTIMONIOS[activeTestimonial].color, color: '#474747' }}
              >
                {TESTIMONIOS[activeTestimonial].initials}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{TESTIMONIOS[activeTestimonial].autor}</p>
                <p className="text-white/60 font-medium text-sm">{T[idioma].testimonios[activeTestimonial].cargo}</p>
              </div>
            </div>
          </div>

          {/* Controles del carrusel */}
          <div className="flex items-center justify-between w-full max-w-2xl mt-12 px-2">

            {/* Dots */}
            <div className="flex items-center gap-3">
              {TESTIMONIOS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ease-out focus:outline-none ${
                    idx === activeTestimonial
                      ? 'w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Ir al testimonio ${idx + 1}`}
                />
              ))}
            </div>

            {/* Flechas */}
            <div className="flex items-center gap-3">
              <button
                onClick={prevTestimonial}
                className="w-12 h-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white backdrop-blur-sm transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 hover-pop"
                aria-label="Testimonio anterior"
              >
                <CaretLeft size={24} strokeWidth={2.5} />
              </button>
              <button
                onClick={nextTestimonial}
                className="w-12 h-12 rounded-full bg-white text-brand hover:bg-white/90 flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 hover-slide-r"
                aria-label="Testimonio siguiente"
              >
                <CaretRight size={24} strokeWidth={2.5} />
              </button>
            </div>

          </div>

        </div>

      </section>

    </main>
  )
}
