'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export interface InvitacionPendiente {
  id: string
  email: string
  rol_asignado: string
  expires_at: string | null
}

export function InvitacionesPendientesClient({ empresaId, invitaciones }: { empresaId: string; invitaciones: InvitacionPendiente[] }) {
  const router = useRouter()
  const [enviando, setEnviando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  if (invitaciones.length === 0) {
    return <p className="text-sm text-(--text-secondary) m-0">No hay invitaciones pendientes.</p>
  }

  async function reenviar(invId: string, email: string) {
    setEnviando(invId)
    setMensaje(null)
    const res = await fetch(`/api/admin/empresas/${empresaId}/invitaciones/${invId}/reenviar`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setEnviando(null)
    if (!res.ok) {
      setMensaje({ tipo: 'error', texto: data.error ?? 'No se pudo reenviar la invitación.' })
      return
    }
    setMensaje({ tipo: 'ok', texto: `Invitación reenviada a ${email}.` })
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {invitaciones.map((inv) => (
        <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-(--text-primary)">
            <span className="font-medium">{inv.email}</span>
            <span className="text-(--text-secondary)">
              {' · '}{inv.rol_asignado === 'empresa_admin' ? 'administrador' : inv.rol_asignado}
              {inv.expires_at && ` · vence ${new Date(inv.expires_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long' })}`}
            </span>
          </div>
          <div>
            <Button variant="secondary" size="sm" loading={enviando === inv.id} onClick={() => reenviar(inv.id, inv.email)}>
              Reenviar invitación
            </Button>
          </div>
        </div>
      ))}
      {mensaje && (
        <p className={`text-sm m-0 ${mensaje.tipo === 'error' ? 'text-error' : 'text-(--text-secondary)'}`}>{mensaje.texto}</p>
      )}
    </div>
  )
}
