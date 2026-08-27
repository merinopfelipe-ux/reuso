import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { crearCategoriaSchema } from '@/lib/schemas/categoria.schema'

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = crearCategoriaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos. Revisa el formulario.' },
      { status: 400 }
    )
  }

  const { materiales_base, servicios_base, insumos_base, ...categoriaFields } = parsed.data

  const { data, error } = await guard.supabase
    .from('categorias')
    .insert(categoriaFields)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al crear la categoría.' }, { status: 500 })
  }

  // Esquema base — molde para sus futuros hijos, nunca participa en cálculos reales.
  const { error: matError } = await guard.supabase.from('categoria_materiales_base').insert(
    materiales_base.map((m, i) => ({ ...m, categoria_id: data.id, orden: i }))
  )
  if (matError) {
    await guard.supabase.from('categorias').delete().eq('id', data.id)
    return NextResponse.json({ error: 'Error al guardar el esquema ambiental base.' }, { status: 500 })
  }

  if (servicios_base.length > 0) {
    const { error: servError } = await guard.supabase.from('categoria_servicios_base').insert(
      servicios_base.map((s, i) => ({ ...s, categoria_id: data.id, orden: i }))
    )
    if (servError) {
      await guard.supabase.from('categorias').delete().eq('id', data.id)
      return NextResponse.json({ error: 'Error al guardar el esquema financiero base.' }, { status: 500 })
    }
  }

  if (insumos_base.length > 0) {
    const { error: insError } = await guard.supabase.from('categoria_insumos_base').insert(
      insumos_base.map((s, i) => ({ ...s, categoria_id: data.id, orden: i }))
    )
    if (insError) {
      await guard.supabase.from('categorias').delete().eq('id', data.id)
      return NextResponse.json({ error: 'Error al guardar el esquema financiero base.' }, { status: 500 })
    }
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'crear_categoria',
    detalle: { id: data.id, nombre: data.nombre, parent_id: data.parent_id },
    ip: getIp(request),
  })

  return NextResponse.json(data, { status: 201 })
}
