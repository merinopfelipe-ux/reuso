import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getPerfilYEmpresa(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()
  return perfil ? { ...perfil, userId: user.id } : null
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const perfil = await getPerfilYEmpresa(supabase)
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  if (perfil.rol !== 'empresa_admin' && perfil.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const adminClient = await createAdminClient()

  const { data: miembro } = await adminClient
    .from('profiles')
    .select('id, empresa_id, rol')
    .eq('id', params.id)
    .single()

  if (!miembro) return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })
  if (perfil.rol === 'empresa_admin' && miembro.empresa_id !== perfil.empresa_id) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }
  if (miembro.rol === 'super_admin') {
    return NextResponse.json({ error: 'No puedes remover a un super administrador.' }, { status: 403 })
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ empresa_id: null, rol: 'usuario_libre' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'No se pudo remover al miembro.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const perfil = await getPerfilYEmpresa(supabase)
  if (!perfil) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  if (perfil.rol !== 'empresa_admin' && perfil.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const body = await req.json()
  const { nombre } = body
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'Nombre requerido.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  const { data: miembro } = await adminClient
    .from('profiles')
    .select('id, empresa_id')
    .eq('id', params.id)
    .single()

  if (!miembro) return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })
  if (perfil.rol === 'empresa_admin' && miembro.empresa_id !== perfil.empresa_id) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ nombre: nombre.trim() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'No se pudo actualizar el nombre.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
