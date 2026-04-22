import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

const bodySchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  sector: z.string().min(1).max(80).nullable().optional(),
  logo_url: z.string().url('URL de logo inválida.').nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'empresa_admin') {
    return NextResponse.json({ error: 'Solo el administrador de empresa puede editar la configuración.' }, { status: 403 })
  }

  if (!perfil.empresa_id) {
    return NextResponse.json({ error: 'No tienes empresa asociada.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const updates = parsed.data
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay cambios para guardar.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('empresas')
    .update(updates)
    .eq('id', perfil.empresa_id)

  if (error) {
    return NextResponse.json({ error: 'Error al guardar los cambios.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'empresa_config_actualizada',
    detalle: { empresa_id: perfil.empresa_id, campos: Object.keys(updates) },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
