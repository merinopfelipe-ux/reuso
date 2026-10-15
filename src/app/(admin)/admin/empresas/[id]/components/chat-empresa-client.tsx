'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ChatEmpresaClient({ empresaId, habilitado: inicial }: { empresaId: string; habilitado: boolean }) {
  const router = useRouter()
  const [habilitado, setHabilitado] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  async function cambiar(nuevo: boolean) {
    setError('')
    setAviso('')
    setGuardando(true)
    const res = await fetch(`/api/admin/empresas/${empresaId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habilitado: nuevo }),
    })
    const data = await res.json().catch(() => ({}))
    setGuardando(false)
    if (!res.ok) {
      setError(data.error ?? 'No se pudo cambiar el chat.')
      return
    }
    setHabilitado(data.chat_habilitado === true)
    if (nuevo && typeof data.agentes === 'number') {
      setAviso(`Agentes sincronizados: ${data.agentes}.${data.fallos?.length ? ` Revisar: ${data.fallos.join(', ')}.` : ''}`)
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-(--text-secondary) m-0">
        {habilitado
          ? 'Chat activo. Quien administra la empresa lo ve en su menú.'
          : 'Chat inactivo. La empresa no ve Chat en su menú.'}
      </p>
      <p className="text-sm text-(--text-secondary) m-0">
        Cada miembro de la empresa es agente del chat mientras el chat esté activo. Entra con un clic desde su menú, sin contraseña nueva.
      </p>
      <div className="flex flex-wrap gap-2">
        {habilitado && (
          <Button variant="primary" size="sm" loading={guardando} onClick={() => cambiar(true)}>
            Sincronizar agentes
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          loading={guardando}
          onClick={() => cambiar(!habilitado)}
        >
          {habilitado ? 'Quitar chat' : 'Activar chat'}
        </Button>
      </div>
      {aviso && <p className="text-sm m-0 text-(--text-secondary)">{aviso}</p>}
      {error && <p className="text-sm m-0 text-error">{error}</p>}
    </div>
  )
}
