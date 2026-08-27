import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { patchLineaNegocioSchema } from '@/lib/schemas/linea-negocio.schema'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { id } = params
  const body = await request.json().catch(() => null)

  const parsed = patchLineaNegocioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data, error } = await guard.adminClient
    .from('lineas_negocio')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'La clave ya está en uso.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar la línea de negocio.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_linea_negocio',
    detalle: { id, cambios: parsed.data },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}
