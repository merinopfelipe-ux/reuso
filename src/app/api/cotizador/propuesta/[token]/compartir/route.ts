import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getIp } from '@/lib/admin-guard'
import { buscarUbicacionPorIp } from '@/lib/geo-ip'

// Registra en la misma trazabilidad de aperturas/descargas cuando alguien
// usa el botón "Compartir" de la propuesta pública (WhatsApp o correo) —
// antes solo se sabía si el cliente ABRIÓ el enlace desde WhatsApp/correo
// (por el referrer), nunca si alguien lo compartió activamente desde aquí.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json().catch(() => null)
  const medio = body?.medio
  if (medio !== 'whatsapp' && medio !== 'correo') {
    return NextResponse.json({ error: 'Medio inválido.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select('id')
    .or(`enlace_publico_token.eq.${params.token},codigo_cotizacion.eq.${params.token}`)
    .maybeSingle()

  if (!cot) return NextResponse.json({ ok: true }) // no filtrar si el token existe

  try {
    const ip = getIp(request)
    const userAgent = request.headers.get('user-agent') ?? null
    const { ciudad, pais } = await buscarUbicacionPorIp(ip)
    await adminClient.from('crm_cotizaciones_aperturas').insert({
      cotizacion_id: cot.id,
      ip_address: ip,
      user_agent: userAgent,
      ciudad,
      pais,
      tipo: medio === 'whatsapp' ? 'compartido_whatsapp' : 'compartido_correo',
    })
  } catch {
    // mejor esfuerzo: nunca bloquear el compartir por esto
  }

  return NextResponse.json({ ok: true })
}
