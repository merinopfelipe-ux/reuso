'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TriangleAlert as Warning, Lock, Check } from '@/components/ui/icons'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Modal } from '@/components/ui/modal'
import type { ModuloConActivo } from '@/types'

const C = {
  brand: 'var(--color-brand)',
  dark: 'var(--text-primary)',
  mid: 'var(--text-secondary)',
  border: 'var(--border)',
  light: 'var(--bg-hover)',
  warning: 'var(--color-warning)',
}

// Qué rutas protege cada módulo en la práctica — para que quede claro qué se
// bloquea de verdad al apagarlo, no solo un nombre abstracto.
const RUTAS_PROTEGIDAS: Record<string, string> = {
  cotizador_crm: 'Bloquea /empresa/cotizador completo.',
  dpp: 'Bloquea /empresa/dpp completo (crear y ver activos DPP).',
  calculo_ambiental: 'Bloquea registrar y ver cálculos: /empresa/calculos, /empresa/objetos, /dashboard/objetos y /dashboard/historial.',
}

export function ModulosEmpresaClient({
  empresaId,
  modulos,
}: {
  empresaId: string
  modulos: ModuloConActivo[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [toggling, setToggling] = useState<string | null>(null)
  // Confirmación antes de desactivar: { moduloId, usuariosAfectados }
  const [pendiente, setPendiente] = useState<{ moduloId: string; nombre: string; usuarios: number } | null>(null)

  async function toggle(moduloId: string, activoActual: boolean, nombreModulo: string) {
    // Si se va a desactivar, primero chequear cuántos usuarios perderían acceso
    if (activoActual) {
      setToggling(moduloId)
      try {
        const res = await fetch(`/api/admin/empresas/${empresaId}/modulos`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modulo_id: moduloId, activo: false, solo_contar: true }),
        })
        const d = await res.json()
        const usuariosAfectados = d.usuarios_afectados ?? 0
        setToggling(null)
        // Mostrar confirmación
        setPendiente({ moduloId, nombre: nombreModulo, usuarios: usuariosAfectados })
      } catch {
        setToggling(null)
      }
      return
    }

    // Activar directo
    setToggling(moduloId)
    await fetch(`/api/admin/empresas/${empresaId}/modulos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo_id: moduloId, activo: true }),
    })
    setToggling(null)
    startTransition(() => router.refresh())
  }

  async function confirmarDesactivar() {
    if (!pendiente) return
    setToggling(pendiente.moduloId)
    setPendiente(null)
    await fetch(`/api/admin/empresas/${empresaId}/modulos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo_id: pendiente.moduloId, activo: false }),
    })
    setToggling(null)
    startTransition(() => router.refresh())
  }

  if (modulos.length === 0) {
    return (
      <p style={{ fontSize: 13, color: C.mid }}>
        No hay módulos disponibles. Crea módulos desde{' '}
        <a href="/admin/modulos" style={{ color: C.brand, fontWeight: 600 }}>Módulos</a>.
      </p>
    )
  }

  return (
    <>
      {/* Modal de confirmación */}
      <Modal
        abierto={!!pendiente}
        onClose={() => setPendiente(null)}
        titulo={`¿Apagar ${pendiente?.nombre ?? 'este módulo'}?`}
        icono={<Warning size={22} className="text-[var(--color-warning)]" />}
        descripcion={
          pendiente && pendiente.usuarios > 0 ? (
            <>Si apagas el {pendiente.nombre}, sus <strong>{pendiente.usuarios}</strong>{' '}
            {pendiente.usuarios === 1 ? 'usuario perderá' : 'usuarios perderán'} acceso inmediatamente.</>
          ) : (
            'El módulo quedará inactivo para esta empresa.'
          )
        }
        textoCancelar="Cancelar"
        textoConfirmar="Apagar"
        varianteConfirmar="error"
        onCancelar={() => setPendiente(null)}
        onConfirmar={confirmarDesactivar}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modulos.map((m) => {
          const activo = m.activo_en_empresa
          const rutas = m.clave ? RUTAS_PROTEGIDAS[m.clave] : null
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              border: `1px solid ${activo ? 'rgba(0,130,124,0.25)' : C.border}`,
              background: activo ? C.light : 'var(--bg-card)',
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: activo ? 'rgba(0,130,124,0.12)' : C.light,
              }}>
                <DynamicIcon nombre={m.icono_lucide} size={17} className={activo ? '' : ''} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.dark }}>{m.nombre}</span>
                  {activo
                    ? <Check size={13} style={{ color: C.brand }} />
                    : <Lock size={13} style={{ color: C.mid }} />
                  }
                </div>
                {m.descripcion && (
                  <p style={{ fontSize: 12, color: C.mid, margin: '0 0 3px', lineHeight: 1.4 }}>{m.descripcion}</p>
                )}
                {rutas && (
                  <p style={{ fontSize: 11, color: C.mid, margin: 0, fontStyle: 'italic' }}>{rutas}</p>
                )}
                {!m.clave && (
                  <p style={{ fontSize: 11, color: C.warning, margin: 0 }}>
                    Sin clave asignada: este toggle no bloquea ninguna ruta todavía.
                  </p>
                )}
              </div>

              <button
                disabled={toggling === m.id}
                onClick={() => toggle(m.id, activo, m.nombre)}
                className={toggling === m.id ? '' : 'hover-pop hover-press'}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: toggling === m.id ? 'wait' : 'pointer',
                  border: 'none',
                  background: activo ? C.brand : 'rgba(0,130,124,0.10)',
                  color: activo ? 'var(--text-on-brand)' : C.brand,
                  transition: 'all 0.2s',
                  opacity: toggling === m.id ? 0.6 : 1,
                }}
              >
                {toggling === m.id ? '...' : activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
