import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { calcularCotizacionPorItem } from '@/lib/cotizador/motor-cotizacion'
import { servicioSchema, insumoSchema, materialSchema } from '@/lib/schemas/dimensiones.schema'

const schema = z.object({
  item_id: z.uuid(),
  cantidad: z.number().int().min(1).max(50).default(1),
  imagen_base64: z.string().max(5_600_000).optional(),
  imagen_url: z.string().optional(), // path ya subido, para reusar la misma foto en varios ítems detectados
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  diagnostico_ia_json: z.record(z.string(), z.unknown()).optional(),
  fue_corregido_por_humano: z.boolean().default(false),
  // Overrides opcionales del "escritorio de cotización": el vendedor puede
  // editar título, precio/cantidad de servicios e insumos, el factor de
  // rentabilidad y el factor CO2 por unidad ANTES de confirmar el ítem. Si no
  // llegan, se usa el snapshot del catálogo (titulo cae al nombre del ítem).
  titulo: z.string().max(150).optional(),
  descripcion: z.string().max(400).optional(),
  servicios_json: z.array(servicioSchema).optional(),
  insumos_json: z.array(insumoSchema).optional(),
  // Si llega, reemplaza los materiales del catálogo (permite que el
  // vendedor ajuste la composición de esta línea antes de confirmarla,
  // igual que ya se puede editar después vía PATCH). Si no llega, se usan
  // los materiales del ítem del catálogo tal cual, como siempre.
  materiales_json: z.array(materialSchema).optional(),
  factor_rentabilidad: z.number().positive().max(100).optional(),
  co2_evitado_kg_unidad: z.number().nonnegative().optional(),
})

