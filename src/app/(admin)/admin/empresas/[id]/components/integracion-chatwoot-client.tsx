'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CampoFormulario, CLASE_CAMPO } from '@/components/ui/campo-formulario'
import { SkeletonCard } from '@/components/ui/skeleton'

export function IntegracionChatwootClient({ empresaId }: { empresaId: string }) {
  const [cargando, setCargando] = useState(true)
  const [configurada, setConfigurada] = useState(false)
  const [apiUrl, setApiUrl] = useState('')
  const [accountId, setAccountId] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [activa, setActiva] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [urlWebhook, setUrlWebhook] = useState('')

  useEffect(() => {
    setUrlWebhook(`${window.location.origin}/api/webhooks/chatwoot`)
    fetch(`/api/admin/integraciones/chatwoot?empresa_id=${empresaId}`)
      .then(r => r.json())
      .then(d => {
        setConfigurada(!!d.configurada)
        if (d.integracion) {
          setApiUrl(d.integracion.api_url)
          setAccountId(d.integracion.account_id)
          setActiva(d.integracion.activa)
        }
      })
      .catch(() => setMensaje({ tipo: 'error', texto: 'No se pudo cargar la configuración.' }))
      .finally(() => setCargando(false))
  }, [empresaId])

  async function guardar() {
    setMensaje(null)
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/integraciones/chatwoot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          api_url: apiUrl,
          account_id: accountId,
          api_token: apiToken,
          webhook_secret: webhookSecret,
          activa,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'No se pudo guardar la integración.')
      setConfigurada(true)
      setApiToken('')
      setWebhookSecret('')
      setMensaje({ tipo: 'ok', texto: 'Integración guardada.' })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo guardar la integración.' })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <SkeletonCard lineas={4} />

  return (
    <div className="flex flex-col gap-4">
      <CampoFormulario label="Dirección de tu Chatwoot" hint="Por ejemplo https://app.chatwoot.com">
        <input className={CLASE_CAMPO} value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
      </CampoFormulario>
      <CampoFormulario label="ID de la cuenta" hint="Solo números. Lo ves en la URL de Chatwoot, después de /accounts/.">
        <input className={CLASE_CAMPO} inputMode="numeric" value={accountId} onChange={e => setAccountId(e.target.value.replace(/\D/g, ''))} />
      </CampoFormulario>
      <CampoFormulario label="Token de acceso de la API" hint="Se guarda cifrado. Vuelve a escribirlo cada vez que guardes.">
        <input className={CLASE_CAMPO} type="password" autoComplete="off" value={apiToken} onChange={e => setApiToken(e.target.value)} />
      </CampoFormulario>
      <CampoFormulario label="Secreto del webhook" hint="Al menos 32 caracteres. Debe ser el mismo que pegues en Chatwoot. Se guarda cifrado.">
        <input className={CLASE_CAMPO} type="password" autoComplete="off" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} />
      </CampoFormulario>
      <label className="flex items-center gap-2 text-sm text-(--text-primary)">
        <input type="checkbox" checked={activa} onChange={e => setActiva(e.target.checked)} />
        Integración activa
      </label>
      <p className="text-sm text-(--text-secondary) m-0">
        URL del webhook para pegar en Chatwoot: <span className="font-mono break-all">{urlWebhook}</span>
      </p>
      {mensaje && (
        <p className={`text-sm m-0 ${mensaje.tipo === 'ok' ? 'text-(--text-secondary)' : 'text-[#FF5E4B]'}`}>{mensaje.texto}</p>
      )}
      <div>
        <Button onClick={guardar} loading={guardando}>
          {configurada ? 'Actualizar integración' : 'Guardar integración'}
        </Button>
      </div>
    </div>
  )
}
