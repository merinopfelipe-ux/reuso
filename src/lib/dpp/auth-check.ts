import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type DppAuthResult =
  | {
      ok: true
      user_id: string
      empresa_id: string
      rol: string
      adminClient: Awaited<ReturnType<typeof createAdminClient>>
    }
  | { ok: false; status: 401 | 403 }

export async function dppAuthCheck(
  rolesPermitidos: string[]
): Promise<DppAuthResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401 }

  const adminClient = await createAdminClient()
  const { data: perfil } = await adminClient
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (!perfil) return { ok: false, status: 401 }

  const esSuperAdmin = perfil.rol === 'super_admin'
  const rolPermitido = esSuperAdmin || rolesPermitidos.includes(perfil.rol)
  if (!rolPermitido) return { ok: false, status: 403 }

  if (!esSuperAdmin && !perfil.empresa_id) return { ok: false, status: 403 }

  return {
    ok: true,
    user_id: user.id,
    empresa_id: perfil.empresa_id ?? '',
    rol: perfil.rol,
    adminClient,
  }
}
