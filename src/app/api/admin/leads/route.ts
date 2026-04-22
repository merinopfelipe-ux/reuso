import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { z } from 'zod'

const patchLeadSchema = z.object({
  estado: z.enum(['nuevo', 'contactado', 'convertido', 'descartado']).optional(),
  notas_admin: z.string().max(2000).optional(),
  asignado_a: z.string().uuid().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado')
  const plan = searchParams.get('plan')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const page = parseInt(searchParams.get('page') ?? '0', 10)
  const limit = 20

  let query = guard.adminClient
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (estado) query = query.eq('estado', estado)
  if (plan) query = query.ilike('interes', `%${plan}%`)
  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener leads.' }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0 })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = patchLeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data, error } = await guard.adminClient
    .from('leads')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al actualizar el lead.' }, { status: 500 })

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_lead',
    detalle: { id, cambios: parsed.data },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}
