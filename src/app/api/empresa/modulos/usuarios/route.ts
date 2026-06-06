import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

const schema = z.object({
  user_id:   z.uuid('ID de usuario inválido.'),
  modulo_id: z.uuid('ID de módulo inválido.'),
  activo:    z.boolean(),
})

/**
 * PATCH /api/empresa/modulos/usuarios
 * empresa_admin activa o desactiva acceso de un usuario a un módulo.
 */
export async function PATCH(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Solo el administrador puede gestionar el acceso.' },
      { status: auth.status }
    )
  }
  const { user_id: adminId, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }
  const { user_id, modulo_id, activo } = parsed.data

  // Verificar que el usuario objetivo pertenece a esta empresa
  const { data: perfil } = await adminClient
    .from('profiles')
    .select('user_id, nombre')
    .eq('user_id', user_id)
    .eq('empresa_id', empresa_id)
    .single()

  if (!perfil) {
    return NextResponse.json({ error: 'Usuario no encontrado en tu empresa.' }, { status: 404 })
  }

  // Verificar que el módulo está activo para la empresa
  const { data: modEmpresa } = await adminClient
    .from('modulos_empresas')
    .select('activo')
    .eq('modulo_id', modulo_id)
    .eq('empresa_id', empresa_id)
    .single()

  if (!modEmpresa || !modEmpresa.activo) {
    return NextResponse.json({ error: 'El módulo no está activo para tu empresa.' }, { status: 422 })
  }

  const { error } = await adminClient
    .from('modulos_usuarios')
    .upsert(
      { user_id, modulo_id, empresa_id, activo, asignado_por: adminId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,modulo_id,empresa_id' }
    )

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar el acceso.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id: adminId,
    accion: activo ? 'dar_acceso_modulo_usuario' : 'quitar_acceso_modulo_usuario',
    detalle: { user_id_objetivo: user_id, modulo_id, empresa_id, activo },
    ip,
  })

  return NextResponse.json({ ok: true })
}
