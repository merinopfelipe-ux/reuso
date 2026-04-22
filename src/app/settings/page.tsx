'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Monitor, ArrowLeft, Medal, Bell, Question } from '@phosphor-icons/react'
import { useToast } from '@/components/toast-provider'
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
  const [email, setEmail] = useState('')
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
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [activeHash, setActiveHash] = useState('')

  useEffect(() => {
    // Cargar perfil
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        setNombre(data.nombre ?? '')
        setApellido(data.apellido ?? '')
        const currentApodo = data.apodo ?? ''
        setApodo(currentApodo)
        
        // Lógica humanizada
        const primerNombre = (data.nombre ?? '').split(' ')[0]
        const isUsingFirstName = !currentApodo || currentApodo === primerNombre
        setUsarPrimerNombre(isUsingFirstName)
        
        setEmail(data.email ?? '')
        setRol(data.rol ?? '')
        if (data.avatar_color) setAvatarColor(data.avatar_color)
        if (data.avatar_text) setAvatarText(data.avatar_text)
        if (data.notificaciones_json) {
          setNotificaciones(prev => ({ ...prev, ...data.notificaciones_json }))
        }
        setLoadingProfile(false)
      })
      .catch(() => {
        setLoadingProfile(false)
      })

    // Cargar tema guardado
    const saved = (localStorage.getItem('theme') as Tema) ?? 'system'
    setTema(saved)

    // Escuchar hash para submenu
    const syncHash = () => setActiveHash(window.location.hash || '#datos')
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  // Escuchar cambios del sistema si está en modo 'system'
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
  }

  async function guardarDatos(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellido,
          apodo: usarPrimerNombre ? null : apodo,
          avatar_color: avatarColor,
          avatar_text: avatarText,
          notificaciones_json: notificaciones,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const serverMsg = data.detalle || data.error || `Error del servidor (${res.status}: ${res.statusText})`
        throw new Error(serverMsg)
      }
      toast.success('Cambios guardados con éxito.')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido de red'
      toast.error(`No se pudo guardar: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  function toggleNotificacion(key: keyof typeof notificaciones) {
    setNotificaciones(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
    }))
  }

  function limpiarCache() {
    toast.success('Limpiando datos de sesión y recargando...')
    localStorage.removeItem('theme')
    setTimeout(() => {
      window.location.href = '/settings'
    }, 800)
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
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 24, marginBottom: 24,
  }

  const SETTINGS_ITEMS = [
    { href: '/settings#datos', label: 'Mis datos' },
    { href: '/settings#preferencias', label: 'Preferencias' },
  ]

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Título con ← */}
      <h1
        onClick={() => router.back()}
        style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', marginBottom: 28,
        }}
      >
        <ArrowLeft size={22} />
        Configuración
      </h1>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {/* Contenido con estado de carga unificado */}
        {loadingProfile ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>Cargando tu configuración...</p>
            <p style={{ fontSize: 12 }}>Estamos preparando todo para ti.</p>
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
                      Nombres
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      placeholder="Ej: Juan"
                      style={{ ...inputStyle, border: !nombre ? '1px solid var(--color-error)' : inputStyle.border }}
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
                      required
                      placeholder="Ej: Pérez"
                      style={{ ...inputStyle, border: !apellido ? '1px solid var(--color-error)' : inputStyle.border }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      ¿Cómo quieres que te llamemos? <span style={{ fontWeight: 400 }}>(Nombre favorito)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={usarPrimerNombre ? nombre.split(' ')[0] : apodo}
                    onChange={(e) => {
                      setApodo(e.target.value)
                      if (usarPrimerNombre) setUsarPrimerNombre(false)
                    }}
                    placeholder="Ej: Juanis, El Profe..."
                    style={{ ...inputStyle, ...(usarPrimerNombre ? { background: 'var(--bg-integrated)', color: 'var(--text-secondary)' } : {}) }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={usarPrimerNombre}
                      onChange={(e) => {
                        setUsarPrimerNombre(e.target.checked)
                        if (e.target.checked) setApodo('')
                      }}
                      style={{ accentColor: 'var(--color-brand)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                    Usar mi primer nombre como nombre favorito
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    style={{ ...inputStyle, background: 'var(--bg-integrated)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                  />
                </div>
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
              </form>
            </div>

            {/* ── Mis Preferencias ── */}
            <div id="preferencias">
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Preferencias de usuario
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, marginBottom: 24 }}>
                {/* Card: Aspecto Visual */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sun size={18} /> Aspecto visual
                  </h3>
                  
                  {/* Tema */}
                  <div style={{ marginBottom: 32 }}>
                    <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Tema de la interfaz
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {([
                        { key: 'light', label: 'Claro', Icon: Sun },
                        { key: 'dark', label: 'Oscuro', Icon: Moon },
                        { key: 'system', label: 'Sistema', Icon: Monitor },
                      ] as { key: Tema; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => seleccionarTema(key)}
                          style={{
                            flex: 1, padding: '12px 8px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            border: tema === key ? '2px solid var(--color-brand)' : '1px solid var(--border)',
                            borderRadius: 12,
                            background: tema === key ? 'var(--color-brand-light)' : 'var(--bg-integrated)',
                            color: tema === key ? 'var(--color-brand)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: 12, fontWeight: tema === key ? 700 : 500,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          <Icon size={18} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Avatar */}
                  <div>
                    <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Identidad visual (Avatar)
                    </p>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 800, color: '#1A3A38', overflow: 'hidden', 
                        border: '4px solid var(--bg-card)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                      }}>
                        {avatarText || (nombre ? nombre.charAt(0).toUpperCase() : '?')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          type="text"
                          value={avatarText}
                          onChange={(e) => setAvatarText(e.target.value.slice(0, 2))}
                          placeholder="Icono"
                          maxLength={2}
                          style={{ 
                            ...inputStyle, 
                            padding: '8px 4px', 
                            fontSize: 16, 
                            textAlign: 'center', 
                            maxWidth: 80,
                            height: 42 
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Máx. 2 caracteres (letras o emoji)
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
                      {AVATAR_COLORS.map(({ hex, label }) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setAvatarColor(hex)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: hex, border: 'none', cursor: 'pointer',
                            outline: avatarColor === hex ? `3px solid ${hex}` : '3px solid transparent',
                            outlineOffset: 2,
                            transform: avatarColor === hex ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.15s',
                          }}
                          title={label}
                        />
                      ))}
                      <div style={{ position: 'relative', width: 32, height: 32 }}>
                        <input
                          type="color"
                          value={avatarColor}
                          onChange={(e) => setAvatarColor(e.target.value)}
                          style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }}
                        />
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: 'linear-gradient(45deg, #f06, #4a9, #f90)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, color: '#fff', fontWeight: 800
                        }}>+</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {['🌿', '♻️', '🌍', '✨'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setAvatarText(emoji)}
                          style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: avatarText === emoji ? 'var(--bg-active)' : 'var(--bg-integrated)',
                            border: avatarText === emoji ? '1px solid var(--color-brand)' : '1px solid var(--border)',
                            fontSize: 18, cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card: Notificaciones */}
                <div style={sectionStyle}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={18} /> Notificaciones
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <NotificationSwitch 
                      label="Alertas Críticas" 
                      info="Recibe alertas inmediatas sobre eventos que impactan significativamente tus ahorros de CO2 y la sostenibilidad de tu operación."
                      active={notificaciones.impacto_critico} 
                      onToggle={() => toggleNotificacion('impacto_critico')}
                    />
                    <NotificationSwitch 
                      label="Certificados" 
                      info="Aviso instantáneo cuando tus certificados de trazabilidad ambiental y PDFs de impacto estén listos para descargar."
                      active={notificaciones.nuevos_certificados} 
                      onToggle={() => toggleNotificacion('nuevos_certificados')}
                    />
                    <NotificationSwitch 
                      label="Resumen Mensual" 
                      info="Un informe consolidado cada mes con tus métricas de economía circular, leads generados y ahorro acumulado."
                      active={notificaciones.resumen_mensual} 
                      onToggle={() => toggleNotificacion('resumen_mensual')}
                    />
                    <NotificationSwitch 
                      label="Soporte" 
                      info="Notificaciones en tiempo real cuando nuestro equipo responda a tus consultas técnicas o solicitudes de mantenimiento."
                      active={notificaciones.soporte_respuestas} 
                      onToggle={() => toggleNotificacion('soporte_respuestas')}
                    />
                    <NotificationSwitch 
                      label="Modo Eco-Night" 
                      info="Activa la protección visual automática que cambia al tema oscuro entre las 7:00 PM y las 7:00 AM para optimizar el descanso y ahorro."
                      active={notificaciones.eco_night_mode} 
                      onToggle={() => toggleNotificacion('eco_night_mode')}
                    />

                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
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

              {/* Card: Mantenimiento */}
              <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderStyle: 'dashed' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Mantenimiento del sistema</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Limpia la caché de sesión si notas comportamientos extraños.</p>
                </div>
                <button 
                  onClick={limpiarCache}
                  style={{ 
                    padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', 
                    background: 'var(--bg-integrated)', fontSize: 13, fontWeight: 600, cursor: 'pointer', 
                    color: 'var(--color-error)', transition: 'all 0.2s'
                  }}
                >
                  Limpiar y recargar
                </button>
              </div>
            </div>

            {/* Botón Flotante/Persistente de Guardar (Restaurado) */}
            <div style={{
              position: 'fixed', bottom: 32, right: 32, zIndex: 100,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
            }}>
              <button
                onClick={() => guardarDatos()}
                disabled={loading}
                style={{
                  padding: '16px 32px', background: loading ? '#4D7C79' : 'var(--color-brand)',
                  color: '#fff', border: 'none', borderRadius: 100,
                  fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: loading ? 'scale(0.95)' : 'scale(1)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}
              >
                {loading ? 'Guardando...' : 'Guardar todos los cambios'}
                {!loading && <Medal size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Submenu lateral derecha */}
        <aside style={{ flexShrink: 0, width: 180, position: 'sticky', top: 32 }}>
          <PageSubmenu items={SETTINGS_ITEMS} activeHash={activeHash} />
        </aside>
      </div>{/* fin flex row */}
    </div>
  )
}

function NotificationSwitch({ label, info, active, onToggle }: { label: string, info: string, active: boolean, onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        <div className="tooltip-container" style={{ position: 'relative', display: 'flex', cursor: 'help', color: 'var(--text-secondary)' }}>
          <Question size={14} />
          <span className="tooltip-text">{info}</span>
        </div>
      </div>
      <div 
        onClick={onToggle}
        style={{
          width: 44, height: 24, borderRadius: 20, background: active ? 'var(--color-brand)' : 'var(--bg-integrated)',
          position: 'relative', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          flexShrink: 0, border: '1px solid var(--border)'
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: active ? 23 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }} />
      </div>

      <style jsx>{`
        .tooltip-container .tooltip-text {
          visibility: hidden;
          width: 200px;
          background-color: #1A3A38;
          color: #fff;
          text-align: center;
          border-radius: 8px;
          padding: 8px 12px;
          position: absolute;
          z-index: 1000;
          bottom: 125%;
          left: 50%;
          margin-left: -100px;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 11px;
          line-height: 1.4;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          pointer-events: none;
        }
        .tooltip-container .tooltip-text::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #1A3A38 transparent transparent transparent;
        }
        .tooltip-container:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
