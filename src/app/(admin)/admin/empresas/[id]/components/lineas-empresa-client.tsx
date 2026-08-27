'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TriangleAlert as Warning, Lock, Check } from '@/components/ui/icons'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { Modal } from '@/components/ui/modal'
import type { LineaNegocioConActivo } from '@/types'

const C = {
  brand: 'var(--color-brand)',
  dark: 'var(--text-primary)',
  mid: 'var(--text-secondary)',
  border: 'var(--border)',
  light: 'var(--bg-hover)',
  warning: 'var(--color-warning)',
}

export function LineasEmpresaClient({
  empresaId,
  lineas,
}: {
  empresaId: string
  lineas: LineaNegocioConActivo[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [toggling, setToggling] = useState<string | null>(null)
  // No mostramos un conteo de "usuarios afectados": el backend no lo calcula
  // de verdad todavía (las líneas de negocio aún no bloquean nada en
  // Cotizador/DPP/Cálculo, ver skill dominios-datos) — mostrar un número
  // sería una falsa garantía. Solo pedimos confirmación genérica.
  const [pendiente, setPendiente] = useState<{ lineaId: string; nombre: string } | null>(null)

  async function toggle(lineaId: string, activaActual: boolean, nombreLinea: string) {
    if (activaActual) {
      setPendiente({ lineaId, nombre: nombreLinea })
      return
    }

    setToggling(lineaId)
    await fetch(`/api/admin/empresas/${empresaId}/lineas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linea_negocio_id: lineaId, activa: true }),
    })
    setToggling(null)
    startTransition(() => router.refresh())
  }

  async function confirmarDesactivar() {
    if (!pendiente) return
    setToggling(pendiente.lineaId)
    setPendiente(null)
    await fetch(`/api/admin/empresas/${empresaId}/lineas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linea_negocio_id: pendiente.lineaId, activa: false }),
    })
    setToggling(null)
    startTransition(() => router.refresh())
  }

  if (lineas.length === 0) {
    return (
      <p style={{ fontSize: 13, color: C.mid }}>
        No hay líneas de negocio disponibles globalmente. Créalas en{' '}
        <a href="/admin/modulos" style={{ color: C.brand, fontWeight: 600 }}>Plataforma</a>.
      </p>
    )
  }

  return (
    <>
      <Modal
        abierto={!!pendiente}
        onClose={() => setPendiente(null)}
        titulo={`¿Desactivar línea ${pendiente?.nombre}?`}
        icono={<Warning size={22} className="text-[var(--color-warning)]" />}
        descripcion="La empresa dejará de poder usar esta línea de productos/servicios en cualquiera de los módulos base (Cotizador, DPP, Cálculo)."
        textoCancelar="Cancelar"
        textoConfirmar="Apagar Línea"
        varianteConfirmar="error"
        onCancelar={() => setPendiente(null)}
        onConfirmar={confirmarDesactivar}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lineas.map((m) => {
          const activo = m.activa_en_empresa
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
                {toggling === m.id ? '...' : activo ? 'Activa' : 'Inactiva'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
