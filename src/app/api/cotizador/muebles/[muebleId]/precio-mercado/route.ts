import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { rateLimit } from '@/lib/rate-limit'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { buscarPrecioMercado } from '@/lib/ia/precio-mercado'

// POST: dispara la búsqueda IA de "precio de mercado nuevo" para un mueble
// ya cotizado (Reporte 1, dominio A). Fire-and-forget desde la UI: el alta
// del mueble ya respondió antes de que el cliente llame a este endpoint.
export async function POST(
  request: NextRequest,
  { params }: { params: { muebleId: string } }
) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'No autenticado.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso para usar el Cotizador.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, rol, adminClient } = auth
  const { muebleId } = params
  const ip = getIp(request)

  const allowed = await rateLimit(`precio_mercado:${empresa_id}`, 20, 60 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas búsquedas de precio. Espera unos minutos.' }, { status: 429 })
  }

  const { data: mueble, error: muebleError } = await adminClient
    .from('crm_muebles_cotizados')
    .select('id, empresa_id, titulo, tipo_mueble, categoria')
    .eq('id', muebleId)
    .single()

  if (muebleError || !mueble) {
    return NextResponse.json({ error: 'No encontramos este mueble cotizado.' }, { status: 404 })
  }
  if (rol !== 'super_admin' && mueble.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para este mueble.' }, { status: 403 })
  }

  const itemNombre = mueble.tipo_mueble ?? mueble.categoria ?? mueble.titulo
  const resultado = await buscarPrecioMercado(itemNombre, mueble.titulo)

  if (!resultado.ok) {
    await adminClient
      .from('crm_muebles_cotizados')
      .update({ precio_mercado_estado: 'sin_resultado' })
      .eq('id', muebleId)
    return NextResponse.json({ ok: false, precio_mercado_estado: 'sin_resultado' })
  }

  const { data: actualizado, error: updateError } = await adminClient
    .from('crm_muebles_cotizados')
    .update({
      precio_mercado_nuevo: resultado.precio_estimado_cop,
      precio_mercado_fuente_url: resultado.fuente_url,
      precio_mercado_estado: 'sugerido',
    })
    .eq('id', muebleId)
    .select('precio_mercado_nuevo, precio_mercado_fuente_url, precio_mercado_estado')
    .single()

  if (updateError || !actualizado) {
    return NextResponse.json({ error: 'Error al guardar el precio sugerido.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'precio_mercado_sugerido',
    detalle: {
      mueble_id: muebleId,
      precio_estimado_cop: resultado.precio_estimado_cop,
      fuente_url: resultado.fuente_url,
      confianza: resultado.confianza,
      proveedor: resultado.proveedor,
    },
    ip,
  })

  return NextResponse.json({
    ok: true,
    precio_mercado_nuevo: actualizado.precio_mercado_nuevo,
    precio_mercado_fuente_url: actualizado.precio_mercado_fuente_url,
    fuente_titulo: resultado.fuente_titulo,
    confianza: resultado.confianza,
    precio_mercado_estado: actualizado.precio_mercado_estado,
  })
}

// PATCH: el asesor confirma o corrige el precio sugerido antes de que quede
// definitivo — mecanismo de validación humana obligatoria (ver skill
// calculo-ambiental: la IA nunca inventa, el usuario siempre confirma).
const patchSchema = z.object({
  precio_mercado_nuevo: z.number().positive('El precio debe ser mayor a 0.'),
  precio_mercado_fuente_url: z.string().regex(/^https?:\/\//, 'La fuente debe ser una URL válida.').optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { muebleId: string } }
) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'No autenticado.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso para usar el Cotizador.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, rol, adminClient } = auth
  const { muebleId } = params
  const ip = getIp(request)

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data: muebleAntes, error: muebleError } = await adminClient
    .from('crm_muebles_cotizados')
    .select('id, empresa_id, precio_mercado_nuevo, precio_mercado_fuente_url')
    .eq('id', muebleId)
    .single()

  if (muebleError || !muebleAntes) {
    return NextResponse.json({ error: 'No encontramos este mueble cotizado.' }, { status: 404 })
  }
  if (rol !== 'super_admin' && muebleAntes.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para este mueble.' }, { status: 403 })
  }

  const { data: actualizado, error: updateError } = await adminClient
    .from('crm_muebles_cotizados')
    .update({
      precio_mercado_nuevo: parsed.data.precio_mercado_nuevo,
      precio_mercado_fuente_url: parsed.data.precio_mercado_fuente_url ?? muebleAntes.precio_mercado_fuente_url,
      precio_mercado_estado: 'confirmado',
    })
    .eq('id', muebleId)
    .select('precio_mercado_nuevo, precio_mercado_fuente_url, precio_mercado_estado')
    .single()

  if (updateError || !actualizado) {
    return NextResponse.json({ error: 'Error al confirmar el precio.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'precio_mercado_confirmado',
    detalle: {
      mueble_id: muebleId,
      antes: { precio_mercado_nuevo: muebleAntes.precio_mercado_nuevo },
      despues: { precio_mercado_nuevo: parsed.data.precio_mercado_nuevo },
    },
    ip,
  })

  return NextResponse.json({ ok: true, ...actualizado })
}
