'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Trash, Check,
  Warning, Clock,
  ShieldCheck, Pulse
} from '@phosphor-icons/react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

interface Incidente {
  id: string
  titulo: string
  descripcion: string | null
  componente: 'gemini' | 'groq' | 'openrouter' | 'qwen' | 'supabase' | 'calculadora'
  estado: 'investigando' | 'identificado' | 'monitoreando' | 'resuelto'
  severidad: 'menor' | 'mayor' | 'critico'
  created_at: string
  updated_at: string
  resolved_at: string | null
}

const COMPONENTE_OPTS = [
  { value: 'supabase', label: 'Base de datos y Servidores' },
  { value: 'gemini', label: 'Google Gemini 2.0 API' },
  { value: 'groq', label: 'Groq Cloud (LLaMA 3.3)' },
  { value: 'openrouter', label: 'OpenRouter Gateway' },
  { value: 'qwen', label: 'Qwen-VL 8B Instruct' },
  { value: 'calculadora', label: 'Calculadora Core (CO2)' },
] as const

const ESTADO_OPTS = [
  { value: 'investigando', label: 'Investigando' },
  { value: 'identificado', label: 'Identificado' },
  { value: 'monitoreando', label: 'Monitoreando' },
  { value: 'resuelto', label: 'Resuelto' },
] as const

const SEVERIDAD_OPTS = [
  { value: 'menor', label: 'Menor (Degradación)' },
  { value: 'mayor', label: 'Mayor (Caída Parcial)' },
  { value: 'critico', label: 'Crítico (Fuera de Servicio)' },
] as const

