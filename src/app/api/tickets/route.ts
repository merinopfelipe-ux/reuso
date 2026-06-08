import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarNotificacionTicket } from '@/lib/email'
import DOMPurify from 'isomorphic-dompurify'

const bodySchema = z.object({
  titulo: z.string().min(5).max(100),
  tipo: z.enum(['bug', 'duda', 'solicitud', 'queja']),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).default('media'),
  mensaje_html: z.string().min(10).max(50000),
})

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('rol, empresa_id').eq('user_id', user.id).single()
  const rol = profile?.rol ?? 'usuario_libre'

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  let query = supabase
    .from('tickets')
    .select('id, titulo, tipo, prioridad, estado, user_id, empresa_id, created_at, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (rol === 'empresa_admin' && profile?.empresa_id) {
    query = query.eq('empresa_id', profile.empresa_id)
  } else if (rol === 'empleado' || rol === 'usuario_libre') {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Error obteniendo tickets' }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos de ticket inválidos' }, { status: 400 })

  const { titulo, tipo, prioridad } = parsed.data
  const mensaje_html = DOMPurify.sanitize(parsed.data.mensaje_html)
  
  const { data: profile } = await supabase.from('profiles').select('empresa_id, nombre, email').eq('user_id', user.id).single()

  const adminClient = await createAdminClient()
  
  // 1. Crear el ticket
  const { data: ticket, error: ticketError } = await adminClient
    .from('tickets')
    .insert({
      titulo,
      tipo,
      prioridad,
      estado: 'abierto',
      user_id: user.id,
      empresa_id: profile?.empresa_id
    })
    .select('id')
    .single()

  if (ticketError || !ticket) return NextResponse.json({ error: 'Error creando ticket' }, { status: 500 })

  // 2. Insertar el mensaje fundacional
  const { error: msgError } = await adminClient
    .from('tickets_mensajes')
    .insert({
      ticket_id: ticket.id,
      user_id: user.id,
      mensaje_html,
      es_admin: false
    })

  if (msgError) return NextResponse.json({ error: 'Error insertando mensaje' }, { status: 500 })

  // 3. Obtener admins para notificar (super_admin)
  const { data: admins } = await adminClient.from('profiles').select('email').eq('rol', 'super_admin')
  const emails = admins?.map(a => a.email).filter(Boolean) as string[]

  if (emails && emails.length > 0) {
    try {
      await enviarNotificacionTicket(emails, {
        nombre: profile?.nombre,
        email: profile?.email,
        categoria: tipo,
        mensaje: mensaje_html
      })
    } catch {
      // silencioso
    }
  }

  return NextResponse.json({ success: true, ticket_id: ticket.id })
}
