import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { z } from 'zod'

const anularSchema = z.object({
  motivo_anulacion: z.string().min(5, 'El motivo debe tener al menos 5 caracteres.').max(500),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const empresa_id = searchParams.get('empresa_id')
  const user_id = searchParams.get('user_id')
  const estado = searchParams.get('estado')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const page = parseInt(searchParams.get('page') ?? '0', 10)
  const limit = 20

  let query = guard.adminClient
    .from('calculos')
    .select(`
      id, user_id, empresa_id, fecha, total_co2, total_agua, estado,
      motivo_anulacion, anulado_en, created_at,
      profiles!calculos_user_id_fkey(nombre, apellido),
      empresas!calculos_empresa_id_fkey(nombre)
    `, { count: 'exact' })
    .order('fecha', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (empresa_id) query = query.eq('empresa_id', empresa_id)
  if (user_id) query = query.eq('user_id', user_id)
  if (estado) query = query.eq('estado', estado)
  if (desde) query = query.gte('fecha', desde)
  if (hasta) query = query.lte('fecha', hasta)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener cálculos.' }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0 })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = anularSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { error } = await guard.adminClient
    .from('calculos')
    .update({
      estado: 'anulado',
      motivo_anulacion: parsed.data.motivo_anulacion,
      anulado_por: guard.user.id,
      anulado_en: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al anular el cálculo.' }, { status: 500 })

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'anular_calculo',
    detalle: { id, motivo: parsed.data.motivo_anulacion },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
