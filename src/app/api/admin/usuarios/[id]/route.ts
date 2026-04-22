import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { patchUsuarioSchema } from '@/lib/schemas/usuario.schema'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = patchUsuarioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })
  }

  // Prevenir que el super_admin se quite su propio rol
  if (params.id === guard.user.id && parsed.data.rol !== 'super_admin') {
    return NextResponse.json(
      { error: 'No puedes cambiar tu propio rol de super_admin.' },
      { status: 400 }
    )
  }

  const { data, error } = await guard.supabase
    .from('profiles')
    .update({ rol: parsed.data.rol })
    .eq('user_id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar el rol.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'cambiar_rol_usuario',
    detalle: { target_user_id: params.id, nuevo_rol: parsed.data.rol },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}
