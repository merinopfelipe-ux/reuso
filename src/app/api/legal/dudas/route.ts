import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { enviarNotificacionTicket } from '@/lib/email'

const schema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email(),
  tipo: z.string().min(2).max(100),
  mensaje: z.string().min(10).max(2000),
  sitio_web: z.string().optional(),
  turnstile_token: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`dudas:${ip}`, 5, 5 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const { nombre, email, tipo, mensaje, sitio_web, turnstile_token } = parsed.data

  // Honeypot lleno → bot. Éxito falso, sin insertar nada.
  if (sitio_web) {
    return NextResponse.json({ ok: true })
  }

  const skipTurnstile = process.env.SKIP_TURNSTILE === 'true' || !turnstile_token || turnstile_token === 'skip'
  if (!skipTurnstile) {
    const turnstileOk = await verifyTurnstile(turnstile_token, ip)
    if (!turnstileOk) {
      return NextResponse.json({ error: 'Verificación de seguridad fallida. Intenta de nuevo.' }, { status: 400 })
    }
  }

  const supabase = await createAdminClient()
  const { error } = await supabase.from('leads').insert({
    nombre,
    email,
    interes: `Consulta legal (${tipo})`,
    mensaje: `[${tipo}] ${mensaje}`,
  })

  if (error) {
    console.error('Error insertando consulta legal:', error)
    return NextResponse.json({ error: 'No pudimos guardar tu consulta. Inténtalo de nuevo.' }, { status: 500 })
  }

  try {
    const { data: config } = await supabase
      .from('config_sistema')
      .select('email_notificaciones')
      .eq('id', 'default')
      .single()

    const { data: admins } = await supabase
      .from('profiles')
      .select('email')
      .eq('rol', 'super_admin')

    const destinatarios = [
      config?.email_notificaciones ?? 'servicio@calculadoradereuso.com',
      ...((admins ?? []).map((a: { email: string }) => a.email)),
    ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i)

    await enviarNotificacionTicket(destinatarios, {
      nombre,
      email,
      categoria: `Duda Legal: ${tipo}`,
      mensaje,
    })
  } catch (err) {
    console.error('Error enviando notificación de duda legal:', err)
  }

  return NextResponse.json({ ok: true })
}
