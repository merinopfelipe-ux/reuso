import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { crearItemSchema } from '@/lib/schemas/item.schema'

// Catálogo de ítems visibles para esta empresa (globales + restringidos con
// permiso), para el selector "Coincidencia de categoría" del editor de un
// ítem ya cotizado — re-vincula la línea a otro ítem del catálogo maestro.
export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'Inicia sesión para continuar.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'Sin permiso.',
      },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const [{ data: itemsRaw }, { data: permisosDB }] = await Promise.all([
    adminClient.from('items').select('id, nombre, categoria_id, categoria:categoria_id ( nombre ), visibilidad').eq('activo', true),
    adminClient.from('item_permisos_empresa').select('item_id').eq('empresa_id', empresa_id),
  ])

  const idsPermitidos = new Set((permisosDB ?? []).map(p => p.item_id))
  const items = (itemsRaw ?? [])
    .filter(i => i.visibilidad === 'global' || idsPermitidos.has(i.id))
    .map(i => {
      const categoria = Array.isArray(i.categoria) ? i.categoria[0] : i.categoria
      return { id: i.id, nombre: i.nombre, categoria_nombre: categoria?.nombre ?? null }
    })
    .sort((a, b) => (a.categoria_nombre ?? '').localeCompare(b.categoria_nombre ?? '') || a.nombre.localeCompare(b.nombre))

  return NextResponse.json({ items })
}

// Un vendedor (empresa_admin/empleado) crea un "Ítem Maestro" nuevo cuando la
// IA no detectó algo evidente en la foto. Queda usable DE INMEDIATO (nunca
// bloquea la venta) y visible solo para su propia empresa (visibilidad
// 'restringido' + fila en item_permisos_empresa). El factor ambiental queda
// marcado pendiente_revision_co2 para que el super_admin lo audite después —
// no es una cola de aprobación, el ítem ya está en uso mientras tanto.
export async function POST(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'Inicia sesión para continuar.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'No tienes permiso para crear ítems.',
      },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth

  const body = await request.json().catch(() => null)
  const parsed = crearItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos. Revisa el formulario.' }, { status: 400 })
  }

  const { materiales, servicios, insumos, ...itemFields } = parsed.data

  const peso_kg = materiales.reduce((s, m) => s + m.peso_kg, 0)
  const co2_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0)
  const agua_por_unidad = materiales.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0)

  const { data: item, error } = await adminClient
    .from('items')
    .insert({
      ...itemFields,
      peso_kg,
      co2_por_unidad,
      agua_por_unidad,
      nivel_confianza: materiales[0]?.nivel_confianza ?? 'baja',
      origen_fuente: materiales[0]?.origen_fuente ?? null,
      detalle_fuente: materiales[0]?.detalle_fuente ?? null,
      visibilidad: 'restringido',
      pendiente_revision_co2: true,
      creado_por_empresa_id: empresa_id,
      creado_por_user_id: user_id,
    })
    .select()
    .single()

  if (error || !item) {
    console.error('[POST /api/cotizador/items]', error)
    return NextResponse.json({ error: 'Error al crear el ítem.' }, { status: 500 })
  }

  if (materiales.length > 0) {
    const { error: matError } = await adminClient.from('item_materiales').insert(
      materiales.map((m, i) => ({ ...m, item_id: item.id, orden: i }))
    )
    if (matError) {
      await adminClient.from('items').delete().eq('id', item.id)
      return NextResponse.json({ error: 'Error al guardar los materiales del ítem.' }, { status: 500 })
    }
  }

  if (servicios.length > 0) {
    const { error: servError } = await adminClient.from('item_servicios').insert(
      servicios.map((s, i) => ({ ...s, item_id: item.id, orden: i }))
    )
    if (servError) {
      await adminClient.from('items').delete().eq('id', item.id)
      return NextResponse.json({ error: 'Error al guardar los servicios del ítem.' }, { status: 500 })
    }
  }

  if (insumos.length > 0) {
    const { error: insError } = await adminClient.from('item_insumos').insert(
      insumos.map((s, i) => ({ ...s, item_id: item.id, orden: i }))
    )
    if (insError) {
      await adminClient.from('items').delete().eq('id', item.id)
      return NextResponse.json({ error: 'Error al guardar los insumos del ítem.' }, { status: 500 })
    }
  }

  const { error: permisoError } = await adminClient.from('item_permisos_empresa').insert({
    item_id: item.id,
    empresa_id,
    otorgado_por: user_id,
  })
  if (permisoError) {
    await adminClient.from('items').delete().eq('id', item.id)
    return NextResponse.json({ error: 'Error al otorgar el permiso del ítem a tu empresa.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizador_item_maestro_creado',
    detalle: { id: item.id, nombre: item.nombre, empresa_id },
    ip: getIp(request),
  })

  return NextResponse.json(item, { status: 201 })
}
