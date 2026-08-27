import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

export interface AutorBasico {
  nombre: string | null
  apellido?: string | null
  apodo?: string | null
  avatar_url?: string | null
  rol?: string | null
  email?: string | null
}

// Resuelve el nombre de quien hizo algo (un cálculo, un mensaje, una nota)
// SIN el embed implícito de PostgREST (`profiles(...)`, `profiles:user_id(...)`,
// `profiles!tabla_user_id_fkey(...)`). Todas esas columnas `user_id` referencian
// `auth.users(id)`, no `profiles(id)` — PostgREST no encuentra esa relación y
// rechaza la consulta COMPLETA con un error 400, no solo el campo del autor.
// Encontrado repetido en 5 lugares distintos del proyecto (2026-08-27):
// /admin, /admin/calculos (página y API), el hilo de tickets y el reporte de
// rentabilidad — cada uno lo había resuelto o lo dejaba roto por su cuenta.
export async function resolverAutores(
  adminClient: AdminClient,
  userIds: (string | null | undefined)[],
  columnas = 'user_id, nombre, apellido'
): Promise<Map<string, AutorBasico>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))))
  if (ids.length === 0) return new Map()

  const { data } = await adminClient.from('profiles').select(columnas).in('user_id', ids)
  return new Map(
    (data ?? []).map((p) => {
      const fila = p as unknown as { user_id: string } & AutorBasico
      return [fila.user_id, fila]
    })
  )
}
