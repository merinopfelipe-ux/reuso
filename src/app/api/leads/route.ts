import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { enviarSeguimientoEvento, enviarAvisoLeadEvento } from '@/lib/email'
import { waLink } from '@/lib/constants/contacto'

const leadSchema = z.object({
  nombre: z.string().min(2, 'El nombre es muy corto.'),
  email: z.string().email('Email inválido.'),
  empresa: z.string().optional(),
  interes: z.string().optional(),
  mensaje: z.string().min(5, 'Por favor escribe un mensaje más detallado.').max(1000),
  // Honeypot: campo invisible en el formulario real, si llega con contenido
  // es un bot. turnstile_token: verificación fail-open (ver /lib/turnstile).
  sitio_web: z.string().optional(),
  turnstile_token: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  // En un evento muchas personas comparten el mismo wifi (misma IP): con 5 envíos
  // cada 5 minutos se bloquearía a los asistentes. /eventos manda interes "Eventos".
  const previo = await request.clone().json().catch(() => ({}))
  const esEvento = previo?.interes === 'Eventos'
  const allowed = await rateLimit(`leads:${ip}`, esEvento ? 60 : 5, 5 * 60_000)
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

    const { sitio_web, turnstile_token, ...lead } = result.data

    // Honeypot lleno → es un bot. Respondemos éxito falso para no revelarle
    // que fue detectado (no insertamos nada).
    if (sitio_web) {
      return NextResponse.json({ ok: true, id: 'ok' })
    }

    const skipTurnstile = process.env.SKIP_TURNSTILE === 'true' || !turnstile_token || turnstile_token === 'skip'
    if (!skipTurnstile) {
      const turnstileOk = await verifyTurnstile(turnstile_token, ip)
      if (!turnstileOk) {
        return NextResponse.json({ error: 'Verificación de seguridad fallida. Intenta de nuevo.' }, { status: 400 })
      }
    }

    const adminClient = await createAdminClient()

    // Un solo correo de seguimiento por dirección cada 24 horas: evita que el
    // formulario sirva para llenar de mensajes el correo de otra persona.
    let yaContactado = false
    if (lead.interes === 'Eventos') {
      const desde = new Date(Date.now() - 24 * 3600_000).toISOString()
      const { count } = await adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .ilike('email', lead.email.replace(/[\\%_]/g, '\\$&'))
        .eq('interes', 'Eventos')
        .gte('created_at', desde)
      yaContactado = (count ?? 0) > 0
    }

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

    // Leads de /eventos: correo inmediato a la persona y aviso al equipo con un
    // botón de WhatsApp (sin API de WhatsApp). Un fallo de correo nunca rompe el envío.
    if (lead.interes === 'Eventos' && !yaContactado) {
      const celular = /Celular:\s*(\+?\d[\d\s]*)/.exec(lead.mensaje)?.[1]?.trim() ?? ''
      const digitos = celular.replace(/\D/g, '')
      const whatsappUrl = waLink('Hola, nos vimos en el evento y quedamos en contacto. Te escribimos de la Calculadora de Reúso.', digitos)
      await Promise.allSettled([
        enviarSeguimientoEvento(lead.email, { empresa: lead.empresa ?? lead.nombre }),
        enviarAvisoLeadEvento({ empresa: lead.empresa ?? lead.nombre, email: lead.email, celular, whatsappUrl }),
      ])
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 })
  }
}
