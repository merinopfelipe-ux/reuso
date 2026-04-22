import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Rol } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ usuarios: [], empresas: [], calculos: [] })
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  const empresaId = perfil?.empresa_id ?? null
  const adminClient = await createAdminClient()
  const like = `%${q}%`

  if (rol === 'super_admin') {
    const [usuariosRes, empresasRes, calculosRes] = await Promise.all([
      adminClient
        .from('profiles')
        .select('id, nombre, email, rol')
        .or(`nombre.ilike.${like},email.ilike.${like}`)
        .limit(5),
      adminClient.from('empresas').select('id, nombre, plan').ilike('nombre', like).limit(5),
      adminClient
        .from('calculos')
        .select('id, fecha, total_co2, detalle_json')
        .filter('detalle_json::text', 'ilike', like)
        .order('fecha', { ascending: false })
        .limit(5),
    ])
    return NextResponse.json({
      usuarios: usuariosRes.data ?? [],
      empresas: empresasRes.data ?? [],
      calculos: calculosRes.data ?? [],
    })
  }

  if (rol === 'empresa_admin' && empresaId) {
    const [usuariosRes, calculosRes] = await Promise.all([
      adminClient
        .from('profiles')
        .select('id, nombre, email, rol')
        .eq('empresa_id', empresaId)
        .or(`nombre.ilike.${like},email.ilike.${like}`)
        .limit(5),
      adminClient
        .from('calculos')
        .select('id, fecha, total_co2, detalle_json')
        .eq('empresa_id', empresaId)
        .filter('detalle_json::text', 'ilike', like)
        .order('fecha', { ascending: false })
        .limit(5),
    ])
    return NextResponse.json({
      usuarios: usuariosRes.data ?? [],
      empresas: [],
      calculos: calculosRes.data ?? [],
    })
  }

  // empleado / usuario_libre: solo sus propios cálculos
  const { data: calculos } = await adminClient
    .from('calculos')
    .select('id, fecha, total_co2, detalle_json')
    .eq('user_id', user.id)
    .filter('detalle_json::text', 'ilike', like)
    .order('fecha', { ascending: false })
    .limit(5)

  return NextResponse.json({ usuarios: [], empresas: [], calculos: calculos ?? [] })
}
