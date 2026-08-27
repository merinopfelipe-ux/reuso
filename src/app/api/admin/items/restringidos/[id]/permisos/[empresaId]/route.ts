import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

// Revoca el acceso de una empresa a un ítem restringido. No borra el ítem ni
// afecta cotizaciones ya emitidas (esas conservan su snapshot independiente).
export async function DELETE(request: NextRequest, { params }: { params: { id: string; empresaId: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { error } = await guard.adminClient
    .from('item_permisos_empresa')
    .delete()
    .eq('item_id', params.id)
    .eq('empresa_id', params.empresaId)

  if (error) {
    console.error('[DELETE /api/admin/items/restringidos/[id]/permisos/[empresaId]]', error)
    return NextResponse.json({ error: 'Error al revocar el permiso.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'cotizador_item_permiso_revocado',
    detalle: { item_id: params.id, empresa_id: params.empresaId },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
