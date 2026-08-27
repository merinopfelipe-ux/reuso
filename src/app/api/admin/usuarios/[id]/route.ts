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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  if (params.id === guard.user.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 400 })
  }

  const { data: perfil } = await guard.adminClient
    .from('profiles')
    .select('rol, nombre, email, empresa_id')
    .eq('user_id', params.id)
    .single()

  if (!perfil) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
  }

  // Una empresa siempre tiene exactamente un empresa_admin (regla del
  // negocio) — borrar al único admin la dejaría sin nadie que la gestione.
  if (perfil.rol === 'empresa_admin') {
    return NextResponse.json(
      { error: 'Esta empresa se quedaría sin administrador. Reasigna un nuevo admin primero desde su ficha, o elimina la empresa completa.' },
      { status: 409 }
    )
  }

  const { error } = await guard.adminClient.auth.admin.deleteUser(params.id)
  if (error) {
    return NextResponse.json({ error: 'Error al eliminar el usuario.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'eliminar_usuario',
    detalle: { target_user_id: params.id, nombre: perfil.nombre, email: perfil.email, rol: perfil.rol },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
