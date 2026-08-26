import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { patchCategoriaSchema } from '@/lib/schemas/categoria.schema'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = patchCategoriaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { materiales_base, servicios_base, insumos_base, ...categoriaFields } = parsed.data

  // Esquema base: reemplaza el desglose de la dimensión que venga en el body.
  // Nunca toca la dimensión contraria (misma regla que en items).
  if (materiales_base) {
    const { error: delError } = await guard.supabase.from('categoria_materiales_base').delete().eq('categoria_id', params.id)
    if (delError) return NextResponse.json({ error: 'Error al actualizar el esquema ambiental base.' }, { status: 500 })
    const { error: insError } = await guard.supabase.from('categoria_materiales_base').insert(
      materiales_base.map((m, i) => ({ ...m, categoria_id: params.id, orden: i }))
    )
    if (insError) return NextResponse.json({ error: 'Error al guardar el esquema ambiental base.' }, { status: 500 })
  }

  if (servicios_base) {
    const { error: delError } = await guard.supabase.from('categoria_servicios_base').delete().eq('categoria_id', params.id)
    if (delError) return NextResponse.json({ error: 'Error al actualizar el esquema financiero base.' }, { status: 500 })
    if (servicios_base.length > 0) {
      const { error: insError } = await guard.supabase.from('categoria_servicios_base').insert(
        servicios_base.map((s, i) => ({ ...s, categoria_id: params.id, orden: i }))
      )
      if (insError) return NextResponse.json({ error: 'Error al guardar el esquema financiero base.' }, { status: 500 })
    }
  }

  if (insumos_base) {
    const { error: delError } = await guard.supabase.from('categoria_insumos_base').delete().eq('categoria_id', params.id)
    if (delError) return NextResponse.json({ error: 'Error al actualizar el esquema financiero base.' }, { status: 500 })
    if (insumos_base.length > 0) {
      const { error: insError } = await guard.supabase.from('categoria_insumos_base').insert(
        insumos_base.map((s, i) => ({ ...s, categoria_id: params.id, orden: i }))
      )
      if (insError) return NextResponse.json({ error: 'Error al guardar el esquema financiero base.' }, { status: 500 })
    }
  }

  // Un PATCH puede traer SOLO el esquema base (materiales/servicios/insumos)
  // sin tocar ningún campo de la categoría en sí — es lo que hace el editor
  // de un ítem al propagar un cambio de material a toda su categoría. En ese
  // caso `categoriaFields` queda vacío y un `update({})` revienta contra
  // Postgres, devolviendo 500 aunque el esquema ya se hubiera guardado bien
  // (bug real: la pantalla mostraba error habiendo guardado). Cuando no hay
  // campos propios que actualizar, solo se relee la categoría.
  const hayCamposCategoria = Object.keys(categoriaFields).length > 0
  const consulta = guard.supabase.from('categorias')
  const { data, error } = hayCamposCategoria
    ? await consulta.update(categoriaFields).eq('id', params.id).select().single()
    : await consulta.select().eq('id', params.id).single()

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar la categoría.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_categoria',
    detalle: { id: params.id, cambios: Object.keys(parsed.data) },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}
