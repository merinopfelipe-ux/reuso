import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createAdminClient } from '@/lib/supabase/admin'

// Webhook de Resend (arquitectura de correos, 2026-09-06): captura
// email.opened/email.clicked SOLO para mostrarle al empresa_admin si la
// persona invitada ya abrió/hizo clic en la invitación (ver /empresa/equipo).
// El tracking de apertura/clic de Resend es a nivel de TODO el dominio (no
// se puede activar solo para invitaciones@) — por eso este webhook filtra
// por resend_email_id y solo actualiza filas que de verdad correspondan a
// una invitación real, ignorando eventos de cualquier otro correo del
// sistema (soporte@, noreply@) sin registrar nada para esos.
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhooks/resend] RESEND_WEBHOOK_SECRET no configurada')
    return NextResponse.json({ error: 'No configurado' }, { status: 500 })
  }

  const payload = await request.text()
  const svixHeaders = {
    'svix-id': request.headers.get('svix-id') ?? '',
    'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
    'svix-signature': request.headers.get('svix-signature') ?? '',
  }

  let evento: { type: string; data: { email_id?: string } }
  try {
    const wh = new Webhook(secret)
    evento = wh.verify(payload, svixHeaders) as unknown as typeof evento
  } catch {
    // Firma inválida — nunca procesar un webhook sin verificar (mismo
    // criterio que cualquier webhook externo del proyecto).
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const emailId = evento.data.email_id
  if (!emailId || (evento.type !== 'email.opened' && evento.type !== 'email.clicked')) {
    return NextResponse.json({ ok: true }) // evento que no nos interesa, se ignora sin error
  }

  const adminClient = await createAdminClient()
  const campo = evento.type === 'email.opened' ? 'abierta_at' : 'clic_at'

  // COALESCE-like: solo escribe la primera vez, no pisa la fecha original
  // si Resend reintenta o manda el mismo evento más de una vez.
  const { data: invitacion } = await adminClient
    .from('invitaciones')
    .select(`id, ${campo}`)
    .eq('resend_email_id', emailId)
    .maybeSingle()

  if (invitacion && !(invitacion as Record<string, unknown>)[campo]) {
    await adminClient
      .from('invitaciones')
      .update({ [campo]: new Date().toISOString() })
      .eq('id', invitacion.id)
  }

  return NextResponse.json({ ok: true })
}
