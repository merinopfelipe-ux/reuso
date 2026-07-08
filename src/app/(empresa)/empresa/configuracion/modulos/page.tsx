'use client'

import { useState, useEffect } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import {
  SquareCheck as CheckSquare,
  Square,
  Lock,
  CircleUser as UserCircle,
  Leaf,
} from 'lucide-react'

function WhatsappLogo({ size = 16, className = '', strokeWidth: _sw }: { size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface Modulo {
  id: string
  clave: string | null
  nombre: string
  icono_lucide: string
  descripcion: string | null
}

interface Perfil {
  user_id: string
  nombre: string
  apellido: string | null
  email: string | null
  rol: string
}

interface Asignacion {
  user_id: string
  modulo_id: string
  activo: boolean
}

export default function ConfigModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)  // "userId-moduloId"

  useEffect(() => {
    fetch('/api/empresa/modulos')
      .then(r => r.json())
      .then(d => {
        setModulos(d.modulos ?? [])
        setPerfiles(d.perfiles ?? [])
        setAsignaciones(d.asignaciones ?? [])
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  function tieneAcceso(userId: string, moduloId: string): boolean {
    const a = asignaciones.find(x => x.user_id === userId && x.modulo_id === moduloId)
    // Sin registro → hereda acceso del módulo activo de la empresa
    if (!a) return true
    return a.activo
  }

  async function toggleAcceso(userId: string, moduloId: string) {
    const key = `${userId}-${moduloId}`
    if (toggling === key) return
    const activo = tieneAcceso(userId, moduloId)
    setToggling(key)

    // Optimista
    setAsignaciones(prev => {
      const idx = prev.findIndex(x => x.user_id === userId && x.modulo_id === moduloId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], activo: !activo }
        return next
      }
      return [...prev, { user_id: userId, modulo_id: moduloId, activo: !activo }]
    })

    try {
      await fetch('/api/empresa/modulos/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, modulo_id: moduloId, activo: !activo }),
      })
    } catch {
      // revertir si falla
      setAsignaciones(prev => {
        const idx = prev.findIndex(x => x.user_id === userId && x.modulo_id === moduloId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], activo }
          return next
        }
        return prev
      })
    }
    setToggling(null)
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  // Módulos que NO tiene la empresa (para mostrar oportunidad de compra)
  // (la API solo devuelve los activos - si hay módulos conocidos que faltan, se muestran bloqueados)
  const tieneCoizador = modulos.some(m => m.clave === 'cotizador_crm')

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AdminPageHeader titulo="Acceso a módulos" showBack />
        <p className={`text-sm mb-6 ${ts}`}>
          Gestiona qué miembros de tu equipo usan cada módulo activo.
        </p>

        {cargando ? (
          <div className="space-y-4">
            {[1,2].map(i => (
              <div key={i} className="h-32 rounded-[12px] animate-pulse bg-[var(--skeleton-base)]" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Módulos activos */}
            {modulos.map(modulo => (
              <div key={modulo.id} className={`rounded-[12px] border ${cardBg}`}>
                <div className="p-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <Leaf size={18} className="text-[#00827C]" />
                    <p className={`text-sm font-bold ${tp}`}>{modulo.nombre}</p>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#38B98E]/10 text-[#38B98E] font-medium">Activo</span>
                  </div>
                  {modulo.descripcion && (
                    <p className={`text-xs mt-1 ${ts}`}>{modulo.descripcion}</p>
                  )}
                </div>

                {perfiles.length === 0 ? (
                  <div className="p-4">
                    <p className={`text-xs ${ts}`}>No hay miembros del equipo aún.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {perfiles.map(p => {
                      const acceso = tieneAcceso(p.user_id, modulo.id)
                      const key = `${p.user_id}-${modulo.id}`
                      return (
                        <div key={p.user_id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-[#00827C]/10 flex items-center justify-center flex-shrink-0">
                            <UserCircle size={18} className="text-[#00827C]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${tp}`}>
                              {p.nombre}{p.apellido ? ` ${p.apellido}` : ''}
                            </p>
                            <p className={`text-xs truncate ${ts}`}>{p.email ?? p.rol}</p>
                          </div>
                          <label
                            className="flex items-center gap-2 cursor-pointer select-none"
                            onClick={() => toggleAcceso(p.user_id, modulo.id)}
                          >
                            <span className={`text-xs font-medium ${acceso ? 'text-[#00827C]' : ts}`}>
                              {toggling === key ? '...' : acceso ? 'Con acceso' : 'Sin acceso'}
                            </span>
                            {acceso
                              ? <CheckSquare size={20} className={`text-[#00827C] ${toggling === key ? 'opacity-40' : ''}`} />
                              : <Square size={20} className={`${ts} ${toggling === key ? 'opacity-40' : ''}`} />
                            }
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Módulo Cotizador NO activo → oportunidad de venta */}
            {!tieneCoizador && (
              <div className="rounded-[12px] border bg-[var(--bg-card)] border-[var(--border)]">
                <div className="p-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <Lock size={18} className={ts} />
                    <p className={`text-sm font-bold ${tp}`}>Cotizador CRM</p>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--bg-active)] text-[var(--text-secondary)]">
                      No adquirido
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${ts}`}>
                    Cotizaciones con diagnóstico visual IA, seguimiento de embudo y propuesta pública para tu cliente.
                  </p>
                </div>
                <div className="p-4">
                  <p className={`text-sm font-semibold mb-3 ${tp}`}>
                    Adquiere el Cotizador y dale acceso a todo tu equipo
                  </p>
                  <a
                    href="https://wa.me/573214567890?text=Hola%2C%20quiero%20activar%20el%20Cotizador%20CRM%20para%20mi%20empresa%20en%20Re%C3%BAso%20Lurdes."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25D366]/10 text-[#128C7E] text-sm font-semibold hover:bg-[#25D366]/20 transition-colors"
                  >
                    <WhatsappLogo size={16} />
                    Escríbenos para activarlo
                  </a>
                </div>
              </div>
            )}

            {modulos.length === 0 && tieneCoizador === false && (
              <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
                <Lock size={28} className={`mx-auto mb-2 ${ts}`} />
                <p className={`text-sm font-semibold mb-1 ${tp}`}>Sin módulos adquiridos</p>
                <p className={`text-xs ${ts}`}>
                  Habla con nosotros para ver qué módulos pueden potenciar tu empresa.
                </p>
                <a
                  href="https://wa.me/573214567890?text=Hola%2C%20quiero%20saber%20sobre%20los%20m%C3%B3dulos%20de%20Re%C3%BAso%20Lurdes."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00827C] text-white text-sm font-semibold hover:bg-[#006B66] transition-colors"
                >
                  <WhatsappLogo size={14} strokeWidth={2.5} />
                  Contáctanos
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
