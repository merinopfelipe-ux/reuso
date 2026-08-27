import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

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

    // Nota: Aquí se podría integrar Resend para enviar notificación al admin
    // pero por ahora lo dejamos solo en BD como "todo lo gratis".

    return NextResponse.json({ ok: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 })
  }
}
