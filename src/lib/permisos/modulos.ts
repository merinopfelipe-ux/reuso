import { createAdminClient } from '@/lib/supabase/admin'

export type ClaveMódulo = 'cotizador_crm'

/**
 * Verifica si un usuario puede acceder a un módulo específico.
 * Requiere dos condiciones:
 *   1. La empresa del usuario tiene el módulo activo (modulos_empresas).
 *   2. El usuario tiene acceso al módulo (modulos_usuarios activo = true),
 *      O no existe registro aún en modulos_usuarios (el empresa_admin aún no
 *      restringió - en ese caso, si la empresa lo tiene activo, el empleado accede).
 *
 * El super_admin siempre tiene acceso.
 */
export async function puedeAccederModulo(
  userId: string,
  empresaId: string,
  rol: string,
  clave: ClaveMódulo
): Promise<boolean> {
  // super_admin siempre puede
  if (rol === 'super_admin') return true

  const adminClient = await createAdminClient()

  // 1. Buscar el id del módulo por clave
  const { data: modulo } = await adminClient
    .from('modulos')
    .select('id')
    .eq('clave', clave)
    .eq('activo', true)
    .single()

  if (!modulo) return false

  // 2. Verificar que la empresa tiene el módulo activo
  const { data: modEmpresa } = await adminClient
    .from('modulos_empresas')
    .select('activo')
    .eq('modulo_id', modulo.id)
    .eq('empresa_id', empresaId)
    .single()

  if (!modEmpresa || !modEmpresa.activo) return false

  // 3. Verificar acceso del usuario (si existe restricción explícita)
  const { data: modUsuario } = await adminClient
    .from('modulos_usuarios')
    .select('activo')
    .eq('user_id', userId)
    .eq('modulo_id', modulo.id)
    .eq('empresa_id', empresaId)
    .single()

  // Si no hay registro de usuario → hereda el acceso de la empresa (activo)
  if (!modUsuario) return true

  return modUsuario.activo === true
}

/**
 * Versión ligera para middleware: consulta directa sin abstracción extra.
 * Retorna false en cualquier error (fail-safe).
 */
export async function puedeAccederModuloMW(
  userId: string,
  empresaId: string | null,
  rol: string,
  clave: ClaveMódulo
): Promise<boolean> {
  if (rol === 'super_admin') return true
  if (!empresaId) return false
  try {
    return await puedeAccederModulo(userId, empresaId, rol, clave)
  } catch {
    return false
  }
}
