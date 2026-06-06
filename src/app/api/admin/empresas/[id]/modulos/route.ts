import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { patchModuloEmpresaSchema } from '@/lib/schemas/modulo.schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  // Obtener todos los módulos activos con flag de si están asignados a esta empresa
  const { data: modulos, error: errorModulos } = await guard.adminClient
    .from('modulos')
    .select('id, nombre, icono_lucide, descripcion, activo, orden')
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (errorModulos) {
    return NextResponse.json({ error: 'Error al obtener módulos.' }, { status: 500 })
  }

  const { data: asignados, error: errorAsig } = await guard.adminClient
    .from('modulos_empresas')
    .select('modulo_id, activo')
    .eq('empresa_id', params.id)

  if (errorAsig) {
    return NextResponse.json({ error: 'Error al obtener módulos de la empresa.' }, { status: 500 })
  }

  const asignadosMap = new Map(
    (asignados ?? []).map((a) => [a.modulo_id, a.activo])
  )

  const resultado = (modulos ?? []).map((m) => ({
    ...m,
    activo_en_empresa: asignadosMap.get(m.id) ?? false,
  }))

  return NextResponse.json(resultado)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = patchModuloEmpresaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { modulo_id, activo, solo_contar } = parsed.data

  // Si se está desactivando, contar usuarios que perderían acceso
  let usuariosAfectados = 0
  if (!activo) {
    const { count } = await guard.adminClient
      .from('modulos_usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('modulo_id', modulo_id)
      .eq('empresa_id', params.id)
      .eq('activo', true)
    usuariosAfectados = count ?? 0
  }

  // Modo solo_contar: devuelve el conteo sin modificar (para mostrar advertencia antes de confirmar)
  if (solo_contar) {
    return NextResponse.json({ ok: true, usuarios_afectados: usuariosAfectados })
  }

  const { error } = await guard.adminClient
    .from('modulos_empresas')
    .upsert(
      { modulo_id, empresa_id: params.id, activo },
      { onConflict: 'modulo_id,empresa_id' }
    )

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar módulo de empresa.' }, { status: 500 })
  }

  // Si se desactivó, también desactivar asignaciones de usuario
  if (!activo) {
    await guard.adminClient
      .from('modulos_usuarios')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('modulo_id', modulo_id)
      .eq('empresa_id', params.id)
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: activo ? 'activar_modulo_empresa' : 'desactivar_modulo_empresa',
    detalle: { empresa_id: params.id, modulo_id, usuarios_afectados: usuariosAfectados },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, usuarios_afectados: usuariosAfectados })
}
