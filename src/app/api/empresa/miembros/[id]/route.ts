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
  _req: NextRequest,
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
  const { nombre, email } = body

  // Al menos uno debe venir
  if (!nombre && !email) {
    return NextResponse.json({ error: 'Datos no suministrados.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  const { data: miembro } = await adminClient
    .from('profiles')
    .select('id, empresa_id, user_id, email')
    .eq('id', params.id)
    .single()

  if (!miembro) return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })
  if (perfil.rol === 'empresa_admin' && miembro.empresa_id !== perfil.empresa_id) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const updateFields: Record<string, string> = {}

  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'Nombre no válido.' }, { status: 400 })
    }
    updateFields.nombre = nombre.trim()
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email no válido.' }, { status: 400 })
    }
    const emailNormalizado = email.trim().toLowerCase()
    
    // Si el email es distinto al actual, actualizar en auth
    if (emailNormalizado !== miembro.email?.toLowerCase()) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(miembro.user_id, {
        email: emailNormalizado,
        email_confirm: true, // Auto-confirmar el cambio
      })
      if (authError) {
        console.error('Error updating auth email:', authError)
        return NextResponse.json({ error: authError.message ?? 'No se pudo actualizar el email de autenticación.' }, { status: 500 })
      }
      updateFields.email = emailNormalizado
    }
  }

  if (Object.keys(updateFields).length > 0) {
    const { error } = await adminClient
      .from('profiles')
      .update(updateFields)
      .eq('id', params.id)

    if (error) {
      console.error('Error updating profiles table:', error)
      return NextResponse.json({ error: 'No se pudo actualizar el perfil.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
