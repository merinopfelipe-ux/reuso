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

  const { materiales, servicios, insumos, ...itemFields } = parsed.data

  // Rollup ambiental (Tabla B) — nunca incluye datos financieros
  const peso_kg = materiales.reduce((s, m) => s + m.peso_kg, 0)
  const co2_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0)
  const agua_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0)

  const { data: item, error } = await guard.supabase
    .from('items')
    .insert({
      ...itemFields,
      peso_kg,
      co2_por_unidad,
      agua_por_unidad,
      nivel_confianza: materiales[0]?.nivel_confianza ?? 'baja',
      origen_fuente: materiales[0]?.origen_fuente ?? null,
      detalle_fuente: materiales[0]?.detalle_fuente ?? null,
    })
    .select()
    .single()

  if (error || !item) {
    return NextResponse.json({ error: 'Error al crear el item.' }, { status: 500 })
  }

  // Insertar dimensiones hijas por separado (nunca se mezclan entre sí)
  if (materiales.length > 0) {
    const { error: matError } = await guard.supabase.from('item_materiales').insert(
      materiales.map((m, i) => ({ ...m, item_id: item.id, orden: i }))
    )
    if (matError) {
      await guard.supabase.from('items').delete().eq('id', item.id)
      return NextResponse.json({ error: 'Error al guardar los materiales del item.' }, { status: 500 })
    }
  }

  if (servicios.length > 0) {
    const { error: servError } = await guard.supabase.from('item_servicios').insert(
      servicios.map((s, i) => ({ ...s, item_id: item.id, orden: i }))
    )
    if (servError) {
      await guard.supabase.from('items').delete().eq('id', item.id)
      return NextResponse.json({ error: 'Error al guardar los servicios del item.' }, { status: 500 })
    }
  }

  if (insumos.length > 0) {
    const { error: insError } = await guard.supabase.from('item_insumos').insert(
      insumos.map((s, i) => ({ ...s, item_id: item.id, orden: i }))
    )
    if (insError) {
      await guard.supabase.from('items').delete().eq('id', item.id)
      return NextResponse.json({ error: 'Error al guardar los insumos del item.' }, { status: 500 })
    }
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'crear_item',
    detalle: { id: item.id, nombre: item.nombre, categoria_id: item.categoria_id },
    ip: getIp(request),
  })

  return NextResponse.json(item, { status: 201 })
}
