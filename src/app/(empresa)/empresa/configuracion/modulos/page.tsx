'use client'

import { useState, useEffect } from 'react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import {
  CheckSquare, Square, Lock, WhatsappLogo, UserCircle, Leaf,
} from '@phosphor-icons/react'

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
                    <Leaf size={18} weight="duotone" className="text-[#00827C]" />
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
                            <UserCircle size={18} weight="duotone" className="text-[#00827C]" />
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
                              ? <CheckSquare size={20} weight="duotone" className={`text-[#00827C] ${toggling === key ? 'opacity-40' : ''}`} />
                              : <Square size={20} weight="regular" className={`${ts} ${toggling === key ? 'opacity-40' : ''}`} />
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
                    <Lock size={18} weight="duotone" className={ts} />
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
                    <WhatsappLogo size={16} weight="duotone" />
                    Escríbenos para activarlo
                  </a>
                </div>
              </div>
            )}

            {modulos.length === 0 && tieneCoizador === false && (
              <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
                <Lock size={28} weight="duotone" className={`mx-auto mb-2 ${ts}`} />
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
                  <WhatsappLogo size={14} weight="bold" />
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
