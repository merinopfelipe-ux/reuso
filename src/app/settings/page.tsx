'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Monitor, ArrowLeft, Check, Bell, CircleHelp as Question, Save as FloppyDisk, LockKeyhole as LockSimple } from '@/components/ui/icons'
import { useToast } from '@/components/toast-provider'
import { OTPInput } from '@/components/otp-input'
import { PageSubmenu } from '@/components/page-submenu'

type Tema = 'light' | 'dark' | 'system'

const AVATAR_COLORS = [
  { hex: '#D6F391', label: 'Pistacho' },
  { hex: '#8AD0B2', label: 'Menta' },
  { hex: '#AD7C43', label: 'Nogal' },
  { hex: '#F3BBD3', label: 'Rosa' },
]

function applyTheme(tema: Tema) {
  if (tema === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', tema)
  }
  localStorage.setItem('theme', tema)
}

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [apodo, setApodo] = useState('')
  const [usarPrimerNombre, setUsarPrimerNombre] = useState(false)
  const [emailMasked, setEmailMasked] = useState('')
  const [telefonoMasked, setTelefonoMasked] = useState<string | null>(null)
  const [rol, setRol] = useState('')
  const [avatarColor, setAvatarColor] = useState('#D6F391')
  const [avatarText, setAvatarText] = useState('')
  const [notificaciones, setNotificaciones] = useState({
    impacto_critico: true,
    nuevos_certificados: true,
    resumen_mensual: true,
    canal_preferido: 'todos',
    soporte_respuestas: true,
    eco_night_mode: false,
  })
  const [tema, setTema] = useState<Tema>('system')
  const [isDark, setIsDark] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [activeHash, setActiveHash] = useState('')
  const [saved, setSaved] = useState(false)

  // Estados para campos sensibles (email / teléfono)
  const [unlockField, setUnlockField] = useState<'email' | 'phone' | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [newSensitiveValue, setNewSensitiveValue] = useState('')
  const [unlockLoading, setUnlockLoading] = useState(false)

  // Estados para cambio de contraseña
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordStep, setPasswordStep] = useState<'idle' | 'code'>('idle')
  const [passwordCode, setPasswordCode] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        const n = data.nombre ?? ''
        const a = data.apellido ?? ''
        const currentApodo = data.apodo ?? ''
        setNombre(n)
        setApellido(a)
        setApodo(currentApodo)

        const primerNombre = n.trim().split(' ')[0]
        // Tratar como "sin apodo personalizado" si está vacío, es igual al primer nombre
        // o es igual al nombre completo (entradas anteriores al nuevo criterio)
        const esApodoDefault = !currentApodo || currentApodo === primerNombre || currentApodo === n.trim()
        setUsarPrimerNombre(esApodoDefault)

        setEmailMasked(data.emailMasked ?? data.email ?? '')
        setTelefonoMasked(data.telefonoMasked ?? null)
        setRol(data.rol ?? '')

        // Inicializar el selector basándose en tema_preferido del perfil antes de recurrir a localStorage
        if (data.tema_preferido) {
          setTema(data.tema_preferido as Tema)
          applyTheme(data.tema_preferido as Tema)
        }
        setLoadingProfile(false)
      })
      .catch(() => setLoadingProfile(false))

    const saved = (localStorage.getItem('theme') as Tema) ?? 'light'
    setTema(saved)

    const syncHash = () => setActiveHash(window.location.hash || '#datos')
    syncHash()
    window.addEventListener('hashchange', syncHash)

    const checkDark = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      window.removeEventListener('hashchange', syncHash)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (tema !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [tema])

  function seleccionarTema(t: Tema) {
    setTema(t)
    applyTheme(t)
    // Sincronizar la base de datos de Supabase en segundo plano al cambiar el tema
    if (nombre.trim()) {
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim() || '',
          apodo: usarPrimerNombre ? nombre.trim().split(' ')[0] : (apodo.trim() || nombre.trim().split(' ')[0]),
          tema_preferido: t,
          avatar_color: avatarColor,
          avatar_text: avatarText,
        }),
      }).catch((err) => console.error('Error syncing theme preference:', err))
    }
  }

  async function guardarDatos(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio.')
      return
    }
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim() || '',
          apodo: usarPrimerNombre ? nombre.trim().split(' ')[0] : (apodo.trim() || nombre.trim().split(' ')[0]),
          tema_preferido: tema,
          avatar_color: avatarColor,
          avatar_text: avatarText,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      setSaved(true)
      toast.success('Cambios guardados.')
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red'
      toast.error(`No se pudo guardar: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateSensitive() {
    if (!unlockPassword || !newSensitiveValue) return
    setUnlockLoading(true)
    try {
      const res = await fetch('/api/profile/update-sensitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlockPassword, field: unlockField, newValue: newSensitiveValue }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      if (unlockField === 'email') setEmailMasked(data.masked)
      if (unlockField === 'phone') setTelefonoMasked(data.masked)
      toast.success(unlockField === 'email' ? 'Correo actualizado.' : 'Teléfono actualizado.')
      setUnlockField(null)
      setUnlockPassword('')
      setNewSensitiveValue('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setUnlockLoading(false)
    }
  }

  async function enviarCodigoCambioPassword() {
    if (!passwordActual || !passwordNueva || passwordNueva.length < 8) return
    setPasswordLoading(true)
    try {
      const res = await fetch('/api/profile/update-sensitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'password_step1', password: passwordActual, newValue: passwordNueva }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setPasswordStep('code')
      toast.success('Revisa tu correo. Ingresa el código de verificación.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function confirmarCambioPassword() {
    if (!passwordCode || !passwordNueva) return
    setPasswordLoading(true)
    try {
      const res = await fetch('/api/profile/update-sensitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'password_step2', code: passwordCode, newValue: passwordNueva }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      toast.success('Contraseña actualizada.')
      setPasswordStep('idle')
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordCode('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setPasswordLoading(false)
    }
  }

  function toggleNotificacion(key: keyof typeof notificaciones) {
    setNotificaciones(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }))
  }

  function limpiarCache() {
    toast.success('Limpiando datos de sesión...')
    localStorage.removeItem('theme')
    setTimeout(() => { window.location.href = '/settings' }, 800)
  }

  const ROL_LABELS: Record<string, string> = {
    super_admin: 'Administrador del sistema',
    empresa_admin: 'Administrador de empresa',
    empleado: 'Colaborador',
    usuario_libre: 'Usuario',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-input)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: "'Open Sans', sans-serif",
    transition: 'border-color 0.2s',
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 24, marginBottom: 24,
  }

  const btnBrandSmall: React.CSSProperties = {
    padding: '9px 20px', borderRadius: 100, border: 'none',
    background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Open Sans', sans-serif",
    transition: 'opacity 0.2s',
  }

  const btnNeutralSmall: React.CSSProperties = {
    padding: '9px 16px', borderRadius: 100,
    border: '1px solid var(--border)', background: 'var(--bg-integrated)',
    color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Open Sans', sans-serif",
  }

  const SETTINGS_ITEMS = [
    { href: '/settings#datos', label: 'Mis datos' },
    { href: '/settings#preferencias', label: 'Preferencias' },
  ]

  const apodoDisplay = usarPrimerNombre ? nombre.split(' ')[0] : apodo

  return (
    <div style={{ padding: '0' }}>
      <h1
        onClick={() => router.back()}
        style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', marginBottom: 28,
        }}
        className="hover-slide-r"
      >
        <ArrowLeft size={22} />
        Configuración
      </h1>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {loadingProfile ? (
          <div style={{ flex: 1, padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Cargando tu configuración...</p>
          </div>
        ) : (
          <div style={{ minWidth: 0, flex: 1 }}>

            {/* ── Mis datos ── */}
            <div id="datos" style={sectionStyle}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Mis datos
              </h2>
              <form onSubmit={guardarDatos} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Nombres <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Juan"
                      style={{ ...inputStyle, borderColor: !nombre.trim() ? 'var(--color-error)' : undefined }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Apellidos
                    </label>
                    <input
                      type="text"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      placeholder="Ej: Pérez"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Nombre favorito */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    ¿Cómo quieres que te llamemos?{' '}
                    <span style={{ fontWeight: 400 }}>(Apodo o nombre favorito)</span>
                  </label>
                  <input
                    type="text"
                    value={apodoDisplay}
                    onChange={(e) => {
                      setApodo(e.target.value)
                      if (usarPrimerNombre) setUsarPrimerNombre(false)
                    }}
                    placeholder="Ej: Juanis, El Profe..."
                    style={{
                      ...inputStyle,
                      ...(usarPrimerNombre ? { background: 'var(--bg-integrated)', color: 'var(--text-secondary)' } : {}),
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={usarPrimerNombre}
                      onChange={(e) => {
                        setUsarPrimerNombre(e.target.checked)
                        if (e.target.checked) setApodo('')
                      }}
                      style={{ accentColor: 'var(--color-brand)', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    Usar mi primer nombre automáticamente
                  </label>
                </div>

                {/* Correo electrónico - enmascarado */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Correo electrónico
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={emailMasked}
                      readOnly
                      style={{ ...inputStyle, paddingRight: 44, background: 'var(--bg-integrated)', color: 'var(--text-secondary)', cursor: 'default' }}
                    />
                    <button
                      type="button"
                      onClick={() => { setUnlockField(unlockField === 'email' ? null : 'email'); setUnlockPassword(''); setNewSensitiveValue('') }}
                      title="Cambiar correo"
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}
                      className="hover-lock hover-press"
                    >
                      <LockSimple size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  {unlockField === 'email' && (
                    <div style={{ marginTop: 10, padding: '14px 16px', borderRadius: 8, background: 'var(--bg-integrated)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input type="password" placeholder="Contraseña actual" value={unlockPassword} onChange={e => setUnlockPassword(e.target.value)} style={inputStyle} />
                      <input type="email" placeholder="Nuevo correo electrónico" value={newSensitiveValue} onChange={e => setNewSensitiveValue(e.target.value)} style={inputStyle} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={handleUpdateSensitive} disabled={unlockLoading || !unlockPassword || !newSensitiveValue} style={{ ...btnBrandSmall, opacity: unlockLoading ? 0.7 : 1 }}>
                          {unlockLoading ? 'Verificando...' : 'Verificar y cambiar'}
                        </button>
                        <button type="button" onClick={() => { setUnlockField(null); setUnlockPassword(''); setNewSensitiveValue('') }} style={btnNeutralSmall}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Teléfono - enmascarado (solo si existe) */}
                {telefonoMasked !== null && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Teléfono
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={telefonoMasked}
                        readOnly
                        style={{ ...inputStyle, paddingRight: 44, background: 'var(--bg-integrated)', color: 'var(--text-secondary)', cursor: 'default' }}
                      />
                      <button
                        type="button"
                        onClick={() => { setUnlockField(unlockField === 'phone' ? null : 'phone'); setUnlockPassword(''); setNewSensitiveValue('') }}
                        title="Cambiar teléfono"
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}
                        className="hover-lock hover-press"
                      >
                        <LockSimple size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                    {unlockField === 'phone' && (
                      <div style={{ marginTop: 10, padding: '14px 16px', borderRadius: 8, background: 'var(--bg-integrated)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input type="password" placeholder="Contraseña actual" value={unlockPassword} onChange={e => setUnlockPassword(e.target.value)} style={inputStyle} />
                        <input type="tel" placeholder="Nuevo teléfono (ej: +573001234567)" value={newSensitiveValue} onChange={e => setNewSensitiveValue(e.target.value)} style={inputStyle} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={handleUpdateSensitive} disabled={unlockLoading || !unlockPassword || !newSensitiveValue} style={{ ...btnBrandSmall, opacity: unlockLoading ? 0.7 : 1 }}>
                            {unlockLoading ? 'Verificando...' : 'Verificar y cambiar'}
                          </button>
                          <button type="button" onClick={() => { setUnlockField(null); setUnlockPassword(''); setNewSensitiveValue('') }} style={btnNeutralSmall}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rol */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Rol
                  </label>
                  <input
                    type="text"
                    value={ROL_LABELS[rol] ?? rol}
                    readOnly
                    style={{ ...inputStyle, background: 'var(--bg-integrated)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                  />
                </div>

                {/* Cambiar contraseña */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 4 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Cambiar contraseña
                  </p>
                  {passwordStep === 'idle' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input
                        type="password"
                        placeholder="Contraseña actual"
                        value={passwordActual}
                        onChange={e => setPasswordActual(e.target.value)}
                        style={inputStyle}
                        autoComplete="current-password"
                      />
                      <input
                        type="password"
                        placeholder="Contraseña nueva (mínimo 8 caracteres)"
                        value={passwordNueva}
                        onChange={e => setPasswordNueva(e.target.value)}
                        style={inputStyle}
                        autoComplete="new-password"
                      />
                      <div>
                        <button
                          type="button"
                          onClick={enviarCodigoCambioPassword}
                          disabled={passwordLoading || !passwordActual || passwordNueva.length < 8}
                          style={{ ...btnBrandSmall, opacity: (passwordLoading || !passwordActual || passwordNueva.length < 8) ? 0.5 : 1 }}
                        >
                          {passwordLoading ? 'Verificando...' : 'Enviar código de verificación'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                        Ingresa el código de 6 dígitos que enviamos a tu correo.
                      </p>
                      <OTPInput
                        value={passwordCode}
                        onChange={setPasswordCode}
                        isDark={isDark}
                        disabled={passwordLoading}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={confirmarCambioPassword}
                          disabled={passwordLoading || passwordCode.length !== 6}
                          style={{ ...btnBrandSmall, opacity: (passwordLoading || passwordCode.length !== 6) ? 0.5 : 1 }}
                        >
                          {passwordLoading ? 'Confirmando...' : 'Confirmar cambio'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPasswordStep('idle'); setPasswordCode('') }}
                          style={btnNeutralSmall}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* ── Preferencias ── */}
            <div id="preferencias">
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Preferencias de usuario
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
                {/* Aspecto visual */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sun size={18} /> Aspecto visual
                  </h3>

                  <div style={{ marginBottom: 28 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Tema de la interfaz</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {([
                        { key: 'light', label: 'Claro', Icon: Sun },
                        { key: 'dark', label: 'Oscuro', Icon: Moon },
                        { key: 'system', label: 'Sistema', Icon: Monitor },
                      ] as { key: Tema; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => seleccionarTema(key)}
                          className="hover-pop"
                          style={{
                            flex: 1, padding: '10px 6px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            border: tema === key ? '2px solid var(--color-brand)' : '1px solid var(--border)',
                            borderRadius: 10,
                            background: tema === key ? 'var(--color-brand-light)' : 'var(--bg-integrated)',
                            color: tema === key ? 'var(--color-brand)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: 12, fontWeight: tema === key ? 700 : 500,
                            transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                          }}
                        >
                          <Icon size={17} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div>
                    <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Avatar</p>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, fontWeight: 800, color: '#474747', overflow: 'hidden',
                        border: '3px solid var(--bg-card)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        flexShrink: 0,
                      }}>
                        {avatarText || (nombre ? nombre.charAt(0).toUpperCase() : '?')}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={avatarText}
                          onChange={(e) => setAvatarText(e.target.value.slice(0, 2))}
                          placeholder="Texto"
                          maxLength={2}
                          style={{ ...inputStyle, padding: '7px 10px', fontSize: 15, textAlign: 'center', maxWidth: 70 }}
                        />
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                          Máx. 2 caracteres
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {AVATAR_COLORS.map(({ hex, label }) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setAvatarColor(hex)}
                          title={label}
                          style={{
                            width: 30, height: 30, borderRadius: '50%', background: hex,
                            border: 'none', cursor: 'pointer',
                            outline: avatarColor === hex ? `3px solid ${hex}` : '3px solid transparent',
                            outlineOffset: 2,
                            transform: avatarColor === hex ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s',
                          }}
                        />
                      ))}
                      <div style={{ position: 'relative', width: 30, height: 30 }}>
                        <input
                          type="color"
                          value={avatarColor}
                          onChange={(e) => setAvatarColor(e.target.value)}
                          style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                        />
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'conic-gradient(#f06, #4a9, #09f, #f90, #f06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, color: '#fff', fontWeight: 900, pointerEvents: 'none',
                        }}>+</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notificaciones */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={18} /> Notificaciones
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <NotificationSwitch label="Alertas críticas" info="Eventos que impactan tus ahorros de CO₂ y la sostenibilidad de tu operación." active={notificaciones.impacto_critico} onToggle={() => toggleNotificacion('impacto_critico')} />
                    <NotificationSwitch label="Diagnósticos listos" info="Aviso cuando tus diagnósticos circulares y PDFs de impacto estén disponibles." active={notificaciones.nuevos_certificados} onToggle={() => toggleNotificacion('nuevos_certificados')} />
                    <NotificationSwitch label="Resumen mensual" info="Informe consolidado con métricas de economía circular y ahorro acumulado." active={notificaciones.resumen_mensual} onToggle={() => toggleNotificacion('resumen_mensual')} />
                    <NotificationSwitch label="Respuestas de soporte" info="Notificaciones en tiempo real cuando el equipo responda tus consultas." active={notificaciones.soporte_respuestas} onToggle={() => toggleNotificacion('soporte_respuestas')} />
                    <NotificationSwitch label="Modo Eco-Noche" info="Cambia automáticamente al tema oscuro entre 7:00 PM y 7:00 AM." active={notificaciones.eco_night_mode} onToggle={() => toggleNotificacion('eco_night_mode')} />

                    <div style={{ marginTop: 4 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Canal preferido
                      </label>
                      <select
                        value={notificaciones.canal_preferido}
                        onChange={(e) => setNotificaciones(prev => ({ ...prev, canal_preferido: e.target.value }))}
                        style={{ ...inputStyle, padding: '8px 12px' }}
                      >
                        <option value="todos">Email + App</option>
                        <option value="solo_app">Solo App</option>
                        <option value="silencio">Silencio</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mantenimiento */}
              <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderStyle: 'dashed' }}>
                <div>
                  <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Mantenimiento</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Limpia la caché de sesión si notas comportamientos extraños.</p>
                </div>
                <button
                  onClick={limpiarCache}
                  style={{
                    padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg-integrated)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: 'var(--color-error)', transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}
                >
                  Limpiar y recargar
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Submenu derecha */}
        <aside style={{ flexShrink: 0, width: 180, position: 'sticky', top: 32 }}>
          <PageSubmenu items={SETTINGS_ITEMS} activeHash={activeHash} />
        </aside>
      </div>

      {/* ── Botón guardar - sticky al fondo ── */}
      {!loadingProfile && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          paddingTop: 32,
          paddingBottom: 24,
          display: 'flex',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom, transparent 0%, var(--bg-primary) 35%)',
          pointerEvents: 'none',
        }}>
          <button
            onClick={() => guardarDatos()}
            disabled={loading}
            style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 36px',
              background: saved ? 'var(--color-success, #38B98E)' : isDark ? '#D6F391' : 'var(--color-brand)',
              color: isDark ? '#474747' : '#fff',
              border: 'none',
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.85 : 1,
              transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: '0 4px 20px rgba(0,130,124,0.3)',
              minWidth: 220,
              justifyContent: 'center',
              fontFamily: "'Open Sans', sans-serif",
            }}
            className={loading ? '' : 'hover-pop hover-press'}
          >
            {saved ? (
              <><Check size={17} strokeWidth={2.5} /> Guardado</>
            ) : loading ? (
              <>Guardando...</>
            ) : (
              <><FloppyDisk size={17} strokeWidth={2.5} /> Guardar cambios</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function NotificationSwitch({ label, info, active, onToggle }: { label: string; info: string; active: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        <div className="l-tip" style={{ position: 'relative', display: 'flex', cursor: 'help', color: 'var(--text-secondary)' }}>
          <Question size={13} />
          <span className="l-tip-text">{info}</span>
        </div>
      </div>
      <div
        onClick={onToggle}
        role="switch"
        aria-checked={active}
        style={{
          width: 42, height: 23, borderRadius: 20,
          background: active ? 'var(--color-brand)' : 'var(--bg-integrated)',
          position: 'relative', cursor: 'pointer',
          transition: 'background 0.3s cubic-bezier(0.22,1,0.36,1)',
          flexShrink: 0, border: '1px solid var(--border)',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: active ? 21 : 3,
          width: 15, height: 15, borderRadius: '50%', background: '#fff',
          transition: 'left 0.3s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }} />
      </div>

      <style jsx>{`
        .l-tip .l-tip-text {
          visibility: hidden; width: 200px;
          background: #474747; color: #fff;
          text-align: left; border-radius: 8px;
          padding: 8px 12px; position: absolute;
          z-index: 1000; bottom: 125%; left: 50%;
          margin-left: -100px; opacity: 0;
          transition: opacity 0.2s; font-size: 11px;
          line-height: 1.5; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          pointer-events: none;
        }
        .l-tip .l-tip-text::after {
          content: ""; position: absolute; top: 100%; left: 50%;
          margin-left: -5px; border-width: 5px; border-style: solid;
          border-color: #474747 transparent transparent transparent;
        }
        .l-tip:hover .l-tip-text { visibility: visible; opacity: 1; }
      `}</style>
    </div>
  )
}
