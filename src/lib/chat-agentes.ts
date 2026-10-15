// Agentes del chat de cada empresa. Regla: un miembro es agente de Chatwoot solo
// mientras su empresa tiene el chat activo. Quien no tiene empresa o tiene el
// chat apagado no tiene acceso al chat de esa empresa.
import { asignarAgente, quitarAgente, crearUsuarioChat } from '@/lib/chatwoot-plataforma'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

async function cuentaDeEmpresa(admin: AdminClient, empresaId: string): Promise<{ cuenta: number | null; activo: boolean }> {
  const { data } = await admin
    .from('empresas')
    .select('chat_habilitado, chat_account_id')
    .eq('id', empresaId)
    .maybeSingle()
  return { cuenta: data?.chat_account_id ?? null, activo: data?.chat_habilitado === true }
}

// Un miembro entra al chat cuando se une a una empresa con chat activo.
export async function agregarMiembroAlChat(
  admin: AdminClient,
  empresaId: string,
  miembro: { nombre: string; email: string; rol?: string }
): Promise<void> {
  const { cuenta, activo } = await cuentaDeEmpresa(admin, empresaId)
  if (!activo || cuenta == null) return
  const usuarioId = await crearUsuarioChat({ nombre: miembro.nombre || miembro.email, email: miembro.email })
  await asignarAgente(cuenta, usuarioId, miembro.rol === 'empresa_admin' ? 'administrator' : 'agent')
}

// Un miembro sale del chat cuando sale de la empresa.
export async function quitarMiembroDelChat(
  admin: AdminClient,
  empresaId: string,
  miembro: { nombre: string; email: string }
): Promise<void> {
  const { cuenta } = await cuentaDeEmpresa(admin, empresaId)
  if (cuenta == null) return
  const usuarioId = await crearUsuarioChat({ nombre: miembro.nombre || miembro.email, email: miembro.email })
  await quitarAgente(cuenta, usuarioId)
}

// Pone a todos los miembros de la empresa como agentes (activo) o los quita (desactivar).
// Un fallo en uno no detiene a los demás: devuelve la lista de correos que fallaron.
export async function sincronizarAgentesEmpresa(
  admin: AdminClient,
  empresaId: string,
  activo: boolean
): Promise<{ total: number; fallos: string[] }> {
  const { cuenta } = await cuentaDeEmpresa(admin, empresaId)
  // Los super admin no son agentes de la empresa: su acceso al chat es el del panel de admin.
  const { data: miembros } = await admin
    .from('profiles')
    .select('nombre, apellido, email, rol')
    .eq('empresa_id', empresaId)
    .neq('rol', 'super_admin')
  const conCorreo = (miembros ?? []).filter((m) => m.email)
  if (cuenta == null) return { total: conCorreo.length, fallos: conCorreo.map((m) => m.email as string) }

  const fallos: string[] = []
  for (const m of conCorreo) {
    try {
      const nombre = [m.nombre, m.apellido].filter(Boolean).join(' ') || (m.email as string)
      const usuarioId = await crearUsuarioChat({ nombre, email: m.email as string })
      if (activo) await asignarAgente(cuenta, usuarioId, m.rol === 'empresa_admin' ? 'administrator' : 'agent')
      else await quitarAgente(cuenta, usuarioId)
    } catch (err) {
      console.error('[chat-agentes]', m.email, err instanceof Error ? err.message : err)
      fallos.push(m.email as string)
    }
  }
  return { total: conCorreo.length, fallos }
}
