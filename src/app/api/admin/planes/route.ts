import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ver nota en src/app/api/planes/route.ts — evita que Next.js cachee las
// llamadas fetch() internas de Supabase y devuelva datos viejos.
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function guardSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()
  if (perfil?.rol !== 'super_admin') return null
  return user
}

// GET: los 4 planes completos (publicado + borrador), para el panel de edición.
export async function GET() {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('config_planes')
    .select('*')
    .order('precio_cop', { ascending: true })

  if (error) return NextResponse.json({ error: 'No se pudo cargar la configuración de planes' }, { status: 500 })
  return NextResponse.json({ planes: data })
}

// PATCH: guarda el borrador de un plan (no lo publica todavía).
const patchSchema = z.object({
  id: z.enum(['free', 'lab', 'impulso', 'ilimitado']),
  borrador_precio_cop: z.number().nonnegative(),
  borrador_precio_usd: z.number().nonnegative(),
  borrador_precio_eur: z.number().nonnegative(),
  borrador_limite_empleados: z.number().int().positive().nullable(),
  borrador_limite_calculos_mes: z.number().int().nonnegative().nullable(),
  borrador_limite_informes_mes: z.number().int().nonnegative().nullable(),
})

export async function PATCH(request: NextRequest) {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { id, ...borrador } = parsed.data
  const { error } = await adminClient
    .from('config_planes')
    .update({ ...borrador, tiene_borrador_sin_publicar: true, actualizado_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'No se pudo guardar el borrador' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
