import type { createAdminClient } from '@/lib/supabase/admin'
import { fetchConTimeout } from '@/lib/ia/fetch-con-timeout'
import { decryptSensitive } from '@/lib/encryption.server'

export type ChatwootConfig = { apiUrl: string; accountId: string; apiToken: string }
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

async function chatwoot(config: ChatwootConfig, path: string, method: 'POST' | 'PUT', body: unknown): Promise<unknown> {
  const url = `${config.apiUrl.replace(/\/$/, '')}/api/v1/accounts/${config.accountId}${path}`
  const res = await fetchConTimeout(
    url,
    {
      method,
      headers: { 'Content-Type': 'application/json', api_access_token: config.apiToken },
      body: JSON.stringify(body),
    },
    8000
  )
  if (!res.ok) throw new Error(`Chatwoot ${method} ${path} respondió ${res.status}`)
  return res.json().catch(() => null)
}

export async function sendMessage(config: ChatwootConfig, conversationId: number, content: string, isPrivate: boolean) {
  return chatwoot(config, `/conversations/${conversationId}/messages`, 'POST', {
    content,
    message_type: 'outgoing',
    private: isPrivate,
  })
}

export async function actualizarTelefonoContacto(config: ChatwootConfig, contactId: number, e164: string) {
  return chatwoot(config, `/contacts/${contactId}`, 'PUT', { phone_number: e164 })
}

export async function cargarIntegracionChatwoot(adminClient: AdminClient, accountId: string) {
  const { data } = await adminClient
    .from('integraciones_empresa')
    .select('empresa_id, api_url, api_token_cifrado, webhook_secret_cifrado, activa')
    .eq('proveedor', 'chatwoot')
    .eq('account_id', accountId)
    .maybeSingle()
  if (!data || !data.activa) return null
  const apiToken = await decryptSensitive(data.api_token_cifrado)
  const webhookSecret = await decryptSensitive(data.webhook_secret_cifrado)
  if (!apiToken || !webhookSecret) return null
  return {
    empresaId: data.empresa_id as string,
    config: { apiUrl: data.api_url as string, accountId, apiToken } satisfies ChatwootConfig,
    webhookSecret,
  }
}
