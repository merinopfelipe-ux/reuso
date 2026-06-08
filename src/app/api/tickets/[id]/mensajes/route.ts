import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import DOMPurify from 'isomorphic-dompurify'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Omitimos validación manual aquí asumiendo que el Frontend no expone threads inválidos,
  // Para seguridad real en RLS, el user con RLS lee `tickets_mensajes`.
  
  const { data, error } = await supabase
    .from('tickets_mensajes')
    .select('*, profiles:user_id (nombre, avatar_url, rol)')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error cargando hilo' }, { status: 500 })

  return NextResponse.json({ data })
}

const msgSchema = z.object({
  mensaje_html: z.string().min(1, 'El mensaje no puede estar vacío').max(50000)
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('rol, nombre, email').eq('user_id', user.id).single()
  const isSuper = profile?.rol === 'super_admin'

  const body = await request.json().catch(() => null)
  const parsed = msgSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 })

  const adminClient = await createAdminClient()

  // 1. Obtener ticket (para saber a quién notificar)
  const { data: ticket } = await adminClient
    .from('tickets')
    .select('user_id, titulo')
    .eq('id', params.id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket no existe' }, { status: 404 })

  // 2. Insertar mensaje
  const { data: mensaje, error } = await adminClient
    .from('tickets_mensajes')
    .insert({
      ticket_id: params.id,
      user_id: user.id,
      es_admin: isSuper,
      mensaje_html: DOMPurify.sanitize(parsed.data.mensaje_html)
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Fallo al enviar mensaje' }, { status: 500 })

  // 3. Marcar ticket actualizado — solo super_admin cambia estado a en_proceso
  const updatePayload: Record<string, string> = { updated_at: new Date().toISOString() }
  if (isSuper) updatePayload.estado = 'en_proceso'
  await adminClient.from('tickets').update(updatePayload).eq('id', params.id)

  // 4. Notificaciones
  if (isSuper && ticket.user_id !== user.id) {
    // a. Notificación campana (Alertas table)
    await adminClient.from('alertas').insert({
      titulo: 'Nueva respuesta en tu ticket',
      mensaje: `El equipo ha respondido a tu incidencia: "${ticket.titulo}"`,
      tipo: 'info',
      destinatario_tipo: 'usuario',
      destinatario_id: ticket.user_id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })

    // b. Email vía Resend al creador del ticket
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('email, nombre')
      .eq('user_id', ticket.user_id)
      .single()

    if (process.env.RESEND_API_KEY && targetProfile?.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@reuso.lurdes.co>',
          to: targetProfile.email,
          subject: `Actualización en ticket: ${ticket.titulo}`,
          html: `<p>Hola ${targetProfile.nombre},</p>
                 <p>El administrador respondió a tu consulta. Recrea en tu panel para ver más.</p>`
        })
      } catch (e) {
        console.error('Mail error', e)
      }
    }
  }

  return NextResponse.json({ success: true, message_id: mensaje.id })
}
