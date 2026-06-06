import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

const querySchema = z.object({
  estado: z.enum(['activo', 'en_reuso', 'disposicion_final', 'archivado']).optional(),
  categoria_id: z.uuid().optional(),
  empresa_id: z.uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso.' },
      { status: auth.status }
    )
  }
  const { rol, empresa_id, adminClient } = auth

  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros de búsqueda inválidos.' }, { status: 400 })
  }
  const { estado, categoria_id, empresa_id: queryEmpresaId, page, limit } = parsed.data
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = adminClient
    .from('dpp_activos')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (rol === 'super_admin') {
    if (queryEmpresaId) {
      query = query.eq('empresa_id', queryEmpresaId)
    }
  } else {
    query = query.eq('empresa_id', empresa_id)
  }

  if (estado) query = query.eq('estado', estado)
  if (categoria_id) query = query.eq('categoria_id', categoria_id)

  const { data: activos, count, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Error al cargar los activos.' }, { status: 500 })
  }

  return NextResponse.json({ data: activos ?? [], total: count ?? 0, page, limit })
}
