import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { patchItemSchema } from '@/lib/schemas/item.schema'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = patchItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  // Snapshot "antes" para la auditoría (Reporte 4, dominio D) — se toma antes
  // de cualquier mutación para que el diff sea real, no un eco de lo que ya
  // se guardó.
  const { data: itemAnterior } = await guard.supabase
    .from('items')
    .select('*')
    .eq('id', params.id)
    .single()

  const { materiales, servicios, insumos, ...itemFields } = parsed.data
  const actualizar: Record<string, unknown> = { ...itemFields }

  // Si vienen materiales, se reemplaza el desglose ambiental completo y se
  // recalcula el rollup. Nunca toca servicios/insumos (dimensión financiera).
  if (materiales) {
    const { error: delError } = await guard.supabase.from('item_materiales').delete().eq('item_id', params.id)
    if (delError) return NextResponse.json({ error: 'Error al actualizar los materiales.' }, { status: 500 })

    if (materiales.length > 0) {
      const { error: insError } = await guard.supabase.from('item_materiales').insert(
        materiales.map((m, i) => ({ ...m, item_id: params.id, orden: i }))
      )
      if (insError) return NextResponse.json({ error: 'Error al guardar los materiales.' }, { status: 500 })
    }

    actualizar.peso_kg = materiales.reduce((s, m) => s + m.peso_kg, 0)
    actualizar.co2_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0)
    actualizar.agua_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0)
    actualizar.nivel_confianza = materiales[0]?.nivel_confianza ?? 'baja'
    actualizar.origen_fuente = materiales[0]?.origen_fuente ?? null
    actualizar.detalle_fuente = materiales[0]?.detalle_fuente ?? null
  }

  // Si vienen servicios/insumos, se reemplaza el desglose financiero completo.
  // Nunca toca item_materiales (dimensión ambiental).
  if (servicios) {
    const { error: delError } = await guard.supabase.from('item_servicios').delete().eq('item_id', params.id)
    if (delError) return NextResponse.json({ error: 'Error al actualizar los servicios.' }, { status: 500 })
    if (servicios.length > 0) {
      const { error: insError } = await guard.supabase.from('item_servicios').insert(
        servicios.map((s, i) => ({ ...s, item_id: params.id, orden: i }))
      )
      if (insError) return NextResponse.json({ error: 'Error al guardar los servicios.' }, { status: 500 })
    }
  }

  if (insumos) {
    const { error: delError } = await guard.supabase.from('item_insumos').delete().eq('item_id', params.id)
    if (delError) return NextResponse.json({ error: 'Error al actualizar los insumos.' }, { status: 500 })
    if (insumos.length > 0) {
      const { error: insError } = await guard.supabase.from('item_insumos').insert(
        insumos.map((s, i) => ({ ...s, item_id: params.id, orden: i }))
      )
      if (insError) return NextResponse.json({ error: 'Error al guardar los insumos.' }, { status: 500 })
    }
  }

  const { data, error } = await guard.supabase
    .from('items')
    .update(actualizar)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar el item.' }, { status: 500 })
  }

  // Solo se registran los campos que realmente cambiaron (no todo el item),
  // con su valor anterior y nuevo — antes solo se guardaban los nombres de
  // los campos, sin poder saber de qué valor a cuál cambió una tarifa/factor.
  const antes: Record<string, unknown> = {}
  for (const key of Object.keys(actualizar)) {
    antes[key] = itemAnterior?.[key] ?? null
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_item',
    detalle: {
      id: params.id,
      antes,
      despues: actualizar,
      materiales_reemplazados: !!materiales,
      servicios_reemplazados: !!servicios,
      insumos_reemplazados: !!insumos,
    },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}
