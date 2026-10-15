import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { normalizarTelefono } from '@/lib/telefono'
import { encryptSensitive } from '@/lib/encryption.server'
import { logAuditoria } from '@/lib/audit'

const leadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es muy corto.'),
  apellido: z.string().optional(),
  email: z.string().email('Email inválido.'),
  telefono: z.string().trim().max(40).optional().nullable(),
  empresa: z.string().optional(),
  interes: z.string().optional(),
  mensaje: z.string().min(5, 'Por favor escribe un mensaje más detallado.').max(1000),
  acepto_terminos: z.literal(true, {
    message: 'Debes aceptar los Términos y Condiciones.',
  }),
  acepto_privacidad: z.literal(true, {
    message: 'Debes autorizar la Política de Privacidad.',
  }),
  // Honeypot: campo invisible en el formulario real, si llega con contenido
  // es un bot. turnstile_token: verificación fail-open (ver /lib/turnstile).
  sitio_web: z.string().optional(),
  turnstile_token: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`leads:${ip}`, 5, 5 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = leadSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const { sitio_web, turnstile_token, apellido, acepto_terminos, acepto_privacidad, ...leadData } = result.data

    // Honeypot lleno → es un bot. Respondemos éxito falso para no revelarle
    // que fue detectado (no insertamos nada).
    if (sitio_web) {
      return NextResponse.json({ ok: true, id: 'ok' })
    }

    const nombreCompleto = [leadData.nombre?.trim(), apellido?.trim()].filter(Boolean).join(' ') || leadData.nombre
    const lead = {
      ...leadData,
      nombre: nombreCompleto,
      telefono: leadData.telefono ? await encryptSensitive(normalizarTelefono(leadData.telefono)) : null,
    }

    const skipTurnstile = process.env.SKIP_TURNSTILE === 'true' || !turnstile_token || turnstile_token === 'skip'
    if (!skipTurnstile) {
      const turnstileOk = await verifyTurnstile(turnstile_token, ip)
      if (!turnstileOk) {
        return NextResponse.json({ error: 'Verificación de seguridad fallida. Intenta de nuevo.' }, { status: 400 })
      }
    }

    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('leads')
      .insert([lead])
      .select('id')
      .single()

    if (error) {
      console.error('Error guardando lead:', error)
      return NextResponse.json(
        { error: 'Error al enviar el mensaje. Inténtalo de nuevo.' },
        { status: 500 }
      )
    }

    // Carga de la prueba SIC (Accountability - Art. 9 Ley 1581 de 2012)
    try { await logAuditoria(adminClient, {
      user_id: null,
      accion: 'consentimiento_legal_lead',
      detalle: {
        lead_id: data.id,
        email: lead.email,
        terminos_aceptados: true,
        privacidad_aceptada: true,
        version_terminos: '2026-09-05',
        version_privacidad: '2026-09-05',
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        timestamp_utc: new Date().toISOString(),
      },
      ip,
    }) } catch (auditErr) { console.error('[leads] log de consentimiento:', auditErr) }

    return NextResponse.json({ ok: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 })
  }
}
