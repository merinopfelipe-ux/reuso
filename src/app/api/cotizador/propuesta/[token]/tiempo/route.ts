import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

// Recibe cuánto tiempo estuvo el cliente viendo su propuesta pública, vía
// navigator.sendBeacon al salir de la página (ver propuesta-client.tsx).
// Público y sin auth por diseño (el cliente nunca inicia sesión), pero
// valida que apertura_id realmente pertenezca a la cotización del token
// para que nadie pueda pisar la duración de la apertura de otra persona.

const schema = z.object({
  apertura_id: z.string().uuid(),
  duracion_seg: z.number().int().min(0).max(86_400),
})

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const permitido = await rateLimit(`cotizacion_tiempo:${ip}`, 20, 60_000)
  if (!permitido) return NextResponse.json({ ok: false }, { status: 429 })

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const adminClient = await createAdminClient()

  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select('id')
    .or(`enlace_publico_token.eq.${params.token},codigo_cotizacion.eq.${params.token}`)
    .maybeSingle()
  if (!cot) return NextResponse.json({ ok: false }, { status: 404 })

  await adminClient
    .from('crm_cotizaciones_aperturas')
    .update({ duracion_seg: parsed.data.duracion_seg })
    .eq('id', parsed.data.apertura_id)
    .eq('cotizacion_id', cot.id)

  return NextResponse.json({ ok: true })
}
