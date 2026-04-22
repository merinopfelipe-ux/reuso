import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

interface LogParams {
  user_id: string | null
  accion: string
  detalle: Record<string, unknown>
  ip: string
}

/**
 * Registra una acción en logs_auditoria usando el cliente con service_role.
 * El INSERT bypasea RLS — solo llamar desde API routes de servidor.
 * No lanza errores — fallo silencioso para no interrumpir la operación principal.
 */
export async function logAuditoria(
  adminClient: AdminClient,
  { user_id, accion, detalle, ip }: LogParams
): Promise<void> {
  await adminClient.from('logs_auditoria').insert({
    user_id,
    accion,
    detalle_json: detalle,
    ip,
  })
}
