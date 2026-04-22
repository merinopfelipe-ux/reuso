import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarNotificacionTicket } from '@/lib/email'

const bodySchema = z.object({
  mensaje: z.string().min(10).max(2000),
  categoria: z.enum(['Error técnico', 'Pregunta de uso', 'Facturación', 'Otro']),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Completa todos los campos' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, email')
    .eq('user_id', user.id)
    .single()

  // Registrar en logs de auditoría
  await adminClient.from('logs_auditoria').insert({
    user_id: user.id,
    accion: 'ticket_ayuda',
    detalle_json: {
      categoria: parsed.data.categoria,
      mensaje: parsed.data.mensaje,
      nombre: perfil?.nombre,
      email: perfil?.email,
    },
  })

  // Enviar email de notificación (no-blocking)
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
      config?.email_notificaciones ?? 'servicio@lurdes.co',
      ...((admins ?? []).map((a: { email: string }) => a.email)),
    ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i)

    await enviarNotificacionTicket(destinatarios, {
      nombre: perfil?.nombre,
      email: perfil?.email,
      categoria: parsed.data.categoria,
      mensaje: parsed.data.mensaje,
    })
  } catch { /* no-blocking */ }

  return NextResponse.json({ ok: true })
}
