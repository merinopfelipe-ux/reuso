import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { calcularCotizacionPorItem } from '@/lib/cotizador/motor-cotizacion'

// Edita el snapshot POR UNIDAD de una línea ya agregada a una cotización.
// Esto NUNCA escribe en items/item_servicios/item_insumos — es exclusivo de
// esta cotización, tal como se guardó al momento de crearla.

const servicioSchema = z.object({ nombre: z.string().min(1).max(100), precio: z.number().nonnegative() })
const insumoSchema = z.object({
  nombre: z.string().min(1).max(100),
  cantidad: z.number().positive(),
  unidad: z.string().min(1).max(30),
  precio_unitario: z.number().nonnegative(),
})
// Snapshot editable de un material — conserva su factor de impacto (CO2/agua)
// para que editar el peso recalcule el ambiental real de esta línea, sin
// tocar el catálogo compartido (item_materiales). Ver skill calculo-ambiental.
const materialSchema = z.object({
  nombre: z.string().min(1).max(100),
  peso_kg: z.number().nonnegative(),
  factor_co2_kg: z.number().nonnegative(),
  factor_agua_l_kg: z.number().nonnegative().nullable().optional(),
  categoria_material: z.string().nullable().optional(),
  origen_fuente: z.string().nullable().optional(),
  detalle_fuente: z.string().nullable().optional(),
  nivel_confianza: z.enum(['alta', 'media', 'baja']).optional(),
})

