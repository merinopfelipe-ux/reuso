import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

// Catálogo completo de servicios/insumos de un Ítem Maestro — lo usa
// EditarMuebleModal para mostrar SIEMPRE todas las líneas editables del
// ítem, no solo las que quedaron con valor distinto de 0 en el snapshot de
// la cotización (crm_muebles_cotizados.servicios_json/insumos_json).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status === 400 ? 401 : auth.status }
    )
  }
  const { adminClient } = auth

  const { data: item, error } = await adminClient
    .from('items')
    .select('id, nombre, item_servicios(nombre, precio, orden), item_insumos(nombre, cantidad, unidad, precio_unitario, orden), item_materiales(nombre, peso_kg, factor_co2_kg, factor_agua_l_kg, categoria_material, origen_fuente, detalle_fuente, nivel_confianza, orden)')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/cotizador/items/[id]]', error)
    return NextResponse.json({ error: 'Error al cargar el ítem.' }, { status: 500 })
  }
  if (!item) {
    return NextResponse.json({ error: 'Ítem no encontrado.' }, { status: 404 })
  }

  return NextResponse.json({
    nombre: item.nombre,
    servicios: (item.item_servicios ?? []).sort((a, b) => a.orden - b.orden),
    insumos: (item.item_insumos ?? []).sort((a, b) => a.orden - b.orden),
    materiales: (item.item_materiales ?? []).sort((a, b) => a.orden - b.orden),
  })
}

// Borra un Ítem Maestro que el vendedor de SU PROPIA empresa creó (o
// cualquiera si es super_admin). El ON DELETE CASCADE de item_permisos_empresa
// (migración 035) borra sus permisos automáticamente al borrar la fila de
// items — no se hace un borrado doble desde aquí, se confía en Postgres.
// Las cotizaciones ya emitidas conservan su snapshot (materiales_json/
// servicios_json/insumos_json en crm_muebles_cotizados) intacto porque
// crm_muebles_cotizados.item_id es ON DELETE SET NULL, no CASCADE.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'Inicia sesión para continuar.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'No tienes permiso para borrar ítems.',
      },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, rol, adminClient } = auth

  const { data: item, error: fetchError } = await adminClient
    .from('items')
    .select('id, nombre, creado_por_empresa_id')
    .eq('id', params.id)
    .single()

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Ítem no encontrado.' }, { status: 404 })
  }

  const esDueño = item.creado_por_empresa_id === empresa_id
  if (rol !== 'super_admin' && !esDueño) {
    return NextResponse.json({ error: 'Solo la empresa que creó este ítem puede borrarlo.' }, { status: 403 })
  }

  const { error } = await adminClient.from('items').delete().eq('id', params.id)
  if (error) {
    console.error('[DELETE /api/cotizador/items/[id]]', error)
    return NextResponse.json({ error: 'Error al borrar el ítem.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizador_item_maestro_borrado',
    detalle: { id: params.id, nombre: item.nombre },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
