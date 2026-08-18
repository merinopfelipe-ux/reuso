import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'

// Transporte e IVA nunca reciben descuento — se calculan aparte, ver
// sql/044_cotizador_transporte_iva.sql y src/lib/cotizador/precio.ts (misma
// fórmula, la SQL es la que de verdad guarda `total`).
const schema = z.object({
  estado: z.enum([
    'por_cotizar', 'enviada', 'en_negociacion',
    'esperando_anticipo', 'cerrado_ganado', 'cerrado_perdido', 'cerrado_inviable',
  ]).optional(),
  descuento_activo: z.boolean().optional(),
  descuento: z.number().min(0).optional(),
  descuento_tipo: z.enum(['valor', 'porcentaje']).optional(),
  transporte_activo: z.boolean().optional(),
  transporte_valor: z.number().min(0).optional(),
  iva_activo: z.boolean().optional(),
  iva_porcentaje: z.number().min(0).max(100).optional(),
  validez_activa: z.boolean().optional(),
  validez_modo: z.enum(['dias', 'fecha']).optional(),
  validez_dias: z.number().int().min(1).max(365).optional(),
  validez_fecha: z.string().nullable().optional(),
  validez_mostrar_galeria: z.boolean().optional(),
  validez_mostrar_lista: z.boolean().optional(),
  anticipo_activo: z.boolean().optional(),
  anticipo_porcentaje: z.number().min(0).max(100).optional(),
  forma_pago_activo: z.boolean().optional(),
  forma_pago_tipo: z.enum(['anticipo', 'dias']).optional(),
  forma_pago_dias: z.number().int().min(1).max(365).optional(),
  forma_pago_mostrar_galeria: z.boolean().optional(),
  forma_pago_mostrar_lista: z.boolean().optional(),
  tiempo_entrega_activo: z.boolean().optional(),
  tiempo_entrega: z.string().max(200).optional(),
  tiempo_entrega_mostrar_galeria: z.boolean().optional(),
  tiempo_entrega_mostrar_lista: z.boolean().optional(),
  garantia_activo: z.boolean().optional(),
  garantia: z.string().max(200).optional(),
  garantia_mostrar_galeria: z.boolean().optional(),
  garantia_mostrar_lista: z.boolean().optional(),
  envio_gratis_activo: z.boolean().optional(),
  envio_gratis_texto: z.string().max(150).optional(),
  envio_gratis_icono: z.string().max(50).optional(),
  envio_gratis_mostrar_galeria: z.boolean().optional(),
  envio_gratis_mostrar_lista: z.boolean().optional(),
  nota_mostrar_galeria: z.boolean().optional(),
  nota_mostrar_lista: z.boolean().optional(),
  destacados_json: z.array(z.object({
    icono: z.string().max(50),
    texto: z.string().max(150),
    mostrar_galeria: z.boolean().optional(),
    mostrar_lista: z.boolean().optional(),
  })).max(10).optional(),
  legales_json: z.array(z.string().max(300)).max(20).optional(),
  observaciones: z.string().max(2000).optional(),
  cliente_id: z.uuid('ID de cliente inválido.').optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Envía al menos un campo para actualizar.' })

const CAMPOS_PRECIO = ['descuento_activo', 'descuento', 'descuento_tipo', 'transporte_activo', 'transporte_valor', 'iva_activo', 'iva_porcentaje'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Try/catch general: si cotizadorAuthCheck o la consulta lanzan una
  // excepción no prevista (ej. un tropiezo de red hablando con Supabase),
  // Next.js devolvía una respuesta que no era JSON y el frontend fallaba con
  // "No se pudieron cargar los datos" sin ninguna forma de reintentar bien
  // (bug real reportado, repetido varias veces). Ahora siempre se responde
  // JSON válido, incluso ante lo inesperado.
  try {
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

    const { data: cotizacion, error } = await adminClient
      .from('crm_cotizaciones')
      .select(`
        id, codigo_cotizacion, estado, subtotal, descuento_activo, descuento, descuento_tipo, total,
        transporte_activo, transporte_valor, iva_activo, iva_porcentaje,
        validez_activa, validez_modo, validez_dias, validez_fecha, validez_mostrar_galeria, validez_mostrar_lista,
        anticipo_activo, anticipo_porcentaje,
        forma_pago_activo, forma_pago_tipo, forma_pago_dias, forma_pago_mostrar_galeria, forma_pago_mostrar_lista,
        tiempo_entrega_activo, tiempo_entrega, tiempo_entrega_mostrar_galeria, tiempo_entrega_mostrar_lista,
        garantia_activo, garantia, garantia_mostrar_galeria, garantia_mostrar_lista,
        envio_gratis_activo, envio_gratis_texto, envio_gratis_icono, envio_gratis_mostrar_galeria, envio_gratis_mostrar_lista,
        nota_mostrar_galeria, nota_mostrar_lista,
        destacados_json, legales_json,
        co2_evitado_total_kg, agua_evitada_total_l,
        observaciones, enlace_publico_token,
        fecha_enviada, fecha_apertura_cliente, veces_abierta,
        created_at, updated_at, empresa_id, cliente_id,
        crm_clientes (
          id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo, email,
          pais, ciudad, direccion, direccion_notas, empresa_cliente_id,
          crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
        )
      `)
      .eq('id', params.id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()

    if (error) {
      console.error('[GET /api/cotizador/cotizaciones/[id]]', error)
      return NextResponse.json({ error: 'Error al cargar la cotización.' }, { status: 500 })
    }

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
    }

    return NextResponse.json({ cotizacion })
  } catch (e) {
    console.error('[GET /api/cotizador/cotizaciones/[id]] excepción no prevista', e)
    return NextResponse.json({ error: 'Error al cargar la cotización. Intenta de nuevo.' }, { status: 500 })
  }
}

export async function PATCH(
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
            : 'Sin permiso.',
      },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const { data: cotActual, error: fetchError } = await adminClient
    .from('crm_cotizaciones')
    .select('id, estado, subtotal, descuento, total')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[PATCH /api/cotizador/cotizaciones/[id]]', fetchError)
    return NextResponse.json({ error: 'Error al verificar la cotización.' }, { status: 500 })
  }

  if (!cotActual) {
    return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  // El embudo permite mover la cotización a cualquier estado desde
  // cualquier estado, en cualquier dirección — decisión explícita del
  // vendedor, no una restricción de secuencia del sistema.

  if (parsed.data.cliente_id) {
    const { data: clienteDueño } = await adminClient
      .from('crm_clientes')
      .select('id')
      .eq('id', parsed.data.cliente_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()
    if (!clienteDueño) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })
    }
  }

  const actualizar: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  // Notas públicas: HTML del RichTextEditor — nunca confiar en lo que ya
  // saneó el cliente, se vuelve a sanear aquí antes del UPDATE (se muestra
  // con dangerouslySetInnerHTML en la propuesta pública).
  if (typeof actualizar.observaciones === 'string') {
    actualizar.observaciones = DOMPurify.sanitize(actualizar.observaciones, NOTA_SANITIZE_CONFIG)
  }

  const { error } = await adminClient
    .from('crm_cotizaciones')
    .update(actualizar)
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)

  if (error) {
    console.error('[PATCH /api/cotizador/cotizaciones/[id]] error update:', error)
    return NextResponse.json({ error: 'Error al actualizar la cotización.' }, { status: 500 })
  }

  // Si cambió algo que afecta el precio, la función SQL recalcula `total`
  // con la fórmula completa (transporte e IVA sin descuento, ver migración
  // 044) — es la única fuente de verdad de cuánto queda el total guardado.
  const tocaPrecio = CAMPOS_PRECIO.some(campo => parsed.data[campo] !== undefined)
  if (tocaPrecio) {
    await adminClient.rpc('recalcular_totales_cotizacion', { p_cotizacion_id: params.id }).single()
  }

  const { data: cotActualizada, error: fetchFinalError } = await adminClient
    .from('crm_cotizaciones')
    .select(`
      id, codigo_cotizacion, estado, subtotal, descuento_activo, descuento, descuento_tipo, total,
      transporte_activo, transporte_valor, iva_activo, iva_porcentaje,
      validez_activa, validez_modo, validez_dias, validez_fecha, validez_mostrar_galeria, validez_mostrar_lista,
      anticipo_activo, anticipo_porcentaje,
      forma_pago_activo, forma_pago_tipo, forma_pago_dias, forma_pago_mostrar_galeria, forma_pago_mostrar_lista,
      tiempo_entrega_activo, tiempo_entrega, tiempo_entrega_mostrar_galeria, tiempo_entrega_mostrar_lista,
      garantia_activo, garantia, garantia_mostrar_galeria, garantia_mostrar_lista,
      envio_gratis_activo, envio_gratis_texto, envio_gratis_icono, envio_gratis_mostrar_galeria, envio_gratis_mostrar_lista,
      nota_mostrar_galeria, nota_mostrar_lista,
      destacados_json, legales_json, version,
      co2_evitado_total_kg, agua_evitada_total_l,
      observaciones, enlace_publico_token,
      fecha_enviada, fecha_apertura_cliente, veces_abierta,
      created_at, updated_at, empresa_id, cliente_id,
      crm_clientes (
        id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo, email,
        pais, ciudad, direccion, direccion_notas, empresa_cliente_id,
        crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
      )
    `)
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .single()

  if (fetchFinalError || !cotActualizada) {
    console.error('[PATCH /api/cotizador/cotizaciones/[id]] error reload:', fetchFinalError)
    return NextResponse.json({ error: 'Error al recargar la cotización.' }, { status: 500 })
  }

  // Historial de estados — una fila por cambio, para que "Actividad" pueda
  // mostrar todo el recorrido de la cotización, no solo el estado actual.
  if (parsed.data.estado && parsed.data.estado !== (cotActual as { estado?: string }).estado) {
    await adminClient.from('crm_cotizaciones_estado_historial').insert({
      cotizacion_id: params.id,
      estado_anterior: (cotActual as { estado?: string }).estado ?? null,
      estado_nuevo: parsed.data.estado,
      user_id,
    })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_actualizada',
    detalle: { cotizacion_id: params.id, cambios: Object.keys(parsed.data) },
    ip,
  })

  if (cotActualizada?.enlace_publico_token) {
    try {
      revalidatePath(`/cot/${cotActualizada.enlace_publico_token}`)
      revalidatePath('/cot/[token]', 'page')
    } catch (e) {
      console.error('[PATCH route] Error al revalidar path:', e)
    }
  }

  return NextResponse.json(cotActualizada)
}

// Borrado real: la fila de crm_cotizaciones y todo lo relacionado (muebles,
// aperturas, historial de estado, notas) tienen ON DELETE CASCADE hacia
// ella, así que un solo DELETE aquí limpia todo.
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
            : 'Sin permiso.',
      },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })

  const { error } = await adminClient.from('crm_cotizaciones').delete().eq('id', params.id)
  if (error) {
    console.error('[DELETE /api/cotizador/cotizaciones/[id]]', error)
    return NextResponse.json({ error: 'Error al eliminar la cotización. Intenta de nuevo.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_eliminada',
    detalle: { cotizacion_id: params.id, codigo_cotizacion: cot.codigo_cotizacion },
    ip,
  })

  return NextResponse.json({ ok: true })
}
