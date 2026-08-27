import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { z } from 'zod'
import { materialesConImpactoSchema } from '@/lib/schemas/dimensiones.schema'

// Panel de auditoría del super_admin: NO es una cola de aprobación (el ítem
// ya está en uso desde que el vendedor lo creó), es donde se completan/
// corrigen los factores ambientales reales y se limpia la bandera.
export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: items, error } = await guard.supabase
    .from('items')
    .select(`
      id, nombre, peso_kg, co2_por_unidad, creado_por_empresa_id, creado_por_user_id, created_at,
      empresas:creado_por_empresa_id ( nombre ),
      item_materiales ( id, nombre, peso_kg, factor_co2_kg, origen_fuente, detalle_fuente, nivel_confianza )
    `)
    .eq('pendiente_revision_co2', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[GET /api/admin/items/pendientes-co2]', error)
    return NextResponse.json({ error: 'Error al cargar los ítems pendientes.' }, { status: 500 })
  }

  return NextResponse.json({ items: items ?? [] })
}

const schema = z.object({
  item_id: z.string().uuid(),
  materiales: materialesConImpactoSchema,
})

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const { item_id, materiales } = parsed.data

  const peso_kg = materiales.reduce((s, m) => s + m.peso_kg, 0)
  const co2_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0)
  const agua_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0)

  const { error: delError } = await guard.supabase.from('item_materiales').delete().eq('item_id', item_id)
  if (delError) {
    return NextResponse.json({ error: 'Error al reemplazar los materiales.' }, { status: 500 })
  }

  const { error: insError } = await guard.supabase.from('item_materiales').insert(
    materiales.map((m, i) => ({ ...m, item_id, orden: i }))
  )
  if (insError) {
    return NextResponse.json({ error: 'Error al guardar los materiales.' }, { status: 500 })
  }

  const { error: updError } = await guard.supabase
    .from('items')
    .update({
      peso_kg,
      co2_por_unidad,
      agua_por_unidad,
      nivel_confianza: materiales[0]?.nivel_confianza ?? 'baja',
      origen_fuente: materiales[0]?.origen_fuente ?? null,
      detalle_fuente: materiales[0]?.detalle_fuente ?? null,
      pendiente_revision_co2: false,
    })
    .eq('id', item_id)

  if (updError) {
    return NextResponse.json({ error: 'Error al actualizar el ítem.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'cotizador_item_co2_revisado',
    detalle: { item_id },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
