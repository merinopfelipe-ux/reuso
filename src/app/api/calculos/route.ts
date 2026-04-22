import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Rol } from '@/types'

const LIMITE_USUARIO_LIBRE = 15

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  const empresa_id = perfil?.empresa_id ?? null

  const params = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10))
  const limitParam = parseInt(params.get('limit') ?? '15', 10)
  const desde = params.get('desde') ?? null
  const hasta = params.get('hasta') ?? null
  const categoria = params.get('categoria') ?? null
  const search = params.get('search') ?? null
  const empresaIdFiltro = params.get('empresa_id') ?? null

  // usuario_libre: máximo 15 registros totales, siempre
  const limit = rol === 'usuario_libre' ? LIMITE_USUARIO_LIBRE : Math.min(limitParam, 100)
  const offset = rol === 'usuario_libre' ? 0 : (page - 1) * limit

  const adminClient = await createAdminClient()

  let query = adminClient
    .from('calculos')
    .select('id, user_id, empresa_id, fecha, total_co2, total_agua, detalle_json, created_at, hash_interno, hash_previo', {
      count: 'exact',
    })
    .order('fecha', { ascending: false })

  // Filtro por rol
  if (rol === 'super_admin') {
    if (empresaIdFiltro) query = query.eq('empresa_id', empresaIdFiltro)
  } else if (rol === 'empresa_admin') {
    // empresa_admin ve toda su empresa
    if (empresa_id) {
      query = query.eq('empresa_id', empresa_id)
    } else {
      query = query.eq('user_id', user.id)
    }
  } else {
    // empleado y usuario_libre: solo sus propios registros
    query = query.eq('user_id', user.id)
  }

  // Filtros de fecha
  if (desde) query = query.gte('fecha', `${desde}T00:00:00.000Z`)
  if (hasta) query = query.lte('fecha', `${hasta}T23:59:59.999Z`)

  // Filtro por categoría y búsqueda (Server-side JSONB text search)
  // Nota: Al usar .filter() sobre el cast ::text, buscamos en todo el JSON del detalle
  if (categoria) {
    query = query.filter('detalle_json::text', 'ilike', `%${categoria}%`)
  }
  if (search) {
    query = query.filter('detalle_json::text', 'ilike', `%${search}%`)
  }

  // Paginación
  query = query.range(offset, offset + limit - 1)

  const { data: calculos, count, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Error al cargar el historial.' }, { status: 500 })
  }

  const datos = calculos ?? []

  // Para super_admin y empresa_admin: cargar nombres de usuarios
  let usuariosMap: Map<string, string> = new Map()
  if (rol === 'super_admin' || rol === 'empresa_admin') {
    const userIds = Array.from(new Set(datos.map((c) => c.user_id).filter(Boolean)))
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('user_id, nombre')
        .in('user_id', userIds)
      usuariosMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nombre]))
    }
  }

  const dataConUsuario = datos.map((c) => ({
    ...c,
    usuario_nombre: usuariosMap.get(c.user_id) ?? null,
  }))

  const totalReal = rol === 'usuario_libre' ? Math.min(count ?? 0, LIMITE_USUARIO_LIBRE) : (count ?? 0)

  return NextResponse.json({
    data: dataConUsuario,
    total: totalReal,
    page: rol === 'usuario_libre' ? 1 : page,
    limit,
  })
}
