import { NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

/**
 * GET /api/empresa/modulos
 * empresa_admin obtiene los módulos activos de su empresa
 * con los usuarios del equipo y su acceso por módulo.
 */
export async function GET() {
  const auth = await dppAuthCheck(['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Solo el administrador puede gestionar módulos.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  // 1. Módulos activos para esta empresa
  const { data: asignados } = await adminClient
    .from('modulos_empresas')
    .select('modulo_id, activo, modulos(id, clave, nombre, icono_lucide, descripcion)')
    .eq('empresa_id', empresa_id)
    .eq('activo', true)

  const modulos = (asignados ?? []).map((a) => {
    const m = Array.isArray(a.modulos) ? a.modulos[0] : a.modulos
    return { ...(m ?? {}), activo_empresa: a.activo }
  })

  // 2. Usuarios del equipo
  const { data: perfiles } = await adminClient
    .from('profiles')
    .select('user_id, nombre, apellido, email, rol')
    .eq('empresa_id', empresa_id)
    .neq('rol', 'empresa_admin')   // admin siempre tiene acceso, no se gestiona

  // 3. Asignaciones usuario-módulo
  const moduloIds = modulos.map((m: { id?: string }) => m.id).filter(Boolean)
  const { data: asignUsuarios } = moduloIds.length > 0
    ? await adminClient
        .from('modulos_usuarios')
        .select('user_id, modulo_id, activo')
        .eq('empresa_id', empresa_id)
        .in('modulo_id', moduloIds)
    : { data: [] }

  return NextResponse.json({
    modulos,
    perfiles: perfiles ?? [],
    asignaciones: asignUsuarios ?? [],
  })
}
