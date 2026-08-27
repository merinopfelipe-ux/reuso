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
  // Solo lo usa un super_admin redactando un PQR a nombre de una empresa que
  // no puede o no sabe hacerlo ella misma — para cualquier otro rol se
  // ignora, su empresa_id real siempre sale de su propio perfil.
  empresa_id_pqr: z.uuid().optional(),
  // Vincula el ticket a un cliente CRM puntual (crm_clientes) — opcional,
  // para poder mostrar un historial de tickets en su ficha.
  cliente_id: z.uuid().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('rol, empresa_id').eq('user_id', user.id).single()
  const rol = profile?.rol ?? 'usuario_libre'

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const empresaIdFiltro = searchParams.get('empresa_id')
  const clienteIdFiltro = searchParams.get('cliente_id')

  // super_admin ve TODOS los tickets de la plataforma (con nombre de
  // empresa, para poder identificar de quién es cada uno), no solo los que
  // él mismo creó — antes caía en la rama de "usuario", un gap real. El join
  // a empresas(nombre) se pide siempre (barato) para no bifurcar el tipo de
  // la query entre roles.
  let query = supabase
    .from('tickets')
    .select('id, titulo, tipo, prioridad, estado, user_id, empresa_id, cliente_id, origen, created_at, updated_at, empresas(nombre)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (rol === 'super_admin') {
    if (empresaIdFiltro) query = query.eq('empresa_id', empresaIdFiltro)
  } else if ((rol === 'empresa_admin' || (rol === 'empleado' && clienteIdFiltro)) && profile?.empresa_id) {
    // Ficha de un cliente CRM (/empresa/clientes/[id]): el historial es de
    // TODA la empresa, no solo de los tickets que creó quien está mirando
    // — un empleado también debe ver los tickets de ese cliente creados por
    // otro empleado o por el empresa_admin.
    query = query.eq('empresa_id', profile.empresa_id)
  } else if (rol === 'empleado' || rol === 'usuario_libre') {
    query = query.eq('user_id', user.id)
  }

  if (clienteIdFiltro) query = query.eq('cliente_id', clienteIdFiltro)

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

  const { titulo, tipo, prioridad, empresa_id_pqr, cliente_id } = parsed.data
  const mensaje_html = DOMPurify.sanitize(parsed.data.mensaje_html)

  const { data: profile } = await supabase.from('profiles').select('rol, empresa_id, nombre, email').eq('user_id', user.id).single()

  // Un PQR "a nombre de" solo existe si quien lo crea es super_admin Y trae
  // un empresa_id_pqr explícito — cualquier otro rol usa siempre su propia
  // empresa (profile.empresa_id), nunca uno enviado por el cliente.
  const esPqrDeAdmin = profile?.rol === 'super_admin' && !!empresa_id_pqr
  const empresaIdFinal = esPqrDeAdmin ? empresa_id_pqr : profile?.empresa_id

  const adminClient = await createAdminClient()

  // Nunca confiar en el cliente_id del body sin verificar que pertenece a
  // la misma empresa del ticket — si no coincide, se ignora en vez de fallar
  // el ticket completo (el vínculo al cliente es un accesorio, no lo
  // esencial de la solicitud).
  let clienteIdVerificado: string | null = null
  if (cliente_id && empresaIdFinal) {
    const { data: clienteDueño } = await adminClient
      .from('crm_clientes')
      .select('id')
      .eq('id', cliente_id)
      .eq('empresa_id', empresaIdFinal)
      .maybeSingle()
    if (clienteDueño) clienteIdVerificado = clienteDueño.id
  }

  // 1. Crear el ticket
  const { data: ticket, error: ticketError } = await adminClient
    .from('tickets')
    .insert({
      titulo,
      tipo,
      prioridad,
      estado: 'abierto',
      user_id: user.id,
      empresa_id: empresaIdFinal,
      cliente_id: clienteIdVerificado,
      origen: esPqrDeAdmin ? 'admin' : 'usuario',
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
      // Mismo criterio que la respuesta en [id]/mensajes/route.ts: refleja
      // quién escribió el mensaje, no de quién es el ticket.
      es_admin: profile?.rol === 'super_admin'
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
