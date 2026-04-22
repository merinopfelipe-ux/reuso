import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

type SupabaseClient = ReturnType<typeof createClient>
type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

type GuardSuccess = {
  supabase: SupabaseClient
  adminClient: AdminClient
  user: User
  error: null
}

type GuardError = {
  supabase: null
  adminClient: null
  user: null
  error: NextResponse
}

/**
 * Verifica autenticación + rol super_admin.
 * Usar al inicio de cada API route de admin.
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<GuardSuccess | GuardError> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase: null,
      adminClient: null,
      user: null,
      error: NextResponse.json({ error: 'No autorizado.' }, { status: 401 }),
    }
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') {
    return {
      supabase: null,
      adminClient: null,
      user: null,
      error: NextResponse.json(
        { error: 'Acceso denegado. Se requiere rol de administrador.' },
        { status: 403 }
      ),
    }
  }

  void ip // disponible para el llamador si lo necesita

  return {
    supabase,
    adminClient: await createAdminClient(),
    user,
    error: null,
  }
}

export function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}
