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
  const [copiado, setCopiado] = useState('')

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

  function generarSecreto() {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    setWebhookSecret(Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''))
  }

  async function copiar(texto: string, clave: string) {
    if (!texto) return
    await navigator.clipboard.writeText(texto)
    setCopiado(clave)
    setTimeout(() => setCopiado(''), 2000)
  }

  if (cargando) return <SkeletonCard lineas={4} />

  return (
    <div className="flex flex-col gap-4">
      <ol className="text-sm text-(--text-secondary) m-0 pl-5 list-decimal flex flex-col gap-1">
        <li>En Chatwoot, abre tu perfil y copia el token de acceso. Pégalo en el campo de abajo.</li>
        <li>Genera un secreto nuevo con el botón correspondiente, o escribe uno de al menos 20 caracteres.</li>
        <li>En Chatwoot, ve a Configuración, Integraciones, Webhooks, y agrega la URL del webhook con ese mismo secreto.</li>
        <li>Guarda aquí y envía un mensaje de prueba desde WhatsApp.</li>
      </ol>
      <CampoFormulario label="Dirección de tu Chatwoot" hint="Por ejemplo https://app.chatwoot.com">
        <input className={CLASE_CAMPO} value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
      </CampoFormulario>
      <CampoFormulario label="ID de la cuenta" hint="Solo números. Lo ves en la URL de Chatwoot, después de /accounts/.">
        <input className={CLASE_CAMPO} inputMode="numeric" value={accountId} onChange={e => setAccountId(e.target.value.replace(/\D/g, ''))} />
      </CampoFormulario>
      <CampoFormulario label="Token de acceso de la API" hint="Se guarda cifrado. Vuelve a escribirlo cada vez que guardes.">
        <input className={CLASE_CAMPO} type="password" autoComplete="off" value={apiToken} onChange={e => setApiToken(e.target.value)} />
      </CampoFormulario>
      <CampoFormulario label="Secreto del webhook" hint="Al menos 20 caracteres. Debe ser el mismo que aparece en Chatwoot. Se guarda cifrado.">
        <input className={CLASE_CAMPO} type="password" autoComplete="off" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} />
      </CampoFormulario>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={generarSecreto}>Generar secreto</Button>
        <Button variant="secondary" size="sm" onClick={() => copiar(webhookSecret, 'secreto')} disabled={!webhookSecret}>
          {copiado === 'secreto' ? 'Copiado' : 'Copiar secreto'}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-(--text-primary)">
        <input type="checkbox" checked={activa} onChange={e => setActiva(e.target.checked)} />
        Integración activa
      </label>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-(--text-secondary) m-0">
          URL del webhook para pegar en Chatwoot: <span className="font-mono break-all">{urlWebhook}</span>
        </p>
        <div>
          <Button variant="secondary" size="sm" onClick={() => copiar(urlWebhook, 'url')}>
            {copiado === 'url' ? 'Copiado' : 'Copiar URL del webhook'}
          </Button>
        </div>
      </div>
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
