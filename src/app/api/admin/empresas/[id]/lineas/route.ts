import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { patchLineaNegocioEmpresaSchema } from '@/lib/schemas/linea-negocio.schema'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const empresaId = params.id
  const body = await request.json().catch(() => null)

  const parsed = patchLineaNegocioEmpresaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { linea_negocio_id, activa } = parsed.data

  const { error } = await guard.adminClient
    .from('lineas_negocio_empresas')
    .upsert(
      { empresa_id: empresaId, linea_negocio_id, activa },
      { onConflict: 'linea_negocio_id,empresa_id' }
    )

  if (error) {
    return NextResponse.json({ error: 'Error al asignar la línea de negocio.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_linea_empresa',
    detalle: { empresa_id: empresaId, linea_negocio_id, activa },
    ip: getIp(request),
  })

  return NextResponse.json({ success: true })
}
