'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ChatEmpresaClient({ empresaId, habilitado: inicial }: { empresaId: string; habilitado: boolean }) {
  const router = useRouter()
  const [habilitado, setHabilitado] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cambiar(nuevo: boolean) {
    setError('')
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
        Al activarlo, quien administra la empresa recibe un correo para crear su contraseña.
      </p>
      <div>
        <Button
          variant={habilitado ? 'secondary' : 'primary'}
          size="sm"
          loading={guardando}
          onClick={() => cambiar(!habilitado)}
        >
          {habilitado ? 'Quitar chat' : 'Activar chat'}
        </Button>
      </div>
      {error && <p className="text-sm m-0 text-error">{error}</p>}
    </div>
  )
}
