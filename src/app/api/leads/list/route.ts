import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  const adminClient = await createAdminClient()

  if (perfil?.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Solo para Super Admins' }, { status: 403 })
  }

  // Obtener leads
  const { data: leads, error } = await adminClient
    .from('leads')
    .select('id, nombre, email, empresa, interes, mensaje, estado, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar los leads.' }, { status: 500 })
  }

  return NextResponse.json({ data: leads })
}
