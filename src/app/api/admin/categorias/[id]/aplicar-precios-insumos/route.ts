import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

// Cambiar el precio de referencia de un insumo en la matriz de una
// categoría (categoria_insumos_base) NUNCA actualiza retroactivamente los
// ítems que ya tienen su propia fila en item_insumos — cada ítem guarda una
// copia independiente del precio la primera vez que se guarda. Este
// endpoint es el "sí, aplícalo también a los que ya existen": actualiza el
// precio por nombre de insumo, solo en los ítems de ESTA categoría (nunca
// en otras categorías que puedan tener un insumo con el mismo nombre).
const bodySchema = z.object({
  cambios: z.array(z.object({
    nombre: z.string().min(1),
    precio_unitario: z.number().nonnegative(),
  })).min(1),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data: itemsCat } = await guard.supabase.from('items').select('id').eq('categoria_id', params.id)
  const itemIds = (itemsCat ?? []).map((i) => i.id)

  let actualizados = 0
  if (itemIds.length > 0) {
    for (const cambio of parsed.data.cambios) {
      const { count, error } = await guard.supabase
        .from('item_insumos')
        .update({ precio_unitario: cambio.precio_unitario }, { count: 'exact' })
        .eq('nombre', cambio.nombre)
        .in('item_id', itemIds)

      if (error) {
        return NextResponse.json({ error: 'Error al aplicar el precio a los ítems existentes.' }, { status: 500 })
      }
      actualizados += count ?? 0
    }
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'aplicar_precio_insumo_existentes',
    detalle: { categoria_id: params.id, cambios: parsed.data.cambios, filas_actualizadas: actualizados },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, actualizados })
}
