import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function GET() {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const adminClient = await createAdminClient()
  const { data } = await adminClient
    .from('config_sistema')
    .select('email_notificaciones, updated_at')
    .eq('id', 'default')
    .single()

  return NextResponse.json(data ?? { email_notificaciones: 'servicio@lurdes.co' })
}

const patchSchema = z.object({
  email_notificaciones: z.string().email(),
})

export async function PATCH(request: NextRequest) {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('config_sistema')
    .upsert({ id: 'default', email_notificaciones: parsed.data.email_notificaciones, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
