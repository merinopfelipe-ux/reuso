import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { enviarNotificacionTicket, enviarConfirmacionConsultaLegal } from '@/lib/email'
import DOMPurify from 'isomorphic-dompurify'

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

  const adminClient = await createAdminClient()
  const userClient = createClient()
  const { data: { user } } = await userClient.auth.getUser()

  // 1. Crear el ticket oficial de soporte en la base de datos
  const { data: ticket, error: ticketError } = await adminClient
    .from('tickets')
    .insert({
      titulo: `[Consulta Legal] ${tipo} - ${nombre}`,
      tipo: 'duda',
      prioridad: 'media',
      estado: 'abierto',
      user_id: user?.id ?? null,
      empresa_id: null,
      origen: 'usuario',
    })
    .select('id')
    .single()

  if (ticketError || !ticket) {
    console.error('Error insertando ticket legal:', ticketError)
    return NextResponse.json({ error: 'No pudimos guardar tu consulta. Inténtalo de nuevo.' }, { status: 500 })
  }

  const numeroCaso = `LEG-${ticket.id.slice(0, 8).toUpperCase()}`

  // 2. Insertar mensaje inicial en el hilo del ticket
  const nombreSafe = nombre.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!))
  const emailSafe = email.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!))
  const tipoSafe = tipo.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!))
  const mensajeHtml = DOMPurify.sanitize(
    `<p><strong>Caso asignado:</strong> ${numeroCaso}</p>` +
    `<p><strong>Remitente:</strong> ${nombreSafe} (&lt;<a href="mailto:${emailSafe}">${emailSafe}</a>&gt;)</p>` +
    `<p><strong>Tipo de consulta:</strong> ${tipoSafe}</p>` +
    `<p>${mensaje.replace(/\n/g, '<br/>')}</p>`
  )

  const { error: msgError } = await adminClient
    .from('tickets_mensajes')
    .insert({
      ticket_id: ticket.id,
      user_id: user?.id ?? null,
      mensaje_html: mensajeHtml,
      es_admin: false,
    })

  if (msgError) {
    console.error('Error insertando mensaje en ticket legal:', msgError)
  }

  // 3. Registrar también en leads para trazabilidad CRM comercial
  await adminClient.from('leads').insert({
    nombre,
    email,
    interes: `Consulta legal (${tipo})`,
    mensaje: `[${numeroCaso}][${tipo}] ${mensaje}`,
  })

  // 4. Enviar correo de confirmación al usuario que hizo la consulta
  try {
    await enviarConfirmacionConsultaLegal(email, {
      nombre,
      numeroCaso,
      tipo,
      mensaje,
    })
  } catch (err) {
    console.error('Error enviando confirmación de consulta legal al cliente:', err)
  }

  // 5. Notificar a los administradores del sistema
  try {
    const { data: config } = await adminClient
      .from('config_sistema')
      .select('email_notificaciones')
      .eq('id', 'default')
      .single()

    const { data: admins } = await adminClient
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
      numeroCaso,
    })
  } catch (err) {
    console.error('Error enviando notificación interna de duda legal:', err)
  }

  return NextResponse.json({ ok: true, ticket_id: ticket.id, numero_caso: numeroCaso })
}
