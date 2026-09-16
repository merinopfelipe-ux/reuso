import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import type { SupabaseClient } from '@supabase/supabase-js'

// Cambiar el precio de referencia de un insumo en la matriz de una
// categoría (categoria_insumos_base) NUNCA actualiza retroactivamente los
// ítems que ya tienen su propia fila en item_insumos — cada ítem guarda una
// copia independiente del precio la primera vez que se guarda. Este
// endpoint es el "sí, aplícalo también a los que ya existen": actualiza el
// precio por nombre de insumo en los ítems de ESTA categoría Y de todas sus
// subcategorías (el árbol completo bajo el nodo editado, ej. editar
// "Muebles" alcanza a Comedor/Sala/Alcoba/... porque cada subcategoría
// nació como una copia independiente de la matriz del padre) — nunca en
// otra rama del catálogo que tenga un insumo con el mismo nombre por
// coincidencia.
const bodySchema = z.object({
  cambios: z.array(z.object({
    nombre: z.string().min(1),
    precio_unitario: z.number().nonnegative(),
  })).min(1),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function idsDelArbol(supabase: SupabaseClient<any>, raizId: string): Promise<string[]> {
  const ids = [raizId]
  let frontera = [raizId]
  while (frontera.length > 0) {
    const { data: hijos } = await supabase.from('categorias').select('id').in('parent_id', frontera)
    const nuevos = (hijos ?? []).map((h: { id: string }) => h.id)
    if (nuevos.length === 0) break
    ids.push(...nuevos)
    frontera = nuevos
  }
  return ids
}

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

  const categoriaIds = await idsDelArbol(guard.supabase, params.id)
  const { data: itemsCat } = await guard.supabase.from('items').select('id').in('categoria_id', categoriaIds)
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
    detalle: { categoria_id: params.id, categorias_alcanzadas: categoriaIds.length, cambios: parsed.data.cambios, filas_actualizadas: actualizados },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, actualizados })
}
