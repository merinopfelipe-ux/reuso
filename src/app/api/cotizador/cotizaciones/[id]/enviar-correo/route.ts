import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { construirPdfCotizacion } from '@/lib/pdf/construir-pdf-cotizacion'
import { enviarPropuestaCotizacion } from '@/lib/email'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email(),
  mensaje: z.string().max(500).optional(),
  guardarCorreo: z.boolean().optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status === 400 ? 401 : auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const permitido = await rateLimit(`cotizador_enviar_correo:${ip}`, 20, 60 * 60_000)
  if (!permitido) {
    return NextResponse.json({ error: 'Enviaste muchas propuestas por correo. Intenta de nuevo en un rato.' }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ingresa un correo válido.' }, { status: 400 })
  }
  const { email, mensaje, guardarCorreo } = parsed.data

  const { data: cot, error: fetchError } = await adminClient
    .from('crm_cotizaciones')
    .select(`
      id, estado, enlace_publico_token, codigo_cotizacion,
      crm_clientes ( id, nombre, email, es_contacto_real ),
      empresas ( nombre )
    `)
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[POST /api/cotizador/cotizaciones/[id]/enviar-correo]', fetchError)
    return NextResponse.json({ error: 'Error al verificar la cotización.' }, { status: 500 })
  }
  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })

  const cliente = Array.isArray(cot.crm_clientes) ? cot.crm_clientes[0] : cot.crm_clientes
  const empresa = Array.isArray(cot.empresas) ? cot.empresas[0] : cot.empresas

  // Asegurar que el enlace público exista (mismo criterio que /enviar).
  const token = cot.enlace_publico_token ?? cot.codigo_cotizacion
  const yaEnviada = cot.estado !== 'por_cotizar'
  const { error: updateError } = await adminClient
    .from('crm_cotizaciones')
    .update({
      enlace_publico_token: token,
      estado: yaEnviada ? cot.estado : 'enviada',
      fecha_enviada: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cot.id)
  if (updateError) {
    return NextResponse.json({ error: 'Error al generar el enlace.' }, { status: 500 })
  }

  if (guardarCorreo && cliente && email !== cliente.email) {
    await adminClient.from('crm_clientes').update({ email }).eq('id', cliente.id)
  }

  const pdf = await construirPdfCotizacion(cot.id, adminClient)
  if (!pdf) return NextResponse.json({ error: 'No se pudo generar el PDF.' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://reuso.lurdes.co'
  const enlace = `${baseUrl}/cot/${token}`

  try {
    await enviarPropuestaCotizacion(
      email,
      cliente?.es_contacto_real ? (cliente.nombre ?? null) : null,
      empresa?.nombre ?? 'Calculadora de Reúso',
      cot.codigo_cotizacion,
      enlace,
      Buffer.from(pdf),
      mensaje ?? null,
    )
  } catch (err) {
    console.error('[POST /api/cotizador/cotizaciones/[id]/enviar-correo] Resend', err)
    return NextResponse.json({ error: 'No pudimos enviar el correo. Intenta de nuevo.' }, { status: 502 })
  }

  await adminClient.from('crm_cotizaciones_aperturas').insert({
    cotizacion_id: cot.id,
    tipo: 'compartido_correo',
  })

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_enviada_correo',
    detalle: { cotizacion_id: cot.id, email_destino: email, guardado_en_cliente: Boolean(guardarCorreo) },
    ip,
  })

  return NextResponse.json({ ok: true, enlace })
}