export default function AdminStatusPage() {
  
  // Lista de incidencias
  const [incidentes, setIncidentes] = useState<Incidente[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Formulario
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    componente: 'supabase' as Incidente['componente'],
    estado: 'investigando' as Incidente['estado'],
    severidad: 'menor' as Incidente['severidad'],
  })
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Tema
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Cargar incidentes
  useEffect(() => {
    fetchIncidentes()
  }, [])

  async function fetchIncidentes() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/status/incidentes')
      const data = await res.json()
      if (res.ok) {
        setIncidentes(data.incidentes || [])
      } else {
        setError(data.error || 'Error al cargar incidencias.')
      }
    } catch {
      setError('Error de conexión al cargar incidencias.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCrearIncidente(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      setError('Escribe un título para la incidencia.')
      return
    }

    setError(null)
    setSuccess(null)
    setActionLoading('create')

    try {
      const res = await fetch('/api/admin/status/incidentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Incidencia publicada correctamente.')
        setForm({
          titulo: '',
          descripcion: '',
          componente: 'supabase',
          estado: 'investigando',
          severidad: 'menor',
        })
        setIncidentes(prev => [data.data, ...prev])
      } else {
        setError(data.error || 'Error al guardar la incidencia.')
      }
    } catch {
      setError('Error al conectar con el servidor.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUpdateEstado(id: string, nuevoEstado: Incidente['estado']) {
    setError(null)
    setSuccess(null)
    setActionLoading(id)

    try {
      const res = await fetch(`/api/admin/status/incidentes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      const data = await res.json()
      if (res.ok) {
        setIncidentes(prev => prev.map(i => i.id === id ? data.data : i))
        setSuccess('Estado de la incidencia actualizado.')
      } else {
        setError(data.error || 'Error al actualizar.')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleEliminarIncidente(id: string) {
    if (!confirm('¿Seguro que deseas eliminar esta incidencia permanentemente?')) return
    setError(null)
    setSuccess(null)
    setActionLoading(`delete-${id}`)

    try {
      const res = await fetch(`/api/admin/status/incidentes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setIncidentes(prev => prev.filter(i => i.id !== id))
        setSuccess('Incidencia eliminada del historial.')
      } else {
        const data = await res.json()
        setError(data.error || 'Error al eliminar.')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setActionLoading(null)
    }
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'
  const inputStyle = `w-full px-3 py-2 rounded-[8px] border outline-none text-sm bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]`

  const activos = incidentes.filter(i => i.estado !== 'resuelto')
  const historicos = incidentes.filter(i => i.estado === 'resuelto')

  return (
    <div className="max-w-4xl mx-auto">
      <AdminPageHeader
        titulo="Estado de la Calculadora"
        subtitulo="Publica y administra incidentes en tiempo real para la página de estado pública"
        showBack
        accion={
          <a
            href="/status"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-[#00827C]/30 text-[#00827C] hover:bg-[#00827C]/05 transition-colors"
          >
            <Pulse size={16} />
            Ver página pública ↗
          </a>
        }
      />

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FF5E4B]/10 border border-[#FF5E4B]/20 text-[#FF5E4B] text-sm font-semibold flex items-center gap-2">
          <Warning size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-[#38B98E]/10 border border-[#38B98E]/20 text-[#38B98E] text-sm font-semibold flex items-center gap-2">
          <Check size={20} />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PANEL DE CREACIÓN DE INCIDENCIA */}
        <div className={`md:col-span-1 rounded-[12px] border p-5 ${cardBg} h-fit`}>
          <h3 className={`text-base font-bold mb-4 ${tp} flex items-center gap-2`}>
            <Plus size={18} />
            Nueva Alerta / Incidente
          </h3>

          <form onSubmit={handleCrearIncidente} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 uppercase tracking-wide ${ts}`}>
                Título del Incidente
              </label>
              <input
                type="text"
                placeholder="Ej. Latencia en Gemini 2.0"
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                className={inputStyle}
                disabled={actionLoading === 'create'}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 uppercase tracking-wide ${ts}`}>
                Componente Afectado
              </label>
              <select
                value={form.componente}
                onChange={e => setForm(p => ({ ...p, componente: e.target.value as Incidente['componente'] }))}
                className={inputStyle}
                disabled={actionLoading === 'create'}
              >
                {COMPONENTE_OPTS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 uppercase tracking-wide ${ts}`}>
                Severidad
              </label>
              <select
                value={form.severidad}
                onChange={e => setForm(p => ({ ...p, severidad: e.target.value as Incidente['severidad'] }))}
                className={inputStyle}
                disabled={actionLoading === 'create'}
              >
                {SEVERIDAD_OPTS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 uppercase tracking-wide ${ts}`}>
                Estado Inicial
              </label>
              <select
                value={form.estado}
                onChange={e => setForm(p => ({ ...p, estado: e.target.value as Incidente['estado'] }))}
                className={inputStyle}
                disabled={actionLoading === 'create'}
              >
                {ESTADO_OPTS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 uppercase tracking-wide ${ts}`}>
                Descripción / Detalles
              </label>
              <textarea
                placeholder="Describe el incidente y los pasos tomados..."
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                rows={3}
                className={`${inputStyle} resize-none`}
                disabled={actionLoading === 'create'}
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading === 'create'}
              className="w-full py-2.5 rounded-full bg-[#00827C] hover:bg-[#006B66] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading === 'create' ? 'Publicando...' : 'Publicar Incidencia'}
            </button>
          </form>
        </div>

        {/* LISTADOS DE INCIDENCIAS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* INCIDENCIAS ACTIVAS */}
          <div className={`rounded-[12px] border p-5 ${cardBg}`}>
            <h3 className={`text-base font-bold mb-4 ${tp} flex items-center gap-2`}>
              <Clock size={18} />
              Incidencias Activas ({activos.length})
            </h3>

            {loading ? (
              <p className={`text-sm ${ts}`}>Cargando incidencias...</p>
            ) : activos.length === 0 ? (
              <p className={`text-sm italic ${ts}`}>No hay incidencias activas. Todos los sistemas operan al 100%.</p>
            ) : (
              <div className="space-y-4">
                {activos.map(i => (
                  <div key={i.id} className={`p-4 rounded-[8px] border ${isDark ? 'bg-white/05 border-white/10' : 'bg-[#F2F9F8] border-[#00827C]/12'}`}>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <h4 className={`text-sm font-bold ${tp}`}>{i.titulo}</h4>
                        <span className={`text-xs ${ts}`}>
                          Afecta a: <strong className="font-semibold">{COMPONENTE_OPTS.find(o => o.value === i.componente)?.label ?? i.componente}</strong>
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                        i.severidad === 'critico' ? 'bg-[#FF5E4B]/15 text-[#FF5E4B]' : 'bg-[#F6BF3E]/15 text-[#F6BF3E]'
                      }`}>
                        {i.severidad} · {i.estado}
                      </span>
                    </div>

                    {i.descripcion && (
                      <p className={`mt-2 text-xs ${ts} leading-relaxed`}>{i.descripcion}</p>
                    )}

                    <div className="mt-3 pt-3 border-t border-[#00827C]/10 flex justify-between items-center flex-wrap gap-2">
                      <div className="flex gap-2">
                        {i.estado === 'investigando' && (
                          <button
                            onClick={() => handleUpdateEstado(i.id, 'monitoreando')}
                            disabled={actionLoading != null}
                            className="px-3 py-1 rounded-full bg-[#00827C]/10 hover:bg-[#00827C]/20 text-[#00827C] text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            Marcar Monitoreo
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateEstado(i.id, 'resuelto')}
                          disabled={actionLoading != null}
                          className="px-3 py-1 rounded-full bg-[#38B98E]/10 hover:bg-[#38B98E]/20 text-[#38B98E] text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Marcar Resuelto
                        </button>
                      </div>
                      <button
                        onClick={() => handleEliminarIncidente(i.id)}
                        disabled={actionLoading != null}
                        className="p-1 rounded text-[#FF5E4B] hover:bg-[#FF5E4B]/10 transition-colors disabled:opacity-50"
                        title="Eliminar incidencia"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTORIAL DE INCIDENCIAS */}
          <div className={`rounded-[12px] border p-5 ${cardBg}`}>
            <h3 className={`text-base font-bold mb-4 ${tp} flex items-center gap-2`}>
              <ShieldCheck size={18} />
              Historial de Incidencias Resueltas ({historicos.length})
            </h3>

            {loading ? (
              <p className={`text-sm ${ts}`}>Cargando historial...</p>
            ) : historicos.length === 0 ? (
              <p className={`text-sm italic ${ts}`}>No hay registros históricos de incidencias.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {historicos.map(i => (
                  <div key={i.id} className="flex justify-between items-center py-2 border-b border-[#00827C]/08 last:border-b-0">
                    <div>
                      <h4 className={`text-sm font-semibold ${tp}`}>{i.titulo}</h4>
                      <p className={`text-xs ${ts}`}>
                        {COMPONENTE_OPTS.find(o => o.value === i.componente)?.label} · Resuelto el {new Date(i.resolved_at!).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEliminarIncidente(i.id)}
                      disabled={actionLoading != null}
                      className="p-1.5 rounded text-[#FF5E4B] hover:bg-[#FF5E4B]/08 transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
