import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { crearAlertaSchema } from '@/lib/schemas/alerta.schema'

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = crearAlertaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos. Revisa el formulario.' }, { status: 400 })
  }

  const { data, error } = await guard.supabase
    .from('alertas')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al crear la alerta.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'crear_alerta',
    detalle: { id: data.id, titulo: data.titulo, tipo: data.tipo },
    ip: getIp(request),
  })

  return NextResponse.json(data, { status: 201 })
}
