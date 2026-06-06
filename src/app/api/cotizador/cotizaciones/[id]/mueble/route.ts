import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { calcularCotizacion } from '@/lib/cotizador/motor-cotizacion'
import type { ConfigCostosMueble } from '@/lib/cotizador/motor-cotizacion'

const schema = z.object({
  imagen_base64: z.string().max(5_600_000).optional(),
  imagen_url: z.url().optional(),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  diagnostico_ia_json: z.record(z.string(), z.unknown()),
  es_viable: z.boolean(),
  categoria: z.string().min(1, 'Completa la categoría.'),
  tipo_mueble: z.string().min(1, 'Completa el tipo de mueble.'),
  oficios_json: z.object({
    tapiceria: z.boolean(),
    pintura: z.boolean(),
    carpinteria_superficial: z.boolean(),
  }),
  ajustes_humanos_json: z.object({
    danos_ocultos: z.boolean(),
  }),
  fue_corregido_por_humano: z.boolean().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso para cotizar muebles.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  // Verificar que la cotización existe y pertenece a esta empresa
  const { data: cotizacion } = await adminClient
    .from('crm_cotizaciones')
    .select('id, subtotal, descuento')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .single()

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
    imagen_base64, imagen_url, mime_type,
    diagnostico_ia_json, es_viable, categoria, tipo_mueble,
    oficios_json, ajustes_humanos_json, fue_corregido_por_humano,
  } = parsed.data

  // Buscar config de costos activa para este tipo de mueble
  const { data: configRow } = await adminClient
    .from('crm_config_costos')
    .select('*')
    .eq('empresa_id', empresa_id)
    .eq('tipo_mueble', tipo_mueble)
    .eq('activo', true)
    .single()

  if (!configRow) {
    return NextResponse.json(
      { error: `Configura los precios para "${tipo_mueble}" antes de cotizar.` },
      { status: 422 }
    )
  }

  const config: ConfigCostosMueble = {
    tipo_mueble: configRow.tipo_mueble,
    peso_estandar_kg: Number(configRow.peso_estandar_kg),
    precio_tapiceria: Number(configRow.precio_tapiceria),
    precio_pintura: Number(configRow.precio_pintura),
    precio_carpinteria: Number(configRow.precio_carpinteria),
    factor_co2_kg: Number(configRow.factor_co2_kg),
    factor_agua_l: Number(configRow.factor_agua_l),
  }

  // Calcular precio con el motor determinista (nunca la IA)
  const resultado = calcularCotizacion({ oficios: oficios_json, ajustes_humanos: ajustes_humanos_json, config })

  // Upload de imagen a Supabase Storage si viene en base64
  let imagen_url_final = imagen_url ?? null
  if (imagen_base64) {
    const buffer = Buffer.from(imagen_base64, 'base64')
    const nombreArchivo = `cotizador/${empresa_id}/${randomUUID()}.webp`
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('cotizador')
      .upload(nombreArchivo, buffer, { contentType: mime_type, upsert: false })

    if (!uploadError && uploadData) {
      const { data: urlData } = adminClient.storage.from('cotizador').getPublicUrl(nombreArchivo)
      imagen_url_final = urlData.publicUrl
    }
  }

  // Insertar el mueble
  const { data: mueble, error: muebleError } = await adminClient
    .from('crm_muebles_cotizados')
    .insert({
      cotizacion_id: params.id,
      empresa_id,
      imagen_url: imagen_url_final,
      diagnostico_ia_json,
      es_viable,
      categoria,
      tipo_mueble,
      oficios_json,
      ajustes_humanos_json,
      peso_estandar_kg: config.peso_estandar_kg,
      precio_mueble: resultado.precio_mueble,
      co2_evitado_kg: resultado.co2_evitado_kg,
      agua_evitada_l: resultado.agua_evitada_l,
    })
    .select()
    .single()

  if (muebleError || !mueble) {
    return NextResponse.json({ error: 'Error al guardar el mueble. Intenta de nuevo.' }, { status: 500 })
  }

  // Actualizar totales de la cotización (SUM desde BD para evitar race conditions)
  const { data: sumas } = await adminClient
    .from('crm_muebles_cotizados')
    .select('precio_mueble, co2_evitado_kg, agua_evitada_l')
    .eq('cotizacion_id', params.id)

  const subtotalNuevo = (sumas ?? []).reduce((s, m) => s + Number(m.precio_mueble), 0)
  const co2Total = (sumas ?? []).reduce((s, m) => s + Number(m.co2_evitado_kg), 0)
  const aguaTotal = (sumas ?? []).reduce((s, m) => s + Number(m.agua_evitada_l), 0)
  const descuento = Number(cotizacion.descuento ?? 0)

  await adminClient
    .from('crm_cotizaciones')
    .update({
      subtotal: subtotalNuevo,
      total: Math.max(0, subtotalNuevo - descuento),
      co2_evitado_total_kg: parseFloat(co2Total.toFixed(4)),
      agua_evitada_total_l: parseFloat(aguaTotal.toFixed(2)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  // Si el humano corrigió la IA, guardar caso para aprendizaje
  if (fue_corregido_por_humano) {
    await adminClient.from('ia_memoria_visual').insert({
      empresa_id,
      imagen_url: imagen_url_final,
      diagnostico_ia_original_json: diagnostico_ia_json,
      diagnostico_final_humano_json: {
        es_viable,
        categoria,
        tipo_mueble,
        oficios: oficios_json,
      },
      fue_corregido: true,
    })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'mueble_cotizado',
    detalle: {
      cotizacion_id: params.id,
      tipo_mueble,
      precio: resultado.precio_mueble,
      co2_evitado: resultado.co2_evitado_kg,
      fue_corregido_por_humano,
    },
    ip,
  })

  return NextResponse.json({
    mueble,
    totales: {
      subtotal: subtotalNuevo,
      total: Math.max(0, subtotalNuevo - descuento),
      co2_evitado_total_kg: parseFloat(co2Total.toFixed(4)),
      agua_evitada_total_l: parseFloat(aguaTotal.toFixed(2)),
    },
  }, { status: 201 })
}
