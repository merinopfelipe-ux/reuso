'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Stack, Warning } from '@phosphor-icons/react'
import type { ModuloConActivo } from '@/types'

const C = {
  brand: 'var(--color-brand)',
  dark: 'var(--text-primary)',
  mid: 'var(--text-secondary)',
  border: 'var(--border)',
  light: 'var(--bg-hover)',
  warning: 'var(--color-warning)',
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
      {pendiente && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(71,71,71,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 14, padding: 24, maxWidth: 380, width: '90%',
            boxShadow: 'var(--shadow)', border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Warning size={22} color={C.warning} weight="duotone" />
              <span style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>
                ¿Apagar {pendiente.nombre}?
              </span>
            </div>
            {pendiente.usuarios > 0 ? (
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 20, lineHeight: 1.5 }}>
                Si apagas el {pendiente.nombre}, sus <strong>{pendiente.usuarios}</strong>{' '}
                {pendiente.usuarios === 1 ? 'usuario perderá' : 'usuarios perderán'} acceso inmediatamente.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 20, lineHeight: 1.5 }}>
                El módulo quedará inactivo para esta empresa.
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setPendiente(null)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${C.border}`, background: 'var(--bg-primary)', color: C.dark, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDesactivar}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: 'none', background: '#FF5E4B', color: '#fff', cursor: 'pointer',
                }}
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modulos.map((m) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${m.activo_en_empresa ? 'rgba(0,130,124,0.25)' : C.border}`,
            background: m.activo_en_empresa ? C.light : 'var(--bg-card)',
            transition: 'all 0.2s',
          }}>
            <Stack size={16} color={m.activo_en_empresa ? C.brand : C.mid} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.dark }}>{m.nombre}</span>
            {m.descripcion && (
              <span style={{ fontSize: 12, color: C.mid, flex: 2 }}>{m.descripcion}</span>
            )}
            <button
              disabled={toggling === m.id}
              onClick={() => toggle(m.id, m.activo_en_empresa, m.nombre)}
              style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: toggling === m.id ? 'wait' : 'pointer',
                border: 'none',
                background: m.activo_en_empresa ? C.brand : 'rgba(0,130,124,0.10)',
                color: m.activo_en_empresa ? 'var(--text-on-brand)' : C.brand,
                transition: 'all 0.2s',
                opacity: toggling === m.id ? 0.6 : 1,
              }}
            >
              {toggling === m.id ? '...' : m.activo_en_empresa ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
