import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin O/0/I/1 para evitar confusión visual
  let code = ''
  for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST() {
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

  // Reintentar hasta encontrar un código único (muy improbable colisión)
  let codigo = generarCodigo()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await adminClient
      .from('empresas')
      .select('id')
      .eq('codigo_registro', codigo)
      .maybeSingle()
    if (!existing) break
    codigo = generarCodigo()
  }

  const { error } = await adminClient
    .from('empresas')
    .update({ codigo_registro: codigo })
    .eq('id', perfil.empresa_id)

  if (error) {
    console.error('codigo-registro POST error:', error)
    return NextResponse.json({ error: 'No se pudo generar el código.' }, { status: 500 })
  }

  return NextResponse.json({ codigo })
}

export async function DELETE() {
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
  const { error } = await adminClient
    .from('empresas')
    .update({ codigo_registro: null })
    .eq('id', perfil.empresa_id)

  if (error) return NextResponse.json({ error: 'No se pudo eliminar el código.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
