import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

const schema = z.object({ empresa_id: z.string().uuid() })

// Otorga acceso de un ítem restringido a OTRA empresa específica (no la que
// lo creó, que ya tiene su propio permiso automático desde POST /api/cotizador/items).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Selecciona una empresa válida.' }, { status: 400 })
  }

  const { error } = await guard.adminClient.from('item_permisos_empresa').insert({
    item_id: params.id,
    empresa_id: parsed.data.empresa_id,
    otorgado_por: guard.user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Esa empresa ya tiene acceso a este ítem.' }, { status: 409 })
    }
    console.error('[POST /api/admin/items/restringidos/[id]/permisos]', error)
    return NextResponse.json({ error: 'Error al otorgar el permiso.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'cotizador_item_permiso_otorgado',
    detalle: { item_id: params.id, empresa_id: parsed.data.empresa_id },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
