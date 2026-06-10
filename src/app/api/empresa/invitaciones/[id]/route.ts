import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'empresa_admin' && perfil?.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const adminClient = await createAdminClient()

  // Verificar que la invitación pertenece a la empresa del usuario
  const { data: inv } = await adminClient
    .from('invitaciones')
    .select('id, empresa_id, estado')
    .eq('id', params.id)
    .single()

  if (!inv) {
    return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
  }

  // super_admin puede eliminar cualquiera; empresa_admin solo las de su empresa
  if (perfil.rol === 'empresa_admin' && inv.empresa_id !== perfil.empresa_id) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const { error } = await adminClient
    .from('invitaciones')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('DELETE invitacion error:', error)
    return NextResponse.json({ error: 'No se pudo eliminar la invitación.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'empresa_admin' && perfil?.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const body = await req.json()
  const { email } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  const { data: inv } = await adminClient
    .from('invitaciones')
    .select('id, empresa_id, estado')
    .eq('id', params.id)
    .single()

  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
  if (perfil.rol === 'empresa_admin' && inv.empresa_id !== perfil.empresa_id) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }
  if (inv.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Solo se pueden editar invitaciones pendientes.' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('invitaciones')
    .update({ email: email.trim().toLowerCase() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'No se pudo actualizar el email.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