const schema = z.object({
  titulo: z.string().max(150).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  cantidad: z.number().int().min(1).max(50).optional(),
  servicios_json: z.array(servicioSchema).optional(),
  insumos_json: z.array(insumoSchema).optional(),
  materiales_json: z.array(materialSchema).optional(),
  factor_rentabilidad: z.number().positive().max(100).optional(),
  // Ocultar: no se elimina, solo deja de sumar en los totales y de
  // mostrarse al cliente (público/PDF). El vendedor sigue viéndolo en el
  // editor para poder des-ocultarlo cuando quiera.
  oculto: z.boolean().optional(),
  // "Coincidencia de categoría" — re-vincula la línea a otro ítem del
  // catálogo. Si viene, reemplaza materiales/servicios/insumos POR LOS DEL
  // ÍTEM NUEVO (decisión explícita del usuario), ignorando cualquier
  // materiales_json/servicios_json/insumos_json enviado en la misma petición.
  item_id: z.string().uuid().optional(),
  // Foto del ítem — journeys 06/07 del Vault marcaban esto como un vacío
  // real (no discoverability): editar un mueble ya guardado no tenía forma
  // de agregar/cambiar foto, solo el diagnóstico por IA al crear la
  // cotización la tenía. Mismo patrón de subida que esa pantalla (ver
  // POST .../mueble/route.ts): el cliente ya comprime a WebP antes de
  // enviar (src/lib/image-compress.ts), aquí solo se sube el buffer.
  imagen_base64: z.string().max(5_600_000).optional(),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  quitar_imagen: z.boolean().optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Envía al menos un campo para actualizar.' })

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; muebleId: string } }
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

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data: mueble, error: fetchError } = await adminClient
    .from('crm_muebles_cotizados')
    .select('id, cotizacion_id, empresa_id, item_id, titulo, descripcion, tipo_mueble, cantidad, factor_rentabilidad, materiales_json, servicios_json, insumos_json, peso_estandar_kg, co2_evitado_kg, agua_evitada_l, oculto, imagen_url')
    .eq('id', params.muebleId)
    .eq('cotizacion_id', params.id)
    .eq('empresa_id', empresa_id)
    .single()

  if (fetchError || !mueble) {
    return NextResponse.json({ error: 'Mueble cotizado no encontrado.' }, { status: 404 })
  }

  const titulo = parsed.data.titulo?.trim() || mueble.titulo
  const descripcion = parsed.data.descripcion !== undefined ? (parsed.data.descripcion?.trim() || null) : mueble.descripcion
  const cantidad = parsed.data.cantidad ?? mueble.cantidad
  const factor_rentabilidad = parsed.data.factor_rentabilidad ?? mueble.factor_rentabilidad
  const oculto = parsed.data.oculto ?? mueble.oculto

  let item_id = mueble.item_id
  let tipo_mueble = mueble.tipo_mueble
  let peso_estandar_kg = mueble.peso_estandar_kg
  let servicios = parsed.data.servicios_json ?? mueble.servicios_json ?? []
  let insumos = parsed.data.insumos_json ?? mueble.insumos_json ?? []
  let materiales = parsed.data.materiales_json ?? mueble.materiales_json ?? []
  // Recalcular desde materiales solo si el snapshot ambiental realmente
  // cambió en esta petición (edición manual de pesos, o re-match de ítem) —
  // si no, se preserva el valor total guardado escalado por cantidad, igual
  // que antes (evita reabrir el cálculo de líneas que nadie tocó).
  let materialesCambiaron = parsed.data.materiales_json !== undefined

  // "Coincidencia de categoría": re-vincula la línea a OTRO ítem del
  // catálogo. Reemplaza materiales/servicios/insumos por los del ítem nuevo
  // (decisión explícita del usuario) — ignora cualquier *_json enviado junto.
  if (parsed.data.item_id && parsed.data.item_id !== mueble.item_id) {
    const { data: nuevoItem, error: itemError } = await adminClient
      .from('items')
      .select('id, nombre, peso_kg, visibilidad, item_materiales(*), item_servicios(*), item_insumos(*)')
      .eq('id', parsed.data.item_id)
      .single()

    if (itemError || !nuevoItem) {
      return NextResponse.json({ error: 'El ítem elegido no existe en el catálogo.' }, { status: 404 })
    }
    if (nuevoItem.visibilidad !== 'global') {
      const { data: permiso } = await adminClient
        .from('item_permisos_empresa')
        .select('item_id')
        .eq('item_id', nuevoItem.id)
        .eq('empresa_id', empresa_id)
        .maybeSingle()
      if (!permiso) {
        return NextResponse.json({ error: 'No tienes acceso a ese ítem del catálogo.' }, { status: 403 })
      }
    }

    item_id = nuevoItem.id
    tipo_mueble = nuevoItem.nombre
    peso_estandar_kg = nuevoItem.peso_kg
    materiales = (nuevoItem.item_materiales ?? []) as typeof materiales
    servicios = (nuevoItem.item_servicios ?? []) as typeof servicios
    insumos = (nuevoItem.item_insumos ?? []) as typeof insumos
    materialesCambiaron = true
  }

  let co2_evitado_kg_unidad: number
  let agua_evitada_l_unidad: number
  if (materialesCambiaron) {
    co2_evitado_kg_unidad = materiales.reduce((s: number, m: { peso_kg: number; factor_co2_kg: number }) => s + m.peso_kg * m.factor_co2_kg, 0)
    agua_evitada_l_unidad = materiales.reduce((s: number, m: { peso_kg: number; factor_agua_l_kg?: number | null }) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0)
  } else {
    // co2/agua por unidad se derivan del valor total guardado y la cantidad
    // original (nunca se recalculan desde el catálogo si nadie tocó los
    // materiales — esta línea es un snapshot editable e independiente).
    co2_evitado_kg_unidad = mueble.cantidad > 0 ? Number(mueble.co2_evitado_kg) / mueble.cantidad : 0
    agua_evitada_l_unidad = mueble.cantidad > 0 ? Number(mueble.agua_evitada_l) / mueble.cantidad : 0
  }

  const resultado = calcularCotizacionPorItem({
    servicios,
    insumos,
    cantidad,
    factor_rentabilidad,
    co2_evitado_kg_unidad,
    agua_evitada_l_unidad,
  })

  // Foto: subir la nueva (si llegó) o quitar la actual (si se pidió
  // explícitamente) — en ambos casos, si había una foto propia en Storage
  // (no una URL externa http), se borra para no dejarla huérfana.
  let imagen_url = mueble.imagen_url
  if (parsed.data.quitar_imagen) {
    if (mueble.imagen_url && !mueble.imagen_url.startsWith('http')) {
      await adminClient.storage.from('cotizador').remove([mueble.imagen_url])
    }
    imagen_url = null
  } else if (parsed.data.imagen_base64) {
    const buffer = Buffer.from(parsed.data.imagen_base64, 'base64')
    const nombreArchivo = `cotizador/${empresa_id}/${randomUUID()}.webp`
    const { error: uploadError } = await adminClient.storage
      .from('cotizador')
      .upload(nombreArchivo, buffer, { contentType: parsed.data.mime_type ?? 'image/webp', upsert: false })
    if (!uploadError) {
      if (mueble.imagen_url && !mueble.imagen_url.startsWith('http')) {
        await adminClient.storage.from('cotizador').remove([mueble.imagen_url])
      }
      imagen_url = nombreArchivo
    }
  }

  const { data: actualizado, error: updateError } = await adminClient
    .from('crm_muebles_cotizados')
    .update({
      titulo,
      descripcion,
      cantidad,
      item_id,
      tipo_mueble,
      peso_estandar_kg,
      servicios_json: servicios,
      insumos_json: insumos,
      materiales_json: materiales,
      factor_rentabilidad,
      oculto,
      imagen_url,
      precio_mueble: resultado.precio_mueble,
      co2_evitado_kg: resultado.co2_evitado_kg,
      agua_evitada_l: resultado.agua_evitada_l,
    })
    .eq('id', params.muebleId)
    .select()
    .single()

  if (updateError || !actualizado) {
    return NextResponse.json({ error: 'Error al actualizar el mueble.' }, { status: 500 })
  }

  const { data: totalesActualizados } = await adminClient
    .rpc('recalcular_totales_cotizacion', { p_cotizacion_id: params.id })
    .single()

  const subtotalNuevo = Number((totalesActualizados as { subtotal: number } | null)?.subtotal ?? 0)
  const totalNuevo = Number((totalesActualizados as { total: number } | null)?.total ?? 0)
  const co2Total = Number((totalesActualizados as { co2_evitado_total_kg: number } | null)?.co2_evitado_total_kg ?? 0)
  const aguaTotal = Number((totalesActualizados as { agua_evitada_total_l: number } | null)?.agua_evitada_total_l ?? 0)

  await logAuditoria(adminClient, {
    user_id,
    accion: 'mueble_cotizado_editado',
    detalle: { cotizacion_id: params.id, mueble_id: params.muebleId, cambios: Object.keys(parsed.data) },
    ip,
  })

  let muebleConUrl = actualizado
  if (actualizado.imagen_url && !actualizado.imagen_url.startsWith('http')) {
    const { data: signData } = await adminClient.storage.from('cotizador').createSignedUrl(actualizado.imagen_url, 3600)
    muebleConUrl = { ...actualizado, imagen_url: signData?.signedUrl ?? actualizado.imagen_url }
  }

  return NextResponse.json({
    mueble: muebleConUrl,
    totales: {
      subtotal: subtotalNuevo,
      // total ya viene con la fórmula completa (transporte + IVA sin
      // descuento, ver migración 044) — nunca se recalcula en el frontend.
      total: totalNuevo,
      co2_evitado_total_kg: parseFloat(co2Total.toFixed(4)),
      agua_evitada_total_l: parseFloat(aguaTotal.toFixed(2)),
    },
  })
}