export async function POST(
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
            : 'Sin permiso para cotizar muebles.',
      },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  // Verificar que la cotización existe y pertenece a esta empresa
  const { data: cotizacion, error: fetchError } = await adminClient
    .from('crm_cotizaciones')
    .select('id, subtotal, descuento, borrador_iniciado_at')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[POST /api/cotizador/cotizaciones/[id]/mueble]', fetchError)
    return NextResponse.json({ error: 'Error al verificar la cotización.' }, { status: 500 })
  }
  if (!cotizacion) {
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
  const {
    item_id, cantidad, imagen_base64, mime_type,
    diagnostico_ia_json, fue_corregido_por_humano,
  } = parsed.data
  const titulo = parsed.data.titulo?.trim() || null
  const descripcion = parsed.data.descripcion?.trim() || null
  let { imagen_url } = parsed.data

  // ── Cargar el ítem del catálogo con sus DOS dimensiones aisladas ──────────
  // (item_materiales = ambiental, item_servicios/item_insumos = financiera —
  // nunca se combinan en un mismo cálculo, ver motor-cotizacion.ts)
  const { data: item, error: itemError } = await adminClient
    .from('items')
    .select('id, nombre, categoria_id, peso_kg, co2_por_unidad, factor_rentabilidad, visibilidad, item_materiales(*), item_servicios(*), item_insumos(*)')
    .eq('id', item_id)
    .single()

  if (itemError || !item) {
    return NextResponse.json({ error: 'El ítem seleccionado no existe en el catálogo.' }, { status: 404 })
  }

  // adminClient usa service role y no aplica la RLS de items_read: replicar
  // aquí la visibilidad selectiva por permisos (migración 035) a mano, para
  // que un vendedor no pueda cotizar con un ítem restringido de otra empresa.
  if (item.visibilidad !== 'global') {
    const { data: permiso } = await adminClient
      .from('item_permisos_empresa')
      .select('item_id')
      .eq('item_id', item_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()
    if (!permiso) {
      return NextResponse.json({ error: 'No tienes acceso a este ítem del catálogo.' }, { status: 403 })
    }
  }

  // El vendedor pudo editar servicios/insumos/materiales en el escritorio de
  // cotización antes de confirmar (GrupoItemCard) — si llegan overrides, se
  // usan; si no, el snapshot del catálogo tal cual. Si los materiales sí
  // cambiaron, el CO2/agua por unidad se recalcula desde ellos (mismo
  // criterio que el PATCH de una línea ya guardada), no desde el rollup
  // desactualizado del catálogo.
  const materialesCatalogo = (item.item_materiales ?? []) as { peso_kg: number; factor_co2_kg: number; factor_agua_l_kg: number | null }[]
  const materiales = parsed.data.materiales_json ?? materialesCatalogo
  const materialesCambiaron = parsed.data.materiales_json !== undefined
  const servicios = parsed.data.servicios_json ?? ((item.item_servicios ?? []) as { nombre: string; precio: number }[])
  const insumos = parsed.data.insumos_json ?? ((item.item_insumos ?? []) as { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[])
  const co2_evitado_kg_unidad = parsed.data.co2_evitado_kg_unidad
    ?? (materialesCambiaron ? materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0) : item.co2_por_unidad)
  const factor_rentabilidad = parsed.data.factor_rentabilidad ?? item.factor_rentabilidad

  const agua_evitada_l_unidad = materiales.reduce((s, m) => s + (m.factor_agua_l_kg ?? 0) * m.peso_kg, 0)

  const resultado = calcularCotizacionPorItem({
    servicios,
    insumos,
    cantidad,
    factor_rentabilidad,
    co2_evitado_kg_unidad,
    agua_evitada_l_unidad,
  })

  // Upload de imagen a Storage si viene en base64 y no hay una ya subida
  if (imagen_base64 && !imagen_url) {
    const buffer = Buffer.from(imagen_base64, 'base64')
    const nombreArchivo = `cotizador/${empresa_id}/${randomUUID()}.webp`
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('cotizador')
      .upload(nombreArchivo, buffer, { contentType: mime_type, upsert: false })
    if (!uploadError && uploadData) imagen_url = nombreArchivo
  }

  const { data: mueble, error: muebleError } = await adminClient
    .from('crm_muebles_cotizados')
    .insert({
      cotizacion_id: params.id,
      empresa_id,
      item_id,
      cantidad,
      imagen_url: imagen_url ?? null,
      diagnostico_ia_json: diagnostico_ia_json ?? null,
      es_viable: true,
      tipo_mueble: item.nombre, // compatibilidad de lectura con propuesta-client.tsx / [id]/page.tsx
      titulo: titulo ?? item.nombre,
      descripcion,
      materiales_json: materiales,
      servicios_json: servicios,
      insumos_json: insumos,
      factor_rentabilidad,
      peso_estandar_kg: item.peso_kg,
      precio_mueble: resultado.precio_mueble,
      co2_evitado_kg: resultado.co2_evitado_kg,
      agua_evitada_l: resultado.agua_evitada_l,
    })
    .select()
    .single()

  if (muebleError || !mueble) {
    return NextResponse.json({ error: 'Error al guardar el mueble. Intenta de nuevo.' }, { status: 500 })
  }

  // Arranca el reloj de retención del borrador (8h, ver cron
  // cotizador-purga-borradores-8h) en el momento del PRIMER ítem guardado
  // de esta cotización — nunca se vuelve a tocar después. `.is(...)` evita
  // pisar un valor ya existente si dos requests llegaran casi a la vez.
  if (!(cotizacion as { borrador_iniciado_at?: string | null }).borrador_iniciado_at) {
    await adminClient
      .from('crm_cotizaciones')
      .update({ borrador_iniciado_at: new Date().toISOString() })
      .eq('id', params.id)
      .is('borrador_iniciado_at', null)
  }

  // Si el humano corrigió el match de la IA, guardar caso para aprendizaje
  if (fue_corregido_por_humano && diagnostico_ia_json) {
    await adminClient.from('ia_memoria_visual').insert({
      empresa_id,
      imagen_url: imagen_url ?? null,
      diagnostico_ia_original_json: diagnostico_ia_json,
      diagnostico_final_humano_json: { item_nombre: item.nombre, item_id },
      fue_corregido: true,
    })
  }

  // Actualizar totales de la cotización de forma atómica (función SQL - evita race condition)
  const { data: totalesActualizados } = await adminClient
    .rpc('recalcular_totales_cotizacion', { p_cotizacion_id: params.id })
    .single()

  // total ya viene calculado con la fórmula completa (transporte + IVA sin
  // descuento, ver migración 044) — recalcular_totales_cotizacion es la
  // única fuente de verdad, no se vuelve a calcular aquí.
  const subtotalNuevo = Number((totalesActualizados as { subtotal: number } | null)?.subtotal ?? 0)
  const totalNuevo = Number((totalesActualizados as { total: number } | null)?.total ?? 0)
  const co2Total = Number((totalesActualizados as { co2_evitado_total_kg: number } | null)?.co2_evitado_total_kg ?? 0)
  const aguaTotal = Number((totalesActualizados as { agua_evitada_total_l: number } | null)?.agua_evitada_total_l ?? 0)

  await logAuditoria(adminClient, {
    user_id,
    accion: 'mueble_cotizado',
    detalle: { cotizacion_id: params.id, item_id, item_nombre: item.nombre, cantidad, precio: resultado.precio_mueble, fue_corregido_por_humano },
    ip,
  })

  try {
    revalidatePath('/cot/[token]', 'page')
  } catch (e) {
    console.error('[POST mueble route] Error al revalidar path:', e)
  }

  let muebleConUrl = mueble
  if (mueble.imagen_url && !mueble.imagen_url.startsWith('http')) {
    const { data: signData } = await adminClient.storage.from('cotizador').createSignedUrl(mueble.imagen_url, 3600)
    muebleConUrl = { ...mueble, imagen_url: signData?.signedUrl ?? mueble.imagen_url }
  }

  return NextResponse.json({
    mueble: muebleConUrl,
    totales: {
      subtotal: subtotalNuevo,
      total: totalNuevo,
      co2_evitado_total_kg: parseFloat(co2Total.toFixed(4)),
      agua_evitada_total_l: parseFloat(aguaTotal.toFixed(2)),
    },
  }, { status: 201 })
}
