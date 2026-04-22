import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2).max(100),
  apellido: z.string().max(100).optional().nullable(),
  apodo: z.string().max(15).optional().nullable(),
  rol: z.enum(['empleado', 'empresa_admin', 'super_admin']),
  empresa_id: z.string().uuid().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    user_metadata: {
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido ?? null,
      apodo: parsed.data.apodo ?? null,
      rol: parsed.data.rol,
    },
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Error al crear usuario' }, { status: 400 })
  }

  // El trigger de Supabase debería crear el perfil, pero lo aseguramos con upsert
  const { error: profileError } = await adminClient.from('profiles').upsert({
    user_id: newUser.user.id,
    nombre: parsed.data.nombre,
    apellido: parsed.data.apellido ?? null,
    apodo: parsed.data.apodo ?? null,
    email: parsed.data.email,
    rol: parsed.data.rol,
    empresa_id: parsed.data.empresa_id ?? null,
  }, { onConflict: 'user_id' })

  if (profileError) {
    // Rollback: eliminar usuario creado
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
