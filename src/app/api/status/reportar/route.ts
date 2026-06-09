import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarNotificacionTicket } from '@/lib/email'
import DOMPurify from 'isomorphic-dompurify'
import { rateLimit } from '@/lib/rate-limit'
import { getIp } from '@/lib/admin-guard'

const bodySchema = z.object({
  email: z.string().email(),
  titulo: z.string().min(5).max(100),
  descripcion: z.string().min(10).max(5000),
})

export async function POST(request: NextRequest) {
  try {
    const allowed = await rateLimit(`status_reportar_${getIp(request)}`, 2, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos de reporte inválidos' }, { status: 400 })
    }

    const { email, titulo, descripcion } = parsed.data
    const adminClient = await createAdminClient()

    // 1. Crear el ticket de soporte público (sin vincular a un user_id o empresa_id)
    const { data: ticket, error: ticketError } = await adminClient
      .from('tickets')
      .insert({
        titulo: `[Público] ${titulo}`,
        tipo: 'bug',
        prioridad: 'alta',
        estado: 'abierto',
        user_id: null,
        empresa_id: null
      })
      .select('id')
      .single()

    if (ticketError || !ticket) {
      console.error('Error al insertar ticket público:', ticketError)
      return NextResponse.json({ error: 'Error interno al registrar reporte' }, { status: 500 })
    }

    // 2. Insertar el mensaje fundacional del ticket en el hilo de chat
    const emailSafe = email.replace(/[<>&"]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]!))
    const mensajeHtml = DOMPurify.sanitize(
      `<p><strong>Reportado por el visitante:</strong> ${emailSafe}</p><p>${descripcion.replace(/\n/g, '<br/>')}</p>`
    )
    const { error: msgError } = await adminClient
      .from('tickets_mensajes')
      .insert({
        ticket_id: ticket.id,
        user_id: null,
        mensaje_html: mensajeHtml,
        es_admin: false
      })

    if (msgError) {
      console.error('Error al insertar mensaje de ticket público:', msgError)
      return NextResponse.json({ error: 'Error interno al registrar mensaje' }, { status: 500 })
    }

    // 3. Notificar a los administradores del sistema (super_admin) por correo electrónico
    const { data: admins } = await adminClient
      .from('profiles')
      .select('email')
      .eq('rol', 'super_admin')

    const emails = admins?.map(a => a.email).filter(Boolean) as string[]

    if (emails && emails.length > 0) {
      try {
        await enviarNotificacionTicket(emails, {
          nombre: 'Visitante Estatus',
          email: email,
          categoria: 'bug',
          mensaje: mensajeHtml
        })
      } catch (emailErr) {
        console.error('Error al enviar notificación de ticket por correo:', emailErr)
      }
    }

    return NextResponse.json({ success: true, ticket_id: ticket.id })
  } catch (err) {
    console.error('Error en ruta reportar estatus:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
