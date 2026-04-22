import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { crearItemSchema } from '@/lib/schemas/item.schema'

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = crearItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos. Revisa el formulario.' }, { status: 400 })
  }

  const { data, error } = await guard.supabase
    .from('items')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al crear el item.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'crear_item',
    detalle: { id: data.id, nombre: data.nombre, categoria_id: data.categoria_id },
    ip: getIp(request),
  })

  return NextResponse.json(data, { status: 201 })
}