// Borra un mueble cotizado y recalcula automáticamente los totales de la cotización
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; muebleId: string } }
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

  const { error } = await adminClient
    .from('crm_muebles_cotizados')
    .delete()
    .eq('id', params.muebleId)
    .eq('cotizacion_id', params.id)
    .eq('empresa_id', empresa_id)

  if (error) {
    console.error('[DELETE /api/cotizador/cotizaciones/[id]/mueble/[muebleId]]', error)
    return NextResponse.json({ error: 'Error al eliminar el mueble.' }, { status: 500 })
  }

  const { data: totalesActualizados } = await adminClient
    .rpc('recalcular_totales_cotizacion', { p_cotizacion_id: params.id })
    .single()

  const subtotalNuevo = Number((totalesActualizados as { subtotal: number } | null)?.subtotal ?? 0)
  const totalNuevo = Number((totalesActualizados as { total: number } | null)?.total ?? 0)
  const co2Total = Number((totalesActualizados as { co2_evitado_total_kg: number } | null)?.co2_evitado_total_kg ?? 0)
  const aguaTotal = Number((totalesActualizados as { agua_evitada_total_l: number } | null)?.agua_evitada_total_l ?? 0)

  await logAuditoria(adminClient, {
    user_id,
    accion: 'mueble_cotizado_eliminado',
    detalle: { cotizacion_id: params.id, mueble_id: params.muebleId },
    ip,
  })

  try {
    revalidatePath('/cot/[token]', 'page')
  } catch (e) {
    console.error('[mueble route] Error al revalidar path:', e)
  }

  return NextResponse.json({
    ok: true,
    totales: {
      subtotal: subtotalNuevo,
      total: totalNuevo,
      co2_evitado_total_kg: parseFloat(co2Total.toFixed(4)),
      agua_evitada_total_l: parseFloat(aguaTotal.toFixed(2)),
    },
  })
}
